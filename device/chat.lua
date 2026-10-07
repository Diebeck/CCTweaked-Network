-- Program for Minecraft-Controller communication

local written = ""
local function banner()
    local facts = {
        "DEVICE CONNECTED",
        "ALL SYSTEMS NOMINAL",
        "COMMUNICATION INTERFACE ACTIVE",
        "CURRENTLY RUNNING CHATv1.7",
        "AWAITING RESPONSE",
        "MANAGING RESOURCES",
        "RESPONSES MAY NOT BE RECEIVED INSTANTLY",
        "SUBPROCESSES RUNNING AT OPTIMAL SPEED",
        "WEBSOCKET ACTIVE",
        "HELLO THERE",
        "ERROR: \"FLAVOR_TEXT.11\" NOT FOUND",
        "WRITING MORE FLAVOR TEXT...",
        "CALCULATING OPTIMAL RESPONSE"
    }
    local bag = {}
    local next = ""
    local function getNext()
        if #bag == 0 then bag = {table.unpack(facts)} end
        if #next == 0 then
            next = table.remove(bag, math.random(#bag)).. " / "
        end
        local letter = string.sub(next,1,1)
        next = string.sub(next,2,-1)
        return letter
    end
    while true do
        local termX, termY = term.getSize()
        while #written < termX do
            written = written.. getNext()
        end
        
        local lx, ly = term.getCursorPos()
        local lc = term.getTextColor()
        term.setCursorPos(1,1)
        term.setTextColor(colors.gray)
        written = string.sub(written,2,-1) .. getNext()
        term.write(written)
        term.setCursorPos(lx, ly)
        term.setTextColor(lc)
        sleep(0.5)
    end
end

local function tts(message)
    local url = "https://music.madefor.cc/tts?text=" .. textutils.urlEncode(message)
    local response, err = http.get { url = url, binary = true }
    if not response then error(err, 0) end

    local speaker = peripheral.find("speaker")
    local decoder = require("cc.audio.dfpwm").make_decoder()

    while true do
        local chunk = response.read(16 * 1024)
        if not chunk then break end

        local buffer = decoder(chunk)
        while not speaker.playAudio(buffer) do
            os.pullEvent("speaker_audio_empty")
        end
    end
end

local function chat()
    local lastMessages = {"", "", ""}
    while true do
        local x, y = term.getSize()
        term.setCursorPos(1, y)
        term.setTextColor(colors.white)
        local msg = read()
        term.scroll(-1)
        if msg ~= "" then
            term.clearLine()
            lastMessages[3] = lastMessages[2]
            lastMessages[2] = lastMessages[1]
            lastMessages[1] = msg
            local fade = {colors.white, colors.lightGray, colors.gray}
            if peripheral.find("speaker") then peripheral.find("speaker").playSound("minecraft:block.note_block.hat", 0.5) end
            for i = 1, 3 do
                term.setCursorPos(1, y-i)
                term.clearLine()
                term.setTextColor(fade[i])
                if lastMessages[i] ~= "" then
                    term.write("> ".. lastMessages[i])
                end
            end
            -- Writes the banner because the scroll thing doesnt work
            term.setCursorPos(1,1)
            term.setTextColor(colors.gray)
            term.write(written)
            os.queueEvent("eventSend", "deviceChatMsg", msg)
        end
    end
end

local lastMsgTime = 0
local chatMsgQueue = {}
local function queueChatMsg()
    while true do
        local event, msg = os.pullEvent("controllerChatMsg")
        chatMsgQueue[#chatMsgQueue+1] = msg
        lastMsgTime = os.clock()
    end
end

local msgType = "normal"
local function writeChatMsg()
    while true do
        if #chatMsgQueue > 0 then
            local msg = table.remove(chatMsgQueue, 1)
            if string.sub(msg, #msg, #msg) == "?" then
                msgType = "question"
            else
                msgType = "normal"
            end
            tts(msg)
            local termX, termY = term.getSize()
            local readX, readY = term.getCursorPos()
            local width = math.floor(termX * 2/3)
            local height = termY-5
            local padding = math.floor(width/8)
            local lines = require "cc.strings".wrap(msg, width - padding*2)
            local blank = require "cc.strings".ensure_width("", width)
            for i=2, height do
                term.setCursorPos(1, i)
                term.write(blank)
            end
            for index, line in ipairs(lines) do
                term.setCursorPos((width - padding*2) /2 - #line/2 + padding, math.ceil(height/2 - #lines/2 + index))
                local lastLetterX, lastLetterY = term.getCursorPos()
                for l=1, #line do
                    -- set write position
                    term.setCursorPos(lastLetterX, lastLetterY)
                    -- write
                    local toWrite = string.sub(line, l, l)
                    term.setTextColor(colors.yellow)
                    term.write(toWrite)
                    term.setTextColor(colors.white)
                    --if peripheral.find("speaker") then peripheral.find("speaker").playSound("minecraft:block.note_block.flute", 0.5, math.random()*0.3 +0.5) end
                    -- record write position
                    lastLetterX, lastLetterY = term.getCursorPos()
                    -- set read position
                    term.setCursorPos(readX, readY)
                    sleep()
                    -- record read position
                    readX, readY = term.getCursorPos()
                end
            end
            term.setCursorPos(readX, readY)
            if #chatMsgQueue > 0 then sleep(2) end
        end
        sleep()
    end
end

local function drawEye()
    local termX, termY = term.getSize()
    local startX, startY, width, height = math.floor(termX * 2/3), 2, math.floor(termX * 1/3), termY-5
    local function drawCool(w, h)
        local lx, ly = term.getCursorPos()
        local lc = term.getBackgroundColor()
        paintutils.drawFilledBox(startX, startY, startX + width, startY + height, colors.black)
        paintutils.drawFilledBox(startX + width/2 - width*w/2, startY + height/2 - height*h/2, startX + width/2 + width*w/2, startY + height/2 + height*h/2, colors.yellow)
        term.setCursorPos(lx, ly)
        term.setBackgroundColor(lc)
    end
    local blinkTime = 0
    while true do
        local time = os.clock() - lastMsgTime
        if time < 85 then
            if msgType == "question" then
                drawCool(0.7, 0.3) -- squint
            else
                drawCool(0.7, 0.7) -- open
            end
            blinkTime = blinkTime - 0.1
            if blinkTime < 0 then
                blinkTime = math.random(10,20)
                local times = 1
                if math.random(1,4) == 1 then times = 2 end
                for i=1, times do
                    drawCool(0.7, 0.5) -- closing
                    sleep(0.1)
                    drawCool(0.8, 0.0) -- closed
                    sleep(0.1)
                    drawCool(0.6, 0.85) -- overopen
                    sleep(0)
                end
            end
        elseif time < 90 then
            drawCool(0.7, 0.5) -- half closed
        else
            drawCool(0.8, 0.0) -- closed
        end
        sleep(0)
    end
end

local function talkThroughAll()
    while true do
        local event, msg = os.pullEvent("controllerWorldChatMsg")
        tts(msg)
    end
end

parallel.waitForAny(
    banner,
    chat,
    queueChatMsg,
    writeChatMsg,
    drawEye,
    talkThroughAll
)
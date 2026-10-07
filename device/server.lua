-- Program for sending World Information

local file = fs.open("socketData.txt", "r")
local world = textutils.unserialise(file.readAll()).address.world
file.close()

local function sendWorldInfo()
    local info = {}

    info.world = world
    info.version = _HOST
    info.days = os.day()
    if peripheral.find("player_detector") then
        info.players = peripheral.find("player_detector").getOnlinePlayers()
        info.playerCount = #info.players
    end

    os.queueEvent("eventSend", "worldInfo", info)
end

local function shoutBack()
    while true do
        local event = os.pullEvent("find")
        sendWorldInfo()
    end
end

local function handlePlayerEvents()
    while true do
        if peripheral.find("player_detector") or peripheral.find("playerDetector") then
            local event, uuid, name = os.pullEvent()
            if event == "playerJoin" or event == "playerLeave" then
                if event == "playerJoin" then os.queueEvent("eventSend", "worldChatMsg", name .." has joined") end
                if event == "playerLeave" then os.queueEvent("eventSend", "worldChatMsg", name .." has left") end
                sendWorldInfo()
            end
        end
        sleep()
    end
end

local function sendChatMessage()
    while true do
        local event, msg = os.pullEvent("controllerWorldChatMsg")
        if peripheral.find("chat_box") then
            local formattedMessage = textutils.serialiseJSON({text = msg, color = "yellow"})
            peripheral.find("chat_box").sendFormattedMessage(formattedMessage, {prefix = " ", brackets = "/>", bracketsColor = "&e"})
        end
        if peripheral.find("chatBox") then
            os.queueEvent("eventSend", "alert", "UH OH! The version of the world this computer is in is OLD! The peripheral is actually called chatBox, NOT chat_box. Gotta do something about that!")
        end
    end
end

local function chat()
    while true do
        local event, uuid, name, msg = os.pullEvent("chat")
        os.queueEvent("eventSend", "worldChatMsg", "<".. name .."> ".. msg)
    end
end

local function sendToast()
    while true do
        local event, player, msg = os.pullEvent("sendToast")
        local chatBox = peripheral.find("chat_box")
        if chatBox then
            chatBox.sendToast({
                message = msg,
                title = "//",
                player = player,
                prefix = ">",
                brackets = ">>",
                bracketsColor = "",
            })
        end
    end
end

parallel.waitForAny(
    shoutBack,
    handlePlayerEvents,
    sendChatMessage,
    chat,
    sendToast
)
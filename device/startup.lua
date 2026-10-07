-- Main Websocket connection and utility program

local socketData = {}
socketData.address = {}
if fs.exists("socketData.txt") then -- Retrieves socketData
    local file = fs.open("socketData.txt","r")
    socketData = textutils.unserialise(file.readAll())
    file.close()
else -- Asks user for info
    term.clear()
    term.setCursorPos(1,1)
    print("No socketData.txt found!")
    print("Please enter world label (Check other computers' socketData.txt if unsure):")
    socketData.address.world = read()
    print("Enter custom ID:")
    socketData.address.id = read()
    print("Enter device label (Optional):")
    socketData.label = read()
    if socketData.label == "" then socketData.label = nil end
    print("Enter device description (Optional):")
    socketData.description = read()
    if socketData.description == "" then socketData.description = nil end
    local file = fs.open("socketData.txt","w")
    file.write(textutils.serialise(socketData))
    file.close()
end
local address = socketData.address
os.setComputerLabel(socketData.label)

local ws, problem
while not ws do
    term.clear()
    term.setCursorPos(1,1)
    print("Attempting connection to websocket...")
    ws, problem = http.websocket("wss://desktop-7pv85n7.tailbfa33.ts.net/")
    if not ws then
        print("Ran into a problem:")
        if problem == "Could not connect" then problem = problem .." (Server likely offline)" end
        print(problem)
        print("Retrying after 5 seconds...")
        sleep(5)
        term.clear()
    end
end

if (peripheral.find("speaker")) then
    peripheral.find("speaker").playSound("minecraft:block.respawn_anchor.charge")
end
term.clear()
--[[ term.setCursorPos(1,1)
print("WEBSOCKET CONNECTION SUCCESSFUL")
print("Hold Ctrl+T to assume manual control")
print("")
print("World: " .. address.world)
print("ID: " .. address.id) ]]

local function wsend(...) -- Sends a message through the websocket
    ws.send( -- Syntax: {"Event name", data1, data2, ...}
        textutils.serializeJSON({address,...})
    )
    --print("Sent: " .. textutils.serializeJSON({...}))
end

local function receiveMessage() -- Receives messages and turns them into an event with data
    while true do
        local data
        local success, err = pcall(function() -- Doesnt let it crash if disconnects from websocket
            data = ws.receive(5) -- Syntax: {Address, "Event name", data1, data2, ...}
        end)
        if err == "Terminated" then error("Terminated", 0) end -- Simply terminates if terminated manually
        if not success then os.reboot() end -- Reboots if it looses connection to websocket
        if data ~= nil then
            local message = textutils.unserialiseJSON(data)
            if message then
                if message[1].world == address.world or message[1].world == nil then
                    if message[1].id == address.id or message[1].id == nil then
                        table.remove(message, 1)
                        if #message > 0 then -- Prevents crash if message is malformed
                            os.queueEvent(table.unpack(message))
                        end
                        --print("Got: " .. data)
                    end
                end
            end
        end
    end
end

local function ping()
    while true do
        local event = os.pullEvent("Ping")
        wsend("Pong Device")
    end
end

local function eventSend()
    while true do
        local data = table.pack(os.pullEvent("eventSend"))
        table.remove(data, 1)
        wsend(table.unpack(data))
    end
end

local function runChat()
    while true do
        shell.run("chat.lua")
    end
end

local function cloudConnect()
    while true do
        local event, code = os.pullEvent("cloud")
        if not fs.exists("cloud.lua") then shell.run("wget https://cloud-catcher.squiddev.cc/cloud.lua") end -- Downloads cloudcatcher if it doesnt have it
        if term.isColor() then
            shell.openTab("cloud.lua ".. code)
        else
            local w = window.create(term.current(), 1, 1, 10, 10, true)
            --term.redirect(w)
            shell.run("cloud.lua ".. code)
        end
    end
end

local function forceReboot()
    local event, program = os.pullEvent("reboot")
    os.reboot()
end

local function sendInfo(startup)
    local info = {}

    info.type = "computer"
    if pocket then info.type = "pocket" end
    if turtle then info.type = "turtle" end
    
    info.advanced = term.isColor()
    info.computerID = os.getComputerID()
    info.label = os.getComputerLabel()
    info.description = socketData.description
    info.clock = math.floor(os.clock())
    info.autorun = socketData.autorun
    if #peripheral.getNames() > 0 then
        info.peripherals = {}
    end
    local d = peripheral.find("drive")
    if d then
        info.drive = d.isDiskPresent()
        if d.getDiskID() then info.drive = d.getDiskID() end
        if d.getDiskLabel() then info.drive = d.getDiskLabel() end
    end
    for key, value in pairs(peripheral.getNames()) do
        info.peripherals[#info.peripherals+1] = peripheral.getType(value)
    end

    wsend("shoutBack", info, startup)
end

local function shoutBack()
    while true do
        local event = os.pullEvent("find")
        sendInfo()
    end
end

local function runCode()
    while true do
        local event, code = os.pullEvent("runCode")
        local success, err = pcall(function ()
            load(code)()
        end)
        if err then wsend("alert", "Ran into an error:\n".. err) end
    end
end

local function changeData()
    while true do
        local event, type, newData = os.pullEvent("changeData")
        if type == "id" then address.id = newData socketData.address.id = newData
        elseif type == "world" then address.world = newData socketData.address.world = newData
        elseif type == "label" then socketData.label = newData os.setComputerLabel(newData)
        elseif type == "description" then socketData.description = newData
        elseif type == "autorun" then socketData.autorun = newData
        end
        local file = fs.open("socketData.txt", "w")
        file.write(textutils.serialise(socketData))
        file.close()
        sendInfo()
        wsend("alert", "Successfully changed ".. type .."!")
    end
end

local function infect()
    while true do
        local event, id = os.pullEvent("infect")
        if fs.exists("disk") then
            if fs.exists("startup.lua") then
                fs.delete("disk/startup.lua")
                fs.copy("startup.lua", "disk/startup.lua")
            end
            if fs.exists("chat.lua") then
                fs.delete("disk/chat.lua")
                fs.copy("chat.lua", "disk/chat.lua")
            end
            local newSocketData = {["address"] = {["world"] = address.world, ["id"]=id}}
            local file = fs.open("disk/socketData.txt", "w")
            file.write(textutils.serialise(newSocketData))
            file.close()
            wsend("alert", "Infection successful!")
        end
    end
end

local function autorun()
    while true do
        if socketData.autorun then
            shell.run(socketData.autorun)
        end
        sleep()
    end
end

local function manageMiscEvents()
    while true do
        local event, info = os.pullEvent()
        if event == "peripheral"
        or event == "peripheral_detach"
        or event == "disk"
        or event == "disk_eject" then
            sendInfo()
        end
    end
end

local function debug()
    while true do
        local event = os.pullEvent("debug")
        print("debug")
    end
end

sendInfo(true) -- When computer boots, adds itself to the list of available devices on the controller

parallel.waitForAny(
    receiveMessage,
    ping,
    eventSend,
    cloudConnect,
    forceReboot,
    shoutBack,
    runChat,
    runCode,
    changeData,
    infect,
    autorun,
    manageMiscEvents,
    debug
)
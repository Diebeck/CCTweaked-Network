-- MASTER Startup program for connecting to controlPanel through websocket
-- Without it this program, the computer isnt really "connected" to the network
-- Listens for requests and sends its status into the websocket
-- Also runs programs sent through websocket

local runningProgram = nil
local deviceType = "normal"
if pocket then deviceType = "pocket" end
if turtle then deviceType = "turtle" end

local address = {}
if fs.exists("address.txt") then
    local file = fs.open("address.txt","r")
    address = textutils.unserialise(file.readAll())
    file.close()
else
    term.clear()
    term.setCursorPos(1,1)
    print("No address.txt found! Please enter the name of the world (Check other computers' addresses):")
    address.world = read()
    print("Enter custom ID:")
    address.id = read()
    local file = fs.open("address.txt","w")
    file.write(textutils.serialise(address))
    file.close()
end

if not fs.exists("cloud.lua") then -- Gets cloudCatcher if it doesnt have it
    shell.run("wget https://cloud-catcher.squiddev.cc/cloud.lua")
end

term.clear()
term.setCursorPos(1,1)
print("AWAITING INSTRUCTIONS")
print("Hold Ctrl+T to assume manual control")
print("")
print("World: " .. address.world)
print("ID: " .. address.id)

local ws, problem = http.websocket("wss://desktop-7pv85n7.tailbfa33.ts.net/")
if not ws then
    print("Ran into a problem:")
    print(problem)
    print("Restarting after 60 seconds...")
    sleep(60)
    os.reboot()
end

local function wsend(...) -- Sends a message through the websocket
    ws.send( -- Syntax: {"Event name", data1, data2, ...}
        textutils.serializeJSON({address,...})
    )
    --print("Sent: " .. textutils.serializeJSON({...}))
end

local function receiveMessage() -- Receives messages and turns them into an event with data
    while true do
        local data = ws.receive(5) -- Syntax: {Address, "Event name", data1, data2, ...}
        if data ~= nil then
            local message = textutils.unserialiseJSON(data)
            if message then
                if message[1].world == address.world or message[1].world == nil then
                    if message[1].id == address.id or message[1].id == nil then
                        table.remove(message, 1)
                        os.queueEvent(table.unpack(message))
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
        wsend("Pong Sleeper")
    end
end

local function runProgram()
    while true do
        local event, program = os.pullEvent("runProgram")
        runningProgram = program
        shell.run(program)
        runningProgram = nil
    end
end

local function forceReboot()
    local event, program = os.pullEvent("reboot")
    os.reboot()
end

local function shoutBack()
    while true do
        local event, program = os.pullEvent("find")
        local type = "normal"
        if pocket then type = "pocket" end
        if turtle then type = "turtle" end
        wsend("shoutBack", runningProgram, deviceType)
    end
end
wsend("shoutBack",runningProgram,deviceType) -- when computer boots, adds itself to the list of available devices on the controller

parallel.waitForAny(
    receiveMessage,
    ping,
    runProgram,
    forceReboot,
    shoutBack
)
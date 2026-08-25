let world
let id
let connectedComputers = {}
const worldInfos = {}
const deviceMessages = {}
const worldMessages = {}

// Retrieve open/closed states of collapsibles
if (localStorage.getItem("collapsibleStates")) {
    const detailStates = JSON.parse(localStorage.getItem("collapsibleStates"))
    const details = document.querySelector("aside").querySelectorAll("details")
    for (let i=0; i<details.length; i++) {
        details[i].open = detailStates[i]
    }
}

setInterval(function () {
    const details = document.querySelector("aside").querySelectorAll("details")
    const states = []
    for (let i=0; i<details.length; i++) {
        states[i] = details[i].open
    }
    localStorage.setItem("collapsibleStates", JSON.stringify(states))
}, 60 * 1000) // Every minute

const buttons = document.getElementById("deviceActions").querySelectorAll("button")
for (let i=0; i<buttons.length; i++) {
    buttons[i].disabled = true
}

// WEBSOCKET
let socket = new WebSocket("wss://desktop-7pv85n7.tailbfa33.ts.net/")

function wsend(...data) { // Specific world and id
    socket.send(JSON.stringify([{id:id, world:world},...data]))
    console.log("Sent: "+[{id:id, world:world},...data])
}
function wbroadcast(...data) { // World broadcast
    socket.send(JSON.stringify([{world:world},...data]))
    console.log("Broadcasted: "+[{world:world},...data])
}
function wWideBroadcast(...data) { // Wide broadcast
    socket.send(JSON.stringify([{},...data]))
    console.log("Widely Broadcasted: "+[{},...data])
}

// Connection open/close/error log
socket.addEventListener("open", () => {
    console.log("Connected to WebSocket server.")
    wWideBroadcast("find")
})
socket.addEventListener("close", () => {
    console.log("Disconnected from WebSocket server.")
})
socket.addEventListener("error", error => {
    console.log("WebSocket error: " + error)
})

socket.addEventListener("message", (event) => {
    socketLogMsg("Got: "+ event.data)
    const data = JSON.parse(event.data)
    const address = data[0]
    if (data[1].substring(0,4) != "Pong") {
        console.log("Got:",data)
    }
    if (data[1] == "Ping") {
        wsend("Pong Website")
    }

    // Run no matter the address
    if (data[1] == "shoutBack") {
        addDevice(address, data[2])
        if (data[3] == true) { // If its a startup
            if (Date.now() - lastRefreshTime > 1000) { // Plays a sound if it wasnt instant
                playSound("activate.ogg", 0.8, 1.5)
            }
        } else { // If its an update
            if (worldSelector.value == address.world && id == address.id) { // If its the selected device, update it
                updateSelectedDevice(worldSelector.value, id)
                if (Date.now() - lastRefreshTime > 1000) {
                    playSound("hud_bubble.ogg")
                }
            } else { // Its an update somewhere else
                if (Date.now() - lastRefreshTime > 1000) {
                    playSound("toggle.ogg")
                }
            }
        }
    } else if (data[1] == "worldInfo") {
        worldInfos[data[2].world] = data[2]
        if (data[2].world == world) {
            updateWorldInfo(worldSelector.value)
        }
    } else if (data[1] == "deviceChatMsg") { // Incoming device chat message
        recordDeviceChatMessage(address, data[2])
    } else if (data[1] == "worldChatMsg") { // Incoming world chat message
        recordWorldChatMessage(address, data[2])
    } else if (data[1] == "alert") { // Alert handler
        alert(data[2])
    }

    if (address.world == world) { // Run if it comes from the selected world
        
        if (address.id == id) { // Run if it comes from the selected ID & world
            
        }
    }
})

// INTERACTION
let lastRefreshTime = Date.now()
document.getElementById("find").addEventListener("click", () => { 
    connectedComputers = {}
    lastRefreshTime = Date.now()
    playSound("spyglass_stop.ogg",1,1)
    wWideBroadcast("find")
})
const worldSelector = document.getElementById("worldSelector")
const deviceSelector = document.getElementById("deviceSelector")
let lastSelectedWorld
worldSelector.addEventListener("change", () => {
    lastSelectedWorld = worldSelector.value
    playSound("wood_click.ogg", 0.1)
    world = worldSelector.value
    updateWorldInfo(worldSelector.value)
    updateWorldChatLog()
    listDevices()
})
document.getElementById("connectBtn").addEventListener("click", () => { 
    ask("CloudCatcher Code:", "...").then(function(answer) {
        if (answer) {
            wsend("cloud", answer)
        }
    })
})
document.getElementById("rebootBtn").addEventListener("click", () => {
    wsend("reboot")
})
document.getElementById("runCodeBtn").addEventListener("click", () => {
    ask("Lua Code:", "...").then(function(answer) {
        if (answer) {
            wsend("runCode", answer)
        }
    })
})
document.getElementById("infectBtn").addEventListener("click", () => {
    ask("Infected Address ID:", "...").then(function(answer) {
        if (answer) {
            wsend("infect", answer)
        }
    })
})
const setDataButtons = {
    "setIdBtn": "id",
    "setWorldBtn": "world",
    "setLabelBtn": "label",
    "setDescriptionBtn": "description",
    "setAutorunBtn": "autorun"
}
for (const key in setDataButtons) {
    document.getElementById(key).addEventListener("click", () => {
        ask("New "+ setDataButtons[key] +":", "...").then(function(answer) {if (answer) {
            wsend("changeData", setDataButtons[key], answer)
        }})
    })
}
document.getElementById("deviceChatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const input = document.getElementById("deviceChatInput")
        const address = []
        address.id = id
        address.world = world
        wsend("controllerChatMsg", input.value)
        recordDeviceChatMessage(address, input.value, true)
        input.value = ""
    }
})
document.getElementById("worldChatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const input = document.getElementById("worldChatInput")
        const address = []
        address.world = world
        wbroadcast("controllerWorldChatMsg", input.value)
        recordWorldChatMessage(address, input.value, true)
        input.value = ""
    }
})

// FUNCTIONS
function updateSelectedDevice(w, i) { // Selects and shows the information of the device
    world = w
    id = i
    const deviceInfo = document.getElementById("deviceInfo")
    const info = connectedComputers[w][i]
    function addInfo(t, v) {
        const row = document.createElement("tr")
        deviceInfo.appendChild(row)
        const title = document.createElement("td")
        title.style.textTransform = "capitalize"
        title.innerText = t
        row.appendChild(title)
        const value = document.createElement("td")
        if (typeof v == "object") {
            for (let key in v) {
                value.innerHTML += v[key] +"<br>"
            }
        } else {
            value.innerHTML += v
        }
        row.appendChild(value)
    }
    deviceInfo.innerHTML = ""
    addInfo("Name", i)
    for (let key in info) {
        if (key == "clock") {
            if (info)
            addInfo(key, new Date(info[key] * 1000).toISOString().substring(14, 19))
        } else {
            addInfo(key, info[key])
        }
    }
    for (let j=0; j<buttons.length; j++) {
        buttons[j].disabled = !i
    }
    document.getElementById("infectBtn").disabled = !info.drive // Disables the infect button if theres nothing in the drive
    updateDeviceChatLog()
}
function addDevice(address, info) { // adds the sender to the table connectedComputers, and refreshes selectors
    if (!connectedComputers[address.world]) { // if the world doesnt exist, make it
        connectedComputers[address.world] = []
    }
    connectedComputers[address.world][address.id] = info

    worldSelector.innerHTML = ""
    for (let world in connectedComputers) { // Creates world options
        const option = document.createElement("option")
        option.innerText = world
        option.value = world
        worldSelector.appendChild(option)
    }
    worldSelector.value = lastSelectedWorld
    listDevices()
}
let lastSelectedDevice
function listDevices() { // Lists the devices from the currently selected world from worldSelector
    deviceSelector.innerHTML = ""
    if (connectedComputers[worldSelector.value] == null) {return}
    for (let id in connectedComputers[worldSelector.value]) {
        const info = connectedComputers[worldSelector.value][id]
        const icon = document.createElement("img")
        icon.className = "icon"
        icon.style.marginRight = "16px"
        if (info) {
            if (info.advanced) {
                if (info.type == "computer") {
                    icon.src = "assets/img/device_icons/computer_adv.png"
                } else if (info.type == "turtle") {
                    icon.src = "assets/img/device_icons/turtle_adv.png"
                } else if (info.type == "pocket") {
                    icon.src = "assets/img/device_icons/pocket_adv.png"
                }
            } else {
                if (info.type == "computer") {
                    icon.src = "assets/img/device_icons/computer.png"
                } else if (info.type == "turtle") {
                    icon.src = "assets/img/device_icons/turtle.png"
                } else if (info.type == "pocket") {
                    icon.src = "assets/img/device_icons/pocket.png"
                }
            }
        }

        const p = document.createElement("p")
        p.appendChild(icon)
        p.innerHTML += id
        if (lastSelectedDevice == id) {
            p.className = "highlighted"
        }
        deviceSelector.appendChild(p)
        p.addEventListener("click", () => {
            lastSelectedDevice = id
            for (let i = 0; i < deviceSelector.children.length; i++) {
                deviceSelector.children[i].className = ""
            }
            playSound("wood_click.ogg", 0.1)
            p.className = "highlighted"
            updateSelectedDevice(worldSelector.value, id)
        })
    }
}
function updateWorldInfo(world) {
    const worldInfo = document.getElementById("worldInfo")
    function addInfo(t, v) {
        const row = document.createElement("tr")
        worldInfo.appendChild(row)
        const title = document.createElement("td")
        title.style.textTransform = "capitalize"
        title.style.minWidth = "100px"
        title.innerText = t
        row.appendChild(title)
        const value = document.createElement("td")
        if (typeof v == "object") {
            for (let key in v) {
                value.innerHTML += v[key] +"<br>"
            }
        } else {
            value.innerHTML += v
        }
        row.appendChild(value)
    }
    worldInfo.innerHTML = ""
    const info = worldInfos[world]
    for (let key in info) {
        addInfo(key, info[key])
    }
}
const promptBox = document.getElementById("prompt")
const promptInput = promptBox.querySelector("input")
const submitBtn = promptBox.querySelector(".submit")
const cancelBtn = promptBox.querySelector(".cancel")
let promptResolve = null
function resolvePrompt(value) {
    if (!promptResolve) {return}
    const resolve = promptResolve
    promptResolve = null
    promptBox.style.visibility = "hidden"
    resolve(value)
}
submitBtn.addEventListener("click", () => {resolvePrompt(promptInput.value)})
cancelBtn.addEventListener("click", () => {resolvePrompt(null)})
promptInput.addEventListener("keydown", (e) => {if (e.key === "Enter") resolvePrompt(promptInput.value)})
function ask(question, placeholder) { // Makes a popup that asks a question
    resolvePrompt(null) // Resolves the last prompt as cancelled
    const title = promptBox.querySelector("p")
    promptBox.style.visibility = "visible"
    playSound("hud_bubble.ogg", 1)
    // Set the window position
    const dims = promptBox.getBoundingClientRect()
    promptBox.style.top =  window.innerHeight/2 - dims.height/2 +"px"
    promptBox.style.left = window.innerWidth/2 - dims.width/2 +"px"
    title.innerText = question
    promptInput.placeholder = placeholder
    promptInput.value = ""
    promptInput.focus()

    return new Promise((resolve) => {
        promptResolve = resolve
    })
}
function alert(text) {
    const alertBox = document.getElementById("alert")
    const p = alertBox.querySelector("p")
    const button = alertBox.querySelector("button")
    if (Math.floor(Math.random()*100) == 0) { // funny
        button.innerText = "I thoroughly understand this statement and I am wholeheartedly aware of its meaning"
    } else {
        button.innerText = "Ok"
    }
    p.innerText = text
    const dims = alertBox.getBoundingClientRect()
    alertBox.style.top =  window.innerHeight/2 - dims.height/2 +"px"
    alertBox.style.left = window.innerWidth/2 - dims.width/2 +"px"
    alertBox.style.visibility = "visible"
    playSound("hud_bubble.ogg", 1)
    function close() {
        button.removeEventListener("click", close)
        alertBox.style.visibility = "hidden"
    }
    button.addEventListener("click", close)
}
function playSound(path,volume,speed) { // Plays a sound
    const audio = new Audio("assets/sounds/"+path)
    audio.volume = volume || 1
    audio.playbackRate = speed || 1
    audio.play()
}
function socketLogMsg(msg) { // Sends a message in the socket debug
    const log = document.getElementById("socketLog")
    const p = document.createElement("p")
    p.innerText = msg
    log.appendChild(p)
    if (log.children.length > 100) {
        log.removeChild(log.children[0])
    }
}
function recordDeviceChatMessage(address, msg, controller) {
    if (!deviceMessages[address.world]) {deviceMessages[address.world] = []}
    if (!deviceMessages[address.world][address.id]) {deviceMessages[address.world][address.id] = []}

    const log = deviceMessages[address.world][address.id]
    let msgInfo = []
    msgInfo.text = msg
    msgInfo.controller = controller
    log.push(msgInfo)

    if (world == address.world && id == address.id) {
        updateDeviceChatLog()
        if (!controller) playSound("hat.mp3", 0.5)
    } else {
        playSound("toggle.ogg")
    }
}
function updateDeviceChatLog() {
    const log = document.getElementById("deviceChatLog")
    log.innerHTML = ""
    if (!deviceMessages[world]) {return}
    if (!deviceMessages[world][id]) {return}
    for (const key in deviceMessages[world][id]) {
        const msg = deviceMessages[world][id][key]
        const p = document.createElement("p")
        if (msg.controller) {
            p.innerText = msg.text
            p.className = "fromController"
        } else {
            p.innerText = "> "+ msg.text
        }
        log.appendChild(p)
    }
    log.scrollTop = log.scrollHeight
}
function recordWorldChatMessage(address, msg, controller) {
    if (!worldMessages[address.world]) {worldMessages[address.world] = []}

    const log = worldMessages[address.world]
    let msgInfo = []
    msgInfo.text = msg
    msgInfo.controller = controller
    log.push(msgInfo)

    console.log(world, address.world)
    if (world == address.world) {
        updateWorldChatLog()
        if (!controller) playSound("hat.mp3", 0.5)
    } else {
        playSound("toggle.ogg")
    }
}
function updateWorldChatLog() {
    const log = document.getElementById("worldChatLog")
    log.innerHTML = ""
    if (!worldMessages[world]) {return}
    for (const key in worldMessages[world]) {
        const msg = worldMessages[world][key]
        const p = document.createElement("p")
        if (msg.controller) {
            p.innerText = msg.text
            p.className = "fromController"
        } else {
            p.innerText = msg.text
        }
        log.appendChild(p)
    }
    log.scrollTop = log.scrollHeight
}

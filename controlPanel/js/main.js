import * as panels from "./panels.js"
import * as render from "./render.js"
import * as utils from "./utils.js"
import * as ws from "./utils.js"

render.setUpdateSelectedDevice(updateSelectedDevice)

let world
let id
let connectedComputers = {}
const worldInfos = {}
const deviceMessages = {}
const worldMessages = {}

const buttons = document.getElementById("deviceActions").querySelectorAll("button")
for (let i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true
}

// WEBSOCKET
let socket = new WebSocket("wss://desktop-7pv85n7.tailbfa33.ts.net/")

function wsend(...data) { // Specific world and id
    socket.send(JSON.stringify([{ id: id, world: world }, ...data]))
    console.log("Sent: " + [{ id: id, world: world }, ...data])
}
function wbroadcast(...data) { // World broadcast
    socket.send(JSON.stringify([{ world: world }, ...data]))
    console.log("Broadcasted: " + [{ world: world }, ...data])
}
function wWideBroadcast(...data) { // Wide broadcast
    socket.send(JSON.stringify([{}, ...data]))
    console.log("Widely Broadcasted: " + [{}, ...data])
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
    socketLogMsg("Got: " + event.data)
    const data = JSON.parse(event.data)
    const address = data[0]
    if (data[1].substring(0, 4) != "Pong") {
        console.log("Got:", data)
    }
    if (data[1] == "Ping") {
        wsend("Pong Website")
    }

    // Run no matter the address
    if (data[1] == "shoutBack") {
        addDevice(address, data[2])
        if (data[3] == true) { // If its a startup
            if (Date.now() - lastRefreshTime > 1000) { // Plays a sound if it wasnt instant
                utils.playSound("charge.ogg", 0.8, 1.5)
            }
        } else { // If its an update
            if (worldSelector.value == address.world && id == address.id) { // If its the selected device, update it
                updateSelectedDevice(worldSelector.value, id)
                if (Date.now() - lastRefreshTime > 1000) {
                    utils.playSound("hud_bubble.ogg")
                }
            } else { // Its an update somewhere else
                if (Date.now() - lastRefreshTime > 1000) {
                    utils.playSound("toggle.ogg")
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
        utils.alert(data[2])
    }

    if (address.world == world) { // Run if it comes from the selected world

        if (address.id == id) { // Run if it comes from the selected ID & world

        }
    }
})

// INTERACTION
window.addEventListener("keydown", (e) => { // Debug
    if (e.key == "e") {
        addDevice({world: "simulation", id: "device"+ Math.floor(Math.random()*10000)}, {position: {x: Math.floor(Math.random()*10), y: Math.floor(Math.random()*10), z: Math.floor(Math.random()*10)}})
    }
})
let lastRefreshTime = Date.now()
document.getElementById("find").addEventListener("click", () => {
    connectedComputers = {}
    lastRefreshTime = Date.now()
    utils.playSound("spyglass_stop.ogg", 1, 1)
    wWideBroadcast("find")
})
const worldSelector = document.getElementById("worldSelector")
const deviceSelector = document.getElementById("deviceSelector")
let lastSelectedWorld
worldSelector.addEventListener("change", () => {
    lastSelectedWorld = worldSelector.value
    utils.playSound("wood_click.ogg", 0.1)
    world = worldSelector.value
    updateWorldInfo(world)
    updateWorldChatLog()
    listDevices()
    render.updateDevices(connectedComputers[world])
})
document.getElementById("connectBtn").addEventListener("click", () => {
    utils.ask("CloudCatcher Code:", "...").then(function (answer) {
        if (answer) {
            wsend("cloud", answer)
        }
    })
})
document.getElementById("rebootBtn").addEventListener("click", () => {
    wsend("reboot")
})
document.getElementById("runCodeBtn").addEventListener("click", () => {
    utils.ask("Lua Code:", "...").then(function (answer) {
        if (answer) {
            wsend("runCode", answer)
        }
    })
})
document.getElementById("infectBtn").addEventListener("click", () => {
    utils.ask("Infected Address ID:", "...").then(function (answer) {
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
        utils.ask("New " + setDataButtons[key] + ":", "...").then(function (answer) {
            if (answer) {
                wsend("changeData", setDataButtons[key], answer)
            }
        })
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
    if (!w) w = world
    world = w
    id = i
    utils.playSound("wood_click.ogg", 0.1)
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
                value.innerHTML += v[key] + "<br>"
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
    for (let j = 0; j < buttons.length; j++) {
        buttons[j].disabled = !i
    }
    if (info) document.getElementById("infectBtn").disabled = !info.drive // Disables the infect button if theres nothing in the drive
    updateDeviceChatLog()
    render.focusDevice(i)
    // Highlight linked device button
    lastSelectedDevice = id
    for (let i = 0; i < deviceSelector.children.length; i++) {
        deviceSelector.children[i].className = ""
    }
    deviceElementLinks[id].className = "highlighted"
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
    if (world == address.world) {
        render.updateDevices(connectedComputers[world])
    }
}
let deviceElementLinks = {}
let lastSelectedDevice
function listDevices() { // Lists the devices from the currently selected world from worldSelector
    deviceSelector.innerHTML = ""
    if (connectedComputers[worldSelector.value] == null) { return }
    deviceElementLinks = {}
    for (let id in connectedComputers[worldSelector.value]) {
        const info = connectedComputers[worldSelector.value][id]
        const icon = document.createElement("img")
        icon.className = "icon"
        icon.style.marginRight = "16px"
        // Set the device icon
        if (info) {
            let src = "assets/img/icons/device/"
            if (info.type) {
                src += info.type
                if (info.advanced) {
                    src += "_adv"
                }
            } else {
                src += "unknown"
            }
            src += ".png"
            icon.src = src
        }

        const p = document.createElement("p")
        p.appendChild(icon)
        p.innerHTML += id
        if (lastSelectedDevice == id) {
            p.className = "highlighted"
        }
        deviceSelector.appendChild(p)
        // Set selected device when clicked
        p.addEventListener("click", () => {
            updateSelectedDevice(worldSelector.value, id)
        })
        deviceElementLinks[id] = p
    }
}
function updateWorldInfo(world) { // Updates the world's info panel
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
        if (typeof v == "object") { // If the item is a list
            if (t == "players") { // If its players
                for (let player of v) {
                    const span = document.createElement("span")
                    span.innerHTML = player
                    span.style.cursor = "pointer"
                    value.appendChild(span)
                    span.addEventListener("click", () => {
                        utils.ask(`Toast to ${player}:`).then(function (answer) {
                            if (answer) {
                                wbroadcast("sendToast", player, answer)
                            }
                        })
                    })
                }
            } else { // If its a regular list
                for (let key in v) {
                    value.innerHTML += v[key] + "<br>"
                }
            }
        } else { // If its a single value
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
    if (!deviceMessages[address.world]) { deviceMessages[address.world] = [] }
    if (!deviceMessages[address.world][address.id]) { deviceMessages[address.world][address.id] = [] }

    const log = deviceMessages[address.world][address.id]
    let msgInfo = []
    msgInfo.text = msg
    msgInfo.controller = controller
    log.push(msgInfo)

    if (world == address.world && id == address.id) {
        updateDeviceChatLog()
        if (!controller) {utils.playSound("hat.mp3", 0.5)}
    } else {
        utils.playSound("toggle.ogg")
    }
}
function updateDeviceChatLog() {
    const log = document.getElementById("deviceChatLog")
    log.innerHTML = ""
    if (!deviceMessages[world]) { return }
    if (!deviceMessages[world][id]) { return }
    for (const key in deviceMessages[world][id]) {
        const msg = deviceMessages[world][id][key]
        const p = document.createElement("p")
        if (msg.controller) {
            p.innerText = msg.text
            p.className = "fromController"
        } else {
            p.innerText = "> " + msg.text
        }
        log.appendChild(p)
    }
    log.scrollTop = log.scrollHeight
}
function recordWorldChatMessage(address, msg, controller) {
    if (!worldMessages[address.world]) { worldMessages[address.world] = [] }

    const log = worldMessages[address.world]
    let msgInfo = []
    msgInfo.text = msg
    msgInfo.controller = controller
    log.push(msgInfo)

    console.log(world, address.world)
    if (world == address.world) {
        updateWorldChatLog()
        if (!controller) utils.playSound("hat.mp3", 0.5)
    } else {
        utils.playSound("toggle.ogg")
    }
}
function updateWorldChatLog() {
    const log = document.getElementById("worldChatLog")
    log.innerHTML = ""
    if (!worldMessages[world]) { return }
    for (const key in worldMessages[world]) {
        const msg = worldMessages[world][key]
        const p = document.createElement("p")
        if (msg.controller) {
            p.innerText = "/> "+ msg.text
            p.className = "fromController"
        } else {
            p.innerText = msg.text
        }
        log.appendChild(p)
    }
    log.scrollTop = log.scrollHeight
}
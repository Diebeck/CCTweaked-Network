const panels = document.querySelectorAll("aside > details")

// Retrieve open/closed states of panels
if (localStorage.getItem("panelStates")) {
    const panelStates = JSON.parse(localStorage.getItem("panelStates"))
    for (let i = 0; i < panels.length; i++) {
        panels[i].open = panelStates[i]
    }
}

// Saves panel states every time theyre toggled
for (const panel of panels) {
    panel.addEventListener("toggle", () => {
        const states = []
        for (let i = 0; i < panels.length; i++) {
            states[i] = panels[i].open
        }
        localStorage.setItem("panelStates", JSON.stringify(states))
    })
}

let shiftDown = false
window.addEventListener("keydown", (e) => {
    if (e.shiftKey) {
        shiftDown = true
    }
})
window.addEventListener("keyup", (e) => {
    if (!e.shiftKey) {
        shiftDown = false
    }
})

// Makes panels draggable
const panelPositions = JSON.parse(localStorage.getItem("panelPositions"))
let activePanel = null
let lastActivePanel = null
let offsetX = 0, offsetY = 0
document.querySelectorAll("aside > details").forEach(panel => {
    const summary = panel.querySelector("summary")
    if (summary.innerHTML in panelPositions) {
        const pos = panelPositions[summary.innerHTML]
        panel.style.left = pos.x
        panel.style.top = pos.y
        panel.classList.add("dragging")
        panel.classList.add("free")
    }
    summary.addEventListener("mousedown", (e) => {
        if (!shiftDown) {return}
        activePanel = panel
        lastActivePanel = panel
        offsetX = e.clientX - panel.offsetLeft
        offsetY = e.clientY - panel.offsetTop
        panel.classList.add("dragging")
        panel.classList.add("free")
    })
    panel.addEventListener("click", (e) => {
        if (panel == lastActivePanel) {
            e.preventDefault()
            lastActivePanel = null
        }
    })
})
document.addEventListener("mousemove", (e) => {
    if (!activePanel) {return}
    //if (!shiftDown) {return}
    const increment = 10
    let x = e.clientX - offsetX
    let y = e.clientY - offsetY
    x = Math.floor(x / increment) * increment
    y = Math.floor(y / increment) * increment
    x = Math.min(window.screen.width - 100, x)
    y = Math.min(window.screen.height - 200, y)
    activePanel.style.left = x + "px"
    activePanel.style.top = y + "px"
})
document.addEventListener("mouseup", (e) => {
    if (activePanel) {
        activePanel.classList.remove("dragging")
        const id = activePanel.querySelector("summary").innerHTML
        if (e.clientX < 350) {
            activePanel.classList.remove("free")
            delete panelPositions[id]
        } else {
            panelPositions[id] = {}
            panelPositions[id].y = activePanel.style.top
            panelPositions[id].x = activePanel.style.left
        }
        localStorage.setItem("panelPositions", JSON.stringify(panelPositions))
    }
    
    activePanel = null
})
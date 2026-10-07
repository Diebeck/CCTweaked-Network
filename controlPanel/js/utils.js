const promptBox = document.getElementById("prompt")
const promptInput = promptBox.querySelector("input")
const submitBtn = promptBox.querySelector(".submit")
const cancelBtn = promptBox.querySelector(".cancel")
let promptResolve = null

function resolvePrompt(value) {
    if (!promptResolve) { return }
    const resolve = promptResolve
    promptResolve = null
    promptBox.style.visibility = "hidden"
    resolve(value)
}

submitBtn.addEventListener("click", () => { resolvePrompt(promptInput.value) })
cancelBtn.addEventListener("click", () => { resolvePrompt(null) })
promptInput.addEventListener("keydown", (e) => { if (e.key === "Enter") resolvePrompt(promptInput.value) })
/**
 * Prompts the user with a stylized prompt box
 * @param {String} question 
 * @param {String} placeholder
 */
    export function ask(question, placeholder) { // Makes a popup that asks a question
    resolvePrompt(null) // Resolves the last prompt as cancelled
    const title = promptBox.querySelector("p")
    promptBox.style.visibility = "visible"
    playSound("hud_bubble.ogg", 1)
    // Set the window position
    const dims = promptBox.getBoundingClientRect()
    promptBox.style.top = window.innerHeight / 2 - dims.height / 2 + "px"
    promptBox.style.left = window.innerWidth / 2 - dims.width / 2 + "px"
    title.innerText = question
    promptInput.placeholder = placeholder
    promptInput.value = ""
    promptInput.focus()

    return new Promise((resolve) => {
        promptResolve = resolve
    })
}

/**
 * Shows a stylized alert box
 * @param {String} text 
 */
export function alert(text) {
    const alertBox = document.getElementById("alert")
    const p = alertBox.querySelector("p")
    const button = alertBox.querySelector("button")
    if (Math.floor(Math.random() * 100) == 0) { // funny
        button.innerText = "I thoroughly understand this statement and I am wholeheartedly aware of its meaning"
    } else {
        button.innerText = "Ok"
    }
    p.innerText = text
    const dims = alertBox.getBoundingClientRect()
    alertBox.style.top = window.innerHeight / 2 - dims.height / 2 + "px"
    alertBox.style.left = window.innerWidth / 2 - dims.width / 2 + "px"
    alertBox.style.visibility = "visible"
    playSound("hud_bubble.ogg", 1)
    function close() {
        button.removeEventListener("click", close)
        alertBox.style.visibility = "hidden"
    }
    button.addEventListener("click", close)
}

/**
 * Plays a sound
 * @param {String} path 
 * @param {Number} volume 
 * @param {Number} speed 
 */
export function playSound(path, volume, speed) {
    const audio = new Audio("assets/sounds/" + path)
    audio.volume = volume || 1
    audio.playbackRate = speed || 1
    audio.play()
}
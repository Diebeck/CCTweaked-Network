import * as THREE from "three"
import { OrbitControls } from "https://unpkg.com/three@0.186.1/examples/jsm/controls/OrbitControls.js"

let updateSelectedDevice
export function setUpdateSelectedDevice(func) {
	updateSelectedDevice = func
}

const main = document.getElementById("main")

const width = main.offsetWidth, height = main.offsetHeight

// Renderer
const renderer = new THREE.WebGLRenderer()
renderer.setSize(width, height)
renderer.setAnimationLoop(animate)
main.appendChild(renderer.domElement)

// Texture rendering function
const loader = new THREE.TextureLoader()
loader.setPath("/controlPanel/assets/img/textures/")
function loadTexture(path) {
	const texture = loader.load(path)
	texture.magFilter = THREE.NearestFilter
	texture.colorSpace = THREE.SRGBColorSpace
	return texture
}
function cubeTexture(color, r, l, u, d, b, f) {
	return [
		new THREE.MeshStandardMaterial({color: color, map: loadTexture(r)}),
		new THREE.MeshStandardMaterial({color: color, map: loadTexture(l)}),
		new THREE.MeshStandardMaterial({color: color, map: loadTexture(u)}),
		new THREE.MeshStandardMaterial({color: color, map: loadTexture(d)}),
		new THREE.MeshStandardMaterial({color: color, map: loadTexture(b)}),
		new THREE.MeshStandardMaterial({color: color, map: loadTexture(f)})
	]
}

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0.05, 0.05, 0.05)

// Camera
const camera = new THREE.PerspectiveCamera(90, width / height, 0.01, 100)
camera.updateProjectionMatrix()

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = false
controls.dampingFactor = 0.1
controls.maxDistance = 60
controls.minDistance = 1

// Lighting
const light1 = new THREE.DirectionalLight(0xffeeee, 3)
light1.position.set(2, 3, 1)
const light2 = new THREE.DirectionalLight(0xddddff, 1)
light2.position.set(-2, -1, -3)
const ambient = new THREE.AmbientLight(0xffffff, 1)
scene.add(light1, light2, ambient)

// Resizing handler
window.addEventListener("resize", () => {
	camera.aspect = main.offsetWidth / main.offsetHeight
    camera.updateProjectionMatrix()
    renderer.setSize(main.offsetWidth, main.offsetHeight)
})

// Raycaster & mouse setup
const raycaster = new THREE.Raycaster()

function raycastObject(x, y, group = scene) {
	const mouse = new THREE.Vector2()
	mouse.x = (x / main.offsetWidth) * 2 - 1
    mouse.y = -(y / main.offsetHeight) * 2 + 1
	raycaster.setFromCamera(mouse, camera)
	const intersects = raycaster.intersectObjects(group.children)
	if (intersects.length == 0) return
	const firstObject = intersects[0].object
	return firstObject
}

// Canvas clicks
const clickStart = {x:0,y:0}
renderer.domElement.addEventListener("mousedown", (event) => {
	clickStart.x = event.offsetX
	clickStart.y = event.offsetY
})

renderer.domElement.addEventListener("mouseup", (event) => {
	if (clickStart.x == event.offsetX &&
		clickStart.y == event.offsetY) {
		
		if (event.button == 0) { // Left click
			// Cast ray from camera to mouse position and check intersections
			const clicked = raycastObject(event.offsetX, event.offsetY)
			if (clicked) {
				const device = Object.keys(deviceMeshLinks).find(key => deviceMeshLinks[key] === clicked)
				updateSelectedDevice(null, device)
			}
		} else if (event.button == 2) { // Right click
			console.log("Right click")
		}
	}
})

// Devices
let deviceMeshLinks = {}
const devicesMeshes = new THREE.Group()
scene.add(devicesMeshes)
export function updateDevices(d) {
	devicesMeshes.clear()
	let i = 0
	for (const device in d) {
		const info = d[device]
		if (!info.position) {continue}

		let color = info.advanced ? "#DEDE6C" : "#bbbbbb"
		let dims
		let material
		if (info.type == "turtle") {
			dims = [0.8, 0.8, 0.8]
			material = cubeTexture(color,
				"turtle/right.png",
				"turtle/left.png",
				"turtle/top.png",
				"turtle/bottom.png",
				"turtle/back.png",
				"turtle/front.png"
			)
		} else if (info.type == "pocket") {
			dims = [12/16, 14/16, 1/16]
			material = cubeTexture(color,
				"pocket_side.png",
				"pocket_side.png",
				"pocket_side.png",
				"pocket_side.png",
				"pocket.png",
				"pocket.png",
			)
		} else {
			dims = [1, 1, 1]
			material = cubeTexture(color,
				"computer.png",
				"computer.png",
				"computer_top.png",
				"computer_top.png",
				"computer.png",
				"computer.png",
			)
		}

		const geometry = new THREE.BoxGeometry(...dims)
		const box = new THREE.Mesh(geometry, material)

		deviceMeshLinks[device] = box // Link the id to the box
		if (info.position) {
			const pos = info.position
			box.position.set(pos.x, pos.y, pos.z)
		}
		devicesMeshes.add(box)
	}
}

export function focusDevice(device) {
	if (!deviceMeshLinks[device]) {return}
	const mesh = deviceMeshLinks[device]

	// Get rid of all emissives
	for (const link in deviceMeshLinks) {
		for (const material of deviceMeshLinks[link].material) {
			material.emissive.set(0,0,0)
		}
	}
	// Give focused emissive
	for (const material of mesh.material) {
		material.emissive.set(0.2, 0.2, 0.2)
	}

	// Set camera
	const pos = mesh.position
	controls.target.x = pos.x
	controls.target.y = pos.y
	controls.target.z = pos.z
	//camera.position.set(pos.x+3, pos.y+3, pos.z+3)
	controls.update()
}

// animation
function animate( time ) {

	renderer.render(scene, camera)
}
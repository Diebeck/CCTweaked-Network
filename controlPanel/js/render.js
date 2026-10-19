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
camera.position.set(3, 3, 3)
let cameraTarget = {x:0, y:0, z:0}

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = false
controls.dampingFactor = 0.1
controls.maxDistance = 60
controls.minDistance = 1

// Checks if camera pan starts, and makes camera stop following target
let followCameraTarget = true
controls.addEventListener("start", (event) => {
	if (controls.state == 2) {
		followCameraTarget = false
	}
})

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
				updateSelectedDevice(undefined, device)
			}
		} else if (event.button == 2) { // Right click
			console.log("Right click")
		}
	}
})

// Devices
let lastSelectedDevice
export function setLastSelectedDevice(id) {
	lastSelectedDevice = id
}
let deviceMeshLinks = {}
const devicesMeshes = new THREE.Group()
scene.add(devicesMeshes)
export function updateDevices(d) {
	// If any current device isnt found in the new device list, remove it
	for (const device in deviceMeshLinks) {
		if (!(device in d)) {
			devicesMeshes.remove(deviceMeshLinks[device])
			delete deviceMeshLinks[device]
		}
	}
	let noPosIndex = 0
	for (const device in d) {
		// If the device already exists, continue
		if (device in deviceMeshLinks) {continue}
		let info = d[device]
		// If device has no position, still render, but far away and in a line
		if (!info.position) {
			info.position = {x: noPosIndex*1.5, y: 500, z:0}
			noPosIndex++
		}

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

		// If this device and mesh is the same as the last selected device, focus it
		if (device == lastSelectedDevice) {
			focusDevice(lastSelectedDevice, followCameraTarget)
		}
	}
}

export function focusDevice(id, setCamera = true) {
	if (!deviceMeshLinks[id]) {return}
	const mesh = deviceMeshLinks[id]

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
	if (setCamera) {
		followCameraTarget = true
		const pos = mesh.position
		/* cameraTarget.x = pos.x
		cameraTarget.y = pos.y
		cameraTarget.z = pos.z */
		cameraTarget = mesh.position
	}
}

const lerpBuffer = []
export function updateDevicePosition(id, pos) {
	if (!deviceMeshLinks[id]) {return}
	const mesh = deviceMeshLinks[id]
	lerpBuffer[id] = {mesh:mesh, pos:{x: pos.x, y: pos.y, z: pos.z}}
	//mesh.position.set(pos.x, pos.y, pos.z)
}

// Main render loop
let delay = 1
function animate(time) {
	const delta = time - delay
	//console.log(delta)

	if (followCameraTarget) { // Camera lerp
		const delay = 10
		const xChange = (cameraTarget.x - controls.target.x) / delay / (6 / delta)
		const yChange = (cameraTarget.y - controls.target.y) / delay / (6 / delta)
		const zChange = (cameraTarget.z - controls.target.z) / delay / (6 / delta)
		controls.target.x += xChange
		controls.target.y += yChange
		controls.target.z += zChange
		camera.position.x += xChange
		camera.position.y += yChange
		camera.position.z += zChange
	}

	for (const id in lerpBuffer) { // Device movement lerp
		const mesh = lerpBuffer[id].mesh
		const pos = lerpBuffer[id].pos
		const delay = 50
		mesh.position.x += (pos.x - mesh.position.x) / delay / (6 / delta)
		mesh.position.y += (pos.y - mesh.position.y) / delay / (6 / delta)
		mesh.position.z += (pos.z - mesh.position.z) / delay / (6 / delta)
		if (mesh.position.distanceTo(new THREE.Vector3(pos.x, pos.y, pos.z)) < 0.01) {
			mesh.position.set(pos.x, pos.y, pos.z)
			delete lerpBuffer[id]
		}
	}

	controls.update()
	renderer.render(scene, camera)
	delay = time
}
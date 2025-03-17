const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 1.6, 0), scene);
camera.attachControl(canvas, true);

// Enable WebXR
async function initializeWebXR() {
    try {
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: { sessionMode: "immersive-ar" },
        });
        console.log("WebXR session started");

        const xrFeaturesManager = xrHelper.baseExperience.featuresManager;
        const xrHitTest = xrFeaturesManager.enableFeature(BABYLON.WebXRHitTest, "latest");

        xrHitTest.onHitTestResultObservable.add((results) => {
            if (results.length) {
                const hitPose = results[0].transformationMatrix;
                const floorPosition = BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.Zero(), hitPose);
                createPath(floorPosition);
            }
        });

    } catch (error) {
        console.error("Error initializing WebXR:", error);
    }
}
initializeWebXR();

const video = document.getElementById("qr-video");
const canvasQR = document.getElementById("qr-canvas");
canvasQR.width = 640; // Increase resolution
canvasQR.height = 480;
const ctx = canvasQR.getContext("2d");

navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((stream) => {
    video.srcObject = stream;
    video.play();
});
let qrDetected = false; // Ensure one-time detection

function scanQR() {
    ctx.drawImage(video, 0, 0, canvasQR.width, canvasQR.height);
    const imageData = ctx.getImageData(0, 0, canvasQR.width, canvasQR.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && !qrDetected) {
        console.log("QR Code Detected:", code.data);
        
        qrDetected = true; 

        let startPosition = getWorldPositionFromQR(code.location);
        console.log("World Position:", startPosition);
        
        createPath(startPosition);
    }

    requestAnimationFrame(scanQR);
}

function getWorldPositionFromQR(qrLocation) {
    console.log("QR Location:", qrLocation);

    const screenX = qrLocation.topLeftCorner.x + (qrLocation.bottomRightCorner.x - qrLocation.topLeftCorner.x) / 2;
    const screenY = qrLocation.topLeftCorner.y + (qrLocation.bottomRightCorner.y - qrLocation.topLeftCorner.y) / 2;

    const ray = scene.createPickingRay(screenX, screenY, BABYLON.Matrix.Identity(), camera);
    const hit = scene.pickWithRay(ray);

    if (hit.hit) {
        let pos = hit.pickedPoint;
        console.log("Picked Position:", pos);
        return new BABYLON.Vector3(pos.x, 0, pos.z);
    }

    console.log("No hit detected, returning default position.");
    return new BABYLON.Vector3(0, 0, -2); 
}

video.addEventListener("loadeddata", () => {
    console.log("Camera feed is active");
    scanQR(); // Start scanning only after the video is ready
});

let currentLine = null; // Store the last line reference

function createPath(startPosition) {
    console.log("Creating path at:", startPosition);

    // Remove existing line
    if (currentLine) {
        console.log("Removing existing line");
        currentLine.dispose();
    }

    const points = [
        startPosition,
        new BABYLON.Vector3(startPosition.x, startPosition.y, startPosition.z - 1),
        new BABYLON.Vector3(startPosition.x, startPosition.y, startPosition.z - 2),
    ];

    currentLine = BABYLON.MeshBuilder.CreateLines("navigationPath", { points }, scene);
    currentLine.color = new BABYLON.Color3(1, 0, 0); // Red color
    currentLine.enableEdgesRendering();
    currentLine.edgesWidth = 10; // Make the line thicker

    console.log("Line created:", currentLine);
}

let debugSphere = BABYLON.MeshBuilder.CreateSphere("debugSphere", { diameter: 0.1 }, scene);
debugSphere.position = startPosition;
debugSphere.material = new BABYLON.StandardMaterial("debugMat", scene);
debugSphere.material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
console.log("Debug sphere at:", startPosition);

engine.runRenderLoop(() => {
    scene.render();
});

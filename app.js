const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 1.6, 0), scene);
camera.attachControl(canvas, true);

// Enable WebXR
async function initializeWebXR() {
    try {
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: "immersive-ar",
            },
        });
        console.log("WebXR session started");
    
        // Set up hit-test for floor detection
        const xrFeaturesManager = xrHelper.baseExperience.featuresManager;
        const xrHitTest = xrFeaturesManager.enableFeature(BABYLON.WebXRHitTest, "latest");
    
        xrHitTest.onHitTestResultObservable.add((results) => {
            console.log("Hit test results:", results.length);
            if (results.length) {
                const hitPose = results[0].transformationMatrix;
                const floorPosition = BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.Zero(), hitPose);
                console.log("Floor position:", floorPosition);
                createPath(floorPosition);
            }
        });
        
    } catch (error) {
        console.error("WebXR initialization failed:", error);
    }
}
initializeWebXR();

const video = document.getElementById("qr-video");
const canvasQR = document.getElementById("qr-canvas");
const ctx = canvasQR.getContext("2d");

navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((stream) => {
    video.srcObject = stream;
    video.play();
});

function scanQR() {
    ctx.drawImage(video, 0, 0, canvasQR.width, canvasQR.height);
    const imageData = ctx.getImageData(0, 0, canvasQR.width, canvasQR.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
        console.log("QR Code Detected:", code.data);
        // Convert QR Code position to Babylon.js world coordinates
        const qrPosition = getWorldPositionFromQR(code.location);

        // Place the navigation path in front of the QR code
        createPath(qrPosition);
    } else {
        console.log("No QR code detected");
    }

    requestAnimationFrame(scanQR);
}

function getWorldPositionFromQR(qrLocation) {
    const screenX = qrLocation.topLeftCorner.x + (qrLocation.bottomRightCorner.x - qrLocation.topLeftCorner.x) / 2;
    const screenY = qrLocation.topLeftCorner.y + (qrLocation.bottomRightCorner.y - qrLocation.topLeftCorner.y) / 2;

    // Convert screen space to 3D world space
    const pickResult = scene.pick(screenX, screenY);
    if (pickResult.hit) {
        return pickResult.pickedPoint;
    }

    // Default position if pick fails
    return new BABYLON.Vector3(0, 0, -2);
}


video.addEventListener("loadeddata", () => {
    console.log("Camera feed is active");
    scanQR(); // Start scanning only after the video is ready
});


function createPath(startPosition) {
    const points = [
        startPosition,
        new BABYLON.Vector3(startPosition.x, startPosition.y, startPosition.z - 1), // Move forward
        new BABYLON.Vector3(startPosition.x, startPosition.y, startPosition.z - 2),
    ];

    const line = BABYLON.MeshBuilder.CreateLines("navigationPath", { points }, scene);
    line.color = new BABYLON.Color3(1, 0, 0); // Red color
}


const footprintTexture = new BABYLON.StandardMaterial("footprintMat", scene);
footprintTexture.diffuseTexture = new BABYLON.Texture("footprint.png", scene); // Load a footprint texture

function createFootstep(position) {
    const footprint = BABYLON.MeshBuilder.CreatePlane("footprint", { width: 0.2, height: 0.4 }, scene);
    footprint.position = position;
    footprint.material = footprintTexture;
    footprint.rotation.x = Math.PI / 2; // Lay flat on the floor
}

function createFootstepsPath(startPosition) {
    const stepCount = 10;
    for (let i = 0; i < stepCount; i++) {
        setTimeout(() => {
            createFootstep(new BABYLON.Vector3(startPosition.x + i * 0.3, startPosition.y, startPosition.z + i * 0.3));
        }, i * 500); // Animate footsteps appearing over time
    }
}


engine.runRenderLoop(() => {
    scene.render();
});

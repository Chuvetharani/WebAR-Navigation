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
            console.log("Hit test results:", results.length);
            if (results.length) {
                const hitPose = results[0].transformationMatrix;
                const floorPosition = BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.Zero(), hitPose);
                console.log("Floor position:", floorPosition);
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

function scanQR() {
    ctx.drawImage(video, 0, 0, canvasQR.width, canvasQR.height);
    const imageData = ctx.getImageData(0, 0, canvasQR.width, canvasQR.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
        console.log("QR Code Detected:", code.data);
        placeNavigationPath(code.data); // Example: Use QR code data for path placement
    }

    requestAnimationFrame(scanQR);
}

video.addEventListener("loadeddata", () => {
    console.log("Camera feed is active");
    scanQR(); // Start scanning only after the video is ready
});

function createPath(startPosition) {
    const points = [
        startPosition,
        new BABYLON.Vector3(startPosition.x + 1, startPosition.y, startPosition.z + 1),
        new BABYLON.Vector3(startPosition.x + 2, startPosition.y, startPosition.z + 2),
    ];

    const myColors = [
        new BABYLON.Color4(1, 0, 0, 1),
        new BABYLON.Color4(0, 1, 0, 1),
        new BABYLON.Color4(0, 0, 1, 1),
        new BABYLON.Color4(1, 1, 0, 1)
    ]

    const line = BABYLON.MeshBuilder.CreateLines("navigationPath", { points, colors: myColors }, scene);
    const debugCube = BABYLON.MeshBuilder.CreateBox("debugCube", { size: 0.2 }, scene);
    debugCube.position = new BABYLON.Vector3(0, 1, 0); // Place it at eye level
    
    //line.color = new BABYLON.Color3(0, 1, 0); // Green color
    scene.addMesh(line);
}

engine.runRenderLoop(() => {
    scene.render();
});

const info = document.getElementById("info");
let width = 360;
let height = 640;
// whether streaming video from the camera.
let streaming = false;
const video = document.getElementById("videoInput");
let stream = null;
let cap = null;
let puzzleNotFound = null;
let puzzleSolved = null;
let gridSize = null;

let src = null;
let processedImage = null;
let dstCropped = null;
let contours = null;
let hierarchy = null;
let approx = null;

async function startCamera() {
  if (streaming) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { height: height, width: width, facingMode: "environment" },
    audio: false,
  });
  video.srcObject = stream;
  video.play();

  video.addEventListener(
    "canplay",
    function (ev) {
      if (!streaming) {
        video.width = width;
        video.height = height;
        streaming = true;
        cap = new cv.VideoCapture(video);
      }
      startVideoProcessing();
    },
    false
  );
}

function stopCamera() {
  if (!streaming) return;
  stopVideoProcessing();
  document
    .getElementById("videoOutput")
    .getContext("2d")
    .clearRect(0, 0, width, height);
  video.pause();
  video.srcObject = null;
  stream.getVideoTracks()[0].stop();
  streaming = false;
}

async function startVideoProcessing() {
  if (!streaming) {
    console.warn("Please startup your webcam");
    return;
  }
  stopVideoProcessing();
  src = new cv.Mat(height, width, cv.CV_8UC4);
  processed = new cv.Mat(height, width, cv.CV_8UC1);
  puzzleSolved = false;
  info.innerHTML = "Searching...";
  requestAnimationFrame(processVideo);
}
async function processVideo() {
  try {
    cap.read(src);
    processImage(src);
    cv.imshow("videoOutput", processed);
    requestAnimationFrame(processVideo);
  } catch (err) {
    console.log(err);
    requestAnimationFrame(processVideo);
  }
}
function stopVideoProcessing() {
  if (src != null && !src.isDeleted()) src.delete();
}
function opencvIsReady() {
  console.log("OpenCV.js is ready");
  startCamera();
}

function processImage() {
  // Grayscale
  cv.cvtColor(src, processed, cv.COLOR_RGBA2GRAY);

  // Guassian filter
  let ksize = new cv.Size(5, 5);
  cv.GaussianBlur(processed, processed, ksize, 0, 0, cv.BORDER_DEFAULT);
  ksize.delete;

  // Threshold
  cv.adaptiveThreshold(
    processed,
    processed,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV,
    7,
    2
  );
  return processed;
}

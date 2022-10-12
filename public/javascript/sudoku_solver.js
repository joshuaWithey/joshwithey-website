let video = document.getElementById("videoInput");

navigator.mediaDevices
  .getUserMedia({ video: true, audio: false })
  .then(function (stream) {
    // video.width = 640;
    // video.height = 480;
    cameraInfo = stream.getVideoTracks()[0].getCapabilities();
    console.log(cameraInfo.height.max);
    video.height = cameraInfo.height.max;
    video.srcObject = stream;
    video.play();
  })
  .catch(function (err) {
    console.log("An error occurred! " + err);
  });

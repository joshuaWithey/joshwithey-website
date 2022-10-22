const board = [
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
];

const info = document.getElementById("info");
let width = 480;
let height = 640;
// Import keras model
let model = null;
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
// let dstC2 = null;
// let dstC3 = null;
// let dstC4 = null;
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
  model = await tf.loadLayersModel(
    "https://raw.githubusercontent.com/joshuaWithey/Sudoku-Solver/main/docs/resources/model.json"
  );
  src = new cv.Mat(height, width, cv.CV_8UC4);
  processed = new cv.Mat(height, width, cv.CV_8UC1);

  contours = new cv.MatVector();
  hierarchy = new cv.Mat();
  approx = new cv.Mat();

  puzzleSolved = false;
  info.innerHTML = "Searching...";
  requestAnimationFrame(processVideo);
}
async function processVideo() {
  try {
    cap.read(src);
    processImage(src);
    let corners = findCorners();
    if (corners != null) {
      if (!puzzleSolved) {
        let cropped = cropPuzzle(corners);
        gridSize = cropped.rows;
        extractedDigits = extractBoard(cropped);
        if (extractedDigits != null) {
          for (let i = 0; i < extractedDigits.length; i += 3) {
            prediction = await model.predict(extractedDigits[i]).data();
            extractedDigits[i].dispose();
            let results = Array.from(prediction);
            let maxIndex = 0;
            let max = results[0];
            for (let k = 1; k < 9; k++) {
              if (results[k] > max) {
                max = results[k];
                maxIndex = k;
              }
            }
            board[extractedDigits[i + 1]][extractedDigits[i + 2]][0] =
              maxIndex + 1;
            board[extractedDigits[i + 1]][extractedDigits[i + 2]][1] = 1;
          }
          if (isValidSudoku(board)) {
            solveSudoku(board);
            puzzleSolved = true;
          } else {
            resetBoard();
          }
        }
        cropped.delete();
      }
    } else {
      resetBoard();
      puzzleSolved = false;
      info.innerHTML = "Searching...";
    }
    if (puzzleSolved) {
      info.innerHTML = "Puzzle solved!";
      overlayPuzzle(corners);
    }
    cv.imshow("videoOutput", src);

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
function resetBoard() {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      board[i][j][0] = 0;
      board[i][j][1] = 0;
    }
  }
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

function findCorners() {
  cv.findContours(
    processed,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );

  // Find index of largest contour by area
  if (contours.size() > 0) {
    let maxIndex = 0;
    let area = 0;
    let tempArea;
    for (let i = 0; i < contours.size(); i++) {
      tempArea = cv.contourArea(contours.get(i), false);
      if (tempArea > area) {
        maxIndex = i;
        area = tempArea;
      }
    }
    area.delete;
    tempArea.delete;

    // Check contour is roughly square
    let perimeter = cv.arcLength(contours.get(maxIndex), true);
    cv.approxPolyDP(contours.get(maxIndex), approx, 0.1 * perimeter, true);
    perimeter.delete;

    // If approx has 4 corners, assume puzzle found for now
    if (approx.rows == 4) {
      // Find corners of largest contour representing the sudoku grid
      //Top left should have the smallest (x + y) value
      // Top right has largest (x - y) value
      // Bottom right corner of puzzle will have largest (x + y) value
      // Bottom left has smallest (x - y) value
      // return np.array([top_left, top_right, bottom_right, bottom_left]), processed_image

      // Array for holding 4 corner points of the puzzle
      let corners = [9999, 9999, 0, 0, 0, 0, 9999, 9999];

      for (let i = 0; i < contours.get(maxIndex).data32S.length; i += 2) {
        // Top left
        if (
          contours.get(maxIndex).data32S[i] +
            contours.get(maxIndex).data32S[i + 1] <
          corners[0] + corners[1]
        ) {
          corners[0] = contours.get(maxIndex).data32S[i];
          corners[1] = contours.get(maxIndex).data32S[i + 1];
        }
        // Top right
        if (
          contours.get(maxIndex).data32S[i] -
            contours.get(maxIndex).data32S[i + 1] >
          corners[2] - corners[3]
        ) {
          corners[2] = contours.get(maxIndex).data32S[i];
          corners[3] = contours.get(maxIndex).data32S[i + 1];
        }
        // Bottom right
        if (
          contours.get(maxIndex).data32S[i] +
            contours.get(maxIndex).data32S[i + 1] >
          corners[4] + corners[5]
        ) {
          corners[4] = contours.get(maxIndex).data32S[i];
          corners[5] = contours.get(maxIndex).data32S[i + 1];
        }
        // Bottom left
        if (
          contours.get(maxIndex).data32S[i] -
            contours.get(maxIndex).data32S[i + 1] <
          corners[6] - corners[7]
        ) {
          corners[6] = contours.get(maxIndex).data32S[i];
          corners[7] = contours.get(maxIndex).data32S[i + 1];
        }
      }
      return corners;
    }
  }
  return null;
}

function cropPuzzle(corners) {
  // Set side to length from top left to top right corner, use for warped image
  let a = corners[0] - corners[2];
  let b = corners[1] - corners[3];
  let side = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));

  croppedDst = new cv.Mat(side, side, cv.CV_8UC1);

  let dsize = new cv.Size(side, side);
  let pt1 = cv.matFromArray(4, 1, cv.CV_32FC2, corners);
  let pt2 = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    side,
    0,
    side,
    side,
    0,
    side,
  ]);
  let M = cv.getPerspectiveTransform(pt1, pt2);
  cv.warpPerspective(
    processed,
    croppedDst,
    M,
    dsize,
    cv.INTER_LINEAR,
    cv.BORDER_CONSTANT,
    new cv.Scalar()
  );
  dsize.delete;
  M.delete();
  pt1.delete();
  pt2.delete();
  return croppedDst;
}

// Sorting functions
function swap(items, leftIndex, rightIndex) {
  var temp = items[leftIndex];
  items[leftIndex] = items[rightIndex];
  items[rightIndex] = temp;
}
function partition(items, left, right) {
  var pivot = cv.boundingRect(items[Math.floor((right + left) / 2)]).x; //middle element
  var i = left; //left pointer
  var j = right; //right pointer
  while (i <= j) {
    while (cv.boundingRect(items[i]).x < pivot) {
      i++;
    }
    while (cv.boundingRect(items[j]).x > pivot) {
      j--;
    }

    if (i <= j) {
      swap(items, i, j); //sawpping two elements
      i++;
      j--;
    }
  }
  return i;
}

function quickSort(items, left, right) {
  var index;
  if (items.length > 1) {
    index = partition(items, left, right); //index returned from partition
    if (left < index - 1) {
      //more elements on the left side of the pivot
      quickSort(items, left, index - 1);
    }
    if (index < right) {
      //more elements on the right side of the pivot
      quickSort(items, index, right);
    }
  }
  return items;
}
function extractBoard(input) {
  let extractDst = new cv.Mat(input.rows, input.cols, cv.CV_8UC4);
  // Extract cells from board
  // Calculate estimate for what each cell area should be
  let cellAreaEst = Math.pow(input.rows / 9, 2);
  let limit = cellAreaEst / 5;
  // Loop through different kernel sizes to close lines
  for (let i = 5; i < 12; i += 2) {
    // Close horizontal and vertical lines
    let kernel = new cv.Mat();
    ksize = new cv.Size(i, i);
    kernel = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(input, extractDst, cv.MORPH_CLOSE, kernel);
    kernel.delete();
    ksize.delete;

    // Invert image so its white on black
    cv.bitwise_not(extractDst, extractDst);

    // Find outline contours
    cv.findContours(
      extractDst,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );
    var contoursInRange = new cv.MatVector();
    let tempArea;
    for (let i = 0; i < contours.size(); i++) {
      tempArea = cv.contourArea(contours.get(i), false);
      if (tempArea > cellAreaEst - limit && tempArea < cellAreaEst + limit) {
        contoursInRange.push_back(contours.get(i));
      }
    }

    if (contoursInRange.size() == 81) {
      break;
    } else {
      if (i == 11) {
        contoursInRange.delete();
        return null;
      }
    }
  }
  // Sort contours into top to bottom
  let contoursSortedVertical = new cv.MatVector();
  for (let i = contoursInRange.size() - 1; i > -1; i--) {
    contoursSortedVertical.push_back(contoursInRange.get(i));
  }
  contoursInRange.delete();

  // Sort contours into left to right
  let contoursSortedHorizontal = new cv.MatVector();
  for (let i = 0; i < 9; i++) {
    let temp = [];
    for (let j = 0; j < 9; j++) {
      temp.push(contoursSortedVertical.get(i * 9 + j));
    }
    // Sort
    temp = quickSort(temp, 0, temp.length - 1);
    for (let j = 0; j < 9; j++) {
      contoursSortedHorizontal.push_back(temp[j]);
    }
    temp.delete;
  }
  contoursSortedVertical.delete();
  extractDst.delete();

  // Fill board
  let tensors = [];
  for (let j = 0; j < 9; j++) {
    for (let i = 0; i < 9; i++) {
      let rect = cv.boundingRect(contoursSortedHorizontal.get(j * 9 + i));
      let cell = new cv.Mat();
      cell = input.roi(rect);

      rect.delete;
      let digit = identifyCell(cell);
      cell.delete();

      if (digit != null) {
        // Resize image
        dsize = new cv.Size(28, 28);
        cv.resize(digit, digit, dsize, 0, 0, cv.INTER_AREA);
        // Convert mat to array
        let converted = [];
        for (let i = 0; i < digit.cols; i++) {
          let temp = [];
          for (let j = 0; j < digit.rows; j++) {
            temp.push(digit.data[i * digit.cols + j] / 255);
          }
          converted.push(temp);
        }
        let tensor = tf.tensor(converted).expandDims().expandDims(3);
        tensors.push(tensor);
        tensors.push(j);
        tensors.push(i);
        converted.delete;
      }
    }
  }
  contoursSortedHorizontal.delete();
  return tensors;
}

function identifyCell(image) {
  let w = image.cols;
  let h = image.rows;
  let x = Math.floor(w * 0.1);
  let y = Math.floor(h * 0.1);
  //remove outer 10% of cell
  let cellDst = new cv.Mat();
  let rect = new cv.Rect(x, y, w - x, h - y);
  cellDst = image.roi(rect);
  // Find contours
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(
    cellDst,
    contours,
    hierarchy,
    cv.RETR_TREE,
    cv.CHAIN_APPROX_SIMPLE
  );
  if (contours.size() == 0) {
    return null;
  }
  // Find index of largest contour
  let maxIndex = 0;
  let area = 0;
  let tempArea;
  for (let i = 0; i < contours.size(); i++) {
    tempArea = cv.contourArea(contours.get(i), false);
    if (tempArea > area) {
      maxIndex = i;
      area = tempArea;
    }
  }
  area.delete;
  tempArea.delete;

  // Create mask
  let mask = cv.Mat.zeros(cellDst.rows, cellDst.cols, cv.CV_8U);
  // Draw largest contour on mask
  cv.drawContours(mask, contours, maxIndex, new cv.Scalar(255), -1);

  if (cv.countNonZero(mask) / (cellDst.rows * cellDst.cols) < 0.05) {
    return null;
  }

  // Check if contour is too close to the edge, indicating noise
  rect = cv.boundingRect(contours.get(maxIndex));
  let limitX = cellDst.cols * 0.1;
  let limitY = cellDst.rows * 0.1;
  if (
    rect.x < limitX ||
    rect.y < limitY ||
    rect.x + rect.width > cellDst.cols - limitX ||
    rect.y + rect.height > cellDst.rows - limitY
  ) {
    return null;
  }
  // Apply mask to initial cell
  cv.bitwise_and(cellDst, mask, cellDst);
  mask.delete();

  // Draw bounding rect around contour, return square around the rect
  if (rect.height > rect.width) {
    let limit = Math.floor(rect.height * 0.2);
    let square = new cv.Rect(
      Math.max(rect.x - Math.floor((rect.height - rect.width) / 2) - limit, 0),
      Math.max(rect.y - limit, 0),
      rect.height + 2 * limit,
      rect.height + 2 * limit
    );
    cellDst = cellDst.roi(square);
  } else {
    let limit = Math.floor(rect.width * 0.2);
    let square = new cv.Rect(
      rect.x - limit,
      rect.y - Math.floor((rect.width - rect.height) / 2) - limit,
      rect.width + 2 * limit,
      rect.width + 2 * limit
    );
    cellDst = cellDst.roi(square);
  }
  return cellDst;
}

function overlayPuzzle(corners) {
  try {
    let overlay = new cv.Mat(
      gridSize,
      gridSize,
      cv.CV_8UC4,
      new cv.Scalar(0, 0, 0)
    );

    // Draw gridlines
    cellSize = Math.floor(gridSize / 9);
    for (let i = 0; i < 10; i++) {
      cv.line(
        overlay,
        new cv.Point(0, i * cellSize),
        new cv.Point(gridSize, i * cellSize),
        [0, 255, 0, 255],
        2
      );
      cv.line(
        overlay,
        new cv.Point(i * cellSize, 0),
        new cv.Point(i * cellSize, gridSize),
        [0, 255, 0, 255],
        2
      );
    }
    // Draw digits onto overlay
    let font = cv.FONT_HERSHEY_SIMPLEX;
    let scale = cellSize / 50;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[j][i][1] == 0) {
          let text = board[j][i][0].toString();
          cv.putText(
            overlay,
            text,
            new cv.Point(
              i * cellSize + cellSize / 3,
              j * cellSize + cellSize - cellSize / 4
            ),
            font,
            scale,
            [0, 255, 0, 255],
            2
          );
        }
      }
    }
    // Warp overlay
    let dsize = new cv.Size(src.cols, src.rows);
    let pt1 = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      gridSize,
      0,
      gridSize,
      gridSize,
      0,
      gridSize,
    ]);
    let pt2 = cv.matFromArray(4, 1, cv.CV_32FC2, corners);
    let M = cv.getPerspectiveTransform(pt1, pt2);
    cv.warpPerspective(
      overlay,
      overlay,
      M,
      dsize,
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar()
    );
    // Add overlay to source
    cv.addWeighted(src, 1, overlay, 1, 0, src);
    overlay.delete();
  } catch (err) {
    console.log(err);
  }
}

//Sudoku from https://github.com/RubinderS/Sudoku-Solver-JavaScript/blob/master/Sudoku.js
function solveSudoku(gameArr) {
  var emptySpot = nextEmptySpot(gameArr);
  var r = emptySpot[0];
  var c = emptySpot[1];

  // if the game is unsolvable don't even try to solve it
  if (!isValidSudoku(gameArr)) return gameArr;

  // if no vacant spot is left, board is solved
  if (r === -1) {
    return gameArr;
  }

  var possArr = possibilities(r, c, gameArr);

  for (var k = 0; k < possArr.length && nextEmptySpot(gameArr)[0] !== -1; k++) {
    gameArr[r][c][0] = possArr[k];
    solveSudoku(gameArr);
  }

  // if no possible value leads to a solution reset this value
  if (nextEmptySpot(gameArr)[0] !== -1) gameArr[r][c][0] = 0;

  return gameArr;
}

function nextEmptySpot(gameArr) {
  for (var i = 0; i < 9; i++) {
    for (var j = 0; j < 9; j++) {
      if (gameArr[i][j][0] === 0) return [i, j];
    }
  }

  return [-1, -1];
}

function possibilities(r, c, gameArr) {
  var possArr = [];
  var row = [];
  var col = [];
  var quad = [];
  var k = 0;
  var l = 0;

  if (r <= 2) k = 0;
  else if (r <= 5) k = 3;
  else k = 6;
  if (c <= 2) l = 0;
  else if (c <= 5) l = 3;
  else l = 6;

  for (var i = 0; i < 9; i++) {
    row.push(gameArr[i][c][0]);
  }

  for (var j = 0; j < 9; j++) {
    col.push(gameArr[r][j][0]);
  }

  for (var i = k; i < k + 3; i++) {
    for (var j = l; j < l + 3; j++) {
      quad.push(gameArr[i][j][0]);
    }
  }

  for (var n = 1; n < 10; n++) {
    if (
      row.indexOf(n) === -1 &&
      col.indexOf(n) === -1 &&
      quad.indexOf(n) === -1
    ) {
      possArr.push(n);
    }
  }

  return possArr;
}

function checkQuadrant(r, c, gameArr) {
  var quadrantArr = [];
  for (var i = r; i < r + 3; i++) {
    for (var j = c; j < c + 3; j++) {
      if (
        quadrantArr.indexOf(gameArr[i][j][0]) === -1 ||
        gameArr[i][j][0] === 0
      ) {
        quadrantArr.push(gameArr[i][j][0]);
      } else {
        return false;
      }
    }
  }

  return true;
}

function isValidSudoku(gameArr) {
  if (!checkQuadrant(0, 0, gameArr)) return false;
  if (!checkQuadrant(0, 3, gameArr)) return false;
  if (!checkQuadrant(0, 6, gameArr)) return false;

  if (!checkQuadrant(3, 0, gameArr)) return false;
  if (!checkQuadrant(3, 3, gameArr)) return false;
  if (!checkQuadrant(3, 6, gameArr)) return false;

  if (!checkQuadrant(6, 0, gameArr)) return false;
  if (!checkQuadrant(6, 3, gameArr)) return false;
  if (!checkQuadrant(6, 6, gameArr)) return false;

  for (var i = 0; i < gameArr.length; i++) {
    var rowNumbers = [];
    for (var j = 0; j < gameArr.length; j++) {
      if (
        rowNumbers.indexOf(gameArr[i][j][0]) === -1 ||
        gameArr[i][j][0] === 0
      ) {
        rowNumbers.push(gameArr[i][j][0]);
      } else {
        return false;
      }
    }
  }

  for (var i = 0; i < gameArr.length; i++) {
    var colNumbers = [];
    for (var j = 0; j < gameArr.length; j++) {
      if (
        colNumbers.indexOf(gameArr[j][i][0]) === -1 ||
        gameArr[j][i][0] === 0
      ) {
        colNumbers.push(gameArr[j][i][0]);
      } else {
        return false;
      }
    }
  }

  return true;
}

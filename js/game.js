const board = document.getElementById("board");
const scoreDisplay = document.getElementById("score");
const resetBtn = document.getElementById("reset");

const width = 8;
const candies = [];
let score = 0;
const candyColors = ["#f87171", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"];

function createBoard() {
  for (let i = 0; i < width * width; i++) {
    const candy = document.createElement("div");
    candy.setAttribute("draggable", true);
    candy.setAttribute("id", i);
    let randomColor = candyColors[Math.floor(Math.random() * candyColors.length)];
    candy.style.backgroundColor = randomColor;
    candy.classList.add("candy");
    board.appendChild(candy);
    candies.push(candy);
  }
}

createBoard();

let colorBeingDragged, colorBeingReplaced;
let squareIdBeingDragged, squareIdBeingReplaced;

candies.forEach(candy => candy.addEventListener("dragstart", dragStart));
candies.forEach(candy => candy.addEventListener("dragover", dragOver));
candies.forEach(candy => candy.addEventListener("drop", dragDrop));
candies.forEach(candy => candy.addEventListener("dragend", dragEnd));

function dragStart() {
  colorBeingDragged = this.style.backgroundColor;
  squareIdBeingDragged = parseInt(this.id);
}

function dragOver(e) {
  e.preventDefault();
}

function dragDrop() {
  colorBeingReplaced = this.style.backgroundColor;
  squareIdBeingReplaced = parseInt(this.id);
  candies[squareIdBeingDragged].style.backgroundColor = colorBeingReplaced;
  candies[squareIdBeingReplaced].style.backgroundColor = colorBeingDragged;
}

function dragEnd() {
  let validMoves = [
    squareIdBeingDragged - 1,
    squareIdBeingDragged - width,
    squareIdBeingDragged + 1,
    squareIdBeingDragged + width
  ];

  let validMove = validMoves.includes(squareIdBeingReplaced);

  if (squareIdBeingReplaced && validMove) {
    squareIdBeingReplaced = null;
  } else if (squareIdBeingReplaced && !validMove) {
    candies[squareIdBeingReplaced].style.backgroundColor = colorBeingReplaced;
    candies[squareIdBeingDragged].style.backgroundColor = colorBeingDragged;
  } else {
    candies[squareIdBeingDragged].style.backgroundColor = colorBeingDragged;
  }
}

function checkRowForThree() {
  for (let i = 0; i < 61; i++) {
    let rowOfThree = [i, i + 1, i + 2];
    let decidedColor = candies[i].style.backgroundColor;
    const isBlank = candies[i].style.backgroundColor === "";

    const notValid = [6, 7, 14, 15, 22, 23, 30, 31, 38, 39, 46, 47, 54, 55];
    if (notValid.includes(i)) continue;

    if (rowOfThree.every(index => candies[index].style.backgroundColor === decidedColor && !isBlank)) {
      score += 3;
      scoreDisplay.textContent = score;
      rowOfThree.forEach(index => candies[index].style.backgroundColor = "");
    }
  }
}

function checkColumnForThree() {
  for (let i = 0; i < 47; i++) {
    let columnOfThree = [i, i + width, i + width * 2];
    let decidedColor = candies[i].style.backgroundColor;
    const isBlank = candies[i].style.backgroundColor === "";

    if (columnOfThree.every(index => candies[index].style.backgroundColor === decidedColor && !isBlank)) {
      score += 3;
      scoreDisplay.textContent = score;
      columnOfThree.forEach(index => candies[index].style.backgroundColor = "");
    }
  }
}

function moveDown() {
  for (let i = 0; i < 56; i++) {
    if (candies[i + width].style.backgroundColor === "") {
      candies[i + width].style.backgroundColor = candies[i].style.backgroundColor;
      candies[i].style.backgroundColor = "";
    }

    if (i < width && candies[i].style.backgroundColor === "") {
      let randomColor = candyColors[Math.floor(Math.random() * candyColors.length)];
      candies[i].style.backgroundColor = randomColor;
    }
  }
}

window.setInterval(function () {
  checkRowForThree();
  checkColumnForThree();
  moveDown();
}, 100);

resetBtn.addEventListener("click", () => {
  location.reload();
});

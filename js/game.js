// Candy Match Core
const candyImgs = [
  "images/candy1.png",
  "images/candy2.png",
  "images/candy3.png",
  "images/candy4.png",
  "images/candy5.png",
  "images/candy6.png"
];

let board = [];
let rows = 8, cols = 8;
let score = 0;

function initGame() {
  score = 0;
  document.getElementById("score").textContent = score;
  document.getElementById("coins").textContent = Storage.getCoins();
  document.getElementById("levelNum").textContent = Storage.getLevel();
  generateBoard();
}

function generateBoard() {
  const gameBoard = document.getElementById("gameBoard");
  gameBoard.innerHTML = "";
  board = [];

  for (let r = 0; r < rows; r++) {
    let row = [];
    for (let c = 0; c < cols; c++) {
      let candy = document.createElement("div");
      candy.classList.add("cell");
      candy.dataset.row = r;
      candy.dataset.col = c;
      candy.innerHTML = `<img src="${randomCandy()}">`;
      candy.addEventListener("click", selectCandy);
      gameBoard.appendChild(candy);
      row.push(candy);
    }
    board.push(row);
  }
}

let firstCandy = null;
function selectCandy(e) {
  const candy = e.currentTarget;
  if (!firstCandy) {
    firstCandy = candy;
    candy.classList.add("selected");
  } else {
    swapCandies(firstCandy, candy);
    firstCandy.classList.remove("selected");
    firstCandy = null;
  }
}

function swapCandies(a, b) {
  const temp = a.innerHTML;
  a.innerHTML = b.innerHTML;
  b.innerHTML = temp;
  checkMatches();
}

function randomCandy() {
  return candyImgs[Math.floor(Math.random() * candyImgs.length)];
}

function checkMatches() {
  let matchFound = false;
  const candies = document.querySelectorAll(".cell img");
  candies.forEach(img => {
    // Placeholder for real match logic
  });
  // simulate scoring
  score += 10;
  document.getElementById("score").textContent = score;
}

document.getElementById("restartBtn").addEventListener("click", initGame);
document.getElementById("shuffleBtn").addEventListener("click", initGame);

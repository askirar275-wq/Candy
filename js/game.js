const WIDTH = 6;
const HEIGHT = 8;
const IMAGE_BASE = "images/";
const CANDIES = [
  "candy1.png", "candy2.png", "candy3.png",
  "candy4.png", "candy5.png", "candy6.png"
];

let board = [];
let score = 0, coins = Number(localStorage.getItem("candy_coins") || 50);

function initGame() {
  board = Array(WIDTH * HEIGHT)
    .fill(null)
    .map(() => ({ src: IMAGE_BASE + CANDIES[Math.floor(Math.random() * CANDIES.length)] }));

  renderBoard();
  updateHUD();
}

function renderBoard() {
  const grid = document.getElementById("game-board");
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${WIDTH}, 1fr)`;

  board.forEach((tile, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    const img = document.createElement("img");
    img.className = "tile";
    img.src = tile.src;
    cell.appendChild(img);
    grid.appendChild(cell);
  });
}

function updateHUD() {
  document.getElementById("score").textContent = score;
  document.getElementById("coins").textContent = coins;
  localStorage.setItem("candy_coins", coins);
}

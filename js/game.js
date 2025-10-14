const candies = [
  "images/candy1.png",
  "images/candy2.png",
  "images/candy3.png",
  "images/candy4.png",
  "images/candy5.png",
  "images/candy6.png"
];

let board = [];
const size = 8;
let selected = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

document.getElementById("startGameBtn").onclick = () => showScreen("map-screen");
document.getElementById("homeBtn").onclick = () => showScreen("home-screen");
document.getElementById("mapBtn").onclick = () => showScreen("map-screen");
document.getElementById("shopBtn").onclick = () => document.getElementById("shopModal").classList.add("show");

function initGame() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";
  board = [];

  for (let r = 0; r < size; r++) {
    board[r] = [];
    for (let c = 0; c < size; c++) {
      const img = document.createElement("img");
      img.src = candies[Math.floor(Math.random() * candies.length)];

      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.appendChild(img);
      boardEl.appendChild(cell);

      cell.onclick = () => selectCell(r, c, cell);
      board[r][c] = img.src;
    }
  }
}

function selectCell(r, c, el) {
  if (!selected) {
    selected = { r, c, el };
    el.classList.add("selected");
  } else {
    const { r: r2, c: c2, el: el2 } = selected;
    el2.classList.remove("selected");

    if (Math.abs(r - r2) + Math.abs(c - c2) === 1) {
      swapCandies(r, c, r2, c2);
    }

    selected = null;
  }
}

function swapCandies(r1, c1, r2, c2) {
  const temp = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = temp;

  const boardEl = document.getElementById("board").children;
  const i1 = r1 * size + c1;
  const i2 = r2 * size + c2;

  const img1 = boardEl[i1].querySelector("img");
  const img2 = boardEl[i2].querySelector("img");

  [img1.src, img2.src] = [img2.src, img1.src];
                     }

// Elements
const home = document.getElementById("home-screen");
const game = document.getElementById("game-screen");
const board = document.getElementById("board");
const scoreText = document.getElementById("score");
const playBtn = document.getElementById("play");
const backBtn = document.getElementById("back");

// Candy emojis (optional: replace with image tags)
const candies = ["🍬", "🍭", "🍫", "🍩", "🍪", "🧁"];
const size = 6;
let grid = [];
let score = 0;
let first = null;

// Screen switching
playBtn.onclick = () => {
  home.classList.remove("active");
  game.classList.add("active");
  initBoard();
};

backBtn.onclick = () => {
  game.classList.remove("active");
  home.classList.add("active");
};

// Create the board
function initBoard() {
  grid = [];
  score = 0;
  scoreText.textContent = score;
  board.innerHTML = "";

  for (let i = 0; i < size * size; i++) {
    const candy = candies[Math.floor(Math.random() * candies.length)];
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;
    cell.innerHTML = `<div>${candy}</div>`;
    cell.addEventListener("click", handleClick);
    board.appendChild(cell);
    grid.push(candy);
  }
}

function handleClick(e) {
  const cell = e.currentTarget;
  const index = parseInt(cell.dataset.index);

  if (first === null) {
    first = index;
    cell.firstChild.style.transform = "scale(0.9)";
  } else {
    swapCandies(first, index);
    first = null;
    resetStyles();
    checkMatches();
  }
}

function resetStyles() {
  document.querySelectorAll(".cell div").forEach(d => (d.style.transform = "scale(1)"));
}

function swapCandies(i1, i2) {
  const temp = grid[i1];
  grid[i1] = grid[i2];
  grid[i2] = temp;
  renderBoard();
}

function renderBoard() {
  board.querySelectorAll(".cell div").forEach((div, i) => {
    div.textContent = grid[i];
  });
}

function checkMatches() {
  let matched = [];

  // Horizontal
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 2; c++) {
      const i = r * size + c;
      if (grid[i] === grid[i + 1] && grid[i] === grid[i + 2]) {
        matched.push(i, i + 1, i + 2);
      }
    }
  }

  // Vertical
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size - 2; r++) {
      const i = r * size + c;
      if (grid[i] === grid[i + size] && grid[i] === grid[i + 2 * size]) {
        matched.push(i, i + size, i + 2 * size);
      }
    }
  }

  if (matched.length > 0) {
    matched = [...new Set(matched)];
    matched.forEach(
      i => (grid[i] = candies[Math.floor(Math.random() * candies.length)])
    );
    score += matched.length * 10;
    scoreText.textContent = score;
    renderBoard();
  }
}

// Eruda console (for debugging)
(function () {
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/eruda";
  s.onload = function () {
    eruda.init();
    console.log("🧠 Eruda चालू");
  };
  document.body.appendChild(s);
})();

/* === Candy Match Game + Coin System === */

const WIDTH = 8;
const HEIGHT = 8;
const SIZE = WIDTH * HEIGHT;
const IMAGE_BASE = "images/";
const CANDIES = [
  "candy1.png",
  "candy2.png",
  "candy3.png",
  "candy4.png",
  "candy5.png",
  "candy6.png",
  "candy7.png",
  "candy8.png",
];

// Global state
let board = [];
let score = 0;
let coins = Number(localStorage.getItem("candy_coins") || 0);
let selected = null;
let isSwapping = false;
let combo = 1;

/* ---------- INIT ---------- */
function initGame() {
  score = 0;
  combo = 1;
  isSwapping = false;
  selected = null;
  board = new Array(SIZE).fill(null).map(() => ({
    src: IMAGE_BASE + CANDIES[Math.floor(Math.random() * CANDIES.length)],
  }));
  render();
  updateHUD();
}

/* ---------- RENDER ---------- */
function render() {
  const grid = document.getElementById("game-board");
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${WIDTH}, 1fr)`;

  board.forEach((tile, i) => {
    const div = document.createElement("div");
    div.className = "cell";
    div.dataset.index = i;

    const img = document.createElement("img");
    img.src = tile.src;
    img.className = "tile";
    img.onclick = () => handleSelect(i);

    div.appendChild(img);
    grid.appendChild(div);
  });
}

/* ---------- TILE SELECT + SWAP ---------- */
function handleSelect(i) {
  if (isSwapping) return;
  if (selected === null) {
    selected = i;
    highlight(i);
  } else if (selected === i) {
    unhighlight(i);
    selected = null;
  } else if (isAdjacent(selected, i)) {
    swapTiles(selected, i);
    unhighlight(selected);
    selected = null;
  } else {
    unhighlight(selected);
    selected = i;
    highlight(i);
  }
}

function isAdjacent(a, b) {
  const r1 = Math.floor(a / WIDTH),
    c1 = a % WIDTH;
  const r2 = Math.floor(b / WIDTH),
    c2 = b % WIDTH;
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function highlight(i) {
  const cell = document.querySelector(`[data-index="${i}"]`);
  if (cell) cell.classList.add("selected-cell");
}
function unhighlight(i) {
  const cell = document.querySelector(`[data-index="${i}"]`);
  if (cell) cell.classList.remove("selected-cell");
}

/* ---------- SWAP ---------- */
function swapTiles(a, b) {
  isSwapping = true;
  [board[a], board[b]] = [board[b], board[a]];
  render();

  const matches = findMatches();
  if (matches.length > 0) {
    handleMatches(matches);
  } else {
    [board[a], board[b]] = [board[b], board[a]];
    render();
  }
  isSwapping = false;
}

/* ---------- FIND MATCHES ---------- */
function findMatches() {
  const matches = new Set();

  // Horizontal
  for (let r = 0; r < HEIGHT; r++) {
    for (let c = 0; c < WIDTH - 2; c++) {
      const i = r * WIDTH + c;
      if (
        board[i].src === board[i + 1].src &&
        board[i].src === board[i + 2].src
      ) {
        matches.add(i);
        matches.add(i + 1);
        matches.add(i + 2);
      }
    }
  }

  // Vertical
  for (let c = 0; c < WIDTH; c++) {
    for (let r = 0; r < HEIGHT - 2; r++) {
      const i = r * WIDTH + c;
      if (
        board[i].src === board[i + WIDTH].src &&
        board[i].src === board[i + 2 * WIDTH].src
      ) {
        matches.add(i);
        matches.add(i + WIDTH);
        matches.add(i + 2 * WIDTH);
      }
    }
  }

  return Array.from(matches);
}

/* ---------- HANDLE MATCH ---------- */
function handleMatches(matches) {
  score += matches.length * 10 * combo;

  // 💰 Coin system
  const gainedCoins = matches.length * 3; // 3 coins per candy
  coins += gainedCoins;
  saveCoins();
  showCoinPopup(gainedCoins);

  // Animation
  matches.forEach((i) => {
    const el = document.querySelector(`[data-index="${i}"] img`);
    if (el) {
      el.classList.add("pop");
      setTimeout(() => (el.style.opacity = 0), 200);
    }
    board[i] = null;
  });

  setTimeout(applyGravity, 400);
  updateHUD();
}

/* ---------- GRAVITY ---------- */
function applyGravity() {
  for (let c = 0; c < WIDTH; c++) {
    const col = [];
    for (let r = HEIGHT - 1; r >= 0; r--) {
      const i = r * WIDTH + c;
      if (board[i]) col.push(board[i]);
    }
    while (col.length < HEIGHT) {
      col.push({
        src: IMAGE_BASE + CANDIES[Math.floor(Math.random() * CANDIES.length)],
      });
    }
    for (let r = HEIGHT - 1; r >= 0; r--) {
      board[r * WIDTH + c] = col[HEIGHT - 1 - r];
    }
  }

  render();

  const newMatches = findMatches();
  if (newMatches.length > 0) setTimeout(() => handleMatches(newMatches), 250);
  else combo = 1;
}

/* ---------- HUD + SAVE ---------- */
function updateHUD() {
  document.getElementById("score").textContent = score;
  const coinEl = document.getElementById("coins");
  if (coinEl) coinEl.textContent = coins;
}

function saveCoins() {
  localStorage.setItem("candy_coins", coins);
}

/* ---------- FLOATING COIN POPUP ---------- */
function showCoinPopup(amount) {
  const el = document.createElement("div");
  el.className = "coin-popup";
  el.textContent = `+${amount} 💰`;
  document.body.appendChild(el);

  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.top = "50%";
  el.style.transform = "translate(-50%, -50%) scale(1)";
  el.style.fontSize = "22px";
  el.style.fontWeight = "bold";
  el.style.color = "#ff4081";
  el.style.textShadow = "0 2px 4px rgba(0,0,0,0.2)";
  el.style.transition = "all 1s ease";

  requestAnimationFrame(() => {
    el.style.top = "30%";
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -50%) scale(1.3)";
  });

  setTimeout(() => el.remove(), 1200);
}

/* ---------- SHUFFLE ---------- */
function shuffleBoard() {
  for (let i = board.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }
  render();
}

/* ---------- EXPOSE ---------- */
window.initGame = initGame;
window.shuffleBoard = shuffleBoard;

window.addEventListener("load", initGame);

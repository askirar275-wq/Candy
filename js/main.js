// Candy Match Game
const rows = 8;
const cols = 6;
const board = document.getElementById("board");
const scoreSpan = document.getElementById("score");
const coinsSpan = document.getElementById("coins");
const shopCoinsSpan = document.getElementById("shop-coins");
const levelSpan = document.getElementById("level-num");
const shopModal = document.getElementById("shop-modal");
const btnShop = document.getElementById("btn-open-shop");
const shopClose = document.getElementById("shop-close");
const btnShuffle = document.getElementById("btn-shuffle");
const btnRestart = document.getElementById("btn-restart");

let score = 0;
let coins = 0;
let level = 1;
let grid = [];
let candyImages = [
  "img/candy1.png",
  "img/candy2.png",
  "img/candy3.png",
  "img/candy4.png",
  "img/candy5.png",
  "img/candy6.png"
];

function createBoard() {
  board.innerHTML = "";
  grid = [];

  for (let r = 0; r < rows; r++) {
    let row = [];
    for (let c = 0; c < cols; c++) {
      let candyType = Math.floor(Math.random() * candyImages.length);
      let cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = r;
      cell.dataset.col = c;

      let img = document.createElement("img");
      img.src = candyImages[candyType];
      img.classList.add("candy");

      cell.appendChild(img);
      board.appendChild(cell);
      row.push(candyType);
    }
    grid.push(row);
  }
  enableSwipe();
}

function enableSwipe() {
  let startX, startY, endX, endY;

  board.querySelectorAll(".cell").forEach(cell => {
    cell.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    cell.addEventListener("touchend", e => {
      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;
      handleSwipe(cell, startX, startY, endX, endY);
    });
  });
}

function handleSwipe(cell, startX, startY, endX, endY) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    if (deltaX > 30 && col < cols - 1) swapCandies(row, col, row, col + 1);
    else if (deltaX < -30 && col > 0) swapCandies(row, col, row, col - 1);
  } else {
    // Vertical swipe
    if (deltaY > 30 && row < rows - 1) swapCandies(row, col, row + 1, col);
    else if (deltaY < -30 && row > 0) swapCandies(row, col, row - 1, col);
  }
}

function swapCandies(r1, c1, r2, c2) {
  const temp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = temp;

  renderBoard();
}

function renderBoard() {
  board.querySelectorAll(".cell").forEach(cell => {
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    cell.querySelector("img").src = candyImages[grid[r][c]];
  });
}

btnShuffle.onclick = () => {
  createBoard();
};

btnRestart.onclick = () => {
  score = 0;
  coins = 0;
  scoreSpan.textContent = score;
  coinsSpan.textContent = coins;
  createBoard();
};

// --- Shop System ---
btnShop.onclick = () => {
  shopModal.classList.add("open");
  shopCoinsSpan.textContent = coins;
  renderShopItems();
};
shopClose.onclick = () => {
  shopModal.classList.remove("open");
};

function renderShopItems() {
  const shopItemsDiv = document.getElementById("shop-items");
  shopItemsDiv.innerHTML = "";

  const items = [
    { name: "Shuffle Boost", cost: 20 },
    { name: "Extra Time", cost: 30 },
    { name: "Score Doubler", cost: 50 }
  ];

  items.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("shop-item");
    div.innerHTML = `
      <span>${item.name}</span>
      <button class="btn buy" data-cost="${item.cost}">Buy (${item.cost} 🪙)</button>
    `;
    shopItemsDiv.appendChild(div);
  });

  document.querySelectorAll(".buy").forEach(btn => {
    btn.onclick = () => {
      const cost = parseInt(btn.dataset.cost);
      if (coins >= cost) {
        coins -= cost;
        coinsSpan.textContent = coins;
        shopCoinsSpan.textContent = coins;
        alert("✅ Purchased successfully!");
      } else {
        alert("❌ Not enough coins!");
      }
    };
  });
}

// Start game
createBoard();

// ====== Candy Match Game - Final Version with Coin System ======
// This version includes automatic coin rewards using storage.js

// Game variables
let score = 0;
let gridSize = 8;
let candies = [];
let candyTypes = 6;
let selectedCandy = null;

// DOM elements
const board = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const restartBtn = document.getElementById('restart-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const shopBtn = document.getElementById('shop-btn');

// Initialize the game
document.addEventListener('DOMContentLoaded', initGame);

function initGame() {
  // Update coin display from storage
  updateCoinDisplay(coinsEl);

  generateBoard();
  checkMatches();

  // Button actions
  restartBtn.addEventListener('click', restartGame);
  shuffleBtn.addEventListener('click', shuffleBoard);
  shopBtn.addEventListener('click', () => window.location.href = 'shop.html');
}

// ===== Generate board =====
function generateBoard() {
  board.innerHTML = '';
  candies = [];

  for (let row = 0; row < gridSize; row++) {
    const candyRow = [];
    for (let col = 0; col < gridSize; col++) {
      const candy = createCandy(row, col);
      candyRow.push(candy);
      board.appendChild(candy.el);
    }
    candies.push(candyRow);
  }
}

// ===== Create candy =====
function createCandy(row, col) {
  const type = Math.floor(Math.random() * candyTypes) + 1;
  const el = document.createElement('img');
  el.src = `images/candy${type}.png`;
  el.classList.add('candy');
  el.dataset.row = row;
  el.dataset.col = col;
  el.dataset.type = type;
  el.addEventListener('click', onCandyClick);
  return { el, row, col, type };
}

// ===== Candy click logic =====
function onCandyClick(e) {
  const candy = e.target;
  if (!selectedCandy) {
    selectedCandy = candy;
    candy.classList.add('selected');
  } else {
    const prev = selectedCandy;
    if (areAdjacent(prev, candy)) {
      swapCandies(prev, candy);
      if (!checkMatches()) {
        // Revert if no match
        setTimeout(() => swapCandies(prev, candy), 300);
      }
    }
    prev.classList.remove('selected');
    selectedCandy = null;
  }
}

// ===== Check if candies are adjacent =====
function areAdjacent(a, b) {
  const rowA = parseInt(a.dataset.row);
  const colA = parseInt(a.dataset.col);
  const rowB = parseInt(b.dataset.row);
  const colB = parseInt(b.dataset.col);
  return (
    (rowA === rowB && Math.abs(colA - colB) === 1) ||
    (colA === colB && Math.abs(rowA - rowB) === 1)
  );
}

// ===== Swap candies =====
function swapCandies(a, b) {
  const rowA = parseInt(a.dataset.row);
  const colA = parseInt(a.dataset.col);
  const rowB = parseInt(b.dataset.row);
  const colB = parseInt(b.dataset.col);

  // Swap types
  const tempType = a.dataset.type;
  a.dataset.type = b.dataset.type;
  b.dataset.type = tempType;

  // Swap images
  const tempSrc = a.src;
  a.src = b.src;
  b.src = tempSrc;
}

// ===== Match checking =====
function checkMatches() {
  let matches = [];
  let matchedPositions = new Set();

  // Horizontal matches
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize - 2; col++) {
      const c1 = candies[row][col];
      const c2 = candies[row][col + 1];
      const c3 = candies[row][col + 2];
      if (c1.type === c2.type && c2.type === c3.type) {
        matches.push(c1, c2, c3);
        matchedPositions.add(`${row}-${col}`);
        matchedPositions.add(`${row}-${col + 1}`);
        matchedPositions.add(`${row}-${col + 2}`);
      }
    }
  }

  // Vertical matches
  for (let col = 0; col < gridSize; col++) {
    for (let row = 0; row < gridSize - 2; row++) {
      const c1 = candies[row][col];
      const c2 = candies[row + 1][col];
      const c3 = candies[row + 2][col];
      if (c1.type === c2.type && c2.type === c3.type) {
        matches.push(c1, c2, c3);
        matchedPositions.add(`${row}-${col}`);
        matchedPositions.add(`${row + 1}-${col}`);
        matchedPositions.add(`${row + 2}-${col}`);
      }
    }
  }

  if (matchedPositions.size > 0) {
    clearMatches(matchedPositions);
    return true;
  }
  return false;
}

// ===== Clear matched candies =====
function clearMatches(matchedPositions) {
  let clearedCount = 0;

  matchedPositions.forEach(pos => {
    const [row, col] = pos.split('-').map(Number);
    const candy = candies[row][col];
    candy.el.classList.add('pop');
    setTimeout(() => {
      const type = Math.floor(Math.random() * candyTypes) + 1;
      candy.type = type;
      candy.el.src = `images/candy${type}.png`;
      candy.el.classList.remove('pop');
    }, 250);
    clearedCount++;
  });

  // Increase score and coins together
  const gainedScore = clearedCount * 10;
  const gainedCoins = clearedCount * 5;

  score += gainedScore;
  addCoins(gainedCoins);

  scoreEl.textContent = score;
  updateCoinDisplay(coinsEl);
}

// ===== Restart game =====
function restartGame() {
  score = 0;
  scoreEl.textContent = score;
  generateBoard();
  updateCoinDisplay(coinsEl);
}

// ===== Shuffle board =====
function shuffleBoard() {
  const allCandies = candies.flat();
  for (let i = allCandies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tempType = allCandies[i].type;
    allCandies[i].type = allCandies[j].type;
    allCandies[j].type = tempType;

    const tempSrc = allCandies[i].el.src;
    allCandies[i].el.src = allCandies[j].el.src;
    allCandies[j].el.src = tempSrc;
  }
  checkMatches();
     }

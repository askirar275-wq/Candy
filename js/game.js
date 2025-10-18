/* game.js
   Candy Match - core game logic (swipe, match, gravity, refill, levels)
   Author: ChatGPT (adjusted for your project)
*/

document.addEventListener('DOMContentLoaded', () => {
  // सुरक्षा: अगर HTML में element न मिले तो fail-safe log
  if (!document.getElementById('board')) {
    console.warn('game.js: #board element not found — ensure HTML includes <div id="board"></div>');
  }

  // Auto-init अगर game screen active हुआ तो init
  // (index.html में navigation करने पर initGame() बुलाना बेहतर है)
});

// ----- CONFIG -----
const BOARD_COLS = 8;            // columns
const BOARD_ROWS = 8;            // rows
const BOARD_SIZE = BOARD_COLS * BOARD_ROWS;
const CANDY_TYPES = 6;           // c1..c6
const CANDY_IMG_PATH = (n) => `images/c${n}.png`;

// ----- STATE -----
let board = new Array(BOARD_SIZE).fill(null); // numbers 0..CANDY_TYPES-1 or null
let score = 0;
let level = Storage.getLevel ? Storage.getLevel() : 1;
let coins = Storage.getCoins ? Storage.getCoins() : 0;
let isProcessing = false; // to prevent multiple actions during animations

// drag / swipe variables (defined globally to avoid "not defined" errors)
let pointerStartX = 0;
let pointerStartY = 0;
let pointerEndX = 0;
let pointerEndY = 0;
let dragFromIndex = null;

// DOM refs
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const levelNumEl = document.getElementById('levelNum');
const restartBtn = document.getElementById('restartBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const mapBtn = document.getElementById('mapBtn');

// Safety: if elements missing, create placeholders
if (!boardEl) {
  console.warn('game.js: #board missing — creating placeholder');
  const fake = document.createElement('div');
  fake.id = 'board';
  document.body.appendChild(fake);
}

// ----- HELPER UTIL -----
function randCandy() {
  return Math.floor(Math.random() * CANDY_TYPES);
}

function indexOf(col, row) { return row * BOARD_COLS + col; }
function colOf(idx) { return idx % BOARD_COLS; }
function rowOf(idx) { return Math.floor(idx / BOARD_COLS); }

function updateHUD() {
  if (scoreEl) scoreEl.textContent = score;
  if (coinsEl) coinsEl.textContent = coins;
  if (levelNumEl) levelNumEl.textContent = level;
}

// ----- RENDER -----
function renderBoard() {
  if (!boardEl) return;
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${BOARD_COLS}, 1fr)`;

  for (let i = 0; i < BOARD_SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    const candy = document.createElement('div');
    candy.className = 'candy';

    if (board[i] !== null && board[i] !== undefined) {
      candy.style.backgroundImage = `url("${CANDY_IMG_PATH(board[i] + 1)}")`;
      candy.dataset.type = board[i];
    } else {
      candy.style.backgroundImage = '';
      candy.dataset.type = '';
    }

    // attach pointer/touch events to each cell
    attachPointerHandlers(cell, i);

    cell.appendChild(candy);
    boardEl.appendChild(cell);
  }
}

// ----- INIT / RESET -----
function initGame() {
  console.log('initGame called for level', level);
  // reset
  score = 0;
  coins = Storage.getCoins ? Storage.getCoins() : coins;
  isProcessing = false;

  // fill board with random candies, but ensure no initial immediate matches
  do {
    for (let i = 0; i < BOARD_SIZE; i++) board[i] = randCandy();
  } while (hasAnyMatches());

  updateHUD();
  renderBoard();
}

// ----- MATCH DETECTION -----
function findMatches() {
  // returns array of indices that form matches (>=3) in rows/cols
  const matches = new Set();

  // horizontal
  for (let r = 0; r < BOARD_ROWS; r++) {
    let runType = null;
    let runStart = 0;
    for (let c = 0; c < BOARD_COLS; c++) {
      const idx = indexOf(c, r);
      const t = board[idx];
      if (t !== null && t === runType) {
        // continue run
      } else {
        // close previous run
        const runLen = c - runStart;
        if (runType !== null && runLen >= 3) {
          for (let k = runStart; k < c; k++) matches.add(indexOf(k, r));
        }
        // start new run
        runType = t;
        runStart = c;
      }
    }
    // end row close
    const runLen = BOARD_COLS - runStart;
    if (runType !== null && runLen >= 3) {
      for (let k = runStart; k < BOARD_COLS; k++) matches.add(indexOf(k, r));
    }
  }

  // vertical
  for (let c = 0; c < BOARD_COLS; c++) {
    let runType = null;
    let runStart = 0;
    for (let r = 0; r < BOARD_ROWS; r++) {
      const idx = indexOf(c, r);
      const t = board[idx];
      if (t !== null && t === runType) {
        // continue
      } else {
        const runLen = r - runStart;
        if (runType !== null && runLen >= 3) {
          for (let k = runStart; k < r; k++) matches.add(indexOf(c, k));
        }
        runType = t;
        runStart = r;
      }
    }
    const runLen = BOARD_ROWS - runStart;
    if (runType !== null && runLen >= 3) {
      for (let k = runStart; k < BOARD_ROWS; k++) matches.add(indexOf(c, k));
    }
  }

  return Array.from(matches);
}

function hasAnyMatches() {
  return findMatches().length > 0;
}

// ----- REMOVE / GRAVITY / REFILL -----
async function removeMatchesAndCollapse() {
  const matches = findMatches();
  if (matches.length === 0) return 0;
  isProcessing = true;

  // award points
  const gained = matches.length * 10;
  score += gained;
  updateHUD();
  console.log('Removing matches:', matches.length, '-> score +', gained);

  // remove (set null) and animate (simple fade)
  matches.forEach(idx => board[idx] = null);
  renderBoard();

  // small delay to let player see
  await wait(220);

  // gravity: for each column, drop down non-null
  for (let c = 0; c < BOARD_COLS; c++) {
    const colVals = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      const idx = indexOf(c, r);
      if (board[idx] !== null && board[idx] !== undefined) colVals.push(board[idx]);
    }
    // fill from bottom
    for (let r = BOARD_ROWS - 1; r >= 0; r--) {
      const idx = indexOf(c, r);
      const val = colVals.pop();
      board[idx] = (val === undefined) ? null : val;
    }
  }

  renderBoard();
  await wait(120);

  // refill nulls with random candies
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] === null || board[i] === undefined) board[i] = randCandy();
  }

  // small delay and then check cascading matches
  renderBoard();
  await wait(180);
  isProcessing = false;

  return matches.length;
}

// ----- SWAP CANDIES -----
async function trySwapAndResolve(fromIdx, toIdx) {
  if (isProcessing) return false;
  if (!validIndex(fromIdx) || !validIndex(toIdx)) return false;
  if (!areAdjacent(fromIdx, toIdx)) return false;

  isProcessing = true;
  // swap
  const t = board[fromIdx];
  board[fromIdx] = board[toIdx];
  board[toIdx] = t;
  renderBoard();
  await wait(150);

  // if swap creates match, resolve cascades
  if (hasAnyMatches()) {
    let totalRemoved = 0;
    while (hasAnyMatches()) {
      const removed = await removeMatchesAndCollapse();
      totalRemoved += removed;
    }
    // reward coins for matches
    coins += Math.floor(totalRemoved / 3);
    if (Storage.setCoins) Storage.setCoins(coins);
    updateHUD();

    // check level completion: simple target = level * 500 (customize as needed)
    const target = level * 500;
    if (score >= target) {
      console.log('Level complete! unlocking next level.');
      Storage.unlockLevel(level + 1);
      // show next-level prompt (simple)
      setTimeout(() => {
        alert(`Level ${level} complete! Next level unlocked.`);
      }, 200);
    }
    isProcessing = false;
    return true;
  } else {
    // revert swap (no matches)
    await wait(120);
    const t2 = board[fromIdx];
    board[fromIdx] = board[toIdx];
    board[toIdx] = t2;
    renderBoard();
    isProcessing = false;
    return false;
  }
}

// ----- UTIL: adjacency / validation -----
function validIndex(i) {
  return Number.isInteger(i) && i >= 0 && i < BOARD_SIZE;
}
function areAdjacent(a, b) {
  const ca = colOf(a), ra = rowOf(a);
  const cb = colOf(b), rb = rowOf(b);
  const d = Math.abs(ca - cb) + Math.abs(ra - rb);
  return d === 1;
}

// ----- SHUFFLE / RESTART -----
function shuffleBoard() {
  // random shuffle but ensure no immediate matches
  do {
    for (let i = 0; i < BOARD_SIZE; i++) board[i] = randCandy();
  } while (hasAnyMatches());
  renderBoard();
}

function restartGame() {
  initGame();
}

// ----- POINTER / TOUCH HANDLERS -----
function attachPointerHandlers(cellEl, idx) {
  // prevent duplicate attachments
  if (cellEl._hasHandlers) return;
  cellEl._hasHandlers = true;

  // pointer down / touchstart
  cellEl.addEventListener('pointerdown', (e) => {
    if (isProcessing) return;
    e.preventDefault();
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    dragFromIndex = idx;
  });

  // pointer up / touchend
  cellEl.addEventListener('pointerup', async (e) => {
    if (isProcessing) return;
    pointerEndX = e.clientX;
    pointerEndY = e.clientY;
    if (dragFromIndex === null) return;

    const dx = pointerEndX - pointerStartX;
    const dy = pointerEndY - pointerStartY;
    const absX = Math.abs(dx), absY = Math.abs(dy);

    let targetIdx = null;
    if (Math.max(absX, absY) < 10) {
      // small tap — do nothing or could implement selection-based swap later
      dragFromIndex = null;
      return;
    }

    if (absX > absY) {
      // horizontal
      if (dx > 0) {
        // right
        const c = colOf(dragFromIndex);
        if (c < BOARD_COLS - 1) targetIdx = dragFromIndex + 1;
      } else {
        // left
        const c = colOf(dragFromIndex);
        if (c > 0) targetIdx = dragFromIndex - 1;
      }
    } else {
      // vertical
      if (dy > 0) {
        // down
        const r = rowOf(dragFromIndex);
        if (r < BOARD_ROWS - 1) targetIdx = dragFromIndex + BOARD_COLS;
      } else {
        // up
        const r = rowOf(dragFromIndex);
        if (r > 0) targetIdx = dragFromIndex - BOARD_COLS;
      }
    }

    if (targetIdx !== null) {
      await trySwapAndResolve(dragFromIndex, targetIdx);
    }
    dragFromIndex = null;
  });

  // pointercancel / leave
  cellEl.addEventListener('pointercancel', () => {
    dragFromIndex = null;
  });

  // also support click for desktop: simple select neighbor by clicking neighbor quickly is not implemented
}

// ----- small wait helper -----
function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ----- Expose API for index.html navigation -----
window.initGame = function() {
  // load saved values
  try {
    level = Storage.getLevel ? Storage.getLevel() : level;
    coins = Storage.getCoins ? Storage.getCoins() : coins;
  } catch (err) {
    console.warn('Storage not found or failed', err);
  }
  initGame();
};
window.shuffleBoard = shuffleBoard;
window.restartGame = restartGame;
window.trySwapAndResolve = trySwapAndResolve; // for debug

// Hook up HUD buttons if present
if (restartBtn) restartBtn.addEventListener('click', restartGame);
if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleBoard);

// Auto-init if game section active at load
setTimeout(() => {
  const gameSection = document.getElementById('game');
  if (gameSection && gameSection.classList.contains('active')) {
    if (typeof window.initGame === 'function') window.initGame();
  }
}, 200);

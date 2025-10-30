// js/game.js
// Candy Match engine: configurable rows x cols, drag/touch swap, match-3 detect, gravity refill.
// Usage: ensure index.html में मौजूद हों: #board, #score, #coins, #level-num, #btn-restart, #btn-shuffle
// Images: images/candy1.png ... images/candy6.png

(function () {
  console.log('CandyEngine ready');

  // CONFIG: rows x cols
  const ROWS = 8;   // height
  const COLS = 6;   // width
  const CANDY_COUNT = 6; // candy images count (candy1..candy6)

  // state
  const state = {
    boardArr: [], // length ROWS * COLS
    score: 0,
    coins: 0,
    level: 1,
    isProcessing: false
  };

  // DOM refs (must exist in index.html)
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const levelEl = document.getElementById('level-num');
  const btnRestart = document.getElementById('btn-restart');
  const btnShuffle = document.getElementById('btn-shuffle');

  if (!boardEl) console.warn('CandyEngine: #board not found');

  // API holder
  window.CandyGame = window.CandyGame || {};

  // helpers
  function idx(r, c) { return r * COLS + c; }
  function rc(index) { return { r: Math.floor(index / COLS), c: index % COLS }; }
  function randCandy() { return Math.floor(Math.random() * CANDY_COUNT) + 1; }
  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  // initialize board with random candies and try to avoid immediate matches
  function initBoardRandom() {
    state.boardArr = new Array(ROWS * COLS).fill(0).map(_ => randCandy());
    // simple fix: if any initial matches exist, replace those tiles
    for (let attempt = 0; attempt < 8; attempt++) {
      const matches = findAllMatches();
      if (matches.length === 0) break;
      matches.forEach(g => g.forEach(i => state.boardArr[i] = randCandy()));
    }
  }

  // render board
  function renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    // set grid CSS properties (so CSS can use)
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

    for (let i = 0; i < ROWS * COLS; i++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.index = i;
      const candyId = state.boardArr[i] || 0;
      const img = document.createElement('img');
      img.alt = 'candy';
      img.draggable = false;
      img.src = candyId ? `images/candy${candyId}.png` : '';
      img.onerror = function () { this.style.display = 'none'; };
      tile.appendChild(img);
      boardEl.appendChild(tile);
    }
    attachPointerHandlers();
  }

  // find matches horizontally and vertically
  function findAllMatches() {
    const found = [];

    // horizontal
    for (let r = 0; r < ROWS; r++) {
      let runStart = 0;
      for (let c = 1; c <= COLS; c++) {
        const prev = state.boardArr[idx(r, c - 1)];
        const cur = (c < COLS) ? state.boardArr[idx(r, c)] : null;
        if (c < COLS && cur === prev && prev !== 0) {
          // continue run
        } else {
          const len = c - runStart;
          if (len >= 3) {
            const group = [];
            for (let k = runStart; k < runStart + len; k++) group.push(idx(r, k));
            found.push(group);
          }
          runStart = c;
        }
      }
    }

    // vertical
    for (let c = 0; c < COLS; c++) {
      let runStart = 0;
      for (let r = 1; r <= ROWS; r++) {
        const prev = state.boardArr[idx(r - 1, c)];
        const cur = (r < ROWS) ? state.boardArr[idx(r, c)] : null;
        if (r < ROWS && cur === prev && prev !== 0) {
          // continue
        } else {
          const len = r - runStart;
          if (len >= 3) {
            const group = [];
            for (let k = runStart; k < runStart + len; k++) group.push(idx(k, c));
            found.push(group);
          }
          runStart = r;
        }
      }
    }
    return found;
  }

  // remove matches (set to 0) and return removed count
  function removeMatches(groups) {
    const removed = new Set();
    groups.forEach(g => g.forEach(i => removed.add(i)));
    removed.forEach(i => state.boardArr[i] = 0);
    return removed.size;
  }

  // collapse columns (gravity downwards) and refill top with random candies
  function collapseAndRefill() {
    for (let c = 0; c < COLS; c++) {
      const colVals = [];
      for (let r = 0; r < ROWS; r++) {
        const v = state.boardArr[idx(r, c)];
        if (v !== 0) colVals.push(v);
      }
      const missing = ROWS - colVals.length;
      const newCol = new Array(missing).fill(0).map(_ => randCandy()).concat(colVals);
      for (let r = 0; r < ROWS; r++) state.boardArr[idx(r, c)] = newCol[r];
    }
  }

  // swap indices
  function swapIndices(a, b) {
    const t = state.boardArr[a];
    state.boardArr[a] = state.boardArr[b];
    state.boardArr[b] = t;
  }

  // try a swap and process matches; if no matches, undo
  async function attemptSwap(a, b) {
    if (state.isProcessing) return;
    state.isProcessing = true;
    swapIndices(a, b);
    renderBoard();
    await sleep(120);
    let groups = findAllMatches();
    if (groups.length === 0) {
      swapIndices(a, b); // undo
      renderBoard();
      state.isProcessing = false;
      return false;
    }
    // process until no more matches
    while (groups.length > 0) {
      const removedCount = removeMatches(groups);
      state.score += removedCount * 10;
      updateUI();
      renderBoard();
      await sleep(160);
      collapseAndRefill();
      renderBoard();
      await sleep(160);
      groups = findAllMatches();
    }
    state.isProcessing = false;
    return true;
  }

  // update UI numbers
  function updateUI() {
    if (scoreEl) scoreEl.textContent = state.score;
    if (coinsEl) coinsEl.textContent = state.coins;
    if (levelEl) levelEl.textContent = state.level;
  }

  // pointer (mouse/touch) handling for swipes
  function attachPointerHandlers() {
    if (!boardEl) return;
    // remove previous handlers safety
    boardEl.querySelectorAll('.tile').forEach(t => {
      t.onpointerdown = null;
      t.onpointerup = null;
      t.onpointermove = null;
      t.onpointercancel = null;
    });

    let startIdx = null;
    let startPoint = null;
    let activePointerId = null;

    boardEl.querySelectorAll('.tile').forEach(tile => {
      tile.onpointerdown = function (e) {
        if (state.isProcessing) return;
        // capture pointer
        activePointerId = e.pointerId;
        this.setPointerCapture && this.setPointerCapture(activePointerId);
        startIdx = parseInt(this.dataset.index);
        startPoint = { x: e.clientX, y: e.clientY };
        tile.classList.add('selected');
      };
      tile.onpointerup = function (e) {
        if (state.isProcessing) {
          clearSelection();
          return;
        }
        const endIdx = parseInt(this.dataset.index);
        const endPoint = { x: e.clientX, y: e.clientY };
        clearSelection();
        // first try neighbor by direct tile (tap on neighbor)
        if (isNeighbor(startIdx, endIdx)) {
          attemptSwap(startIdx, endIdx).catch(console.error);
          startIdx = null;
          startPoint = null;
          return;
        }
        // otherwise detect swipe direction from startPoint -> endPoint
        if (startPoint && Math.abs(endPoint.x - startPoint.x) + Math.abs(endPoint.y - startPoint.y) > 20) {
          const dx = endPoint.x - startPoint.x;
          const dy = endPoint.y - startPoint.y;
          let targetIdx = null;
          const s = rc(startIdx);
          if (Math.abs(dx) > Math.abs(dy)) {
            // horizontal swipe
            const dir = dx > 0 ? 1 : -1;
            const tc = s.c + dir;
            if (tc >= 0 && tc < COLS) targetIdx = idx(s.r, tc);
          } else {
            // vertical swipe
            const dir = dy > 0 ? 1 : -1;
            const tr = s.r + dir;
            if (tr >= 0 && tr < ROWS) targetIdx = idx(tr, s.c);
          }
          if (targetIdx !== null) {
            attemptSwap(startIdx, targetIdx).catch(console.error);
          }
        }
        startIdx = null;
        startPoint = null;
      };
      tile.onpointercancel = function () {
        clearSelection();
        startIdx = null; startPoint = null;
      };
    });

    function clearSelection() {
      boardEl.querySelectorAll('.tile.selected').forEach(t => t.classList.remove('selected'));
    }

    function isNeighbor(a, b) {
      if (typeof a !== 'number' || typeof b !== 'number') return false;
      const sa = rc(a), sb = rc(b);
      const dr = Math.abs(sa.r - sb.r), dc = Math.abs(sa.c - sb.c);
      return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    }
  }

  // Shuffle board (simple random)
  function shuffleBoard() {
    for (let i = state.boardArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = state.boardArr[i];
      state.boardArr[i] = state.boardArr[j];
      state.boardArr[j] = tmp;
    }
    // try to avoid immediate matches
    for (let attempt = 0; attempt < 8; attempt++) {
      if (findAllMatches().length === 0) break;
      for (let i = 0; i < state.boardArr.length; i++) state.boardArr[i] = randCandy();
    }
    renderBoard();
  }

  // Restart level
  function restartLevel() {
    state.score = 0;
    initBoardRandom();
    renderBoard();
    updateUI();
  }

  // public: start level
  async function startLevel(levelNumber = 1) {
    console.log('CandyGame.startLevel', levelNumber);
    state.level = levelNumber;
    state.score = 0;
    initBoardRandom();
    renderBoard();
    updateUI();
    // show game page if present
    const gamePage = document.getElementById('game');
    if (gamePage) {
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      gamePage.classList.remove('hidden');
      gamePage.classList.add('page--active');
    }
  }

  // Attach control buttons
  if (btnRestart) btnRestart.addEventListener('click', () => { if (!state.isProcessing) restartLevel(); });
  if (btnShuffle) btnShuffle.addEventListener('click', () => { if (!state.isProcessing) shuffleBoard(); });

  // expose API
  window.CandyGame.startLevel = startLevel;
  window.CandyGame.getState = () => ({ ...state });

  // boot when DOM ready
  function boot() {
    initBoardRandom();
    renderBoard();
    updateUI();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();

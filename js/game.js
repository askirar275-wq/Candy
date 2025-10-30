// js/game.js
// Swipe-enabled Candy engine (8x6 grid). Matches, gravity, refill.
// Requires: #board, #score, #coins, #level-num, #btn-restart, #btn-shuffle
// Exposes: window.CandyGame.startLevel(levelNumber)

(function () {
  console.log('CandyEngine ready');

  const ROWS = 8;
  const COLS = 6;
  const CANDY_COUNT = 6;

  const state = {
    boardArr: [],
    score: 0,
    coins: 0,
    level: 1,
    isProcessing: false
  };

  // DOM
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const levelEl = document.getElementById('level-num');
  const btnRestart = document.getElementById('btn-restart');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnStart = document.getElementById('btn-start');

  if (!boardEl) console.warn('CandyEngine: #board not found');

  window.CandyGame = window.CandyGame || {};

  const idx = (r, c) => r * COLS + c;
  const rc = (i) => ({ r: Math.floor(i / COLS), c: i % COLS });
  const randCandy = () => Math.floor(Math.random() * CANDY_COUNT) + 1;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function initBoardRandom() {
    state.boardArr = new Array(ROWS * COLS).fill(0).map(_ => randCandy());
    // remove any initial matches
    for (let attempt = 0; attempt < 8; attempt++) {
      const matches = findAllMatches();
      if (matches.length === 0) break;
      matches.forEach(g => g.forEach(i => state.boardArr[i] = randCandy()));
    }
  }

  function renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
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
      if (candyId) img.src = `images/candy${candyId}.png`;
      img.onerror = () => { img.style.display = 'none'; };
      tile.appendChild(img);
      boardEl.appendChild(tile);
    }
    attachPointerHandlers();
  }

  function findAllMatches() {
    const found = [];
    // horizontal
    for (let r = 0; r < ROWS; r++) {
      let runStart = 0;
      for (let c = 1; c <= COLS; c++) {
        const prev = state.boardArr[idx(r, c - 1)];
        const cur = (c < COLS) ? state.boardArr[idx(r, c)] : null;
        if (c < COLS && cur === prev && prev !== 0) {
          // continuing
        } else {
          const len = c - runStart;
          if (len >= 3) {
            const g = [];
            for (let k = runStart; k < runStart + len; k++) g.push(idx(r, k));
            found.push(g);
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
          // continuing
        } else {
          const len = r - runStart;
          if (len >= 3) {
            const g = [];
            for (let k = runStart; k < runStart + len; k++) g.push(idx(k, c));
            found.push(g);
          }
          runStart = r;
        }
      }
    }
    return found;
  }

  function removeMatches(groups) {
    const removed = new Set();
    groups.forEach(g => g.forEach(i => removed.add(i)));
    removed.forEach(i => state.boardArr[i] = 0);
    return removed.size;
  }

  function collapseAndRefill() {
    for (let c = 0; c < COLS; c++) {
      const col = [];
      for (let r = 0; r < ROWS; r++) {
        const v = state.boardArr[idx(r, c)];
        if (v !== 0) col.push(v);
      }
      const missing = ROWS - col.length;
      const newCol = new Array(missing).fill(0).map(_ => randCandy()).concat(col);
      for (let r = 0; r < ROWS; r++) state.boardArr[idx(r, c)] = newCol[r];
    }
  }

  function swapIndices(a, b) {
    const t = state.boardArr[a];
    state.boardArr[a] = state.boardArr[b];
    state.boardArr[b] = t;
  }

  async function attemptSwap(a, b) {
    if (state.isProcessing) return false;
    state.isProcessing = true;
    swapIndices(a, b);
    renderBoard();
    await sleep(120);
    let groups = findAllMatches();
    if (groups.length === 0) {
      // no match -> undo
      swapIndices(a, b);
      renderBoard();
      state.isProcessing = false;
      return false;
    }
    while (groups.length > 0) {
      const removedCount = removeMatches(groups);
      state.score += removedCount * 10;
      updateUI();
      renderBoard();
      await sleep(140);
      collapseAndRefill();
      renderBoard();
      await sleep(160);
      groups = findAllMatches();
    }
    state.isProcessing = false;
    return true;
  }

  function updateUI() {
    if (scoreEl) scoreEl.textContent = state.score;
    if (coinsEl) coinsEl.textContent = state.coins;
    if (levelEl) levelEl.textContent = state.level;
  }

  // Pointer/touch handlers (robust)
  function attachPointerHandlers() {
    if (!boardEl) return;
    boardEl.querySelectorAll('.tile').forEach(t => {
      t.onpointerdown = null; t.onpointerup = null; t.onpointercancel = null; t.onpointermove = null;
    });

    let startIdx = null;
    let startPoint = null;
    let activeId = null;
    const SWIPE_THRESHOLD = 18; // pixels

    boardEl.querySelectorAll('.tile').forEach(tile => {
      tile.onpointerdown = function (e) {
        if (state.isProcessing) return;
        activeId = e.pointerId;
        tile.setPointerCapture && tile.setPointerCapture(activeId);
        startIdx = parseInt(this.dataset.index);
        startPoint = { x: e.clientX, y: e.clientY };
        this.classList.add('selected');
      };

      tile.onpointerup = function (e) {
        if (!startIdx) return;
        const endIdx = parseInt(this.dataset.index);
        const endPoint = { x: e.clientX, y: e.clientY };
        // Clear selection visuals
        boardEl.querySelectorAll('.tile.selected').forEach(x => x.classList.remove('selected'));

        // If user tapped a neighboring tile -> swap
        if (isNeighbor(startIdx, endIdx)) {
          attemptSwap(startIdx, endIdx).catch(err => console.error(err));
          startIdx = null; startPoint = null;
          return;
        }

        // Otherwise check swipe direction from startPoint
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        if (Math.abs(dx) + Math.abs(dy) < SWIPE_THRESHOLD) {
          // too small -> ignore
          startIdx = null; startPoint = null;
          return;
        }
        let target = null;
        const s = rc(startIdx);
        if (Math.abs(dx) > Math.abs(dy)) {
          // horizontal
          const dir = dx > 0 ? 1 : -1;
          const tc = s.c + dir;
          if (tc >= 0 && tc < COLS) target = idx(s.r, tc);
        } else {
          // vertical
          const dir = dy > 0 ? 1 : -1;
          const tr = s.r + dir;
          if (tr >= 0 && tr < ROWS) target = idx(tr, s.c);
        }
        if (target !== null) attemptSwap(startIdx, target).catch(err => console.error(err));
        startIdx = null; startPoint = null;
      };

      tile.onpointercancel = function () {
        startIdx = null; startPoint = null;
        boardEl.querySelectorAll('.tile.selected').forEach(x => x.classList.remove('selected'));
      };
    });

    function isNeighbor(a, b) {
      if (typeof a !== 'number' || typeof b !== 'number') return false;
      const A = rc(a), B = rc(b);
      const dr = Math.abs(A.r - B.r), dc = Math.abs(A.c - B.c);
      return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    }
  }

  function shuffleBoard() {
    for (let i = state.boardArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.boardArr[i], state.boardArr[j]] = [state.boardArr[j], state.boardArr[i]];
    }
    // avoid initial matches
    for (let a = 0; a < 8; a++) {
      if (findAllMatches().length === 0) break;
      for (let i = 0; i < state.boardArr.length; i++) state.boardArr[i] = randCandy();
    }
    renderBoard();
  }

  function restartLevel() {
    state.score = 0;
    initBoardRandom();
    renderBoard();
    updateUI();
  }

  async function startLevel(level = 1) {
    console.log('CandyGame.startLevel', level);
    state.level = level;
    state.score = 0;
    initBoardRandom();
    renderBoard();
    updateUI();
    // show game page if present
    const gamePage = document.getElementById('game');
    if (gamePage) {
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      gamePage.classList.remove('hidden');
    }
  }

  // attach buttons
  if (btnRestart) btnRestart.addEventListener('click', () => { if (!state.isProcessing) restartLevel(); });
  if (btnShuffle) btnShuffle.addEventListener('click', () => { if (!state.isProcessing) shuffleBoard(); });
  if (btnStart) btnStart.addEventListener('click', () => { window.CandyGame.startLevel(1); });

  window.CandyGame = window.CandyGame || {};
  window.CandyGame.startLevel = startLevel;
  window.CandyGame.getState = () => ({ ...state });

  // boot
  function boot() {
    initBoardRandom();
    renderBoard();
    updateUI();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();

// js/game.js
// Simple Candy Match engine: 8x8 grid, drag-to-swap, match-3 detect, collapse+refill.
// Requires in HTML: #board, #score, #coins, #level-num, #btn-restart, #btn-shuffle
// Images: images/candy1.png ... images/candy6.png

(function () {
  console.log('CandyEngine ready');

  const SIZE = 8; // grid size (8x8)
  const CANDY_COUNT = 6; // number of candy types (images candy1..candy6)
  const tileSizePx = null; // not used here, CSS controls size

  // state
  const state = {
    boardArr: [], // linear array length SIZE*SIZE storing candyId (1..CANDY_COUNT)
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

  if (!boardEl) {
    console.warn('CandyEngine: #board not found in DOM yet');
  }

  // public API holder
  window.CandyGame = window.CandyGame || {};

  // helper: index conversions
  function idx(row, col) {
    return row * SIZE + col;
  }
  function rc(index) {
    return { r: Math.floor(index / SIZE), c: index % SIZE };
  }

  // create random candy id 1..CANDY_COUNT
  function randCandy() {
    return Math.floor(Math.random() * CANDY_COUNT) + 1;
  }

  // render board DOM
  function renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = ''; // clear
    // create tiles as buttons/divs
    for (let i = 0; i < SIZE * SIZE; i++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.index = i;
      const candyId = state.boardArr[i];
      const img = document.createElement('img');
      img.alt = 'candy';
      // use images/candy{n}.png
      img.src = `images/candy${candyId}.png`;
      // onerror fallback to show nothing if missing
      img.onerror = function () { this.style.display = 'none'; };
      tile.appendChild(img);
      boardEl.appendChild(tile);
    }
    attachDragHandlers();
  }

  // initialize board with random candies but ensure no initial matches
  function initBoardRandom() {
    state.boardArr = new Array(SIZE * SIZE).fill(0).map(_ => randCandy());
    // remove immediate matches by reshuffling problematic tiles
    // simple approach: while matches exist, replace those tiles
    let attempts = 0;
    while (true) {
      const matches = findAllMatches();
      if (matches.length === 0) break;
      matches.forEach(group => {
        group.forEach(idx => state.boardArr[idx] = randCandy());
      });
      if (++attempts > 10) break;
    }
  }

  // find all matches (returns array of arrays of indices)
  function findAllMatches() {
    const found = [];
    // horizontal
    for (let r = 0; r < SIZE; r++) {
      let runStart = 0;
      for (let c = 1; c <= SIZE; c++) {
        const prev = state.boardArr[idx(r, c - 1)];
        const cur = c < SIZE ? state.boardArr[idx(r, c)] : null;
        if (c < SIZE && cur === prev) {
          // continue
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
    for (let c = 0; c < SIZE; c++) {
      let runStart = 0;
      for (let r = 1; r <= SIZE; r++) {
        const prev = state.boardArr[idx(r - 1, c)];
        const cur = r < SIZE ? state.boardArr[idx(r, c)] : null;
        if (r < SIZE && cur === prev) {
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
    // optionally merge overlapping groups if needed (not mandatory)
    return found;
  }

  // remove matches (set to 0), return total removed count
  function removeMatches(groups) {
    const removedSet = new Set();
    groups.forEach(g => g.forEach(i => removedSet.add(i)));
    removedSet.forEach(i => state.boardArr[i] = 0);
    return removedSet.size;
  }

  // collapse columns (gravity) and refill from top
  function collapseAndRefill() {
    for (let c = 0; c < SIZE; c++) {
      const col = [];
      for (let r = 0; r < SIZE; r++) {
        const val = state.boardArr[idx(r, c)];
        if (val !== 0) col.push(val);
      }
      // fill from bottom
      const missing = SIZE - col.length;
      const newCol = new Array(missing).fill(0).map(_ => randCandy()).concat(col);
      for (let r = 0; r < SIZE; r++) state.boardArr[idx(r, c)] = newCol[r];
    }
  }

  // swap two indices in boardArr
  function swapIndices(a, b) {
    const tmp = state.boardArr[a];
    state.boardArr[a] = state.boardArr[b];
    state.boardArr[b] = tmp;
  }

  // attempt to swap and process matches, undo if no match
  async function attemptSwap(a, b) {
    if (state.isProcessing) return;
    state.isProcessing = true;
    swapIndices(a, b);
    renderBoard(); // immediate visual
    await sleep(120);
    let groups = findAllMatches();
    if (groups.length === 0) {
      // no matches, undo
      swapIndices(a, b);
      renderBoard();
      state.isProcessing = false;
      return;
    }
    // we have matches -> process until no more
    while (groups.length > 0) {
      const removed = removeMatches(groups);
      state.score += removed * 10;
      updateUI();
      renderBoard();
      await sleep(180);
      collapseAndRefill();
      renderBoard();
      await sleep(180);
      groups = findAllMatches();
    }
    state.isProcessing = false;
  }

  function updateUI() {
    if (scoreEl) scoreEl.textContent = state.score;
    if (coinsEl) coinsEl.textContent = state.coins;
    if (levelEl) levelEl.textContent = state.level;
  }

  function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  // Drag & touch handling
  function attachDragHandlers() {
    if (!boardEl) return;
    let dragging = false;
    let startIndex = null;
    let startPos = null;

    // Touch and mouse support
    boardEl.querySelectorAll('.tile').forEach(tile => {
      // prevent multiple bindings
      tile.onpointerdown = handlePointerDown;
      tile.onpointerup = handlePointerUp;
      tile.onpointercancel = handlePointerCancel;
      tile.ondragstart = e => e.preventDefault();
    });

    function handlePointerDown(e) {
      if (state.isProcessing) return;
      dragging = true;
      startIndex = parseInt(this.dataset.index);
      startPos = getPoint(e);
      // mark selected
      clearSelected();
      this.classList.add('selected');
      e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    }

    function handlePointerUp(e) {
      if (!dragging) return;
      dragging = false;
      const endIndex = parseInt(this.dataset.index);
      const endPos = getPoint(e);
      const swapped = trySwapByDrag(startIndex, endIndex, startPos, endPos);
      clearSelected();
      if (swapped) {
        // swap and process
        attemptSwap(startIndex, endIndex).catch(err => {
          console.error('swap error', err);
          state.isProcessing = false;
        });
      }
      startIndex = null;
      startPos = null;
    }

    function handlePointerCancel(e) {
      dragging = false;
      clearSelected();
      startIndex = null;
      startPos = null;
    }

    function getPoint(e) {
      if (e.touches && e.touches[0]) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else {
        return { x: e.clientX, y: e.clientY };
      }
    }

    function clearSelected() {
      boardEl.querySelectorAll('.tile.selected').forEach(t => t.classList.remove('selected'));
    }

    // decide if swap is valid neighbour (by index OR by drag direction and neighbour distance)
    function trySwapByDrag(startIdx, endIdx, startPos, endPos) {
      if (startIdx == null || endIdx == null) return false;
      if (startIdx === endIdx) return false;
      const s = rc(startIdx);
      const e = rc(endIdx);
      const dr = Math.abs(s.r - e.r);
      const dc = Math.abs(s.c - e.c);
      // neighbor only
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        return true;
      }
      // fallback: if user dragged more than 20px horizontally/vertically, find neighbour in that direction
      if (startPos && endPos) {
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
          // horizontal
          const dir = dx > 0 ? 1 : -1;
          const targetC = s.c + dir;
          if (targetC >= 0 && targetC < SIZE) {
            const targetIdx = idx(s.r, targetC);
            // update endIdx to neighbour
            endIdx = targetIdx;
            return true;
          }
        } else if (Math.abs(dy) > 20) {
          const dir = dy > 0 ? 1 : -1;
          const targetR = s.r + dir;
          if (targetR >= 0 && targetR < SIZE) {
            const targetIdx = idx(targetR, s.c);
            endIdx = targetIdx;
            return true;
          }
        }
      }
      return false;
    }
  }

  // Shuffle board randomly
  function shuffleBoard() {
    // Fisher-Yates on boardArr
    for (let i = state.boardArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = state.boardArr[i];
      state.boardArr[i] = state.boardArr[j];
      state.boardArr[j] = t;
    }
    // ensure no immediate matches (simple attempt)
    let attempts = 0;
    while (findAllMatches().length > 0 && attempts++ < 8) {
      for (let i = 0; i < state.boardArr.length; i++) state.boardArr[i] = randCandy();
    }
    renderBoard();
  }

  // Restart level
  function restartLevel() {
    state.score = 0;
    state.coins = state.coins; // keep coins
    initBoardRandom();
    renderBoard();
    updateUI();
  }

  // Start a level (public)
  async function startLevel(levelNumber = 1) {
    console.log('CandyGame.startLevel', levelNumber);
    state.level = levelNumber;
    state.score = 0;
    // you can change difficulty by levelNumber: here we keep same grid but could vary candies
    initBoardRandom();
    renderBoard();
    updateUI();
    // show game page - if page manager exists (index.html inline does)
    const gamePage = document.getElementById('game');
    if (gamePage) {
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      gamePage.classList.remove('hidden');
      gamePage.classList.add('page--active');
    }
  }

  // attach restart / shuffle buttons
  if (btnRestart) btnRestart.addEventListener('click', () => {
    if (state.isProcessing) return;
    restartLevel();
  });
  if (btnShuffle) btnShuffle.addEventListener('click', () => {
    if (state.isProcessing) return;
    shuffleBoard();
  });

  // Expose API
  window.CandyGame.startLevel = startLevel;
  window.CandyGame.getState = () => ({...state});

  // quick init if board element already present; otherwise wait DOMContentLoaded
  function bootIfReady() {
    if (!boardEl) return;
    initBoardRandom();
    renderBoard();
    updateUI();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootIfReady);
  } else {
    bootIfReady();
  }

})();

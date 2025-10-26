/* ---------------------------
   Candy Match Game Engine
   ---------------------------
   - Match 3 logic (swap, detect, remove, gravity, refill)
   - Responsive and touch-friendly
   - Compatible with index.html layout provided
----------------------------*/

(function () {
  const ROWS = 8;
  const COLS = 8;
  const TYPES = ["c1", "c2", "c3", "c4", "c5", "c6"]; // image names in images/
  const CELL_PREFIX = "cell-";

  let board = [];
  let score = 0;
  let coins = 0;
  let level = 1;
  let isAnimating = false;

  // DOM references
  let boardEl, scoreEl, coinsEl, levelEl;

  // ------------------ Initialization ------------------
  function init() {
    boardEl = document.getElementById("board");
    scoreEl = document.getElementById("score");
    coinsEl = document.getElementById("coins");
    levelEl = document.getElementById("level-num");

    if (!boardEl || !scoreEl || !coinsEl || !levelEl) {
      console.error("Game board elements not found! Check your HTML IDs.");
      return;
    }

    document
      .getElementById("btn-restart")
      ?.addEventListener("click", restartGame);
    document
      .getElementById("btn-shuffle")
      ?.addEventListener("click", shuffleBoard);

    initBoard();
    renderBoard();

    updateStats();
    console.log("CandyGame ready ✅");
  }

  // ------------------ Helpers ------------------
  function randomCandy() {
    return TYPES[Math.floor(Math.random() * TYPES.length)];
  }

  function candySrc(type) {
    return `images/${type}.png`;
  }

  function updateStats() {
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    levelEl.textContent = level;
  }

  // ------------------ Board Setup ------------------
  function initBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        let type;
        do {
          type = randomCandy();
          board[r][c] = type;
        } while (createsMatch(r, c));
      }
    }
  }

  function createsMatch(r, c) {
    const t = board[r][c];
    // Horizontal
    let count = 1;
    for (let i = c - 1; i >= 0 && board[r][i] === t; i--) count++;
    for (let i = c + 1; i < COLS && board[r][i] === t; i++) count++;
    if (count >= 3) return true;

    // Vertical
    count = 1;
    for (let i = r - 1; i >= 0 && board[i][c] === t; i--) count++;
    for (let i = r + 1; i < ROWS && board[i][c] === t; i++) count++;
    return count >= 3;
  }

  // ------------------ Rendering ------------------
  function renderBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.id = `${CELL_PREFIX}${r}-${c}`;
        cell.dataset.r = r;
        cell.dataset.c = c;

        const img = document.createElement("img");
        img.src = candySrc(board[r][c]);
        img.alt = "candy";
        cell.appendChild(img);

        // Drag & swipe
        cell.addEventListener("pointerdown", onPointerDown);
        cell.addEventListener("pointerup", onPointerUp);
        cell.addEventListener("pointercancel", clearSelection);
        cell.addEventListener("pointermove", onPointerMove);
        boardEl.appendChild(cell);
      }
    }
  }

  // ------------------ Pointer (Swipe Handling) ------------------
  let pointerStart = null;
  let selected = null;

  function onPointerDown(e) {
    if (isAnimating) return;
    const el = e.currentTarget;
    pointerStart = { x: e.clientX, y: e.clientY, r: +el.dataset.r, c: +el.dataset.c };
    selected = el;
    el.classList.add("selected");
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove() {}

  function onPointerUp(e) {
    if (!pointerStart) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 20;

    clearSelection(e);

    if (absX < threshold && absY < threshold) return;

    let dr = 0, dc = 0;
    if (absX > absY) dc = dx > 0 ? 1 : -1;
    else dr = dy > 0 ? 1 : -1;

    const sr = pointerStart.r;
    const sc = pointerStart.c;
    const tr = sr + dr;
    const tc = sc + dc;

    if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) return;

    swapAndMatch(sr, sc, tr, tc);
  }

  function clearSelection(e) {
    if (selected) selected.classList.remove("selected");
    selected = null;
    pointerStart = null;
  }

  // ------------------ Swap, Match & Gravity ------------------
  async function swapAndMatch(r1, c1, r2, c2) {
    if (isAnimating) return;
    isAnimating = true;

    [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
    renderBoard();

    let matches = findMatches();
    if (matches.length === 0) {
      // revert
      [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
      renderBoard();
      isAnimating = false;
      return;
    }

    while (matches.length > 0) {
      removeMatches(matches);
      updateStats();
      await sleep(200);
      dropCandies();
      refillBoard();
      renderBoard();
      await sleep(200);
      matches = findMatches();
    }

    checkLevelComplete();
    isAnimating = false;
  }

  function findMatches() {
    const matches = [];
    const visited = Array.from({ length: ROWS }, () =>
      Array(COLS).fill(false)
    );

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      let start = 0;
      for (let c = 1; c <= COLS; c++) {
        if (c < COLS && board[r][c] === board[r][start]) continue;
        const len = c - start;
        if (len >= 3) {
          const group = [];
          for (let x = start; x < c; x++) {
            group.push({ r, c: x });
            visited[r][x] = true;
          }
          matches.push(group);
        }
        start = c;
      }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
      let start = 0;
      for (let r = 1; r <= ROWS; r++) {
        if (r < ROWS && board[r][c] === board[start][c]) continue;
        const len = r - start;
        if (len >= 3) {
          const group = [];
          for (let y = start; y < r; y++) {
            if (!visited[y][c]) group.push({ r: y, c });
          }
          if (group.length) matches.push(group);
        }
        start = r;
      }
    }
    return matches;
  }

  function removeMatches(matches) {
    let count = 0;
    matches.forEach((group) => {
      group.forEach((p) => {
        if (board[p.r][p.c] !== null) {
          board[p.r][p.c] = null;
          count++;
        }
      });
    });
    score += count * 10;
    coins += Math.floor(count / 5);
  }

  function dropCandies() {
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c] === null) {
          for (let k = r - 1; k >= 0; k--) {
            if (board[k][c] !== null) {
              board[r][c] = board[k][c];
              board[k][c] = null;
              break;
            }
          }
        }
      }
    }
  }

  function refillBoard() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === null) board[r][c] = randomCandy();
      }
    }
  }

  function shuffleBoard() {
    if (isAnimating) return;
    const flat = board.flat();
    flat.sort(() => Math.random() - 0.5);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        board[r][c] = flat[r * COLS + c];
      }
    }
    renderBoard();
  }

  function restartGame() {
    score = 0;
    coins = 0;
    initBoard();
    renderBoard();
    updateStats();
  }

  // ------------------ Level Unlock ------------------
  function checkLevelComplete() {
    const target = level * 500;
    if (score >= target) {
      const unlocked = Number(localStorage.getItem("maxLevel") || 1);
      if (level >= unlocked) localStorage.setItem("maxLevel", level + 1);
      alert(`🎉 Level ${level} Complete! अगला लेवल अनलॉक हो गया है।`);
    }
  }

  // ------------------ Utility ------------------
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ------------------ Public API ------------------
  window.CandyGame = {
    init,
    startLevel: function (lvl) {
      level = lvl || 1;
      restartGame();
      document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
      document.getElementById("game").classList.remove("hidden");
    },
    restart: restartGame,
    shuffle: shuffleBoard,
  };
})();

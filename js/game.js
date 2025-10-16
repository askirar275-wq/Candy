// === Candy Match Game Core ===
// Fixed version with working swipe, click swap, match detection and gravity refill.

(function () {
  console.log("✅ Game script loaded");

  const CANDY_IMAGES = [
    "images/candy1.png",
    "images/candy2.png",
    "images/candy3.png",
    "images/candy4.png",
    "images/candy5.png",
    "images/candy6.png"
  ];

  const BOARD_SIZE = 8;
  const SWIPE_THRESHOLD = 30;

  let board = [];
  let score = 0;
  let coins = Number(localStorage.getItem("cm_coins")) || 0;
  let level = Number(localStorage.getItem("cm_level")) || 1;

  // DOM Shortcuts
  const $ = (id) => document.getElementById(id);

  function updateUI() {
    $("score").textContent = score;
    $("coins").textContent = coins;
    $("currentLevel").textContent = level;
  }

  function saveProgress() {
    localStorage.setItem("cm_coins", coins);
    localStorage.setItem("cm_level", level);
  }

  // Initialize random board
  function createBoard() {
    const grid = $("game-board");
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 1fr)`;

    board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () =>
      Math.floor(Math.random() * CANDY_IMAGES.length)
    );

    for (let i = 0; i < board.length; i++) {
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.index = i;

      const img = document.createElement("img");
      img.src = CANDY_IMAGES[board[i]];
      img.draggable = false;
      div.appendChild(img);
      grid.appendChild(div);

      // click handler
      div.addEventListener("click", handleCellClick);
      // swipe handlers
      div.addEventListener("touchstart", handleTouchStart);
      div.addEventListener("touchend", handleTouchEnd);
    }
  }

  // ---- Swipe / Click Logic ----
  let selectedIndex = null;
  let touchStartX = 0;
  let touchStartY = 0;

  function handleCellClick(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (selectedIndex === null) {
      selectedIndex = idx;
      e.currentTarget.classList.add("selected");
    } else {
      swapCandies(selectedIndex, idx);
      document
        .querySelectorAll(".selected")
        .forEach((el) => el.classList.remove("selected"));
      selectedIndex = null;
    }
  }

  function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    selectedIndex = Number(e.currentTarget.dataset.index);
  }

  function handleTouchEnd(e) {
    if (selectedIndex === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    let targetIndex = null;
    const row = Math.floor(selectedIndex / BOARD_SIZE);
    const col = selectedIndex % BOARD_SIZE;

    if (Math.abs(dx) > Math.abs(dy)) {
      // horizontal swipe
      if (dx > SWIPE_THRESHOLD && col < BOARD_SIZE - 1)
        targetIndex = selectedIndex + 1;
      else if (dx < -SWIPE_THRESHOLD && col > 0)
        targetIndex = selectedIndex - 1;
    } else {
      // vertical swipe
      if (dy > SWIPE_THRESHOLD && row < BOARD_SIZE - 1)
        targetIndex = selectedIndex + BOARD_SIZE;
      else if (dy < -SWIPE_THRESHOLD && row > 0)
        targetIndex = selectedIndex - BOARD_SIZE;
    }

    if (targetIndex !== null) swapCandies(selectedIndex, targetIndex);
    selectedIndex = null;
  }

  // ---- Swap + Match ----
  function swapCandies(a, b) {
    const temp = board[a];
    board[a] = board[b];
    board[b] = temp;
    renderBoard();

    const matches = findMatches();
    if (matches.length > 0) {
      handleMatches(matches);
    } else {
      // revert if no match
      const t = board[a];
      board[a] = board[b];
      board[b] = t;
      renderBoard();
    }
  }

  // ---- Find Matches ----
  function findMatches() {
    const matches = [];
    const used = Array(board.length).fill(false);

    // horizontal
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE - 2; c++) {
        const idx = r * BOARD_SIZE + c;
        const val = board[idx];
        if (
          val === board[idx + 1] &&
          val === board[idx + 2] &&
          !used[idx]
        ) {
          const group = [idx, idx + 1, idx + 2];
          matches.push(group);
          used[idx] = used[idx + 1] = used[idx + 2] = true;
        }
      }
    }

    // vertical
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r < BOARD_SIZE - 2; r++) {
        const idx = r * BOARD_SIZE + c;
        const val = board[idx];
        if (
          val === board[idx + BOARD_SIZE] &&
          val === board[idx + 2 * BOARD_SIZE] &&
          !used[idx]
        ) {
          const group = [idx, idx + BOARD_SIZE, idx + 2 * BOARD_SIZE];
          matches.push(group);
          used[idx] = used[idx + BOARD_SIZE] = used[idx + 2 * BOARD_SIZE] = true;
        }
      }
    }

    return matches;
  }

  // ---- Handle Matches ----
  function handleMatches(matches) {
    let cleared = 0;

    for (const group of matches) {
      for (const idx of group) {
        board[idx] = null;
        cleared++;
      }
    }

    score += cleared * 100;
    coins += Math.floor(cleared * 10);
    saveProgress();

    applyGravity();
    refillBoard();
    renderBoard();

    const newMatches = findMatches();
    if (newMatches.length > 0) handleMatches(newMatches);

    updateUI();
  }

  // ---- Gravity ----
  function applyGravity() {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const col = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        const idx = r * BOARD_SIZE + c;
        if (board[idx] !== null) col.push(board[idx]);
      }
      const missing = BOARD_SIZE - col.length;
      const newCol = Array(missing).fill(null).concat(col);
      for (let r = 0; r < BOARD_SIZE; r++) {
        board[r * BOARD_SIZE + c] = newCol[r];
      }
    }
  }

  // ---- Refill ----
  function refillBoard() {
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null)
        board[i] = Math.floor(Math.random() * CANDY_IMAGES.length);
    }
  }

  // ---- Render ----
  function renderBoard() {
    const grid = $("game-board");
    const imgs = grid.querySelectorAll("img");
    for (let i = 0; i < imgs.length; i++) {
      imgs[i].src = CANDY_IMAGES[board[i]];
    }
  }

  // ---- Controls ----
  $("restartBtn")?.addEventListener("click", () => {
    score = 0;
    createBoard();
    updateUI();
  });

  $("shuffleBtn")?.addEventListener("click", () => {
    board.sort(() => Math.random() - 0.5);
    renderBoard();
  });

  // ---- Init ----
  window.addEventListener("load", () => {
    createBoard();
    updateUI();
  });
})();

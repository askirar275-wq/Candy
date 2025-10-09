// ========================= Candy Match - Final Swipe Build =========================
// 🧩 No random candy bug | 💰 Coin popup | 🏆 Level ready | ⚙️ Swipe + Tap support

(function () {
  const WIDTH = 6, HEIGHT = 8, SIZE = WIDTH * HEIGHT;
  const IMGPATH = "images/";
  const CANDIES = [
    "candy1.png","candy2.png","candy3.png","candy4.png",
    "candy5.png","candy6.png","candy7.png","candy8.png"
  ];

  let board = [], selectedIndex = null, score = 0, combo = 1, isResolving = false, nextId = 1;

  const $ = id => document.getElementById(id);
  const randCandy = () => IMGPATH + CANDIES[Math.floor(Math.random() * CANDIES.length)];
  const makeTile = () => ({ id: nextId++, src: randCandy() });

  // ✅ Safe storage wrapper
  const StorageAPI = {
    getCoins: () => Number(localStorage.getItem("cm_coins") || 0),
    addCoins(n) {
      const total = Math.max(0, this.getCoins() + Number(n || 0));
      localStorage.setItem("cm_coins", total);
    },
    getLevel: () => Number(localStorage.getItem("cm_level") || 1),
    setLevel: (l) => localStorage.setItem("cm_level", l)
  };

  // === INIT BOARD ===
  function initBoard() {
    nextId = 1;
    board = new Array(SIZE).fill(null).map(() => makeTile());
    score = 0; combo = 1; selectedIndex = null;
    render();
  }

  // === RENDER ===
  function render() {
    const grid = $("game-board");
    if (!grid) return console.warn("⚠️ No game-board found");
    grid.style.gridTemplateColumns = `repeat(${WIDTH}, var(--tile))`;
    grid.innerHTML = "";

    for (let i = 0; i < SIZE; i++) {
      const tile = board[i];
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.index = i;

      const img = document.createElement("img");
      img.className = "tile";
      img.draggable = true;
      img.src = tile?.src || "";
      img.style.visibility = tile ? "" : "hidden";

      // Selection
      if (selectedIndex === i) cell.classList.add("selected");

      // Tap event
      cell.addEventListener("click", () => onCellClick(i));

      // --- 🧭 SWIPE SUPPORT ---
      let startX, startY;
      img.addEventListener("touchstart", (e) => {
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
      });
      img.addEventListener("touchend", (e) => {
        if (!startX || !startY) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        let dir = null;
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 20 ? "right" : dx < -20 ? "left" : null;
        } else {
          dir = dy > 20 ? "down" : dy < -20 ? "up" : null;
        }
        if (dir) handleSwipe(i, dir);
      });

      // Mouse drag (desktop)
      img.addEventListener("dragstart", (e) => e.dataTransfer.setData("index", i));
      img.addEventListener("dragover", (e) => e.preventDefault());
      img.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("index"));
        const to = i;
        if (from !== to && isAdjacent(from, to)) {
          onSwap(from, to);
        }
      });

      cell.appendChild(img);
      grid.appendChild(cell);
    }

    // Update HUD
    const s = $("score"); if (s) s.textContent = score;
    const c = $("coins"); if (c) c.textContent = StorageAPI.getCoins();
    const sc = $("shopCoins"); if (sc) sc.textContent = StorageAPI.getCoins();
    const lvl = $("currentLevel"); if (lvl) lvl.textContent = StorageAPI.getLevel();
  }

  // === TAP LOGIC ===
  function onCellClick(i) {
    if (isResolving) return;
    if (selectedIndex === null) {
      selectedIndex = i; render(); return;
    }
    if (selectedIndex === i) {
      selectedIndex = null; render(); return;
    }
    if (!isAdjacent(selectedIndex, i)) {
      selectedIndex = i; render(); return;
    }
    onSwap(selectedIndex, i);
    selectedIndex = null;
  }

  // === SWIPE LOGIC ===
  function handleSwipe(i, dir) {
    let target = null;
    if (dir === "left" && i % WIDTH > 0) target = i - 1;
    if (dir === "right" && i % WIDTH < WIDTH - 1) target = i + 1;
    if (dir === "up" && i >= WIDTH) target = i - WIDTH;
    if (dir === "down" && i < SIZE - WIDTH) target = i + WIDTH;
    if (target !== null) onSwap(i, target);
  }

  // === SWAP CORE ===
  function onSwap(a, b) {
    swapTiles(a, b);
    render();
    const matches = findMatches();
    if (matches.length) resolveMatches(matches);
    else setTimeout(() => { swapTiles(a, b); render(); }, 250);
  }

  function isAdjacent(a, b) {
    const r1 = Math.floor(a / WIDTH), c1 = a % WIDTH;
    const r2 = Math.floor(b / WIDTH), c2 = b % WIDTH;
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  function swapTiles(a, b) {
    [board[a], board[b]] = [board[b], board[a]];
  }

  // === MATCH DETECTION ===
  function findMatches() {
    const set = new Set();
    // horizontal
    for (let r = 0; r < HEIGHT; r++) {
      for (let c = 0; c < WIDTH - 2; c++) {
        const i = r * WIDTH + c;
        if (
          board[i] && board[i + 1] && board[i + 2] &&
          board[i].src === board[i + 1].src &&
          board[i].src === board[i + 2].src
        ) {
          set.add(i); set.add(i + 1); set.add(i + 2);
        }
      }
    }
    // vertical
    for (let c = 0; c < WIDTH; c++) {
      for (let r = 0; r < HEIGHT - 2; r++) {
        const i = r * WIDTH + c;
        if (
          board[i] && board[i + WIDTH] && board[i + 2 * WIDTH] &&
          board[i].src === board[i + WIDTH].src &&
          board[i].src === board[i + 2 * WIDTH].src
        ) {
          set.add(i); set.add(i + WIDTH); set.add(i + 2 * WIDTH);
        }
      }
    }
    return Array.from(set);
  }

  // === RESOLVE MATCHES ===
  function resolveMatches(matches) {
    if (!matches.length) return;
    isResolving = true;
    matches.forEach((i) => (board[i] = null));

    score += matches.length * 10 * combo;
    const coinGain = Math.floor(matches.length / 3) * 5;
    if (coinGain > 0) {
      StorageAPI.addCoins(coinGain);
      showCoinPopup("+" + coinGain + " 💰");
    }

    render();

    setTimeout(() => {
      for (let c = 0; c < WIDTH; c++) {
        const stack = [];
        for (let r = HEIGHT - 1; r >= 0; r--) {
          const idx = r * WIDTH + c;
          if (board[idx]) stack.push(board[idx]);
        }
        while (stack.length < HEIGHT) stack.push(makeTile());
        for (let r = HEIGHT - 1, i = 0; r >= 0; r--, i++) {
          board[r * WIDTH + c] = stack[i];
        }
      }

      render();
      const next = findMatches();
      if (next.length) setTimeout(() => resolveMatches(next), 200);
      else {
        combo = 1;
        isResolving = false;
      }
    }, 300);
  }

  // === COIN POPUP ===
  function showCoinPopup(text) {
    const el = document.createElement("div");
    el.className = "coin-popup";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // === RESTART / SHUFFLE ===
  function restartGame() { initBoard(); }
  function shuffleBoard() {
    const srcs = board.map(t => t ? t.src : randCandy());
    for (let i = srcs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [srcs[i], srcs[j]] = [srcs[j], srcs[i]];
    }
    for (let i = 0; i < SIZE; i++) if (board[i]) board[i].src = srcs[i];
    render();
  }

  // === SHOP BUY ===
  window.buyFromShop = function (item) {
    const prices = { bomb: 200, shuffle: 100, moves: 80, rainbow: 350 };
    const price = prices[item] || 0;
    if (StorageAPI.getCoins() < price) return alert("कॉइन्स कम हैं!");
    StorageAPI.addCoins(-price);
    if (item === "shuffle") shuffleBoard();
    if (item === "moves") showCoinPopup("+10 Moves ✨");
    render();
  };

  // === PUBLIC FUNCTIONS ===
  window.initGame = function () {
    initBoard();
    score = 0;
    render();
    console.log("✅ Game started (tap + swipe working)");
  };
  window.restartGame = restartGame;
  window.shuffleBoard = shuffleBoard;

  console.log("🎮 game.js loaded successfully — swipe enabled, no random bug");
})();

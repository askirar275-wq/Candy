// js/game.js — Final Update (with sound + screen fix + swipe logic)

window.Game = (function () {
  const C = {
    candyCount: 6,
    matchMin: 3,
    baseScore: 100,
    rows: 7,
    cols: 7,
  };

  let grid = [];
  let score = 0, moves = 30, target = 600, level = 1;
  let inAction = false;

  const gridEl = () => document.getElementById("gameGrid");
  const scoreEl = () => document.getElementById("score");
  const movesEl = () => document.getElementById("moves");
  const targetEl = () => document.getElementById("target");
  const levelTitleEl = () => document.getElementById("levelTitle");

  /* ✅ Responsive grid setup */
  (function setupResponsiveGrid() {
    const grid = document.getElementById("gameGrid");
    if (!grid) return;

    function computeVars() {
      const minCell = 48, maxCell = 72, gap = 12;
      const parent = grid.parentElement || document.body;
      const avail = Math.min(parent.clientWidth, window.innerWidth - 32);
      let cols = 6, size = 64;
      for (let c = 8; c >= 5; c--) {
        const w = c * maxCell + (c - 1) * gap;
        if (w <= avail) {
          cols = c;
          size = Math.min(maxCell, Math.floor((avail - (c - 1) * gap) / c));
          break;
        }
      }
      document.documentElement.style.setProperty("--cols", cols);
      document.documentElement.style.setProperty("--cell-size", size + "px");
      document.documentElement.style.setProperty("--gap", gap + "px");
      C.cols = cols;
    }
    computeVars();
    window.addEventListener("resize", () => {
      clearTimeout(window._t);
      window._t = setTimeout(computeVars, 150);
    });
  })();

  /* ✅ Utility */
  const idx = (r, c) => r * C.cols + c;
  const rc = (i) => [Math.floor(i / C.cols), i % C.cols];
  const rand = (n) => Math.floor(Math.random() * n) + 1;

  function buildGrid() {
    grid = Array(C.rows * C.cols)
      .fill(0)
      .map(() => rand(C.candyCount));
    clearMatches();
  }

  function renderGrid() {
    const g = gridEl();
    g.innerHTML = "";
    g.style.gridTemplateColumns = `repeat(${C.cols}, var(--cell-size))`;
    grid.forEach((v, i) => {
      const d = document.createElement("div");
      d.className = "cell";
      d.dataset.i = i;
      const img = document.createElement("img");
      img.src = `images/candy${v}.png`;
      d.appendChild(img);
      g.appendChild(d);
    });
    attachSwipe();
  }

  /* ✅ Match logic */
  function findMatches() {
    const matched = new Set();

    // horizontal
    for (let r = 0; r < C.rows; r++) {
      let run = 1;
      for (let c = 1; c < C.cols; c++) {
        if (grid[idx(r, c)] === grid[idx(r, c - 1)]) run++;
        else {
          if (run >= C.matchMin)
            for (let k = 0; k < run; k++) matched.add(idx(r, c - 1 - k));
          run = 1;
        }
      }
      if (run >= C.matchMin)
        for (let k = 0; k < run; k++) matched.add(idx(r, C.cols - 1 - k));
    }

    // vertical
    for (let c = 0; c < C.cols; c++) {
      let run = 1;
      for (let r = 1; r < C.rows; r++) {
        if (grid[idx(r, c)] === grid[idx(r - 1, c)]) run++;
        else {
          if (run >= C.matchMin)
            for (let k = 0; k < run; k++) matched.add(idx(r - 1 - k, c));
          run = 1;
        }
      }
      if (run >= C.matchMin)
        for (let k = 0; k < run; k++) matched.add(idx(C.rows - 1 - k, c));
    }

    return [...matched];
  }

  function collapse() {
    for (let c = 0; c < C.cols; c++) {
      let col = [];
      for (let r = C.rows - 1; r >= 0; r--) {
        const v = grid[idx(r, c)];
        if (v > 0) col.push(v);
      }
      for (let r = C.rows - 1; r >= 0; r--) {
        grid[idx(r, c)] = col.shift() || rand(C.candyCount);
      }
    }
  }

  function clearMatches() {
    while (true) {
      const m = findMatches();
      if (!m.length) break;
      m.forEach((i) => (grid[i] = 0));
      collapse();
    }
  }

  /* ✅ Swipe logic */
  function attachSwipe() {
    const g = gridEl();
    let start = null;

    g.querySelectorAll(".cell").forEach((cell) => {
      cell.addEventListener("pointerdown", (e) => {
        start = parseInt(e.currentTarget.dataset.i);
        cell.setPointerCapture(e.pointerId);
      });
      cell.addEventListener("pointerup", (e) => {
        if (start === null) return;
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest(".cell");
        if (!target) return;
        const end = parseInt(target.dataset.i);
        trySwap(start, end);
        start = null;
      });
    });
  }

  async function trySwap(a, b) {
    if (inAction || a === b) return;
    const [ar, ac] = rc(a),
      [br, bc] = rc(b);
    if (Math.abs(ar - br) + Math.abs(ac - bc) !== 1) return;
    inAction = true;

    // swap tiles
    [grid[a], grid[b]] = [grid[b], grid[a]];
    Sound.play("swap");
    renderGrid();
    await delay(120);

    const matches = findMatches();
    if (!matches.length) {
      // invalid swap, revert
      [grid[a], grid[b]] = [grid[b], grid[a]];
      renderGrid();
      Sound.play("lose");
      await delay(200);
      inAction = false;
      return;
    }

    moves--;
    Sound.play("pop");

    while (true) {
      const m = findMatches();
      if (!m.length) break;
      score += m.length * C.baseScore;
      m.forEach((i) => (grid[i] = 0));
      renderGrid();
      await delay(200);
      collapse();
      renderGrid();
      await delay(200);
    }

    updateHUD();
    checkEnd();
    inAction = false;
  }

  /* ✅ HUD / End conditions */
  function updateHUD() {
    scoreEl().textContent = score;
    movesEl().textContent = moves;
    targetEl().textContent = target;
  }

  function checkEnd() {
    if (score >= target) {
      Sound.play("win");
      showEnd(true);
    } else if (moves <= 0) {
      Sound.play("lose");
      showEnd(false);
    }
  }

  function showEnd(win) {
    const p = document.getElementById("endPanel");
    const t = document.getElementById("endTitle");
    const i = document.getElementById("endInfo");
    t.textContent = win ? `Level ${level} Complete!` : "Game Over";
    i.textContent = `Score: ${score}`;
    p.classList.remove("hidden");
  }

  /* ✅ Helpers */
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ✅ Buttons */
  function setupButtons() {
    document.getElementById("restartBtn").onclick = () => start(level);
    document.getElementById("shuffleBtn").onclick = () => {
      grid.sort(() => Math.random() - 0.5);
      renderGrid();
    };
    document.getElementById("endBtn").onclick = () => showEnd(false);
    document.getElementById("replayBtn").onclick = () => start(level);
    document.getElementById("nextBtn").onclick = () => start(level + 1);
  }

  /* ✅ Start game */
  function start(lvl = 1) {
    level = lvl;
    score = 0;
    moves = 30;
    target = 600 * lvl;
    buildGrid();
    renderGrid();
    updateHUD();
    document.getElementById("endPanel").classList.add("hidden");
    levelTitleEl().textContent = `Level ${lvl}`;
  }

  /* ✅ Public methods */
  window.addEventListener("load", () => {
    Sound.load("swap", "sounds/swap.mp3");
    Sound.load("pop", "sounds/pop.mp3");
    Sound.load("win", "sounds/win.mp3");
    Sound.load("lose", "sounds/lose.mp3");
    Sound.load("bg", "sounds/bg.mp3");
    setupButtons();
    start(1);
  });

  return { start };
})();

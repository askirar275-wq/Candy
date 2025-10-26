const Game = (() => {
  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  const levelEl = document.getElementById("level-num");

  const rows = 8, cols = 8;
  const candyImgs = [
    "images/candy1.png",
    "images/candy2.png",
    "images/candy3.png",
    "images/candy4.png",
    "images/candy5.png",
    "images/candy6.png"
  ];

  let grid = [];
  let score = 0, coins = 0, level = 1;
  let first = null, second = null, locked = false;

  function randomCandy() {
    return Math.floor(Math.random() * candyImgs.length);
  }

  function makeGrid() {
    grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c] = randomCandy();
      }
    }
  }

  function drawGrid() {
    boardEl.innerHTML = "";
    grid.forEach((row, r) => {
      row.forEach((val, c) => {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.row = r;
        tile.dataset.col = c;
        const img = document.createElement("img");
        img.src = candyImgs[val];
        tile.appendChild(img);
        boardEl.appendChild(tile);
      });
    });
  }

  function swap(r1, c1, r2, c2) {
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
  }

  function checkMatches() {
    const toRemove = [];
    // Rows
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 2; c++) {
        const v = grid[r][c];
        if (v === grid[r][c + 1] && v === grid[r][c + 2]) {
          toRemove.push([r, c], [r, c + 1], [r, c + 2]);
        }
      }
    }
    // Columns
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows - 2; r++) {
        const v = grid[r][c];
        if (v === grid[r + 1][c] && v === grid[r + 2][c]) {
          toRemove.push([r, c], [r + 1, c], [r + 2, c]);
        }
      }
    }
    return toRemove;
  }

  function removeMatches(matches) {
    matches.forEach(([r, c]) => (grid[r][c] = null));
    score += matches.length * 10;
    scoreEl.textContent = score;
  }

  function gravity() {
    for (let c = 0; c < cols; c++) {
      let pointer = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (grid[r][c] !== null) {
          grid[pointer][c] = grid[r][c];
          pointer--;
        }
      }
      for (let r = pointer; r >= 0; r--) {
        grid[r][c] = randomCandy();
      }
    }
  }

  function handleTileClick(e) {
    if (locked) return;
    const tile = e.target.closest(".tile");
    if (!tile) return;
    const r = +tile.dataset.row;
    const c = +tile.dataset.col;

    if (!first) {
      first = { r, c };
      tile.classList.add("selected");
    } else {
      second = { r, c };
      document.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
      swap(first.r, first.c, second.r, second.c);
      drawGrid();
      const matches = checkMatches();
      if (matches.length) {
        removeMatches(matches);
        gravity();
        drawGrid();
      } else {
        swap(first.r, first.c, second.r, second.c);
        drawGrid();
      }
      first = second = null;
    }
  }

  function startLevel(lvl = 1) {
    level = lvl;
    score = 0;
    scoreEl.textContent = "0";
    levelEl.textContent = level;
    makeGrid();
    drawGrid();
    boardEl.addEventListener("click", handleTileClick);
  }

  document.getElementById("btn-restart").addEventListener("click", () => startLevel(level));
  document.getElementById("btn-shuffle").addEventListener("click", () => { makeGrid(); drawGrid(); });

  return { startLevel };
})();

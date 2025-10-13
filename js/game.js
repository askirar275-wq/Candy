// game.js — core candy match game engine
console.log("Loaded: js/game.js ✅");

(function () {
  const boardSize = 8;
  const tileTypes = ["candy1.png", "candy2.png", "candy3.png", "candy4.png", "candy5.png", "candy6.png"];
  const board = [];
  let score = 0;
  let coins = 0;
  let level = 1;
  let selectedTile = null;

  const boardEl = document.getElementById("game-board");
  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  const levelEl = document.getElementById("currentLevel");
  const levelUpModal = document.getElementById("levelUpModal");
  const levelUpClose = document.getElementById("levelUpClose");

  // ---------- Core setup ----------
  window.initGame = function () {
    console.log("🎮 initGame()");
    score = 0;
    coins = StorageAPI.getCoins();
    level = StorageAPI.getLevel();
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    levelEl.textContent = level;
    generateBoard();
  };

  function generateBoard() {
    boardEl.innerHTML = "";
    board.length = 0;
    for (let r = 0; r < boardSize; r++) {
      const row = [];
      for (let c = 0; c < boardSize; c++) {
        const candy = createTile(r, c);
        boardEl.appendChild(candy.el);
        row.push(candy);
      }
      board.push(row);
    }
  }

  function createTile(r, c) {
    const el = document.createElement("div");
    el.className = "cell";
    const img = document.createElement("img");
    img.className = "tile";
    const type = tileTypes[Math.floor(Math.random() * tileTypes.length)];
    img.src = "images/" + type;
    el.appendChild(img);

    el.dataset.row = r;
    el.dataset.col = c;

    el.addEventListener("click", onTileClick);
    return { r, c, type, el };
  }

  // ---------- Input handling ----------
  function onTileClick(e) {
    const el = e.currentTarget;
    const r = Number(el.dataset.row);
    const c = Number(el.dataset.col);

    if (!selectedTile) {
      selectedTile = { r, c };
      el.classList.add("selected-cell");
    } else {
      const sr = selectedTile.r;
      const sc = selectedTile.c;
      const sameTile = sr === r && sc === c;
      const adjacent = Math.abs(sr - r) + Math.abs(sc - c) === 1;

      document
        .querySelector(`[data-row='${sr}'][data-col='${sc}']`)
        .classList.remove("selected-cell");
      selectedTile = null;

      if (!sameTile && adjacent) {
        swapTiles(sr, sc, r, c);
        checkMatches();
      }
    }
  }

  function swapTiles(r1, c1, r2, c2) {
    const tileA = board[r1][c1];
    const tileB = board[r2][c2];

    const tempType = tileA.type;
    tileA.type = tileB.type;
    tileB.type = tempType;

    tileA.el.querySelector("img").src = "images/" + tileA.type;
    tileB.el.querySelector("img").src = "images/" + tileB.type;
  }

  // ---------- Matching logic ----------
  function checkMatches() {
    const matched = [];

    // Horizontal
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize - 2; c++) {
        const t1 = board[r][c].type;
        const t2 = board[r][c + 1].type

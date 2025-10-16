(function() {
  const $ = (id) => document.getElementById(id);
  const candies = [
    "images/candy1.png",
    "images/candy2.png",
    "images/candy3.png",
    "images/candy4.png",
    "images/candy5.png",
    "images/candy6.png",
  ];

  let state = { level: 1, goal: 500, moves: 25, score: 0, board: [], size: 7 };

  function randCandy() {
    return Math.floor(Math.random() * candies.length);
  }

  function getLevelData(lvl) {
    return LevelData.find((x) => x.id === lvl) || LevelData[0];
  }

  function initBoard() {
    state.board = Array.from({ length: state.size }, () =>
      Array(state.size).fill(0).map(randCandy)
    );
  }

  function renderBoard() {
    const b = $("game-board");
    b.innerHTML = "";
    b.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        const div = document.createElement("div");
        div.className = "cell";
        div.dataset.r = r;
        div.dataset.c = c;
        const img = document.createElement("img");
        img.src = candies[state.board[r][c]];
        div.appendChild(img);
        div.onclick = () => handleClick(r, c);
        b.appendChild(div);
      }
    }
  }

  let selected = null;
  function handleClick(r, c) {
    if (!selected) {
      selected = { r, c };
      highlight(r, c, true);
    } else {
      const dx = Math.abs(selected.r - r);
      const dy = Math.abs(selected.c - c);
      if (dx + dy === 1) {
        swap(selected, { r, c });
        checkMatches();
        state.moves--;
        $("movesLeft").textContent = state.moves;
      }
      highlight(selected.r, selected.c, false);
      selected = null;
    }
  }

  function highlight(r, c, on) {
    const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) cell.style.outline = on ? "3px solid #ff8ab0" : "none";
  }

  function swap(a, b) {
    const tmp = state.board[a.r][a.c];
    state.board[a.r][a.c] = state.board[b.r][b.c];
    state.board[b.r][b.c] = tmp;
    renderBoard();
  }

  function checkMatches() {
    let match = false;
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size - 2; c++) {
        if (
          state.board[r][c] === state.board[r][c + 1] &&
          state.board[r][c] === state.board[r][c + 2]
        ) {
          match = true;
          state.board[r][c] = randCandy();
          state.board[r][c + 1] = randCandy();
          state.board[r][c + 2] = randCandy();
          state.score += 50;
        }
      }
    }
    $("score").textContent = state.score;
    if (state.score >= state.goal) {
      StorageAPI.addCoins(getLevelData(state.level).reward);
      showLevelUpModal(state.level, getLevelData(state.level).reward);
    }
    if (match) renderBoard();
  }

  window.startLevel = function(lvl) {
    const data = getLevelData(lvl);
    state = {
      ...data,
      score: 0,
      level: lvl,
      size: 7,
      board: [],
    };
    initBoard();
    renderBoard();
    $("score").textContent = 0;
    $("levelNum").textContent = lvl;
    $("movesLeft").textContent = data.moves;
    $("coins").textContent = StorageAPI.getCoins();
  };

  $("btnRestart").onclick = () => startLevel(state.level);
  $("btnShuffle").onclick = () => {
    initBoard();
    renderBoard();
  };

  console.log("Loaded: game.js");
})();

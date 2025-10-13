/* ---------- Candy Match Game Core ---------- */
(function() {
  const boardSize = 8;
  const candyTypes = [
    "images/candy1.png",
    "images/candy2.png",
    "images/candy3.png",
    "images/candy4.png",
    "images/candy5.png",
    "images/candy6.png"
  ];

  let board = [];
  let score = 0;
  let coins = 0;
  let level = 1;
  let firstCandy = null;
  let isAnimating = false;

  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  const levelEl = document.getElementById("currentLevel");
  const boardEl = document.getElementById("game-board");

  /* ========== GAME INIT ========== */
  window.initGame = function() {
    console.log("Game initialized");
    score = 0;
    firstCandy = null;
    isAnimating = false;
    createBoard();
    updateUI();
  };

  /* ========== CREATE BOARD ========== */
  function createBoard() {
    board = [];
    boardEl.innerHTML = "";
    for (let r = 0; r < boardSize; r++) {
      const row = [];
      for (let c = 0; c < boardSize; c++) {
        const candy = document.createElement("img");
        candy.src = getRandomCandy();
        candy.className = "candy";
        candy.dataset.row = r;
        candy.dataset.col = c;
        candy.draggable = true;

        // drag events
        candy.addEventListener("dragstart", dragStart);
        candy.addEventListener("dragover", dragOver);
        candy.addEventListener("drop", dragDrop);
        candy.addEventListener("dragend", dragEnd);

        boardEl.appendChild(candy);
        row.push(candy);
      }
      board.push(row);
    }
  }

  function getRandomCandy() {
    const rand = Math.floor(Math.random() * candyTypes.length);
    return candyTypes[rand];
  }

  /* ========== DRAG HANDLERS ========== */
  let fromRow, fromCol, toRow, toCol;

  function dragStart() {
    fromRow = parseInt(this.dataset.row);
    fromCol = parseInt(this.dataset.col);
  }

  function dragOver(e) {
    e.preventDefault();
  }

  function dragDrop() {
    toRow = parseInt(this.dataset.row);
    toCol = parseInt(this.dataset.col);
  }

  function dragEnd() {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
      swapCandy();
      setTimeout(() => {
        if (!checkMatches()) {
          swapCandy(); // revert if no match
        }
      }, 200);
    }
  }

  function swapCandy() {
    const temp = board[fromRow][fromCol].src;
    board[fromRow][fromCol].src = board[toRow][toCol].src;
    board[toRow][toCol].src = temp;
  }

  /* ========== CHECK MATCHES ========== */
  function checkMatches() {
    let matchFound = false;

    // Horizontal matches
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize - 2; c++) {
        const candy1 = board[r][c];
        const candy2 = board[r][c + 1];
        const candy3 = board[r][c + 2];
        if (
          candy1.src === candy2.src &&
          candy2.src === candy3.src &&
          candy1.src.includes("images")
        ) {
          candy1.src = "";
          candy2.src = "";
          candy3.src = "";
          score += 30;
          coins += 5;
          matchFound = true;
        }
      }
    }

    // Vertical matches
    for (let c = 0; c < boardSize; c++) {
      for (let r = 0; r < boardSize - 2; r++) {
        const candy1 = board[r][c];
        const candy2 = board[r + 1][c];
        const candy3 = board[r + 2][c];
        if (
          candy1.src === candy2.src &&
          candy2.src === candy3.src &&
          candy1.src.includes("images")
        ) {
          candy1.src = "";
          candy2.src = "";
          candy3.src = "";
          score += 30;
          coins += 5;
          matchFound = true;
        }
      }
    }

    if (matchFound) {
      setTimeout(dropCandies, 250);
      updateUI();
    }
    return matchFound;
  }

  /* ========== DROP CANDIES ========== */
  function dropCandies() {
    for (let c = 0; c < boardSize; c++) {
      for (let r = boardSize - 1; r >= 0; r--) {
        if (board[r][c].src === "" || board[r][c].src.includes("undefined")) {
          for (let above = r - 1; above >= 0; above--) {
            if (board[above][c].src !== "") {
              board[r][c].src = board[above][c].src;
              board[above][c].src = "";
              break;
            }
          }
        }
      }
      // fill top empty spots
      for (let r = 0; r < boardSize; r++) {
        if (board[r][c].src === "" || board[r][c].src.includes("undefined")) {
          board[r][c].src = getRandomCandy();
        }
      }
    }
    setTimeout(checkMatches, 300);
  }

  /* ========== UI UPDATE ========== */
  function updateUI() {
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    levelEl.textContent = level;
  }

  /* ========== RESTART / SHUFFLE ========== */
  window.restartGame = function() {
    console.log("Game restarted");
    initGame();
  };

  window.shuffleBoard = function() {
    console.log("Board shuffled");
    const candies = board.flat();
    candies.sort(() => Math.random() - 0.5);
    for (let i = 0; i < candies.length; i++) {
      candies[i].src = getRandomCandy();
    }
    checkMatches();
  };

})();

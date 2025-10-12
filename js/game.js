// js/game.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Game loaded");

  const board = document.getElementById("game-board");
  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  const levelEl = document.getElementById("currentLevel");

  const boardSize = 8;
  const candies = ["candy1.png","candy2.png","candy3.png","candy4.png","candy5.png","candy6.png"];
  let selected = null;
  let score = 0;

  function createBoard() {
    board.innerHTML = "";
    board.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;
    for (let i = 0; i < boardSize * boardSize; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const img = document.createElement("img");
      img.src = "images/" + candies[Math.floor(Math.random() * candies.length)];
      img.draggable = false;
      img.dataset.index = i;
      img.addEventListener("click", () => selectCandy(img));
      cell.appendChild(img);
      board.appendChild(cell);
    }
  }

  function selectCandy(img) {
    if (!selected) {
      selected = img;
      img.style.transform = "scale(1.2)";
    } else {
      swapCandies(selected, img);
      selected.style.transform = "";
      selected = null;
    }
  }

  function swapCandies(a, b) {
    const temp = a.src;
    a.src = b.src;
    b.src = temp;
    score += 10;
    scoreEl.textContent = score;
  }

  document.getElementById("restartBtn").addEventListener("click", () => {
    score = 0;
    scoreEl.textContent = score;
    createBoard();
    console.log("Game restarted");
  });

  document.getElementById("shuffleBtn").addEventListener("click", () => {
    const imgs = board.querySelectorAll("img");
    imgs.forEach(img => {
      img.src = "images/" + candies[Math.floor(Math.random() * candies.length)];
    });
    console.log("Board shuffled");
  });

  document.getElementById("homeBtn").addEventListener("click", () => {
    window.location.href = "level-map.html";
  });

  coinsEl.textContent = StorageAPI.getCoins();
  levelEl.textContent = StorageAPI.getLevel();
  createBoard();
});

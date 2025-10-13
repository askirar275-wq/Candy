let board = [];
let size = 7;
let score = 0;
let currentLevel = 1;
const candies = ["candy1.png", "candy2.png", "candy3.png", "candy4.png", "candy5.png", "candy6.png"];

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");

function initGame(level = 1) {
  score = 0;
  scoreEl.textContent = score;
  levelEl.textContent = level;
  board = [];

  for (let r = 0; r < size; r++) {
    board[r] = [];
    for (let c = 0; c < size; c++) {
      board[r][c] = randomCandy();
    }
  }

  renderBoard();
}

function randomCandy() {
  return "images/" + candies[Math.floor(Math.random() * candies.length)];
}

function renderBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;

      const img = document.createElement("img");
      img.src = board[r][c];
      cell.appendChild(img);

      cell.addEventListener("click", () => handleSelect(r, c));
      boardEl.appendChild(cell);
    }
  }
}

let selected = null;

function handleSelect(r, c) {
  const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (!selected) {
    selected = { r, c };
    cell.classList.add("active");
  } else {
    swap(selected, { r, c });
    selected = null;
    document.querySelectorAll(".cell").forEach(e => e.classList.remove("active"));
  }
}

function swap(a, b) {
  const temp = board[a.r][a.c];
  board[a.r][a.c] = board[b.r][b.c];
  board[b.r][b.c] = temp;
  renderBoard();
  checkMatches();
}

function checkMatches() {
  let matched = [];

  // Horizontal
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 2; c++) {
      if (board[r][c] && board[r][c] === board[r][c + 1] && board[r][c] === board[r][c + 2]) {
        matched.push([r, c], [r, c + 1], [r, c + 2]);
      }
    }
  }

  // Vertical
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size - 2; r++) {
      if (board[r][c] && board[r][c] === board[r + 1][c] && board[r][c] === board[r + 2][c]) {
        matched.push([r, c], [r + 1, c], [r + 2, c]);
      }
    }
  }

  if (matched.length > 0) removeMatched(matched);
}

function removeMatched(matched) {
  matched.forEach(([r, c]) => (board[r][c] = null));
  score += matched.length * 10;
  scoreEl.textContent = score;
  applyGravity();
  setTimeout(checkMatches, 100);
}

function applyGravity() {
  for (let c = 0; c < size; c++) {
    let empty = [];
    for (let r = size - 1; r >= 0; r--) {
      if (!board[r][c]) empty.push(r);
      else if (empty.length) {
        let newRow = empty.shift();
        board[newRow][c] = board[r][c];
        board[r][c] = null;
        empty.push(r);
      }
    }
    for (let r = 0; r < size; r++) if (!board[r][c]) board[r][c] = randomCandy();
  }
  renderBoard();
}

function shuffleBoard() {
  board = board.flat().sort(() => Math.random() - 0.5).reduce((acc, cur, i) => {
    const r = Math.floor(i / size);
    if (!acc[r]) acc[r] = [];
    acc[r].push(cur);
    return acc;
  }, []);
  renderBoard();
          }

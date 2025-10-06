const board = document.getElementById("game-board");
const scoreDisplay = document.getElementById("score");
let score = 0;
let candies = [];

function startGame() {
  board.innerHTML = "";
  score = 0;
  scoreDisplay.textContent = score;

  for (let i = 0; i < 64; i++) {
    const candy = document.createElement("img");
    const randomCandy = Math.floor(Math.random() * 10) + 1;
    candy.src = `images/candy${randomCandy}.png`;
    candy.dataset.id = i;
    candy.addEventListener("click", selectCandy);
    board.appendChild(candy);
    candies.push(candy);
  }
}

let firstCandy = null;
function selectCandy(e) {
  const clicked = e.target;
  if (!firstCandy) {
    firstCandy = clicked;
    clicked.style.transform = "scale(1.2)";
  } else {
    swapCandies(firstCandy, clicked);
    firstCandy.style.transform = "scale(1)";
    firstCandy = null;
  }
}

function swapCandies(a, b) {
  const tempSrc = a.src;
  a.src = b.src;
  b.src = tempSrc;
  score += 10;
  scoreDisplay.textContent = score;
}

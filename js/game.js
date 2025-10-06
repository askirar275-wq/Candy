const board = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const backBtn = document.getElementById('backBtn');
const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');

const width = 8;
const candies = [];
let score = 0;

const candyImages = [
  'images/candy1.png',
  'images/candy2.png',
  'images/candy3.png',
  'images/candy4.png',
  'images/candy5.png',
  'images/candy6.png',
  'images/candy7.png',
  'images/candy8.png'
];

// बोर्ड बनाना
function createBoard() {
  for (let i = 0; i < width * width; i++) {
    const candy = document.createElement('img');
    candy.setAttribute('draggable', true);
    candy.setAttribute('src', randomCandy());
    candy.setAttribute('data-id', i);
    candy.classList.add('candy');
    board.appendChild(candy);
    candies.push(candy);
  }
}
createBoard();

function randomCandy() {
  return candyImages[Math.floor(Math.random() * candyImages.length)];
}

// ड्रैग / स्वैप हैंडलिंग
let candyDragged = null;
let candyReplaced = null;

candies.forEach(candy => {
  candy.addEventListener('dragstart', dragStart);
  candy.addEventListener('dragover', e => e.preventDefault());
  candy.addEventListener('drop', dragDrop);
  candy.addEventListener('dragend', dragEnd);
});

function dragStart() {
  candyDragged = this;
  this.classList.add('moving');
}

function dragDrop() {
  candyReplaced = this;
}

function dragEnd() {
  this.classList.remove('moving');
  if (!candyReplaced) return;

  const draggedId = parseInt(candyDragged.getAttribute('data-id'));
  const replacedId = parseInt(candyReplaced.getAttribute('data-id'));
  const validMoves = [
    draggedId - 1, draggedId + 1, draggedId - width, draggedId + width
  ];

  if (validMoves.includes(replacedId)) {
    boardSwap(draggedId, replacedId);
    checkMatches();
  }
  candyReplaced = null;
}

function boardSwap(id1, id2) {
  const temp = candies[id1].src;
  candies[id1].src = candies[id2].src;
  candies[id2].src = temp;
}

function checkMatches() {
  // सरल horizontal match चेक
  for (let i = 0; i < 61; i++) {
    const rowOfThree = [i, i + 1, i + 2];
    const decidedCandy = candies[i].src;
    const isRow = rowOfThree.every(idx => candies[idx].src === decidedCandy);

    if (isRow) {
      score += 10;
      scoreDisplay.textContent = score;
      rowOfThree.forEach(idx => {
        candies[idx].classList.add('falling');
        candies[idx].src = randomCandy();
        setTimeout(() => candies[idx].classList.remove('falling'), 500);
      });
    }
  }
}

backBtn.addEventListener('click', () => {
  gameScreen.classList.remove('active');
  homeScreen.classList.add('active');
});

// game.js — सरल Candy Match logic demo

document.addEventListener("DOMContentLoaded", () => {
  const board = document.createElement("div");
  board.id = "board";
  document.body.appendChild(board);

  const candies = ["c1.png", "c2.png", "c3.png", "c4.png", "c5.png", "c6.png"];
  const rows = 7, cols = 7;
  const grid = [];

  function createBoard() {
    board.style.display = "grid";
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.style.maxWidth = "420px";
    board.style.margin = "20px auto";
    board.style.gap = "6px";

    for (let i = 0; i < rows * cols; i++) {
      const img = document.createElement("img");
      img.src = `images/${candies[Math.floor(Math.random() * candies.length)]}`;
      img.style.width = "54px";
      img.style.height = "54px";
      img.draggable = true;
      img.dataset.index = i;

      img.addEventListener("dragstart", dragStart);
      img.addEventListener("dragover", dragOver);
      img.addEventListener("drop", drop);

      board.appendChild(img);
      grid.push(img);
    }
  }

  let draggedCandy = null;

  function dragStart(e) {
    draggedCandy = this;
  }

  function dragOver(e) {
    e.preventDefault();
  }

  function drop(e) {
    const target = this;
    const temp = draggedCandy.src;
    draggedCandy.src = target.src;
    target.src = temp;
  }

  window.initGame = function () {
    document.body.innerHTML = "";
    document.body.style.background = "#fff0f6";
    document.title = "Candy Match - Game";
    createBoard();
    console.log("Game started!");
  };
});

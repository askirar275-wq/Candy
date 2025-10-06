function fitTiles(){
  // compute tile size to fit available width inside .board
  const cols = COLS || 8;
  const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 8;
  const boardEl = document.querySelector('.board') || document.querySelector('.board-area') || document.body;
  const wrap = boardEl.getBoundingClientRect();
  const availW = Math.min(wrap.width - 24, window.innerWidth - 40); // margins
  const candidate = Math.floor((availW - gap * (cols - 1)) / cols);
  const size = Math.max(36, Math.min(candidate, 84)); // clamp tile size
  document.documentElement.style.setProperty('--tile', size + 'px');
}
// ✅ Safe fix: create basic initGame function
function initGame() {
  console.log("initGame() called — setting up game board...");
  
  const board = document.getElementById("game-board");
  if (!board) {
    console.error("Game board not found!");
    return;
  }

  // Clear old tiles
  board.innerHTML = "";

  // Create simple 8x8 grid of candies
  const candies = ["candy1.png", "candy2.png", "candy3.png", "candy4.png", "candy5.png"];
  const size = 8;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const img = document.createElement("img");
      img.src = "images/" + candies[Math.floor(Math.random() * candies.length)];
      img.className = "tile";
      img.style.width = "40px";
      img.style.height = "40px";
      board.appendChild(img);
    }
  }

  console.log("✅ Game board created successfully.");
}

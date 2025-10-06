/* ====== safety defaults ====== */
// अगर COLS कहीं और defined नहीं तो default 8
window.COLS = window.COLS || 8;
window.ROWS = window.ROWS || 8;

/* ====== fitTiles (safer) ====== */
function fitTiles(){
  const cols = window.COLS || 8;
  const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 8;
  const boardEl = document.querySelector('#game-board') || document.querySelector('.board') || document.querySelector('.board-area') || document.body;
  if (!boardEl) return;
  const wrap = boardEl.getBoundingClientRect();
  const availW = Math.min(wrap.width - 24, window.innerWidth - 40);
  const candidate = Math.floor((availW - gap * (cols - 1)) / cols);
  const size = Math.max(36, Math.min(candidate, 84));
  document.documentElement.style.setProperty('--tile', size + 'px');
}

/* ====== existing initGame (yours) ====== */
function initGame() {
  console.log("initGame() called — setting up game board...");
  const board = document.getElementById("game-board");
  if (!board) {
    console.error("Game board not found!");
    return;
  }
  board.innerHTML = "";

  const candies = ["candy1.png","candy2.png","candy3.png","candy4.png","candy5.png","candy6.png","candy7.png","candy8.png"];
  const size = window.COLS || 8;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const img = document.createElement("img");
      img.src = "images/" + candies[Math.floor(Math.random() * candies.length)];
      img.className = "tile";
      // sizing will be controlled by CSS variable --tile; keep fallback
      img.style.width = "var(--tile)";
      img.style.height = "var(--tile)";
      board.appendChild(img);
    }
  }
  fitTiles();
  console.log("✅ Game board created successfully.");
}

/* ====== startGame wrapper (required because HTML calls startGame()) ====== */
function startGame(){
  // hide home, show game
  const home = document.getElementById('home-screen') || document.getElementById('homeScreen') || document.querySelector('.home');
  const game = document.getElementById('game-screen') || document.getElementById('gameScreen') || document.querySelector('.game');
  if(home) home.classList.remove('active'), home.style.display = 'none';
  if(game) game.classList.add('active'), game.style.display = 'block';

  // init and focus
  initGame();

  // optional: ensure tiles fit on resize
  setTimeout(()=> fitTiles(), 80);
}

/* ====== expose to global so HTML inline onclick works ====== */
window.initGame = initGame;
window.startGame = startGame;
window.fitTiles = fitTiles;

/* ====== auto-bind Start button if not inline onclick ====== */
document.addEventListener('DOMContentLoaded', ()=> {
  const btn = document.getElementById('startBtn') || document.querySelector('[data-start]');
  if(btn && !btn._boundStart){
    btn.addEventListener('click', startGame);
    btn._boundStart = true;
  }
  // call fitTiles on load/resize
  fitTiles();
  window.addEventListener('resize', ()=> { clearTimeout(window._fitTO); window._fitTO = setTimeout(fitTiles, 120); });
});

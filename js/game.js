/* js/game.js
   Minimal safe game logic for Candy Match.
   - Contains initGame(), restartGame(), shuffleBoard(), buyFromShop()
   - Uses simple grid of images from /images/candy*.png
   - Null-safe (DOM element checks) so addEventListener errors नहीं आएँगे.
*/

(function(){
  'use strict';

  // config
  const ROWS = 7;
  const COLS = 7;
  const TILE_TYPES = 9; // candy1..candy9.png
  const IMAGE_PATH = 'images/'; // your images folder

  // state
  let board = []; // 2D array of numbers
  let score = 0;

  // helpers
  function $id(id){ return document.getElementById(id); }
  function safeQuery(id){ const el = $id(id); if(!el) console.warn('missing element', id); return el; }

  function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

  function makeEmptyBoard(){
    board = [];
    for(let r=0;r<ROWS;r++){
      const row = [];
      for(let c=0;c<COLS;c++) row.push(0);
      board.push(row);
    }
  }

  // Fill board with random candies (simple)
  function fillBoardRandom(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        board[r][c] = randInt(1, TILE_TYPES);
      }
    }
  }

  // Render board into #game-board
  function renderBoard(){
    const container = $id('game-board');
    if(!container){
      console.warn('renderBoard: #game-board not found');
      return;
    }
    container.innerHTML = ''; // clear
    container.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const tileVal = board[r][c];
        const cell = document.createElement('div');
        cell.className = 'cell';
        // image
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.alt = 'candy';
        // clamp tileVal and create path
        const idx = Math.max(1, Math.min(TILE_TYPES, tileVal));
        img.src = `${IMAGE_PATH}candy${idx}.png`;
        img.style.width = '80%';
        img.style.height = 'auto';
        // attach to cell
        cell.appendChild(img);
        container.appendChild(cell);
      }
    }
  }

  // update score & coins in UI
  function updateScoreUI(){
    const s = $id('score');
    if(s) s.textContent = score;
  }

  // public functions (exposed)
  function initGame(){
    try {
      makeEmptyBoard();
      fillBoardRandom();
      score = 0;
      renderBoard();
      updateScoreUI();
      // ensure coin display exists (safe)
      if(typeof updateCoinDisplay === 'function') updateCoinDisplay(getCoins ? getCoins() : 0);
      console.log('Game initialized');
    } catch(err){
      console.error('initGame error', err);
      throw err; // rethrow so caller sees it
    }
  }

  function restartGame(){
    try {
      initGame();
      console.log('Game restarted');
    } catch(e) {
      console.warn('restartGame failed', e);
    }
  }

  function shuffleBoard(){
    // simple random shuffle
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const r2 = randInt(0, ROWS-1);
        const c2 = randInt(0, COLS-1);
        const tmp = board[r][c];
        board[r][c] = board[r2][c2];
        board[r2][c2] = tmp;
      }
    }
    renderBoard();
    console.log('Board shuffled');
  }

  // buyFromShop placeholder
  function buyFromShop(item){
    try {
      console.log('Attempt buy', item);
      // sample costs
      const costs = { bomb:200, shuffle:100, moves:80, rainbow:350 };
      const cost = costs[item] || 0;
      const cur = (typeof getCoins === 'function') ? getCoins() : Number(localStorage.getItem('coins')||0);
      if(cur < cost){
        alert('Coins कम है — Buy नहीं कर सकते');
        return false;
      }
      // deduct
      const next = (typeof addCoins === 'function') ? addCoins(-cost) : (cur - cost);
      if(typeof updateCoinDisplay === 'function') updateCoinDisplay(next);
      alert('खरीद ली — ' + item);
      return true;
    } catch(e){
      console.warn('buyFromShop error', e);
      return false;
    }
  }

  // expose to global (so safe-ui can call)
  window.initGame = initGame;
  window.restartGame = restartGame;
  window.shuffleBoard = shuffleBoard;
  window.buyFromShop = buyFromShop;

  // auto-run a small check when script loads (but don't init game yet)
  console.log('Loaded: js/game.js');

})();

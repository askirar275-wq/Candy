/* js/game.js
   Simple, robust game core:
   - exposes global functions: initGame, restartGame, shuffleBoard, buyFromShop, updateCoinDisplay
   - basic grid, swipe to swap, simple match removal and refill
   - lightweight, mobile-friendly
*/

(function(){
  // config
  const ROWS = 8;
  const COLS = 8;
  const TYPES = 6; // candy1.png .. candy6.png
  const TILE_GAP = 4;

  // state
  let board = [];
  let score = 0;
  let coins = 0;
  let boardEl = null;
  let isAnimating = false;

  // helpers
  const $ = id => document.getElementById(id);
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  // create random board (numbers 1..TYPES)
  function createBoard(){
    board = new Array(ROWS);
    for(let r=0;r<ROWS;r++){
      board[r] = new Array(COLS);
      for(let c=0;c<COLS;c++){
        board[r][c] = randInt(1,TYPES);
      }
    }
  }

  // DOM helpers to build board grid
  function buildBoardDOM(){
    boardEl = $('game-board');
    if(!boardEl) {
      console.warn('game-board element not found');
      return;
    }
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    boardEl.style.gap = TILE_GAP + 'px';

    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        // tile img
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.dataset.r = r; img.dataset.c = c;
        img.src = `images/candy${board[r][c]}.png`;
        cell.appendChild(img);
        boardEl.appendChild(cell);
      }
    }

    addSwipeHandlers();
    updateScoreDisplay();
    updateCoinDisplay(coins);
  }

  // update DOM images from board array
  function refreshBoardDOM(){
    if(!boardEl) return;
    const imgs = boardEl.querySelectorAll('.tile');
    imgs.forEach(img=>{
      const r = +img.dataset.r;
      const c = +img.dataset.c;
      if(board[r] && board[r][c] !== undefined){
        img.src = `images/candy${board[r][c]}.png`;
      }
    });
  }

  // swap two cells in board array and DOM dataset positions
  function swapCells(r1,c1,r2,c2){
    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;
  }

  // simple match detection: returns array of coords to remove
  function findMatches(){
    const remove = [];
    // rows
    for(let r=0;r<ROWS;r++){
      let run = 1;
      for(let c=1;c<=COLS;c++){
        if(c<COLS && board[r][c] === board[r][c-1]) run++;
        else {
          if(run>=3){
            for(let k=0;k<run;k++) remove.push([r, c-1-k]);
          }
          run = 1;
        }
      }
    }
    // cols
    for(let c=0;c<COLS;c++){
      let run = 1;
      for(let r=1;r<=ROWS;r++){
        if(r<ROWS && board[r][c] === board[r-1][c]) run++;
        else {
          if(run>=3){
            for(let k=0;k<run;k++) remove.push([r-1-k, c]);
          }
          run = 1;
        }
      }
    }
    // unique
    const key = (a,b)=> a+'x'+b;
    const map = {};
    const uniq = [];
    remove.forEach(([r,c])=>{
      const k = key(r,c);
      if(!map[k]){ map[k]=true; uniq.push([r,c]); }
    });
    return uniq;
  }

  // remove matches: set to 0 (empty), then collapse and refill
  function removeMatchesAndRefill(){ 
    const matches = findMatches();
    if(matches.length===0) return 0;
    // remove
    matches.forEach(([r,c])=>{
      board[r][c] = 0;
    });
    // score and coins
    score += matches.length * 10;
    coins += Math.floor(matches.length/3) * 5;
    updateScoreDisplay();
    updateCoinDisplay(coins);

    // collapse per column
    for(let c=0;c<COLS;c++){
      const col = [];
      for(let r=ROWS-1;r>=0;r--){
        if(board[r][c] !== 0) col.push(board[r][c]);
      }
      for(let r=ROWS-1, i=0; r>=0; r--, i++){
        board[r][c] = (i < col.length) ? col[i] : randInt(1,TYPES);
      }
    }
    refreshBoardDOM();
    return matches.length;
  }

  // ensure there are no initial matches (basic)
  function removeInitialMatches(){
    let safety=0;
    while(true){
      const m = findMatches();
      if(m.length===0) break;
      m.forEach(([r,c])=> board[r][c] = randInt(1,TYPES));
      if(++safety>10) break;
    }
  }

  // UI updates
  function updateScoreDisplay(){
    const sEl = $('score');
    if(sEl) sEl.textContent = score;
  }
  function updateCoinDisplayLocal(val){
    coins = val!==undefined ? val : coins;
    const cEl = $('coins');
    if(cEl) cEl.textContent = coins;
    const shopC = $('shopCoins');
    if(shopC) shopC.textContent = coins;
  }

  // public buyFromShop
  function buyFromShop(item){
    // costs
    const costs = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const cost = costs[item] || 0;
    if(coins >= cost){
      coins -= cost;
      updateCoinDisplayLocal(coins);
      console.log('Bought', item);
      // simple effect: bomb clears random few
      if(item==='bomb'){
        for(let i=0;i<5;i++){
          const rr = randInt(0,ROWS-1), cc = randInt(0,COLS-1);
          board[rr][cc] = randInt(1,TYPES);
        }
        refreshBoardDOM();
      }
      if(item==='shuffle') shuffleBoard();
      return true;
    } else {
      console.warn('Not enough coins');
      return false;
    }
  }

  // shuffle
  function shuffleBoard(){
    // shuffle values randomly
    const vals = [];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) vals.push(board[r][c]);
    // Fisher-Yates
    for(let i=vals.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }
    let idx=0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) board[r][c] = vals[idx++];
    refreshBoardDOM();
    // after shuffle, remove accidental matches for better UX
    removeInitialMatches();
    console.log('Board shuffled');
  }

  // restart game
  function restartGame(){
    score = 0;
    coins = coins; // keep coins
    createBoard();
    removeInitialMatches();
    buildBoardDOM();
    updateCoinDisplayLocal(coins);
    console.log('Game restarted');
  }

  // basic init
  function initGame(){
    try {
      createBoard();
      removeInitialMatches();
      buildBoardDOM();
      // run an automatic sweep to remove initial matches until stable
      let loop = 0;
      while(removeMatchesAndRefill() > 0 && ++loop < 6){}
      console.log('initGame registered');
    } catch(err){
      console.error('Error in initGame', err);
    }
  }

  // simple touch swipe support (mobile)
  function addSwipeHandlers(){
    if(!boardEl) return;
    let start = null;
    boardEl.querySelectorAll('.tile').forEach(img=>{
      img.addEventListener('touchstart', (e)=>{
        const t = e.changedTouches[0];
        start = { x: t.clientX, y: t.clientY, r:+img.dataset.r, c:+img.dataset.c };
      }, {passive:true});
      img.addEventListener('touchend', (e)=>{
        if(!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        let tr = start.r, tc = start.c;
        if(Math.max(adx, ady) < 20){ start=null; return; } // tap
        if(adx > ady){
          // horizontal
          tc = dx>0 ? Math.min(COLS-1, start.c+1) : Math.max(0, start.c-1);
        } else {
          // vertical
          tr = dy>0 ? Math.min(ROWS-1, start.r+1) : Math.max(0, start.r-1);
        }
        performSwap(start.r, start.c, tr, tc);
        start = null;
      }, {passive:true});
      // allow mouse drag for desktop
      img.addEventListener('mousedown', (e)=>{ start = { x:e.clientX, y:e.clientY, r:+img.dataset.r, c:+img.dataset.c }; });
      img.addEventListener('mouseup', (e)=>{
        if(!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if(Math.max(adx,ady) < 10){ start=null; return; }
        let tr = start.r, tc = start.c;
        if(adx > ady){
          tc = dx>0 ? Math.min(COLS-1, start.c+1) : Math.max(0, start.c-1);
        } else {
          tr = dy>0 ? Math.min(ROWS-1, start.r+1) : Math.max(0, start.r-1);
        }
        performSwap(start.r, start.c, tr, tc);
        start = null;
      });
    });
  }

  // perform swap with match check - if no match, swap back
  function performSwap(r1,c1,r2,c2){
    if(isAnimating) return;
    if(r1===r2 && c1===c2) return;
    swapCells(r1,c1,r2,c2);
    refreshBoardDOM();
    // quick check if swap created any matches
    const m = findMatches();
    if(m.length>0){
      // resolve repeatedly
      const resolver = () => {
        const removed = removeMatchesAndRefill();
        if(removed>0){
          setTimeout(resolver, 180);
        }
      };
      setTimeout(resolver, 120);
    } else {
      // swap back after short delay
      setTimeout(()=>{
        swapCells(r1,c1,r2,c2);
        refreshBoardDOM();
      }, 180);
    }
  }

  // expose functions globally
  window._candyGame = {
    initGame: initGame,
    restartGame: restartGame,
    shuffleBoard: shuffleBoard,
    buyFromShop: buyFromShop,
    updateCoinDisplay: updateCoinDisplayLocal
  };

  // also export top-level names (some safe-ui checks use these)
  window.initGame = initGame;
  window.restartGame = restartGame;
  window.shuffleBoard = shuffleBoard;
  window.buyFromShop = buyFromShop;
  window.updateCoinDisplay = updateCoinDisplayLocal;

  // auto-log to help debugging
  console.log('✅ game.js loaded — functions exposed: initGame, restartGame, shuffleBoard, buyFromShop, updateCoinDisplay');

})();

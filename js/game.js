// js/game.js (updated responsive grid version)
//
// - Uses CSS Grid for layout
// - Swipe/tap works (pointer events)
// - 6 candies only
// - match detection + gravity + refill
// - safe DOM checks to avoid "null" errors
(function(){
  const IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  const DEFAULT_SIZE = 8;
  let boardSize = DEFAULT_SIZE;
  let board = []; // 2D array of ints or null
  let score = 0;
  let level = 1;

  const $ = id => document.getElementById(id);

  // util
  function randIndex(){ return Math.floor(Math.random()*IMAGES.length); }
  function inBounds(r,c){ return r>=0 && r<boardSize && c>=0 && c<boardSize; }

  // create board ensuring initial no immediate matches
  function createInitialBoard(){
    board = [];
    for(let r=0;r<boardSize;r++){
      board[r]=[];
      for(let c=0;c<boardSize;c++){
        board[r][c] = randIndex();
      }
    }
    // if there are initial matches, re-roll those cells simply
    while(findMatches().length>0){
      for(let r=0;r<boardSize;r++){
        for(let c=0;c<boardSize;c++){
          if(Math.random() < 0.5) board[r][c] = randIndex();
        }
      }
    }
  }

  // render board into CSS Grid
  function renderBoard(){
    const container = $('game-board');
    if(!container) return;
    // set grid columns dynamically
    container.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
    container.innerHTML = '';
    // create cells
    for(let r=0;r<boardSize;r++){
      for(let c=0;c<boardSize;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        const val = board[r][c];
        img.src = IMAGES[val];
        img.alt = 'candy';
        img.draggable = false;
        cell.appendChild(img);
        container.appendChild(cell);
      }
    }
    attachPointers();
  }

  // pointer handling (tap + swipe)
  let pointerStart = null;
  let tapped = null;

  function attachPointers(){
    const cells = document.querySelectorAll('#game-board .cell');
    cells.forEach(cell=>{
      cell.onpointerdown = (ev) => {
        ev.preventDefault();
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        pointerStart = {r,c, x: ev.clientX, y: ev.clientY};
      };
      cell.onpointerup = (ev) => {
        ev.preventDefault();
        if(!pointerStart) return;
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        const dx = ev.clientX - pointerStart.x;
        const dy = ev.clientY - pointerStart.y;
        const absX = Math.abs(dx), absY = Math.abs(dy);

        // short drag = tap
        if(absX < 10 && absY < 10){
          handleTap(r,c);
        } else {
          // determine direction based on dominant axis
          let tr = pointerStart.r, tc = pointerStart.c;
          if(absX > absY){
            tc = dx > 0 ? pointerStart.c + 1 : pointerStart.c - 1;
          } else {
            tr = dy > 0 ? pointerStart.r + 1 : pointerStart.r - 1;
          }
          swapAndProcess(pointerStart.r, pointerStart.c, tr, tc);
        }
        pointerStart = null;
      };
      // prevent context menu
      cell.oncontextmenu = (e)=> e.preventDefault();
    });
  }

  // tap selection mechanism
  function handleTap(r,c){
    const cellElem = document.querySelector(`#game-board .cell[data-r="${r}"][data-c="${c}"]`);
    if(!tapped){
      tapped = {r,c};
      if(cellElem) cellElem.classList.add('selected');
      return;
    }
    // if same cell tapped -> clear
    if(tapped.r === r && tapped.c === c){
      const prev = document.querySelector(`#game-board .cell[data-r="${tapped.r}"][data-c="${tapped.c}"]`);
      if(prev) prev.classList.remove('selected');
      tapped = null;
      return;
    }
    // check neighbor
    const dr = Math.abs(tapped.r - r), dc = Math.abs(tapped.c - c);
    if((dr===1 && dc===0) || (dr===0 && dc===1)){
      swapAndProcess(tapped.r, tapped.c, r, c);
    }
    // clear selected style
    const prev = document.querySelector(`#game-board .cell[data-r="${tapped.r}"][data-c="${tapped.c}"]`);
    if(prev) prev.classList.remove('selected');
    tapped = null;
  }

  // swap with bounds check, revert if no matches
  function swapAndProcess(r1,c1,r2,c2){
    if(!inBounds(r1,c1) || !inBounds(r2,c2)) return;
    // swap values
    const tmp = board[r1][c1]; board[r1][c1] = board[r2][c2]; board[r2][c2] = tmp;
    renderBoard();
    // after small delay, check matches
    setTimeout(()=>{
      const matches = findMatches();
      if(matches.length === 0){
        // revert
        const t2 = board[r1][c1]; board[r1][c1] = board[r2][c2]; board[r2][c2] = t2;
        renderBoard();
      } else {
        // resolved chain
        processMatches();
      }
    }, 110);
  }

  // find matches (>=3) horizontal + vertical
  function findMatches(){
    const found = [];
    const used = new Set();
    // horizontal
    for(let r=0;r<boardSize;r++){
      let start = 0;
      for(let c=1;c<=boardSize;c++){
        if(c<boardSize && board[r][c] === board[r][start]) continue;
        const len = c - start;
        if(len >= 3){
          for(let k=start;k<c;k++){
            const key = r + ',' + k;
            if(!used.has(key)){ used.add(key); found.push([r,k]); }
          }
        }
        start = c;
      }
    }
    // vertical
    for(let c=0;c<boardSize;c++){
      let start = 0;
      for(let r=1;r<=boardSize;r++){
        if(r<boardSize && board[r][c] === board[start][c]) continue;
        const len = r - start;
        if(len >= 3){
          for(let k=start;k<r;k++){
            const key = k + ',' + c;
            if(!used.has(key)){ used.add(key); found.push([k,c]); }
          }
        }
        start = r;
      }
    }
    return found;
  }

  // remove matched (set null), gravity collapse per column, refill
  function processMatches(){
    const matches = findMatches();
    if(matches.length === 0) return;
    // mark matches
    matches.forEach(([r,c]) => board[r][c] = null);
    // increment score
    score += matches.length * 50;
    updateScoreUI();

    // gravity + refill
    for(let c=0;c<boardSize;c++){
      const col = [];
      for(let r=boardSize-1;r>=0;r--){
        if(board[r][c] !== null) col.push(board[r][c]);
      }
      // refill new random until full
      while(col.length < boardSize) col.push(randIndex());
      // write back
      for(let r=boardSize-1, i=0; r>=0; r--, i++){
        board[r][c] = col[i];
      }
    }
    // re-render then chain-check after small delay for animation
    renderBoard();
    setTimeout(processMatches, 160);
  }

  function updateScoreUI(){
    const sEl = $('score'); if(sEl) sEl.textContent = score;
    const lvlEl = $('currentLevel'); if(lvlEl) lvlEl.textContent = level;
    if(window.updateCoinDisplay) window.updateCoinDisplay();
  }

  // public actions
  window.shuffleBoard = function(){
    createInitialBoard();
    renderBoard();
    console.log('Board shuffled');
  };

  window.restartGame = function(){
    score = 0;
    createInitialBoard();
    renderBoard();
    updateScoreUI();
    console.log('Game restarted');
  };

  // check level complete by goal; show modal
  window.checkLevelComplete = function(){
    const goal = (StorageAPI.getLevel() || 1) * 500; // adjustable
    if(score >= goal){
      StorageAPI.addCoins(50);
      const modal = $('levelUpModal');
      if(modal){
        $('levelUpTitle').textContent = 'Level Complete!';
        $('levelUpText').textContent = `Level ${StorageAPI.getLevel()} cleared! Reward: 50 coins`;
        modal.style.display = 'flex';
      }
    }
  };

  // expose initGame
  window.initGame = function(){
    try {
      level = StorageAPI.getLevel() || 1;
      boardSize = (level >= 4) ? 9 : DEFAULT_SIZE; // example: levels 4+ bigger board
      score = 0;
      createInitialBoard();
      renderBoard();
      updateScoreUI();
      // show game screen
      const gs = $('game-screen'), ms = $('map-screen');
      if(gs) gs.classList.add('active');
      if(ms) ms.classList.remove('active');
      console.log('Game initialized at level', level);
    } catch(e){
      console.error('initGame error', e);
    }
  };

  // small periodic check for completion
  setInterval(()=>{ try{ window.checkLevelComplete && window.checkLevelComplete(); } catch(e){} }, 1200);

  console.log('Loaded: js/game.js (updated)');
})();

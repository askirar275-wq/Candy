// js/game.js
(function(){
  const IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];
  const SIZE_DEFAULT = 8; // 8x8
  let boardSize = SIZE_DEFAULT;
  let board = []; // 2d array of indices
  let score = 0;
  let level = 1;

  const $ = id => document.getElementById(id);

  function randIndex(){ return Math.floor(Math.random()*IMAGES.length); }

  function createEmptyBoard(){
    board = [];
    for(let r=0;r<boardSize;r++){
      board[r]=[];
      for(let c=0;c<boardSize;c++) board[r][c]=randIndex();
    }
  }

  function renderBoard(){
    const b = $('game-board');
    if(!b) return;
    b.innerHTML = '';
    b.style.width = ''; // auto, grid handled by float
    for(let r=0;r<boardSize;r++){
      for(let c=0;c<boardSize;c++){
        const cell = document.createElement('div');
        cell.className='cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = IMAGES[ board[r][c] ];
        img.draggable = false;
        cell.appendChild(img);
        b.appendChild(cell);
      }
    }
    attachInput();
  }

  function attachInput(){
    const cells = document.querySelectorAll('#game-board .cell');
    let start = null;
    cells.forEach(cell=>{
      cell.onpointerdown = (e)=>{
        start = { r: Number(cell.dataset.r), c: Number(cell.dataset.c), x: e.clientX, y: e.clientY };
      };
      cell.onpointerup = (e)=>{
        if(!start) return;
        const endR = Number(cell.dataset.r), endC = Number(cell.dataset.c);
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        const absX = Math.abs(dx), absY = Math.abs(dy);
        if(absX<8 && absY<8){
          // treat as tap: select/swap with neighbor by second tap
          handleTap(endR,endC);
        } else {
          // determine direction
          let target = {r:start.r, c:start.c};
          if(absX > absY){
            // horizontal
            target.c = dx > 0 ? start.c + 1 : start.c - 1;
          } else {
            // vertical
            target.r = dy > 0 ? start.r + 1 : start.r - 1;
          }
          swapAndResolve(start.r,start.c,target.r,target.c);
        }
        start = null;
      };
    });
  }

  // simple tap select mechanism
  let lastTap = null;
  function handleTap(r,c){
    if(!lastTap){ lastTap = {r,c}; const cell = getCellElem(r,c); if(cell) cell.style.outline='3px solid rgba(255,100,150,0.25)'; return; }
    // swap with lastTap if neighbor
    const dr = Math.abs(lastTap.r - r), dc = Math.abs(lastTap.c - c);
    if((dr===1 && dc===0) || (dr===0 && dc===1)){
      swapAndResolve(lastTap.r,lastTap.c,r,c);
    }
    // clear selection highlight
    const prev = getCellElem(lastTap.r,lastTap.c); if(prev) prev.style.outline='none';
    lastTap = null;
  }

  function getCellElem(r,c){
    return document.querySelector(`#game-board .cell[data-r="${r}"][data-c="${c}"]`);
  }

  function swapAndResolve(r1,c1,r2,c2){
    if(!inBounds(r1,c1) || !inBounds(r2,c2)) return;
    // swap
    const tmp = board[r1][c1]; board[r1][c1] = board[r2][c2]; board[r2][c2] = tmp;
    renderBoard();
    // check matches; if none revert after short delay
    setTimeout(()=>{
      const matches = findMatches();
      if(matches.length===0){
        // revert
        const tmp2 = board[r1][c1]; board[r1][c1] = board[r2][c2]; board[r2][c2] = tmp2;
        renderBoard();
      } else {
        // remove and apply gravity repeatedly
        processMatches();
      }
    },120);
  }

  function inBounds(r,c){ return r>=0 && r<boardSize && c>=0 && c<boardSize; }

  // find all contiguous matches (>=3) returns array of positions
  function findMatches(){
    const matched = [];
    // horizontal
    for(let r=0;r<boardSize;r++){
      let runStart=0;
      for(let c=1;c<=boardSize;c++){
        if(c<boardSize && board[r][c] === board[r][runStart]) continue;
        const runLen = c - runStart;
        if(runLen>=3){
          for(let k=runStart;k<c;k++) matched.push([r,k]);
        }
        runStart = c;
      }
    }
    // vertical
    for(let c=0;c<boardSize;c++){
      let runStart=0;
      for(let r=1;r<=boardSize;r++){
        if(r<boardSize && board[r][c] === board[runStart][c]) continue;
        const runLen = r - runStart;
        if(runLen>=3){
          for(let k=runStart;k<r;k++) matched.push([k,c]);
        }
        runStart = r;
      }
    }
    // unique positions
    const keySet = new Set();
    const uniq = [];
    matched.forEach(([r,c])=>{
      const key = r+','+c;
      if(!keySet.has(key)){ keySet.add(key); uniq.push([r,c]); }
    });
    return uniq;
  }

  function processMatches(){
    const matches = findMatches();
    if(matches.length===0) return;
    // remove (set to null marker)
    matches.forEach(([r,c]) => { board[r][c] = null; });
    // update score
    score += matches.length * 60;
    updateScoreUI();
    // gravity: for each column, collapse nulls and refill top
    for(let c=0;c<boardSize;c++){
      const col = [];
      for(let r=boardSize-1;r>=0;r--){
        if(board[r][c] !== null) col.push(board[r][c]);
      }
      // fill up to boardSize with new candies
      while(col.length < boardSize) col.push(randIndex());
      // write back
      for(let r=boardSize-1, i=0; r>=0; r--, i++){
        board[r][c] = col[i];
      }
    }
    renderBoard();
    // chain detection after short delay
    setTimeout(processMatches, 160);
  }

  function updateScoreUI(){
    const s = $('score'); if(s) s.textContent = score;
    const lvl = $('currentLevel'); if(lvl) lvl.textContent = level;
  }

  // shuffle function
  window.shuffleBoard = function(){
    createEmptyBoard();
    renderBoard();
    console.log('Board shuffled');
  };

  window.restartGame = function(){
    score = 0;
    createEmptyBoard();
    renderBoard();
    updateScoreUI();
    console.log('Game restarted');
  };

  // initGame (exposed)
  window.initGame = function(){
    try {
      level = StorageAPI.getLevel() || 1;
      // optionally change board size by level
      boardSize = (level >= 4) ? 9 : 8;
      score = 0;
      createEmptyBoard();
      // avoid starting with existing matches — simple re-fill until no immediate matches
      while(findMatches().length > 0){
        createEmptyBoard();
      }
      renderBoard();
      updateScoreUI();
      window.updateCoinDisplay && window.updateCoinDisplay();
      document.getElementById('game-screen').classList.add('active');
      document.getElementById('map-screen').classList.remove('active');
      console.log('Game initialized at level', level);
    } catch(err){
      console.error('Error: initGame error', err);
    }
  };

  window.addCoins = function(n){ StorageAPI.addCoins(Number(n||0)); window.updateCoinDisplay && window.updateCoinDisplay(); };

  // expose small helper for level completion (demo: reach score >= goal)
  window.checkLevelComplete = function(){
    const goal = 1000 * (StorageAPI.getLevel() || 1);
    if(score >= goal){
      // give reward, show modal
      StorageAPI.addCoins(100);
      const modal = document.getElementById('levelUpModal');
      if(modal){
        document.getElementById('levelUpTitle').textContent = 'Level Complete!';
        document.getElementById('levelUpText').textContent = `Level ${StorageAPI.getLevel()} cleared!`;
        modal.style.display = 'flex';
      }
    }
  };

  // small interval to check progress
  setInterval(()=>{
    try{ if(typeof window.checkLevelComplete === 'function') window.checkLevelComplete(); } catch(e){}
  }, 1500);

  console.log('Loaded: js/game.js');
})();

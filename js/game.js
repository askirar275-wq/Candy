// js/game.js
(function(){
  const CANDY_IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  // Levels config (matching level-map)
  const LEVELS = [ null,
    { id:1, title:'Beginner', goalScore:100, rewardCoins:50, boardSize:8 },
    { id:2, title:'Explorer', goalScore:300, rewardCoins:120, boardSize:8 },
    { id:3, title:'Challenger', goalScore:700, rewardCoins:250, boardSize:9 },
    { id:4, title:'Master', goalScore:1500, rewardCoins:600, boardSize:9 }
  ];

  const $ = id => document.getElementById(id);

  // state
  let state = {
    level: 1,
    score: 0,
    boardSize: 8,
    running: false,
    board: [] // 2D array of candy indices
  };

  // helper random
  function randIndex(){ return Math.floor(Math.random()*CANDY_IMAGES.length); }
  function randCandy(){ return CANDY_IMAGES[randIndex()]; }

  // update coin display (used by storage)
  window.updateCoinDisplay = function(){
    const el = $('coins');
    if(el) el.textContent = StorageAPI.getCoins();
    const shopCoins = $('shopCoins');
    if(shopCoins) shopCoins.textContent = StorageAPI.getCoins();
  };

  // updateScore
  function updateScoreUI(){
    const s = $('score'); if(s) s.textContent = state.score;
  }

  function updateLevelUI(){
    const lvl = state.level;
    const levelInfo = LEVELS[lvl] || LEVELS[1];
    state.boardSize = (levelInfo && levelInfo.boardSize) ? levelInfo.boardSize : 8;
    const cur = $('currentLevel'); if(cur) cur.textContent = lvl;
    // adjust grid columns
    const boardEl = $('game-board');
    if(boardEl){
      boardEl.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
      // adjust cell size for small screens dynamically (optional)
    }
  }

  // create internal board (2D array of indices)
  function createBoardArray(){
    const n = state.boardSize;
    state.board = [];
    for(let r=0;r<n;r++){
      const row = [];
      for(let c=0;c<n;c++){
        row.push(randIndex());
      }
      state.board.push(row);
    }
    // avoid initial matches: simple loop to re-roll if immediate matches present
    eliminateInitialMatches();
  }

  function eliminateInitialMatches(){
    const n = state.boardSize;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        // check horizontal
        if(c>=2 && state.board[r][c] === state.board[r][c-1] && state.board[r][c] === state.board[r][c-2]){
          state.board[r][c] = (state.board[r][c] + 1) % CANDY_IMAGES.length;
        }
        // check vertical
        if(r>=2 && state.board[r][c] === state.board[r-1][c] && state.board[r][c] === state.board[r-2][c]){
          state.board[r][c] = (state.board[r][c] + 1) % CANDY_IMAGES.length;
        }
      }
    }
  }

  // render board DOM
  function renderBoard(){
    const boardEl = $('game-board');
    if(!boardEl) return;
    boardEl.innerHTML = '';
    const n = state.boardSize;

    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.dataset.r = r;
        img.dataset.c = c;
        img.src = CANDY_IMAGES[state.board[r][c]];

        // pointer/touch handlers for swipe support
        makeTileInteractive(cell, img);

        cell.appendChild(img);
        boardEl.appendChild(cell);
      }
    }
  }

  // tile interaction: click/touch to swap via swipe or tap select
  let touchStart = null;
  function makeTileInteractive(cell, img){
    // selection on click
    cell.addEventListener('click', (e) => {
      // If another selected, try swap
      const prev = document.querySelector('.cell.selected-cell');
      if(prev && prev !== cell){
        // swap prev <-> cell
        doSwapCells(prev, cell);
        prev.classList.remove('selected-cell');
      } else {
        // toggle select
        cell.classList.toggle('selected-cell');
      }
    });

    // touch handlers to support swipe
    let startX = null, startY = null;
    img.addEventListener('touchstart', function(ev){
      if(ev.touches && ev.touches.length) {
        startX = ev.touches[0].clientX;
        startY = ev.touches[0].clientY;
      }
    }, {passive:true});

    img.addEventListener('touchend', function(ev){
      if(startX === null) return;
      var endX = (ev.changedTouches && ev.changedTouches[0]) ? ev.changedTouches[0].clientX : null;
      var endY = (ev.changedTouches && ev.changedTouches[0]) ? ev.changedTouches[0].clientY : null;
      if(endX === null) { startX = null; startY = null; return; }
      var dx = endX - startX, dy = endY - startY;
      var absdx = Math.abs(dx), absdy = Math.abs(dy);
      if(Math.max(absdx,absdy) < 20){ startX=null; startY=null; return; } // tap, ignore
      // determine direction
      const r = Number(img.dataset.r), c = Number(img.dataset.c);
      let targetR = r, targetC = c;
      if(absdx > absdy){
        if(dx > 0) targetC = c + 1; else targetC = c - 1;
      } else {
        if(dy > 0) targetR = r + 1; else targetR = r - 1;
      }
      startX=null; startY=null;
      // find corresponding cell element
      const other = document.querySelector('.cell[data-r="'+targetR+'"][data-c="'+targetC+'"]');
      if(other){
        doSwapCells(cell, other);
      }
    }, {passive:true});
  }

  // swap two cells visually & in state, then check matches
  function doSwapCells(aCell, bCell){
    if(!aCell || !bCell) return;
    const ar = Number(aCell.dataset.r), ac = Number(aCell.dataset.c);
    const br = Number(bCell.dataset.r), bc = Number(bCell.dataset.c);

    // check adjacency
    if(Math.abs(ar-br)+Math.abs(ac-bc) !== 1) {
      // not adjacent - ignore
      return;
    }

    // swap in state
    const tmp = state.board[ar][ac];
    state.board[ar][ac] = state.board[br][bc];
    state.board[br][bc] = tmp;

    // update DOM src
    const aImg = aCell.querySelector('.tile');
    const bImg = bCell.querySelector('.tile');
    if(aImg) aImg.src = CANDY_IMAGES[state.board[ar][ac]];
    if(bImg) bImg.src = CANDY_IMAGES[state.board[br][bc]];

    // now check matches, if no matches revert swap (simple rule)
    const matches = findAllMatches();
    if(matches.length === 0){
      // revert after short delay to show swap
      setTimeout(() => {
        const tmp2 = state.board[ar][ac];
        state.board[ar][ac] = state.board[br][bc];
        state.board[br][bc] = tmp2;
        if(aImg) aImg.src = CANDY_IMAGES[state.board[ar][ac]];
        if(bImg) bImg.src = CANDY_IMAGES[state.board[br][bc]];
      }, 200);
      return;
    }

    // if matches found, handle removal chain
    processMatchesChain();
  }

  // find matches — return array of cell coordinates to remove
  function findAllMatches(){
    const n = state.boardSize;
    const remove = []; // array of [r,c]
    // horizontal
    for(let r=0;r<n;r++){
      let runColor = null, runStart = 0, runLen = 0;
      for(let c=0;c<n;c++){
        const color = state.board[r][c];
        if(color === runColor) { runLen++; }
        else {
          if(runLen >= 3){
            for(let k=runStart;k<runStart+runLen;k++) remove.push([r,k]);
          }
          runColor = color; runStart = c; runLen = 1;
        }
      }
      if(runLen >= 3){
        for(let k=runStart;k<runStart+runLen;k++) remove.push([r,k]);
      }
    }
    // vertical
    for(let c=0;c<n;c++){
      let runColor = null, runStart = 0, runLen = 0;
      for(let r=0;r<n;r++){
        const color = state.board[r][c];
        if(color === runColor) { runLen++; }
        else {
          if(runLen >= 3){
            for(let k=runStart;k<runStart+runLen;k++) remove.push([k,c]);
          }
          runColor = color; runStart = r; runLen = 1;
        }
      }
      if(runLen >= 3){
        for(let k=runStart;k<runStart+runLen;k++) remove.push([k,c]);
      }
    }

    // remove duplicates (stringify key)
    const keySet = {};
    const uniq = [];
    remove.forEach(function(rc){
      const key = rc[0] + ',' + rc[1];
      if(!keySet[key]){ keySet[key]=true; uniq.push(rc); }
    });
    return uniq;
  }

  // process matches, remove, apply gravity, refill; chain until no matches
  function processMatchesChain(){
    const matches = findAllMatches();
    if(matches.length === 0) return;

    // score increment: 10 per tile (example)
    state.score += matches.length * 10;
    updateScoreUI();

    // remove tiles: set to null
    matches.forEach(function(rc){
      state.board[rc[0]][rc[1]] = null;
      // animate DOM: find cell img and fade
      const img = document.querySelector('.cell[data-r="'+rc[0]+'"][data-c="'+rc[1]+'"] .tile');
      if(img) { img.style.opacity = '0'; img.style.transform = 'scale(0.6)'; }
    });

    // after short delay, apply gravity and refill
    setTimeout(function(){
      applyGravityAndRefill();
      // small delay then check next chain
      setTimeout(function(){
        processMatchesChain();
      }, 220);
    }, 220);
  }

  // gravity: for each column, shift non-null down and refill top with random
  function applyGravityAndRefill(){
    const n = state.boardSize;
    for(let c=0;c<n;c++){
      const col = [];
      for(let r=0;r<n;r++){
        if(state.board[r][c] !== null && typeof state.board[r][c] !== 'undefined'){
          col.push(state.board[r][c]);
        }
      }
      // fill from bottom
      for(let r=n-1, idx=col.length-1; r>=0; r--, idx--){
        const val = (idx>=0) ? col[idx] : randIndex();
        state.board[r][c] = val;
        // update DOM src
        const img = document.querySelector('.cell[data-r="'+r+'"][data-c="'+c+'"] .tile');
        if(img){
          img.src = CANDY_IMAGES[val];
          img.style.opacity = '1';
          img.style.transform = 'scale(1)';
        }
      }
    }
  }

  // shuffle board: randomize candies without breaking state
  window.shuffleBoard = function(){
    const n = state.boardSize;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        state.board[r][c] = randIndex();
      }
    }
    eliminateInitialMatches();
    renderBoard();
    console.log('Board shuffled');
  };

  // restart
  window.restartGame = function(){
    state.score = 0; updateScoreUI();
    createBoardArray();
    renderBoard();
    console.log('Game restarted');
  };

  // main init
  window.initGame = function(){
    try {
      state.level = StorageAPI.getLevel();
      state.score = 0;
      state.running = true;
      updateLevelUI();
      createBoardArray();
      renderBoard();
      updateScoreUI();
      updateCoinDisplay();
      console.log('Game initialized at level', state.level);
    } catch(e){
      console.error('initGame error', e);
    }
  };

  // shop placeholder
  window.buyFromShop = function(item){
    var prices = { shuffle:100, moves:80 };
    var p = prices[item] || 0;
    if(StorageAPI.getCoins() >= p){
      StorageAPI.addCoins(-p);
      updateCoinDisplay();
      if(item === 'shuffle') shuffleBoard();
      console.log('Bought', item);
    } else {
      console.warn('Not enough coins');
    }
  };

  // dev helpers
  window.addCoins = function(n){ StorageAPI.addCoins(Number(n||0)); updateCoinDisplay(); };
  window.setGameLevel = function(l){ StorageAPI.setLevel(l); state.level = StorageAPI.getLevel(); updateLevelUI(); };

  console.log('Loaded: js/game.js');
})();

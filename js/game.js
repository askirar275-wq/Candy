// js/game.js — fixed swipe (vertical+horizontal), match+gravity, 6 candies
(function(){
  // ----- CONFIG -----
  const CANDY_IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  const LEVELS = [ null,
    { id:1, title:'Beginner', goalScore:100, rewardCoins:50, boardSize:8 },
    { id:2, title:'Explorer', goalScore:300, rewardCoins:120, boardSize:8 },
    { id:3, title:'Challenger', goalScore:700, rewardCoins:250, boardSize:9 }
  ];

  // ----- STATE & HELPERS -----
  const $ = id => document.getElementById(id);
  let state = { level:1, score:0, boardSize:8, board:[] };

  function randIndex(){ return Math.floor(Math.random()*CANDY_IMAGES.length); }

  // adjust CSS variable for cell size (responsive)
  function adjustCellSizeForViewport(boardEl, boardSize){
    if(!boardEl) return;
    const maxW = Math.min(window.innerWidth - 40, 760);
    const gap = parseFloat(getComputedStyle(boardEl).gap || 10);
    const usable = maxW - gap*(boardSize-1);
    let cell = Math.floor(usable/boardSize);
    if(cell < 40) cell = 40;
    if(cell > 96) cell = 96;
    document.documentElement.style.setProperty('--cell-size', cell+'px');
  }

  // ----- STORAGE HOOKS (storage.js must provide these) -----
  window.updateCoinDisplay = function(){
    const el = $('coins'); if(el) el.textContent = (typeof StorageAPI !== 'undefined' ? StorageAPI.getCoins() : 0);
    const sc = $('shopCoins'); if(sc) sc.textContent = (typeof StorageAPI !== 'undefined' ? StorageAPI.getCoins() : 0);
  };

  // ----- LEVEL / UI -----
  function updateScoreUI(){ const s = $('score'); if(s) s.textContent = state.score; }
  function updateLevelUI(){
    const lvl = state.level || 1;
    const info = LEVELS[lvl] || LEVELS[1];
    state.boardSize = info.boardSize || 8;
    const cur = $('currentLevel'); if(cur) cur.textContent = lvl;
    const board = $('game-board');
    if(board){
      board.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
      adjustCellSizeForViewport(board, state.boardSize);
    }
  }

  // ----- BOARD DATA -----
  function createBoardArray(){
    const n = state.boardSize;
    state.board = [];
    for(let r=0;r<n;r++){
      state.board[r] = [];
      for(let c=0;c<n;c++) state.board[r][c] = randIndex();
    }
    removeInitialMatches();
  }

  // avoid initial accidental matches
  function removeInitialMatches(){
    const n = state.boardSize;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(c>=2 && state.board[r][c] === state.board[r][c-1] && state.board[r][c] === state.board[r][c-2]){
          state.board[r][c] = (state.board[r][c] + 1) % CANDY_IMAGES.length;
        }
        if(r>=2 && state.board[r][c] === state.board[r-1][c] && state.board[r][c] === state.board[r-2][c]){
          state.board[r][c] = (state.board[r][c] + 1) % CANDY_IMAGES.length;
        }
      }
    }
  }

  // ----- RENDER -----
  function renderBoard(){
    const board = $('game-board'); if(!board) return;
    adjustCellSizeForViewport(board, state.boardSize);
    board.innerHTML = '';
    for(let r=0;r<state.boardSize;r++){
      for(let c=0;c<state.boardSize;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.dataset.r = r; img.dataset.c = c;
        img.src = CANDY_IMAGES[state.board[r][c]];
        cell.appendChild(img);
        addInteraction(cell, img);
        board.appendChild(cell);
      }
    }
  }

  // update image src for a cell
  function setCellImg(r,c){
    const img = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .tile`);
    if(img) img.src = CANDY_IMAGES[state.board[r][c]];
  }

  // ----- INTERACTION (tap + swipe) -----
  function addInteraction(cell, img){
    // tap select / swap
    cell.addEventListener('click', ()=> {
      const prev = document.querySelector('.cell.selected-cell');
      if(prev && prev !== cell){
        prev.classList.remove('selected-cell');
        doSwapCells(prev, cell);
      } else {
        cell.classList.toggle('selected-cell');
      }
    });

    // swipe support (touch)
    let sx = null, sy = null;
    img.addEventListener('touchstart', e => {
      if(e.touches && e.touches.length) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
    }, {passive:true});

    img.addEventListener('touchmove', e => {
      // prevent page scroll while swiping inside board
      if(sx !== null) e.preventDefault();
    }, {passive:false});

    img.addEventListener('touchend', e => {
      if(sx === null) return;
      const ex = e.changedTouches[0].clientX, ey = e.changedTouches[0].clientY;
      const dx = ex - sx, dy = ey - sy;
      const threshold = 18; // minimum movement to consider swipe
      if(Math.abs(dx) < threshold && Math.abs(dy) < threshold){ sx = sy = null; return; }

      const r = +img.dataset.r, c = +img.dataset.c;
      let tr = r, tc = c;
      if(Math.abs(dx) > Math.abs(dy)){
        tc = c + (dx > 0 ? 1 : -1);
      } else {
        tr = r + (dy > 0 ? 1 : -1);
      }
      sx = sy = null;

      // bounds check
      if(tr < 0 || tr >= state.boardSize || tc < 0 || tc >= state.boardSize) return;
      const other = document.querySelector(`.cell[data-r="${tr}"][data-c="${tc}"]`);
      if(other) doSwapCells(cell, other);
    }, {passive:true});
  }

  // ----- SWAP LOGIC -----
  function doSwapCells(cellA, cellB){
    const ar = +cellA.dataset.r, ac = +cellA.dataset.c;
    const br = +cellB.dataset.r, bc = +cellB.dataset.c;

    // only neighbors allowed
    if((Math.abs(ar - br) + Math.abs(ac - bc)) !== 1) return;

    // swap in data
    const tmp = state.board[ar][ac];
    state.board[ar][ac] = state.board[br][bc];
    state.board[br][bc] = tmp;

    // update DOM images immediately
    setCellImg(ar,ac); setCellImg(br,bc);

    // check matches
    const matches = findMatches();
    if(matches.length === 0){
      // revert after short delay for visual feedback
      setTimeout(()=>{
        const tmp2 = state.board[ar][ac];
        state.board[ar][ac] = state.board[br][bc];
        state.board[br][bc] = tmp2;
        setCellImg(ar,ac); setCellImg(br,bc);
      }, 160);
      return;
    }

    // if matches exist, process them
    processMatches();
  }

  // ----- MATCH DETECTION -----
  function findMatches(){
    const n = state.boardSize;
    const toRemove = [];
    // rows
    for(let r=0;r<n;r++){
      let run = 1;
      for(let c=1;c<=n;c++){
        if(c<n && state.board[r][c] === state.board[r][c-1]) run++;
        else {
          if(run >= 3){
            for(let k=c-run;k<c;k++) toRemove.push([r,k]);
          }
          run = 1;
        }
      }
    }
    // cols
    for(let c=0;c<n;c++){
      let run = 1;
      for(let r=1;r<=n;r++){
        if(r<n && state.board[r][c] === state.board[r-1][c]) run++;
        else {
          if(run >= 3){
            for(let k=r-run;k<r;k++) toRemove.push([k,c]);
          }
          run = 1;
        }
      }
    }
    // unique
    const seen = new Set();
    const unique = [];
    toRemove.forEach(([r,c])=>{
      const k = `${r},${c}`;
      if(!seen.has(k)){ seen.add(k); unique.push([r,c]); }
    });
    return unique;
  }

  // ----- PROCESS MATCHES + ANIMATE + GRAVITY -----
  function processMatches(){
    const matches = findMatches();
    if(matches.length === 0) return;

    // increment score (example)
    state.score += matches.length * 10;
    updateScoreUI();

    // visually hide matched tiles and set to null in data
    matches.forEach(([r,c])=>{
      state.board[r][c] = null;
      const img = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .tile`);
      if(img){
        img.style.transition = 'transform 180ms ease, opacity 180ms ease';
        img.style.transform = 'scale(0.4)';
        img.style.opacity = '0';
      }
    });

    // after animation, apply gravity and refill then check again
    setTimeout(()=>{
      applyGravityAndRefill();
      // small delay then check chain reactions
      setTimeout(()=> processMatches(), 190);
    }, 200);
  }

  function applyGravityAndRefill(){
    const n = state.boardSize;
    for(let c=0;c<n;c++){
      const stack = [];
      for(let r=n-1;r>=0;r--){
        if(state.board[r][c] !== null && state.board[r][c] !== undefined){
          stack.push(state.board[r][c]);
        }
      }
      for(let r=n-1;r>=0;r--){
        const val = stack.length ? stack.shift() : randIndex();
        state.board[r][c] = val;
        const img = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .tile`);
        if(img){
          img.src = CANDY_IMAGES[val];
          img.style.transition = 'transform 220ms ease, opacity 220ms ease';
          img.style.transform = 'scale(1)';
          img.style.opacity = '1';
        }
      }
    }
  }

  // ----- PUBLIC GAME API -----
  window.shuffleBoard = function(){
    const n = state.boardSize;
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) state.board[r][c] = randIndex();
    removeInitialMatches();
    renderBoard();
    console.log('Board shuffled');
  };

  window.restartGame = function(){
    state.score = 0; updateScoreUI(); createBoardArray(); renderBoard();
    console.log('Game restarted');
  };

  window.initGame = function(){
    state.level = (typeof StorageAPI !== 'undefined' ? StorageAPI.getLevel() : 1);
    state.score = 0; updateScoreUI();
    updateLevelUI();
    createBoardArray();
    renderBoard();
    updateCoinDisplay();
    console.log('Game initialized at level', state.level);
  };

  window.buyFromShop = function(item){
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const p = prices[item] || 0;
    if(typeof StorageAPI !== 'undefined' && StorageAPI.getCoins() >= p){
      StorageAPI.addCoins(-p);
      updateCoinDisplay();
      if(item === 'shuffle') shuffleBoard();
      console.log('Bought', item);
    } else console.warn('Not enough coins or StorageAPI missing');
  };

  console.log('Loaded: js/game.js (swipe fixes applied)');
})();

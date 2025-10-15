// js/game.js (patched safe version)
// Please replace your existing js/game.js with this file.

(function(){
  'use strict';

  // helper
  const $id = id => document.getElementById(id);

  // Config: 6 candies only (use images/candy1.png ... candy6.png)
  const CANDY_IMAGES = [
    'candy1.png','candy2.png','candy3.png',
    'candy4.png','candy5.png','candy6.png'
  ];

  // levels (simple)
  const LEVELS = [null,
    { id:1, goalScore:1000, boardSize:7 },
    { id:2, goalScore:2000, boardSize:7 },
    { id:3, goalScore:3500, boardSize:8 }
  ];

  // state
  const state = {
    level: 1,
    score: 0,
    boardSize: 7,
    running: false
  };

  // safe DOM setters
  function setText(id, text){
    const el = $id(id);
    if(el) el.textContent = text;
    else console.warn('missing element for setText ->', id);
  }
  function setImgSrc(imgEl, src){
    if(!imgEl) { console.warn('setImgSrc: target null'); return; }
    imgEl.src = src;
    imgEl.onerror = () => {
      console.warn('image load failed:', src);
      // leave blank or set placeholder
      imgEl.style.visibility = 'hidden';
    };
  }

  // pick random candy (returns url)
  function randCandy(){
    const i = Math.floor(Math.random() * CANDY_IMAGES.length);
    return `images/${CANDY_IMAGES[i]}`;
  }

  // update score UI
  function updateScoreUI(){
    setText('score', state.score);
  }

  // update coin UI (uses StorageAPI if available)
  function updateCoinDisplay(){
    try {
      if(typeof StorageAPI !== 'undefined' && StorageAPI.getCoins){
        setText('coins', StorageAPI.getCoins());
        const shopCoins = $id('shopCoins');
        if(shopCoins) shopCoins.textContent = StorageAPI.getCoins();
      } else {
        setText('coins', 0);
      }
    } catch(e){ console.warn('updateCoinDisplay error', e); }
  }

  // update level UI
  function updateLevelUI(){
    setText('currentLevelDisplay', state.level);
    const info = LEVELS[state.level] || LEVELS[1];
    state.boardSize = (info && info.boardSize) ? info.boardSize : 7;
    // adjust board css grid if exists
    const board = $id('game-board');
    if(board){
      board.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${state.boardSize}, 1fr)`;
    }
  }

  // create board cells
  function createBoard(){
    const board = $id('game-board');
    if(!board){
      console.warn('createBoard: game-board not found');
      return;
    }
    board.innerHTML = '';
    const size = state.boardSize;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        setImgSrc(img, randCandy());
        cell.appendChild(img);
        board.appendChild(cell);

        // click select
        cell.addEventListener('click', () => {
          cell.classList.toggle('selected');
        });

        // touch swipe handlers will be set globally
      }
    }
  }

  // shuffle board (reassign random images)
  function shuffleBoard(){
    const imgs = document.querySelectorAll('#game-board .tile');
    if(!imgs) { console.warn('shuffleBoard: no images'); return; }
    imgs.forEach(img => setImgSrc(img, randCandy()));
    console.log('Board shuffled');
  }

  // simple match detection: remove any 3 same-in-row or col (image src compare)
  function findAndRemoveMatches(){
    const board = $id('game-board');
    if(!board) return 0;
    const size = state.boardSize;
    // build 2D array of srcs and img elements
    const grid = [];
    const imgs = board.querySelectorAll('.cell .tile');
    // convert NodeList into 2D by index
    let idx = 0;
    for(let r=0;r<size;r++){
      grid[r]=[];
      for(let c=0;c<size;c++){
        const img = imgs[idx++];
        grid[r][c] = { img, src: img ? img.src : null };
      }
    }

    // mark to remove
    const remove = Array.from({length:size},()=>Array(size).fill(false));
    let removed = 0;

    // horizontal
    for(let r=0;r<size;r++){
      for(let c=0;c<size-2;c++){
        const a = grid[r][c].src, b = grid[r][c+1].src, c2 = grid[r][c+2].src;
        if(a && b && c2 && a===b && b===c2){
          remove[r][c]=remove[r][c+1]=remove[r][c+2]=true;
        }
      }
    }
    // vertical
    for(let c=0;c<size;c++){
      for(let r=0;r<size-2;r++){
        const a = grid[r][c].src, b = grid[r+1][c].src, c2 = grid[r+2][c].src;
        if(a && b && c2 && a===b && b===c2){
          remove[r][c]=remove[r+1][c]=remove[r+2][c]=true;
        }
      }
    }

    // remove marked: set img src to '' then gravity refill later
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        if(remove[r][c]){
          const el = grid[r][c].img;
          if(el){
            el.style.visibility = 'hidden';
            el.dataset.toClear = '1';
            removed++;
          }
        }
      }
    }

    if(removed>0){
      // add score per removed tile
      state.score += removed * 10;
      updateScoreUI();
      console.log('Removed', removed);
    }
    return removed;
  }

  // apply gravity: for each column, move down and refill top
  function applyGravityAndRefill(){
    const board = $id('game-board');
    if(!board) return;
    const size = state.boardSize;
    // collect columns
    const cols = [];
    for(let c=0;c<size;c++){
      cols[c]=[];
      for(let r=0;r<size;r++){
        const cell = board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        const img = cell ? cell.querySelector('img') : null;
        cols[c].push(img);
      }
    }

    // for each column, compact visible images to bottom
    for(let c=0;c<size;c++){
      const col = cols[c];
      const newSrcs = [];
      // bottom-up collect visible srcs
      for(let r=size-1;r>=0;r--){
        const img = col[r];
        if(img && img.dataset.toClear !== '1' && img.src){
          newSrcs.push(img.src);
        }
      }
      // refill bottom with existing then top with new random
      for(let r=size-1, i=0; r>=0; r--, i++){
        const img = col[r];
        if(img){
          const src = (i < newSrcs.length) ? newSrcs[i] : randCandy();
          img.style.visibility = 'visible';
          img.dataset.toClear = '';
          setImgSrc(img, src);
        }
      }
    }
  }

  // run a single iteration: remove matches until none
  function collapseMatchesLoop(){
    let removed = 0;
    do {
      removed = findAndRemoveMatches();
      if(removed) {
        // small delay for animation feel
        setTimeout(()=>{ applyGravityAndRefill(); }, 120);
      }
    } while(removed);
  }

  // init swipe detection (touch)
  function initSwipe(){
    const board = $id('game-board');
    if(!board) return;

    let startX=0, startY=0, startCell=null;
    function onStart(e){
      const t = (e.touches && e.touches[0]) || e;
      startX = t.clientX; startY = t.clientY;
      startCell = e.target.closest('.cell');
    }
    function onEnd(e){
      if(!startCell) return;
      const t = (e.changedTouches && e.changedTouches[0]) || e;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if(Math.abs(dx) < 20 && Math.abs(dy) < 20) { startCell = null; return; }
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up');
      // find target cell based on direction
      const r = Number(startCell.dataset.r), c = Number(startCell.dataset.c);
      let tr=r, tc=c;
      if(dir==='right') tc = c+1;
      if(dir==='left') tc = c-1;
      if(dir==='down') tr = r+1;
      if(dir==='up') tr = r-1;

      // bounds check
      if(tr < 0 || tr >= state.boardSize || tc < 0 || tc >= state.boardSize){ startCell=null; return; }

      const target = board.querySelector(`.cell[data-r="${tr}"][data-c="${tc}"]`);
      if(!target) { startCell=null; return; }

      // swap images
      const imgA = startCell.querySelector('img');
      const imgB = target.querySelector('img');
      if(!imgA || !imgB) { startCell=null; return; }
      const tmp = imgA.src;
      setImgSrc(imgA, imgB.src);
      setImgSrc(imgB, tmp);

      // after swap check matches; if no matches revert
      setTimeout(()=>{
        const removed = findAndRemoveMatches();
        if(removed){
          applyGravityAndRefill();
          // continue collapsing until stable
          setTimeout(collapseMatchesLoop, 120);
        } else {
          // revert swap (no match)
          setImgSrc(imgA, tmp);
          setImgSrc(imgB, imgA.src);
        }
      }, 120);

      startCell = null;
    }

    // attach listeners
    board.addEventListener('touchstart', onStart, {passive:true});
    board.addEventListener('mousedown', onStart);
    board.addEventListener('touchend', onEnd);
    board.addEventListener('mouseup', onEnd);
  }

  // Exposed functions
  window.initGame = function(){
    try {
      // load level from StorageAPI if present
      if(typeof StorageAPI !== 'undefined' && StorageAPI.getLevel){
        state.level = StorageAPI.getLevel();
      } else {
        state.level = 1;
      }
      state.score = 0;
      state.running = true;
      updateLevelUI();
      createBoard();
      updateScoreUI();
      updateCoinDisplay();
      initSwipe();
      // initial collapse to remove accidental matches on start
      setTimeout(collapseMatchesLoop, 200);
      console.log('Game initialized at level', state.level);
    } catch(e){
      console.error('initGame error', e);
    }
  };

  window.restartGame = function(){
    state.score = 0; updateScoreUI(); createBoard(); initSwipe();
    console.log('Game restarted');
  };

  window.shuffleBoard = function(){ shuffleBoard(); };

  // small shop placeholder
  window.buyFromShop = function(item){
    if(typeof StorageAPI === 'undefined' || !StorageAPI.getCoins) { console.warn('StorageAPI missing'); return; }
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const p = prices[item] || 0;
    if(StorageAPI.getCoins() >= p){
      StorageAPI.addCoins(-p);
      updateCoinDisplay();
      if(item === 'shuffle') shuffleBoard();
      console.log('Bought', item);
    } else console.warn('not enough coins');
  };

  // ensure code runs after DOM is ready
  document.addEventListener('DOMContentLoaded', function(){
    console.log('js/game.js DOMContentLoaded');
    // safe hookup for buttons (if elements exist)
    const startBtn = $id('startBtn');
    if(startBtn) startBtn.addEventListener('click', ()=> {
      // show level map (if exists) otherwise init game directly
      const map = $id('levelMap');
      if(map){
        window.showPage('levelMap');
      } else {
        window.showPage('game-screen');
        initGame();
      }
    });

    const backBtn = $id('backBtn');
    if(backBtn) backBtn.addEventListener('click', ()=>{
      window.showPage('home-screen');
    });

    const restartBtn = $id('restartBtn');
    if(restartBtn) restartBtn.addEventListener('click', ()=> window.restartGame());

    const shuffleBtn = $id('shuffleBtn');
    if(shuffleBtn) shuffleBtn.addEventListener('click', ()=> window.shuffleBoard());

    // load coin display immediately
    updateCoinDisplay();
  });

})();

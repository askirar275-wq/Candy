// js/game.js
// Self-contained game core: 6 candies, swipe in 4 directions, match detection, gravity/refill,
// level support, storage wrapper, and safe DOM checks + console logs for debugging.

(function(){
  console.log('Loaded: js/game.js');

  /* ---------- Configuration ---------- */
  const CANDY_IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  const DEFAULT_BOARD_SIZE = 8; // 8x8 by default
  const SWIPE_THRESHOLD = 20; // px minimum to treat as swipe

  const LEVELS = [ null,
    { id:1, title:'Level 1', goalScore: 500, boardSize:8, rewardCoins:50 },
    { id:2, title:'Level 2', goalScore: 1000, boardSize:8, rewardCoins:80 },
    { id:3, title:'Level 3', goalScore: 1500, boardSize:9, rewardCoins:120 },
    // add more levels...
  ];

  /* ---------- Storage helper (fallback) ---------- */
  const StorageAPI = {
    getCoins(){
      const v = localStorage.getItem('cm_coins');
      return v ? Number(v) : 0;
    },
    addCoins(n){
      const cur = StorageAPI.getCoins();
      localStorage.setItem('cm_coins', Math.max(0, cur + Number(n||0)));
    },
    getLevel(){
      const v = localStorage.getItem('cm_level');
      return v ? Number(v) : 1;
    },
    setLevel(l){
      localStorage.setItem('cm_level', Number(l||1));
    }
  };

  /* ---------- State ---------- */
  const state = {
    boardSize: DEFAULT_BOARD_SIZE,
    board: [], // flat array of candy indices (0..CANDY_IMAGES.length-1)
    score: 0,
    level: StorageAPI.getLevel(),
    running: false
  };

  /* ---------- DOM helpers ---------- */
  const $ = id => document.getElementById(id);
  function safeText(id, txt){
    const el = $(id);
    if(el) el.textContent = txt;
  }

  /* ---------- UI update functions ---------- */
  function updateScoreUI(){
    safeText('score', state.score);
  }
  function updateCoinUI(){
    const el = $('coins');
    if(el) el.textContent = StorageAPI.getCoins();
  }
  function updateLevelUI(){
    const lvl = state.level || 1;
    const info = LEVELS[lvl] || LEVELS[1];
    state.boardSize = info.boardSize || DEFAULT_BOARD_SIZE;
    safeText('currentLevel', lvl);
    // adjust CSS grid if #game-board exists
    const board = $('game-board');
    if(board){
      board.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${state.boardSize}, 1fr)`;
    }
  }

  /* ---------- Board helpers ---------- */
  function randCandyIndex(){
    return Math.floor(Math.random() * CANDY_IMAGES.length);
  }

  function initBoardArray(){
    const size = state.boardSize;
    state.board = new Array(size*size).fill(0).map(_=>randCandyIndex());
  }

  /* ---------- Render board DOM ---------- */
  function createBoardDOM(){
    const boardEl = $('game-board');
    if(!boardEl){
      console.warn('createBoardDOM: #game-board not found');
      return;
    }
    boardEl.innerHTML = '';
    const size = state.boardSize;

    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const idx = r*size + c;
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = idx;
        // image element
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.alt = 'candy';
        img.src = CANDY_IMAGES[state.board[idx]];
        cell.appendChild(img);
        boardEl.appendChild(cell);

        // add listeners: pointerdown for desktop & touch, and click fallback
        cell.addEventListener('pointerdown', handlePointerDown);
        cell.addEventListener('pointerup', handlePointerUp);
        cell.addEventListener('click', handleCellClick);
      }
    }
  }

  /* ---------- Simple selection (tap to swap) ---------- */
  let selectedIndex = null;
  function handleCellClick(e){
    const idx = Number(e.currentTarget.dataset.index);
    if(selectedIndex === null){
      selectedIndex = idx;
      e.currentTarget.classList.add('selected-cell');
      return;
    }
    if(selectedIndex === idx){
      // deselect
      const prev = document.querySelector('.selected-cell');
      if(prev) prev.classList.remove('selected-cell');
      selectedIndex = null;
      return;
    }
    // try swap
    trySwap(selectedIndex, idx);
    const prev = document.querySelector('.selected-cell');
    if(prev) prev.classList.remove('selected-cell');
    selectedIndex = null;
  }

  /* ---------- Swap / Move ---------- */
  function trySwap(a, b){
    if(!isAdjacent(a,b)) return;
    swapIndices(a,b);
    if(findMatches().length > 0){
      // valid swap -> resolve
      console.log('valid swap', a,b);
      applyMatchesAndGravity();
    } else {
      // revert swap
      swapIndices(a,b);
      console.log('invalid swap, reverted');
    }
    renderAllTiles();
  }

  function isAdjacent(a,b){
    const size = state.boardSize;
    if(a === b) return false;
    const ar = Math.floor(a/size), ac = a%size;
    const br = Math.floor(b/size), bc = b%size;
    const dr = Math.abs(ar-br), dc = Math.abs(ac-bc);
    return (dr+dc) === 1; // Manhattan distance 1
  }

  function swapIndices(a,b){
    const t = state.board[a];
    state.board[a] = state.board[b];
    state.board[b] = t;
  }

  function renderAllTiles(){
    const boardEl = $('game-board');
    if(!boardEl) return;
    const imgs = boardEl.querySelectorAll('.cell .tile');
    imgs.forEach((img, i) => {
      if(state.board[i] !== undefined) img.src = CANDY_IMAGES[state.board[i]];
    });
    updateScoreUI();
    updateCoinUI();
  }

  /* ---------- Match detection ---------- */
  // returns array of index groups to clear, e.g. [[1,2,3],[12,13,14,15],...]
  function findMatches(){
    const size = state.boardSize;
    const matches = [];
    const used = new Array(state.board.length).fill(false);

    // horizontal
    for(let r=0;r<size;r++){
      let runStart = 0;
      for(let c=1;c<=size;c++){
        const prevIdx = r*size + (c-1);
        const curIdx = r*size + c;
        const prevVal = state.board[prevIdx];
        const curVal = (c < size) ? state.board[curIdx] : null;
        if(c < size && curVal === prevVal){
          // continue run
        } else {
          const runLen = c - runStart;
          if(runLen >= 3){
            const group = [];
            for(let k=runStart;k<runStart+runLen;k++){
              const idx = r*size + k;
              group.push(idx);
              used[idx] = true;
            }
            matches.push(group);
          }
          runStart = c;
        }
      }
    }

    // vertical
    for(let c=0;c<size;c++){
      let runStart = 0;
      for(let r=1;r<=size;r++){
        const prevIdx = (r-1)*size + c;
        const curIdx = r*size + c;
        const prevVal = state.board[prevIdx];
        const curVal = (r < size) ? state.board[curIdx] : null;
        if(r < size && curVal === prevVal){
          // continue run
        } else {
          const runLen = r - runStart;
          if(runLen >= 3){
            const group = [];
            for(let k=runStart;k<runStart+runLen;k++){
              const idx = k*size + c;
              // avoid duplicating cells already cleared horizontally
              if(!used[idx]){
                group.push(idx);
                used[idx] = true;
              } else {
                // if already added in horizontal group, include still (keeps scoring correct)
                group.push(idx);
              }
            }
            if(group.length) matches.push(group);
          }
          runStart = r;
        }
      }
    }

    return matches;
  }

  /* ---------- Apply match clearing + gravity/refill ---------- */
  function applyMatchesAndGravity(){
    let totalCleared = 0;
    let loopGuard = 0;
    do {
      loopGuard++;
      if(loopGuard > 20) { console.warn('applyMatchesAndGravity: loop guard triggered'); break; }
      const groups = findMatches();
      if(groups.length === 0) break;

      // clear matched cells (set to null sentinel)
      groups.forEach(g => {
        g.forEach(idx => {
          if(state.board[idx] !== null){
            state.board[idx] = null;
            totalCleared++;
          }
        });
      });

      // simple scoring: 100 points per candy cleared
      state.score += (totalCleared * 100);
      updateScoreUI();

      // gravity: for each column, compact nulls down and refill top with new random candies
      const size = state.boardSize;
      for(let c=0;c<size;c++){
        const col = [];
        for(let r=0;r<size;r++){
          col.push(state.board[r*size + c]);
        }
        // compact
        const nonNull = col.filter(v => v !== null && v !== undefined);
        const missing = size - nonNull.length;
        const newCol = new Array(missing).fill(0).map(_=>randCandyIndex()).concat(nonNull);
        // write back
        for(let r=0;r<size;r++){
          state.board[r*size + c] = newCol[r];
        }
      }

      renderAllTiles();
      // continue loop to catch chain matches
    } while(true);

    // after all, check level completion
    checkLevelComplete();
  }

  function checkLevelComplete(){
    const lvl = state.level || 1;
    const info = LEVELS[lvl] || LEVELS[1];
    if(state.score >= (info.goalScore || Infinity)){
      // award coins and unlock next
      StorageAPI.addCoins(info.rewardCoins || 0);
      updateCoinUI();
      const next = lvl + 1;
      if(LEVELS[next]){
        StorageAPI.setLevel(next);
        state.level = next;
        updateLevelUI();
        showLevelUpModal(next, info.rewardCoins || 0);
      } else {
        showLevelUpModal(lvl, info.rewardCoins || 0, true);
      }
    }
  }

  /* ---------- Modal for level up ---------- */
  function showLevelUpModal(level, coinsReward, last=false){
    const modal = $('levelUpModal');
    if(!modal) return;
    const title = $('levelUpTitle');
    const text = $('levelUpText');
    if(title) title.textContent = last ? 'All Levels Complete!' : 'Level Up!';
    if(text) text.textContent = last ? `You finished level ${level}. Reward: ${coinsReward} coins.` :
                                      `Level ${level-1} clear! Level ${level} unlocked. Reward: ${coinsReward} coins.`;
    modal.style.display = 'flex';
  }
  function initLevelModalClose(){
    const btn = $('levelUpClose');
    if(btn){
      btn.addEventListener('click', () => {
        const modal = $('levelUpModal');
        if(modal) modal.style.display = 'none';
      });
    }
  }

  /* ---------- Shuffle Board ---------- */
  function shuffleBoard(){
    for(let i=0;i<state.board.length;i++){
      const j = Math.floor(Math.random()*state.board.length);
      const tmp = state.board[i];
      state.board[i] = state.board[j];
      state.board[j] = tmp;
    }
    renderAllTiles();
    console.log('Board shuffled');
  }

  /* ---------- Public functions ---------- */
  window.initGame = function(){
    try {
      state.level = StorageAPI.getLevel() || 1;
      updateLevelUI();
      initBoardArray();
      createBoardDOM();
      renderAllTiles();
      state.running = true;
      initLevelModalClose();
      console.log('Game initialized at level', state.level);
    } catch(e){
      console.error('initGame error', e);
    }
  };

  window.restartGame = function(){
    state.score = 0;
    initBoardArray();
    renderAllTiles();
    console.log('Game restarted');
    updateScoreUI();
  };

  window.shuffleBoard = function(){
    shuffleBoard();
  };

  window.setGameLevel = function(l){
    StorageAPI.setLevel(l);
    state.level = StorageAPI.getLevel();
    updateLevelUI();
    restartGame();
  };

  window.buyFromShop = function(item){
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const p = prices[item] || 0;
    if(StorageAPI.getCoins() >= p){
      StorageAPI.addCoins(-p);
      updateCoinUI();
      if(item === 'shuffle') shuffleBoard();
      console.log('Bought', item);
    } else {
      console.warn('Not enough coins');
    }
  };

  /* ---------- Touch / Pointer swipe support ---------- */
  // keep as top-level to avoid "not defined" errors
  let eventStartX = 0;
  let eventStartY = 0;
  let pointerStartIndex = null;

  function handlePointerDown(e){
    // normalize pointer and touch events
    const rect = e.currentTarget.getBoundingClientRect();
    const idx = Number(e.currentTarget.dataset.index);
    pointerStartIndex = idx;
    if(e.touches && e.touches[0]){
      eventStartX = e.touches[0].clientX;
      eventStartY = e.touches[0].clientY;
    } else {
      eventStartX = e.clientX;
      eventStartY = e.clientY;
    }
    // prevent default to avoid page scroll on swipe inside board
    if(e.cancelable) e.preventDefault();
  }

  function handlePointerUp(e){
    if(pointerStartIndex === null) return;
    let endX = 0, endY = 0;
    if(e.changedTouches && e.changedTouches[0]){
      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;
    } else {
      endX = e.clientX;
      endY = e.clientY;
    }
    const dx = endX - eventStartX;
    const dy = endY - eventStartY;
    if(Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD){
      pointerStartIndex = null;
      return; // ignore small movement
    }
    // determine direction (prefer larger axis)
    let dir = null;
    if(Math.abs(dx) > Math.abs(dy)){
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }
    // attempt to move selected candy in that direction
    moveCandyFromIndex(pointerStartIndex, dir);
    pointerStartIndex = null;
  }

  // Move candy by performing swap with adjacent cell based on direction if valid
  function moveCandyFromIndex(idx, direction){
    const size = state.boardSize;
    const r = Math.floor(idx/size), c = idx%size;
    let target = null;
    if(direction === 'left' && c > 0) target = idx - 1;
    if(direction === 'right' && c < size-1) target = idx + 1;
    if(direction === 'up' && r > 0) target = idx - size;
    if(direction === 'down' && r < size-1) target = idx + size;
    if(target === null) return;
    trySwap(idx, target);
  }

  /* ---------- Utility: keyboard debug (optional) ---------- */
  // arrow keys for desktop testing
  document.addEventListener('keydown', (e) => {
    // only if board exists
    const sel = document.querySelector('.selected-cell');
    if(!sel) return;
    const idx = Number(sel.dataset.index);
    if(e.key === 'ArrowLeft') moveCandyFromIndex(idx, 'left');
    if(e.key === 'ArrowRight') moveCandyFromIndex(idx, 'right');
    if(e.key === 'ArrowUp') moveCandyFromIndex(idx, 'up');
    if(e.key === 'ArrowDown') moveCandyFromIndex(idx, 'down');
  });

  /* ---------- Safe init on DOM ready ---------- */
  function safeInit(){
    // ensure required DOM nodes exist
    const boardEl = $('game-board');
    if(!boardEl){
      console.warn('safeInit: #game-board missing - waiting DOM');
      // try again after small delay (if script loaded before DOM)
      setTimeout(safeInit, 150);
      return;
    }

    // attach UI button handlers if present
    const rb = $('restartBtn');
    if(rb) rb.addEventListener('click', () => window.restartGame());

    const sb = $('shuffleBtn');
    if(sb) sb.addEventListener('click', () => window.shuffleBoard());

    // start game
    initGame();
  }

  // start after short delay so index.html elements can be present
  window.addEventListener('load', () => {
    console.log('window load -> safeInit');
    updateCoinUI();
    updateLevelUI();
    safeInit();
  });

  // Expose for console debugging
  window._CM = {
    state,
    StorageAPI,
    renderAllTiles,
    applyMatchesAndGravity,
    findMatches
  };

})();

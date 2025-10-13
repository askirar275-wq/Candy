// js/game.js
// Candy images based match-3 engine with swipe + gravity
(function(){
  'use strict';

  // CONFIG
  const BOARD_SIZE = 6; // 6x6
  const CANDY_IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];
  const MATCH_SCORE = 10;

  // STATE
  let grid = new Array(BOARD_SIZE * BOARD_SIZE).fill(null); // stores image path
  let score = 0;
  let selectedIndex = null;
  let isProcessing = false; // prevent actions while gravity/clear animating

  // DOM
  const $ = id => document.getElementById(id);
  const boardEl = $('board');
  const scoreEl = $('score');

  // safety: ensure board exists
  if(!boardEl){
    console.warn('game.js: #board element not found. Make sure index.html has <div id="board"></div>');
  }

  // Utility - random candy
  function randCandy(){
    const i = Math.floor(Math.random() * CANDY_IMAGES.length);
    return CANDY_IMAGES[i];
  }

  // Initialize grid with random candies (no initial matches)
  function fillInitialGrid(){
    for(let i=0;i<grid.length;i++){
      let tries = 0;
      do {
        grid[i] = randCandy();
        tries++;
        // try to avoid immediate matches on start
      } while(createsMatchAt(i) && tries < 6);
    }
  }

  // Create board DOM
  function renderBoard(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;

    for(let i=0;i<grid.length;i++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;

      const img = document.createElement('img');
      img.className = 'tile';
      img.draggable = false;
      img.src = grid[i] || ''; // may be null briefly

      cell.appendChild(img);
      boardEl.appendChild(cell);

      // events
      cell.addEventListener('click', onCellClick);

      // touch events for swipe
      addSwipeHandlers(cell);
    }
  }

  // Add touch handlers to detect direction swipe
  function addSwipeHandlers(cell){
    let startX = 0, startY = 0, started = false;
    cell.addEventListener('touchstart', function(e){
      if(isProcessing) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY; started = true;
    }, {passive:true});

    cell.addEventListener('touchend', function(e){
      if(!started || isProcessing) { started = false; return; }
      const t = (e.changedTouches && e.changedTouches[0]) || {};
      const dx = (t.clientX || 0) - startX;
      const dy = (t.clientY || 0) - startY;
      const threshold = 20; // min pixels to treat as swipe
      if(Math.abs(dx) < threshold && Math.abs(dy) < threshold){
        // treat as tap
        const idx = Number(cell.dataset.index);
        handleTapOrSelect(idx);
      } else {
        // determine direction
        const idx = Number(cell.dataset.index);
        if(Math.abs(dx) > Math.abs(dy)){
          if(dx > 0) trySwapDirection(idx, 'right');
          else trySwapDirection(idx, 'left');
        } else {
          if(dy > 0) trySwapDirection(idx, 'down');
          else trySwapDirection(idx, 'up');
        }
      }
      started = false;
    }, {passive:true});
  }

  // Click fallback for non-touch devices
  function onCellClick(e){
    if(isProcessing) return;
    const idx = Number(e.currentTarget.dataset.index);
    handleTapOrSelect(idx);
  }

  function handleTapOrSelect(idx){
    if(selectedIndex === null){
      selectedIndex = idx;
      highlightCell(idx, true);
    } else {
      // if same cell clicked twice -> deselect
      if(selectedIndex === idx){
        highlightCell(idx, false);
        selectedIndex = null;
        return;
      }
      // try swap if adjacent else select new
      if(areAdjacent(selectedIndex, idx)){
        swapAndProcess(selectedIndex, idx);
        highlightCell(selectedIndex, false);
        selectedIndex = null;
      } else {
        // select new cell
        highlightCell(selectedIndex, false);
        selectedIndex = idx;
        highlightCell(idx, true);
      }
    }
  }

  // highlight (simple border)
  function highlightCell(idx, on){
    const cell = boardEl && boardEl.querySelector(`.cell[data-index="${idx}"]`);
    if(cell) cell.style.boxShadow = on ? '0 0 0 3px rgba(255,90,141,0.25)' : 'none';
  }

  // check adjacency
  function areAdjacent(a,b){
    const ax = a % BOARD_SIZE, ay = Math.floor(a / BOARD_SIZE);
    const bx = b % BOARD_SIZE, by = Math.floor(b / BOARD_SIZE);
    const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
    return (dx + dy) === 1; // four-direction adjacency
  }

  // Attempt swap in direction from index
  function trySwapDirection(idx, dir){
    let swapIdx = null;
    const row = Math.floor(idx / BOARD_SIZE);
    const col = idx % BOARD_SIZE;
    if(dir === 'left' && col > 0) swapIdx = idx - 1;
    if(dir === 'right' && col < BOARD_SIZE-1) swapIdx = idx + 1;
    if(dir === 'up' && row > 0) swapIdx = idx - BOARD_SIZE;
    if(dir === 'down' && row < BOARD_SIZE-1) swapIdx = idx + BOARD_SIZE;
    if(swapIdx !== null) {
      swapAndProcess(idx, swapIdx);
    }
  }

  // swap and then run match/clear/gravity cycle
  async function swapAndProcess(i1, i2){
    if(isProcessing) return;
    isProcessing = true;
    swapGrid(i1,i2);
    animateSwap(i1,i2);
    await wait(200);

    const matches = findMatches();
    if(matches.length === 0){
      // revert swap if no match
      swapGrid(i1,i2);
      animateSwap(i1,i2);
      await wait(180);
      isProcessing = false;
      return;
    } else {
      // there are matches -> process clears + gravity, repeat until no matches
      await processMatchesCycle();
      isProcessing = false;
    }
  }

  // low-level swap in grid and DOM
  function swapGrid(i1,i2){
    const t = grid[i1]; grid[i1] = grid[i2]; grid[i2] = t;
    // immediately update DOM src
    const c1 = boardEl.querySelector(`.cell[data-index="${i1}"] img`);
    const c2 = boardEl.querySelector(`.cell[data-index="${i2}"] img`);
    if(c1) c1.src = grid[i1] || '';
    if(c2) c2.src = grid[i2] || '';
  }

  // small visual swap animation (scale temporarily)
  function animateSwap(i1,i2){
    [i1,i2].forEach(i => {
      const img = boardEl.querySelector(`.cell[data-index="${i}"] img`);
      if(img){
        img.style.transform = 'scale(0.92)';
        setTimeout(()=>{ img.style.transform = ''; }, 220);
      }
    });
  }

  // Find all matches (3 or more) horizontally & vertically
  function findMatches(){
    const matched = new Set();

    // Horizontal
    for(let r=0;r<BOARD_SIZE;r++){
      let runStart = 0;
      for(let c=1;c<=BOARD_SIZE;c++){
        const prevIdx = r*BOARD_SIZE + (c-1);
        const curIdx = r*BOARD_SIZE + c;
        const prev = grid[prevIdx];
        const cur = (c<BOARD_SIZE) ? grid[curIdx] : null;
        if(c<BOARD_SIZE && prev && cur && prev === cur){
          // continue run
        } else {
          // end run at c-1
          const runLen = c - runStart;
          if(runLen >= 3){
            for(let k=runStart;k<runStart+runLen;k++){
              matched.add(r*BOARD_SIZE + k);
            }
          }
          runStart = c;
        }
      }
    }

    // Vertical
    for(let c=0;c<BOARD_SIZE;c++){
      let runStart = 0;
      for(let r=1;r<=BOARD_SIZE;r++){
        const prevIdx = (r-1)*BOARD_SIZE + c;
        const curIdx = r*BOARD_SIZE + c;
        const prev = grid[prevIdx];
        const cur = (r<BOARD_SIZE) ? grid[curIdx] : null;
        if(r<BOARD_SIZE && prev && cur && prev === cur){
          // continue
        } else {
          const runLen = r - runStart;
          if(runLen >= 3){
            for(let k=runStart;k<runStart+runLen;k++){
              matched.add(k*BOARD_SIZE + c);
            }
          }
          runStart = r;
        }
      }
    }

    return Array.from(matched);
  }

  // Check if placing current candy at index creates immediate match (used during initial fill)
  function createsMatchAt(idx){
    // temporarily assume grid[idx] set; check neighbors horizontally and vertically
    const val = grid[idx];
    if(!val) return false;

    const r = Math.floor(idx / BOARD_SIZE);
    const c = idx % BOARD_SIZE;

    // check horizontal left x2
    if(c>=2 && grid[r*BOARD_SIZE + (c-1)] === val && grid[r*BOARD_SIZE + (c-2)] === val) return true;
    // left+right
    if(c>=1 && c<BOARD_SIZE-1 && grid[r*BOARD_SIZE + (c-1)] === val && grid[r*BOARD_SIZE + (c+1)] === val) return true;
    // right x2
    if(c<BOARD_SIZE-2 && grid[r*BOARD_SIZE + (c+1)] === val && grid[r*BOARD_SIZE + (c+2)] === val) return true;

    // vertical up x2
    if(r>=2 && grid[(r-1)*BOARD_SIZE + c] === val && grid[(r-2)*BOARD_SIZE + c] === val) return true;
    // up+down
    if(r>=1 && r<BOARD_SIZE-1 && grid[(r-1)*BOARD_SIZE + c] === val && grid[(r+1)*BOARD_SIZE + c] === val) return true;
    // down x2
    if(r<BOARD_SIZE-2 && grid[(r+1)*BOARD_SIZE + c] === val && grid[(r+2)*BOARD_SIZE + c] === val) return true;

    return false;
  }

  // Process matches until none remain: clear, gravity, refill
  async function processMatchesCycle(){
    while(true){
      const matches = findMatches();
      if(matches.length === 0) break;

      // mark cleared visually (fade)
      matches.forEach(i => {
        const img = boardEl.querySelector(`.cell[data-index="${i}"] img`);
        if(img){
          img.style.transition = 'opacity 220ms';
          img.style.opacity = '0';
        }
      });

      await wait(240);

      // clear matched (set null)
      matches.forEach(i => grid[i] = null);

      // update score
      score += matches.length * MATCH_SCORE;
      if(scoreEl) scoreEl.textContent = score;

      // gravity: for each column, let candies fall down
      for(let c=0;c<BOARD_SIZE;c++){
        let writeRow = BOARD_SIZE - 1;
        for(let r=BOARD_SIZE-1;r>=0;r--){
          const idx = r*BOARD_SIZE + c;
          if(grid[idx] !== null){
            // move down to writeRow if different
            const writeIdx = writeRow*BOARD_SIZE + c;
            if(writeIdx !== idx){
              grid[writeIdx] = grid[idx];
              grid[idx] = null;
            }
            writeRow--;
          }
        }
        // fill empty top slots with new candies
        for(let r = writeRow; r>=0; r--){
          const idx = r*BOARD_SIZE + c;
          grid[idx] = randCandy();
        }
      }

      // re-render and animate refill (fade in)
      renderBoard();
      // fade in newly filled images
      boardEl.querySelectorAll('.cell img').forEach(img => {
        img.style.opacity = '0';
        img.style.transition = 'opacity 240ms';
        setTimeout(()=>{ img.style.opacity = '1'; }, 40);
      });

      // small pause to let animation run
      await wait(300);
    }
  }

  // helper wait
  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

  // PUBLIC: init function
  window.initGame = function(){
    try {
      score = 0;
      if(scoreEl) scoreEl.textContent = score;
      fillInitialGrid();
      renderBoard();
      console.log('Game initialized');
    } catch(err){
      console.error('initGame error', err);
    }
  };

  // Optional: restart
  window.restartGame = function(){
    if(isProcessing) return;
    initGame();
    console.log('Game restarted');
  };

  // Optional: shuffle board (randomize)
  window.shuffleBoard = function(){
    if(isProcessing) return;
    for(let i=0;i<grid.length;i++) grid[i] = randCandy();
    renderBoard();
    console.log('Board shuffled');
  };

  // Expose quick debug addScore
  window.addScore = function(n){
    score += Number(n||0);
    if(scoreEl) scoreEl.textContent = score;
  };

  // Initialize on DOM ready if board exists
  document.addEventListener('DOMContentLoaded', () => {
    // if page's play button calls initGame itself, it's fine.
    // We initialize board empty so UI shows something.
    if(boardEl) {
      // create empty cells so layout is defined before start
      boardEl.innerHTML = '';
      boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
      for(let i=0;i<BOARD_SIZE*BOARD_SIZE;i++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        const img = document.createElement('img');
        img.className = 'tile';
        img.src = ''; img.draggable=false;
        cell.appendChild(img);
        boardEl.appendChild(cell);
      }
    }
    console.log('Loaded: js/game.js');
  });

  // Eruda console (mobile debug)
  (function () {
    try {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/eruda';
      s.onload = function () { try{ eruda.init(); console.log('Eruda Console चालू'); } catch(e){ console.warn('Eruda init failed', e); } };
      document.body.appendChild(s);
    } catch(e){
      console.warn('Eruda load error', e);
    }
  })();

})();

// File: js/game.js
// Simple, robust core for Candy Match.
// Requires an element with id="gameGrid" inside container; cells created by this script.
// Exports global Game with start(level) and getState()

(function(global){
  'use strict';

  // ---- Config ----
  const DEFAULT_ROWS = 6;
  const DEFAULT_COLS = 6;
  const CANDY_COUNT = 6; // number of candy types (1..CANDY_COUNT)
  const SCORE_PER_TILE = 10; // per matched tile (3-match => 30)
  const SWAP_ANIM_MS = 140;

  // ---- Utilities ----
  const log = (...args) => console.log('[CORE]', ...args);
  const warn = (...args) => console.warn('[CORE]', ...args);
  const fail = (...args) => console.error('[CORE]', ...args);
  const safePlaySound = (name) => {
    try { if(global.Sound && typeof global.Sound.play === 'function') global.Sound.play(name);
    } catch(e){ /* ignore */ }
  };
  const safeConfetti = ()=> {
    try { if(global.Confetti && typeof global.Confetti.fire === 'function') global.Confetti.fire(); }
    catch(e){}
  };

  // ---- State ----
  let state = {
    level: 1,
    rows: DEFAULT_ROWS,
    cols: DEFAULT_COLS,
    board: [], // 2D array [r][c] numeric candy id
    score: 0,
    moves: 30,
    target: 600,
    running: false, // game running for interactions
  };

  // DOM refs (will be set on init)
  let gridEl = null;   // element with id="gameGrid"
  let cardEl = null;   // board container
  let listenersAttached = false;

  // Hooks (optional) — UI can set these
  const hooks = {
    onUpdate: null, // function(state) called after updates
    onRender: null, // function() called after grid render
    onLevelComplete: null,
    onGameOver: null,
  };

  // ---- Helpers ----
  function clampInt(v, min, max){ return Math.max(min, Math.min(max, Math.floor(v))); }

  function randCandy(){ return 1 + Math.floor(Math.random()*CANDY_COUNT); }

  function copyBoard(b){
    return b.map(row => row.slice());
  }

  function coordsValid(r,c){
    return r>=0 && c>=0 && r<state.rows && c<state.cols;
  }

  // ---- Board build & render ----
  function buildEmptyBoard(rows, cols){
    const b = new Array(rows);
    for(let r=0;r<rows;r++){
      b[r] = new Array(cols).fill(0);
    }
    return b;
  }

  function fillRandomBoard(board){
    for(let r=0;r<board.length;r++){
      for(let c=0;c<board[0].length;c++){
        board[r][c] = randCandy();
      }
    }
    return board;
  }

  // ensure no immediate matches on start: simple re-roll
  function removeInitialMatches(board){
    const rows = board.length, cols = board[0].length;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        let tries=0;
        while(hasMatchAt(board, r, c) && tries<20){
          board[r][c] = randCandy();
          tries++;
        }
      }
    }
  }

  // Render grid into DOM
  function renderGrid(){
    if(!gridEl) return;
    gridEl.innerHTML = ''; // clear
    gridEl.style.setProperty('--cols', state.cols);

    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        // candy image
        const id = state.board[r][c];
        const img = document.createElement('img');
        img.alt = (id ? 'candy' + id : '');
        // image path: images/candy1.png ... candy6.png (ensure these exist)
        img.src = id ? `images/candy${id}.png` : '';
        cell.appendChild(img);
        gridEl.appendChild(cell);
      }
    }

    if(typeof hooks.onRender === 'function'){
      try { hooks.onRender(); } catch(e){ warn('hook onRender failed', e); }
    }
  }

  // ---- Match detection ----
  // return true if there's a match including board[r][c]
  function hasMatchAt(board, r, c){
    const val = board[r][c];
    if(!val) return false;
    // horizontal
    let cnt = 1;
    for(let cc=c-1; cc>=0 && board[r][cc]===val; cc--) cnt++;
    for(let cc=c+1; cc<board[0].length && board[r][cc]===val; cc++) cnt++;
    if(cnt>=3) return true;
    // vertical
    cnt = 1;
    for(let rr=r-1; rr>=0 && board[rr][c]===val; rr--) cnt++;
    for(let rr=r+1; rr<board.length && board[rr][c]===val; rr++) cnt++;
    return cnt>=3;
  }

  // find all matches: returns array of {r,c} cells to clear
  function findMatches(board){
    const rows = board.length, cols = board[0].length;
    const toClear = new Set();

    // horizontal runs
    for(let r=0;r<rows;r++){
      let c=0;
      while(c<cols){
        const v = board[r][c];
        if(!v){ c++; continue; }
        let run = 1;
        while(c+run<cols && board[r][c+run]===v) run++;
        if(run>=3){
          for(let k=0;k<run;k++) toClear.add(`${r},${c+k}`);
        }
        c += run;
      }
    }

    // vertical runs
    for(let c=0;c<cols;c++){
      let r=0;
      while(r<rows){
        const v = board[r][c];
        if(!v){ r++; continue; }
        let run = 1;
        while(r+run<rows && board[r+run][c]===v) run++;
        if(run>=3){
          for(let k=0;k<run;k++) toClear.add(`${r+k},${c}`);
        }
        r += run;
      }
    }

    // convert set to coords
    return Array.from(toClear).map(s => {
      const [r,c] = s.split(',').map(Number);
      return {r,c};
    });
  }

  // ---- Swap & gravity ----
  function swapCoords(a,b){
    const tmp = state.board[a.r][a.c];
    state.board[a.r][a.c] = state.board[b.r][b.c];
    state.board[b.r][b.c] = tmp;
  }

  // apply gravity: tiles fall down, new tiles appear at top
  function applyGravityAndRefill(){
    const rows = state.rows, cols = state.cols;
    for(let c=0;c<cols;c++){
      let write = rows-1;
      for(let r=rows-1;r>=0;r--){
        if(state.board[r][c]){
          state.board[write][c] = state.board[r][c];
          if(write!==r) state.board[r][c] = 0;
          write--;
        }
      }
      // fill rest with new candies
      for(let r=write;r>=0;r--){
        state.board[r][c] = randCandy();
      }
    }
  }

  // resolve matches (single-pass: find -> clear -> gravity -> repeat until no more)
  async function resolveMatchesChain(){
    let totalCleared = 0;
    while(true){
      const matches = findMatches(state.board);
      if(matches.length===0) break;
      // clear matched cells
      for(const m of matches){
        state.board[m.r][m.c] = 0;
      }
      // score: each cleared tile SCORE_PER_TILE
      state.score += matches.length * SCORE_PER_TILE;
      totalCleared += matches.length;

      // render clear (UI may animate)
      renderGrid();
      safePlaySound('pop'); // sound when tiles cleared
      updateUI();

      // small pause so UI can show disappearance
      await delay(160);

      // gravity + refill
      applyGravityAndRefill();
      renderGrid();
      safePlaySound('drop');
      updateUI();

      // pause again slightly to settle
      await delay(120);
    }
    return totalCleared;
  }

  // ---- Utility async delay ----
  function delay(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

  // ---- UI update hook ----
  function updateUI(){
    if(typeof hooks.onUpdate === 'function'){
      try { hooks.onUpdate(state); } catch(e){ warn('onUpdate hook failed', e); }
    } else {
      // fallback console log
      log('state', {score: state.score, moves: state.moves, rows: state.rows, cols: state.cols});
    }
  }

  // ---- Check end conditions ----
  function checkWin(){
    if(state.score >= state.target){
      safePlaySound('win');
      safeConfetti();
      state.running = false;
      if(typeof hooks.onLevelComplete === 'function'){
        try { hooks.onLevelComplete(state); } catch(e){ warn('onLevelComplete failed', e); }
      }
    } else if(state.moves <= 0){
      state.running = false;
      if(typeof hooks.onGameOver === 'function'){
        try { hooks.onGameOver(state); } catch(e){ warn('onGameOver failed', e); }
      }
    }
  }

  // ---- Robust input handlers (replace previous fragile version) ----
  // We'll implement attachHandlers() that maps touch/mouse to swaps.
  function attachHandlers(){
    if(!gridEl) return;
    if(listenersAttached) return;
    listenersAttached = true;

    let startCell = null;
    let dragging = false;
    let clone = null;

    function getPointer(e){
      if(!e) return null;
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
      if(t && typeof t.clientX === 'number' && typeof t.clientY === 'number') {
        return { clientX: t.clientX, clientY: t.clientY };
      }
      if(typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        return { clientX: e.clientX, clientY: e.clientY };
      }
      return null;
    }

    function cellFromPoint(p){
      if(!p) return null;
      const el = document.elementFromPoint(p.clientX, p.clientY);
      if(!el) return null;
      const cell = el.closest('.cell');
      if(!cell) return null;
      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);
      if(!Number.isFinite(r) || !Number.isFinite(c)) return null;
      return { r, c, el: cell };
    }

    function createClone(el){
      if(!el) return null;
      const c = el.cloneNode(true);
      c.classList.add('dragging-clone');
      document.body.appendChild(c);
      return c;
    }
    function moveClone(c,p){
      if(!c || !p) return;
      c.style.left = p.clientX + 'px';
      c.style.top  = p.clientY + 'px';
    }
    function removeClone(c){ if(c) c.remove(); }

    function onStart(e){
      if(!state.running) return;
      const p = getPointer(e);
      if(!p) return;
      const info = cellFromPoint(p);
      if(!info) return;
      startCell = { r: info.r, c: info.c };
      dragging = true;
      clone = createClone(info.el);
      if(clone) moveClone(clone, p);
      if(e.cancelable) e.preventDefault();
    }

    function onMove(e){
      if(!dragging) return;
      const p = getPointer(e);
      if(!p) return;
      if(clone) moveClone(clone, p);
      if(e.cancelable) e.preventDefault();
    }

    async function onEnd(e){
      if(!dragging || !startCell){ dragging=false; removeClone(clone); clone=null; startCell=null; return; }
      const p = getPointer(e);
      let endInfo = p ? cellFromPoint(p) : null;

      // fallback: try element at clone center if p missing
      if(!endInfo && clone){
        const rect = clone.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        endInfo = cellFromPoint({clientX: cx, clientY: cy});
      }

      removeClone(clone); clone = null;
      dragging = false;

      if(!endInfo){ startCell = null; return; }

      const endCell = { r: endInfo.r, c: endInfo.c };

      // validate adjacency
      const dr = Math.abs(startCell.r - endCell.r);
      const dc = Math.abs(startCell.c - endCell.c);
      if((dr===1 && dc===0) || (dr===0 && dc===1)){
        // perform swap
        swapCoords(startCell, endCell);
        renderGrid();
        safePlaySound('swap');
        // reduce moves
        state.moves = Math.max(0, state.moves - 1);
        updateUI();

        // check for matches; if none revert
        const matches = findMatches(state.board);
        if(matches.length>0){
          await delay(SWAP_ANIM_MS);
          await resolveMatchesChain();
          updateUI();
          checkWin();
        } else {
          // revert animation (small delay)
          await delay(SWAP_ANIM_MS);
          swapCoords(startCell, endCell);
          renderGrid();
        }
      }
      startCell = null;
    }

    // attach events
    gridEl.addEventListener('touchstart', onStart, {passive:false});
    gridEl.addEventListener('touchmove', onMove, {passive:false});
    gridEl.addEventListener('touchend', onEnd, {passive:false});
    gridEl.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    log('input handlers attached');
  }

  // ---- Public API ----
  const GameCore = {
    // init with optional DOM ids
    init(opts){
      opts = opts || {};
      gridEl = document.getElementById(opts.gridId || 'gameGrid');
      cardEl = document.getElementById(opts.cardId || 'boardCard');
      if(!gridEl) warn('gameGrid element not found');
      if(!cardEl) warn('boardCard element not found');
      log('init');
      // attach handlers when DOM present
      attachHandlers();
    },

    start(level){
      level = level || 1;
      state.level = level;
      // scale rows/cols by level or keep default
      state.rows = DEFAULT_ROWS;
      state.cols = DEFAULT_COLS;
      state.score = 0;
      state.moves = 30;
      state.target = 600 * level; // example scaling
      state.running = true;

      // build board
      state.board = buildEmptyBoard(state.rows, state.cols);
      fillRandomBoard(state.board);
      removeInitialMatches(state.board);
      renderGrid();
      updateUI();
      log('start level', level, 'size', state.rows, state.cols);
      return state;
    },

    // UI hooks
    setHooks(h){
      Object.assign(hooks, h || {});
    },

    // small util
    getState(){ return JSON.parse(JSON.stringify(state)); },

    // restart same level
    restart(){
      return this.start(state.level);
    },

    // shuffle (randomize)
    shuffle(){
      fillRandomBoard(state.board);
      removeInitialMatches(state.board);
      renderGrid();
      updateUI();
      if(typeof hooks.onUpdate === 'function') hooks.onUpdate(state);
      log('shuffle');
    }
  };

  // init on DOM ready automatically if script loaded late
  document.addEventListener('DOMContentLoaded', ()=>{
    try {
      GameCore.init({ gridId: 'gameGrid', cardId: 'boardCard' });
      log('DOM ready, GameCore initialized');
    } catch(e){
      fail('init error', e);
    }
  });

  // export
  global.Game = global.Game || {};
  global.Game.Core = GameCore;
  // backward compatibility
  global.Game.start = function(lvl){ return GameCore.start(lvl); };
  global.Game.getState = function(){ return GameCore.getState(); };

})(window);

/* game-core.js
   Core game logic: board state, match detection, gravity/refill, Game.start(), event dispatch
*/

(function(){
  // lightweight Eruda logger fallback
  function log(...args){ if(window.eruda) console.log(...args); else console.log(...args); }
  function warn(...args){ if(window.eruda) console.warn(...args); else console.warn(...args); }
  function err(...args){ if(window.eruda) console.error(...args); else console.error(...args); }

  // Config
  const CANDY_TYPES = [
    'candy-red','candy-green','candy-yellow','candy-pink','candy-donut','candy-ring'
  ]; // map to img names or classes used by UI
  const DEFAULT_COLS = 6;
  const DEFAULT_ROWS = 6;

  // Sound & Confetti safe wrappers
  const Sound = window.Sound || {
    play: (...a)=>{ log('[SoundStub] play', ...a); },
    init: ()=>{ log('[SoundStub] init'); }
  };
  const Confetti = window.Confetti || { fire: ()=>{ log('[Confetti] fire'); } };

  // Game namespace
  const Game = window.Game = window.Game || {};

  // internal state
  const state = {
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    board: [],    // 2D array [r][c] of {type, id}
    score: 0,
    moves: 30,
    target: 600,
    timerSec: null,
    running: false,
    level: 1,
    busy: false
  };

  // small id generator
  let idCounter = 1;
  function makeCell(type){
    return { id: idCounter++, type: type || randomCandy() };
  }
  function randomCandy(){
    return CANDY_TYPES[Math.floor(Math.random()*CANDY_TYPES.length)];
  }

  // build initial board without immediate matches
  function buildBoard(rows, cols){
    state.rows = rows; state.cols = cols;
    const b = [];
    for(let r=0;r<rows;r++){
      b[r]=[];
      for(let c=0;c<cols;c++){
        let cell;
        do {
          cell = makeCell(randomCandy());
          b[r][c] = cell;
        } while(checkImmediateMatch(b, r, c));
      }
    }
    state.board = b;
    return b;
  }
  // avoid creating immediate 3-in-a-row when initialising
  function checkImmediateMatch(board, r, c){
    const t = board[r][c].type;
    // check left two
    if(c>=2 && board[r][c-1] && board[r][c-2] && board[r][c-1].type === t && board[r][c-2].type === t) return true;
    // check up two
    if(r>=2 && board[r-1] && board[r-2] && board[r-1][c].type === t && board[r-2][c].type === t) return true;
    return false;
  }

  // utility swap (r1,c1) <-> (r2,c2)
  function swapCells(r1,c1,r2,c2){
    const tmp = state.board[r1][c1];
    state.board[r1][c1] = state.board[r2][c2];
    state.board[r2][c2] = tmp;
  }

  // find matches: returns array of groups [{cells:[{r,c}], type}]
  function findAllMatches(){
    const rows = state.rows, cols = state.cols;
    const visited = Array(rows).fill(0).map(()=>Array(cols).fill(false));
    const groups = [];

    // horizontal
    for(let r=0;r<rows;r++){
      let start=0;
      for(let c=1;c<=cols;c++){
        const prev = (c-1>=0) ? state.board[r][c-1] : null;
        const cur  = (c<cols) ? state.board[r][c] : null;
        if(cur && prev && cur.type === prev.type) {
          // continue run
        } else {
          const runLen = c - start;
          if(runLen >= 3){
            const type = state.board[r][start].type;
            const cells = [];
            for(let k=start;k<c;k++) cells.push({r, c:k});
            groups.push({cells, type});
          }
          start = c;
        }
      }
    }
    // vertical
    for(let c=0;c<cols;c++){
      let start=0;
      for(let r=1;r<=rows;r++){
        const prev = (r-1>=0) ? state.board[r-1][c] : null;
        const cur  = (r<rows) ? state.board[r][c] : null;
        if(cur && prev && cur.type === prev.type){
          // continue
        } else {
          const runLen = r - start;
          if(runLen >= 3){
            const type = state.board[start][c].type;
            const cells=[];
            for(let k=start;k<r;k++) cells.push({r:k, c});
            groups.push({cells, type});
          }
          start = r;
        }
      }
    }
    return groups;
  }

  // clear groups (removes cells -> marks null), returns total removed count
  function clearGroups(groups){
    let removed = 0;
    groups.forEach(g=>{
      g.cells.forEach(cell=>{
        if(state.board[cell.r][cell.c]) {
          state.board[cell.r][cell.c] = null;
          removed++;
        }
      });
    });
    return removed;
  }

  // apply gravity & refill: columns fall down, new cells on top
  function applyGravityAndRefill(){
    const rows = state.rows, cols = state.cols;
    for(let c=0;c<cols;c++){
      let write = rows-1;
      for(let r=rows-1;r>=0;r--){
        if(state.board[r][c]){
          if(write !== r){
            state.board[write][c] = state.board[r][c];
            state.board[r][c] = null;
          }
          write--;
        }
      }
      // fill empty on top
      for(let r=write;r>=0;r--){
        state.board[r][c] = makeCell(randomCandy());
      }
    }
  }

  // score calculation: base 100 per candy, combos + multipliers
  function computeScoreForRemoved(count){
    // basic: 100 per candy, bonus for >3
    const base = 100 * count;
    const bonus = (count>=4) ? (count-3)*150 : 0;
    return base + bonus;
  }

  // process matches until no more auto-matches
  function resolveAllMatches(){
    let totalRemoved = 0;
    let totalScore = 0;
    while(true){
      const groups = findAllMatches();
      if(groups.length === 0) break;
      const removed = clearGroups(groups);
      const s = computeScoreForRemoved(removed);
      totalRemoved += removed;
      totalScore += s;
      applyGravityAndRefill();
    }
    if(totalRemoved>0){
      state.score += totalScore;
      // notify listeners
      window.dispatchEvent(new CustomEvent('game-score', { detail: { score: state.score } }));
      return { removed: totalRemoved, score: totalScore };
    }
    return null;
  }

  // trySwap: swap two adjacent cells, if creates matches keep, else swap back and return false
  function trySwap(r1,c1,r2,c2){
    if(state.busy) return false;
    // ensure adjacency
    const dr = Math.abs(r1-r2), dc = Math.abs(c1-c2);
    if((dr+dc)!==1) return false;
    state.busy = true;
    swapCells(r1,c1,r2,c2);
    let groups = findAllMatches();
    if(groups.length === 0){
      // invalid swap, revert
      swapCells(r1,c1,r2,c2);
      state.busy = false;
      window.dispatchEvent(new CustomEvent('swap-invalid',{detail:{r1,c1,r2,c2}}));
      return false;
    }
    // valid swap; one move used
    state.moves = Math.max(0, state.moves-1);
    window.dispatchEvent(new CustomEvent('move-used',{detail:{moves:state.moves}}));
    // clear and resolve chain reactions
    let res = clearGroups(groups);
    applyGravityAndRefill();
    // chain resolve (loop)
    let extra = resolveAllMatches();
    let gained = 0;
    if(extra) gained = extra.score;
    else {
      // compute score for first removed
      gained = computeScoreForRemoved(res);
      state.score += gained;
    }
    // sound
    try { Sound.play('pop'); } catch(e){ warn('sound pop failed', e); }
    // notify
    window.dispatchEvent(new CustomEvent('game-swap', { detail: { r1,c1,r2,c2, gained } }));
    state.busy = false;

    // check win
    if(state.score >= state.target){
      try { Sound.play('win'); } catch(e) {}
      try { Confetti.fire(); } catch(e) {}
      window.dispatchEvent(new CustomEvent('level-complete',{detail:{level:state.level, score:state.score}}));
      // stop running
      state.running = false;
    } else if(state.moves <= 0){
      window.dispatchEvent(new CustomEvent('game-over',{detail:{score:state.score}}));
      state.running = false;
    }

    return true;
  }

  // public API
  Game._state = state;
  Game.buildBoard = buildBoard;
  Game.trySwap = trySwap;
  Game.resolveAllMatches = resolveAllMatches;

  Game.start = function(level){
    try {
      log('[CORE] start level', level);
      const cols = DEFAULT_COLS;
      const rows = DEFAULT_ROWS;
      state.level = parseInt(level||1,10);
      state.target = 600 * state.level; // simple scaling
      state.score = 0;
      state.moves = 30;
      state.timerSec = null;
      state.running = true;
      state.busy = false;
      buildBoard(rows, cols);
      // dispatch ready
      try { window.dispatchEvent(new Event('game-ready')); } catch(e){ log('[CORE] dispatch failed', e); }
      log('[CORE] started & dispatched game-ready');
      // auto-resolve any initial accidental matches (shouldn't be)
      resolveAllMatches();
      window.dispatchEvent(new CustomEvent('game-started', {detail:{level:state.level}}));
    } catch(e){
      err('[CORE] start failed', e);
    }
  };

  // helper for index.js starter if needed
  window.addEventListener('load', ()=> {
    // if URL has ?level=... and Game.start not called, do a safe start
    const url = new URL(location.href);
    const lvl = parseInt(url.searchParams.get('level')||'1',10);
    // only start if not started already
    if(!state.running){
      try {
        // small defer to let UI scripts attach listeners
        setTimeout(()=> {
          if(!state.running) Game.start(lvl);
        }, 120);
      } catch(e){ err('autostart failed', e); }
    }
  });

  // Expose debug
  Game._debug = {
    findAllMatches, clearGroups, applyGravityAndRefill, computeScoreForRemoved
  };

  log('[CORE] loaded');

})();

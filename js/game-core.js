// js/game-core.js
// Simple core: board, swap, detect matches(3+), remove, collapse + refill, score & moves.
// Defensive: doesn't assume DOM or Sound.

window.Game = (function(){
  const log = (...a)=> console.log('[Game]', ...a);
  const rnd = (n)=> Math.floor(Math.random()*n);

  // default config
  const cfg = {
    rows: 6,
    cols: 6,
    candyTypes: 6,
    startMoves: 30,
    baseScorePerCandy: 10
  };

  let state = null;

  function makeBoard(){
    const b = [];
    for(let r=0;r<cfg.rows;r++){
      b[r]=[];
      for(let c=0;c<cfg.cols;c++){
        b[r][c] = 1 + rnd(cfg.candyTypes);
      }
    }
    return b;
  }

  function newState(level=1){
    return {
      level: Number(level)||1,
      rows: cfg.rows,
      cols: cfg.cols,
      board: makeBoard(),
      score:0,
      moves: cfg.startMoves,
      target: (level===1?600: (level===2?900:1200))
    };
  }

  function start(level){
    state = newState(level);
    // ensure no immediate matches: quick fix by shuffling until no immediate 3-in-row (limited tries)
    for(let t=0;t<20;t++){
      const m = findMatches(state.board);
      if(m.length===0) break;
      // shuffle few tiles
      for(let i=0;i<m.length;i++){
        const pt = m[i][0];
        const r = pt.r, c=pt.c;
        state.board[r][c] = 1 + rnd(cfg.candyTypes);
      }
    }
    dispatch('game-ready');
    dispatch('game-started', { level: state.level });
    log('start level', state.level, 'size', cfg.rows, cfg.cols);
    return state;
  }

  function getState(){ return state; }

  function inBounds(r,c){ return r>=0 && c>=0 && r<cfg.rows && c<cfg.cols; }

  // swap two tiles (immediately modifies board)
  function swap(r1,c1,r2,c2){
    if(!state) return false;
    if(!inBounds(r1,c1) || !inBounds(r2,c2)) return false;
    const tmp = state.board[r1][c1];
    state.board[r1][c1] = state.board[r2][c2];
    state.board[r2][c2] = tmp;
    return true;
  }

  // find matches: returns array of arrays of coordinates grouped per tile matched
  function findMatches(board){
    const rows = cfg.rows, cols = cfg.cols;
    const seen = Array.from({length:rows}, ()=> Array(cols).fill(false));
    const groups = [];

    // horizontal
    for(let r=0;r<rows;r++){
      let runVal = null, runStart = 0;
      for(let c=0;c<=cols;c++){
        const val = (c<cols) ? board[r][c] : null;
        if(val === runVal){
          // continue
        } else {
          const runLen = c - runStart;
          if(runVal !== null && runLen >= 3){
            const group = [];
            for(let cc=runStart; cc<c; cc++) group.push({r, c:cc});
            groups.push(group);
          }
          runVal = val;
          runStart = c;
        }
      }
    }

    // vertical
    for(let c=0;c<cols;c++){
      let runVal = null, runStart = 0;
      for(let r=0;r<=rows;r++){
        const val = (r<rows) ? board[r][c] : null;
        if(val === runVal){
        } else {
          const runLen = r - runStart;
          if(runVal !== null && runLen >= 3){
            const group = [];
            for(let rr=runStart; rr<r; rr++) group.push({r:rr, c});
            groups.push(group);
          }
          runVal = val;
          runStart = r;
        }
      }
    }

    return groups;
  }

  // remove groups -> set to 0 (empty) ; returns total removed count
  function removeGroups(groups){
    if(!groups || groups.length===0) return 0;
    let removed = 0;
    groups.forEach(group=>{
      group.forEach(pt=>{
        const r=pt.r, c=pt.c;
        if(state.board[r][c] !== 0){
          state.board[r][c] = 0;
          removed++;
        }
      });
    });
    return removed;
  }

  // collapse gravity: for each column, drop non-zero down and fill new on top
  function collapseAndRefill(){
    const rows = cfg.rows, cols = cfg.cols;
    for(let c=0;c<cols;c++){
      const colVals = [];
      for(let r=rows-1;r>=0;r--){
        if(state.board[r][c] !== 0) colVals.push(state.board[r][c]);
      }
      // now colVals holds bottom-up existing tiles
      let rPointer = rows-1;
      for(let k=0;k<colVals.length;k++){
        state.board[rPointer][c] = colVals[k];
        rPointer--;
      }
      // fill remaining on top with random
      while(rPointer>=0){
        state.board[rPointer][c] = 1 + rnd(cfg.candyTypes);
        rPointer--;
      }
    }
  }

  // check matches and resolve loop — returns total removed & score gained
  function checkResolveLoop(){
    let totalRemoved = 0;
    let totalScore = 0;
    let loopCount = 0;
    while(true){
      loopCount++;
      const groups = findMatches(state.board);
      if(!groups || groups.length===0) break;
      const removed = removeGroups(groups);
      totalRemoved += removed;
      // score: base per candy * removed * combo multiplier (simple)
      const multiplier = Math.max(1, loopCount);
      const pts = removed * cfg.baseScorePerCandy * multiplier;
      totalScore += pts;
      // collapse and refill
      collapseAndRefill();
      // small safety limit
      if(loopCount > 10) break;
    }
    // apply score
    state.score += totalScore;
    return { removed: totalRemoved, points: totalScore };
  }

  // an utility for UI to call: attempt swap and resolve; if swap leads to no match, it should be swapped back by caller or here.
  function attemptSwapAndResolve(r1,c1,r2,c2){
    if(!state) return { ok:false };
    if(!inBounds(r1,c1) || !inBounds(r2,c2)) return { ok:false };
    // swap
    swap(r1,c1,r2,c2);
    // test if any match
    const groups = findMatches(state.board);
    if(groups.length === 0){
      // swap back
      swap(r1,c1,r2,c2);
      return { ok:false };
    }
    // valid: decrement moves
    state.moves = Math.max(0, state.moves - 1);
    // resolve
    const res = checkResolveLoop();
    // return result
    return { ok:true, removed: res.removed, points: res.points };
  }

  function makeBoardClean(){ state.board = makeBoard(); return state.board; }

  function dispatch(event, detail){
    try { window.dispatchEvent(new CustomEvent(event, {detail})); } catch(e){ log('dispatch fail', e); }
  }

  return {
    start,
    getState,
    swap,
    attemptSwapAndResolve,
    makeBoard: makeBoardClean,
    cfg
  };
})();

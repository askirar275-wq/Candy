// js/game-core.js
// Core mechanics: grid, random fill, match detection, collapse, refill, scoring, moves.
// Simple event emitter pattern: onUpdate(callback) called with state every time.

const GameCore = (function(){
  const ROWS = 7; // you can reduce for small screens
  const COLS = 7;
  const TYPES = 6; // candy1..candy6
  let listeners = [];
  let state = null;

  function randomType(){ return Math.floor(Math.random()*TYPES)+1; }

  function makeEmptyGrid(){ const g=[]; for(let r=0;r<ROWS;r++){ g[r]=[]; for(let c=0;c<COLS;c++) g[r][c]=0; } return g; }

  function refillGrid(grid){
    for(let c=0;c<COLS;c++){
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c] === 0){
          // find above non-zero
          let k = r-1;
          while(k>=0 && grid[k][c]===0) k--;
          if(k>=0){ grid[r][c] = grid[k][c]; grid[k][c]=0; r++; continue; }
          else { grid[r][c] = randomType(); }
        }
      }
    }
    return grid;
  }

  // find all matches (>=3 in row or col). Return array of positions to clear
  function findMatches(grid){
    const toClear = Array.from({length:ROWS},()=>Array(COLS,false));
    // horizontal
    for(let r=0;r<ROWS;r++){
      let start=0;
      for(let c=1;c<=COLS;c++){
        if(c< COLS && grid[r][c] && grid[r][c] === grid[r][start]) continue;
        const len = c - start;
        if(len >= 3){
          for(let x=start;x<c;x++) toClear[r][x]=true;
        }
        start = c;
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let start=0;
      for(let r=1;r<=ROWS;r++){
        if(r<ROWS && grid[r][c] && grid[r][c] === grid[start][c]) continue;
        const len = r - start;
        if(len >= 3){
          for(let y=start;y<r;y++) toClear[y][c]=true;
        }
        start = r;
      }
    }
    // collect
    const positions = [];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(toClear[r][c]) positions.push([r,c]);
    return positions;
  }

  function cloneGrid(g){
    return g.map(row => row.slice());
  }

  function emit(){
    listeners.forEach(fn => {
      try { fn(state); } catch(e){ console.error('onUpdate handler error', e); }
    });
  }

  function start(level){
    // simple level meta: target increases with level
    const levelNum = Math.max(1, Math.floor(level || 1));
    const target = 600 + (levelNum-1)*200;
    const moves = 30;
    state = {
      level: levelNum,
      score: 0,
      moves: moves,
      target: target,
      grid: makeEmptyGrid(),
      isAnimating: false,
      status: 'playing'
    };
    // fill without initial matches - simple loop
    do {
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) state.grid[r][c] = randomType();
    } while(findMatches(state.grid).length > 0);

    emit();
    return state;
  }

  function getState(){ return state; }

  // try a swap; returns true if swap accepted (i.e. resulted in clears) else false
  function trySwap(r1,c1,r2,c2){
    if(!state || state.isAnimating) return false;
    if(state.moves <= 0) return false;
    // bounds
    if(r2<0 || r2>=ROWS || c2<0 || c2>=COLS) return false;
    // adjacency check
    const man = Math.abs(r1-r2)+Math.abs(c1-c2);
    if(man !== 1) return false;
    // do swap
    const g = cloneGrid(state.grid);
    const tmp = g[r1][c1]; g[r1][c1] = g[r2][c2]; g[r2][c2]=tmp;

    // detect matches after swap
    const matches = findMatches(g);
    if(matches.length === 0){
      // no match -> invalid swap (we'll still play swap sound maybe)
      // but allow swap to animate then revert — here we just return false
      // emit a small temporary state toggle? Keep simple: return false
      Sound.play && Sound.play('swap');
      return false;
    }
    // valid swap -> apply and start cascade
    state.grid = g;
    state.moves -= 1;
    Sound.play && Sound.play('swap');
    state.isAnimating = true;
    emit();

    // cascade process (clears -> collapse -> refill -> check again)
    setTimeout(function cascadeStep(){
      const clearPos = findMatches(state.grid);
      if(clearPos.length === 0){
        state.isAnimating = false;
        // check for win/lose
        checkGameEnd();
        emit();
        return;
      }
      // score: simple +10 per cell
      state.score += clearPos.length * 10;
      // clear
      clearPos.forEach(([r,c]) => state.grid[r][c] = 0);
      Sound.play && Sound.play('pop');
      emit();

      // collapse + refill
      setTimeout(function(){
        refillGrid(state.grid);
        emit();
        // loop again after a short delay
        setTimeout(cascadeStep, 220);
      }, 160);
    }, 160);

    return true;
  }

  function checkGameEnd(){
    if(state.score >= state.target){
      state.status = 'won';
      Storage.unlock(state.level+1);
      Storage.setBest(state.level, state.score);
    } else if(state.moves <= 0){
      state.status = 'lost';
    } else {
      state.status = 'playing';
    }
  }

  function onUpdate(fn){ listeners.push(fn); }

  function getMeta(){ return {ROWS, COLS, TYPES}; }

  return {
    ROWS: ROWS,
    COLS: COLS,
    start, getState, trySwap, onUpdate, getMeta
  };
})();

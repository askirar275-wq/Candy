// js/game-core.js
// Core engine: grid, match detection, remove, collapse, refill, scoring.

const GameCore = (function(){
  const ROWS = 6;
  const COLS = 6;
  const CANDY_TYPES = 6; // images candy1..candy6
  let grid = [];
  let score = 0;
  let moves = 30;
  let target = 600;
  let level = 1;
  let locked = false;
  let onChange = ()=>{};

  const rand = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;

  function makeEmpty(){
    grid = Array.from({length: ROWS}, ()=> Array(COLS).fill(0));
  }

  // avoid initial immediate matches
  function initGrid(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let t;
        let attempts=0;
        do {
          t = rand(1, CANDY_TYPES);
          attempts++;
          // break if too many attempts
          if(attempts>20) break;
        } while (wouldMatchAt(r,c,t));
        grid[r][c] = t;
      }
    }
  }

  function wouldMatchAt(r,c,t){
    // check left two
    if(c>=2 && grid[r][c-1]===t && grid[r][c-2]===t) return true;
    // check up two
    if(r>=2 && grid[r-1][c]===t && grid[r-2][c]===t) return true;
    return false;
  }

  function getState(){
    return {
      grid: grid.map(row=>row.slice()),
      score, moves, target, level
    };
  }

  function isAdjacent(r1,c1,r2,c2){
    const dr = Math.abs(r1-r2), dc = Math.abs(c1-c2);
    return (dr+dc)===1;
  }

  // swap and check if any matches result
  function trySwap(r1,c1,r2,c2){
    if(locked) return false;
    if(!isAdjacent(r1,c1,r2,c2)) return false;
    // swap
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    // check any match created
    const groups = findAllMatches();
    if(groups.length){
      moves = Math.max(0, moves-1);
      onChange(getState());
      // resolve in async loop
      resolveLoop();
      return true;
    } else {
      // revert after short visual window
      setTimeout(()=>{
        [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
        onChange(getState());
      }, 160);
      // optionally decrement moves on invalid swap; usually not — we'll decrement only on valid
      return false;
    }
  }

  // find horizontal & vertical groups of len>=3
  function findAllMatches(){
    const groups = [];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let c=0;
      while(c<COLS){
        const t = grid[r][c];
        if(!t){ c++; continue; }
        let end = c+1;
        while(end<COLS && grid[r][end]===t) end++;
        if(end-c >= 3){
          const g = [];
          for(let x=c;x<end;x++) g.push([r,x]);
          groups.push(g);
        }
        c = end;
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let r=0;
      while(r<ROWS){
        const t = grid[r][c];
        if(!t){ r++; continue; }
        let end = r+1;
        while(end<ROWS && grid[end][c]===t) end++;
        if(end-r >= 3){
          const g = [];
          for(let x=r;x<end;x++) g.push([x,c]);
          groups.push(g);
        }
        r = end;
      }
    }
    // merge duplicates (if same tile in both horizontal & vertical)
    const mark = Array.from({length:ROWS}, ()=> Array(COLS).fill(false));
    const merged = [];
    groups.forEach(g=>{
      const unique = [];
      g.forEach(([r,c])=>{
        if(!mark[r][c]){ mark[r][c]=true; unique.push([r,c]); }
      });
      if(unique.length) merged.push(unique);
    });
    return merged;
  }

  // remove groups, return total removed
  function removeGroups(groups){
    let removed = 0;
    groups.forEach(g=>{
      g.forEach(([r,c])=>{
        if(grid[r][c] !== 0){
          grid[r][c] = 0;
          removed++;
        }
      });
    });
    // scoring: basic 100 per candy, plus combo multiplier
    score += removed * 100;
    onChange(getState());
    return removed;
  }

  // collapse columns (gravity)
  function collapseColumns(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c] !== 0){
          grid[write][c] = grid[r][c];
          write--;
        }
      }
      for(let r=write;r>=0;r--){
        grid[r][c] = 0;
      }
    }
  }

  // refill zeros from top with random candies
  function refillGrid(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(grid[r][c] === 0) grid[r][c] = rand(1, CANDY_TYPES);
      }
    }
    onChange(getState());
  }

  // continuous resolution loop (remove->collapse->refill repeated until no matches)
  async function resolveLoop(){
    locked = true;
    let combo = 0;
    while(true){
      const groups = findAllMatches();
      if(groups.length === 0) break;
      combo++;
      removeGroups(groups);
      // small pause for UI to show removal
      await sleep(220);
      collapseColumns();
      await sleep(160);
      refillGrid();
      await sleep(200);
    }
    locked = false;
    onChange(getState());
    return combo;
  }

  function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }

  function start(newLevel=1){
    level = Number(newLevel) || 1;
    score = 0;
    moves = 30;
    target = 600 + (level-1)*200;
    makeEmpty();
    initGrid();
    // resolve accidental initial matches
    setTimeout(()=> resolveLoop(), 60);
    onChange(getState());
    return getState();
  }

  function onUpdate(cb){ onChange = (cb || (()=>{})); }
  function getStatePublic(){ return getState(); }

  return {
    start, trySwap, onUpdate, getState: getStatePublic,
    ROWS, COLS, CANDY_TYPES
  };
})();

window.GameCore = GameCore;

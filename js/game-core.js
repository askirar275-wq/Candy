// js/game-core.js
// Simple match-3 core engine (grid-based)
const GameCore = (function(){
  const ROWS = 6;
  const COLS = 6;
  const CANDY_TYPES = 6; // candy1..candy6 images
  let grid = []; // 2D array [r][c] => type (1..CANDY_TYPES)
  let score = 0;
  let moves = 30;
  let target = 600;
  let currentLevel = 1;
  let onChange = ()=>{};
  let onComplete = ()=>{};
  let lock = false;

  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

  function makeEmptyGrid(){
    grid = [];
    for(let r=0;r<ROWS;r++){
      const row = new Array(COLS).fill(0);
      grid.push(row);
    }
  }

  // fill random but avoid immediate matches (simple retries)
  function fillInitial(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let t;
        do {
          t = randInt(1,CANDY_TYPES);
        } while (formsMatchAt(r,c,t));
        grid[r][c] = t;
      }
    }
  }

  // check if placing type 't' at r,c would create a 3-in-row (used while generating)
  function formsMatchAt(r,c,t){
    // check left two
    if(c>=2 && grid[r][c-1]===t && grid[r][c-2]===t) return true;
    // check up two
    if(r>=2 && grid[r-1][c]===t && grid[r-2][c]===t) return true;
    return false;
  }

  function getState(){
    return {
      grid: JSON.parse(JSON.stringify(grid)),
      score, moves, target, currentLevel
    };
  }

  // swap two cells (adjacent) and return true if swapped
  function swap(r1,c1,r2,c2){
    if(lock) return false;
    if(!isAdj(r1,c1,r2,c2)) return false;
    // swap
    const tmp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = tmp;
    moves = Math.max(0, moves-1);
    onChange(getState());
    // check matches: if no matches, revert after small delay (handled by caller)
    return true;
  }

  function isAdj(r1,c1,r2,c2){
    const dr = Math.abs(r1-r2), dc = Math.abs(c1-c2);
    return (dr+dc)===1;
  }

  // Find matches: returns array of positions grouped
  function findMatches(){
    const seen = Array.from({length:ROWS}, ()=> new Array(COLS).fill(false));
    const groups = [];

    // horizontal
    for(let r=0;r<ROWS;r++){
      let runStart=0;
      for(let c=1;c<=COLS;c++){
        if(c<Cols? false:false){} // nop
      }
    }
    // simpler approach: iterate each cell and expand right/down
    // We'll find horizontal runs
    for(let r=0;r<ROWS;r++){
      let start = 0;
      while(start < COLS){
        const t = grid[r][start];
        if(!t){ start++; continue; }
        let end = start+1;
        while(end<COLS && grid[r][end]===t) end++;
        const len = end-start;
        if(len>=3){
          const group = [];
          for(let c=start;c<end;c++) group.push([r,c]);
          groups.push(group);
        }
        start = end;
      }
    }
    // vertical runs
    for(let c=0;c<COLS;c++){
      let start = 0;
      while(start < ROWS){
        const t = grid[start][c];
        if(!t){ start++; continue; }
        let end = start+1;
        while(end<ROWS && grid[end][c]===t) end++;
        const len = end-start;
        if(len>=3){
          const group = [];
          for(let r=start;r<end;r++) group.push([r,c]);
          groups.push(group);
        }
        start = end;
      }
    }

    // deduplicate positions (if overlapped groups will both appear — we will merge by marking)
    const mark = Array.from({length:ROWS}, ()=> new Array(COLS).fill(false));
    const merged = [];
    groups.forEach(g=>{
      const unique = [];
      g.forEach(([r,c])=>{
        if(!mark[r][c]){
          mark[r][c] = true;
          unique.push([r,c]);
        }
      });
      if(unique.length) merged.push(unique);
    });

    return merged; // array of groups (each group array of [r,c])
  }

  // remove groups (set to 0) and award score
  function removeMatches(groups){
    let removed = 0;
    groups.forEach(g=>{
      removed += g.length;
      g.forEach(([r,c])=> grid[r][c] = 0);
    });
    // score rules: e.g., 100 per candy
    score += removed * 100;
    onChange(getState());
    return removed;
  }

  // collapse columns: for each column, shift non-zero down, fill upper with 0
  function collapse(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c]!==0){
          grid[write][c] = grid[r][c];
          write--;
        }
      }
      // fill remaining
      for(let r=write;r>=0;r--){
        grid[r][c] = 0;
      }
    }
  }

  // refill zeros from top with random candies
  function refill(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(grid[r][c]===0){
          grid[r][c] = randInt(1, CANDY_TYPES);
        }
      }
    }
    onChange(getState());
  }

  // run full resolution: findMatches -> remove -> collapse -> refill, repeat until no matches
  async function resolveMatchesLoop(){
    lock = true;
    let totalRemoved = 0;
    while(true){
      const groups = findMatches();
      if(!groups.length) break;
      const removed = removeMatches(groups);
      totalRemoved += removed;
      // allow UI to animate (caller can re-render between these steps)
      await new Promise(r=> setTimeout(r, 220));
      collapse();
      await new Promise(r=> setTimeout(r, 150));
      refill();
      await new Promise(r=> setTimeout(r, 180));
    }
    lock = false;
    onChange(getState());
    return totalRemoved;
  }

  // public API
  function start(level=1){
    currentLevel = Number(level) || 1;
    score = 0;
    moves = 30;
    target = 600 + (currentLevel-1)*200;
    makeEmptyGrid();
    fillInitial();
    // resolve any accidental matches (just in case)
    resolveMatchesLoop().then(()=>{ onChange(getState()); });
    return getState();
  }

  function trySwapAndResolve(r1,c1,r2,c2){
    if(lock) return false;
    if(!isAdj(r1,c1,r2,c2)) return false;
    // swap
    const tmp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = tmp;
    onChange(getState());
    // check if swap created any matches
    const groups = findMatches();
    if(groups.length){
      // resolve loop (async) but caller doesn't need await
      resolveMatchesLoop();
      return true;
    } else {
      // revert after short delay (to allow animation)
      setTimeout(()=>{
        const t = grid[r1][c1];
        grid[r1][c1] = grid[r2][c2];
        grid[r2][c2] = t;
        moves = Math.max(0, moves-1); // even invalid swap consumes a move? you may prefer not to; change if needed
        onChange(getState());
      }, 180);
      return false;
    }
  }

  // expose hooks
  function onUpdate(cb){ onChange = cb || (()=>{}); }
  function onFinish(cb){ onComplete = cb || (()=>{}); }

  // Expose functions
  return {
    start, getState, trySwapAndResolve, onUpdate, onFinish,
    // constants for UI
    ROWS, COLS, CANDY_TYPES
  };
})();

window.GameCore = GameCore;

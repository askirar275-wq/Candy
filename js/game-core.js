// game-core.js
// Simple match-3 core with swap, match detection, removal, collapse & refill.
// Exposes global Game object with start(level)

const Game = (function(){
  const GRID_COLS = 6;      // columns
  const GRID_ROWS = 6;      // rows
  const CANDY_COUNT = 6;    // different candy images candy1..candy6
  const MATCH_MIN = 3;

  let grid = []; // 2D array [r][c] numbers 1..CANDY_COUNT
  let score = 0, moves = 30, target = 600, level = 1;
  let onUpdateUI = null;

  function randCandy(){ return Math.floor(Math.random()*CANDY_COUNT)+1; }

  function makeEmptyGrid(){
    grid = [];
    for(let r=0;r<GRID_ROWS;r++){
      const row = [];
      for(let c=0;c<GRID_COLS;c++) row.push(0);
      grid.push(row);
    }
  }

  // fill without initial matches (basic)
  function fillInitial(){
    for(let r=0;r<GRID_ROWS;r++){
      for(let c=0;c<GRID_COLS;c++){
        let v;
        do{
          v = randCandy();
          grid[r][c] = v;
        }while(checkImmediateMatchAt(r,c));
      }
    }
  }

  function checkImmediateMatchAt(r,c){
    const v = grid[r][c];
    if(v===0) return false;
    // check left and left-left
    if(c>=2 && grid[r][c-1]===v && grid[r][c-2]===v) return true;
    if(r>=2 && grid[r-1][c]===v && grid[r-2][c]===v) return true;
    return false;
  }

  // swap two positions (r1,c1) <-> (r2,c2)
  function swapPositions(r1,c1,r2,c2){
    const t = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = t;
  }

  // find all matches: returns array of {cells:[{r,c}], value}
  function findMatches(){
    const matches = [];
    const seen = Array.from({length:GRID_ROWS}, ()=> Array(GRID_COLS).fill(false));
    // horizontal
    for(let r=0;r<GRID_ROWS;r++){
      let runVal = grid[r][0], runStart=0, runLen=1;
      for(let c=1;c<=GRID_COLS;c++){
        const val = c<GRID_COLS ? grid[r][c] : -1;
        if(val === runVal) { runLen++; }
        else {
          if(runVal>0 && runLen>=MATCH_MIN){
            const cells = [];
            for(let k=0;k<runLen;k++){ cells.push({r, c: runStart+k}); seen[r][runStart+k]=true; }
            matches.push({value:runVal,cells});
          }
          runVal = val; runStart = c; runLen = 1;
        }
      }
    }
    // vertical
    for(let c=0;c<GRID_COLS;c++){
      let runVal = grid[0][c], runStart=0, runLen=1;
      for(let r=1;r<=GRID_ROWS;r++){
        const val = r<GRID_ROWS ? grid[r][c] : -1;
        if(val === runVal) { runLen++; }
        else {
          if(runVal>0 && runLen>=MATCH_MIN){
            const cells = [];
            for(let k=0;k<runLen;k++){ cells.push({r: runStart+k, c}); }
            matches.push({value:runVal,cells});
          }
          runVal = val; runStart = r; runLen = 1;
        }
      }
    }
    return matches;
  }

  // remove matches (set to 0) and return removed count
  function removeMatches(matches){
    let removed = 0;
    for(const m of matches){
      for(const cell of m.cells){
        if(grid[cell.r][cell.c] !== 0){
          grid[cell.r][cell.c] = 0;
          removed++;
        }
      }
    }
    return removed;
  }

  // collapse columns (gravity): move non-zero down
  function collapse(){
    for(let c=0;c<GRID_COLS;c++){
      let write = GRID_ROWS-1;
      for(let r=GRID_ROWS-1;r>=0;r--){
        if(grid[r][c] !== 0){
          grid[write][c] = grid[r][c];
          if(write !== r) grid[r][c] = 0;
          write--;
        }
      }
      // fill top with new candies
      for(let r=write;r>=0;r--){
        grid[r][c] = randCandy();
      }
    }
  }

  // score calculation (simple): removed * 100
  function calcScore(removed){
    return removed * 100;
  }

  // attempt swap and process matches; if no match, swap back and return false
  function trySwapAndResolve(r1,c1,r2,c2){
    swapPositions(r1,c1,r2,c2);
    let matches = findMatches();
    if(matches.length === 0){
      // no match, revert
      swapPositions(r1,c1,r2,c2);
      return false;
    }
    // matches exist => remove + collapse until no matches
    let totalRemoved = 0;
    while(matches.length){
      const removed = removeMatches(matches);
      totalRemoved += removed;
      collapse();
      matches = findMatches();
    }
    score += calcScore(totalRemoved);
    moves = Math.max(0, moves-1);
    return true;
  }

  // public API
  return {
    // start new level
    start(lvl=1, opts={}){
      level = lvl;
      score = 0;
      moves = opts.moves || 30;
      target = opts.target || (600 * lvl);
      makeEmptyGrid();
      fillInitial();
      if(typeof onUpdateUI === 'function') onUpdateUI({grid,score,moves,target,level});
    },
    // set UI callback
    onUpdate(fn){ onUpdateUI = fn; },
    // attempt user swap (adjacent)
    userSwap(r1,c1,r2,c2){
      // ensure adjacent
      const dr = Math.abs(r1-r2), dc = Math.abs(c1-c2);
      if(dr+dc !== 1) return false;
      const ok = trySwapAndResolve(r1,c1,r2,c2);
      if(typeof onUpdateUI === 'function') onUpdateUI({grid,score,moves,target,level});
      return ok;
    },
    // get grid (copy)
    getGrid(){ return grid.map(row=>row.slice()) },
    getState(){ return {grid,score,moves,target,level} },
    // helper: reveal internal (for debug)
    _debug(){ return {grid,score,moves,target,level} }
  };
})();

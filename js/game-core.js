// js/game-core.js
// Core logic: grid data, match detection, collapse (gravity), refill
// Exports a global `GameCore` object used by game.js

(function(global){
  const GameCore = {};

  // config
  const ROWS = 6;
  const COLS = 6;
  const CANDY_COUNT = 6; // number of candy types (images candy1..candy6)
  const MATCH_MIN = 3;

  // grid as 2D array [row][col], row 0 = top
  let grid = [];
  let rngSeed = Date.now();

  function rand(max){
    return Math.floor(Math.random()*max);
  }

  function randCandy(){
    // return 1..CANDY_COUNT
    return (rand(CANDY_COUNT) + 1);
  }

  function createEmptyGrid(){
    grid = Array.from({length: ROWS}, ()=> Array.from({length: COLS}, ()=> 0));
  }

  // fill grid randomly but avoid starting with immediate matches
  function initGrid(){
    createEmptyGrid();
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let val;
        do {
          val = randCandy();
          grid[r][c] = val;
        } while(createsMatchAt(r,c));
      }
    }
  }

  function createsMatchAt(r,c){
    const v = grid[r][c];
    // check left two
    if(c>=2 && grid[r][c-1]===v && grid[r][c-2]===v) return true;
    // check up two
    if(r>=2 && grid[r-1][c]===v && grid[r-2][c]===v) return true;
    return false;
  }

  // detect all matches: returns array of positions to remove [{r,c},...]
  function detectMatches(){
    const remove = [];
    const marked = Array.from({length: ROWS}, ()=> Array.from({length: COLS}, ()=> false));

    // horizontal
    for(let r=0;r<ROWS;r++){
      let c=0;
      while(c<COLS){
        const v = grid[r][c];
        if(v===0){ c++; continue; }
        let len = 1;
        while(c+len<COLS && grid[r][c+len]===v) len++;
        if(len >= MATCH_MIN){
          for(let k=0;k<len;k++) marked[r][c+k] = true;
        }
        c += len;
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let r=0;
      while(r<ROWS){
        const v = grid[r][c];
        if(v===0){ r++; continue; }
        let len = 1;
        while(r+len<ROWS && grid[r+len][c]===v) len++;
        if(len >= MATCH_MIN){
          for(let k=0;k<len;k++) marked[r+k][c] = true;
        }
        r += len;
      }
    }

    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(marked[r][c]) remove.push({r,c});
      }
    }
    return remove;
  }

  // remove matches (set to 0) and return number removed
  function removeMatches(positions){
    positions.forEach(p => { grid[p.r][p.c] = 0; });
    return positions.length;
  }

  // collapse columns (gravity) and refill top with random candies
  function collapseAndRefill(){
    for(let c=0;c<COLS;c++){
      let write = ROWS - 1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c] !== 0){
          grid[write][c] = grid[r][c];
          if(write !== r) grid[r][c] = 0;
          write--;
        }
      }
      // fill remaining top cells
      for(let r=write; r>=0; r--){
        grid[r][c] = randCandy();
      }
    }
  }

  // swap two positions in grid (and return true if swapped)
  function swapPositions(aR,aC,bR,bC){
    const tmp = grid[aR][aC];
    grid[aR][aC] = grid[bR][bC];
    grid[bR][bC] = tmp;
    return true;
  }

  // helper to clone grid for checking hypothetical swap
  function getGridCopy(){
    return grid.map(row => row.slice());
  }

  // check if swap creates any match
  function swapCreatesMatch(aR,aC,bR,bC){
    const copy = getGridCopy();
    const tmp = copy[aR][aC];
    copy[aR][aC] = copy[bR][bC];
    copy[bR][bC] = tmp;
    // local detect for affected rows/cols
    function localDetect(){
      const toRemove = [];
      // scan rows around aR and bR and columns around aC, bC
      const rows = new Set([aR,bR]);
      const cols = new Set([aC,bC]);
      // also include +/-2 vicinity for safety
      [aR,bR].forEach(x => { for(let i=x-2;i<=x+2;i++) if(i>=0 && i<ROWS) rows.add(i); });
      [aC,bC].forEach(x => { for(let i=x-2;i<=x+2;i++) if(i>=0 && i<COLS) cols.add(i); });

      for(const r of rows){
        let c=0;
        while(c<COLS){
          const v = copy[r][c];
          if(v===0){ c++; continue; }
          let len=1;
          while(c+len<COLS && copy[r][c+len]===v) len++;
          if(len>=MATCH_MIN){
            for(let k=0;k<len;k++) toRemove.push({r,c:c+k});
          }
          c+=len;
        }
      }
      for(const c of cols){
        let r=0;
        while(r<ROWS){
          const v = copy[r][c];
          if(v===0){ r++; continue; }
          let len=1;
          while(r+len<ROWS && copy[r+len][c]===v) len++;
          if(len>=MATCH_MIN){
            for(let k=0;k<len;k++) toRemove.push({r:r+k,c});
          }
          r+=len;
        }
      }
      return toRemove.length>0;
    }
    return localDetect();
  }

  // expose
  GameCore.ROWS = ROWS;
  GameCore.COLS = COLS;
  GameCore.CANDY_COUNT = CANDY_COUNT;

  GameCore.initGrid = initGrid;
  GameCore.getGrid = ()=> grid;
  GameCore.detectMatches = detectMatches;
  GameCore.removeMatches = removeMatches;
  GameCore.collapseAndRefill = collapseAndRefill;
  GameCore.swapPositions = swapPositions;
  GameCore.swapCreatesMatch = swapCreatesMatch;
  GameCore.setGrid = (g)=> { grid = g; };

  global.GameCore = GameCore;
})(window);

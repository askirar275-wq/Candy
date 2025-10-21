// game-core.js
// Basic match-3 core: grid stored as 1D array, width x height board.
// Exposes helpers used by game.js

const GameCore = (function(){
  const W = 5;            // board width
  const H = 6;            // board height
  const SIZE = W * H;
  const COLORS = 5;       // 0..4 color indexes

  // create random grid (no initial matches)
  function generateGrid() {
    const grid = new Array(SIZE).fill(0).map(() => randColor());
    // remove initial accidental matches
    for (let i=0;i<SIZE;i++){
      while(hasMatchAt(grid, i)) grid[i] = randColor();
    }
    return grid;
  }

  function randColor(){ return Math.floor(Math.random() * COLORS); }

  // index helpers
  function idx(r,c){ return r*W + c; }
  function rc(i){ return [Math.floor(i/W), i%W]; }

  // swap two indices in grid (mutates)
  function swap(grid, a, b){
    const tmp = grid[a]; grid[a] = grid[b]; grid[b] = tmp;
  }

  // check adjacency
  function areAdjacent(a,b){
    const [ra,ca]=rc(a), [rb,cb]=rc(b);
    return (ra===rb && Math.abs(ca-cb)===1) || (ca===cb && Math.abs(ra-rb)===1);
  }

  // detect matches (returns list of indices that form matches)
  function findMatches(grid){
    const remove = new Set();
    // horizontal
    for(let r=0;r<H;r++){
      let start = 0;
      for(let c=0;c<=W;c++){
        if(c===W || (c>0 && grid[idx(r,c)] !== grid[idx(r,c-1)])){
          const len = c - start;
          if(len >= 3){
            for(let cc = start; cc < c; cc++) remove.add(idx(r,cc));
          }
          start = c;
        }
      }
    }
    // vertical
    for(let c=0;c<W;c++){
      let start = 0;
      for(let r=0;r<=H;r++){
        if(r===H || (r>0 && grid[idx(r,c)] !== grid[idx(r-1,c)])){
          const len = r - start;
          if(len >= 3){
            for(let rr = start; rr < r; rr++) remove.add(idx(rr,c));
          }
          start = r;
        }
      }
    }
    return Array.from(remove);
  }

  // helper: return whether there's match at single index (used in initial fill)
  function hasMatchAt(grid, i){
    const [r,c] = rc(i);
    const color = grid[i];
    // horizontal check length >=3 with neighbors left/right
    let count = 1;
    // left
    for(let cc=c-1; cc>=0 && grid[idx(r,cc)]===color; cc--) count++;
    for(let cc=c+1; cc<W && grid[idx(r,cc)]===color; cc++) count++;
    if(count>=3) return true;
    // vertical
    count = 1;
    for(let rr=r-1; rr>=0 && grid[idx(rr,c)]===color; rr--) count++;
    for(let rr=r+1; rr<H && grid[idx(rr,c)]===color; rr++) count++;
    return count>=3;
  }

  // apply gravity: remove indices (set to -1), collapse columns and refill new colors on top
  // returns {grid: newGrid, removedCount}
  function collapseAndRefill(grid, removedIndices){
    const removedSet = new Set(removedIndices);
    const newGrid = new Array(SIZE).fill(-1);
    for(let c=0;c<W;c++){
      // collect column colors bottom-up
      const col = [];
      for(let r=H-1;r>=0;r--){
        const i = idx(r,c);
        if(!removedSet.has(i)){
          col.push(grid[i]);
        }
      }
      // fill new column bottom-up with existing then randoms
      let writeR = H-1;
      for(let v of col){
        newGrid[idx(writeR,c)] = v;
        writeR--;
      }
      while(writeR >= 0){
        newGrid[idx(writeR,c)] = randColor();
        writeR--;
      }
    }
    return {grid:newGrid, removedCount: removedIndices.length};
  }

  // convenience: try swap and return matches (without mutating original)
  function trySwapAndFindMatches(grid, a, b){
    if(!areAdjacent(a,b)) return [];
    const g = grid.slice();
    swap(g,a,b);
    const matches = findMatches(g);
    return matches;
  }

  return {
    W, H, SIZE, COLORS,
    generateGrid, swap, areAdjacent, findMatches, collapseAndRefill, trySwapAndFindMatches
  };
})();

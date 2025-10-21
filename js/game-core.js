// js/game-core.js
// Match-3 core: board size W x H, detection, swap, collapse & refill.
// Exposes helpers used by game.js

const GameCore = (function(){
  const W = 5;            // board width (columns)
  const H = 6;            // board height (rows)
  const SIZE = W * H;
  const COLORS = 5;       // number of different candy types (0..COLORS-1)

  // generate random color index 0..COLORS-1
  function randColor(){ return Math.floor(Math.random() * COLORS); }

  // index helpers
  function idx(r,c){ return r*W + c; }
  function rc(i){ return [Math.floor(i / W), i % W]; }

  // generate initial grid avoiding immediate matches
  function generateGrid() {
    const grid = new Array(SIZE).fill(0).map(() => randColor());
    // remove accidental initial matches
    for (let i = 0; i < SIZE; i++){
      // if position creates match, change until no match at that cell
      let guard = 0;
      while (hasMatchAt(grid, i) && guard < 10){
        grid[i] = randColor();
        guard++;
      }
    }
    return grid;
  }

  // swap positions a and b (mutates grid)
  function swap(grid, a, b){
    const t = grid[a]; grid[a] = grid[b]; grid[b] = t;
  }

  // check adjacency
  function areAdjacent(a,b){
    const [ra,ca] = rc(a);
    const [rb,cb] = rc(b);
    return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
  }

  // detect all matches on grid; returns array of indices to remove (unique)
  function findMatches(grid){
    const remove = new Set();
    // horizontal runs
    for (let r = 0; r < H; r++){
      let runColor = grid[idx(r,0)];
      let runStart = 0;
      for (let c = 1; c <= W; c++){
        const cur = (c < W) ? grid[idx(r,c)] : null;
        if (c === W || cur !== runColor){
          const len = c - runStart;
          if (runColor !== null && len >= 3){
            for (let cc = runStart; cc < c; cc++) remove.add(idx(r, cc));
          }
          runStart = c;
          runColor = cur;
        }
      }
    }
    // vertical runs
    for (let c = 0; c < W; c++){
      let runColor = grid[idx(0,c)];
      let runStart = 0;
      for (let r = 1; r <= H; r++){
        const cur = (r < H) ? grid[idx(r, c)] : null;
        if (r === H || cur !== runColor){
          const len = r - runStart;
          if (runColor !== null && len >= 3){
            for (let rr = runStart; rr < r; rr++) remove.add(idx(rr, c));
          }
          runStart = r;
          runColor = cur;
        }
      }
    }
    return Array.from(remove);
  }

  // check whether a match exists at single index (used to avoid initial matches)
  function hasMatchAt(grid, i){
    if (i < 0 || i >= SIZE) return false;
    const [r,c] = rc(i);
    const color = grid[i];
    // horizontal
    let count = 1;
    for (let cc = c-1; cc >= 0 && grid[idx(r,cc)] === color; cc--) count++;
    for (let cc = c+1; cc < W && grid[idx(r,cc)] === color; cc++) count++;
    if (count >= 3) return true;
    // vertical
    count = 1;
    for (let rr = r-1; rr >= 0 && grid[idx(rr,c)] === color; rr--) count++;
    for (let rr = r+1; rr < H && grid[idx(rr,c)] === color; rr++) count++;
    return count >= 3;
  }

  // collapse columns and refill removed indices
  // removedIndices: array of indices to remove
  // returns { grid: newGrid, removedCount }
  function collapseAndRefill(grid, removedIndices){
    const removed = new Set(removedIndices);
    const newGrid = new Array(SIZE).fill(-1);
    for (let c = 0; c < W; c++){
      const col = [];
      // collect column items bottom-up that are not removed
      for (let r = H - 1; r >= 0; r--){
        const i = idx(r,c);
        if (!removed.has(i)) col.push(grid[i]);
      }
      // write them bottom-up into newGrid
      let writeR = H - 1;
      for (const v of col){
        newGrid[idx(writeR, c)] = v;
        writeR--;
      }
      // fill remaining top slots with random colors
      while (writeR >= 0){
        newGrid[idx(writeR, c)] = randColor();
        writeR--;
      }
    }
    return { grid: newGrid, removedCount: removedIndices.length };
  }

  // test swap: returns matches array if swap creates matches (does not mutate)
  function trySwapAndFindMatches(grid, a, b){
    if (!areAdjacent(a,b)) return [];
    const g = grid.slice();
    swap(g, a, b);
    return findMatches(g);
  }

  return {
    W, H, SIZE, COLORS,
    generateGrid,
    swap,
    areAdjacent,
    findMatches,
    collapseAndRefill,
    trySwapAndFindMatches
  };
})();

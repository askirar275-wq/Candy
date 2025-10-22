// js/game-core.js
// Match-3 core: generate, detect matches, collapse + refill

const GameCore = (function(){
  const W = 5;
  const H = 6;
  const SIZE = W * H;
  const COLORS = 5; // number of candy types (images candy1..candy5)

  function randColor(){ return Math.floor(Math.random() * COLORS); }
  function idx(r,c){ return r * W + c; }
  function rc(i){ return [Math.floor(i / W), i % W]; }

  // generate grid avoiding initial matches
  function generateGrid(){
    const grid = new Array(SIZE).fill(0).map(()=>randColor());
    for(let i=0;i<SIZE;i++){
      let guard = 0;
      while(hasMatchAt(grid, i) && guard < 20){
        grid[i] = randColor();
        guard++;
      }
    }
    return grid;
  }

  function swap(grid, a, b){
    const t = grid[a]; grid[a] = grid[b]; grid[b] = t;
  }

  function areAdjacent(a,b){
    const [ra,ca] = rc(a);
    const [rb,cb] = rc(b);
    return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
  }

  // find all indices that are part of horizontal or vertical runs of length >= 3
  function findMatches(grid){
    const remove = new Set();
    // horizontal
    for(let r=0;r<H;r++){
      let start = 0;
      for(let c=1;c<=W;c++){
        const prev = grid[idx(r, c-1)];
        const cur  = (c < W) ? grid[idx(r, c)] : null;
        if(c === W || cur !== prev){
          const len = c - start;
          if(len >= 3){
            for(let cc = start; cc < c; cc++) remove.add(idx(r, cc));
          }
          start = c;
        }
      }
    }
    // vertical
    for(let c=0;c<W;c++){
      let start = 0;
      for(let r=1;r<=H;r++){
        const prev = grid[idx(r-1, c)];
        const cur  = (r < H) ? grid[idx(r, c)] : null;
        if(r === H || cur !== prev){
          const len = r - start;
          if(len >= 3){
            for(let rr = start; rr < r; rr++) remove.add(idx(rr, c));
          }
          start = r;
        }
      }
    }
    return Array.from(remove);
  }

  function hasMatchAt(grid, i){
    if(i < 0 || i >= SIZE) return false;
    const [r,c] = rc(i);
    const color = grid[i];
    // horizontal
    let count = 1;
    for(let cc = c-1; cc >= 0 && grid[idx(r,cc)] === color; cc--) count++;
    for(let cc = c+1; cc < W && grid[idx(r,cc)] === color; cc++) count++;
    if(count >= 3) return true;
    // vertical
    count = 1;
    for(let rr = r-1; rr >= 0 && grid[idx(rr,c)] === color; rr--) count++;
    for(let rr = r+1; rr < H && grid[idx(rr,c)] === color; rr++) count++;
    return count >= 3;
  }

  // remove indices and collapse columns, refill top with random colors
  // returns { grid: newGrid, removedCount }
  function collapseAndRefill(grid, removedIndices){
    const removed = new Set(removedIndices);
    const newGrid = new Array(SIZE).fill(-1);
    for(let c = 0; c < W; c++){
      const col = [];
      // collect not-removed values bottom-up
      for(let r = H - 1; r >= 0; r--){
        const i = idx(r,c);
        if(!removed.has(i)) col.push(grid[i]);
      }
      let writeR = H - 1;
      for(const v of col){
        newGrid[idx(writeR, c)] = v;
        writeR--;
      }
      // fill remaining top with random colors
      while(writeR >= 0){
        newGrid[idx(writeR, c)] = randColor();
        writeR--;
      }
    }
    return { grid: newGrid, removedCount: removedIndices.length };
  }

  // try swapping a & b on a copy and return found matches (without mutating)
  function trySwapAndFindMatches(grid, a, b){
    if(!areAdjacent(a,b)) return [];
    const g = grid.slice();
    swap(g,a,b);
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

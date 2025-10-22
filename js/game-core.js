// js/game-core.js
// match-3 core logic: generate grid, find matches, swap, collapse & refill

const GameCore = (function(){
  const W = 5;
  const H = 6;
  const SIZE = W * H;
  const COLORS = 5; // number of candy types (candy1..candy5)

  function rand() { return Math.floor(Math.random() * COLORS); }
  function idx(r,c){ return r * W + c; }
  function rc(i){ return [Math.floor(i / W), i % W]; }

  // generate grid without initial matches
  function generateGrid(){
    const g = new Array(SIZE).fill(0).map(() => rand());
    for(let i=0;i<SIZE;i++){
      let guard=0;
      while(hasMatchAt(g, i) && guard < 30){
        g[i] = rand();
        guard++;
      }
    }
    return g;
  }

  // swap in place
  function swap(g,a,b){ const t=g[a]; g[a]=g[b]; g[b]=t; }

  // adjacency
  function areAdjacent(a,b){
    const [ra,ca] = rc(a), [rb,cb] = rc(b);
    return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
  }

  // detect all match indices (runs >=3 horizontally or vertically)
  function findMatches(g){
    const rem = new Set();
    // horizontal
    for(let r=0;r<H;r++){
      let start = 0;
      for(let c=1;c<=W;c++){
        const prev = g[idx(r, c-1)];
        const cur = (c < W) ? g[idx(r,c)] : null;
        if(c === W || cur !== prev){
          const len = c - start;
          if(len >= 3){
            for(let cc=start; cc<c; cc++) rem.add(idx(r,cc));
          }
          start = c;
        }
      }
    }
    // vertical
    for(let c=0;c<W;c++){
      let start = 0;
      for(let r=1;r<=H;r++){
        const prev = g[idx(r-1,c)];
        const cur = (r < H) ? g[idx(r,c)] : null;
        if(r === H || cur !== prev){
          const len = r - start;
          if(len >= 3){
            for(let rr=start; rr<r; rr++) rem.add(idx(rr,c));
          }
          start = r;
        }
      }
    }
    return Array.from(rem);
  }

  function hasMatchAt(g,i){
    if(i < 0 || i >= SIZE) return false;
    const [r,c] = rc(i);
    const color = g[i];
    // horizontal
    let count = 1;
    for(let cc=c-1; cc>=0 && g[idx(r,cc)] === color; cc--) count++;
    for(let cc=c+1; cc<W && g[idx(r,cc)] === color; cc++) count++;
    if(count >= 3) return true;
    // vertical
    count = 1;
    for(let rr=r-1; rr>=0 && g[idx(rr,c)] === color; rr--) count++;
    for(let rr=r+1; rr<H && g[idx(rr,c)] === color; rr++) count++;
    return count >= 3;
  }

  // collapse columns and refill top with random colors
  // removedIndices: array of indices to remove
  function collapseAndRefill(g, removedIndices){
    const removed = new Set(removedIndices);
    const ng = new Array(SIZE).fill(-1);
    for(let c=0;c<W;c++){
      const col = [];
      // collect existing (bottom-up)
      for(let r=H-1; r>=0; r--){
        const i = idx(r,c);
        if(!removed.has(i)) col.push(g[i]);
      }
      let writeR = H - 1;
      for(const v of col){
        ng[idx(writeR, c)] = v;
        writeR--;
      }
      // fill remaining top with random
      while(writeR >= 0){
        ng[idx(writeR, c)] = rand();
        writeR--;
      }
    }
    return { grid: ng, removedCount: removedIndices.length };
  }

  // try swapping a,b on a copy and return found matches (non-mutating)
  function trySwapAndFindMatches(g, a, b){
    if(!areAdjacent(a,b)) return [];
    const copy = g.slice();
    swap(copy, a, b);
    return findMatches(copy);
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

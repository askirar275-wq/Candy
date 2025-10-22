// js/game-core.js
// Match-3 core with support for special candies
const GameCore = (function(){
  const W = 5;
  const H = 6;
  const SIZE = W * H;
  const COLORS = 5; // candy types: 0..4

  function randColor(){ return Math.floor(Math.random() * COLORS); }
  function idx(r,c){ return r * W + c; }
  function rc(i){ return [Math.floor(i / W), i % W]; }

  // create tile object
  function tile(color=null, special=null){
    return { c: color===null ? randColor() : color, s: special || null };
  }

  // generate grid without initial matches
  function generateGrid(){
    const g = new Array(SIZE);
    for(let i=0;i<SIZE;i++) g[i] = tile();
    // remove accidental initial matches by reassigning single tiles
    for(let i=0;i<SIZE;i++){
      let guard=0;
      while(hasMatchAt(g, i) && guard < 30){
        g[i].c = randColor();
        g[i].s = null;
        guard++;
      }
    }
    return g;
  }

  function areAdjacent(a,b){
    const [ra,ca] = rc(a), [rb,cb] = rc(b);
    return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
  }

  function swap(g,a,b){
    const t = g[a];
    g[a] = g[b];
    g[b] = t;
  }

  // match detection returns object:
  // { removed: Set(indices), specialsToCreate: [{pos, kind}] , colorBombHits: [] }
  function findMatchesWithSpecials(g){
    const rem = new Set();
    const specials = []; // create special candies where needed
    // horizontal
    for(let r=0;r<H;r++){
      let start = 0;
      for(let c=1;c<=W;c++){
        const prev = g[idx(r, c-1)].c;
        const cur = (c < W) ? g[idx(r,c)].c : null;
        if(c === W || cur !== prev){
          const len = c - start;
          if(len >= 3){
            for(let cc=start; cc<c; cc++) rem.add(idx(r,cc));
            // special creation: when swapped produce special at swap end handled in UI.
            // heuristic: if len==4 create row special at rightmost cell, if len>=5 create color bomb at middle
            if(len === 4){
              specials.push({ pos: idx(r, c-1), kind: 'row' });
            } else if(len >= 5){
              const mid = Math.floor((start + c-1)/2);
              specials.push({ pos: idx(r, mid), kind: 'color' });
            }
          }
          start = c;
        }
      }
    }
    // vertical
    for(let c=0;c<W;c++){
      let start = 0;
      for(let r=1;r<=H;r++){
        const prev = g[idx(r-1,c)].c;
        const cur = (r < H) ? g[idx(r,c)].c : null;
        if(r === H || cur !== prev){
          const len = r - start;
          if(len >= 3){
            for(let rr=start; rr<r; rr++) rem.add(idx(rr,c));
            if(len === 4){
              specials.push({ pos: idx(r-1, c), kind: 'row' }); // vertical 4 -> create a 'row' (we will treat row as directional special)
            } else if(len >= 5){
              const mid = Math.floor((start + r-1)/2);
              specials.push({ pos: idx(mid, c), kind: 'color' });
            }
          }
          start = r;
        }
      }
    }
    return { removed: Array.from(rem), specials };
  }

  // When special tiles are present in removed set, they create extended removal:
  // - 'row' clears entire row (we'll clear horizontally for simplicity)
  // - 'bomb' clears 3x3 area
  // - 'color' (color bomb) logic handled in UI when activated (since activation depends on swap)
  function expandRemovedBySpecials(g, removedArr){
    const rem = new Set(removedArr);
    const toCheck = removedArr.slice();
    for(const i of toCheck){
      const t = g[i];
      if(!t) continue;
      if(t.s === 'row'){
        // clear its row
        const [r,] = rc(i);
        for(let c=0;c<W;c++) rem.add(idx(r,c));
      } else if(t.s === 'bomb'){
        const [r,c] = rc(i);
        for(let rr=r-1; rr<=r+1; rr++){
          for(let cc=c-1; cc<=c+1; cc++){
            if(rr>=0 && rr<H && cc>=0 && cc<W) rem.add(idx(rr,cc));
          }
        }
      } else if(t.s === 'color'){
        // color bombs if matched should remove entire color — leave UI to trigger color-bomb activation
        // here we don't auto-clear colorbomb unless it's in removed and UI didn't handle; to be safe do nothing
      }
    }
    return Array.from(rem);
  }

  // collapse columns and refill with new tile objects, returns new grid and removedCount
  function collapseAndRefill(g, removedIndices){
    const removedSet = new Set(removedIndices);
    const ng = new Array(SIZE);
    for(let c=0;c<W;c++){
      const col = [];
      // collect bottom-up existing non removed tiles
      for(let r=H-1; r>=0; r--){
        const i = idx(r,c);
        if(!removedSet.has(i)) col.push(g[i]);
      }
      let writeR = H - 1;
      for(const t of col){
        ng[idx(writeR, c)] = { c: t.c, s: t.s }; // copy object
        writeR--;
      }
      // fill remaining top with new random tiles
      while(writeR >= 0){
        ng[idx(writeR, c)] = tile();
        writeR--;
      }
    }
    return { grid: ng, removedCount: removedIndices.length };
  }

  // convenience: check if index has match (uses color)
  function hasMatchAt(g,i){
    if(i<0||i>=SIZE) return false;
    const [r,c] = rc(i);
    const color = g[i].c;
    // horizontal
    let count = 1;
    for(let cc=c-1; cc>=0 && g[idx(r,cc)].c === color; cc--) count++;
    for(let cc=c+1; cc<W && g[idx(r,cc)].c === color; cc++) count++;
    if(count >= 3) return true;
    // vertical
    count = 1;
    for(let rr=r-1; rr>=0 && g[idx(rr,c)].c === color; rr--) count++;
    for(let rr=r+1; rr<H && g[idx(rr,c)].c === color; rr++) count++;
    return count >= 3;
  }

  // when swapping two indices, return matches (non-mutating copy)
  function trySwapAndFindMatches(g, a, b){
    if(!areAdjacent(a,b)) return [];
    const copy = g.map(t => ({c: t.c, s: t.s}));
    const tmp = copy[a]; copy[a] = copy[b]; copy[b] = tmp;
    const res = findMatchesWithSpecials(copy);
    return res.removed || [];
  }

  return {
    W, H, SIZE, COLORS,
    tile,
    generateGrid,
    swap,
    areAdjacent,
    findMatchesWithSpecials,
    collapseAndRefill,
    expandRemovedBySpecials,
    hasMatchAt,
    trySwapAndFindMatches
  };
})();

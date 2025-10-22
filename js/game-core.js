// js/game-core.js (updated with specials, obstacles, color-bomb support, timed levels)
const GameCore = (function(){
  const ROWS = 7, COLS = 7;
  const COLORS = 6; // 0..5
  // obstacle types: { type:'ice'|'choco', hits: n } stored in tile.o
  function randColor(){ return Math.floor(Math.random()*COLORS); }
  function index(r,c){ return r*COLS + c; }
  function coords(i){ return { r: Math.floor(i/COLS), c: i%COLS }; }
  function inBounds(r,c){ return r>=0 && c>=0 && r<ROWS && c<COLS; }

  // create random tile; optionally sometimes include obstacles (for higher levels)
  function makeTile(opts){
    opts = opts || {};
    const t = { c: randColor(), s: null, o: null };
    if(opts.obstacle){
      // obstacle example: ice (needs 1 match to break), choco needs 2
      if(Math.random() < 0.12) t.o = { type:'ice', hits:1 };
      else if(Math.random() < 0.08) t.o = { type:'choco', hits:2 };
    }
    return t;
  }

  function generateGrid(opts){
    opts = opts || {};
    const g = new Array(ROWS*COLS);
    for(let i=0;i<g.length;i++) g[i] = makeTile(opts);
    // remove initial matches
    while(true){
      const m = findMatchesWithSpecials(g);
      if(!m.removed || m.removed.length===0) break;
      for(const idx of m.removed) g[idx].c = randColor();
    }
    return g;
  }

  function areAdjacent(a,b){
    const A = coords(a), B = coords(b);
    const dr = Math.abs(A.r - B.r), dc = Math.abs(A.c - B.c);
    return (dr + dc) === 1;
  }
  function swap(g,a,b){ const t = g[a]; g[a] = g[b]; g[b] = t; }

  // find groups (horizontal + vertical), returns groups as arrays
  function collectGroups(g){
    const groups = [];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let run = [ index(r,0) ];
      for(let c=1;c<COLS;c++){
        const cur = index(r,c), prev = index(r,c-1);
        if(g[cur].c === g[prev].c) run.push(cur);
        else { if(run.length>=3) groups.push(run.slice()); run=[cur]; }
      }
      if(run.length>=3) groups.push(run.slice());
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let run = [ index(0,c) ];
      for(let r=1;r<ROWS;r++){
        const cur = index(r,c), prev = index(r-1,c);
        if(g[cur].c === g[prev].c) run.push(cur);
        else { if(run.length>=3) groups.push(run.slice()); run=[cur]; }
      }
      if(run.length>=3) groups.push(run.slice());
    }
    return groups;
  }

  // produce removed indices + specials creation instructions
  function findMatchesWithSpecials(g){
    const groups = collectGroups(g);
    const removedSet = new Set();
    const specials = []; // { pos, kind:'stripe'|'color' }

    for(const gr of groups){
      gr.forEach(i=> removedSet.add(i));
      if(gr.length === 4){
        // create stripe (decide later row/col)
        specials.push({ pos: gr[Math.floor(gr.length/2)], kind:'stripe', length:4 });
      } else if(gr.length >= 5){
        specials.push({ pos: gr[Math.floor(gr.length/2)], kind:'color', length:gr.length });
      }
    }

    // also check for L/T shapes -> if any cell appears in 2 groups crossing -> treat as color bomb
    const countMap = {};
    for(const gidx of groups.flat()){
      countMap[gidx] = (countMap[gidx]||0) + 1;
    }
    for(const k in countMap){
      if(countMap[k] >= 2){
        // crossing -> color bomb
        removedSet.add(Number(k));
        specials.push({ pos: Number(k), kind:'color', length:5 });
      }
    }

    return { removed: Array.from(removedSet), specials };
  }

  // decide and assign special types into grid (stripe -> row/col)
  function assignSpecialsFromGroups(grid, specialsList){
    specialsList.forEach(sp=>{
      if(!grid[sp.pos]) return;
      if(sp.kind === 'color'){ grid[sp.pos].s = 'color'; return; }
      // stripe: check orientation by neighbors
      const { r, c } = coords(sp.pos);
      let h=0,v=0;
      for(let dc=-2;dc<=2;dc++){ if(inBounds(r,c+dc) && grid[index(r,c+dc)].c === grid[sp.pos].c) h++; }
      for(let dr=-2;dr<=2;dr++){ if(inBounds(r+dr,c) && grid[index(r+dr,c)].c === grid[sp.pos].c) v++; }
      grid[sp.pos].s = (h >= v) ? 'row' : 'col';
    });
  }

  // expand removal due to specials already present on grid (row/col/color) AND obstacles (we will reduce hits instead of immediate remove)
  function expandRemovedBySpecials(grid, removedList){
    const set = new Set(removedList);
    // iterate removedList to also expand for specials on those cells
    removedList.forEach(idx=>{
      const tile = grid[idx];
      if(!tile) return;
      if(tile.s === 'row'){
        const rr = coords(idx).r;
        for(let c=0;c<COLS;c++) set.add(index(rr,c));
      } else if(tile.s === 'col'){
        const cc = coords(idx).c;
        for(let r=0;r<ROWS;r++) set.add(index(r,cc));
      } else if(tile.s === 'color'){
        const col = tile.c;
        for(let i=0;i<grid.length;i++) if(grid[i].c === col) set.add(i);
      }
    });
    return Array.from(set);
  }

  // handle obstacles: if a tile in removed set has tile.o -> reduce hits and if hits>0 keep tile (not remove)
  function applyObstaclesBeforeRemoval(grid, removedIndices){
    const toRemove = [];
    for(const idx of removedIndices){
      const t = grid[idx];
      if(t && t.o){
        t.o.hits = Math.max(0, t.o.hits - 1);
        if(t.o.hits <= 0){
          t.o = null;
          toRemove.push(idx);
        } else {
          // still obstacle remains — do not remove tile; we leave its color intact
        }
      } else {
        toRemove.push(idx);
      }
    }
    return toRemove;
  }

  // collapse + refill (drops down and new tiles enter from top)
  function collapseAndRefill(grid, removedIndices, opts){
    opts = opts || {};
    const removed = new Set(removedIndices || []);
    for(let c=0;c<COLS;c++){
      const stack = [];
      for(let r=ROWS-1;r>=0;r--){
        const idx = index(r,c);
        if(!removed.has(idx)) stack.push(grid[idx]);
      }
      while(stack.length < ROWS) stack.push(makeTile(opts));
      for(let r=ROWS-1, i=0; r>=0; r--, i++){
        grid[index(r,c)] = stack[i];
      }
    }
    return { grid };
  }

  function trySwapAndFindMatches(grid, a, b){
    const copy = grid.map(x => ({ ...x }));
    swap(copy, a, b);
    const m = findMatchesWithSpecials(copy);
    // if swap hits obstacle-only positions: still consider matches only if removed non-zero
    return (m.removed && m.removed.length) ? m.removed : [];
  }

  return {
    ROWS, COLS, COLORS,
    generateGrid, swap, areAdjacent,
    findMatchesWithSpecials, expandRemovedBySpecials, collapseAndRefill,
    trySwapAndFindMatches, assignSpecialsFromGroups,
    applyObstaclesBeforeRemoval
  };
})();

/* game-core: grid and match logic */
window.Game = (function(){
  // configuration
  const defaultConfig = {
    rows: 7,
    cols: 7,
    candyCount: 5, // uses images candy1..candy5
    moves: 30,
  };

  // level definitions - per level override (target, moves)
  const LEVELS = {
    1: { target:600, moves:30 },
    2: { target:900, moves:28 },
    3: { target:1200, moves:30 },
    4: { target:1500, moves:26 },
    5: { target:1800, moves:30 },
    6: { target:2100, moves:30 },
    7: { target:2400, moves:26 },
    8: { target:2700, moves:24 },
    9: { target:3000, moves:24 },
  };

  // state
  let cfg = Object.assign({}, defaultConfig);
  let grid = []; // 2D array [r][c] = {type}
  let score=0, movesRemaining=0, target=600, level=1;
  let onUpdate = null;
  let animating = false;

  // helpers
  function rnd(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

  function createGrid(rows, cols){
    grid = [];
    for(let r=0;r<rows;r++){
      const row = [];
      for(let c=0;c<cols;c++){
        row.push({ type: rnd(1, cfg.candyCount) });
      }
      grid.push(row);
    }
    // ensure initial grid has no pre-existing matches:
    removeInitialMatches();
  }

  function removeInitialMatches(){
    const rows = cfg.rows, cols = cfg.cols;
    function hasMatchAt(r,c){
      const t = grid[r][c].type;
      // horiz
      let cnt=1;
      for(let x=c-1;x>=0 && grid[r][x].type===t;x--) cnt++;
      for(let x=c+1;x<cols && grid[r][x].type===t;x++) cnt++;
      if(cnt>=3) return true;
      // vert
      cnt=1;
      for(let y=r-1;y>=0 && grid[y][c].type===t;y--) cnt++;
      for(let y=r+1;y<rows && grid[y][c].type===t;y++) cnt++;
      if(cnt>=3) return true;
      return false;
    }
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(hasMatchAt(r,c)){
          grid[r][c].type = rnd(1, cfg.candyCount);
        }
      }
    }
  }

  function swapCells(aR,aC,bR,bC){
    const tmp = grid[aR][aC].type;
    grid[aR][aC].type = grid[bR][bC].type;
    grid[bR][bC].type = tmp;
  }

  function findMatches(){
    const rows = cfg.rows, cols = cfg.cols;
    const matched = Array.from({length:rows},()=>Array(cols,false));
    let any=false;
    // horizontal
    for(let r=0;r<rows;r++){
      let runType = null, start=0, len=0;
      for(let c=0;c<cols+1;c++){
        const t = (c<cols) ? grid[r][c].type : null;
        if(t !== runType){
          if(len>=3){
            any = true;
            for(let x=start;x<start+len;x++) matched[r][x]=true;
          }
          runType = t;
          start = c;
          len = 1;
        } else {
          len++;
        }
      }
    }
    // vertical
    for(let c=0;c<cols;c++){
      let runType = null, start=0, len=0;
      for(let r=0;r<rows+1;r++){
        const t = (r<rows) ? grid[r][c].type : null;
        if(t !== runType){
          if(len>=3){
            any = true;
            for(let y=start;y<start+len;y++) matched[y][c]=true;
          }
          runType = t;
          start = r;
          len = 1;
        } else {
          len++;
        }
      }
    }
    // prepare list
    const removes = [];
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(matched[r][c]) removes.push({r,c});
      }
    }
    return { any, removes, matched};
  }

  function clearMatchesAndCollapse(){
    const rows = cfg.rows, cols = cfg.cols;
    const found = findMatches();
    if(!found.any) return 0;
    // mark removed
    for(const cell of found.removes){
      grid[cell.r][cell.c].type = 0; // 0 = empty
    }
    // collapse column by column
    for(let c=0;c<cols;c++){
      let write = rows-1;
      for(let r=rows-1;r>=0;r--){
        if(grid[r][c].type !== 0){
          grid[write][c].type = grid[r][c].type;
          write--;
        }
      }
      // fill top empty
      for(let r=write;r>=0;r--){
        grid[r][c].type = rnd(1, cfg.candyCount);
      }
    }
    // scoring: each removed cell gives +50
    const gained = found.removes.length * 50;
    score += gained;
    return gained;
  }

  /* Public API used by UI */
  return {
    config: cfg,
    start(lvl=1, opts={}){
      if(animating) return;
      level = parseInt(lvl,10) || 1;
      Object.assign(cfg, defaultConfig, opts);
      // level overrides
      const L = LEVELS[level] || LEVELS[1];
      target = L.target; movesRemaining = L.moves;
      score = 0;
      createGrid(cfg.rows, cfg.cols);
      // expose to UI
      if(window.onGameUpdate) window.onGameUpdate();
    },
    getGrid(){ return grid; },
    getState(){ return {score,movesRemaining,target,level}; },
    canSwap(r1,c1,r2,c2){
      // must be adjacent
      const d = Math.abs(r1-r2)+Math.abs(c1-c2);
      return d===1;
    },
    trySwap(r1,c1,r2,c2){
      if(animating) return Promise.resolve(false);
      if(!this.canSwap(r1,c1,r2,c2)) return Promise.resolve(false);
      swapCells(r1,c1,r2,c2);
      // if swap creates match -> accept; else revert
      const found = findMatches();
      if(!found.any){
        // revert
        swapCells(r1,c1,r2,c2);
        return Promise.resolve(false);
      }
      // Accept swap
      movesRemaining = Math.max(0, movesRemaining-1);
      return new Promise((resolve)=>{
        animating = true;
        // do clearing cycles until no matches
        const step = ()=>{
          const gain = clearMatchesAndCollapse();
          if(gain>0){
            // continue after short delay so UI can re-render
            if(window.onGameUpdate) window.onGameUpdate();
            setTimeout(step, 240);
          } else {
            animating = false;
            if(window.onGameUpdate) window.onGameUpdate();
            resolve(true);
          }
        };
        // start chain
        if(window.CMSound) CMSound.play('swap');
        setTimeout(step, 180);
      });
    }
  };
})();

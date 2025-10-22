// js/game-core.js
// Core engine: grid, match detection, remove, collapse, refill, scoring.
// (Replace existing file with this)

const GameCore = (function(){
  const ROWS = 6;
  const COLS = 6;
  const CANDY_TYPES = 6;
  let grid = [];
  let score = 0;
  let moves = 30;
  let target = 600;
  let level = 1;
  let locked = false;
  let onChange = ()=>{};

  const rand = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;
  function makeEmpty(){ grid = Array.from({length: ROWS}, ()=> Array(COLS).fill(0)); }

  function wouldMatchAt(r,c,t){
    // left
    if(c>=2 && grid[r][c-1]===t && grid[r][c-2]===t) return true;
    // up
    if(r>=2 && grid[r-1][c]===t && grid[r-2][c]===t) return true;
    return false;
  }

  function initGrid(){
    makeEmpty();
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let t, attempts=0;
        do {
          t = rand(1, CANDY_TYPES);
          attempts++;
          if(attempts>30) break;
        } while (wouldMatchAt(r,c,t));
        grid[r][c] = t;
      }
    }
  }

  function getState(){ return { grid: grid.map(r=>r.slice()), score, moves, target, level }; }

  function isAdjacent(r1,c1,r2,c2){
    const dr = Math.abs(r1-r2), dc = Math.abs(c1-c2);
    return (dr+dc)===1;
  }

  // find groups (returns array of arrays of [r,c])
  function findAllMatches(){
    const found = [];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let c=0;
      while(c<COLS){
        const t = grid[r][c];
        if(!t){ c++; continue; }
        let j=c+1;
        while(j<COLS && grid[r][j]===t) j++;
        if(j-c >= 3){
          const g=[];
          for(let x=c;x<j;x++) g.push([r,x]);
          found.push(g);
        }
        c = j;
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let r=0;
      while(r<ROWS){
        const t = grid[r][c];
        if(!t){ r++; continue; }
        let j=r+1;
        while(j<ROWS && grid[j][c]===t) j++;
        if(j-r >= 3){
          const g=[];
          for(let x=r;x<j;x++) g.push([x,c]);
          found.push(g);
        }
        r = j;
      }
    }
    // merge uniques
    const mark = Array.from({length:ROWS}, ()=> Array(COLS).fill(false));
    const merged = [];
    found.forEach(g=>{
      const uniq=[];
      g.forEach(([r,c])=>{
        if(!mark[r][c]){ mark[r][c]=true; uniq.push([r,c]); }
      });
      if(uniq.length) merged.push(uniq);
    });
    return merged;
  }

  function removeGroups(groups){
    let cnt=0;
    groups.forEach(g=>{
      g.forEach(([r,c])=>{
        if(grid[r][c] !== 0){ grid[r][c]=0; cnt++; }
      });
    });
    // scoring: 100 per candy * combo multiplier (simple)
    const add = cnt * 100;
    score += add;
    onChange(getState());
    return cnt;
  }

  function collapseColumns(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c] !== 0){
          grid[write][c] = grid[r][c];
          write--;
        }
      }
      for(let r=write;r>=0;r--) grid[r][c] = 0;
    }
  }

  function refillGrid(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(grid[r][c]===0) grid[r][c] = rand(1,CANDY_TYPES);
      }
    }
    onChange(getState());
  }

  function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }

  async function resolveLoop(){
    locked = true;
    // loop until no more matches
    while(true){
      const groups = findAllMatches();
      if(!groups.length) break;
      removeGroups(groups);
      // small delay to let UI show removal
      await sleep(200);
      collapseColumns();
      await sleep(150);
      refillGrid();
      await sleep(200);
    }
    locked = false;
    onChange(getState());
  }

  function trySwap(r1,c1,r2,c2){
    if(locked) return false;
    if(!isAdjacent(r1,c1,r2,c2)) return false;
    // swap
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    onChange(getState());
    const groups = findAllMatches();
    if(groups.length){
      moves = Math.max(0, moves-1);
      // resolve
      resolveLoop();
      return true;
    } else {
      // revert quickly for visual
      setTimeout(()=>{
        [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
        onChange(getState());
      }, 180);
      return false;
    }
  }

  function start(newLevel=1){
    level = Number(newLevel) || 1;
    score = 0;
    moves = 30;
    target = 600 + (level-1)*200;
    initGrid();
    // prevent any existing immediate matches by resolving once
    setTimeout(()=> resolveLoop(), 60);
    onChange(getState());
    return getState();
  }

  function onUpdate(cb){ onChange = cb || (()=>{}); }

  return {
    ROWS, COLS, CANDY_TYPES,
    start, trySwap, onUpdate, getState
  };
})();

window.GameCore = GameCore;

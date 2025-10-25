// game-core.js
(function(){
  window.CORE = window.CORE || {};

  // configuration
  const CANDY_TYPES = 6;
  const ROWS = 7;
  const COLS = 7;
  const START_MOVES = 30;
  const START_TARGET = 600;

  // state
  const state = {
    rows: ROWS, cols: COLS,
    board: [], score:0, moves:START_MOVES, target:START_TARGET, level:1,
    lock:false
  };

  // random
  function randCandy(){ return Math.floor(Math.random()*CANDY_TYPES); }

  // create initial board without immediate matches
  function createInitialBoard(){
    const b=[];
    for(let r=0;r<state.rows;r++){
      b[r]=[];
      for(let c=0;c<state.cols;c++){
        b[r][c]=randCandy();
      }
    }
    // remove initial matches by retrying few times
    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        let tries=0;
        while(hasMatchAt(b,r,c) && tries<10){
          b[r][c]=randCandy(); tries++;
        }
      }
    }
    return b;
  }

  // match detection helpers
  function hasMatchAt(b,r,c){
    const v=b[r][c]; if(v==null) return false;
    let cnt=1;
    for(let x=c-1;x>=0 && b[r][x]===v;x--) cnt++;
    for(let x=c+1;x<b[0].length && b[r][x]===v;x++) cnt++;
    if(cnt>=3) return true;
    cnt=1;
    for(let y=r-1;y>=0 && b[y][c]===v;y--) cnt++;
    for(let y=r+1;y<b.length && b[y][c]===v;y++) cnt++;
    if(cnt>=3) return true;
    return false;
  }

  function findAllMatches(b){
    const mark = Array.from({length:state.rows},()=>Array(state.cols).fill(false));
    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        const v=b[r][c];
        if(v==null) continue;
        // horizontal
        let end=c+1; while(end<state.cols && b[r][end]===v) end++;
        if(end-c>=3) for(let x=c;x<end;x++) mark[r][x]=true;
        // vertical
        end=r+1; while(end<state.rows && b[end][c]===v) end++;
        if(end-r>=3) for(let y=r;y<end;y++) mark[y][c]=true;
      }
    }
    const res=[];
    for(let r=0;r<state.rows;r++) for(let c=0;c<state.cols;c++) if(mark[r][c]) res.push([r,c]);
    return res;
  }

  function swap(b,r1,c1,r2,c2){
    const t=b[r1][c1]; b[r1][c1]=b[r2][c2]; b[r2][c2]=t;
  }

  function gravityAndRefill(b){
    for(let c=0;c<state.cols;c++){
      let write = state.rows-1;
      for(let r=state.rows-1;r>=0;r--){
        if(b[r][c]!=null){ b[write][c]=b[r][c]; if(write!==r) b[r][c]=null; write--; }
      }
      for(let r=write;r>=0;r--) b[r][c]=randCandy();
    }
  }

  // responsive var calculator
  function setupResponsiveGridVars(gridId='gameGrid'){
    const gridEl = document.getElementById(gridId);
    if(!gridEl) return;
    function compute(){
      const parent = gridEl.parentElement;
      const avail = Math.min(parent.getBoundingClientRect().width, window.innerWidth - 32);
      const minCell=48, maxCell=72, gap=12, minCols=5, maxCols=8;
      let chosenCols=minCols, chosenSize=minCell;
      for(let cols=maxCols; cols>=minCols; cols--){
        const reqMin = cols*minCell + (cols-1)*gap;
        if(reqMin <= avail){
          const size = Math.min(maxCell, Math.floor((avail - (cols-1)*gap)/cols));
          chosenCols = cols; chosenSize = Math.max(minCell, size);
          break;
        }
      }
      document.documentElement.style.setProperty('--cols', chosenCols);
      document.documentElement.style.setProperty('--cell-size', chosenSize + 'px');
      document.documentElement.style.setProperty('--gap', gap + 'px');
    }
    compute();
    window.addEventListener('resize', ()=>{ clearTimeout(window._rg); window._rg=setTimeout(compute,120); });
    window.addEventListener('load', compute);
  }

  // expose
  window.CORE.createInitialBoard = createInitialBoard;
  window.CORE.findAllMatches = findAllMatches;
  window.CORE.hasMatchAt = hasMatchAt;
  window.CORE.swap = swap;
  window.CORE.gravityAndRefill = gravityAndRefill;
  window.CORE.state = state;
  window.CORE.setupResponsiveGridVars = setupResponsiveGridVars;
})();

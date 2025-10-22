// game-core.js
// Core engine: grid state, match detection, gravity & refill

const Core = (function(){
  const ROWS = 6;
  const COLS = 6;
  const TYPES = 6; // number of candy types (images 1..6)

  function randType(){ return Math.floor(Math.random()*TYPES)+1; }

  // create empty matrix
  function createEmpty(){
    const g = new Array(ROWS);
    for(let r=0;r<ROWS;r++){ g[r] = new Array(COLS).fill(0); }
    return g;
  }

  // fill grid without immediate matches (simple retry)
  function createInitial(){
    const g = createEmpty();
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let t;
        do {
          t = randType();
          g[r][c] = t;
        } while (createsMatchAt(g, r, c));
      }
    }
    return g;
  }

  // check if placing g[r][c] creates a 3+ horizontal/vertical
  function createsMatchAt(g, r, c){
    const val = g[r][c];
    // horizontal
    if(c>=2 && g[r][c-1] === val && g[r][c-2] === val) return true;
    // vertical
    if(r>=2 && g[r-1][c] === val && g[r-2][c] === val) return true;
    return false;
  }

  // swap two cells in grid
  function swap(g, a, b){
    const tmp = g[a.r][a.c];
    g[a.r][a.c] = g[b.r][b.c];
    g[b.r][b.c] = tmp;
  }

  // find all matches (returns array of positions to remove)
  function findMatches(g){
    const remove = Array.from({length:ROWS}, ()=> new Array(COLS).fill(false));
    // horizontal
    for(let r=0;r<ROWS;r++){
      let start = 0;
      while(start < COLS){
        const v = g[r][start];
        if(!v){ start++; continue; }
        let end = start+1;
        while(end<COLS && g[r][end]===v) end++;
        if(end-start >= 3){
          for(let c=start;c<end;c++) remove[r][c]=true;
        }
        start = end;
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let start = 0;
      while(start < ROWS){
        const v = g[start][c];
        if(!v){ start++; continue; }
        let end = start+1;
        while(end<ROWS && g[end][c]===v) end++;
        if(end-start >= 3){
          for(let r=start;r<end;r++) remove[r][c]=true;
        }
        start = end;
      }
    }
    // collect coords
    const coords = [];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(remove[r][c]) coords.push({r,c});
    return coords;
  }

  // remove matched cells (set to 0) and return how many removed
  function removeMatches(g, coords){
    for(const p of coords) g[p.r][p.c] = 0;
    return coords.length;
  }

  // collapse each column down (gravity), return array of moved positions (for animation mapping)
  function collapse(g){
    const ROWS = g.length;
    const COLS = g[0].length;
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(g[r][c] !== 0){
          g[write][c] = g[r][c];
          if(write !== r) g[r][c] = 0;
          write--;
        }
      }
      // fill new at top
      while(write >= 0){
        g[write][c] = randType();
        write--;
      }
    }
  }

  return {
    ROWS, COLS, TYPES,
    createInitial, swap, findMatches, removeMatches, collapse
  };
})();

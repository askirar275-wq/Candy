// Game core: state, build, match detect, swap, gravity, events
window.Game = (function(){
  const TYPES = ['candy1','candy2','candy3','candy4','candy5','candy6']; // image names (images/candy1.png etc.)
  const state = { rows:7, cols:6, board:[], score:0, moves:30, target:600, level:1 };
  function randType(){ return TYPES[Math.floor(Math.random()*TYPES.length)]; }
  function buildBoard(r,c){
    const b = Array.from({length:r}, ()=> Array.from({length:c}, ()=> ({ type: randType() })));
    return b;
  }
  function dispatch(name, detail){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  function detectMatches(board){
    const rows=board.length, cols=board[0].length, res=[];
    const add = (r,c)=> res.push({r,c});
    // horizontal
    for(let r=0;r<rows;r++){
      let t=null, start=0, len=0;
      for(let c=0;c<=cols;c++){
        const cur = (c<cols && board[r][c]) ? board[r][c].type : null;
        if(cur && cur===t){ len++; } else {
          if(len>=3) for(let k=start;k<start+len;k++) add(r,k);
          t=cur; start=c; len=1;
        }
      }
    }
    // vertical
    for(let c=0;c<cols;c++){
      let t=null, start=0, len=0;
      for(let r=0;r<=rows;r++){
        const cur = (r<rows && board[r][c]) ? board[r][c].type : null;
        if(cur && cur===t){ len++; } else {
          if(len>=3) for(let k=start;k<start+len;k++) res.push({r:k,c});
          t=cur; start=r; len=1;
        }
      }
    }
    // uniq
    const keys = new Set(); return res.filter(p=>{ const k = `${p.r},${p.c}`; if(keys.has(k)) return false; keys.add(k); return true; });
  }
  function clearMatches(board){
    const found = detectMatches(board);
    if(found.length===0) return 0;
    found.forEach(f=> board[f.r][f.c] = null);
    const gained = found.length * 10;
    state.score += gained;
    dispatch('score-changed', { score: state.score });
    Sound.play('pop');
    return found.length;
  }
  function gravityAndRefill(board){
    const rows=board.length, cols=board[0].length;
    for(let c=0;c<cols;c++){
      let write = rows-1;
      for(let r=rows-1;r>=0;r--){ if(board[r][c]){ board[write][c] = board[r][c]; write--; } }
      for(let r=write;r>=0;r--) board[r][c] = { type: randType() };
    }
  }

  return {
    init: function(){ console.log('[CORE] init'); },
    start: function(level){
      state.level = level||1;
      state.rows = 7; state.cols = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols')) || 6;
      state.board = buildBoard(state.rows, state.cols);
      state.score = 0; state.moves = 30; state.target = state.level * 600;
      dispatch('game-ready', { state: JSON.parse(JSON.stringify(state)) });
      // remove initial accidental matches
      for(let i=0;i<6;i++){ if(clearMatches(state.board)===0) break; gravityAndRefill(state.board); }
      dispatch('game-start', { state: JSON.parse(JSON.stringify(state)) });
      dispatch('board-changed', { board: state.board });
    },
    getState: function(){ return JSON.parse(JSON.stringify(state)); },
    trySwap: function(r1,c1,r2,c2){
      try{
        const b = state.board;
        // bounds
        if(!b[r1]||!b[r2]) return false;
        const tmp = b[r1][c1]; b[r1][c1] = b[r2][c2]; b[r2][c2] = tmp;
        const matches = detectMatches(b);
        if(matches.length===0){
          // revert
          const tmp2 = b[r1][c1]; b[r1][c1] = b[r2][c2]; b[r2][c2] = tmp2;
          return false;
        }
        state.moves = Math.max(0, state.moves-1);
        dispatch('moves-changed', { moves: state.moves });
        // collapse loop
        let total=0;
        while(true){
          const ccount = clearMatches(b);
          if(ccount===0) break;
          total += ccount;
          gravityAndRefill(b);
          dispatch('board-changed', { board: b });
        }
        dispatch('swap-ok', { from:{r:r1,c:c1}, to:{r:r2,c:c2}, cleared: total });
        if(state.score >= state.target){
          dispatch('level-complete', { score: state.score });
        }
        if(state.moves<=0) dispatch('game-over', { score: state.score });
        return true;
      }catch(e){ console.error('swap err',e); return false; }
    },
    shuffle: function(){
      state.board = buildBoard(state.rows, state.cols);
      dispatch('board-changed', { board: state.board });
    }
  };
})();

// js/game-core.js
// गेम core: board बनाना, swap, match detection (3+), remove, collapse + refill, score & moves.
// सुरक्षित: console logs देता है, और DOM पर निर्भर नहीं।

(function(){
  const log = (...a)=> console.log('[CORE]', ...a);

  const CFG = {
    rows: 6,
    cols: 6,
    candyTypes: 6,
    startMoves: 30,
    baseScorePerCandy: 10,
    maxResolveLoops: 12
  };

  let state = null;

  function rand(n){ return Math.floor(Math.random()*n); }

  function makeRandomBoard(){
    const b = [];
    for(let r=0;r<CFG.rows;r++){
      b[r] = [];
      for(let c=0;c<CFG.cols;c++){
        b[r][c] = 1 + rand(CFG.candyTypes);
      }
    }
    return b;
  }

  function newState(level=1){
    return {
      level: Number(level)||1,
      rows: CFG.rows,
      cols: CFG.cols,
      board: makeRandomBoard(),
      score: 0,
      moves: CFG.startMoves,
      target: (level==1?600: level==2?900:1200)
    };
  }

  function inBounds(r,c){ return r>=0 && c>=0 && r<CFG.rows && c<CFG.cols; }

  // swap two positions on board
  function swap(board, r1,c1, r2,c2){
    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;
  }

  // find contiguous groups (horizontal & vertical) length>=3
  function findMatches(board){
    const groups = [];
    // horizontal
    for(let r=0;r<CFG.rows;r++){
      let val = board[r][0], start = 0;
      for(let c=1;c<=CFG.cols;c++){
        const cur = (c<CFG.cols? board[r][c] : null);
        if(cur === val){
          // continue
        } else {
          const len = c - start;
          if(val !== null && len >= 3){
            const group = [];
            for(let cc=start; cc<c; cc++) group.push({r, c:cc});
            groups.push(group);
          }
          val = cur;
          start = c;
        }
      }
    }
    // vertical
    for(let c=0;c<CFG.cols;c++){
      let val = board[0][c], start = 0;
      for(let r=1;r<=CFG.rows;r++){
        const cur = (r<CFG.rows? board[r][c] : null);
        if(cur === val){
        } else {
          const len = r - start;
          if(val !== null && len >= 3){
            const group = [];
            for(let rr=start; rr<r; rr++) group.push({r:rr, c});
            groups.push(group);
          }
          val = cur;
          start = r;
        }
      }
    }
    return groups;
  }

  // remove groups: set to 0 (empty)
  function removeGroups(board, groups){
    let removed = 0;
    groups.forEach(g=>{
      g.forEach(pt=>{
        if(board[pt.r][pt.c] !== 0){
          board[pt.r][pt.c] = 0;
          removed++;
        }
      });
    });
    return removed;
  }

  // collapse gravity per column and refill with random at top
  function collapseAndRefill(board){
    for(let c=0;c<CFG.cols;c++){
      let write = CFG.rows - 1;
      for(let r=CFG.rows-1; r>=0; r--){
        if(board[r][c] !== 0){
          board[write][c] = board[r][c];
          if(write !== r) board[r][c] = 0;
          write--;
        }
      }
      // fill remaining
      while(write >= 0){
        board[write][c] = 1 + rand(CFG.candyTypes);
        write--;
      }
    }
  }

  // resolve loop: findMatches -> remove -> collapse/refill -> repeat until no match
  function resolve(board){
    let totalRemoved = 0;
    let totalPoints = 0;
    let loop = 0;
    while(true){
      loop++;
      const groups = findMatches(board);
      if(!groups || groups.length === 0) break;
      const removed = removeGroups(board, groups);
      totalRemoved += removed;
      const multiplier = Math.max(1, loop);
      totalPoints += removed * CFG.baseScorePerCandy * multiplier;
      collapseAndRefill(board);
      if(loop >= CFG.maxResolveLoops) break;
    }
    return { removed: totalRemoved, points: totalPoints };
  }

  // public API
  window.GameCore = {
    CFG,
    start(level){
      state = newState(level);
      // quick safety: avoid starting board with immediate matches by limited reshuffle
      for(let t=0;t<10;t++){
        const groups = findMatches(state.board);
        if(groups.length === 0) break;
        // randomize some matched tiles
        groups.forEach(g=>{
          g.forEach(pt=>{
            state.board[pt.r][pt.c] = 1 + rand(CFG.candyTypes);
          });
        });
      }
      console.log('[CORE] started', state.level);
      // dispatch event
      window.dispatchEvent(new CustomEvent('core-ready', {detail: {state}}));
      return state;
    },

    getState(){ return state; },

    // attempt swap then resolve; returns object {ok, removed, points}. If no match, swap is reverted.
    attemptSwap(r1,c1,r2,c2){
      if(!state) return { ok:false, reason:'no-state' };
      if(!inBounds(r1,c1) || !inBounds(r2,c2)) return { ok:false, reason:'oob' };
      // don't allow same cell
      if(r1===r2 && c1===c2) return { ok:false, reason:'same' };

      swap(state.board, r1,c1, r2,c2);
      const groups = findMatches(state.board);
      if(!groups || groups.length === 0){
        // revert
        swap(state.board, r1,c1, r2,c2);
        return { ok:false, reason:'no-match' };
      }

      // valid: decrement moves
      state.moves = Math.max(0, state.moves - 1);
      // resolve until stable
      const res = resolve(state.board);
      state.score += res.points;
      return { ok:true, removed: res.removed, points: res.points };
    },

    // helper to force new random board
    shuffleBoard(){
      if(!state) return;
      state.board = makeRandomBoard();
      console.log('[CORE] shuffled board');
      return state.board;
    }
  };

})();

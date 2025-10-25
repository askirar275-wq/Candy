/* js/game-core.js
   गेम core (state, board generation, matching, gravity, scoring)
   Hindi comments added.
*/

(function(){
  // सिंपल namespace
  window.Game = window.Game || {};

  // कॉन्फ़िग
  const CFG = {
    defaultSize: 6,           // NxN board default
    candyCount: 6,            // कितने अलग candies (image types)
    baseScore: 10,            // प्रति candy base score (3-match के लिये)
    comboBonus: 5,            // combo chain multiplier add
    shuffleAttempts: 50       // shuffle attempts to avoid deadboard
  };

  // candy images (उदाहरण paths) — अपने project images के अनुसार बदलें
  const CANDY_IMAGES = [
    'img/candy-1.png',
    'img/candy-2.png',
    'img/candy-3.png',
    'img/candy-4.png',
    'img/candy-5.png',
    'img/candy-6.png'
  ];

  // GAME state
  const state = {
    rows: CFG.defaultSize,
    cols: CFG.defaultSize,
    board: [],          // 2D array rows x cols : each cell {type:0..N-1, special:null|'striped'|'wrapped'|'colorbomb'}
    score: 0,
    moves: 30,
    target: 600,
    timerSeconds: null, // null = no timer
    level: 1,
    running: false
  };

  // Helper: create an empty board
  function makeEmptyBoard(r,c){
    const b = new Array(r);
    for(let i=0;i<r;i++){
      b[i] = new Array(c);
      for(let j=0;j<c;j++) b[i][j] = null;
    }
    return b;
  }

  // Random candy type (0..candyCount-1)
  function randCandy(){
    return Math.floor(Math.random() * CFG.candyCount);
  }

  // Ensure initial board has no immediate matches (simple approach: fill and remove matches until clean)
  function fillBoardNoMatches(){
    const r = state.rows, c = state.cols;
    state.board = makeEmptyBoard(r,c);
    for(let i=0;i<r;i++){
      for(let j=0;j<c;j++){
        let tries=0;
        do {
          state.board[i][j] = { type: randCandy(), special: null };
          tries++;
          // break infinite loops
          if(tries>20) break;
        } while(createsImmediateMatch(i,j));
      }
    }
  }

  // Returns true if placing at i,j creates 3-in-row immediately
  function createsImmediateMatch(i,j){
    const val = state.board[i][j].type;
    // horizontal check left 2
    if(j>=2 && state.board[i][j-1] && state.board[i][j-2]){
      if(state.board[i][j-1].type === val && state.board[i][j-2].type === val) return true;
    }
    // vertical check up 2
    if(i>=2 && state.board[i-1][j] && state.board[i-2][j]){
      if(state.board[i-1][j].type === val && state.board[i-2][j].type === val) return true;
    }
    return false;
  }

  // Utility: swap two cells (i1,j1) <-> (i2,j2)
  function swapCells(i1,j1,i2,j2){
    const tmp = state.board[i1][j1];
    state.board[i1][j1] = state.board[i2][j2];
    state.board[i2][j2] = tmp;
  }

  // Find matches on current board.
  // Returns array of match objects: {cells:[[i,j],...], type:'normal'|'4row'|'4col'|'5' ...}
  function findMatches(){
    const r = state.rows, c = state.cols;
    const marked = makeEmptyBoard(r,c); // bool marks
    const matches = [];

    // horizontal runs
    for(let i=0;i<r;i++){
      let j=0;
      while(j<c){
        if(!state.board[i][j]) { j++; continue; }
        const t = state.board[i][j].type;
        let len = 1;
        while(j+len < c && state.board[i][j+len] && state.board[i][j+len].type === t) len++;
        if(len >= 3){
          const cells = [];
          for(let k=0;k<len;k++){ cells.push([i, j+k]); marked[i][j+k] = true; }
          matches.push({ cells, kind:'h', len, type: t });
        }
        j += len;
      }
    }

    // vertical runs
    for(let j=0;j<c;j++){
      let i=0;
      while(i<r){
        if(!state.board[i][j]) { i++; continue; }
        const t = state.board[i][j].type;
        let len = 1;
        while(i+len < r && state.board[i+len][j] && state.board[i+len][j].type === t) len++;
        if(len >= 3){
          const cells = [];
          for(let k=0;k<len;k++){ cells.push([i+k, j]); marked[i+k][j] = true; }
          matches.push({ cells, kind:'v', len, type:t });
        }
        i += len;
      }
    }

    // merge overlapping matches: if same color and share cells we keep both; we will remove all marked cells
    return matches;
  }

  // remove matches, compute score, and produce special candies for 4/5 matches
  // Returns total removed count and indicates specials created
  function resolveMatchesAndDrop(){
    const matches = findMatches();
    if(matches.length === 0) return { removed:0, score:0, specials:[] };

    // To avoid double-counting we will mark removed cells in a set
    const toRemove = new Set();
    let scoreGain = 0;
    const specials = [];

    for(const m of matches){
      // mark each cell
      for(const [i,j] of m.cells){
        toRemove.add(i+','+j);
      }
      // scoring: base per candy * length * multiplier by type of match
      // We'll set:
      // 3-match: base * len
      // 4-match: base*len + bonus
      // 5-match: big bonus
      if(m.len === 3){
        scoreGain += CFG.baseScore * 3;
      } else if(m.len === 4){
        scoreGain += CFG.baseScore * 4 + 150;
        // create striped candy at one of the matched cells (choose last)
        specials.push({ at: m.cells[Math.floor(m.cells.length/2)], kind: 'striped', color: m.type });
      } else if(m.len >= 5){
        scoreGain += CFG.baseScore * m.len + 350;
        // create color-bomb at a center cell
        specials.push({ at: m.cells[Math.floor(m.cells.length/2)], kind: 'colorbomb', color: m.type });
      } else {
        scoreGain += CFG.baseScore * m.len;
      }
    }

    // remove cells
    for(const key of toRemove){
      const [si,sj] = key.split(',').map(Number);
      state.board[si][sj] = null;
    }

    // place specials (make sure target cell is null; otherwise find nearby)
    for(const s of specials){
      const [i,j] = s.at;
      if(state.board[i][j] === null){
        state.board[i][j] = { type: s.color, special: s.kind };
      } else {
        // find first empty neighbour
        let placed = false;
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for(const d of dirs){
          const ni=i+d[0], nj=j+d[1];
          if(ni>=0 && ni<state.rows && nj>=0 && nj<state.cols && state.board[ni][nj]===null){
            state.board[ni][nj] = { type: s.color, special: s.kind };
            placed = true; break;
          }
        }
        if(!placed){
          // find any null
          for(let ii=0; ii<state.rows && !placed; ii++){
            for(let jj=0; jj<state.cols && !placed; jj++){
              if(state.board[ii][jj]===null){ state.board[ii][jj] = { type:s.color, special:s.kind }; placed=true; }
            }
          }
        }
      }
    }

    // gravity/refill
    let removedCount = toRemove.size;
    scoreGain = Math.round(scoreGain);
    state.score += scoreGain;

    applyGravityAndRefill();

    return { removed: removedCount, score: scoreGain, specials };
  }

  // gravity: for each column, make candies fall down and fill from top with new random candies
  function applyGravityAndRefill(){
    const r = state.rows, c = state.cols;
    for(let col=0; col<c; col++){
      const stack = [];
      for(let row=r-1; row>=0; row--){
        if(state.board[row][col]) stack.push(state.board[row][col]);
      }
      // fill from bottom
      let row = r-1;
      for(const v of stack){
        state.board[row][col] = v;
        row--;
      }
      // remaining top cells fill
      while(row >= 0){
        state.board[row][col] = { type: randCandy(), special: null };
        row--;
      }
    }
  }

  // Check whether any possible move exists (simple brute force swap test)
  function hasPossibleMoves(){
    const r=state.rows, c=state.cols;
    function testSwap(i1,j1,i2,j2){
      swapCells(i1,j1,i2,j2);
      const ok = findMatches().length > 0;
      swapCells(i1,j1,i2,j2); // revert
      return ok;
    }
    for(let i=0;i<r;i++){
      for(let j=0;j<c;j++){
        if(j+1<c && testSwap(i,j,i,j+1)) return true;
        if(i+1<r && testSwap(i,j,i+1,j)) return true;
      }
    }
    return false;
  }

  // shuffle board randomly until hasPossibleMoves true or attempts exhausted
  function shuffleBoard(){
    const r=state.rows,c=state.cols;
    for(let attempt=0; attempt<CFG.shuffleAttempts; attempt++){
      // randomize types
      for(let i=0;i<r;i++){
        for(let j=0;j<c;j++){
          state.board[i][j] = { type: randCandy(), special: null };
        }
      }
      // ensure no immediate matches
      for(let i=0;i<r;i++){
        for(let j=0;j<c;j++){
          if(createsImmediateMatch(i,j)) state.board[i][j] = { type: randCandy(), special: null };
        }
      }
      if(hasPossibleMoves()) return true;
    }
    return false;
  }

  // PUBLIC API
  window.Game.start = function(level = 1){
    console.log('[CORE] init start level', level);
    state.level = level;
    // set difficulty based on level (simple)
    state.rows = CFG.defaultSize;
    state.cols = CFG.defaultSize;
    state.score = 0;
    state.moves = 30;
    state.target = 600 * (Math.ceil(level/1)); // each level target up
    state.timerSeconds = null;
    fillBoardNoMatches();
    // ensure possible moves
    if(!hasPossibleMoves()){
      shuffleBoard();
    }
    state.running = true;
    // expose state for UI
    window.Game._state = state;
    console.log('[CORE] start level', level, 'size', state.rows, state.cols);
  };

  window.Game.restart = function(){
    console.log('[CORE] restart');
    window.Game.start(state.level);
  };

  window.Game.shuffle = function(){
    console.log('[CORE] shuffle');
    shuffleBoard();
    if(typeof window.render === 'function') window.render();
  };

  window.Game.end = function(){
    console.log('[CORE] end');
    state.running = false;
  };

  // attempt swap triggered by UI; returns {ok:bool, matches:...}
  window.Game.attemptSwap = function(i1,j1,i2,j2){
    // only adjacent allowed
    const di = Math.abs(i1-i2), dj = Math.abs(j1-j2);
    if((di===1 && dj===0) || (di===0 && dj===1)){
      swapCells(i1,j1,i2,j2);
      // find matches
      const matches = findMatches();
      if(matches.length > 0){
        // successful swap, consume a move
        state.moves = Math.max(0, state.moves-1);
        // play swap sound
        if(window.Sound) Sound.play('swap');
        // resolve matches repeatedly until none
        let totalGain=0, totalRemoved=0;
        do {
          const res = resolveMatchesAndDrop();
          totalRemoved += res.removed;
          totalGain += res.score;
          // small safety: break if nothing removed
          if(res.removed===0) break;
        } while(findMatches().length>0);
        // check win
        if(state.score >= state.target){
          if(window.Sound) Sound.play('win');
          if(window.Confetti) Confetti.fire({ count: 40 });
          console.log('[CORE] level complete');
        }
        // if moves finished -> end
        if(state.moves <= 0){
          state.running = false;
          console.log('[CORE] moves finished');
        }
        // ensure board has possible moves else shuffle
        if(!hasPossibleMoves()){
          console.log('[CORE] no moves left -> shuffle');
          shuffleBoard();
        }
        if(typeof window.render === 'function') window.render();
        return { ok:true, removed: totalRemoved, score: totalGain };
      } else {
        // revert swap, invalid move
        swapCells(i1,j1,i2,j2);
        if(window.Sound) Sound.play('invalid'); // optional sound
        return { ok:false };
      }
    } else {
      return { ok:false, reason:'not-adjacent' };
    }
  };

  // Expose some helpers
  window.Game._internal = {
    findMatches, applyGravityAndRefill, resolveMatchesAndDrop
  };

  console.log('[CORE] loaded');
})();

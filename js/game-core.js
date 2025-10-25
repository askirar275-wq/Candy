// game-core.js
(function(global){
  console.log('[CORE] init');
  const Types = [
    { id:0, img:'img/candy-1.png', score:10 },
    { id:1, img:'img/candy-2.png', score:10 },
    { id:2, img:'img/candy-3.png', score:10 },
    { id:3, img:'img/candy-4.png', score:10 },
    { id:4, img:'img/candy-5.png', score:10 }
  ];

  const state = {
    rows:7, cols:7,
    board:[], score:0, moves:30, target:600,
    running:false, level:1
  };

  function randType(){ return Math.floor(Math.random()*Types.length); }

  function buildInitialBoard(){
    console.log('[CORE] build board');
    state.board = new Array(state.rows).fill(0).map(()=> new Array(state.cols).fill(0).map(()=> randType()));
    // ensure no immediate matches
    removeInitialMatches();
  }

  function removeInitialMatches(){
    // brute-force: if any 3+ in a row/col, randomize one tile
    let again = true, safety=0;
    while(again && safety<50){
      again = false; safety++;
      const matches = findMatches();
      if(matches.length){
        again = true;
        matches.forEach(cell => {
          state.board[cell.r][cell.c] = randType();
        });
      }
    }
  }

  // find all match groups of length >=3. returns array of {r,c}
  function findMatches(){
    const found = [];
    // horizontal
    for(let r=0;r<state.rows;r++){
      let runStart=0;
      for(let c=1;c<=state.cols;c++){
        if(c<state.cols && state.board[r][c] === state.board[r][runStart]) continue;
        const runLen = c - runStart;
        if(runLen>=3){
          for(let k=runStart;k<c;k++) found.push({r, c:k});
        }
        runStart = c;
      }
    }
    // vertical
    for(let c=0;c<state.cols;c++){
      let runStart=0;
      for(let r=1;r<=state.rows;r++){
        if(r<state.rows && state.board[r][c] === state.board[runStart][c]) continue;
        const runLen = r - runStart;
        if(runLen>=3){
          for(let k=runStart;k<r;k++) found.push({r:k, c});
        }
        runStart = r;
      }
    }
    // dedupe by key
    const key = (x)=> x.r + ':' + x.c;
    const map = {};
    const uniq = [];
    found.forEach(f=>{
      if(!map[key(f)]){ map[key(f)] = true; uniq.push(f); }
    });
    return uniq;
  }

  // remove cells, return points
  function removeMatchesAndScore(){
    const matches = findMatches();
    if(!matches.length) return 0;
    // mark empty
    matches.forEach(m=> state.board[m.r][m.c] = null);
    // score: base 10 per tile, combos give extra
    const points = matches.length * 10;
    state.score += points;
    console.log('[CORE] removed', matches.length, 'points', points);
    return points;
  }

  // apply gravity and refill
  function collapseAndRefill(){
    for(let c=0;c<state.cols;c++){
      let write = state.rows-1;
      for(let r=state.rows-1;r>=0;r--){
        if(state.board[r][c] !== null){
          state.board[write][c] = state.board[r][c];
          write--;
        }
      }
      // fill remaining
      for(let r=write;r>=0;r--) state.board[r][c] = randType();
    }
  }

  function swapTiles(posA, posB){
    const tmp = state.board[posA.r][posA.c];
    state.board[posA.r][posA.c] = state.board[posB.r][posB.c];
    state.board[posB.r][posB.c] = tmp;
  }

  // public start
  function start(level){
    state.level = Math.max(1, parseInt(level||1));
    // level can influence target/moves/size; keep simple
    state.target = 600 * state.level;
    state.moves = Math.max(10, 30 - (state.level-1)*2);
    state.score = 0;
    state.rows = state.cols = Math.min(8, 6 + Math.floor(state.level/2));
    console.log('[CORE] start level', state.level, 'size', state.rows, state.cols);
    buildInitialBoard();
    global.render(); // UI render
    state.running = true;
  }

  // main loop after a swap: check matches cascade
  function processBoardAfterSwap(){
    let totalPoints = 0;
    let step = 0;
    function stepProcess(){
      const pts = removeMatchesAndScore();
      if(pts>0){
        totalPoints += pts;
        collapseAndRefill();
        global.render(); // update UI
        step++;
        // continue after small delay for animation feel
        setTimeout(stepProcess, 220);
      } else {
        // done
        console.log('[CORE] cascade complete, totalPoints', totalPoints);
        // check win
        if(state.score >= state.target){
          console.log('[CORE] level complete!');
          try{ Sound.play('win'); }catch(e){}
          try{ Confetti.fire(); }catch(e){}
          setTimeout(()=> alert('Level Complete!'), 200);
        }
      }
    }
    stepProcess();
  }

  // expose API
  global.Core = {
    state, start, swapTiles, processBoardAfterSwap, findMatches
  };

  // auto-start fallback if called via DOM
  document.addEventListener('DOMContentLoaded', ()=> {
    console.log('[CORE] DOM ready');
  });
})(window);

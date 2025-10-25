// js/game-core.js - core game logic (grid, swap, match, gravity)
// simple 6-type candy match; tile ids 1..6
window.Game = (function(){
  const rows = 6, cols = 6; // default grid
  let state = {
    level:1, rows, cols, board:[], score:0, moves:30, target:600, timer:0, running:false
  };

  function randInt(n){ return Math.floor(Math.random()*n); }

  function makeBoard(){
    state.board = [];
    for(let r=0;r<state.rows;r++){
      const row = [];
      for(let c=0;c<state.cols;c++){
        row.push(1 + randInt(6));
      }
      state.board.push(row);
    }
    // ensure no immediate matches: simple shuffle check
    removeAllMatches();
    return state.board;
  }

  function inBounds(r,c){ return r>=0 && r<state.rows && c>=0 && c<state.cols; }

  // swap two positions (r1,c1) <-> (r2,c2)
  function swap(r1,c1,r2,c2){
    if(!inBounds(r1,c1)||!inBounds(r2,c2)) return false;
    const t = state.board[r1][c1];
    state.board[r1][c1] = state.board[r2][c2];
    state.board[r2][c2] = t;
    return true;
  }

  // find all matches (>=3) return list of coords
  function findMatches(){
    const toClear = new Set();
    // rows
    for(let r=0;r<state.rows;r++){
      let start=0;
      for(let c=1;c<=state.cols;c++){
        if(c<state.cols && state.board[r][c]===state.board[r][start]) continue;
        const len = c-start;
        if(len>=3){
          for(let k=start;k<c;k++) toClear.add(r+','+k);
        }
        start=c;
      }
    }
    // cols
    for(let c=0;c<state.cols;c++){
      let start=0;
      for(let r=1;r<=state.rows;r++){
        if(r<state.rows && state.board[r][c]===state.board[start][c]) continue;
        const len = r-start;
        if(len>=3){
          for(let k=start;k<r;k++) toClear.add(k+','+c);
        }
        start=r;
      }
    }
    return Array.from(toClear).map(s=> s.split(',').map(Number));
  }

  function removeAllMatches(){
    let matches = findMatches();
    let total = 0;
    while(matches.length){
      // clear set
      matches.forEach(([r,c]) => state.board[r][c] = 0);
      total += matches.length;
      applyGravity();
      refillBoard();
      matches = findMatches();
    }
    return total;
  }

  function applyGravity(){
    for(let c=0;c<state.cols;c++){
      let write = state.rows-1;
      for(let r=state.rows-1;r>=0;r--){
        if(state.board[r][c] !== 0){
          state.board[write][c] = state.board[r][c];
          write--;
        }
      }
      for(let r=write;r>=0;r--) state.board[r][c] = 0;
    }
  }

  function refillBoard(){
    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        if(state.board[r][c]===0) state.board[r][c] = 1 + Math.floor(Math.random()*6);
      }
    }
  }

  function checkAndResolve(){
    const matches = findMatches();
    if(matches.length===0) return 0;
    matches.forEach(([r,c])=> state.board[r][c] = 0);
    applyGravity();
    refillBoard();
    // scoring: each cleared tile = 10 points
    const points = matches.length * 10;
    state.score += points;
    return points;
  }

  function start(level){
    state.level = Number(level) || 1;
    state.score = 0;
    state.moves = 30;
    state.rows = rows; state.cols = cols;
    state.target = state.level * 600;
    state.board = makeBoard();
    state.running = true;
    // dispatch event
    window.dispatchEvent(new CustomEvent('game-ready', { detail: { state } }));
    window.dispatchEvent(new CustomEvent('game-started', { detail: { level: state.level } }));
    return state;
  }

  function getState(){ return JSON.parse(JSON.stringify(state)); }

  return { start, swap, findMatches, applyGravity, refillBoard, checkAndResolve, getState, makeBoard };
})();

// js/game.js
// Advanced working match-3 logic: swap, detect matches, pop, gravity, refill
// Requires images: images/candy1.png ... candy10.png

(() => {
  const COLS = 8, ROWS = 8, SIZE = COLS * ROWS;
  const IMAGE_BASE = 'images/';
  const IMAGE_COUNT = 10; // candy1..candy10
  const BOARD_ID = 'game-board'; // element in index.html where board will render
  const SCORE_ID = 'score';
  const MOVES_ID = 'moves';

  let board = new Array(SIZE).fill(null); // each entry: {id, src}
  let nextId = 1;
  let selectedIndex = null;
  let locked = false;
  let score = 0;
  let moves = 40;

  // small helper to create tile
  function makeTile(src) {
    return { id: nextId++, src: src || `${IMAGE_BASE}candy${Math.floor(Math.random()*IMAGE_COUNT)+1}.png` };
  }

  // Render board into DOM (no random creation here)
  function render(dropMap) {
    const boardEl = document.getElementById(BOARD_ID);
    if(!boardEl) return;
    boardEl.innerHTML = '';
    for(let i=0;i<SIZE;i++){
      const tile = board[i];
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      // image element
      const img = document.createElement('img');
      img.draggable = false;
      if(tile){
        img.src = tile.src;
        img.dataset.src = tile.src;
        cell.style.visibility = 'visible';
      } else {
        img.src = '';
        cell.style.visibility = 'hidden';
      }
      cell.appendChild(img);

      // apply drop animation transform if provided
      if(dropMap && tile && dropMap[tile.id]){
        cell.style.transform = `translateY(${dropMap[tile.id]})`;
        requestAnimationFrame(()=> requestAnimationFrame(()=> {
          cell.style.transition = `transform .32s cubic-bezier(.2,.8,.2,1)`;
          cell.style.transform = 'translateY(0)';
        }));
      }

      // click handler (select/swap)
      cell.addEventListener('click', e => onCellClick(Number(cell.dataset.index)));
      boardEl.appendChild(cell);
    }
    updateHUD();
  }

  function updateHUD(){
    const scoreEl = document.getElementById(SCORE_ID);
    if(scoreEl) scoreEl.textContent = score;
    const movesEl = document.getElementById(MOVES_ID);
    if(movesEl) movesEl.textContent = moves;
  }

  // init board avoid starting matches
  function initBoard(){
    nextId = 1;
    board = new Array(SIZE).fill(null).map(()=> makeTile());
    let attempts = 0;
    while(findMatches(board).length > 0 && attempts++ < 1000){
      board = new Array(SIZE).fill(null).map(()=> makeTile());
    }
    score = 0; moves = 40; selectedIndex = null; locked = false;
    render();
  }

  // find matches (by src) returns array of runs (arrays of indices)
  function findMatches(bd){
    const runs = [];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let run=[r*COLS];
      for(let c=1;c<COLS;c++){
        const p = r*COLS + c - 1, i = r*COLS + c;
        if(bd[i] && bd[p] && bd[i].src === bd[p].src) run.push(i);
        else { if(run.length >= 3) runs.push([...run]); run = [i]; }
      }
      if(run.length >= 3) runs.push([...run]);
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let run=[c];
      for(let r=1;r<ROWS;r++){
        const p = (r-1)*COLS + c, i = r*COLS + c;
        if(bd[i] && bd[p] && bd[i].src === bd[p].src) run.push(i);
        else { if(run.length >= 3) runs.push([...run]); run = [i]; }
      }
      if(run.length >= 3) runs.push([...run]);
    }
    return runs;
  }

  // swap tiles indices i and j (no render)
  function swapTiles(i,j){
    [board[i], board[j]] = [board[j], board[i]];
  }

  function isAdjacent(a,b){
    if(a==null||b==null) return false;
    const r1 = Math.floor(a/COLS), c1 = a%COLS, r2 = Math.floor(b/COLS), c2 = b%COLS;
    return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
  }

  // when user clicks on a cell
  function onCellClick(i){
    if(locked) return;
    if(selectedIndex === null){
      selectedIndex = i;
      highlightCell(i,true);
      return;
    }
    if(selectedIndex === i){
      highlightCell(i,false);
      selectedIndex = null;
      return;
    }
    if(isAdjacent(selectedIndex, i)){
      // do swap
      swapTiles(selectedIndex, i);
      render();
      moves = Math.max(0, moves-1);
      updateHUD();
      const matches = findMatches(board);
      if(matches.length > 0){
        resolveChain();
      } else {
        // revert after small delay
        setTimeout(()=> {
          swapTiles(selectedIndex, i);
          render();
        }, 220);
      }
    }
    // clear selection highlight
    highlightCell(selectedIndex,false);
    selectedIndex = null;
  }

  function highlightCell(i,on){
    const boardEl = document.getElementById(BOARD_ID);
    if(!boardEl) return;
    const el = boardEl.querySelector(`[data-index="${i}"]`);
    if(!el) return;
    if(on) el.style.transform = 'scale(1.08)';
    else el.style.transform = '';
  }

  // resolve chain of matches until none
  function resolveChain(){
    if(locked) return;
    locked = true;
    let combo = 1;
    (function step(){
      const matches = findMatches(board);
      if(matches.length === 0){
        locked = false;
        updateHUD();
        return;
      }
      // accumulate unique indices to remove
      const removeSet = new Set();
      matches.forEach(run => run.forEach(i=>removeSet.add(i)));
      const removeIdx = Array.from(removeSet).sort((a,b)=>a-b);
      // scoring
      score += removeIdx.length * 10 * combo;
      combo++;
      updateHUD();
      // pop animation (add class on DOM)
      const boardEl = document.getElementById(BOARD_ID);
      let cx=0, cy=0, cnt=0;
      removeIdx.forEach(i=>{
        const el = boardEl.querySelector(`[data-index="${i}"]`);
        if(el){
          el.classList.add('pop');
          const rc = el.getBoundingClientRect();
          cx += rc.left + rc.width/2; cy += rc.top + rc.height/2; cnt++;
        }
        board[i] = null;
      });
      // small burst: optional
      if(cnt>0) { /* optional visual burst could be implemented here */ }

      // after pop animation -> gravity + refill
      const popDur = 260;
      setTimeout(()=> {
        // gravity per column
        const cols = [];
        for(let c=0;c<COLS;c++){
          const col = [];
          for(let r=ROWS-1;r>=0;r--){
            const idx = r*COLS + c;
            if(board[idx]) col.push(board[idx]);
          }
          cols.push(col);
        }
        const newBoard = new Array(SIZE).fill(null);
        const dropMap = {}; // for animation
        const tilePx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || 64;
        const oldIds = new Set(board.filter(Boolean).map(t=>t.id));
        for(let c=0;c<COLS;c++){
          const col = cols[c];
          while(col.length < ROWS) col.push(makeTile()); // NEW tiles created here only
          for(let r=ROWS-1,i=0;r>=0;r--,i++){
            const tile = col[i];
            newBoard[r*COLS + c] = tile;
            if(!oldIds.has(tile.id)) dropMap[tile.id] = `-${(i+1)*tilePx}px`;
          }
        }
        board = newBoard;
        render(dropMap);
        // next step after fall animation
      }, popDur);
      // wait for fall then next check
      setTimeout(()=> setTimeout(step, 200), (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fall-dur'))||320));
    })();
  }

  // Public: start game (called by home screen)
  window.startGame = function(){
    // hide home if exists
    const homeEl = document.getElementById('home-screen');
    const gameScreen = document.getElementById('game-screen');
    if(homeEl) homeEl.style.display = 'none';
    if(gameScreen) gameScreen.style.display = 'block';

    if(board.filter(Boolean).length === 0) initBoard();
    render();
  };

  // Expose debug init
  window.initBoard = initBoard;

  // auto init small board if page loaded and game-screen visible
  document.addEventListener('DOMContentLoaded', ()=> {
    const gameScreen = document.getElementById('game-screen');
    if(gameScreen && getComputedStyle(gameScreen).display !== 'none'){
      initBoard();
    } else {
      // still prepare board in memory
      initBoard();
      // hide DOM board until startGame
      if(gameScreen) gameScreen.style.display = 'none';
    }
  });

})();

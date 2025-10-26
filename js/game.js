// game.js - simple candy match core + UI in one file (easy to plug)
// Usage: page loads -> this script initializes automatically

(function(){
  // config
  const ROWS = 6;
  const COLS = 6;
  const TYPES = 6; // candy1..candy6.png
  const SCORE_BASE = 10; // 3-match = 10, 4-match = 20 etc.

  // state
  const state = {
    grid: [], // 2D array of ids 1..TYPES
    score: 0,
    moves: 30,
    target: 600,
    running: false
  };

  // DOM refs
  let gridEl, scoreEl, movesEl, targetEl, timerEl, restartBtn, shuffleBtn, endBtn;

  // helper: random candy
  function randCandy(){ return Math.floor(Math.random()*TYPES)+1; }

  // build initial grid - avoid immediate matches by re-rolling if creates match
  function buildGrid(rows=ROWS, cols=COLS){
    const g = Array.from({length:rows}, ()=> Array(cols).fill(0));
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        let v;
        do {
          v = randCandy();
          g[r][c]=v;
        } while((c>=2 && g[r][c-1]===v && g[r][c-2]===v) || (r>=2 && g[r-1][c]===v && g[r-2][c]===v));
      }
    }
    return g;
  }

  // render grid DOM
  function renderGrid(){
    gridEl.innerHTML='';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const val = state.grid[r][c];
        const cell = document.createElement('div');
        cell.className='cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = `images/candy${val}.png`;
        img.alt = 'candy';
        cell.appendChild(img);
        gridEl.appendChild(cell);
      }
    }
  }

  // swap helpers — swap in state
  function swapCoords(a,b){
    const t = state.grid[a.r][a.c];
    state.grid[a.r][a.c] = state.grid[b.r][b.c];
    state.grid[b.r][b.c] = t;
  }

  function areAdjacent(a,b){
    const dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c);
    return (dr+dc)===1;
  }

  // find matches: returns array of coords to remove
  function findMatches(){
    const toRemove = Array.from({length:ROWS}, ()=> Array(COLS).fill(false));
    let any = false;
    // rows
    for(let r=0;r<ROWS;r++){
      let len=1;
      for(let c=1;c<=COLS;c++){
        if(c<COLS && state.grid[r][c] === state.grid[r][c-1]) len++;
        else {
          if(len>=3){
            any = true;
            for(let k=0;k<len;k++) toRemove[r][c-1-k]=true;
          }
          len=1;
        }
      }
    }
    // cols
    for(let c=0;c<COLS;c++){
      let len=1;
      for(let r=1;r<=ROWS;r++){
        if(r<ROWS && state.grid[r][c] === state.grid[r-1][c]) len++;
        else {
          if(len>=3){
            any = true;
            for(let k=0;k<len;k++) toRemove[r-1-k][c]=true;
          }
          len=1;
        }
      }
    }
    if(!any) return null;
    // convert to coords array
    const coords=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(toRemove[r][c]) coords.push({r,c});
    return coords;
  }

  // remove matched coords (set to 0), update score
  function removeMatches(coords){
    const set = new Set(coords.map(p=>p.r+','+p.c));
    const count = coords.length;
    // simple scoring: base * (count-2)
    const points = SCORE_BASE * (count - 2);
    state.score += points;
    coords.forEach(p=>{
      state.grid[p.r][p.c] = 0;
    });
    updateUI();
    Sound.play('pop');
  }

  // gravity: drop down and refill top
  function applyGravity(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(state.grid[r][c] !== 0){
          state.grid[write][c] = state.grid[r][c];
          write--;
        }
      }
      // fill remaining with new candies
      for(let r=write;r>=0;r--) state.grid[r][c] = randCandy();
    }
  }

  // find & clear loop (chain reactions)
  function resolveMatchesChain(){
    return new Promise(resolve=>{
      function step(){
        const coords = findMatches();
        if(!coords || coords.length===0){
          resolve();
          return;
        }
        removeMatches(coords);
        // small delay for visual
        setTimeout(()=>{
          applyGravity();
          renderGrid();
          setTimeout(step,120);
        }, 180);
      }
      step();
    });
  }

  // UI updates
  function updateUI(){
    scoreEl.textContent = state.score;
    movesEl.textContent = state.moves;
    targetEl.textContent = state.target;
  }

  // shuffle board randomly
  function shuffleBoard(){
    state.grid = buildGrid();
    renderGrid();
    Sound.play('pop');
  }

  // start game
  function start(level=1){
    state.score = 0;
    state.moves = 30;
    state.target = 600 * level;
    state.grid = buildGrid();
    updateUI();
    renderGrid();
    // try play bg
    Sound.bgPlay('bg');
    state.running = true;
  }

  // check win condition
  function checkWin(){
    if(state.score >= state.target){
      Sound.play('win');
      Confetti.fire();
      // stop running
      state.running=false;
      alert('Level complete!'); // simple modal
    }
  }

  // Input handling: drag / swipe / click
  function attachHandlers(){
    let startCell = null;
    let draggingClone = null;

    function getCellFromEvent(e){
      const touch = (e.touches && e.touches[0]) || e;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if(!el) return null;
      const cell = el.closest('.cell');
      if(!cell) return null;
      return { r: Number(cell.dataset.r), c: Number(cell.dataset.c), el: cell };
    }

    // pointer down
    function onStart(e){
      if(!state.running) return;
      const cellInfo = getCellFromEvent(e);
      if(!cellInfo) return;
      startCell = { r: cellInfo.r, c: cellInfo.c };
      // create clone image to drag
      draggingClone = cellInfo.el.cloneNode(true);
      draggingClone.classList.add('dragging-clone');
      document.body.appendChild(draggingClone);
      moveClone(e);
      e.preventDefault();
    }

    function moveClone(e){
      if(!draggingClone) return;
      const touch = (e.touches && e.touches[0]) || e;
      draggingClone.style.left = touch.clientX + 'px';
      draggingClone.style.top = touch.clientY + 'px';
    }

    function onMove(e){
      if(draggingClone) { moveClone(e); e.preventDefault(); }
    }

    async function onEnd(e){
      if(!startCell) return;
      const endCellInfo = getCellFromEvent(e) || {};
      const endCell = (typeof endCellInfo.r === 'number') ? {r:endCellInfo.r,c:endCellInfo.c} : null;
      // remove clone
      if(draggingClone){ draggingClone.remove(); draggingClone=null; }
      if(!endCell){ startCell = null; return; }

      // if adjacent -> swap attempt
      if(areAdjacent(startCell,endCell)){
        swapCoords(startCell,endCell);
        renderGrid();
        // decrease moves
        state.moves = Math.max(0, state.moves - 1);
        updateUI();
        // check matches
        const coords = findMatches();
        if(coords && coords.length>0){
          // good swap -> resolve chain
          await resolveMatchesChain();
          updateUI();
          checkWin();
        } else {
          // invalid swap -> revert and small feedback
          setTimeout(()=>{
            swapCoords(startCell,endCell);
            renderGrid();
          }, 120);
        }
      }
      startCell = null;
    }

    // attach touch and mouse events
    gridEl.addEventListener('touchstart', onStart, {passive:false});
    gridEl.addEventListener('touchmove', onMove, {passive:false});
    gridEl.addEventListener('touchend', onEnd, {passive:false});
    gridEl.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }

  // wire buttons
  function attachButtons(){
    restartBtn.addEventListener('click', ()=> {
      start(1);
    });
    shuffleBtn.addEventListener('click', ()=> {
      shuffleBoard();
    });
    endBtn.addEventListener('click', ()=> {
      state.running = false;
      alert('Game ended');
    });
  }

  // init DOM references and start game
  function init(){
    gridEl = document.getElementById('gameGrid');
    scoreEl = document.getElementById('score');
    movesEl = document.getElementById('moves');
    targetEl = document.getElementById('target');
    timerEl = document.getElementById('timer');
    restartBtn = document.getElementById('restartBtn');
    shuffleBtn = document.getElementById('shuffleBtn');
    endBtn = document.getElementById('endBtn');

    if(!gridEl) { console.error('gameGrid not found'); return; }

    // build and start
    start(1);
    attachHandlers();
    attachButtons();

    // initial resolve (clear any accidental matches that remained)
    setTimeout(()=> resolveMatchesChain(), 80);
    console.log('[GAME] ready');
  }

  // expose for debugging
  window.SimpleCandy = { start, state, init };

  // auto init when DOM ready
  document.addEventListener('DOMContentLoaded', ()=> init());
})();

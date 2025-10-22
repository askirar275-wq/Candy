/* js/game-core.js
   Core board logic: board state, match detection, collapse + refill,
   and UI rendering of grid cells. Exposes helpers used by game.js.
*/

const GameCore = (function(){
  // CONFIG
  const ROWS = 7;
  const COLS = 7;
  const CANDY_TYPES = 5; // images candy1..candy5.png
  const CELL_SIZE = 52; // for clone positioning (approx)

  // STATE
  let board = [];
  let score = 0;
  let moves = 30;
  let target = 600;
  let currentLevel = 1;
  let canInteract = true;

  // DOM
  const gridEl = () => document.getElementById('gameGrid');
  const scoreEl = () => document.getElementById('score');
  const movesEl = () => document.getElementById('moves');
  const targetEl = () => document.getElementById('target');
  const levelTitleEl = () => document.getElementById('levelTitle');

  // Initialize empty board
  function createEmptyBoard(){
    board = new Array(ROWS);
    for(let r=0;r<ROWS;r++){
      board[r] = new Array(COLS).fill(null);
    }
  }

  // Fill board randomly (no immediate matches ideally)
  function fillBoardNoInitialMatches(){
    // naive approach: fill and re-roll if immediate match present
    do {
      for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
          board[r][c] = randomCandyId();
        }
      }
    } while(findMatches().length > 0);
  }

  function randomCandyId(){
    return Math.floor(Math.random() * CANDY_TYPES) + 1;
  }

  // Render grid UI from board[][]
  function updateUI(){
    // remove any debug overlays left
    document.querySelectorAll('.cell .count, .cell .badge-number, .cell .overlay-count').forEach(n=>n.remove());

    const grid = gridEl();
    if(!grid) return;
    // set columns grid-template according to COLS
    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    grid.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.id = `cell-${r}-${c}`;
        // image
        const img = document.createElement('img');
        const id = board[r][c];
        img.src = id ? `images/candy${id}.png` : `images/candy1.png`;
        img.alt = 'candy';
        cell.appendChild(img);

        // attach pointer handlers (fresh each render)
        attachCellPointer(cell, r, c);
        grid.appendChild(cell);
      }
    }

    // update HUD
    if(scoreEl()) scoreEl().textContent = score;
    if(movesEl()) movesEl().textContent = moves;
    if(targetEl()) targetEl().textContent = target;
    if(levelTitleEl()) levelTitleEl().textContent = `Level ${currentLevel}`;

    // ensure canInteract is true only if not animating (caller manages it)
  }

  // Attach pointer logic to each cell (uses pointerdown + pointerup on document)
  function attachCellPointer(cellEl, r, c){
    // remove previous listeners just in case
    cellEl.onpointerdown = null;

    cellEl.addEventListener('pointerdown', function(e){
      if(!canInteract) return;
      e.preventDefault && e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      let released = false;

      function onUp(ev){
        if(released) return;
        released = true;
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const absX = Math.abs(dx), absY = Math.abs(dy);

        if(Math.max(absX, absY) < 8){
          // small tap => no swap
          return;
        }
        let toR = r, toC = c;
        if(absX > absY){
          toC = dx > 0 ? c + 1 : c - 1;
        } else {
          toR = dy > 0 ? r + 1 : r - 1;
        }
        // bounds check
        if(toR < 0 || toR >= ROWS || toC < 0 || toC >= COLS) return;

        // perform swap pipeline via GameCore.swapCells
        swapCells(r, c, toR, toC);
      }
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  // Swap in board array
  function swapBoard(r1,c1,r2,c2){
    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;
  }

  // Visual animate swap using clones, resolves when done
  function animateSwapDOM(r1,c1,r2,c2){
    return new Promise(resolve=>{
      const el1 = document.getElementById(`cell-${r1}-${c1}`);
      const el2 = document.getElementById(`cell-${r2}-${c2}`);
      if(!el1 || !el2){ resolve(); return; }

      const rect1 = el1.getBoundingClientRect();
      const rect2 = el2.getBoundingClientRect();

      const clone1 = el1.querySelector('img').cloneNode();
      const clone2 = el2.querySelector('img').cloneNode();
      clone1.className = 'dragging-clone';
      clone2.className = 'dragging-clone';

      Object.assign(clone1.style, {
        position: 'fixed', left: (rect1.left + rect1.width/2 - 22) + 'px',
        top: (rect1.top + rect1.height/2 - 22) + 'px', width:'44px', height:'44px',
        transition: 'transform 220ms ease'
      });
      Object.assign(clone2.style, {
        position: 'fixed', left: (rect2.left + rect2.width/2 - 22) + 'px',
        top: (rect2.top + rect2.height/2 - 22) + 'px', width:'44px', height:'44px',
        transition: 'transform 220ms ease'
      });

      document.body.appendChild(clone1);
      document.body.appendChild(clone2);

      const dx = rect2.left - rect1.left;
      const dy = rect2.top - rect1.top;

      requestAnimationFrame(()=> {
        clone1.style.transform = `translate(${dx}px, ${dy}px)`;
        clone2.style.transform = `translate(${-dx}px, ${-dy}px)`;
      });

      setTimeout(()=> {
        clone1.remove(); clone2.remove(); resolve();
      }, 260);
    });
  }

  // Find all matches (returns array of positions objects)
  function findMatches(){
    const matched = [];
    // Horizontal
    for(let r=0;r<ROWS;r++){
      let runStart = 0;
      for(let c=1;c<=COLS;c++){
        const prev = board[r][c-1];
        const cur = (c < COLS) ? board[r][c] : null;
        if(c < COLS && cur !== null && prev !== null && cur === prev){
          // continue
        } else {
          const runLen = c - runStart;
          if(runLen >= 3){
            for(let k=runStart;k<c;k++) matched.push({r, c:k});
          }
          runStart = c;
        }
      }
    }
    // Vertical
    for(let c=0;c<COLS;c++){
      let runStart = 0;
      for(let r=1;r<=ROWS;r++){
        const prev = (r-1 >= 0) ? board[r-1][c] : null;
        const cur = (r < ROWS) ? board[r][c] : null;
        if(r < ROWS && cur !== null && prev !== null && cur === prev){
          // continue
        } else {
          const runLen = r - runStart;
          if(runLen >= 3){
            for(let k=runStart;k<r;k++) matched.push({r:k, c});
          }
          runStart = r;
        }
      }
    }
    // dedupe
    const set = new Set();
    const result = [];
    matched.forEach(p => {
      const key = `${p.r},${p.c}`;
      if(!set.has(key)){ set.add(key); result.push(p); }
    });
    return result;
  }

  // Remove matches visually and from board
  function removeMatchesAndAnimate(matches){
    return new Promise(resolve=>{
      if(matches.length === 0){ resolve(); return; }
      // mark null and add fade class
      matches.forEach(pos=>{
        board[pos.r][pos.c] = null;
        const cell = document.getElementById(`cell-${pos.r}-${pos.c}`);
        if(cell) cell.classList.add('fade-out');
      });
      // wait for visual fade
      setTimeout(()=>{
        updateUI();
        resolve();
      }, 200);
    });
  }

  // Gravity collapse columns and refill
  function collapseAndRefill(){
    return new Promise(resolve=>{
      for(let c=0;c<COLS;c++){
        let write = ROWS - 1;
        for(let r=ROWS-1;r>=0;r--){
          if(board[r][c] !== null){
            board[write][c] = board[r][c];
            if(write !== r) board[r][c] = null;
            write--;
          }
        }
        for(let r=write;r>=0;r--){
          board[r][c] = randomCandyId();
        }
      }
      // small delay for visual refill
      updateUI();
      setTimeout(resolve, 220);
    });
  }

  // Public swap flow: animate swap, check match, revert if no match, else run match-loop
  async function swapCells(r1,c1,r2,c2){
    if(!canInteract) return;
    canInteract = false;
    try {
      // animate swap
      await animateSwapDOM(r1,c1,r2,c2);
      // update board
      swapBoard(r1,c1,r2,c2);
      updateUI();

      let matches = findMatches();
      if(matches.length === 0){
        // revert after a small pause
        await new Promise(res => setTimeout(res, 120));
        await animateSwapDOM(r1,c1,r2,c2); // animate back (positions changed in board, but ids in DOM are moved by updateUI)
        swapBoard(r1,c1,r2,c2); // revert data
        updateUI();
        canInteract = true;
        return;
      }

      // matches found: loop removing, collapsing until no matches
      while(matches.length > 0){
        // scoring: 100 per candy matched (example)
        score += matches.length * 100;
        if(scoreEl()) scoreEl().textContent = score;

        await removeMatchesAndAnimate(matches);
        await collapseAndRefill();
        matches = findMatches();
      }

      // decrement moves and update
      moves = Math.max(0, moves - 1);
      if(movesEl()) movesEl().textContent = moves;

      // check win condition
      if(score >= target){
        // notify Game layer to finish level
        if(typeof onLevelComplete === 'function'){
          onLevelComplete({score, level: currentLevel});
        }
      }
    } catch(err){
      console.error('swapCells error', err);
    } finally {
      canInteract = true;
    }
  }

  // simple public helpers for Game wrapper
  let onLevelComplete = null;
  function setOnComplete(fn){ onLevelComplete = fn; }

  // Public API: start level
  function start(level = 1, opts = {}){
    currentLevel = Number(level) || 1;
    // choose target & moves based on level (simple scaling)
    target = opts.target || (600 + (currentLevel-1)*300);
    moves = opts.moves || 30;
    score = 0;
    canInteract = true;
    // create board
    createEmptyBoard();
    fillBoardNoInitialMatches();
    updateUI();
  }

  function restart(){
    start(currentLevel);
  }

  // expose
  return {
    start,
    restart,
    swapCells,
    updateUI,
    getState: ()=> ({board, score, moves, target, currentLevel}),
    setOnComplete,
    setCanInteract: (v)=> { canInteract = !!v; },
  };
})();

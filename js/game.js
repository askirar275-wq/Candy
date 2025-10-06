// js/game.js
// Candy Match — game logic (drag, match, gravity, refill)
// Requires: an element with id="game-board", elements #score and #moves (optional)

(function(){
  // CONFIG
  const COLS = 8, ROWS = 8, SIZE = COLS * ROWS;
  const IMAGE_PATH = 'images/';
  const CANDIES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png','candy7.png','candy8.png','candy9.png','candy10.png'];

  // STATE
  let board = new Array(SIZE).fill(null);
  let score = 0, moves = 40;
  let dragging = false, dragStart = null, pointerId = null, locked = false;

  // DOM refs
  const boardEl = document.getElementById('game-board');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const startBtn = document.getElementById('startBtn');
  const backBtn = document.getElementById('backBtn');

  // Utility: random tile
  function randTile(){
    return { id: Math.random().toString(36).slice(2,9), src: IMAGE_PATH + CANDIES[Math.floor(Math.random()*CANDIES.length)] };
  }

  // Create DOM grid
  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    boardEl.style.display = 'grid';
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    boardEl.style.gap = '6px';
    for(let i=0;i<SIZE;i++){
      const tile = board[i];
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      cell.style.width = '48px';
      cell.style.height = '48px';
      cell.style.display = 'flex';
      cell.style.alignItems = 'center';
      cell.style.justifyContent = 'center';
      cell.style.borderRadius = '10px';
      cell.style.background = 'rgba(255,255,255,0.9)';
      cell.style.boxShadow = '0 6px 14px rgba(0,0,0,0.08)';
      if(tile){
        const img = document.createElement('img');
        img.draggable = false;
        img.src = tile.src;
        img.style.width = '86%';
        img.style.height = '86%';
        img.style.objectFit = 'contain';
        cell.appendChild(img);
      }
      // pointer handlers
      cell.addEventListener('pointerdown', onDown);
      boardEl.appendChild(cell);
    }
    updateHUD();
  }

  function updateHUD(){
    if(scoreEl) scoreEl.textContent = score;
    if(movesEl) movesEl.textContent = moves;
  }

  // Init board (avoid pre-existing matches quickly by retry)
  function createBoard(){
    for(let i=0;i<SIZE;i++) board[i] = randTile();
    // simple de-dup: if any immediate match of 3 exists, shuffle that spot
    let tries = 0;
    while(findMatches(board).length > 0 && tries++ < 600){
      board = board.map((_,i)=> randTile());
    }
  }

  // Match detection: returns array of indices to remove (unique)
  function findMatches(bd){
    const matches = [];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let run=[r*COLS];
      for(let c=1;c<COLS;c++){
        const p=r*COLS+c-1, i=r*COLS+c;
        if(bd[i] && bd[p] && bd[i].src === bd[p].src) run.push(i);
        else { if(run.length>=3) matches.push([...run]); run=[i]; }
      }
      if(run.length>=3) matches.push([...run]);
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let run=[c];
      for(let r=1;r<ROWS;r++){
        const p=(r-1)*COLS+c, i=r*COLS+c;
        if(bd[i] && bd[p] && bd[i].src === bd[p].src) run.push(i);
        else { if(run.length>=3) matches.push([...run]); run=[i]; }
      }
      if(run.length>=3) matches.push([...run]);
    }
    // flatten unique
    return [...new Set(matches.flat())];
  }

  // Pop animation helper: add CSS class then remove
  function popCells(indices){
    indices.forEach(i=>{
      const el = boardEl.querySelector(`[data-index="${i}"]`);
      if(el){
        el.classList.add('pop');
        setTimeout(()=> el.classList.remove('pop'), 420);
      }
    });
  }

  // Gravity + refill
  function applyGravity(){
    const cols = [];
    for(let c=0;c<COLS;c++){
      const col = [];
      for(let r=ROWS-1;r>=0;r--){
        const idx = r*COLS + c;
        if(board[idx]) col.push(board[idx]);
      }
      while(col.length < ROWS) col.push(randTile());
      cols.push(col);
    }
    const newBoard = new Array(SIZE).fill(null);
    for(let c=0;c<COLS;c++){
      for(let r=ROWS-1, i=0; r>=0; r--, i++){
        newBoard[r*COLS + c] = cols[c][i];
      }
    }
    board = newBoard;
    render();
  }

  // Resolve chain until no matches
  function resolveChain(){
    if(locked) return;
    locked = true;
    (function step(){
      const matches = findMatches(board);
      if(matches.length === 0){ locked=false; updateHUD(); return; }
      // score
      score += matches.length * 10;
      popCells(matches);
      matches.forEach(i=> board[i] = null);
      updateHUD();
      setTimeout(()=>{ applyGravity(); setTimeout(step, 260); }, 320);
    })();
  }

  // Swap two indices and check for matches
  function swapAndCheck(a,b){
    if(a==null||b==null) return false;
    [board[a], board[b]] = [board[b], board[a]];
    render();
    const matches = findMatches(board);
    if(matches.length > 0){ resolveChain(); return true; }
    // no match -> swap back
    setTimeout(()=>{
      [board[a], board[b]] = [board[b], board[a]];
      render();
    }, 220);
    return false;
  }

  // Input handlers (pointer based for mobile)
  function onDown(e){
    if(locked) return;
    this.setPointerCapture && this.setPointerCapture(e.pointerId);
    dragging = true; pointerId = e.pointerId;
    dragStart = Number(this.dataset.index);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
  function onMove(e){
    if(!dragging || e.pointerId !== pointerId) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if(!target) return;
    const cell = target.closest && target.closest('.cell') ? target.closest('.cell') : null;
    if(!cell) return;
    const idx = Number(cell.dataset.index);
    if(isAdjacent(dragStart, idx) && idx !== dragStart){
      // attempt swap
      if(moves <= 0) return;
      const did = swapAndCheck(dragStart, idx);
      if(did) moves = Math.max(0, moves-1);
      updateHUD();
      // prevent multiple swaps in same drag
      dragging = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }
  }
  function onUp(e){
    dragging = false; pointerId = null; dragStart = null;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
  function isAdjacent(a,b){
    if(a==null||b==null) return false;
    const r1 = Math.floor(a/COLS), c1 = a%COLS;
    const r2 = Math.floor(b/COLS), c2 = b%COLS;
    return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
  }

  // INIT exported
  function initGame(){
    console.log('initGame() called — setting up game board...');
    score = 0; moves = 40; locked = false;
    createBoard();
    render();
    console.log('✅ Game board created successfully.');
  }

  // hook start button if exists
  if(startBtn) startBtn.addEventListener('click', function startGame(){ initGame(); document.getElementById('home-screen') && (document.getElementById('home-screen').style.display='none'); document.getElementById('game-screen') && (document.getElementById('game-screen').style.display='block'); });
  if(backBtn) backBtn.addEventListener('click', ()=> { document.getElementById('game-screen').style.display='none'; document.getElementById('home-screen') && (document.getElementById('home-screen').style.display='block'); });

  // small style for pop animation (inject)
  const s = document.createElement('style');
  s.innerHTML = `
    .cell.pop { animation: pop 420ms ease forwards; }
    @keyframes pop { 0%{transform:scale(1);opacity:1}50%{transform:scale(1.35)}100%{transform:scale(0);opacity:0} }
    .cell img { user-select:none; -webkit-user-drag:none; }
    #game-board { padding: 12px; border-radius:16px; background: rgba(255,230,240,0.6); display:inline-block; }
  `;
  document.head.appendChild(s);

  // expose init for debug
  window.initGame = initGame;

  // auto-init if URL has ?autostart=1
  if(location.search.indexOf('autostart=1') >= 0){ window.addEventListener('load', ()=> initGame() ); }

})();

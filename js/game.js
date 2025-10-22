// js/game.js
// Single-file core for demo: grid init, touch swap, match detect, gravity/refill, score/moves
(function(window){
  const GRID_ROWS = 7;
  const GRID_COLS = 7;
  const CANDY_COUNT = 5; // candy image types
  const START_MOVES = 30;
  const TARGET_SCORE = 600;

  const CANDY_IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png'
  ];

  // simple sound helper (optional files)
  const Sound = {
    enabled:true,
    map: {},
    load(name, src){
      try{
        const a = new Audio(src);
        a.volume = 0.9;
        this.map[name] = a;
      }catch(e){ console.warn('sound load fail', e); }
    },
    play(name){
      if(!this.enabled) return;
      const a = this.map[name];
      if(a){
        try{ a.currentTime = 0; a.play().catch(()=>{}); }catch(e){}
      }
    }
  };
  // optionally load
  Sound.load('pop','sound/pop.mp3');

  // state
  const state = {
    rows: GRID_ROWS,
    cols: GRID_COLS,
    board: [], // 2d array of numbers 0..CANDY_COUNT-1
    score:0,
    moves:START_MOVES,
    target:TARGET_SCORE,
    level:1,
    animating:false
  };

  // DOM
  const gridEl = () => document.getElementById('gameGrid');
  const scoreEl = () => document.getElementById('score');
  const movesEl = () => document.getElementById('moves');
  const targetEl = () => document.getElementById('target');
  const levelTitle = () => document.getElementById('levelTitle');

  // helpers
  function randCandy(){ return Math.floor(Math.random()*CANDY_COUNT); }

  function createBoard(){
    const b = [];
    for(let r=0;r<state.rows;r++){
      const row = [];
      for(let c=0;c<state.cols;c++) row.push(randCandy());
      b.push(row);
    }
    // ensure no immediate matches at start
    removeStartingMatches(b);
    state.board = b;
  }

  function removeStartingMatches(b){
    // simple loop: if any 3+ same in row/col at start, change random cell
    for(let r=0;r<b.length;r++){
      for(let c=0;c<b[r].length;c++){
        if(c>1 && b[r][c]===b[r][c-1] && b[r][c]===b[r][c-2]){
          b[r][c] = (b[r][c]+1) % CANDY_COUNT;
        }
        if(r>1 && b[r][c]===b[r-1][c] && b[r][c]===b[r-2][c]){
          b[r][c] = (b[r][c]+1) % CANDY_COUNT;
        }
      }
    }
  }

  // render
  function renderGrid(){
    const g = gridEl();
    if(!g) return;
    // set CSS grid columns according to cols
    g.style.gridTemplateColumns = `repeat(${state.cols}, ${getCellSize()}px)`;
    g.innerHTML = '';
    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        const idx = state.board[r][c];
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = CANDY_IMAGES[idx];
        img.alt = 'candy';
        cell.appendChild(img);
        g.appendChild(cell);
      }
    }
    attachPointerHandlers();
    updateStats();
  }

  function getCellSize(){
    // choose cell size based on available width (responsive)
    const maxW = Math.min(760, window.innerWidth - 48);
    const size = Math.floor((maxW - (state.cols-1)*12) / state.cols);
    return Math.max(44, Math.min(84, size));
  }

  function updateStats(){
    const s = scoreEl(); if(s) s.textContent = state.score;
    const m = movesEl(); if(m) m.textContent = state.moves;
    const t = targetEl(); if(t) t.textContent = state.target;
    if(levelTitle()) levelTitle().textContent = 'Level ' + state.level;
  }

  // pointer/touch swap logic (pointer events)
  let pointerDown = null;
  let draggingClone = null;

  function attachPointerHandlers(){
    const cells = Array.from(document.querySelectorAll('#gameGrid .cell'));
    cells.forEach(cell=>{
      cell.onpointerdown = onPointerDown;
      cell.onpointerup = onPointerUp;
      cell.onpointermove = onPointerMove;
      cell.onpointercancel = onPointerCancel;
      cell.ondragstart = e=>e.preventDefault();
    });
    // release outside grid
    window.addEventListener('pointerup', onPointerCancel);
  }

  function onPointerDown(e){
    if(state.animating) return;
    e.target.setPointerCapture(e.pointerId);
    const el = e.currentTarget;
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    pointerDown = { r, c, startX: e.clientX, startY: e.clientY, el };
    // create dragging clone for visual
    draggingClone = el.cloneNode(true);
    draggingClone.classList.add('dragging-clone');
    document.body.appendChild(draggingClone);
    moveClone(e.clientX, e.clientY);
  }

  function moveClone(x,y){
    if(!draggingClone) return;
    draggingClone.style.left = x + 'px';
    draggingClone.style.top = y + 'px';
  }

  function onPointerMove(e){
    if(!pointerDown) return;
    e.preventDefault();
    moveClone(e.clientX, e.clientY);
  }

  function onPointerUp(e){
    if(!pointerDown) return cleanupDrag();
    const { r, c, startX, startY } = pointerDown;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    const threshold = 18; // minimal drag to count as swipe
    let toR = r, toC = c;
    if(absX < threshold && absY < threshold){
      // tapped — no move
      cleanupDrag();
      return;
    }
    if(absX > absY){
      // horizontal
      toC = (dx>0) ? c+1 : c-1;
    } else {
      toR = (dy>0) ? r+1 : r-1;
    }
    // validate neighbor
    if(toR<0||toR>=state.rows||toC<0||toC>=state.cols){
      // invalid – shake
      const el = pointerDown.el;
      el && el.classList.add('invalid');
      setTimeout(()=> el && el.classList.remove('invalid'), 180);
      cleanupDrag();
      return;
    }
    // swap cells
    swapAndResolve(r,c,toR,toC);
    cleanupDrag();
  }

  function onPointerCancel(){
    cleanupDrag();
  }

  function cleanupDrag(){
    pointerDown = null;
    if(draggingClone){
      draggingClone.remove();
      draggingClone = null;
    }
  }

  // swap function that animates and resolves matches
  async function swapAndResolve(r1,c1,r2,c2){
    if(state.animating) return;
    // only adjacent
    if(Math.abs(r1-r2)+Math.abs(c1-c2) !== 1) return;
    state.animating = true;

    const cellA = document.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"]`);
    const cellB = document.querySelector(`.cell[data-r="${r2}"][data-c="${c2}"]`);
    if(!cellA||!cellB){ state.animating=false; return; }

    // visual swap: add swapping class
    cellA.classList.add('swapping'); cellB.classList.add('swapping');

    // swap in state
    const tmp = state.board[r1][c1];
    state.board[r1][c1] = state.board[r2][c2];
    state.board[r2][c2] = tmp;

    // re-render images quickly (without full rebuild)
    updateCellImage(cellA, state.board[r1][c1]);
    updateCellImage(cellB, state.board[r2][c2]);

    // small delay so UI shows
    await sleep(160);

    // check if swap creates any matches
    const matches = findMatches();
    if(matches.length === 0){
      // invalid swap — swap back with shake
      cellA.classList.add('invalid'); cellB.classList.add('invalid');
      await sleep(180);
      cellA.classList.remove('invalid'); cellB.classList.remove('invalid');

      // swap back state
      const tmp2 = state.board[r1][c1];
      state.board[r1][c1] = state.board[r2][c2];
      state.board[r2][c2] = tmp2;
      // re-render
      updateCellImage(cellA, state.board[r1][c1]);
      updateCellImage(cellB, state.board[r2][c2]);

      // visual end
      cellA.classList.remove('swapping'); cellB.classList.remove('swapping');
      state.animating = false;
      return;
    }

    // valid swap: reduce move, play sound
    state.moves = Math.max(0, state.moves - 1);
    Sound.play('pop');

    // resolve chain: remove matches, gravity, refill until no matches
    let totalRemoved = 0;
    do {
      await sleep(120);
      const found = findMatches();
      if(found.length===0) break;
      const removed = removeMatches(found);
      totalRemoved += removed;
      // score: simple +100 per candy
      state.score += removed * 100;
      updateStats();
      // animate removal (we re-render grid)
      await sleep(120);
      applyGravity();
      renderGrid(); // repaint board cells
      await sleep(140);
    } while(findMatches().length>0);

    // finalize
    renderGrid();
    updateStats();

    // check moves zero => show game over
    if(state.moves <= 0){
      // small delay then modal
      setTimeout(()=>{
        document.getElementById('go-level').textContent = state.level;
        document.getElementById('go-score').textContent = state.score;
        const modal = document.getElementById('gameOverModal');
        modal.classList.remove('hidden');
        setTimeout(()=> modal.classList.add('show'), 10);
      }, 250);
    }

    // cleanup
    const ca = document.querySelectorAll('.cell.swapping');
    ca.forEach(el=>el.classList.remove('swapping'));
    state.animating = false;
  }

  function updateCellImage(cellEl, idx){
    const img = cellEl.querySelector('img');
    if(img) img.src = CANDY_IMAGES[idx];
  }

  // match detection: return list of coords to remove (array of {r,c})
  function findMatches(){
    const toRemove = [];
    const mark = Array.from({length:state.rows}, ()=>Array(state.cols).fill(false));
    // horizontal
    for(let r=0;r<state.rows;r++){
      let runStart=0;
      for(let c=1;c<=state.cols;c++){
        if(c<state.cols && state.board[r][c]===state.board[r][c-1]){
          continue;
        }
        const runLen = c-runStart;
        if(runLen>=3){
          for(let k=runStart;k<c;k++) mark[r][k]=true;
        }
        runStart = c;
      }
    }
    // vertical
    for(let c=0;c<state.cols;c++){
      let runStart=0;
      for(let r=1;r<=state.rows;r++){
        if(r<state.rows && state.board[r][c]===state.board[r-1][c]) continue;
        const runLen = r - runStart;
        if(runLen>=3){
          for(let k=runStart;k<r;k++) mark[k][c]=true;
        }
        runStart = r;
      }
    }
    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        if(mark[r][c]) toRemove.push({r,c});
      }
    }
    return toRemove;
  }

  function removeMatches(list){
    // mark cells to -1 as empty
    list.forEach(({r,c}) => state.board[r][c] = -1);
    Sound.play('pop');
    return list.length;
  }

  function applyGravity(){
    for(let c=0;c<state.cols;c++){
      let write = state.rows-1;
      for(let r=state.rows-1;r>=0;r--){
        if(state.board[r][c] >= 0){
          state.board[write][c] = state.board[r][c];
          write--;
        }
      }
      // fill remaining from top with new candies
      for(let r=write;r>=0;r--){
        state.board[r][c] = randCandy();
      }
    }
  }

  function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }

  // UI: map rendering
  function renderMap(){
    const mapGrid = document.getElementById('mapGrid');
    if(!mapGrid) return;
    mapGrid.innerHTML = '';
    const unlocked = getUnlocked();
    for(let i=1;i<=9;i++){
      const node = document.createElement('div');
      node.className = 'level-tile';
      node.innerHTML = `<div style="font-weight:700">Level ${i}</div><div style="margin-top:8px">${unlocked.includes(i)?'Play':'Locked'}</div>`;
      node.onclick = ()=> {
        if(!unlocked.includes(i)){ alert('Level locked'); return; }
        state.level = i;
        Game.start();
        location.hash = '#play';
      };
      mapGrid.appendChild(node);
    }
  }

  // progress (localStorage)
  function getUnlocked(){
    try{
      const v = localStorage.getItem('cm_unlocked');
      if(!v) { localStorage.setItem('cm_unlocked', JSON.stringify([1])); return [1]; }
      return JSON.parse(v);
    }catch(e){ return [1]; }
  }
  function unlock(level){
    const arr = new Set(getUnlocked());
    arr.add(level);
    localStorage.setItem('cm_unlocked', JSON.stringify(Array.from(arr)));
  }
  function resetProgress(){
    localStorage.setItem('cm_unlocked', JSON.stringify([1]));
    alert('Progress reset');
  }

  // public functions
  const Game = {
    start(level=state.level){
      state.level = Number(level)||1;
      // simple level mapping: difficulty adjust maybe later
      state.rows = GRID_ROWS;
      state.cols = GRID_COLS;
      state.score = 0;
      state.moves = START_MOVES;
      state.target = TARGET_SCORE;
      createBoard();
      renderGrid();
      renderMap();
      updateStats();
    },
    restart(){
      Game.start(state.level);
    },
    end(){
      // go to map
      location.hash = '#map';
    },
    nextLevel(){
      state.level++;
      unlock(state.level);
      Game.start(state.level);
    },
    renderMap,
    resetProgress,
    // api for console / debug
    _state: state
  };

  // initial load
  window.Game = Game;
  // autoplay background image set via CSS body? we set body bg here if present
  document.addEventListener('DOMContentLoaded', ()=>{
    // load fallback background if image exists
    const bgImg = 'images/bg-gradient.png';
    const img = new Image();
    img.onload = ()=> { document.body.style.backgroundImage = `url(${bgImg})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundRepeat='no-repeat'; };
    img.onerror = ()=>{};
    img.src = bgImg;
    // if hash is play, start called by router
    // render map early
    renderMap();
  });

})(window);

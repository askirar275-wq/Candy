// js/game.js
// Simple pointer-swipe input for GameCore (replace old file)

(function(){
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');

  if(!gridEl){
    console.error('gameGrid element missing (id="gameGrid")');
    return;
  }

  const ROWS = GameCore.ROWS;
  const COLS = GameCore.COLS;
  const SWIPE_THRESHOLD = 12; // px

  // compute cell width to fit nicely on screen
  function adjustGridCols(){
    const maxW = Math.min(window.innerWidth - 40, 720);
    const totalGap = (COLS - 1) * 12;
    const cell = Math.floor((maxW - totalGap) / COLS);
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${cell}px)`;
    // update cell fallback sizes to keep CSS in sync
    const cells = gridEl.querySelectorAll('.cell');
    cells.forEach(c => { c.style.width = cell + 'px'; c.style.height = cell + 'px'; });
  }
  window.addEventListener('resize', adjustGridCols);

  // render based on GameCore state
  function render(state){
    // quick guard
    if(!state || !state.grid) return;
    gridEl.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const img = document.createElement('img');
        const t = state.grid[r][c] || 1;
        img.src = `images/candy${t}.png`;
        img.alt = 'candy';
        img.draggable = false;
        cell.appendChild(img);

        // attach pointerstart to each cell
        cell.addEventListener('pointerdown', onPointerDown);
        gridEl.appendChild(cell);
      }
    }

    if(levelTitle) levelTitle.textContent = `Level ${state.level || 1}`;
    if(scoreEl) scoreEl.textContent = state.score;
    if(movesEl) movesEl.textContent = state.moves;
    if(targetEl) targetEl.textContent = state.target;
    if(starsEl){
      const pct = Math.min(1, state.score / Math.max(1, state.target));
      if(pct >= 0.66) starsEl.textContent = '★ ★ ★';
      else if(pct >= 0.33) starsEl.textContent = '★ ★ ☆';
      else starsEl.textContent = '☆ ☆ ☆';
    }

    // ensure grid sized correctly
    setTimeout(adjustGridCols, 20);
  }

  // subscribe to GameCore updates
  GameCore.onUpdate((s) => render(s));

  // pointer state
  let pointer = null;

  function onPointerDown(e){
    // prevent page from scrolling while user is touching grid
    try { if(e.cancelable) e.preventDefault(); } catch(_){}

    const cell = e.currentTarget;
    if(!cell) return;
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);

    // capture pointer
    try { cell.setPointerCapture && cell.setPointerCapture(e.pointerId); } catch(_){}

    pointer = {
      startX: e.clientX,
      startY: e.clientY,
      startR: r,
      startC: c,
      id: e.pointerId,
      cell
    };

    // attach move & up listeners on document for reliability
    document.addEventListener('pointermove', onPointerMove, {passive:false});
    document.addEventListener('pointerup', onPointerUp, {passive:false});
    document.addEventListener('pointercancel', onPointerCancel, {passive:false});
  }

  function onPointerMove(e){
    if(!pointer || e.pointerId !== pointer.id) return;
    // prevent default scroll while dragging
    try { if(e.cancelable) e.preventDefault(); } catch(_){}
    // we do not create clone; only track movement
  }

  function onPointerUp(e){
    if(!pointer || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.startX;
    const dy = e.clientY - pointer.startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    // release pointer capture
    try { pointer.cell.releasePointerCapture && pointer.cell.releasePointerCapture(e.pointerId); } catch(_){}

    // cleanup listeners
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);

    // if small movement => treat as tap (no swap)
    if(Math.max(adx, ady) < SWIPE_THRESHOLD){
      pointer = null;
      return;
    }

    // decide direction
    let dir;
    if(adx > ady) dir = dx > 0 ? 'right' : 'left';
    else dir = dy > 0 ? 'down' : 'up';

    let nr = pointer.startR, nc = pointer.startC;
    if(dir === 'left') nc = pointer.startC - 1;
    if(dir === 'right') nc = pointer.startC + 1;
    if(dir === 'up') nr = pointer.startR - 1;
    if(dir === 'down') nr = pointer.startR + 1;

    // bounds check
    if(nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS){
      pointer = null;
      return;
    }

    // call core
    try {
      GameCore.trySwap(pointer.startR, pointer.startC, nr, nc);
    } catch(err){
      console.error('trySwap error', err);
    }

    pointer = null;
  }

  function onPointerCancel(e){
    if(!pointer || e.pointerId !== pointer.id) return;
    try { pointer.cell.releasePointerCapture && pointer.cell.releasePointerCapture(e.pointerId); } catch(_){}
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    pointer = null;
  }

  // keyboard arrows (optional)
  let selected = null;
  window.addEventListener('keydown', (e) => {
    if(!selected) return;
    let {r,c} = selected;
    if(e.key === 'ArrowLeft') c = c-1;
    else if(e.key === 'ArrowRight') c = c+1;
    else if(e.key === 'ArrowUp') r = r-1;
    else if(e.key === 'ArrowDown') r = r+1;
    else return;
    if(r<0||r>=ROWS||c<0||c>=COLS) return;
    GameCore.trySwap(selected.r, selected.c, r, c);
  });

  // Expose Game facade to start
  window.Game = {
    start(level){
      const s = GameCore.start(level);
      render(s);
      setTimeout(adjustGridCols, 40);
      return s;
    },
    restart(){ const s = GameCore.getState(); this.start(s.level || 1); }
  };

  // initial render if state available
  try {
    const s = GameCore.getState();
    if(s) render(s);
  } catch(_){}
})();

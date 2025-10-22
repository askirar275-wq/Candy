// js/game.js
// Robust pointer-based input + rendering for GameCore
// Replace your current js/game.js with this file.

(function(){
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');

  if(!gridEl){
    console.error('gameGrid element not found (id="gameGrid")');
    return;
  }

  const ROWS = GameCore.ROWS;
  const COLS = GameCore.COLS;

  // Layout: compute cell size to fit width
  function adjustGridCols(){
    const maxW = Math.min(window.innerWidth - 40, 720);
    const totalGap = (COLS - 1) * 10;
    const cell = Math.floor((maxW - totalGap) / COLS);
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${cell}px)`;
  }
  window.addEventListener('resize', adjustGridCols);
  adjustGridCols();

  // Render function
  function render(state){
    gridEl.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const img = document.createElement('img');
        const t = (state && state.grid && state.grid[r] && state.grid[r][c]) || 1;
        img.src = `images/candy${t}.png`;
        img.alt = 'candy';
        img.draggable = false;
        cell.appendChild(img);

        // pointerdown handler attached to cell
        cell.addEventListener('pointerdown', onCellPointerDown);
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
  }

  // Subscribe to GameCore updates
  GameCore.onUpdate((s)=> {
    render(s);
    // ensure grid layout is correct after render
    setTimeout(adjustGridCols, 20);
  });

  // Drag state
  let dragState = null;
  // threshold in px to consider a swipe
  const SWIPE_THRESHOLD = 12;

  // pointerdown handler attached to each cell on render
  function onCellPointerDown(e){
    // use pointer events to capture properly
    const el = e.currentTarget;
    if(!el) return;
    // prevent default to stop page scroll during touch drag
    try { if(e.cancelable) e.preventDefault(); } catch(_) {}
    // capture the pointer
    try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch(_) {}

    const r = Number(el.dataset.r);
    const c = Number(el.dataset.c);
    const startX = e.clientX;
    const startY = e.clientY;

    // create clone visual
    const img = el.querySelector('img');
    const clone = img ? img.cloneNode(true) : null;
    if(clone){
      clone.className = 'dragging-clone';
      clone.style.position = 'fixed';
      clone.style.left = startX + 'px';
      clone.style.top = startY + 'px';
      clone.style.transform = 'translate(-50%,-50%)';
      document.body.appendChild(clone);
    }

    dragState = {
      originEl: el,
      startR: r,
      startC: c,
      pointerId: e.pointerId,
      startX, startY,
      lastX: startX,
      lastY: startY,
      clone
    };

    // attach move/up listeners on document for reliability
    document.addEventListener('pointermove', onDocumentPointerMove);
    document.addEventListener('pointerup', onDocumentPointerUp);
    document.addEventListener('pointercancel', onDocumentPointerCancel);
  }

  function onDocumentPointerMove(e){
    if(!dragState) return;
    if(e.pointerId !== dragState.pointerId) return;
    const x = e.clientX, y = e.clientY;
    dragState.lastX = x; dragState.lastY = y;
    // move clone
    if(dragState.clone){
      dragState.clone.style.left = x + 'px';
      dragState.clone.style.top = y + 'px';
    }
    // optional: highlight hovered neighbor
    // we won't swap until pointerup
  }

  function onDocumentPointerUp(e){
    if(!dragState) return;
    if(e.pointerId !== dragState.pointerId) return;

    // compute direction using displacement from start
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    // remove clone
    if(dragState.clone && dragState.clone.parentNode) dragState.clone.remove();

    // release pointer capture from origin element if set
    try { dragState.originEl.releasePointerCapture && dragState.originEl.releasePointerCapture(e.pointerId); } catch(_) {}

    // remove document listeners
    document.removeEventListener('pointermove', onDocumentPointerMove);
    document.removeEventListener('pointerup', onDocumentPointerUp);
    document.removeEventListener('pointercancel', onDocumentPointerCancel);

    // if small movement -> treat as tap (no swap)
    if(Math.max(adx, ady) < SWIPE_THRESHOLD){
      dragState = null;
      return;
    }

    // determine direction
    let dir = null;
    if(adx > ady) dir = dx > 0 ? 'right' : 'left';
    else dir = dy > 0 ? 'down' : 'up';

    let nr = dragState.startR, nc = dragState.startC;
    if(dir === 'left') nc = dragState.startC - 1;
    if(dir === 'right') nc = dragState.startC + 1;
    if(dir === 'up') nr = dragState.startR - 1;
    if(dir === 'down') nr = dragState.startR + 1;

    // bounds check
    if(nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS){
      dragState = null;
      return;
    }

    // call core swap method
    try {
      const ok = GameCore.trySwap(dragState.startR, dragState.startC, nr, nc);
      // optional: play sound
      try { if(window.Sound && Sound.play) Sound.play(ok ? 'swap' : 'invalid'); } catch(_){}
    } catch(err){
      console.error('trySwap failed', err);
    }

    dragState = null;
  }

  function onDocumentPointerCancel(e){
    if(!dragState) return;
    if(e.pointerId !== dragState.pointerId) return;
    if(dragState.clone && dragState.clone.parentNode) dragState.clone.remove();
    try { dragState.originEl.releasePointerCapture && dragState.originEl.releasePointerCapture(e.pointerId); } catch(_) {}
    document.removeEventListener('pointermove', onDocumentPointerMove);
    document.removeEventListener('pointerup', onDocumentPointerUp);
    document.removeEventListener('pointercancel', onDocumentPointerCancel);
    dragState = null;
  }

  // keyboard support (arrow keys move selected cell)
  let selected = null;
  window.addEventListener('keydown', (e)=>{
    if(!selected) return;
    let {r,c} = selected;
    if(e.key === 'ArrowLeft') c = c-1;
    else if(e.key === 'ArrowRight') c = c+1;
    else if(e.key === 'ArrowUp') r = r-1;
    else if(e.key === 'ArrowDown') r = r+1;
    else return;
    // bounds
    if(r<0||r>=ROWS||c<0||c>=COLS) return;
    GameCore.trySwap(selected.r, selected.c, r, c);
  });

  // Expose Game facade
  window.Game = {
    start(level){
      const st = GameCore.start(level);
      // ensure rendering triggered by onUpdate; but call render once
      // GameCore.onUpdate will call render when started; if not, force render:
      setTimeout(()=> {
        // render forced via GameCore.onUpdate subscription earlier
      }, 10);
      // show game page if available
      const page = document.getElementById('page-game');
      if(page){
        document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
        page.classList.add('active');
      }
      // adjust grid size after start
      setTimeout(adjustGridCols, 50);
      return st;
    },
    restart(){ const s = GameCore.getState(); this.start(s.level || 1); }
  };

  // initial render request - in case GameCore already has state
  try {
    const s = GameCore.getState();
    if(s) render(s);
  } catch(_) {}

  // small debounce to ensure layout correct after first render
  setTimeout(adjustGridCols, 80);

  // attach GameCore.onUpdate render (make sure only one subscription)
  // (re-subscribe safely)
  GameCore.onUpdate((s)=> render(s));
})();

// js/game.js
// Render & input handling for GameCore (swap on swipe/touch or mouse)

(function(){
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const timerEl = document.getElementById('timer');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');

  if(!gridEl) {
    console.error('gameGrid element missing');
    return;
  }

  const ROWS = GameCore.ROWS, COLS = GameCore.COLS;

  function adjustGridCols(){
    const containerW = Math.min(window.innerWidth - 40, 720);
    const totalGap = (COLS - 1) * 10;
    const cell = Math.floor((containerW - totalGap) / COLS);
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${cell}px)`;
  }
  window.addEventListener('resize', adjustGridCols);
  adjustGridCols();

  function render(state){
    gridEl.innerHTML = '';
    const grid = state.grid;
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const t = grid[r][c] || 1;
        const img = document.createElement('img');
        img.src = `images/candy${t}.png`;
        img.alt = 'candy';
        img.draggable = false;
        cell.appendChild(img);
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

  // drag/swipe handling
  let dragging = null;

  function getPoint(e){
    if(e.changedTouches && e.changedTouches.length) {
      const t = e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  function pointerStart(e){
    const p = getPoint(e);
    const el = e.target.closest('.cell');
    if(!el) return;
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    dragging = { r, c, startX: p.x, startY: p.y, moved:false };
    // prevent page scroll while touching grid
    if(e.cancelable) e.preventDefault();
  }

  function pointerMove(e){
    if(!dragging) return;
    // optional: visual dragging clone — skipped for simplicity
    // prevent scrolling
    if(e.cancelable) e.preventDefault();
  }

  function pointerEnd(e){
    if(!dragging) return;
    const p = getPoint(e);
    const dx = p.x - dragging.startX, dy = p.y - dragging.startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    // threshold
    if(Math.max(adx, ady) < 12){
      dragging = null;
      return;
    }
    let dir;
    if(adx > ady) dir = dx>0 ? 'right' : 'left';
    else dir = dy>0 ? 'down' : 'up';

    let nr = dragging.r, nc = dragging.c;
    if(dir === 'left') nc = dragging.c - 1;
    if(dir === 'right') nc = dragging.c + 1;
    if(dir === 'up') nr = dragging.r - 1;
    if(dir === 'down') nr = dragging.r + 1;

    // bounds
    if(nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS){
      dragging = null;
      return;
    }

    // call core swap
    const ok = GameCore.trySwap(dragging.r, dragging.c, nr, nc);
    // small feedback (you can wire Sound here)
    dragging = null;
    return ok;
  }

  // listeners
  gridEl.addEventListener('touchstart', pointerStart, {passive:false});
  gridEl.addEventListener('touchmove', pointerMove, {passive:false});
  gridEl.addEventListener('touchend', pointerEnd, {passive:false});
  gridEl.addEventListener('mousedown', pointerStart);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerEnd);

  // subscribe to updates
  GameCore.onUpdate((state)=> render(state));

  // expose Game facade (start)
  window.Game = {
    start(lvl){
      const st = GameCore.start(lvl);
      render(st);
      setTimeout(adjustGridCols,50);
      // ensure game page shown if you use page system
      const page = document.getElementById('page-game');
      if(page){
        document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
        page.classList.add('active');
      }
      return st;
    },
    restart(){ const s = GameCore.getState(); this.start(s.level || 1); }
  };

})();

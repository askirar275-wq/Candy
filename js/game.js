// js/game.js
// Renders grid, hookup touch/mouse swipe, exposes Game.start

(function(){
  const gridEl = document.getElementById('gameGrid');
  const titleEl = document.getElementById('levelTitle') || document.querySelector('.level-title');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const timerEl = document.getElementById('timer');
  const starsEl = document.getElementById('stars');

  const ROWS = GameCore.ROWS, COLS = GameCore.COLS;

  // layout grid columns responsively
  function adjustGridCols(){
    // compute cell size to fit comfortably within screen
    const containerW = Math.min(window.innerWidth - 40, 720);
    // gap 10px between cells
    const totalGap = (COLS - 1) * 10;
    const cell = Math.floor((containerW - totalGap) / COLS);
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${cell}px)`;
  }
  window.addEventListener('resize', adjustGridCols);
  adjustGridCols();

  // render callback
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
    if(titleEl) titleEl.textContent = `Level ${state.level || 1}`;
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
  let dragging = null; // {r,c,startX,startY,clone}
  function pointerStart(e){
    e.preventDefault();
    const p = getPoint(e);
    const cell = e.target.closest('.cell');
    if(!cell) return;
    const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
    const img = cell.querySelector('img');
    const clone = img.cloneNode(true);
    clone.className = 'dragging-clone';
    document.body.appendChild(clone);
    moveClone(clone, p.x, p.y);
    dragging = { r, c, startX: p.x, startY: p.y, clone };
  }
  function pointerMove(e){
    if(!dragging) return;
    const p = getPoint(e);
    moveClone(dragging.clone, p.x, p.y);
  }
  function pointerEnd(e){
    if(!dragging) return;
    const p = getPoint(e);
    const dx = p.x - dragging.startX, dy = p.y - dragging.startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    // threshold
    if(Math.max(adx, ady) < 12){
      // tap - no swap
      removeClone(dragging.clone);
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

    // bounds check
    if(nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS){
      removeClone(dragging.clone);
      dragging = null;
      return;
    }

    removeClone(dragging.clone);
    // call core swap
    const success = GameCore.trySwap(dragging.r, dragging.c, nr, nc);
    // try play sound if exists
    try { if(window.Sound && Sound.play) Sound.play(success ? 'swap' : 'invalid'); } catch(e){}
    dragging = null;
  }

  function moveClone(el,x,y){
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.transform = 'translate(-50%,-50%)';
  }
  function removeClone(el){ if(el && el.parentNode) el.parentNode.removeChild(el); }

  function getPoint(e){
    if(e.changedTouches && e.changedTouches.length) {
      const t = e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  // attach listeners
  gridEl.addEventListener('touchstart', pointerStart, {passive:false});
  gridEl.addEventListener('touchmove', pointerMove, {passive:false});
  gridEl.addEventListener('touchend', pointerEnd, {passive:false});
  gridEl.addEventListener('mousedown', pointerStart);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerEnd);

  // subscribe to core updates
  GameCore.onUpdate((state)=>{
    render(state);
  });

  const Game = {
    start(level){
      const st = GameCore.start(level);
      render(st);
      // show game page if you have pages toggle
      const pg = document.getElementById('page-game');
      if(pg){
        document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
        pg.classList.add('active');
      }
      // adjust layout after render
      setTimeout(adjustGridCols,50);
      return st;
    },
    restart(){ const s = GameCore.getState(); Game.start(s.level||1); }
  };

  window.Game = Game;
})();

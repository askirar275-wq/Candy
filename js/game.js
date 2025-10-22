// js/game.js
// Responsible for rendering grid and handling touch/mouse swipes
(function(){
  const gridEl = document.getElementById('gameGrid');
  const levelTitle = document.getElementById('levelTitle');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const timerEl = document.getElementById('timer');
  const starsEl = document.getElementById('stars');

  const ROWS = GameCore.ROWS;
  const COLS = GameCore.COLS;

  // adjust grid columns to fit screen responsively
  function layoutGrid(){
    const cw = Math.min(window.innerWidth - 40, 720);
    // choose cell size so grid fits
    const desiredCell = (cw - (COLS-1)*10) / COLS;
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${Math.floor(desiredCell)}px)`;
  }
  window.addEventListener('resize', layoutGrid);
  layoutGrid();

  // render function: create cell elements from state
  function render(state){
    // state.grid is 2D rows x cols
    gridEl.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const type = state.grid[r][c];
        const img = document.createElement('img');
        img.alt = 'candy';
        img.draggable = false;
        img.src = `images/candy${type}.png`;
        cell.appendChild(img);
        gridEl.appendChild(cell);
      }
    }
    // update HUD
    levelTitle.textContent = `Level ${state.currentLevel}`;
    scoreEl.textContent = state.score;
    movesEl.textContent = state.moves;
    targetEl.textContent = state.target;
    // update stars (simple)
    const pct = Math.min(1, state.score / Math.max(1, state.target));
    let stars = '☆ ☆ ☆';
    if(pct >= 0.66) stars = '★ ★ ★';
    else if(pct >= 0.33) stars = '★ ★ ☆';
    starsEl.textContent = stars;
  }

  // input handling: support touch and mouse drag -> calculate direction and attempt swap
  let dragging = null; // {startX,startY,r,c,cloneEl}
  function onPointerDown(e){
    e.preventDefault();
    const target = e.target.closest('.cell');
    if(!target) return;
    const r = Number(target.dataset.r);
    const c = Number(target.dataset.c);
    const pt = getEventPoint(e);
    // create clone image for smooth drag
    const img = target.querySelector('img');
    const clone = img.cloneNode(true);
    clone.className = 'dragging-clone';
    document.body.appendChild(clone);
    moveClone(clone, pt.x, pt.y);
    dragging = { startX: pt.x, startY: pt.y, r, c, clone };
  }

  function onPointerMove(e){
    if(!dragging) return;
    const pt = getEventPoint(e);
    moveClone(dragging.clone, pt.x, pt.y);
  }

  function onPointerUp(e){
    if(!dragging) return;
    const pt = getEventPoint(e);
    const dx = pt.x - dragging.startX;
    const dy = pt.y - dragging.startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    let dir = null;
    if(Math.max(adx, ady) < 18){ // small move -> treat as tap (no swap)
      removeClone(dragging.clone);
      dragging = null;
      return;
    }
    if(adx > ady){
      dir = dx>0 ? 'right' : 'left';
    } else {
      dir = dy>0 ? 'down' : 'up';
    }
    const {r,c} = dragging;
    let nr=r, nc=c;
    if(dir==='left') nc = c-1;
    if(dir==='right') nc = c+1;
    if(dir==='up') nr = r-1;
    if(dir==='down') nr = r+1;
    // bounds check
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS){
      // invalid - just remove clone
      removeClone(dragging.clone);
      dragging = null;
      return;
    }
    removeClone(dragging.clone);
    dragging = null;

    // ask core to try swap and resolve
    const ok = GameCore.trySwapAndResolve(r,c,nr,nc);
    // play sounds if available
    if(ok) {
      try { Sound.play && Sound.play('swap'); } catch(e){}
    } else {
      try { Sound.play && Sound.play('invalid'); } catch(e){}
    }
  }

  function moveClone(el,x,y){
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.transform = 'translate(-50%,-50%)';
  }
  function removeClone(el){
    if(!el) return;
    el.remove();
  }

  // pointer helper
  function getEventPoint(e){
    if(e.changedTouches && e.changedTouches.length) {
      const t = e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  // attach listeners
  // support touch events and mouse events
  gridEl.addEventListener('touchstart', onPointerDown, {passive:false});
  gridEl.addEventListener('touchmove', onPointerMove, {passive:false});
  gridEl.addEventListener('touchend', onPointerUp, {passive:false});
  gridEl.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  // subscribe to core updates
  GameCore.onUpdate((state)=>{
    // render grid
    render(state);
  });

  // Expose high-level API used by index.html
  const Game = {
    start(level){
      const state = GameCore.start(level);
      render(state);
      layoutGrid();
      // show game page
      document.querySelectorAll('.page').forEach(p=> p.classList.remove('active'));
      document.getElementById('page-game').classList.add('active');
      return state;
    },
    restart(){
      const s = GameCore.getState();
      Game.start(s.currentLevel || 1);
    },
    getState(){ return GameCore.getState(); }
  };

  window.Game = Game;
})();

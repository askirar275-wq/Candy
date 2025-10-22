// game.js
// UI + touch/pointer handling + using Core engine

const Game = (function(Core){
  const gridEl = document.querySelector('.game-grid');
  let grid = [];
  let animating = false;
  let selected = null; // {r,c,el}
  let score = 0;
  let moves = 30;
  const IMAGE_PATH = i => `images/candy${i}.png`;

  function init(){
    grid = Core.createInitial();
    renderGrid();
    attachHandlers();
    updateUI();
  }

  function updateUI(){
    const sc = document.getElementById('score'); if(sc) sc.textContent = score;
    const mv = document.getElementById('moves'); if(mv) mv.textContent = moves;
    const tg = document.getElementById('target'); if(tg) tg.textContent = 600;
  }

  function renderGrid(){
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${Core.COLS}, 64px)`;
    for(let r=0;r<Core.ROWS;r++){
      for(let c=0;c<Core.COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.draggable = false;
        img.src = IMAGE_PATH(grid[r][c]);
        img.alt = 'candy';
        cell.appendChild(img);
        gridEl.appendChild(cell);
      }
    }
  }

  // helper: get coords from element
  function coordsFromEl(el){
    return { r: parseInt(el.dataset.r,10), c: parseInt(el.dataset.c,10) };
  }

  // check adjacency
  function adjacent(a,b){
    const dr = Math.abs(a.r-b.r), dc = Math.abs(a.c-b.c);
    return (dr + dc) === 1;
  }

  // perform animated swap, then check matches
  async function performSwap(aEl, bEl){
    if(animating) return;
    animating = true;
    const a = coordsFromEl(aEl), b = coordsFromEl(bEl);

    // swap in model
    Core.swap(grid, a, b);
    // swap visuals quickly
    const aImg = aEl.querySelector('img'), bImg = bEl.querySelector('img');
    const tmpSrc = aImg.src;
    aImg.src = bImg.src;
    bImg.src = tmpSrc;

    // animate a small scale/bounce for feedback
    aEl.classList.add('swapping'); bEl.classList.add('swapping');
    await new Promise(r => setTimeout(r, 180));
    aEl.classList.remove('swapping'); bEl.classList.remove('swapping');

    // check matches
    let removed = [];
    const matchCoords = Core.findMatches(grid);
    if(matchCoords.length === 0){
      // no match: swap back (revert)
      Core.swap(grid, a, b);
      // revert visuals
      const tmp = aImg.src; aImg.src = bImg.src; bImg.src = tmp;
      // small shake to show invalid
      aEl.classList.add('invalid'); bEl.classList.add('invalid');
      await new Promise(r => setTimeout(r,160));
      aEl.classList.remove('invalid'); bEl.classList.remove('invalid');
      animating = false;
      return;
    }

    // matched: handle removal -> collapse -> refill loop until no matches
    moves = Math.max(0, moves-1);
    updateUI();

    while(true){
      const matches = Core.findMatches(grid);
      if(matches.length === 0) break;
      // remove
      Core.removeMatches(grid, matches);
      // update visuals: set blank by replacing img to transparent (fade)
      for(const p of matches){
        const el = gridEl.querySelector(`.cell[data-r="${p.r}"][data-c="${p.c}"] img`);
        if(el){
          el.style.opacity = '0';
        }
      }
      await new Promise(r=>setTimeout(r,200));
      // collapse & refill in model
      Core.collapse(grid);
      // re-render visuals to reflect new grid (smooth)
      // We'll animate re-render by updating srcs and fade-in
      for(let r=0;r<Core.ROWS;r++){
        for(let c=0;c<Core.COLS;c++){
          const el = gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"] img`);
          if(el){
            el.src = IMAGE_PATH(grid[r][c]);
            el.style.opacity = '0';
          }
        }
      }
      await new Promise(r=>setTimeout(r,50));
      // fade-in
      for(let r=0;r<Core.ROWS;r++){
        for(let c=0;c<Core.COLS;c++){
          const el = gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"] img`);
          if(el) el.style.opacity = '1';
        }
      }
      // increment score for removed candies
      score += matches.length * 50;
      updateUI();
      await new Promise(r=>setTimeout(r,220));
    }

    animating = false;
  }

  // pointer/touch handling: we allow tap then tap-to-swap or drag-to-swap
  function attachHandlers(){
    let pointerDownEl = null;
    let startPoint = null;

    gridEl.addEventListener('pointerdown', (ev)=>{
      if(animating) return;
      const cell = ev.target.closest('.cell');
      if(!cell) return;
      ev.preventDefault();
      pointerDownEl = cell;
      startPoint = {x: ev.clientX, y: ev.clientY};
      cell.classList.add('active');
    });

    gridEl.addEventListener('pointerup', (ev)=>{
      if(!pointerDownEl) return;
      const cellUp = ev.target.closest('.cell');
      pointerDownEl.classList.remove('active');
      // if releasing over different cell and adjacent -> swap
      if(cellUp && cellUp !== pointerDownEl){
        const a = coordsFromEl(pointerDownEl), b = coordsFromEl(cellUp);
        if(adjacent(a,b)){
          performSwap(pointerDownEl, cellUp);
        }
      }
      pointerDownEl = null;
      startPoint = null;
    });

    // also support pointercancel / leave
    gridEl.addEventListener('pointercancel', ()=>{ if(pointerDownEl) pointerDownEl.classList.remove('active'); pointerDownEl = null; });

    // support quick swipes: pointermove detect direction and swap with neighbor
    gridEl.addEventListener('pointermove', (ev)=>{
      if(!pointerDownEl || animating) return;
      const dx = ev.clientX - startPoint.x;
      const dy = ev.clientY - startPoint.y;
      const absx = Math.abs(dx), absy = Math.abs(dy);
      const THRESH = 24; // min px to consider swipe
      if(Math.max(absx,absy) < THRESH) return;
      // determine direction
      let dir = null;
      if(absx > absy){
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }
      // compute neighbor cell
      const {r,c} = coordsFromEl(pointerDownEl);
      let nr = r, nc = c;
      if(dir === 'right') nc = c+1;
      if(dir === 'left') nc = c-1;
      if(dir === 'down') nr = r+1;
      if(dir === 'up') nr = r-1;
      if(nr<0||nr>=Core.ROWS||nc<0||nc>=Core.COLS) return;
      const neighbor = gridEl.querySelector(`.cell[data-r="${nr}"][data-c="${nc}"]`);
      if(neighbor){
        // perform swap and clear pointerDown to avoid repeated swaps
        pointerDownEl.classList.remove('active');
        pointerDownEl = null;
        startPoint = null;
        performSwap(pointerDownEl || gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`), neighbor);
      }
    });

    // disable native touch scrolling when interacting grid
    gridEl.addEventListener('touchstart', (e)=>{ if(e.cancelable) e.preventDefault(); }, {passive:false});
  }

  return { init, startFromLevel: (l)=>init() };
})(Core);

// auto-init if DOM ready
window.addEventListener('load', ()=>{ 
  const g = document.querySelector('.game-grid');
  if(g) Game.init();
});

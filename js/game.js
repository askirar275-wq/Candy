// ✅ Candy Match Game (Responsive + Smooth + Mobile Friendly)
// ------------------------------------------------------------

/* --- responsive grid setup: run before game initialization --- */
(function setupResponsiveGrid(){
  const gridEl = document.getElementById('gameGrid');
  if(!gridEl) return;

  function computeGridVars(){
    // desired min and max sizes
    const minCell = 48;   // minimum tile px
    const maxCell = 72;   // maximum tile px
    const gap = 12;       // CSS gap (match CSS)
    const minCols = 5;
    const maxCols = 8;

    // available width: parent width ensures grid fits card
    const parent = gridEl.parentElement;
    const avail = Math.min(parent.getBoundingClientRect().width, window.innerWidth - 32);

    // compute columns that best fit inside
    let chosen = minCols;
    let chosenSize = minCell;
    for(let cols=maxCols; cols>=minCols; cols--){
      const required = cols * maxCell + (cols-1) * gap;
      const requiredMin = cols * minCell + (cols-1) * gap;
      if(requiredMin <= avail){
        const size = Math.min(maxCell, Math.floor((avail - (cols-1)*gap) / cols));
        chosen = cols; chosenSize = Math.max(minCell, size);
        break;
      }
    }

    // set CSS variables
    document.documentElement.style.setProperty('--cols', chosen);
    document.documentElement.style.setProperty('--cell-size', chosenSize + 'px');
    document.documentElement.style.setProperty('--gap', gap + 'px');
  }

  // initial + resize
  computeGridVars();
  let t;
  window.addEventListener('resize', ()=>{ clearTimeout(t); t = setTimeout(computeGridVars, 120); });
  window.addEventListener('load', computeGridVars);
})();

/* --- Game core --- */
(() => {
  const IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  const COLS = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols')) || 7;
  const ROWS = 8;
  const START_MOVES = 30;
  const SCORE_PER_TILE = 50;

  let grid = [];
  let score = 0;
  let moves = START_MOVES;
  let currentLevel = 1;

  const pageHome = document.getElementById('page-home');
  const pageMap = document.getElementById('page-map');
  const pagePlay = document.getElementById('page-play');
  const pageAbout = document.getElementById('page-about');

  const levelGridEl = document.getElementById('levelGrid');
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitleEl = document.getElementById('levelTitle');

  const btnRestart = document.getElementById('btnRestart');
  const btnShuffle = document.getElementById('btnShuffle');
  const btnShop = document.getElementById('btnShop');
  const dragClone = document.getElementById('dragClone');

  /* Utility helpers */
  function isStriped(tile){ return tile && typeof tile === 'object' && tile.type === 'striped'; }
  function tileKey(tile){ if(tile==null) return 'null'; if(typeof tile==='object') return `striped-${tile.base}-${tile.dir}`; return `norm-${tile}`; }

  /* Routing */
  function showPage(route){
    [pageHome,pageMap,pagePlay,pageAbout].forEach(p=>p.classList.add('hidden'));
    if(route.startsWith('/map')) pageMap.classList.remove('hidden');
    else if(route.startsWith('/play')) pagePlay.classList.remove('hidden');
    else if(route.startsWith('/about')) pageAbout.classList.remove('hidden');
    else pageHome.classList.remove('hidden');
  }

  function router(){
    const hash = location.hash || '#/home';
    showPage(hash.replace('#',''));
  }
  window.addEventListener('hashchange', router);
  document.addEventListener('DOMContentLoaded', router);

  /* Grid setup */
  function randTileIndex(){ return Math.floor(Math.random()*IMAGES.length); }

  function buildInitialGrid(){
    grid = [];
    for(let r=0;r<ROWS;r++){
      grid[r]=[];
      for(let c=0;c<COLS;c++){
        let t;
        do { t = randTileIndex(); } while (wouldCreateMatchAt(r,c,t));
        grid[r][c] = t;
      }
    }
  }

  function wouldCreateMatchAt(r,c,val){
    if(c>=2 && grid[r][c-1]===val && grid[r][c-2]===val) return true;
    if(r>=2 && grid[r-1] && grid[r-2] && grid[r-1][c]===val && grid[r-2][c]===val) return true;
    return false;
  }

  /* Render */
  function renderGrid(){
    gridEl.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const tile = grid[r][c];
        const img = document.createElement('img');
        if(isStriped(tile)){
          img.src = IMAGES[tile.base];
          img.style.transform = tile.dir==='h' ? 'rotate(90deg)' : 'none';
        } else {
          if(tile!=null) img.src = IMAGES[tile];
        }
        cell.appendChild(img);
        addPointerHandlers(cell);
        gridEl.appendChild(cell);
      }
    }
  }

  function updateHUD(){
    scoreEl.textContent = score;
    movesEl.textContent = moves;
    if(targetEl) targetEl.textContent = 600 * currentLevel;
    starsEl.textContent = computeStars();
    levelTitleEl.textContent = `Level ${currentLevel}`;
  }

  function computeStars(){
    const t = 600 * currentLevel;
    const s = score;
    if(s >= t*1.5) return '★ ★ ★';
    if(s >= t) return '★ ★ ☆';
    return '★ ☆ ☆';
  }

  /* Pointer & drag handling */
  let dragging = false;
  let dragSource = null;

  function addPointerHandlers(cell){
    cell.addEventListener('pointerdown', onPointerDown);
    cell.addEventListener('pointerup', onPointerUp);
    cell.addEventListener('pointermove', onPointerMove);
    cell.addEventListener('pointercancel', onPointerCancel);
  }

  function onPointerDown(e){
    e.preventDefault();
    const cell = e.currentTarget;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    dragging = true;
    dragSource = {r,c,el:cell};
    const tile = grid[r][c];
    if(tile==null) return;
    dragClone.innerHTML = '';
    const img = document.createElement('img');
    img.src = isStriped(tile) ? IMAGES[tile.base] : IMAGES[tile];
    dragClone.appendChild(img);
    dragClone.classList.remove('hidden');
    moveCloneTo(e.clientX, e.clientY, 1.1);
    cell.classList.add('selected');
    cell.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e){
    if(!dragging) return;
    moveCloneTo(e.clientX, e.clientY, 1.0);
  }

  function onPointerUp(e){
    if(!dragging) return;
    const src = dragSource;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const targetCell = under ? under.closest('.cell') : null;
    dragClone.classList.add('hidden');
    dragging = false;
    if(targetCell){
      const tr = +targetCell.dataset.r, tc = +targetCell.dataset.c;
      handleSwap(src.r, src.c, tr, tc);
    } else {
      clearSelectionUI();
    }
  }

  function onPointerCancel(){ dragClone.classList.add('hidden'); dragging=false; clearSelectionUI(); }

  function moveCloneTo(x,y,scale=1){
    dragClone.style.left = x + 'px';
    dragClone.style.top = y + 'px';
    dragClone.style.transform = `translate(-50%,-50%) scale(${scale})`;
  }

  function clearSelectionUI(){
    Array.from(gridEl.querySelectorAll('.cell.selected')).forEach(el=>el.classList.remove('selected'));
  }

  /* Swap + Match logic */
  function handleSwap(r1,c1,r2,c2){
    if(Math.abs(r1-r2)+Math.abs(c1-c2) !== 1){ clearSelectionUI(); return; }
    swapTiles(r1,c1,r2,c2);
    renderGrid();
    moves = Math.max(0, moves-1);
    updateHUD();

    const matches = findAllMatches();
    if(matches.length){
      resolveMatchesCascade();
    } else {
      animateInvalidSwap(r1,c1,r2,c2).then(()=> { swapTiles(r1,c1,r2,c2); renderGrid(); });
    }
  }

  function swapTiles(aR,aC,bR,bC){
    const tmp = grid[aR][aC];
    grid[aR][aC] = grid[bR][bC];
    grid[bR][bC] = tmp;
  }

  function animateInvalidSwap(r1,c1,r2,c2){
    return new Promise(res=>{
      const elA = cellEl(r1,c1), elB = cellEl(r2,c2);
      if(elA) elA.classList.add('invalid');
      if(elB) elB.classList.add('invalid');
      setTimeout(()=> { if(elA) elA.classList.remove('invalid'); if(elB) elB.classList.remove('invalid'); res(); }, 260);
    });
  }

  function cellEl(r,c){ return gridEl.children[r*COLS + c]; }

  /* Match detection */
  function findAllMatches(){
    const mark = Array.from({length:ROWS}, ()=>Array(COLS).fill(false));
    for(let r=0;r<ROWS;r++){
      let start=0;
      for(let c=1;c<=COLS;c++){
        if(c<COLS && grid[r][c]===grid[r][c-1]) continue;
        const len = c-start;
        if(len>=3) for(let k=start;k<c;k++) mark[r][k]=true;
        start=c;
      }
    }
    for(let c=0;c<COLS;c++){
      let start=0;
      for(let r=1;r<=ROWS;r++){
        if(r<ROWS && grid[r][c]===grid[r-1][c]) continue;
        const len = r-start;
        if(len>=3) for(let k=start;k<r;k++) mark[k][c]=true;
        start=r;
      }
    }
    const matches=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(mark[r][c]) matches.push({r,c});
    return matches;
  }

  /* Cascade removal + refill */
  function resolveMatchesCascade(){
    function step(){
      const matches = findAllMatches();
      if(matches.length===0) return;
      matches.forEach(({r,c})=> grid[r][c]=null);
      score += matches.length * SCORE_PER_TILE;
      updateHUD();
      renderGrid();
      setTimeout(()=>{ applyGravity(); renderGrid(); setTimeout(step, 180); }, 180);
    }
    step();
  }

  function applyGravity(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c]!==null){
          grid[write][c]=grid[r][c];
          write--;
        }
      }
      for(let r=write;r>=0;r--) grid[r][c]=randTileIndex();
    }
  }

  /* Buttons */
  btnRestart.addEventListener('click', ()=>{ score=0; moves=START_MOVES; buildInitialGrid(); renderGrid(); updateHUD(); });
  btnShuffle.addEventListener('click', ()=>{ buildInitialGrid(); renderGrid(); });
  btnShop.addEventListener('click', ()=>{ alert('Shop Placeholder'); });

  /* Map page build */
  function buildMap(){
    levelGridEl.innerHTML = '';
    for(let i=1;i<=9;i++){
      const card=document.createElement('div');
      card.className='level-card';
      card.innerHTML=`<strong>Level ${i}</strong><div style="margin-top:8px;"><a class="btn outline" href="#/play?level=${i}">Play</a></div>`;
      levelGridEl.appendChild(card);
    }
  }

  function parseLevelFromHash(){
    const h=location.hash||'#/home';
    const m=h.match(/level=(\d+)/);
    if(m) return Math.max(1,Math.min(20,parseInt(m[1],10)));
    const q=h.split('?')[1];
    if(q){ const p=new URLSearchParams(q); const lv=p.get('level'); if(lv) return parseInt(lv,10);}
    return 1;
  }

  window.addEventListener('hashchange', ()=>{
    const route=location.hash.replace('#','');
    showPage(route);
    if(route.startsWith('/play')){
      currentLevel=parseLevelFromHash();
      startLevel(currentLevel);
    }
  });

  function startLevel(level){
    currentLevel=level||1;
    score=0; moves=START_MOVES;
    buildInitialGrid(); renderGrid(); updateHUD();
  }

  function init(){
    document.documentElement.style.setProperty('--cols', COLS);
    buildMap();
    const initialHash=location.hash||'#/home';
    showPage(initialHash.replace('#',''));
    if(initialHash.startsWith('#/play')) startLevel(parseLevelFromHash());
  }

  document.addEventListener('DOMContentLoaded', init);
})();

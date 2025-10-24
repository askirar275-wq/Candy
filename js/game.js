// js/game.js
(() => {
  /* CONFIG */
  const IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];
  // tile representation:
  // number 0..N-1 => normal candy index
  // object {type:'striped',dir:'h'|'v',base:idx} => striped candy
  const COLS = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols')) || 7;
  const ROWS = 8;
  const START_MOVES = 30;
  const SCORE_PER_TILE = 50;

  /* STATE */
  let grid = []; // grid[r][c] = tile
  let selected = null; // {r,c,el}
  let score = 0;
  let moves = START_MOVES;
  let currentLevel = 1;

  /* DOM */
  const pageHome = document.getElementById('page-home');
  const pageMap = document.getElementById('page-map');
  const pagePlay = document.getElementById('page-play');
  const pageAbout = document.getElementById('page-about');

  const levelGridEl = document.getElementById('levelGrid');
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const movesBubble = document.getElementById('moves');
  const targetEl = document.getElementById('target') || document.querySelector('#target') || null;
  const starsEl = document.getElementById('stars');
  const levelTitleEl = document.getElementById('levelTitle');

  const btnRestart = document.getElementById('btnRestart');
  const btnShuffle = document.getElementById('btnShuffle');
  const btnShop = document.getElementById('btnShop');
  const dragClone = document.getElementById('dragClone');

  /* UTILITIES */
  function isStriped(tile){
    return tile && typeof tile === 'object' && tile.type === 'striped';
  }
  function tileKey(tile){
    if(tile==null) return 'null';
    if(typeof tile === 'object') return `striped-${tile.base}-${tile.dir}`;
    return `norm-${tile}`;
  }

  /* ROUTER (hash) */
  function showPage(route){
    pageHome.classList.add('hidden');
    pageMap.classList.add('hidden');
    pagePlay.classList.add('hidden');
    pageAbout.classList.add('hidden');
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

  /* GRID SETUP */
  function randTileIndex(){ return Math.floor(Math.random()*IMAGES.length); }

  // create tile ensuring no immediate 3-match in initial fill
  function buildInitialGrid(){
    grid = [];
    for(let r=0;r<ROWS;r++){
      grid[r]=[];
      for(let c=0;c<COLS;c++){
        let t;
        do { t = randTileIndex(); }
        while (wouldCreateMatchAt(r,c,t));
        grid[r][c] = t;
      }
    }
  }

  function wouldCreateMatchAt(r,c,val){
    // check left
    if(c>=2 && grid[r][c-1]===val && grid[r][c-2]===val) return true;
    // check up
    if(r>=2 && grid[r-1] && grid[r-2] && grid[r-1][c]===val && grid[r-2][c]===val) return true;
    return false;
  }

  /* RENDER */
  function renderGrid(){
    gridEl.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const tile = grid[r][c];
        const img = document.createElement('img');
        if(isStriped(tile)){
          img.src = IMAGES[tile.base];
          img.alt = 'striped';
          // overlay stripe visual (simple rotate)
          img.style.transform = tile.dir==='h' ? 'rotate(90deg)' : 'none';
        } else {
          if(tile==null) img.src='';
          else img.src = IMAGES[tile];
        }
        cell.appendChild(img);
        // listeners
        addPointerHandlers(cell);
        gridEl.appendChild(cell);
      }
    }
  }

  function updateHUD(){
    document.getElementById('score').textContent = score;
    // moves element in stats-row: find the stat with "Moves:" text
    Array.from(document.querySelectorAll('.stat')).forEach(s => {
      if(s.textContent.includes('Moves')) s.innerHTML = `Moves: <span>${moves}</span>`;
    });
    // target
    if(targetEl) targetEl.textContent = 600 * currentLevel;
    // stars simple
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

  /* SELECTION & SWAP (smoother drag) */
  let dragging = false;
  let dragSource = null;

  function addPointerHandlers(cell){
    // mouse and touch unification
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
    // show clone
    const tile = grid[r][c];
    if(tile==null) return;
    dragClone.innerHTML = '';
    const img = document.createElement('img');
    img.src = isStriped(tile) ? IMAGES[tile.base] : IMAGES[tile];
    dragClone.appendChild(img);
    dragClone.classList.remove('hidden');
    moveCloneTo(e.clientX, e.clientY, 1.1);
    cell.classList.add('selected');
    // capture pointer for consistency
    cell.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e){
    if(!dragging) return;
    moveCloneTo(e.clientX, e.clientY, 1.0);
    // highlight potential target under pointer
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if(!under) return;
    const targetCell = under.closest('.cell');
    // visual selection handled on pointerup
  }

  function onPointerUp(e){
    if(!dragging) return;
    const cell = e.currentTarget;
    const src = dragSource;
    // find target under pointer
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
    try { cell.releasePointerCapture(e.pointerId); } catch(_){}
  }
  function onPointerCancel(){ dragClone.classList.add('hidden'); dragging=false; clearSelectionUI(); }

  function moveCloneTo(x,y,scale=1){
    dragClone.style.left = x + 'px';
    dragClone.style.top = y + 'px';
    dragClone.style.transform = `translate(-50%,-50%) scale(${scale})`;
  }

  function clearSelectionUI(){
    Array.from(gridEl.querySelectorAll('.cell.selected')).forEach(el=>el.classList.remove('selected'));
    selected = null;
  }

  // swap with adjacency checks and special tile activation
  function handleSwap(r1,c1,r2,c2){
    // same tile => deselect
    if(r1===r2 && c1===c2){ clearSelectionUI(); return; }
    // adjacency
    if(Math.abs(r1-r2)+Math.abs(c1-c2) !== 1){
      clearSelectionUI();
      return;
    }
    // perform swap in state
    swapTiles(r1,c1,r2,c2);
    // animate optimistic by re-render (we do quick visual)
    renderGrid();
    moves = Math.max(0, moves-1);
    updateHUD();

    // check matches
    const matches = findAllMatches();
    if(matches.length){
      // handle possible 4-match promotion BEFORE removal
      promoteSpecialsFromSwap(r1,c1,r2,c2);
      // resolve full cascade
      resolveMatchesCascade();
    } else {
      // invalid swap -> swap back with shake
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

  function cellEl(r,c){
    return gridEl.children[r*COLS + c];
  }

  /* MATCH DETECTION & HANDLING including 4-match -> striped */
  function findAllMatches(){
    const mark = Array.from({length:ROWS}, ()=>Array(COLS).fill(false));
    // horizontal runs
    for(let r=0;r<ROWS;r++){
      let start=0;
      for(let c=1;c<=COLS;c++){
        if(c<COLS && sameTileValue(grid[r][c], grid[r][c-1])) continue;
        const len = c-start;
        if(len>=3){
          for(let k=start;k<c;k++) mark[r][k]=true;
        }
        start=c;
      }
    }
    // vertical runs
    for(let c=0;c<COLS;c++){
      let start=0;
      for(let r=1;r<=ROWS;r++){
        if(r<ROWS && sameTileValue(grid[r][c], grid[r-1][c])) continue;
        const len = r-start;
        if(len>=3){
          for(let k=start;k<r;k++) mark[k][c]=true;
        }
        start=r;
      }
    }
    // collect
    const matches=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(mark[r][c]) matches.push({r,c});
    return matches;
  }

  function sameTileValue(a,b){
    if(a==null || b==null) return false;
    if(isStriped(a) && isStriped(b)) return a.base===b.base;
    if(isStriped(a) && typeof b === 'number') return a.base===b;
    if(isStriped(b) && typeof a === 'number') return b.base===a;
    return typeof a==='number' && typeof b==='number' && a===b;
  }

  // find 4-length runs and create striped candy at the swap target position
  function promoteSpecialsFromSwap(r1,c1,r2,c2){
    // check horizontal and vertical at both swapped positions
    [ {r:r1,c:c1}, {r:r2,c:c2} ].forEach(p => {
      const hRun = runLengthAt(p.r,p.c,'h');
      const vRun = runLengthAt(p.r,p.c,'v');
      if(hRun.len >= 4){
        // create horizontal striped at p
        grid[p.r][p.c] = {type:'striped', dir:'h', base: hRun.base};
      } else if(vRun.len >= 4){
        grid[p.r][p.c] = {type:'striped', dir:'v', base: vRun.base};
      }
      // 5-match rainbow not implemented here (could be added)
    });
  }

  function runLengthAt(r,c,dir){
    const base = (isStriped(grid[r][c])? grid[r][c].base : grid[r][c]);
    let len=1;
    if(dir==='h'){
      // left
      for(let cc=c-1;cc>=0;cc--){ if(sameTileValue(grid[r][cc], base)) len++; else break; }
      for(let cc=c+1;cc<COLS;cc++){ if(sameTileValue(grid[r][cc], base)) len++; else break; }
    } else {
      for(let rr=r-1;rr>=0;rr--){ if(sameTileValue(grid[rr][c], base)) len++; else break; }
      for(let rr=r+1;rr<ROWS;rr++){ if(sameTileValue(grid[rr][c], base)) len++; else break; }
    }
    return {len, base};
  }

  // cascade resolve: find matches, remove, handle striped explosions, gravity, repeat
  function resolveMatchesCascade(){
    function step(){
      const matches = findAllMatches();
      if(matches.length===0){ checkGameOver(); return; }

      // group matched coords for quick lookup
      const matchedMap = new Set(matches.map(m=> `${m.r},${m.c}` ));

      // detect any striped tiles within matched set that should trigger extra clears
      const extraToClear = [];
      matches.forEach(({r,c})=>{
        const t = grid[r][c];
        if(isStriped(t)){
          // explode whole row/col depending on dir
          if(t.dir==='h'){
            for(let cc=0; cc<COLS; cc++) extraToClear.push({r,c:cc});
          } else {
            for(let rr=0; rr<ROWS; rr++) extraToClear.push({r:rr,c});
          }
        }
      });

      // mark all to null (remove)
      const toRemoveSet = new Set();
      matches.forEach(m => toRemoveSet.add(`${m.r},${m.c}`));
      extraToClear.forEach(p => toRemoveSet.add(`${p.r},${p.c}`));

      // apply removal (set null) and compute score
      const removedCount = toRemoveSet.size;
      toRemoveSet.forEach(k => {
        const [r,c] = k.split(',').map(Number);
        grid[r][c] = null;
      });

      score += removedCount * SCORE_PER_TILE;
      updateHUD();
      renderGrid();

      // after small delay, gravity & refill and next step
      setTimeout(()=> {
        applyGravity();
        renderGrid();
        setTimeout(step, 200);
      }, 160);
    }
    step();
  }

  /* gravity & refill */
  function applyGravity(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c] !== null){
          grid[write][c] = grid[r][c];
          write--;
        }
      }
      for(let r=write;r>=0;r--){
        grid[r][c] = randTileOrEmpty();
      }
    }
  }
  function randTileOrEmpty(){
    // return normal tile index
    return randTileIndex();
  }
  function randTileIndex(){ return Math.floor(Math.random()*IMAGES.length); }

  /* invalid swap animation */
  function animateInvalidSwap(r1,c1,r2,c2){
    return new Promise(res=>{
      const elA = cellEl(r1,c1), elB = cellEl(r2,c2);
      if(elA) elA.classList.add('invalid');
      if(elB) elB.classList.add('invalid');
      setTimeout(()=> { if(elA) elA.classList.remove('invalid'); if(elB) elB.classList.remove('invalid'); res(); }, 300);
    });
  }

  /* helper to get cell element */
  function cellEl(r,c){ return gridEl.children[r*COLS + c]; }

  /* gameover check */
  function checkGameOver(){
    if(moves<=0){
      setTimeout(()=> { alert(`Moves ख़त्म — Game Over!\nScore: ${score}`); }, 200);
    }
  }

  /* shuffle */
  function shuffleBoard(){
    // flatten indexes then refill with new random, avoiding instant matches ideally (quick approach)
    const flat = [];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) flat.push(randTileIndex());
    // place back
    let idx=0;
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let t=flat[idx++];
        let tries=0;
        while(wouldCreateMatchAt(r,c,t) && tries<8){ t=randTileIndex(); tries++; }
        grid[r][c]=t;
      }
    }
    renderGrid();
  }

  /* EVENTS */
  btnRestart.addEventListener('click', ()=> {
    score=0; moves=START_MOVES;
    buildInitialGrid();
    renderGrid();
    updateHUD();
  });
  btnShuffle.addEventListener('click', ()=> { shuffleBoard(); });
  btnShop.addEventListener('click', ()=> { alert('Shop placeholder'); });

  /* map page generation */
  function buildMap(){
    levelGridEl.innerHTML = '';
    for(let i=1;i<=9;i++){
      const card = document.createElement('div');
      card.className = 'level-card';
      card.innerHTML = `<strong>Level ${i}</strong><div style="margin-top:8px;"><a class="btn outline" href="#/play?level=${i}">Play</a></div>`;
      levelGridEl.appendChild(card);
    }
  }

  /* init and router handling for query param level */
  function parseLevelFromHash(){
    const h = location.hash || '#/home';
    const m = h.match(/level=(\d+)/);
    if(m) return Math.max(1, Math.min(20, parseInt(m[1],10)));
    // if hash is /play?level=2 style
    const q = h.split('?')[1];
    if(q){
      const params = new URLSearchParams(q);
      const lv = params.get('level');
      if(lv) return parseInt(lv,10);
    }
    return 1;
  }

  window.addEventListener('hashchange', ()=>{
    const route = location.hash.replace('#','');
    showPage(route);
    if(route.startsWith('/play')){
      currentLevel = parseLevelFromHash();
      startLevel(currentLevel);
    }
  });

  function showPage(route){
    pageHome.classList.add('hidden');
    pageMap.classList.add('hidden');
    pagePlay.classList.add('hidden');
    pageAbout.classList.add('hidden');
    if(route.startsWith('/map')) pageMap.classList.remove('hidden');
    else if(route.startsWith('/play')) pagePlay.classList.remove('hidden');
    else if(route.startsWith('/about')) pageAbout.classList.remove('hidden');
    else pageHome.classList.remove('hidden');
  }

  function startLevel(level){
    currentLevel = level || 1;
    score = 0;
    moves = START_MOVES;
    buildInitialGrid();
    renderGrid();
    updateHUD();
  }

  /* startup */
  function init(){
    // set CSS var for cols (in case)
    document.documentElement.style.setProperty('--cols', COLS);
    buildMap();
    // initial page
    const initialHash = location.hash || '#/home';
    showPage(initialHash.replace('#',''));
    if(initialHash.startsWith('#/play')) startLevel(parseLevelFromHash());
  }

  document.addEventListener('DOMContentLoaded', init);

})();

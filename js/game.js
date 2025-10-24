// js/game.js
// एक छोटा but functional match-3 engine with pointer drag/swap, gravity & refill.
// Global object for external calls.
window.Game = (function(){
  /* --- configuration --- */
  const C = {
    colsDefault: 6,
    rowsDefault: 7,
    candyCount: 6, // images candy1..candy6
    matchMin: 3,
    baseScore: 100
  };

  // state
  let rows = C.rowsDefault, cols = C.colsDefault;
  let grid = []; // array length rows*cols, values 1..candyCount
  let score = 0, moves = 30, target = 600;
  let level = 1;
  let inAction = false; // block during animations/processing
  const gameGridEl = () => document.getElementById('gameGrid');
  const scoreEl = () => document.getElementById('score');
  const movesEl = () => document.getElementById('moves');
  const targetEl = () => document.getElementById('target');
  const timerEl = () => document.getElementById('timer');
  const levelTitleEl = () => document.getElementById('levelTitle');

  /* --- Responsive grid vars setup (user provided) --- */
  (function setupResponsiveGrid(){
    const gridEl = document.getElementById('gameGrid');
    if(!gridEl) return;

    function computeGridVars(){
      const minCell = 48, maxCell = 72, gap = 12, minCols = 5, maxCols = 8;
      const parent = gridEl.parentElement || document.body;
      const avail = Math.min(parent.getBoundingClientRect().width || window.innerWidth - 32, window.innerWidth - 32);
      let chosen = minCols; let chosenSize = minCell;
      for(let c=maxCols;c>=minCols;c--){
        const requiredMin = c*minCell + (c-1)*gap;
        if(requiredMin <= avail){
          const size = Math.min(maxCell, Math.floor((avail - (c-1)*gap)/c));
          chosen = c; chosenSize = Math.max(minCell, size); break;
        }
      }
      document.documentElement.style.setProperty('--cols', chosen);
      document.documentElement.style.setProperty('--cell-size', chosenSize + 'px');
      document.documentElement.style.setProperty('--gap', gap + 'px');
      cols = chosen;
    }
    computeGridVars();
    let t;
    window.addEventListener('resize', ()=>{ clearTimeout(t); t = setTimeout(computeGridVars, 120); });
    window.addEventListener('load', computeGridVars);
  })();

  /* --- helper --- */
  function idx(r,c){ return r*cols + c; }
  function rc(i){ return [Math.floor(i/cols), i%cols]; }

  function randCandy(){ return Math.floor(Math.random()*C.candyCount)+1; }

  /* --- grid creation --- */
  function createGrid(){
    grid = new Array(rows*cols);
    for(let i=0;i<grid.length;i++) grid[i] = randCandy();
    // ensure no initial matches (optional: run clear until stable)
    removeAllMatches(); // removes matches and refills until stable
  }

  /* --- render --- */
  function renderGrid(){
    const el = gameGridEl();
    if(!el) return;
    el.innerHTML = '';
    el.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size,64px))`;
    grid.forEach((val,i)=>{
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      const img = document.createElement('img');
      img.src = `images/candy${val}.png`;
      img.alt = 'candy';
      cell.appendChild(img);
      el.appendChild(cell);
    });
    attachPointerHandlers();
  }

  /* --- Game mechanics: match check, remove, gravity, refill --- */
  function findMatches(){
    const matches = [];
    // horizontal
    for(let r=0;r<rows;r++){
      let runVal = null, runStart = 0, runLen = 0;
      for(let c=0;c<cols;c++){
        const v = grid[idx(r,c)];
        if(v === runVal){ runLen++; }
        else {
          if(runLen >= C.matchMin) { matches.push({start: idx(r,runStart), len: runLen, dir:'h'}); }
          runVal = v; runStart = c; runLen = 1;
        }
      }
      if(runLen >= C.matchMin) matches.push({start: idx(r,runStart), len: runLen, dir:'h'});
    }
    // vertical
    for(let c=0;c<cols;c++){
      let runVal=null, runStart=0, runLen=0;
      for(let r=0;r<rows;r++){
        const v = grid[idx(r,c)];
        if(v === runVal){ runLen++; }
        else {
          if(runLen >= C.matchMin) { matches.push({start: idx(runStart,c), len: runLen, dir:'v'}); }
          runVal = v; runStart = r; runLen = 1;
        }
      }
      if(runLen >= C.matchMin) matches.push({start: idx(runStart,c), len: runLen, dir:'v'});
    }
    return matches;
  }

  function removeAllMatches(){
    // naive: keep finding & removing until none (useful for initial grid)
    let totalRemoved = 0;
    while(true){
      const m = findMatches();
      if(!m.length) break;
      // mark removals
      const removeSet = new Set();
      m.forEach(seq=>{
        const [sr,sc] = rc(seq.start);
        for(let k=0;k<seq.len;k++){
          const r = seq.dir==='h' ? sr : sr + k;
          const c = seq.dir==='h' ? sc + k : sc;
          removeSet.add(idx(r,c));
        }
      });
      // remove (set 0)
      removeSet.forEach(i=> grid[i] = 0);
      totalRemoved += removeSet.size;
      // collapse & refill
      collapseAndRefill();
    }
    return totalRemoved;
  }

  function collapseAndRefill(){
    for(let c=0;c<cols;c++){
      const colVals = [];
      for(let r=rows-1;r>=0;r--){
        const v = grid[idx(r,c)];
        if(v && v>0) colVals.push(v);
      }
      // fill from bottom
      let k=0;
      for(let r=rows-1;r>=0;r--){
        grid[idx(r,c)] = (k < colVals.length) ? colVals[k++] : randCandy();
      }
    }
  }

  /* --- swap logic --- */
  function areAdjacent(a,b){
    const [ar,ac] = rc(a), [br,bc] = rc(b);
    return (Math.abs(ar-br) + Math.abs(ac-bc)) === 1;
  }

  async function trySwap(i,j){
    if(inAction) return false;
    if(!areAdjacent(i,j)) return false;
    inAction = true;
    // temporary swap
    const tmp = grid[i]; grid[i] = grid[j]; grid[j] = tmp;
    renderGrid(); await smallDelay(140);
    const matches = findMatches();
    if(matches.length === 0){
      // invalid swap => swap back
      const tmp2 = grid[i]; grid[i] = grid[j]; grid[j] = tmp2;
      renderGrid(); await smallDelay(140);
      inAction = false;
      return false;
    }
    // valid: remove chain until stable
    let totalGain = 0;
    while(true){
      const seq = findMatches();
      if(!seq.length) break;
      // collect removal indices
      const removeSet = new Set();
      seq.forEach(s=>{
        const [sr,sc] = rc(s.start);
        for(let k=0;k<s.len;k++){
          const r = s.dir==='h' ? sr : sr + k;
          const c = s.dir==='h' ? sc + k : sc;
          removeSet.add(idx(r,c));
        }
      });
      // scoring: base * count (combo enhancement possible)
      const gain = removeSet.size * C.baseScore;
      score += gain; totalGain += gain;
      // set zero for removed
      removeSet.forEach(i=> grid[i] = 0);
      renderGrid();
      await smallDelay(220);
      collapseAndRefill();
      renderGrid();
      await smallDelay(220);
    }
    moves = Math.max(0, moves - 1);
    updateHUD();
    inAction = false;
    // check win/lose
    checkEndConditions();
    return true;
  }

  /* small delay helper */
  function smallDelay(ms){ return new Promise(res=> setTimeout(res, ms)); }

  /* --- input: pointer drag / swipe --- */
  let pointerState = {
    dragging: false,
    startIndex: null,
    currentClone: null
  };

  function attachPointerHandlers(){
    const gridEl = gameGridEl();
    if(!gridEl) return;
    // remove existing handlers to avoid duplicates
    gridEl.querySelectorAll('.cell').forEach(cell=>{
      cell.onpointerdown = onPointerDown;
      cell.onpointerup = onPointerUp;
      cell.onpointercancel = onPointerCancel;
      cell.ontouchstart = null; // delegate to pointer
    });
    // prevent native touch scroll on grid container while interacting
    gridEl.onpointermove = onPointerMove;
  }

  function onPointerDown(e){
    if(inAction) return;
    const cell = e.currentTarget;
    const idx0 = parseInt(cell.dataset.index,10);
    pointerState.dragging = true;
    pointerState.startIndex = idx0;
    cell.setPointerCapture(e.pointerId);
    // create clone for smooth drag
    const clone = cell.cloneNode(true);
    clone.classList.add('dragging-clone');
    document.body.appendChild(clone);
    pointerState.currentClone = clone;
    moveClone(clone, e.clientX, e.clientY);
  }
  function moveClone(clone, x, y){
    if(!clone) return;
    clone.style.left = x + 'px';
    clone.style.top = y + 'px';
  }
  function onPointerMove(e){
    if(!pointerState.dragging) return;
    moveClone(pointerState.currentClone, e.clientX, e.clientY);
  }
  function onPointerUp(e){
    if(!pointerState.dragging) return;
    const start = pointerState.startIndex;
    // compute target cell from pointer location
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const targetCell = elem && elem.closest && elem.closest('.cell');
    let targetIndex = null;
    if(targetCell) targetIndex = parseInt(targetCell.dataset.index,10);
    // cleanup clone
    if(pointerState.currentClone){ pointerState.currentClone.remove(); pointerState.currentClone = null; }
    pointerState.dragging = false;
    pointerState.startIndex = null;
    if(targetIndex !== null && targetIndex !== undefined){
      // try swap
      trySwap(start, targetIndex);
    }
  }
  function onPointerCancel(){
    if(pointerState.currentClone) pointerState.currentClone.remove();
    pointerState.dragging=false;
    pointerState.startIndex=null;
  }

  /* --- HUD & controls --- */
  function updateHUD(){
    if(scoreEl()) scoreEl().textContent = score;
    if(movesEl()) movesEl().textContent = moves;
    if(targetEl()) targetEl().textContent = target;
  }

  function checkEndConditions(){
    if(score >= target){
      // level complete
      showEnd(true);
    } else if(moves <= 0){
      showEnd(false);
    }
  }

  function showEnd(win){
    const panel = document.getElementById('endPanel');
    const title = document.getElementById('endTitle');
    const info = document.getElementById('endInfo');
    title.textContent = win ? `Level ${level} Complete!` : `Game Over`;
    info.textContent = `Score: ${score}`;
    panel.classList.remove('hidden');
  }

  /* --- controls events --- */
  function attachUI(){
    document.getElementById('restartBtn').onclick = ()=> start(level);
    document.getElementById('shuffleBtn').onclick = ()=>{
      shuffleGrid();
    };
    document.getElementById('endBtn').onclick = ()=> {
      document.getElementById('endPanel').classList.remove('hidden');
      document.getElementById('endTitle').textContent = 'Ended';
      document.getElementById('endInfo').textContent = `Score: ${score}`;
    };
    document.getElementById('replayBtn').onclick = ()=> start(level);
    document.getElementById('nextBtn').onclick = ()=>{
      start(level+1);
      location.hash = '#play';
    };
    document.getElementById('resetProgress').onclick = ()=> { Store.clear(); alert('Progress reset'); renderLevelMap(); };
    document.getElementById('muteSound').onchange = function(){ Sound.setMuted(this.checked); };
  }

  function shuffleGrid(){
    if(inAction) return;
    // simple shuffle of values
    for(let i=grid.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [grid[i],grid[j]] = [grid[j],grid[i]];
    }
    renderGrid();
  }

  /* --- Level map rendering --- */
  function renderLevelMap(){
    const lg = document.getElementById('levelGrid');
    if(!lg) return;
    lg.innerHTML = '';
    const unlocked = Store.load().unlocked || 1;
    for(let i=1;i<=9;i++){
      const card = document.createElement('div');
      card.className = 'level-card';
      const title = document.createElement('div');
      title.textContent = `Level ${i}`;
      const btn = document.createElement('a');
      btn.href = `#play?level=${i}`;
      btn.className = 'btn';
      btn.textContent = (i<=unlocked) ? 'Play' : 'Locked';
      card.appendChild(title);
      card.appendChild(btn);
      lg.appendChild(card);
    }
  }

  /* --- start/entry points --- */
  function start(lvl){
    level = Number(lvl) || 1;
    // adjust difficulty (example)
    rows = 7; cols = Math.max(5, Math.min(8, Math.floor(document.documentElement.style.getPropertyValue('--cols') || 6)));
    target = 600 * level;
    moves = 30 - Math.min(12, Math.floor(level/2));
    score = 0;
    // create grid and render
    createGrid();
    renderGrid();
    updateHUD();
    document.getElementById('endPanel') && document.getElementById('endPanel').classList.add('hidden');
    // update level title
    if(levelTitleEl()) levelTitleEl().textContent = `Level ${level}`;
    // attach UI controls
    attachUI();
  }

  // helper: start from hash if query param present
  function startFromHash(){
    const qs = location.hash.split('?')[1] || '';
    const p = new URLSearchParams(qs);
    const lvl = p.get('level') || 1;
    start(lvl);
  }

  /* init */
  window.addEventListener('load', ()=>{
    renderLevelMap();
    // if hash is play run startFromHash
    if(location.hash && location.hash.startsWith('#play')) startFromHash();
  });

  return {
    start, startFromHash, renderLevelMap
  };
})();

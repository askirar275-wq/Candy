/* js/game-core.js — Smooth animated core
   Author: you + ChatGPT
*/
window.Game = (function () {
  const CANDY_TYPES = 6;          // images/candy1..candy6.png
  const ROWS = 8, COLS = 8;
  const GAP = 8;                  // px gap between tiles (same as CSS grid gap)
  const TILE = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size')) || 60;

  // DOM refs (assigned in start)
  let gridEl, scoreEl, movesEl, targetEl, titleEl, starsEl, timerEl;

  // state
  let grid = [];                  // grid[r][c] = {type, id}
  let score = 0, moves = 30, target = 600;
  let busy = false;               // lock while animating
  let currentLevel = 1;
  let uid = 1;                    // unique id for tiles to track DOM

  // helpers
  const rng = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;

  function imgSrcFor(type){
    const n = ((type-1) % CANDY_TYPES) + 1;
    return `images/candy${n}.png`;
  }

  // Create/ensure tile element for a given cell
  function ensureTileEl(tile){
    let el = document.getElementById(`t-${tile.id}`);
    if(!el){
      el = document.createElement('div');
      el.className = 'tile';
      el.id = `t-${tile.id}`;
      const img = document.createElement('img');
      img.src = imgSrcFor(tile.type);
      el.appendChild(img);
      gridEl.appendChild(el);
    }else{
      // update image if type changed
      const img = el.querySelector('img');
      const want = imgSrcFor(tile.type);
      if(img.src.indexOf(want) === -1) img.src = want;
    }
    return el;
  }

  // Place tile element at row/col (in pixels) without animation jump
  function placeTile(tile, r, c){
    const el = ensureTileEl(tile);
    const x = c * (TILE() + GAP);
    const y = r * (TILE() + GAP);
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  // Animate a tile to row/col
  function moveTile(tile, r, c, cls){
    const el = ensureTileEl(tile);
    if(cls) el.classList.add(cls);
    const x = c * (TILE() + GAP);
    const y = r * (TILE() + GAP);
    return animateTo(el, x, y).finally(()=>{ if(cls) el.classList.remove(cls); });
  }

  function animateTo(el, x, y){
    return new Promise(res=>{
      const done = ()=>{ el.removeEventListener('transitionend', onEnd); res(); };
      let ended = false;
      function onEnd(e){
        if(ended) return;
        if(e.propertyName !== 'transform') return;
        ended = true;
        setTimeout(done, 0);
      }
      el.addEventListener('transitionend', onEnd, {once:true});
      // force reflow to ensure transition fires
      el.getBoundingClientRect();
      el.style.transform = `translate(${x}px, ${y}px)`;
      // fallback
      setTimeout(()=>{ if(!ended) done(); }, 400);
    });
  }

  function dimToPixels(nCols, nRows){
    // set container size by JS (so background fits)
    const width = nCols * TILE() + (nCols-1)*GAP;
    const height = nRows * TILE() + (nRows-1)*GAP;
    gridEl.style.width = width + 'px';
    gridEl.style.height = height + 'px';
  }

  // init grid without immediate matches
  function newRandomGrid(){
    grid = Array.from({length: ROWS}, ()=> Array.from({length: COLS}, ()=> ({type: rng(1,CANDY_TYPES), id: uid++})));
    // remove instant matches by reroll
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        while(createsMatch(r,c,grid[r][c].type)){
          grid[r][c].type = rng(1, CANDY_TYPES);
        }
      }
    }
  }

  function createsMatch(r,c,type){
    // check left two or up two same type
    if(c>=2 && grid[r][c-1]?.type===type && grid[r][c-2]?.type===type) return true;
    if(r>=2 && grid[r-1]?.[c]?.type===type && grid[r-2]?.[c]?.type===type) return true;
    return false;
  }

  // render all tiles to correct pixel positions
  function renderAll(){
    dimToPixels(COLS, ROWS);
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        placeTile(grid[r][c], r, c);
      }
    }
  }

  // find all 3+ matches; return set of {r,c}
  function findMatches(){
    const kill = new Set();
    // rows
    for(let r=0;r<ROWS;r++){
      let run=1;
      for(let c=1;c<=COLS;c++){
        const a = grid[r][c-1]?.type, b = grid[r][c]?.type;
        if(c<COLS && a===b) run++;
        else{
          if(run>=3){
            for(let k=c-run;k<c;k++) kill.add(`${r},${k}`);
          }
          run=1;
        }
      }
    }
    // cols
    for(let c=0;c<COLS;c++){
      let run=1;
      for(let r=1;r<=ROWS;r++){
        const a = grid[r-1]?.[c]?.type, b = grid[r]?.[c]?.type;
        if(r<ROWS && a===b) run++;
        else{
          if(run>=3){
            for(let k=r-run;k<r;k++) kill.add(`${k},${c}`);
          }
          run=1;
        }
      }
    }
    return kill;
  }

  async function popMatches(cells){
    // pop class + score
    let gained = 0;
    cells.forEach(key=>{
      const [r,c] = key.split(',').map(Number);
      const tile = grid[r][c];
      const el = ensureTileEl(tile);
      el.classList.add('pop');
      gained += 50;
    });
    score += gained;
    updateHUD();
    await wait(ms('--pop-ms', 160) + 40);
    // remove from DOM after pop
    cells.forEach(key=>{
      const [r,c] = key.split(',').map(Number);
      const tile = grid[r][c];
      const el = document.getElementById(`t-${tile.id}`);
      el && el.remove();
      // mark hole
      grid[r][c] = null;
    });
  }

  function ms(varName, fallback){
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if(v.endsWith('ms')) return parseInt(v);
    if(v.endsWith('s')) return Math.round(parseFloat(v)*1000);
    return fallback;
  }
  const wait = (t)=> new Promise(r=> setTimeout(r,t));

  async function collapseAndRefill(){
    // for each column, let tiles fall
    const falls = [];
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        const tile = grid[r][c];
        if(tile){
          if(write!==r){
            grid[write][c] = tile;
            grid[r][c] = null;
            falls.push(moveTile(tile, write, c, 'falling'));
          }
          write--;
        }
      }
      // refill new tiles on top
      for(let r=write; r>=0; r--){
        const tile = {type: rng(1,CANDY_TYPES), id: uid++};
        grid[r][c] = tile;
        const el = ensureTileEl(tile);
        // start above and fall into place
        const startY = (r - (write+1)) * (TILE()+GAP) - (TILE()+GAP)*(write-r+1);
        el.style.transform = `translate(${c*(TILE()+GAP)}px, ${startY}px)`;
        // next tick, animate to correct
        falls.push(moveTile(tile, r, c, 'falling'));
      }
    }
    await Promise.all(falls);
  }

  async function resolveBoard(){
    // loop: find matches, pop, fall+refill, repeat until stable
    let loop = 0;
    while(true){
      const matches = findMatches();
      if(matches.size===0) break;
      await popMatches(matches);
      await collapseAndRefill();
      loop++;
      if(loop>20) break; // safety
    }
  }

  async function attemptSwap(r1,c1,r2,c2){
    if(busy) return;
    // only neighbors
    if(Math.abs(r1-r2)+Math.abs(c1-c2)!==1) return;
    busy = true;

    const a = grid[r1][c1], b = grid[r2][c2];
    // animate both to each other positions
    await Promise.all([
      moveTile(a, r2, c2, 'swapping'),
      moveTile(b, r1, c1, 'swapping')
    ]);
    // swap in data
    grid[r1][c1]=b; grid[r2][c2]=a;

    // check if created match
    const matches = findMatches();
    if(matches.size===0){
      // swap back (invalid move)
      await Promise.all([
        moveTile(a, r1, c1, 'swapping'),
        moveTile(b, r2, c2, 'swapping')
      ]);
      grid[r1][c1]=a; grid[r2][c2]=b;
      busy = false;
      return;
    }

    // valid: consume move, resolve
    moves = Math.max(0, moves-1);
    updateHUD();
    await resolveBoard();
    busy = false;
  }

  // --------- INPUT: swipe / drag ----------
  let drag = null; // {r,c, startX, startY}
  function cellFromPoint(x,y){
    const rect = gridEl.getBoundingClientRect();
    const gx = x - rect.left;
    const gy = y - rect.top;
    const step = TILE() + GAP;
    const c = Math.floor(gx / step);
    const r = Math.floor(gy / step);
    if(r<0||r>=ROWS||c<0||c>=COLS) return null;
    return {r,c};
  }
  function onDown(e){
    if(busy) return;
    const p = pointer(e);
    const cell = cellFromPoint(p.x,p.y);
    if(!cell) return;
    drag = { ...cell, x:p.x, y:p.y };
  }
  function onMove(e){
    if(!drag) return;
    // we don't show draggable clone now (tiles animate when swapping)
  }
  async function onUp(e){
    if(!drag) return;
    const p = pointer(e);
    const dx = p.x - drag.x;
    const dy = p.y - drag.y;
    const TH = Math.max(16, TILE()*0.25);
    let r2 = drag.r, c2 = drag.c;
    if(Math.abs(dx) > Math.abs(dy)){
      if(dx > TH) c2++;
      else if(dx < -TH) c2--;
    }else{
      if(dy > TH) r2++;
      else if(dy < -TH) r2--;
    }
    const r1 = drag.r, c1 = drag.c;
    drag = null;

    if(r1===r2 && c1===c2) return; // no move
    if(r2<0||r2>=ROWS||c2<0||c2>=COLS) return;
    await attemptSwap(r1,c1,r2,c2);
  }
  function pointer(e){
    if(e.touches && e.touches[0]) return {x:e.touches[0].clientX, y:e.touches[0].clientY};
    return {x:e.clientX, y:e.clientY};
  }

  // --------- HUD ----------
  function updateHUD(){
    scoreEl.textContent = score;
    movesEl.textContent = moves;
    targetEl.textContent = target;
    titleEl.textContent = `Level ${currentLevel}`;
    // stars (simple thresholds)
    const s = (score>=target*1.5)?3:(score>=target*1.2)?2:(score>=target)?1:0;
    starsEl.textContent = (['','★ ☆ ☆','★ ★ ☆','★ ★ ★'])[s];
  }

  // --------- PUBLIC START ----------
  async function start(level=1){
    // DOM refs (from index.html)
    gridEl   = document.getElementById('gameGrid');
    scoreEl  = document.getElementById('score');
    movesEl  = document.getElementById('moves');
    targetEl = document.getElementById('target');
    timerEl  = document.getElementById('timer'); // (unused yet)
    titleEl  = document.getElementById('levelTitle');
    starsEl  = document.getElementById('stars');

    currentLevel = level;
    score = 0;
    moves = 30;
    target = 600 + (level-1)*100;

    // clear old tiles
    gridEl.innerHTML = '';
    newRandomGrid();
    renderAll();
    updateHUD();

    // listeners
    gridEl.addEventListener('pointerdown', onDown);
    gridEl.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // buttons
    document.getElementById('btnRestart')?.addEventListener('click', ()=> start(currentLevel));
    document.getElementById('btnEnd')?.addEventListener('click', ()=> location.hash='#map');
    document.getElementById('btnReplay')?.addEventListener('click', ()=> { hideComplete(); start(currentLevel); });
    document.getElementById('btnNext')?.addEventListener('click', ()=> { hideComplete(); start(currentLevel+1); });

    // check complete on every resolve loop; here simple watcher
    const checkInterval = setInterval(()=>{
      if(moves===0){
        // if score >= target -> show complete else just map
        if(score >= target) showComplete();
        else location.hash = '#map';
        clearInterval(checkInterval);
      }
    }, 300);
  }

  function showComplete(){
    const box = document.getElementById('levelComplete');
    document.getElementById('completeTitle').textContent = `Level ${currentLevel} Complete!`;
    document.getElementById('completeScore').textContent = score;
    box.classList.remove('hidden');
  }
  function hideComplete(){
    document.getElementById('levelComplete').classList.add('hidden');
  }

  return { start };
})();

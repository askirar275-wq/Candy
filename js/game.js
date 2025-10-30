// js/game.js
// CandyGame engine (simple, mobile friendly)
// grid: cols x rows (6 x 8)
const CandyGame = (function(){
  // config
  const COLS = 6;
  const ROWS = 8;
  const TOTAL = COLS * ROWS;
  const CANDY_COUNT = 6; // use candy-1..candy-6 images
  const IMAGE_PREFIX = 'images/candy-'; // final: images/candy-1.png
  const IMAGE_SUFFIX = '.png';
  let boardEl = null;
  let scoreEl = null;
  let coinsEl = null;
  let levelNumEl = null;

  let grid = []; // array length TOTAL of numbers 1..CANDY_COUNT
  let cells = []; // DOM cell elements
  let isProcessing = false;
  let currentLevel = 1;

  // touch handling
  let startX = 0, startY = 0, startIndex = null, touchTimeout = null;

  // helpers
  function randCandy(){ return Math.floor(Math.random() * CANDY_COUNT) + 1; }

  function indexFromRC(r,c){ return r * COLS + c; }
  function rcFromIndex(i){ return [Math.floor(i / COLS), i % COLS]; }

  function createGrid() {
    grid = new Array(TOTAL).fill(0).map(()=> randCandy());
    // ensure no initial automatic matches — shuffle until no immediate 3-in-a-row
    while(existsMatchOnGrid()){
      // simple shuffle randomize a few spots
      for(let i=0;i<TOTAL;i++){
        if(Math.random() < 0.2) grid[i] = randCandy();
      }
    }
  }

  function existsMatchOnGrid(){
    // detect any 3+ inline in current grid
    const matches = findMatchesOnGrid(grid);
    return matches.length > 0;
  }

  function buildBoardDOM(){
    boardEl.innerHTML = '';
    cells = [];
    // container uses CSS grid within .board; create wrapper with grid
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    container.style.gap = '12px';
    container.style.padding = '12px';
    container.style.boxSizing = 'border-box';
    // calculate cell size relative to board width
    for(let r=0; r<ROWS; r++){
      for(let c=0; c<COLS; c++){
        const i = indexFromRC(r,c);
        const cell = document.createElement('div');
        cell.className = 'candy-cell';
        Object.assign(cell.style, {
          background:'#fff', borderRadius:'14px', display:'flex',
          alignItems:'center', justifyContent:'center', boxShadow:'0 8px 20px rgba(0,0,0,0.08)'
        });
        // inner img
        const img = document.createElement('img');
        img.draggable = false;
        img.style.width = '68%';
        img.style.height = '68%';
        img.style.objectFit = 'contain';
        img.setAttribute('data-index', i);
        cell.appendChild(img);
        // store
        cells[i] = { el: cell, img: img };
        // add pointer handlers for desktop clicks
        cell.addEventListener('mousedown', (ev)=> onPointerStart(ev, i));
        cell.addEventListener('touchstart', (ev)=> onPointerStart(ev, i), {passive:true});
        container.appendChild(cell);
      }
    }
    boardEl.appendChild(container);
    updateAllImages();
  }

  function updateAllImages(){
    for(let i=0;i<TOTAL;i++){
      const v = grid[i];
      const c = cells[i];
      if(!c) continue;
      c.img.src = IMAGE_PREFIX + v + IMAGE_SUFFIX;
      c.img.alt = 'candy';
    }
  }

  function setScore(s){
    scoreEl.textContent = s;
  }
  function getScore(){ return parseInt(scoreEl.textContent || '0',10); }
  function addScore(delta){
    const newS = getScore() + delta;
    setScore(newS);
  }

  function setCoins(n){
    coinsEl.textContent = n;
    const st = Storage.get('candy_state') || {};
    st.coins = n;
    Storage.set('candy_state', st);
    // sync shop coins too
    const shopCoins = document.getElementById('shop-coins');
    if(shopCoins) shopCoins.textContent = n;
  }
  function getCoins(){ return parseInt(coinsEl.textContent || '0', 10); }

  // pointer / swipe logic
  function onPointerStart(ev, index){
    if(isProcessing) return;
    ev.preventDefault();
    const p = ev.touches ? ev.touches[0] : ev;
    startX = p.clientX; startY = p.clientY; startIndex = index;
    // add move and end listeners on document
    function finish(e){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', finish);
      document.removeEventListener('touchend', finish);
      const p2 = (e.changedTouches ? e.changedTouches[0] : e);
      handleSwipeEnd(p2.clientX, p2.clientY, startIndex);
    }
    function onMove(e){
      // nothing here for now (optional visual)
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, {passive:true});
    document.addEventListener('mouseup', finish);
    document.addEventListener('touchend', finish);
  }

  function handleSwipeEnd(endX, endY, fromIndex){
    if(isProcessing) return;
    const dx = endX - startX;
    const dy = endY - startY;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    const threshold = 18; // minimal px to count
    if(absX < threshold && absY < threshold) {
      // click / tap (no swipe) - do nothing
      return;
    }
    let dir = null;
    if(absX > absY){
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }
    const [r,c] = rcFromIndex(fromIndex);
    let toR = r, toC = c;
    if(dir === 'left') toC = c - 1;
    if(dir === 'right') toC = c + 1;
    if(dir === 'up') toR = r - 1;
    if(dir === 'down') toR = r + 1;
    // bounds
    if(toR < 0 || toR >= ROWS || toC < 0 || toC >= COLS) return;
    const toIndex = indexFromRC(toR, toC);
    swapAndProcess(fromIndex, toIndex);
  }

  // swap values and check for matches
  function swapAndProcess(i1, i2){
    if(isProcessing) return;
    isProcessing = true;
    swapGrid(i1, i2);
    animateSwap(i1, i2);
    // after small delay, check matches
    setTimeout(()=> {
      const matches = findMatchesOnGrid(grid);
      if(matches.length > 0){
        resolveMatches(matches);
      } else {
        // swap back — illegal move
        swapGrid(i1, i2);
        animateSwap(i1, i2);
        isProcessing = false;
      }
    }, 220);
  }

  function swapGrid(i1,i2){
    const tmp = grid[i1]; grid[i1] = grid[i2]; grid[i2] = tmp;
    // update DOM imgs immediately for responsiveness
    if(cells[i1] && cells[i2]){
      const s1 = cells[i1].img.src;
      const s2 = cells[i2].img.src;
      // swap src attributes
      const t = cells[i1].img.src;
      cells[i1].img.src = cells[i2].img.src;
      cells[i2].img.src = t;
    } else updateAllImages();
  }

  function animateSwap(i1, i2){
    // small pop animation
    [i1,i2].forEach(i=>{
      const el = cells[i]?.el;
      if(!el) return;
      el.style.transition = 'transform 180ms ease';
      el.style.transform = 'scale(0.98)';
      setTimeout(()=>{ el.style.transform=''; }, 240);
    });
  }

  // findMatchesOnGrid returns array of match objects: {cells: [i,...]}
  function findMatchesOnGrid(g){
    const matches = [];
    const mark = new Array(g.length).fill(false);

    // horizontal
    for(let r=0;r<ROWS;r++){
      let runStart = 0;
      for(let c=1;c<=COLS;c++){
        const curIdx = indexFromRC(r,c);
        const prevIdx = indexFromRC(r,c-1);
        const same = (c < COLS) && (g[curIdx] === g[prevIdx]);
        if(!same){
          const runLen = c - runStart;
          if(runLen >= 3){
            const cellsIdx = [];
            for(let x=runStart; x< c; x++) cellsIdx.push(indexFromRC(r,x));
            matches.push({cells: cellsIdx.slice()});
          }
          runStart = c;
        }
      }
    }

    // vertical
    for(let c=0;c<COLS;c++){
      let runStart = 0;
      for(let r=1;r<=ROWS;r++){
        const curIdx = indexFromRC(r,c);
        const prevIdx = indexFromRC(r-1,c);
        const same = (r < ROWS) && (g[curIdx] === g[prevIdx]);
        if(!same){
          const runLen = r - runStart;
          if(runLen >= 3){
            const cellsIdx = [];
            for(let x=runStart; x< r; x++) cellsIdx.push(indexFromRC(x,c));
            matches.push({cells: cellsIdx.slice()});
          }
          runStart = r;
        }
      }
    }

    // merge overlapping matches (so same cell not removed twice)
    // produce unique list of indices per match group
    const uniqueMatches = [];
    const seen = new Set();
    for(const m of matches){
      const group = [...new Set(m.cells)];
      // sort
      group.sort((a,b)=>a-b);
      uniqueMatches.push({cells: group});
    }
    return uniqueMatches;
  }

  // remove matched cells, add score, gravity refill
  function resolveMatches(matchList){
    if(!matchList || matchList.length===0){
      isProcessing = false;
      return;
    }
    // collect all indices to remove
    const toRemoveSet = new Set();
    matchList.forEach(m=> m.cells.forEach(i=>toRemoveSet.add(i)));
    const toRemove = [...toRemoveSet].sort((a,b)=>a-b);
    // score: each candy 10
    addScore(toRemove.length * 10);

    // animate removal: fade
    toRemove.forEach(i=>{
      const img = cells[i].img;
      img.style.transition = 'opacity 220ms ease, transform 220ms';
      img.style.opacity = '0';
      img.style.transform = 'scale(0.4)';
    });

    setTimeout(()=> {
      // set removed cells to 0 (empty)
      toRemove.forEach(i=> grid[i] = 0);
      updateAllImages(); // images for 0 will be image '0' — but we want blank
      // clear img for zeroes
      toRemove.forEach(i=>{
        const img = cells[i].img;
        img.style.opacity = '';
        img.style.transform = '';
        img.src = ''; // blank so we can animate drop
      });

      // gravity (for each column)
      for(let c=0;c<COLS;c++){
        const column = [];
        for(let r=0;r<ROWS;r++){
          column.push(grid[indexFromRC(r,c)]);
        }
        // drop non-zero downwards
        const filtered = column.filter(x=>x!==0);
        const missing = ROWS - filtered.length;
        const newCol = new Array(missing).fill(0).concat(filtered);
        // write back
        for(let r=0;r<ROWS;r++){
          grid[indexFromRC(r,c)] = newCol[r];
        }
      }

      // fill top zeros with random candies
      for(let i=0;i<TOTAL;i++){
        if(grid[i] === 0) grid[i] = randCandy();
      }

      // update DOM with a little drop animation
      updateAllImages();
      // small bounce
      for(let i=0;i<TOTAL;i++){
        const el = cells[i].el;
        if(!el) continue;
        el.style.transition = 'transform 260ms';
        el.style.transform = 'translateY(-6px)';
        setTimeout(()=> el.style.transform = '', 260);
      }

      // after animation, check for new matches (chain reactions)
      setTimeout(()=> {
        const newMatches = findMatchesOnGrid(grid);
        if(newMatches.length > 0){
          resolveMatches(newMatches);
        } else {
          isProcessing = false;
        }
      }, 300);

    }, 260);
  }

  // restart
  function restart(){
    if(isProcessing) return;
    setScore(0);
    createGrid();
    updateAllImages();
  }

  // shuffle (randomize all)
  function shuffleBoard(){
    if(isProcessing) return;
    isProcessing = true;
    for(let i=0;i<TOTAL;i++){
      grid[i] = randCandy();
    }
    // prevent immediate matches
    while(existsMatchOnGrid()){
      for(let i=0;i<TOTAL;i++) if(Math.random()<0.25) grid[i] = randCandy();
    }
    updateAllImages();
    setTimeout(()=> isProcessing=false, 300);
  }

  // bomb demo (from shop)
  function triggerBomb(){
    if(isProcessing) return;
    // clear a random cell and neighbors
    const idx = Math.floor(Math.random() * TOTAL);
    const toClear = new Set([idx]);
    const [r,c] = rcFromIndex(idx);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    dirs.forEach(([dr,dc])=>{
      const rr = r+dr, cc = c+dc;
      if(rr>=0 && rr<ROWS && cc>=0 && cc<COLS) toClear.add(indexFromRC(rr,cc));
    });
    // remove them (simulate match)
    const matches = [{cells: [...toClear]}];
    resolveMatches(matches);
  }

  // initialize UI listeners
  function bindUI(){
    boardEl = document.getElementById('board');
    scoreEl = document.getElementById('score');
    coinsEl = document.getElementById('coins');
    levelNumEl = document.getElementById('level-num');
    // start button
    document.getElementById('btn-start')?.addEventListener('click', ()=>{
      startLevel(1);
      document.getElementById('home').classList.add('hidden');
      document.getElementById('map').classList.add('hidden');
      document.getElementById('game').classList.remove('hidden');
    });
    // restart & shuffle
    document.getElementById('btn-restart')?.addEventListener('click', ()=> restart());
    document.getElementById('btn-shuffle')?.addEventListener('click', ()=> shuffleBoard());
    // shop button handled by shop.js
    // back buttons handled in level-map.js
  }

  function startLevel(level){
    // set level, reset score etc.
    currentLevel = level || 1;
    if(levelNumEl) levelNumEl.textContent = currentLevel;
    setScore(0);
    const st = Storage.get('candy_state') || { coins: 0 };
    if(coinsEl) coinsEl.textContent = st.coins || 0;
    // build grid and DOM
    createGrid();
    if(!boardEl) boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    buildBoardDOM();
  }

  // Utility to find matches used above
  function findMatchesOnGridLocal() {
    return findMatchesOnGrid(grid);
  }

  // Expose public API
  function init(){
    bindUI();
    SafeUI.log('CandyEngine ready');
  }

  // expose to window after DOM ready
  document.addEventListener('DOMContentLoaded', ()=> {
    init();
    // optional auto-start first level? No — start via button or level map
  });

  return {
    startLevel,
    shuffleBoard,
    restart,
    triggerBomb,
    findMatchesOnGridLocal,
  };
})();

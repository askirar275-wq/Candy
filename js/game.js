/* game.js */
const Game = (function(Core, Storage){
  let rows = 7, cols = 7; // default — responsive-grid will change css cell-size and cols var
  let grid = [];
  let score = 0, moves = 30, target = 600;
  let container, levelTitle, scoreEl, movesEl, targetEl, timerEl;
  let dragging = null;
  let isProcessing = false;

  function initUI(){
    container = document.getElementById('gameGrid');
    levelTitle = document.getElementById('levelTitle');
    scoreEl = document.getElementById('score');
    movesEl = document.getElementById('moves');
    targetEl = document.getElementById('target');
    timerEl = document.getElementById('timer');
    document.getElementById('restartBtn').addEventListener('click', ()=> start(currentLevel));
    document.getElementById('endBtn').addEventListener('click', ()=> endLevel());
  }

  function createEmptyGrid(){
    // use CSS --cols if available
    const style = getComputedStyle(container);
    const cssCols = parseInt(style.getPropertyValue('--cols')) || 7;
    cols = cssCols;
    rows = cols; // square grid for simplicity
    grid = Core.createGrid(rows,cols);
  }

  function renderGrid(){
    container.innerHTML = '';
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = `images/candy${grid[r][c]}.png`;
        img.alt = 'candy';
        cell.appendChild(img);
        attachTouchHandlers(cell);
        container.appendChild(cell);
      }
    }
  }

  // helper to swap data and update two cells visually
  function swapCells(r1,c1,r2,c2){
    const tmp = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = tmp;
    // update DOM images
    const a = container.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"] img`);
    const b = container.querySelector(`.cell[data-r="${r2}"][data-c="${c2}"] img`);
    if(a && b){
      const t = a.src; a.src = b.src; b.src = t;
    }
  }

  // check adjacency
  function adjacent(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1; }

  // main swap attempt
  async function trySwap(a,b){
    if(isProcessing) return;
    if(!adjacent(a,b)) return;
    isProcessing = true;
    moves--; updateStats();
    swapCells(a.r,a.c,b.r,b.c);

    // check for matches
    let matches = Core.findMatches(grid);
    if(matches.length === 0){
      // invalid swap: swap back with small animation
      await shakeCells(a,b);
      swapCells(a.r,a.c,b.r,b.c);
      isProcessing = false;
      return;
    }
    // process chain reactions
    while(matches.length>0){
      // reward score
      score += matches.length * 100;
      updateStats();
      // clear matched positions (set to 0)
      matches.forEach(([r,c])=> grid[r][c]=0);
      // visual clear: set blank images quickly
      matches.forEach(([r,c])=>{
        const el = container.querySelector(`.cell[data-r="${r}"][data-c="${c}"] img`);
        if(el) el.style.opacity = '0';
      });
      // wait slightly
      await wait(220);
      // apply gravity & refill
      Core.applyClearAndGravity(grid);
      // re-render images from grid
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const el = container.querySelector(`.cell[data-r="${r}"][data-c="${c}"] img`);
        if(el){ el.src = `images/candy${grid[r][c]}.png`; el.style.opacity='1'; }
      }
      await wait(160);
      matches = Core.findMatches(grid);
    }

    // unlock next level if target reached
    if(score >= target){
      Storage.unlock(currentLevel+1);
    }

    // check moves left -> if 0 then end
    if(moves <= 0){
      endLevel();
    }

    isProcessing = false;
  }

  function shakeCells(a,b){
    return new Promise((res)=>{
      const e1 = container.querySelector(`.cell[data-r="${a.r}"][data-c="${a.c}"]`);
      const e2 = container.querySelector(`.cell[data-r="${b.r}"][data-c="${b.c}"]`);
      if(e1) e1.classList.add('invalid');
      if(e2) e2.classList.add('invalid');
      setTimeout(()=>{ if(e1) e1.classList.remove('invalid'); if(e2) e2.classList.remove('invalid'); res(); }, 220);
    });
  }

  function updateStats(){
    scoreEl.textContent = score;
    movesEl.textContent = moves;
    targetEl.textContent = target;
  }

  function wait(ms){ return new Promise(res=>setTimeout(res,ms)); }

  // simple touch / mouse handlers for swap
  function attachTouchHandlers(cell){
    let start = null;
    function getPos(e){
      if(e.touches && e.touches[0]) return {x:e.touches[0].clientX, y:e.touches[0].clientY};
      return {x:e.clientX, y:e.clientY};
    }
    cell.addEventListener('pointerdown', (ev)=>{
      cell.setPointerCapture(ev.pointerId);
      start = {...cell.dataset, x:getPos(ev).x, y:getPos(ev).y};
    });
    cell.addEventListener('pointerup', (ev)=>{
      if(!start) return;
      const end = getPos(ev);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      const threshold = 18; // minimal swipe
      let targetCell = null;
      if(absX > absY && absX>threshold){
        // horizontal
        const dir = dx>0 ? 1 : -1;
        const nr = parseInt(start.r,10), nc = parseInt(start.c,10)+dir;
        if(nc>=0 && nc<cols) targetCell = {r:nr,c:nc};
      } else if(absY>absX && absY>threshold){
        const dir = dy>0 ? 1 : -1;
        const nr = parseInt(start.r,10)+dir, nc = parseInt(start.c,10);
        if(nr>=0 && nr<rows) targetCell = {r:nr,c:nc};
      }
      if(targetCell){
        trySwap({r:parseInt(start.r,10), c:parseInt(start.c,10)}, targetCell);
      }
      start = null;
    });
  }

  let currentLevel = 1;
  function endLevel(){
    alert(`Game over — Score: ${score}`);
    // navigate to map
    window.location.href = 'map.html';
  }

  return {
    start(level){
      currentLevel = parseInt(level || 1,10);
      initUI();
      createEmptyGrid();
      score = 0; moves = 30; target = 600;
      document.getElementById('levelTitle').textContent = `Level ${currentLevel}`;
      updateStats();
      renderGrid();
    }
  };
})(GameCore, CMStorage);

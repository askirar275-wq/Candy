// CandyGame engine - simple, mobile friendly
const CandyGame = (function(){
  const boardEl = document.getElementById('board');
  const SCORE = document.getElementById('score');
  const COINS = document.getElementById('coins');
  const LEVEL_NUM = document.getElementById('level-num');

  // config
  const COLS = 8;
  const ROWS = 8;
  const TYPES = 6; // number of candy images available (1..TYPES)
  const TILE_SIZE = 54; // used to set CSS grid size (JS sets grid-template)

  let grid = []; // 2D array [r][c] each value 1..TYPES
  let score = 0;
  let coins = 0;
  let currentLevel = 1;
  let isProcessing = false;

  // helper: random int
  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

  // set board CSS grid
  function setupGridStyle(){
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, ${TILE_SIZE}px)`;
    boardEl.style.gridTemplateRows = `repeat(${ROWS}, ${TILE_SIZE}px)`;
    boardEl.style.gap = '10px';
  }

  // create initial grid avoiding immediate matches
  function createInitialGrid(){
    grid = Array.from({length:ROWS}, ()=>Array(COLS).fill(0));
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let v;
        do {
          v = randInt(1,TYPES);
          grid[r][c] = v;
        } while(hasImmediateMatchAt(r,c));
      }
    }
  }

  function hasImmediateMatchAt(r,c){
    const v = grid[r][c];
    if(c>=2 && grid[r][c-1]===v && grid[r][c-2]===v) return true;
    if(r>=2 && grid[r-1][c]===v && grid[r-2][c]===v) return true;
    return false;
  }

  // render board DOM
  function renderBoard(){
    boardEl.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.r = r; tile.dataset.c = c;
        const img = document.createElement('img');
        const val = grid[r][c];
        img.src = `images/candy${val}.png`; // ensure images exist
        img.alt = 'candy';
        tile.appendChild(img);
        boardEl.appendChild(tile);
      }
    }
  }

  // swap two positions in grid and update DOM
  function swapPositions(r1,c1,r2,c2){
    const t = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = t;
  }

  // match detection (returns set of coords to remove)
  function findMatches(){
    const remove = new Set();
    // rows
    for(let r=0;r<ROWS;r++){
      let runVal = grid[r][0], runStart = 0;
      for(let c=1;c<=COLS;c++){
        const val = grid[r][c] ?? null;
        if(val===runVal) continue;
        const runLen = c - runStart;
        if(runVal && runLen>=3){
          for(let k=runStart;k<c;k++) remove.add(`${r},${k}`);
        }
        runVal = val; runStart = c;
      }
    }
    // cols
    for(let c=0;c<COLS;c++){
      let runVal = grid[0][c], runStart = 0;
      for(let r=1;r<=ROWS;r++){
        const val = grid[r]?.[c] ?? null;
        if(val===runVal) continue;
        const runLen = r - runStart;
        if(runVal && runLen>=3){
          for(let k=runStart;k<r;k++) remove.add(`${k},${c}`);
        }
        runVal = val; runStart = r;
      }
    }
    // convert to array of coords
    return Array.from(remove).map(s=>s.split(',').map(x=>Number(x)));
  }

  // remove matched, increase score, set nulls
  function removeMatches(coords){
    if(coords.length===0) return 0;
    for(const [r,c] of coords) grid[r][c] = 0;
    score += coords.length * 10;
    SCORE.textContent = score;
    return coords.length;
  }

  // gravity: for each column, let numbers fall and refill at top
  function applyGravity(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c] && grid[r][c]!==0){
          grid[write][c] = grid[r][c];
          write--;
        }
      }
      // fill rest with new candies
      for(let r=write;r>=0;r--) grid[r][c] = randInt(1,TYPES);
    }
  }

  // animate DOM to reflect grid (simple: re-render images)
  function refreshDOM(){
    const tiles = boardEl.querySelectorAll('.tile');
    tiles.forEach(tile=>{
      const r = Number(tile.dataset.r), c = Number(tile.dataset.c);
      const img = tile.querySelector('img');
      img.src = `images/candy${grid[r][c]}.png`;
    });
  }

  // core loop: after swap or init - resolve matches repeatedly
  async function resolveMatchesLoop(){
    isProcessing = true;
    let totalRemoved = 0;
    while(true){
      const matches = findMatches();
      if(matches.length===0) break;
      const removed = removeMatches(matches);
      totalRemoved += removed;
      // show disappear animation by temporarily hiding matched tiles
      for(const [r,c] of matches){
        const selector = `.tile[data-r="${r}"][data-c="${c}"] img`;
        const el = boardEl.querySelector(selector);
        if(el) el.style.opacity = 0;
      }
      await sleep(220);
      applyGravity();
      refreshDOM();
      await sleep(160);
    }
    isProcessing = false;
    return totalRemoved;
  }

  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  // check if swap is adjacency
  function isAdjacent(r1,c1,r2,c2){
    const dr = Math.abs(r1-r2), dc = Math.abs(c1-c2);
    return (dr+dc)===1;
  }

  // swap with validation: if swap produces a match, keep else swap back
  async function trySwap(r1,c1,r2,c2){
    if(isProcessing) return false;
    if(!isAdjacent(r1,c1,r2,c2)) return false;
    swapPositions(r1,c1,r2,c2);
    refreshDOM();
    // check immediate matches
    const matches = findMatches();
    if(matches.length>0){
      await resolveMatchesLoop();
      return true;
    } else {
      // swap back
      await sleep(160);
      swapPositions(r1,c1,r2,c2);
      refreshDOM();
      return false;
    }
  }

  // shuffle grid
  function shuffleGrid(){
    // flatten values and shuffle
    const arr = [];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) arr.push(grid[r][c]);
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    // write back
    let k=0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) { grid[r][c]=arr[k++]; }
    refreshDOM();
  }

  // tile input handling (mouse + touch)
  function bindInput(){
    let startR=-1,startC=-1, isTouch=false;

    function getTileFromEvent(e){
      const t = e.target.closest('.tile');
      if(!t) return null;
      return {r: Number(t.dataset.r), c: Number(t.dataset.c)};
    }

    // pointerdown / touchstart
    boardEl.addEventListener('pointerdown', (e) => {
      if(isProcessing) return;
      const tile = getTileFromEvent(e);
      if(!tile) return;
      startR = tile.r; startC = tile.c;
      isTouch = true;
    });

    // pointerup / touchend -> on release, decide swap by target tile
    boardEl.addEventListener('pointerup', async (e) => {
      if(!isTouch) return;
      const tile = getTileFromEvent(e);
      if(!tile){ startR=-1; startC=-1; return;}
      const ok = await trySwap(startR,startC,tile.r,tile.c);
      isTouch = false; startR=-1; startC=-1;
      return ok;
    });

    // also handle swipe by tracking move (pointermove)
    let lastMove = null;
    boardEl.addEventListener('pointermove', (e) => {
      if(startR<0) return;
      const tile = getTileFromEvent(e);
      if(!tile) return;
      // if moved to adjacent tile, trigger swap
      if(isAdjacent(startR,startC,tile.r,tile.c) && (!lastMove || lastMove.r!==tile.r || lastMove.c!==tile.c)){
        trySwap(startR,startC,tile.r,tile.c);
        lastMove = tile;
        startR=-1; startC=-1;
      }
    });
  }

  // public methods
  async function startLevel(level = 1){
    if(isProcessing) return;
    currentLevel = Number(level)||1;
    LEVEL_NUM.textContent = currentLevel;
    score = 0; SCORE.textContent = score;
    coins = Storage.get('coins',0); COINS.textContent = coins;

    setupGridStyle();
    createInitialGrid();
    renderBoard();
    // small auto-resolve just in case
    await resolveMatchesLoop();
    bindInput();

    UI.showPage('game');
    UI.log('CandyEngine ready');
  }

  // expose shuffle and startLevel
  return { startLevel, shuffleGrid };
})();

// js/game.js
(() => {
  // config
  const IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];
  const COLS = 7; // columns
  const ROWS = 8; // rows
  const START_MOVES = 50;
  const SCORE_PER_TILE = 50;

  // state
  let grid = []; // 2D array [r][c] -> index in IMAGES
  let selected = null;
  let score = 0;
  let moves = START_MOVES;

  // elements
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesBubble = document.getElementById('movesBubble');
  const btnRestart = document.getElementById('btnRestart');
  const btnShuffle = document.getElementById('btnShuffle');
  const btnShop = document.getElementById('btnShop');
  const btnHome = document.getElementById('btnHome');

  // initialize CSS cols var
  function applyGridVars(){
    gridEl.style.setProperty('--cols', COLS);
    gridEl.style.setProperty('--cell-size', getComputedStyle(document.documentElement).getPropertyValue('--cell-size') || '64px');
  }

  // random tile
  function randTile(){ return Math.floor(Math.random()*IMAGES.length); }

  // create initial grid with no immediate matches
  function buildInitialGrid(){
    grid = [];
    for(let r=0;r<ROWS;r++){
      grid[r]=[];
      for(let c=0;c<COLS;c++){
        let t;
        do {
          t = randTile();
        } while (wouldCreateMatchAt(r,c,t));
        grid[r][c]=t;
      }
    }
  }

  // check if placing tile at r,c would create immediate 3-in-row (used to avoid initial matches)
  function wouldCreateMatchAt(r,c,t){
    // horizontal
    if(c>=2 && grid[r][c-1]===t && grid[r][c-2]===t) return true;
    // vertical
    if(r>=2 && grid[r-1] && grid[r-2] && grid[r-1][c]===t && grid[r-2][c]===t) return true;
    return false;
  }

  // render grid DOM
  function renderGrid(){
    gridEl.innerHTML='';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className='cell';
        cell.dataset.r=r; cell.dataset.c=c;
        const img = document.createElement('img');
        img.src = IMAGES[ grid[r][c] ];
        img.alt='candy';
        cell.appendChild(img);
        // add listeners
        cell.addEventListener('click', onCellClick);
        addTouchHandlers(cell);
        gridEl.appendChild(cell);
      }
    }
  }

  // helper: adjacency
  function isAdjacent(a,b){
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return (dr+dc)===1;
  }

  // on cell click (select / swap)
  function onCellClick(e){
    const el = e.currentTarget;
    const r = +el.dataset.r, c = +el.dataset.c;
    handleSelect({r,c}, el);
  }

  function handleSelect(rc, el){
    if(!selected){
      selected = {rc, el};
      el.classList.add('selected');
      return;
    }
    const prev = selected;
    // if same clicked again -> deselect
    if(prev.rc.r === rc.r && prev.rc.c === rc.c){
      prev.el.classList.remove('selected');
      selected = null;
      return;
    }
    // if adjacent -> try swap
    if(isAdjacent(prev.rc, rc)){
      // perform swap visually then evaluate
      swapTiles(prev.rc, rc);
      renderGrid();
      // reduce moves
      moves = Math.max(0, moves - 1);
      updateHUD();
      // check matches
      const matches = findAllMatches();
      if(matches.length){
        // resolve loop
        resolveMatchesAndFall(matches);
      } else {
        // invalid swap => swap back with small animation
        animateInvalidSwap(prev.rc, rc).then(() => {
          swapTiles(prev.rc, rc); renderGrid();
        });
      }
    } else {
      // not adjacent: change selection
      prev.el.classList.remove('selected');
      selected = {rc, el};
      el.classList.add('selected');
    }
  }

  // swap in state
  function swapTiles(a,b){
    const tmp = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = tmp;
  }

  // animation for invalid swap (shake both)
  function animateInvalidSwap(a,b){
    return new Promise(res=>{
      const cells = Array.from(gridEl.querySelectorAll('.cell'));
      const elA = cells[a.r*COLS + a.c];
      const elB = cells[b.r*COLS + b.c];
      if(!elA || !elB){ res(); return; }
      elA.classList.add('invalid');
      elB.classList.add('invalid');
      setTimeout(()=>{ elA.classList.remove('invalid'); elB.classList.remove('invalid'); res(); }, 220);
    });
  }

  // find all matches (return list of cells coords)
  function findAllMatches(){
    const matches = [];
    const mark = Array.from({length:ROWS}, ()=>Array(COLS).fill(false));

    // horizontal
    for(let r=0;r<ROWS;r++){
      let runStart=0;
      for(let c=1;c<=COLS;c++){
        if(c<COLS && grid[r][c]===grid[r][c-1]) continue;
        const runLen = c-runStart;
        if(runLen>=3){
          for(let k=runStart;k<c;k++) mark[r][k]=true;
        }
        runStart=c;
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let runStart=0;
      for(let r=1;r<=ROWS;r++){
        if(r<ROWS && grid[r][c]===grid[r-1][c]) continue;
        const runLen = r-runStart;
        if(runLen>=3){
          for(let k=runStart;k<r;k++) mark[k][c]=true;
        }
        runStart=r;
      }
    }

    // convert mark to matches list (cells)
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(mark[r][c]) matches.push({r,c});
      }
    }
    return matches;
  }

  // remove matches, apply gravity, refill, loop until no matches
  function resolveMatchesAndFall(initialMatches){
    let totalRemoved = 0;
    function step(){
      const matches = findAllMatches();
      if(matches.length===0) {
        // after cascade finished, check game over moves
        checkGameOver();
        return;
      }
      // remove marked tiles (set to null)
      matches.forEach(({r,c}) => {
        if(grid[r][c] !== null){
          grid[r][c] = null;
          totalRemoved++;
        }
      });
      // update score
      score += matches.length * SCORE_PER_TILE;
      updateHUD();

      // animate removal by re-render then apply gravity after short delay
      renderGrid();
      setTimeout(()=> {
        applyGravity();
        renderGrid();
        // next cascade
        setTimeout(step, 220);
      }, 160);
    }
    // start resolution
    step();
  }

  // gravity: for each column, move non-null down, fill top with new tiles
  function applyGravity(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c] !== null){
          grid[write][c] = grid[r][c];
          write--;
        }
      }
      // fill remaining top
      for(let r=write;r>=0;r--){
        grid[r][c] = randTile();
      }
    }
  }

  // update HUD
  function updateHUD(){
    scoreEl.textContent = score;
    movesBubble.textContent = moves;
  }

  // simple shuffle
  function shuffleBoard(){
    // flatten, shuffle, refill
    const flat = [];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) flat.push(randTile());
    // place back ensuring no immediate matches (quick pass)
    let idx=0;
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let t = flat[idx++];
        let attempts=0;
        while(wouldCreateMatchAtForGrid(r,c,t) && attempts<8){ t = randTile(); attempts++; }
        grid[r][c]=t;
      }
    }
    renderGrid();
  }
  function wouldCreateMatchAtForGrid(r,c,t){
    // check left two
    if(c>=2 && grid[r][c-1]===t && grid[r][c-2]===t) return true;
    if(r>=2 && grid[r-1] && grid[r-2] && grid[r-1][c]===t && grid[r-2][c]===t) return true;
    return false;
  }

  // check game over when moves exhausted
  function checkGameOver(){
    if(moves<=0){
      setTimeout(()=> {
        alert('Moves खत्म! Game Over.\nScore: ' + score);
      }, 150);
    }
  }

  // selection clear helper
  function clearSelectionUI(){
    const cells = Array.from(gridEl.querySelectorAll('.cell'));
    cells.forEach(el=> el.classList.remove('selected'));
    selected = null;
  }

  // event handlers for buttons
  btnRestart.addEventListener('click', ()=> {
    score=0; moves=START_MOVES; buildInitialGrid(); renderGrid(); updateHUD(); clearSelectionUI();
  });
  btnShuffle.addEventListener('click', ()=> { shuffleBoard(); score=Math.max(0, score-200); updateHUD(); }); // penalty
  btnShop.addEventListener('click', ()=> { alert('Shop अभी placeholder है'); });
  btnHome.addEventListener('click', ()=> { alert('Home पर जाएँ (placeholder)'); });

  // add simple touch handlers so tapping works on mobile similarly
  function addTouchHandlers(cell){
    let startX=0, startY=0, touchHandled=false;
    cell.addEventListener('touchstart', (ev) => {
      const t = ev.touches[0];
      startX = t.clientX; startY = t.clientY;
      touchHandled=false;
    }, {passive:true});

    cell.addEventListener('touchend', (ev) => {
      if(touchHandled) return;
      // treat as a tap
      cell.click();
    });

    cell.addEventListener('touchmove', (ev) => {
      if(ev.touches.length>1) return;
      const t = ev.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      const threshold = 22; // minimum swipe px
      if(Math.max(adx,ady) > threshold){
        touchHandled = true;
        // determine direction
        const r = +cell.dataset.r, c = +cell.dataset.c;
        let target = null;
        if(adx>ady){
          if(dx>0) target = {r,c:c+1}; else target = {r,c:c-1};
        } else {
          if(dy>0) target = {r:r+1,c}; else target = {r:r-1,c};
        }
        if(target && target.r>=0 && target.r<ROWS && target.c>=0 && target.c<COLS){
          handleSelect({r,c}, cell); // select current
          // find target element and perform select to trigger swap
          const idx = target.r*COLS + target.c;
          const targetEl = gridEl.children[idx];
          if(targetEl) handleSelect({r:target.r,c:target.c}, targetEl);
        } else {
          // no valid target -> just clear
          clearSelectionUI();
        }
      }
    }, {passive:true});
  }

  // init
  function init(){
    applyGridVars();
    score = 0; moves = START_MOVES;
    buildInitialGrid();
    renderGrid();
    updateHUD();
  }

  // start
  init();

})();

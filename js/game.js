// game.js - UI & interactions
(function(){
  const gridContainer = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const timerEl = document.getElementById('timer');
  const levelTitle = document.getElementById('levelTitle');
  const levelComplete = document.getElementById('levelComplete');
  const completeScore = document.getElementById('completeScore');

  let cellEls = []; // 2D array of cell elements
  let cols = 6, rows = 6;
  let dragging = null; // {r,c,clone,originX,originY}
  let cellSize = 64;

  // helper: set grid CSS columns based on cols
  function applyGridColumns(n){
    gridContainer.innerHTML = '';
    gridContainer.classList.add('game-grid');
    gridContainer.style.gridTemplateColumns = `repeat(${n}, ${cellSize}px)`;
  }

  // render from Game.getGrid()
  function renderAll(){
    const state = Game.getState();
    rows = state.grid.length;
    cols = state.grid[0].length;
    applyGridColumns(cols);
    cellEls = [];
    for(let r=0;r<rows;r++){
      const rowEls = [];
      for(let c=0;c<cols;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = `images/candy${state.grid[r][c]}.png`;
        img.alt = '';
        cell.appendChild(img);
        // touch / mouse handlers
        addInteraction(cell);
        gridContainer.appendChild(cell);
        rowEls.push(cell);
      }
      cellEls.push(rowEls);
    }
    updateHUD(state);
  }

  function updateHUD(state){
    scoreEl.textContent = state.score;
    movesEl.textContent = state.moves;
    targetEl.textContent = state.target;
    levelTitle.textContent = `Level ${state.level}`;
  }

  // swap visuals between two cells with animation
  function swapVisual(r1,c1,r2,c2,done){
    const a = cellEls[r1][c1], b = cellEls[r2][c2];
    if(!a || !b){ done && done(); return; }
    // clone images
    const imgA = a.querySelector('img'), imgB = b.querySelector('img');
    // animate using transform
    a.style.transition = 'transform .18s ease';
    b.style.transition = 'transform .18s ease';
    const dx = (c2-c1)*(cellSize+10); // plus gap
    const dy = (r2-r1)*(cellSize+10);
    a.style.transform = `translate(${dx}px, ${dy}px)`;
    b.style.transform = `translate(${-dx}px, ${-dy}px)`;
    setTimeout(()=>{
      // swap DOM img srcs (finalize)
      const tmp = imgA.src; imgA.src = imgB.src; imgB.src = tmp;
      // reset transforms
      a.style.transition = '';
      b.style.transition = '';
      a.style.transform = '';
      b.style.transform = '';
      done && done();
    }, 190);
  }

  // Hook Game updates
  Game.onUpdate(function(state){
    // if grid element count matches, update images directly, else full render
    if(cellEls.length === rows && rows === state.grid.length){
      // update cell images
      for(let r=0;r<state.grid.length;r++){
        for(let c=0;c<state.grid[r].length;c++){
          const img = cellEls[r][c].querySelector('img');
          img.src = `images/candy${state.grid[r][c]}.png`;
        }
      }
    } else {
      renderAll();
    }
    updateHUD(state);
    // show level complete if target reached
    if(state.score >= state.target){
      document.getElementById('completeScore').textContent = state.score;
      document.getElementById('levelComplete').classList.remove('hidden');
    } else {
      document.getElementById('levelComplete').classList.add('hidden');
    }
  });

  // helpers to convert pointer/touch coordinates to cell indices
  function coordToCell(x,y){
    const rect = gridContainer.getBoundingClientRect();
    const cx = x - rect.left;
    const cy = y - rect.top;
    const c = Math.floor(cx / (cellSize + 10));
    const r = Math.floor(cy / (cellSize + 10));
    if(r<0||r>=rows||c<0||c>=cols) return null;
    return {r,c};
  }

  // interaction: support touch swipe & mouse drag
  function addInteraction(cell){
    function start(ev){
      ev.preventDefault && ev.preventDefault();
      const touch = ev.touches ? ev.touches[0] : ev;
      const r = parseInt(cell.dataset.r,10), c = parseInt(cell.dataset.c,10);
      dragging = {r,c,startX: touch.clientX, startY: touch.clientY};
    }
    function move(ev){
      if(!dragging) return;
      const touch = ev.touches ? ev.touches[0] : ev;
      const dx = touch.clientX - dragging.startX;
      const dy = touch.clientY - dragging.startY;
      // if move exceeds threshold, determine direction
      const thresh = 22;
      if(Math.abs(dx) > thresh || Math.abs(dy) > thresh){
        let dr=0, dc=0;
        if(Math.abs(dx) > Math.abs(dy)){
          dc = dx > 0 ? 1 : -1;
        } else {
          dr = dy > 0 ? 1 : -1;
        }
        const r2 = dragging.r + dr, c2 = dragging.c + dc;
        if(r2>=0 && r2<rows && c2>=0 && c2<cols){
          // perform swap visually then call Game.userSwap
          // disable further moves until resolved
          const can = Game.userSwap(dragging.r, dragging.c, r2, c2);
          // render updated grid (Game.onUpdate will run)
          dragging = null;
        }
      }
    }
    function end(ev){ dragging = null; }
    // touch
    cell.addEventListener('touchstart', start, {passive:false});
    cell.addEventListener('touchmove', move, {passive:false});
    cell.addEventListener('touchend', end);
    // mouse (desktop)
    cell.addEventListener('mousedown', (e)=>{ start(e); document.addEventListener('mousemove', move); document.addEventListener('mouseup', function up(){ end(); document.removeEventListener('mousemove', move); }, {once:true}); });
  }

  // public init & helpers
  function init(){
    // initial cellSize adjust based on container width
    const containerW = Math.min(680, window.innerWidth-40);
    // compute cellSize so grid fits nicely
    cellSize = Math.floor((containerW - (cols-1)*10) / cols);
    if(cellSize < 44) cellSize = 44;
    // start UI with Game's initial state or request Game.start externally
    renderAll();
  }

  // buttons
  document.getElementById('btnRestart').addEventListener('click', ()=> {
    const lv = parseInt(new URLSearchParams(location.search).get('level')) || 1;
    Game.start(lv);
  });
  document.getElementById('btnReplay').addEventListener('click', ()=> {
    const lv = Game.getState().level;
    Game.start(lv);
  });
  document.getElementById('btnNext').addEventListener('click', ()=> {
    const lv = Math.min(9, Game.getState().level+1);
    Game.start(lv);
    // update URL param
    const url = new URL(location);
    url.searchParams.set('level', lv);
    history.pushState({},'',url);
  });

  // initialize UI
  window.addEventListener('load', init);
})();

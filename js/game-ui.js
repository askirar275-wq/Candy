// game-ui.js
(function(global){
  console.log('[UI] init');

  // responsive grid vars (place near top)
  (function setupResponsiveGrid(){
    const gridEl = document.getElementById && document.getElementById('gameGrid');
    // if play.html uses separate file, render will create 'gameGrid' later; so run compute later inside render
    function computeGridVars(){
      const grid = document.getElementById('gameGrid');
      if(!grid) return;
      const parent = grid.parentElement || document.body;
      const avail = Math.min(parent.getBoundingClientRect().width, window.innerWidth - 32);
      const minCell=48,maxCell=72,gap=12,minCols=5,maxCols=8;
      let chosen=minCols, chosenSize=minCell;
      for(let cols=maxCols;cols>=minCols;cols--){
        const requiredMin = cols*minCell + (cols-1)*gap;
        if(requiredMin <= avail){
          const size = Math.min(maxCell, Math.floor((avail - (cols-1)*gap)/cols));
          chosen = cols; chosenSize = Math.max(minCell, size);
          break;
        }
      }
      document.documentElement.style.setProperty('--cols', chosen);
      document.documentElement.style.setProperty('--cell-size', chosenSize + 'px');
      document.documentElement.style.setProperty('--gap', gap + 'px');
    }
    window.addEventListener('resize', ()=> setTimeout(computeGridVars,80));
    window.addEventListener('load', computeGridVars);
    setTimeout(computeGridVars,120);
  })();

  // UI state
  let dragging = null; // {r,c,el,clone}
  const gridWrapSelector = '.game-grid-container';

  // render function used by core
  function render(){
    const coreState = Core.state;
    // locate or create board-card (if main page not play, create simple view)
    let boardCard = document.querySelector('.board-card');
    if(!boardCard){
      // create a container under body to show board (minimal)
      boardCard = document.createElement('section');
      boardCard.className = 'card board-card';
      document.body.appendChild(boardCard);
    }
    boardCard.innerHTML = ''; // clear

    // header stats row
    const header = document.createElement('div');
    header.className = 'stats-row';
    header.innerHTML = `
      <div class="stat">Score: <span id="score">${coreState.score}</span></div>
      <div class="stat">Moves: <span id="moves">${coreState.moves}</span></div>
      <div class="stat">Target: <span id="target">${coreState.target}</span></div>
      <div class="stat">Timer: <span id="timer">--:--</span></div>
    `;
    boardCard.appendChild(header);

    // grid wrapper
    const wrap = document.createElement('div');
    wrap.className = 'game-grid-container';
    const grid = document.createElement('div');
    grid.id = 'gameGrid';
    grid.className = 'game-grid';
    // set CSS columns (use state)
    grid.style.gridTemplateColumns = `repeat(${coreState.cols}, 1fr)`;
    wrap.appendChild(grid);
    boardCard.appendChild(wrap);

    // fill grid
    for(let r=0;r<coreState.rows;r++){
      for(let c=0;c<coreState.cols;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const t = Core.state.board[r][c];
        // image path from Types array in core? we'll build fallback
        let imgPath = (function(){
          const mapping = [
            'img/candy-1.png',
            'img/candy-2.png',
            'img/candy-3.png',
            'img/candy-4.png',
            'img/candy-5.png'
          ];
          return mapping[t] || '';
        })();
        if(imgPath){
          const img = document.createElement('img');
          img.src = imgPath;
          img.alt = 'candy';
          cell.appendChild(img);
        } else {
          cell.textContent = '🍬';
        }
        grid.appendChild(cell);
      }
    }

    // controls
    const controls = document.createElement('div');
    controls.style.marginTop = '8px';
    controls.innerHTML = `<button id="restartBtn" class="btn">Restart</button>
                          <button id="shuffleBtn" class="btn">Shuffle</button>
                          <button id="endBtn" class="btn">End</button>`;
    boardCard.appendChild(controls);

    // wire events
    attachTileEvents();
    document.getElementById('restartBtn').onclick = ()=> { Core.start(Core.state.level); }
    document.getElementById('shuffleBtn').onclick = ()=> { shuffleBoard(); }
    document.getElementById('endBtn').onclick = ()=> { alert('End level'); }

    // call responsive compute
    setTimeout(()=>{ const ev = new Event('resize'); window.dispatchEvent(ev); }, 20);
  }

  // shuffle helper
  function shuffleBoard(){
    console.log('[UI] shuffle');
    const s = Core.state;
    for(let r=0;r<s.rows;r++) for(let c=0;c<s.cols;c++) s.board[r][c] = Math.floor(Math.random()*5);
    render();
  }

  // attach drag/touch handlers to each cell
  function attachTileEvents(){
    const grid = document.getElementById('gameGrid');
    if(!grid) return;
    let ongoing = false;

    // helper to get rc from element
    function rcFromEl(el){ return { r: parseInt(el.dataset.r), c: parseInt(el.dataset.c) }; }

    function isAdjacent(a,b){
      const dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c);
      return (dr+dc) === 1;
    }

    // touch/mouse unified
    grid.addEventListener('pointerdown', (e)=>{
      const cell = e.target.closest('.cell'); if(!cell) return;
      e.preventDefault();
      if(ongoing) return;
      ongoing = true;
      const rc = rcFromEl(cell);
      dragging = { r: rc.r, c: rc.c, el: cell };
      // create clone
      const rect = cell.getBoundingClientRect();
      const clone = cell.cloneNode(true);
      clone.className = 'dragging-clone';
      clone.style.left = (e.clientX) + 'px';
      clone.style.top = (e.clientY) + 'px';
      document.body.appendChild(clone);
      dragging.clone = clone;
      cell.classList.add('swapping');
    });

    window.addEventListener('pointermove', (e)=>{
      if(!dragging) return;
      e.preventDefault();
      if(dragging.clone){
        dragging.clone.style.left = (e.clientX) + 'px';
        dragging.clone.style.top = (e.clientY) + 'px';
      }
    }, {passive:false});

    window.addEventListener('pointerup', (e)=>{
      if(!dragging) return;
      const gridRect = grid.getBoundingClientRect();
      const x = e.clientX, y = e.clientY;
      const elUnder = document.elementFromPoint(x,y);
      const targetCell = elUnder && elUnder.closest('.cell');
      const from = { r: dragging.r, c: dragging.c };
      if(targetCell){
        const to = { r: parseInt(targetCell.dataset.r), c: parseInt(targetCell.dataset.c) };
        if(isAdjacent(from,to)){
          // do swap
          Core.swapTiles(from,to);
          Sound.play && Sound.play('swap');
          Core.state.moves = Math.max(0, Core.state.moves - 1);
          // render then check matches
          render();
          setTimeout(()=> {
            const matches = Core.findMatches();
            if(matches.length){
              // good swap
              Sound.play && Sound.play('pop');
              Core.processBoardAfterSwap();
            } else {
              // invalid - swap back
              Core.swapTiles(from,to);
              Sound.play && Sound.play('swap');
              render();
            }
            // update moves display
            const mv = document.getElementById('moves'); if(mv) mv.textContent = Core.state.moves;
          }, 160);
        } else {
          // not adjacent -> no-op
          dragging.el.classList.add('invalid');
          setTimeout(()=> dragging.el && dragging.el.classList.remove('invalid'),180);
        }
      }
      // cleanup
      dragging.el && dragging.el.classList.remove('swapping');
      dragging.clone && dragging.clone.remove();
      dragging = null;
      ongoing = false;
    });

    // prevent default scrolling on grid
    grid.addEventListener('touchmove', (e)=> { e.preventDefault(); }, {passive:false});
  }

  // start logic (reads ?level param)
  function startWhenReady(){
    const urlParams = new URLSearchParams(location.search);
    const lvl = urlParams.get('level') || 1;
    document.addEventListener('DOMContentLoaded', ()=> {
      Core.start(lvl);
      // start bg music attempt
      try{ Sound.startBG(); }catch(e){}
      // initial render
      render();
    });
  }

  // expose render so core can call it
  global.render = render;
  // start
  startWhenReady();
})(window);

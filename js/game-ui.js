/* js/game-ui.js
   UI renderer + drag/swipe handling + Eruda logs.
   यह file game-core.js के बाद लोड होनी चाहिए।
*/

(function(){
  // safety
  if(!window.Game) {
    console.error('[UI] Game core not found!');
    return;
  }

  // cached DOM
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const timerEl = document.getElementById('timer');

  // drag state
  let dragging = null; // {startI,startJ, activeCloneEl}
  let pointerId = null;

  // render grid from Game._state
  function render(){
    const s = window.Game._state;
    if(!s) return;
    // update stats
    scoreEl.textContent = s.score;
    movesEl.textContent = s.moves;
    targetEl.textContent = s.target;
    timerEl.textContent = s.timerSeconds ? formatTime(s.timerSeconds) : '--:--';

    // build grid
    while(gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);

    gridEl.style.setProperty('--cols', s.cols);

    for(let i=0;i<s.rows;i++){
      for(let j=0;j<s.cols;j++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.i = i; cell.dataset.j = j;
        const tile = s.board[i][j];
        if(tile){
          const img = document.createElement('img');
          const idx = Math.max(0, Math.min(tile.type, 5));
          img.src = (window.CANDY_IMAGES && window.CANDY_IMAGES[idx]) ? window.CANDY_IMAGES[idx] : `img/candy-${idx+1}.png`;
          img.alt = 'candy';
          cell.appendChild(img);

          // mark special visually
          if(tile.special){
            cell.classList.add('special-'+tile.special);
          }
        } else {
          // empty box (shouldn't normally happen after refill), keep blank
        }

        // pointer/touch handlers
        cell.addEventListener('pointerdown', onPointerDown);
        cell.addEventListener('pointerup', onPointerUp);
        cell.addEventListener('pointercancel', onPointerCancel);
        cell.addEventListener('pointermove', onPointerMove);

        gridEl.appendChild(cell);
      }
    }
    console.log('[UI] render board', s.rows, s.cols);
  }

  // format timer
  function formatTime(sec){
    const m = Math.floor(sec/60), s = sec%60;
    return (m<10? '0'+m: m) + ':' + (s<10? '0'+s: s);
  }

  // helper: find cell element by i,j
  function cellEl(i,j){
    return gridEl.querySelector(`.cell[data-i="${i}"][data-j="${j}"]`);
  }

  // create dragging clone (visual) and track pointer
  function createClone(x,y, srcImg){
    const clone = document.createElement('img');
    clone.src = srcImg;
    clone.className = 'dragging-clone';
    clone.style.left = x + 'px'; clone.style.top = y + 'px';
    document.body.appendChild(clone);
    return clone;
  }

  // pointer events
  function onPointerDown(e){
    e.preventDefault();
    const el = e.currentTarget;
    const i = parseInt(el.dataset.i,10), j = parseInt(el.dataset.j,10);
    pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    // store start
    const img = el.querySelector('img');
    const src = img ? img.src : '';
    dragging = { startI: i, startJ: j, lastX: e.clientX, lastY: e.clientY, clone: createClone(e.clientX, e.clientY, src), started:true };
    console.log('[UI] pointerdown', i,j);
  }

  function onPointerMove(e){
    if(!dragging || e.pointerId !== pointerId) return;
    e.preventDefault();
    dragging.lastX = e.clientX; dragging.lastY = e.clientY;
    if(dragging.clone){
      dragging.clone.style.left = e.clientX + 'px';
      dragging.clone.style.top = e.clientY + 'px';
    }
  }

  function onPointerCancel(e){
    if(!dragging) return;
    cleanupDrag();
  }

  function onPointerUp(e){
    if(!dragging || e.pointerId !== pointerId) return;
    const startI = dragging.startI, startJ = dragging.startJ;
    const endEl = document.elementFromPoint(e.clientX, e.clientY);
    const targetCell = findCellFromElement(endEl);
    if(targetCell){
      const endI = targetCell.i, endJ = targetCell.j;
      // attempt swap
      const res = window.Game.attemptSwap(startI, startJ, endI, endJ);
      if(res && res.ok){
        // play pop sound (Game handled scoring)
        if(window.Sound) Sound.play('pop');
      } else {
        // invalid -> shake feedback
        const el = cellEl(startI,startJ);
        if(el){
          el.classList.add('invalid');
          setTimeout(()=>el.classList.remove('invalid'), 200);
        }
      }
    } else {
      // pointer released not on cell -> no-op
    }
    cleanupDrag();
  }

  function findCellFromElement(el){
    while(el && el !== document) {
      if(el.classList && el.classList.contains('cell')){
        return { i: parseInt(el.dataset.i,10), j: parseInt(el.dataset.j,10) };
      }
      el = el.parentElement;
    }
    return null;
  }

  function cleanupDrag(){
    if(dragging && dragging.clone){
      try { document.body.removeChild(dragging.clone); } catch(e){}
    }
    dragging = null;
    if(pointerId){
      try { document.releasePointerCapture && document.releasePointerCapture(pointerId); } catch(e){}
      pointerId = null;
    }
  }

  // expose CANDY_IMAGES to UI (so image srcs can be set)
  window.CANDY_IMAGES = [
    'img/candy-1.png',
    'img/candy-2.png',
    'img/candy-3.png',
    'img/candy-4.png',
    'img/candy-5.png',
    'img/candy-6.png'
  ];

  // initialize UI
  function initUI(){
    console.log('[UI] init');
    // connect to Game state
    if(!window.Game._state){
      console.warn('[UI] Game state not yet ready');
    }
    // initial render
    render();

    // expose render globally (used by core start wrapper)
    window.render = render;

    // simple animation loop to refresh UI every 250ms if running (keeps stats fresh)
    setInterval(()=> {
      if(window.Game && window.Game._state) {
        const s = window.Game._state;
        // update elements quickly
        scoreEl.textContent = s.score;
        movesEl.textContent = s.moves;
        targetEl.textContent = s.target;
      }
    }, 250);
  }

  // attach cleanup on unload
  window.addEventListener('load', ()=> {
    try {
      initUI();
      console.log('[UI] loaded');
    } catch(e){
      console.error('[UI] init failed', e);
    }
  });

  // add some global shortcuts for debug (eruda console)
  window._gameDebug = {
    dumpState: ()=> { console.log(JSON.parse(JSON.stringify(window.Game._state))); },
    findMatches: ()=> { console.log(window.Game._internal.findMatches()); },
    applyGravity: ()=> { window.Game._internal.applyGravityAndRefill(); render(); }
  };

  console.log('[UI] script ready');
})();

/* game-ui.js
   UI + input handling + responsive grid setup + eruda init + safe sound/confetti usage
*/

(function(){
  // Eruda init (if available) and safe logger
  if(window.eruda) {
    console.log('[ERUDA] Console initialized');
  } else {
    // optional: dynamic load eruda if you want (commented)
    // const s = document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/eruda'; document.head.appendChild(s);
  }
  const log = (...a)=>console.log(...a);
  const warn = (...a)=>console.warn(...a);
  const error = (...a)=>console.error(...a);

  // safe wrappers
  const Sound = window.Sound || { play: (...args)=>log('[SoundStub]', ...args), init: ()=>{} };
  const Confetti = window.Confetti || { fire: ()=>log('[ConfettiStub] fire') };

  // DOM references (create if missing)
  function $(sel){ return document.querySelector(sel); }
  const boardCard = document.getElementById('boardCard') || (function(){
    const sec = document.createElement('section'); sec.className='card board-card'; sec.id='boardCard';
    // try to insert into page main
    const container = document.querySelector('main') || document.body;
    container.appendChild(sec);
    return sec;
  })();

  // make sure there's a grid element
  let gameGrid = document.getElementById('gameGrid');
  if(!gameGrid){
    gameGrid = document.createElement('div');
    gameGrid.id = 'gameGrid';
    gameGrid.className = 'game-grid';
    boardCard.appendChild(gameGrid);
  }

  // stats elements (create if not present)
  let scoreEl = document.getElementById('score') || (function(){ const d=document.createElement('span'); d.id='score'; d.textContent='0'; boardCard.insertAdjacentElement('afterbegin', d); return d; })();
  let movesEl = document.getElementById('moves') || (function(){ const d=document.createElement('span'); d.id='moves'; d.textContent='30'; boardCard.insertAdjacentElement('afterbegin', movesEl? 'afterbegin':'afterbegin', d); return d; })();
  let targetEl = document.getElementById('target') || (function(){ const d=document.createElement('span'); d.id='target'; d.textContent='600'; boardCard.insertAdjacentElement('afterbegin', targetEl? 'afterbegin':'afterbegin', d); return d; })();

  // grid sizing responsive script (sets --cols / --cell-size). Place early.
  (function setupResponsiveGrid(){
    const gridEl = gameGrid;
    if(!gridEl) return;
    function computeGridVars(){
      const minCell = 48, maxCell = 72, gap = 12, minCols=5, maxCols=8;
      const parent = gridEl.parentElement;
      const avail = Math.min(parent.getBoundingClientRect().width || window.innerWidth, window.innerWidth - 32);
      let chosen=minCols, chosenSize=minCell;
      for(let cols=maxCols; cols>=minCols; cols--){
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
      log('[GRID] --cols', chosen, '--cell-size', chosenSize);
    }
    computeGridVars();
    let t; window.addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(computeGridVars,120); });
    window.addEventListener('load', computeGridVars);
  })();

  // UI state
  let dragging = null; // {r,c,el, startX,...}
  let cols = 6, rows = 6;

  // render function (reads Game._state)
  function render(){
    try {
      if(!window.Game || !window.Game._state) {
        log('[UI] Game state not yet ready');
        return;
      }
      const s = window.Game._state;
      cols = s.cols; rows = s.rows;
      // update stats
      scoreEl.textContent = s.score;
      movesEl.textContent = s.moves;
      targetEl.textContent = s.target;
      // clear grid
      gameGrid.innerHTML = '';
      gameGrid.style.setProperty('--cols', cols);
      // set grid template (fallback)
      gameGrid.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size,64px))`;

      // build cells
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          const cell = s.board[r][c];
          const div = document.createElement('div');
          div.className = 'cell';
          div.dataset.r = r; div.dataset.c = c;
          // image inside
          const img = document.createElement('img');
          img.draggable = false;
          img.alt = cell.type || '';
          // image src mapping — assume images in /assets/candies/<type>.png or use emoji fallback
          const src = `assets/candies/${cell.type}.png`;
          img.src = src;
          img.onerror = function(){ /* fallback – emoji */ img.src=''; img.style.fontSize='28px'; img.textContent = emojiForType(cell.type); img.style.pointerEvents='none'; };
          div.appendChild(img);
          gameGrid.appendChild(div);
        }
      }
    } catch(e){
      error('[UI] render failed', e);
    }
  }

  function emojiForType(type){
    if(!type) return '🍬';
    if(type.indexOf('red')>=0) return '🔴';
    if(type.indexOf('donut')>=0 || type.indexOf('donut')>=0) return '🍩';
    if(type.indexOf('pink')>=0) return '🍭';
    return '🍬';
  }

  // helpers to convert pixel/touch to cell coords
  function getCellFromPoint(x,y){
    const el = document.elementFromPoint(x,y);
    if(!el) return null;
    const cell = el.closest('.cell');
    if(!cell) return null;
    return { r: parseInt(cell.dataset.r,10), c: parseInt(cell.dataset.c,10), el: cell };
  }

  // dragging handlers (pointer events)
  function onPointerDown(e){
    if(!window.Game || !window.Game._state) return;
    if(window.Game._state.busy) return;
    const p = (e.touches && e.touches[0]) || e;
    const found = getCellFromPoint(p.clientX, p.clientY);
    if(!found) return;
    const s = window.Game._state;
    dragging = {
      r: found.r, c: found.c, startX: p.clientX, startY: p.clientY,
      el: found.el
    };
    // prevent default to avoid scrolling
    if(e.cancelable) e.preventDefault();
    // visual press
    found.el.classList.add('swapping');
  }
  function onPointerMove(e){
    if(!dragging) return;
    const p = (e.touches && e.touches[0]) || e;
    const dx = p.clientX - dragging.startX;
    const dy = p.clientY - dragging.startY;
    const absx = Math.abs(dx), absy = Math.abs(dy);
    // if moved more than threshold, find target cell in that direction
    const threshold = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')||64)/2) || 28;
    let target = null;
    if(absx > threshold || absy > threshold){
      // determine direction
      if(absx > absy){
        // horizontal
        const dir = dx>0 ? 1 : -1;
        const tr = dragging.r, tc = dragging.c + dir;
        if(tc>=0 && tc < window.Game._state.cols) target = {r:tr,c:tc};
      } else {
        // vertical
        const dir = dy>0 ? 1 : -1;
        const tr = dragging.r + dir, tc = dragging.c;
        if(tr>=0 && tr < window.Game._state.rows) target = {r:tr,c:tc};
      }
      if(target){
        // perform swap attempt
        const did = window.Game.trySwap(dragging.r, dragging.c, target.r, target.c);
        if(did){
          // update UI render
          render();
          try { Sound.play('swap'); } catch(e){ log('swap sound failed', e); }
        } else {
          // invalid swap animation trigger
          const originCell = document.querySelector(`.cell[data-r="${dragging.r}"][data-c="${dragging.c}"]`);
          if(originCell){
            originCell.classList.add('invalid');
            setTimeout(()=> originCell.classList.remove('invalid'), 220);
          }
        }
        // cleanup dragging
        cleanupDragging();
      }
    }
  }
  function onPointerUp(e){
    cleanupDragging();
  }
  function cleanupDragging(){
    if(!dragging) return;
    if(dragging.el) dragging.el.classList.remove('swapping');
    dragging = null;
  }

  // attach pointer / touch events to document for mobile friendliness
  function attachInput(){
    // touch
    document.addEventListener('touchstart', onPointerDown, {passive:false});
    document.addEventListener('touchmove', onPointerMove, {passive:false});
    document.addEventListener('touchend', onPointerUp, {passive:true});
    // mouse fallback
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    log('[UI] input handlers attached');
  }

  // listen to Game events (score updates, start, over etc)
  function attachGameEvents(){
    window.addEventListener('game-ready', ()=>{ log('[UI] event: game-ready'); render(); });
    window.addEventListener('game-started', (e)=>{ log('[UI] event: game-started', e.detail); render(); });
    window.addEventListener('game-swap', (e)=>{ log('[UI] event: game-swap', e.detail); render(); });
    window.addEventListener('move-used', (e)=>{ log('[UI] move-used', e.detail); movesEl.textContent = e.detail.moves; });
    window.addEventListener('game-score', (e)=>{ scoreEl.textContent = e.detail.score; });
    window.addEventListener('level-complete', (e)=>{ log('[UI] level complete', e.detail); /* show modal or UI */ });
    window.addEventListener('game-over', (e)=>{ log('[UI] game-over', e.detail); /* show modal */ });
  }

  // UI init which waits for Game._state (event or polling)
  function initUI(){
    log('[UI] script ready');

    attachInput();
    attachGameEvents();

    function startOnceReady(){
      if(window.Game && window.Game._state){
        log('[UI] Game state found -> render');
        render();
        // small live ticker for stats
        setInterval(()=> {
          if(window.Game && window.Game._state){
            const s = window.Game._state;
            scoreEl.textContent = s.score;
            movesEl.textContent = s.moves;
            targetEl.textContent = s.target;
          }
        }, 250);
        return true;
      }
      return false;
    }

    if(startOnceReady()) return;
    window.addEventListener('game-ready', ()=> startOnceReady());
    // fallback poll
    const pid = setInterval(()=>{ if(startOnceReady()){ clearInterval(pid); } }, 120);
  }

  // attach to load
  window.addEventListener('load', ()=> {
    try { initUI(); log('[UI] loaded'); } catch(e){ error('[UI] init err', e); }
  });

  // expose render for external use
  window.UI = window.UI || {};
  window.UI.render = render;

  log('[UI] loaded');
})();

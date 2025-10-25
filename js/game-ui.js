/* game-ui.js  — Updated robust UI + input + eruda logging + safe image fallback
   Replace your existing js/game-ui.js with this file.
*/

(function(){
  // ---- Eruda friendly logger (works whether eruda present or not) ----
  const Log = {
    info: (...a)=>{ try{ console.log(...a); }catch{} },
    warn: (...a)=>{ try{ console.warn(...a); }catch{} },
    error: (...a)=>{ try{ console.error(...a); }catch{} }
  };

  Log.info('[UI] loading');

  // Safe wrappers (if sound/confetti scripts not present)
  const Sound = window.Sound || { play: (...a)=>Log.info('[SoundStub]', ...a), init: ()=>{} };
  const Confetti = window.Confetti || { fire: ()=>Log.info('[ConfettiStub] fire') };

  // Ensure boardCard exists (container card inside page). If not, create one and insert near top.
  let boardCard = document.getElementById('boardCard');
  if(!boardCard){
    boardCard = document.createElement('section');
    boardCard.id = 'boardCard';
    boardCard.className = 'card board-card';
    // try to insert under main content or at body start
    const main = document.querySelector('main') || document.body;
    main.insertBefore(boardCard, main.firstChild);
    Log.info('[UI] created boardCard');
  }

  // Ensure gameGrid exists
  let gameGrid = document.getElementById('gameGrid');
  if(!gameGrid){
    gameGrid = document.createElement('div');
    gameGrid.id = 'gameGrid';
    gameGrid.className = 'game-grid';
    boardCard.appendChild(gameGrid);
    Log.info('[UI] created gameGrid');
  }

  // Create/ensure stats row (score/moves/target/timer)
  function ensureStatsElements(){
    let statsRow = boardCard.querySelector('.stats-row');
    if(!statsRow){
      statsRow = document.createElement('div');
      statsRow.className = 'stats-row';
      statsRow.style.display = 'flex';
      statsRow.style.gap = '12px';
      statsRow.style.flexWrap = 'wrap';
      statsRow.style.alignItems = 'center';
      statsRow.style.justifyContent = 'center';
      // create four stat boxes
      const makeStat = (id,label)=>{
        const box = document.createElement('div');
        box.className = 'stat';
        box.style.padding = '12px 18px';
        box.style.borderRadius = '12px';
        box.style.background = 'rgba(255,255,255,0.95)';
        box.style.boxShadow = '0 8px 18px rgba(0,0,0,0.05)';
        box.style.fontWeight = '600';
        box.style.minWidth = '110px';
        const span = document.createElement('span');
        span.id = id;
        span.textContent = (id==='timer') ? '--:--' : '0';
        const lbl = document.createElement('div');
        lbl.style.fontSize = '12px';
        lbl.style.opacity = '0.75';
        lbl.textContent = label;
        box.appendChild(lbl);
        box.appendChild(span);
        return box;
      };
      statsRow.appendChild(makeStat('score','Score:'));
      statsRow.appendChild(makeStat('moves','Moves:'));
      statsRow.appendChild(makeStat('target','Target:'));
      statsRow.appendChild(makeStat('timer','Timer:'));
      boardCard.insertBefore(statsRow, gameGrid);
      Log.info('[UI] created stats-row');
    }
    // return elements
    return {
      scoreEl: document.getElementById('score'),
      movesEl: document.getElementById('moves'),
      targetEl: document.getElementById('target'),
      timerEl: document.getElementById('timer')
    };
  }

  const stats = ensureStatsElements();

  // Responsive grid variables: compute --cols and --cell-size based on boardCard width
  (function setupResponsiveGrid(){
    const gridEl = gameGrid;
    if(!gridEl) return;
    function computeGridVars(){
      const minCell = 48, maxCell = 72, gap = 12, minCols = 5, maxCols = 8;
      const parent = gridEl.parentElement || document.documentElement;
      const avail = Math.min(parent.getBoundingClientRect().width || window.innerWidth, window.innerWidth - 32);
      let chosen = minCols, chosenSize = minCell;
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
      gridEl.style.gridTemplateColumns = `repeat(${chosen}, var(--cell-size, ${chosenSize}px))`;
      Log.info('[GRID] --cols', chosen, '--cell-size', chosenSize);
    }
    computeGridVars();
    let t; window.addEventListener('resize', ()=>{ clearTimeout(t); t = setTimeout(computeGridVars,120); });
    window.addEventListener('load', computeGridVars);
  })();

  // Utility: emoji fallback for types (in case images missing)
  function emojiForType(type){
    if(!type) return '🍬';
    if(type.includes('red')) return '🔴';
    if(type.includes('donut')) return '🍩';
    if(type.includes('pink')) return '🍭';
    if(type.includes('yellow')) return '🍋';
    return '🍬';
  }

  // Render function — robust with try/catch
  function render(){
    try {
      if(!window.Game || !window.Game._state){
        Log.warn('[UI] Game state not yet ready');
        return;
      }
      const s = window.Game._state;
      // update stats
      stats.scoreEl.textContent = String(s.score || 0);
      stats.movesEl.textContent = String(s.moves || 0);
      stats.targetEl.textContent = String(s.target || 0);
      stats.timerEl.textContent = (s.timerSec != null) ? formatTime(s.timerSec) : '--:--';

      // ensure board array valid
      if(!Array.isArray(s.board)) {
        Log.warn('[UI] no board array yet');
        gameGrid.innerHTML = '';
        return;
      }

      // set grid template using cols from state if present
      const cols = s.cols || (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols')) || 6);
      gameGrid.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size, 64px))`;

      // build DOM cells
      gameGrid.innerHTML = '';
      for(let r=0;r<s.rows;r++){
        for(let c=0;c<s.cols;c++){
          const cellData = (s.board[r] && s.board[r][c]) ? s.board[r][c] : null;
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.r = r; cell.dataset.c = c;
          // inner content: try image first
          if(cellData && cellData.type){
            const img = document.createElement('img');
            img.draggable = false;
            // assuming asset names like 'candy-red' => 'candy-red.png'
            const src = `assets/candies/${cellData.type}.png`;
            img.src = src;
            // if image loading fails, show emoji fallback
            img.onerror = function(){
              try { this.remove(); } catch(e){}
              const fallback = document.createElement('div');
              fallback.className = 'cell-emoji';
              fallback.textContent = emojiForType(cellData.type);
              fallback.style.fontSize = '26px';
              fallback.style.pointerEvents = 'none';
              cell.appendChild(fallback);
            };
            img.onload = function(){ /* nothing */ };
            cell.appendChild(img);
          } else {
            // empty placeholder (shouldn't usually happen)
            const ph = document.createElement('div');
            ph.className = 'cell-empty'; ph.style.opacity = '0.0';
            ph.textContent = '';
            cell.appendChild(ph);
          }
          gameGrid.appendChild(cell);
        }
      }
      Log.info('[UI] render board', s.rows, s.cols);
    } catch(err){
      Log.error('[UI] render failed', err);
      // prevent throw further
    }
  }

  function formatTime(sec){
    if(sec == null) return '--:--';
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = Math.floor(sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  // convert point to cell
  function getCellFromPoint(x,y){
    const el = document.elementFromPoint(x,y);
    if(!el) return null;
    const cell = el.closest('.cell');
    if(!cell) return null;
    return { r: parseInt(cell.dataset.r,10), c: parseInt(cell.dataset.c,10), el: cell };
  }

  // Input (pointer/touch) handling
  let dragging = null;
  function onPointerDown(e){
    try {
      if(!window.Game || window.Game._state.busy) return;
      const p = (e.touches && e.touches[0]) || e;
      const found = getCellFromPoint(p.clientX, p.clientY);
      if(!found) return;
      dragging = { r: found.r, c: found.c, startX: p.clientX, startY: p.clientY, el: found.el };
      if(e.cancelable) e.preventDefault();
      found.el.classList.add('swapping');
    } catch(err){ Log.error('onPointerDown', err); }
  }
  function onPointerMove(e){
    try {
      if(!dragging) return;
      const p = (e.touches && e.touches[0]) || e;
      const dx = p.clientX - dragging.startX;
      const dy = p.clientY - dragging.startY;
      const absx = Math.abs(dx), absy = Math.abs(dy);
      const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 64;
      const threshold = Math.max(18, Math.floor(cellSize/2));
      if(absx > threshold || absy > threshold){
        let target = null;
        if(absx > absy){
          const dir = dx>0 ? 1 : -1;
          const tr = dragging.r, tc = dragging.c + dir;
          if(tr>=0 && tr < window.Game._state.rows && tc>=0 && tc < window.Game._state.cols) target = {r:tr,c:tc};
        } else {
          const dir = dy>0 ? 1 : -1;
          const tr = dragging.r + dir, tc = dragging.c;
          if(tr>=0 && tr < window.Game._state.rows && tc>=0 && tc < window.Game._state.cols) target = {r:tr,c:tc};
        }
        if(target){
          // attempt swap via core
          const did = window.Game.trySwap(dragging.r, dragging.c, target.r, target.c);
          if(did){
            try { Sound.play('swap'); } catch(e){ Log.warn('swap sound failed', e); }
          } else {
            // invalid: show invalid animation
            const origin = document.querySelector(`.cell[data-r="${dragging.r}"][data-c="${dragging.c}"]`);
            if(origin){
              origin.classList.add('invalid');
              setTimeout(()=> origin.classList.remove('invalid'), 220);
            }
          }
          cleanupDrag();
          // re-render after swap (Game.trySwap already mutates state)
          render();
        }
      }
    } catch(err){ Log.error('onPointerMove', err); }
  }
  function onPointerUp(e){ cleanupDrag(); }
  function cleanupDrag(){
    if(!dragging) return;
    if(dragging.el) dragging.el.classList.remove('swapping');
    dragging = null;
  }

  // attach inputs
  function attachInput(){
    document.addEventListener('touchstart', onPointerDown, {passive:false});
    document.addEventListener('touchmove', onPointerMove, {passive:false});
    document.addEventListener('touchend', onPointerUp, {passive:true});
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    Log.info('[UI] input handlers attached');
  }

  // Listen to Game events to update UI reactively
  function attachGameEvents(){
    window.addEventListener('game-ready', ()=>{ Log.info('[UI] event: game-ready'); render(); });
    window.addEventListener('game-started', (e)=>{ Log.info('[UI] event: game-started', e.detail); render(); });
    window.addEventListener('game-swap', (e)=>{ Log.info('[UI] event: game-swap', e.detail); render(); });
    window.addEventListener('move-used', (e)=>{ Log.info('[UI] move-used', e.detail); stats.movesEl.textContent = e.detail.moves; });
    window.addEventListener('game-score', (e)=>{ Log.info('[UI] game-score', e.detail); stats.scoreEl.textContent = e.detail.score; });
    window.addEventListener('level-complete', (e)=>{ Log.info('[UI] level-complete', e.detail); try{ Confetti.fire(); }catch{} });
    window.addEventListener('game-over', (e)=>{ Log.info('[UI] game-over', e.detail); /* show modal if needed */});
  }

  // init UI; wait for Game state ready if needed
  function initUI(){
    Log.info('[UI] init');
    attachInput();
    attachGameEvents();

    function tryStart(){
      if(window.Game && window.Game._state){
        Log.info('[UI] Game state found -> render');
        render();
        // small polling to keep stats updated
        setInterval(()=> {
          if(window.Game && window.Game._state){
            const s = window.Game._state;
            stats.scoreEl.textContent = String(s.score || 0);
            stats.movesEl.textContent = String(s.moves || 0);
            stats.targetEl.textContent = String(s.target || 0);
            stats.timerEl.textContent = (s.timerSec != null) ? formatTime(s.timerSec) : '--:--';
          }
        }, 300);
        return true;
      }
      return false;
    }

    if(!tryStart()){
      window.addEventListener('game-ready', tryStart);
      const pid = setInterval(()=>{ if(tryStart()) clearInterval(pid); }, 150);
    }
  }

  window.addEventListener('load', ()=> {
    try {
      initUI();
      Log.info('[UI] loaded');
    } catch(e){
      Log.error('[UI] init error', e);
    }
  });

  // Expose a debug render (if needed)
  window.UI = window.UI || {};
  window.UI.render = render;

  Log.info('[UI] script loaded');
})();

/* Game UI: render board, handle touch/drag/swipe, Eruda console log */
(function(){
  console.log('[UI] init');
  // Eruda console show if available
  try{
    if(typeof eruda !== 'undefined'){ eruda.init(); console.log('[ERUDA] Console initialized'); }
  }catch(e){}
  // DOM refs
  const boardCard = document.getElementById('boardCard');
  const gridEl = document.getElementById('gameGrid');

  // stats area (we'll create inside board if not exist)
  function ensureUI(){
    if(!boardCard) return;
    // stats
    let stats = boardCard.querySelector('.stats-row');
    if(!stats){
      stats = document.createElement('div'); stats.className='stats-row';
      stats.innerHTML = '<div class="stat">Score: <span id="ui-score">0</span></div><div class="stat">Moves: <span id="ui-moves">30</span></div><div class="stat">Target: <span id="ui-target">600</span></div><div class="stat">Timer: <span id="ui-timer">--:--</span></div>';
      boardCard.insertBefore(stats, gridEl);
    }
    // container for grid
    if(!gridEl.parentElement || !gridEl.classList.contains('game-grid')){
      // wrap in container
      const wrap = document.createElement('div'); wrap.className='game-grid-container';
      boardCard.appendChild(wrap);
      wrap.appendChild(gridEl);
    }
    // controls
    if(!boardCard.querySelector('.controls')){
      const c = document.createElement('div'); c.className='controls';
      c.innerHTML = '<button id="btnRestart">Restart</button><button id="btnShuffle">Shuffle</button><button id="btnEnd">End</button>';
      boardCard.appendChild(c);
      document.getElementById('btnRestart').addEventListener('click', ()=>{ Game.start(Game.getState().level); Sound.play('swap'); });
      document.getElementById('btnShuffle').addEventListener('click', ()=>{ Game.shuffle(); console.log('[UI] shuffle'); });
      document.getElementById('btnEnd').addEventListener('click', ()=>{ alert('End'); });
    }
  }

  // render board
  function renderBoard(board){
    if(!gridEl) return;
    gridEl.innerHTML = '';
    gridEl.style.setProperty('--cols', getComputedStyle(document.documentElement).getPropertyValue('--cols') || 6);
    board.forEach((row, r)=>{
      row.forEach((cell, c)=>{
        const cellEl = document.createElement('div'); cellEl.className='cell'; cellEl.dataset.r = r; cellEl.dataset.c = c;
        // image (try assets/images/candyX.png)
        const img = document.createElement('img');
        const type = cell && cell.type ? cell.type : 'candy1';
        const src = `images/${type}.png`; // your repo images folder
        img.src = src;
        img.alt = type;
        img.onerror = function(){ this.style.display='none'; cellEl.textContent = '🍬'; };
        cellEl.appendChild(img);
        gridEl.appendChild(cellEl);
      });
    });
  }

  // update stats
  function updateStats(s){
    try{
      const sc = document.getElementById('ui-score'), mv = document.getElementById('ui-moves'), tg = document.getElementById('ui-target'), ti = document.getElementById('ui-timer');
      if(sc) sc.textContent = s.score;
      if(mv) mv.textContent = s.moves;
      if(tg) tg.textContent = s.target;
      if(ti) ti.textContent = s.timerSec ? (new Date(s.timerSec*1000)).toISOString().substr(14,5) : '--:--';
    }catch(e){ console.warn('stats update err', e); }
  }

  // drag / swipe handling
  let dragging = null; // {el, r,c, clone}
  function attachInputHandlers(){
    gridEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    gridEl.addEventListener('touchstart', e=>e.preventDefault(), {passive:false});
  }
  function onPointerDown(e){
    const cell = e.target.closest('.cell'); if(!cell) return;
    e.preventDefault();
    const r = parseInt(cell.dataset.r,10), c = parseInt(cell.dataset.c,10);
    dragging = { startX: e.clientX, startY: e.clientY, r, c, el: cell };
    // clone
    const clone = cell.cloneNode(true); clone.className='dragging-clone'; document.body.appendChild(clone); dragging.clone = clone;
    clone.style.left = e.clientX + 'px'; clone.style.top = e.clientY + 'px';
    cell.classList.add('swapping');
  }
  function onPointerMove(e){
    if(!dragging) return;
    e.preventDefault();
    dragging.clone.style.left = e.clientX + 'px'; dragging.clone.style.top = e.clientY + 'px';
  }
  function onPointerUp(e){
    if(!dragging) return;
    const dx = e.clientX - dragging.startX, dy = e.clientY - dragging.startY;
    const absx = Math.abs(dx), absy = Math.abs(dy);
    const threshold = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'))/2 || 28;
    const from = { r: dragging.r, c: dragging.c };
    let to = null;
    if(absx > absy && absx > threshold){
      // horizontal
      to = { r: dragging.r, c: dragging.c + (dx>0?1:-1) };
    } else if(absy > absx && absy > threshold){
      // vertical
      to = { r: dragging.r + (dy>0?1:-1), c: dragging.c };
    }
    // cleanup visuals
    dragging.el.classList.remove('swapping');
    if(dragging.clone) dragging.clone.remove();
    // attempt swap
    if(to){
      const success = Game.trySwap(from.r, from.c, to.r, to.c);
      if(success){
        console.log('[UI] swap ok', from, to);
        Sound.play('swap');
      } else {
        // invalid swap: shake
        const cell = gridEl.querySelector(`.cell[data-r="${from.r}"][data-c="${from.c}"]`);
        if(cell) cell.classList.add('invalid');
        setTimeout(()=> cell && cell.classList.remove('invalid'), 200);
        console.log('[UI] swap invalid');
      }
    }
    dragging = null;
  }

  // event listeners from core
  function wireCoreEvents(){
    window.addEventListener('game-ready', (e)=>{ console.log('[UI] game-ready'); ensureUI(); });
    window.addEventListener('game-start', (e)=>{ console.log('[UI] game-start'); updateStats(Game.getState()); renderBoard(Game.getState().board); });
    window.addEventListener('board-changed', (e)=>{ renderBoard(e.detail.board); updateStats(Game.getState()); });
    window.addEventListener('swap-ok', (e)=>{ updateStats(Game.getState()); Sound.play('pop'); });
    window.addEventListener('score-changed', (e)=> updateStats(Game.getState()));
    window.addEventListener('moves-changed', (e)=> updateStats(Game.getState()));
    window.addEventListener('level-complete', (e)=>{ console.log('[UI] level complete', e.detail); Sound.play('win'); Confetti.fire(); alert('Level Complete!'); });
    window.addEventListener('game-over', (e)=>{ console.log('[UI] game over'); alert('Game Over'); });
    window.addEventListener('game-shuffled', ()=>{ renderBoard(Game.getState().board); });
  }

  // init UI once DOM ready
  window.addEventListener('load', ()=>{
    try{
      ensureUI();
      wireCoreEvents();
      attachInputHandlers();
      console.log('[UI] script ready');
    }catch(e){ console.error('[UI] init error', e); }
  });

})();

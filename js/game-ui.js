// js/game-ui.js (updated safe init + better logging)
window.UI = (function(){
  const log = (...a)=> console.log('[UI]', ...a);
  const warn = (...a)=> console.warn('[UI]', ...a);
  const error = (...a)=> console.error('[UI]', ...a);

  function gridEl(){ return document.getElementById('gameGrid'); }
  function scoreEl(){ return document.getElementById('score'); }
  function movesEl(){ return document.getElementById('moves'); }
  function targetEl(){ return document.getElementById('target'); }
  function timerEl(){ return document.getElementById('timer'); }

  function safeGetState(){
    try {
      return (typeof Game !== 'undefined' && typeof Game.getState === 'function') ? Game.getState() : null;
    } catch(e){
      error('safeGetState failed', e);
      return null;
    }
  }

  function render(){
    const st = safeGetState();
    if(!st){
      warn('render: Game state not available yet');
      return;
    }

    if(document.getElementById('levelTitle')) document.getElementById('levelTitle').textContent = 'Level ' + st.level;
    if(scoreEl()) scoreEl().textContent = st.score;
    if(movesEl()) movesEl().textContent = st.moves;
    if(targetEl()) targetEl().textContent = st.target;

    const grid = gridEl();
    if(!grid){
      error('render: gameGrid element missing');
      return;
    }

    // update CSS grid columns (from var)
    const colsVar = getComputedStyle(grid).getPropertyValue('--cols') || '6';
    grid.style.gridTemplateColumns = `repeat(${colsVar.trim()}, var(--cell-size,64px))`;

    // build board
    grid.innerHTML = '';
    for(let r=0;r<st.rows;r++){
      for(let c=0;c<st.cols;c++){
        const val = st.board[r][c] || 1;
        const div = document.createElement('div');
        div.className = 'cell';
        div.dataset.r = r;
        div.dataset.c = c;

        const img = document.createElement('img');
        img.alt = 'candy';
        // try-catch for image path
        const src = `images/candy${val}.png`;
        img.src = src;
        img.onerror = function(){ img.src = 'images/candy1.png'; /* fallback */ };
        div.appendChild(img);
        grid.appendChild(div);
      }
    }
  }

  function initInput(){
    const grid = gridEl();
    if(!grid){ error('initInput: gameGrid not found'); return; }

    let start = null;
    function onDown(e){
      const el = e.target.closest('.cell');
      if(!el) return;
      start = {
        r: Number(el.dataset.r), c: Number(el.dataset.c),
        x: (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX),
        y: (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY),
        el
      };
      el.classList.add('dragging');
      e.preventDefault();
    }

    function onMove(e){
      if(!start) return;
      const x = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
      const y = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
      const dx = x - start.x, dy = y - start.y;
      const threshold = 18;
      if(Math.abs(dx) > threshold || Math.abs(dy) > threshold){
        let dr=0, dc=0;
        if(Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
        else dr = dy > 0 ? 1 : -1;
        // do swap attempt safely
        attemptSwap(start.r, start.c, start.r + dr, start.c + dc, start.el);
        start.el.classList.remove('dragging');
        start = null;
      }
    }

    function onUp(){
      if(start && start.el) start.el.classList.remove('dragging');
      start = null;
    }

    grid.addEventListener('pointerdown', onDown, {passive:false});
    window.addEventListener('pointermove', onMove, {passive:true});
    window.addEventListener('pointerup', onUp);
    grid.addEventListener('touchstart', onDown, {passive:false});
    grid.addEventListener('touchmove', onMove, {passive:true});
    window.addEventListener('touchend', onUp);
  }

  function attemptSwap(r1,c1,r2,c2,el){
    try {
      const st = safeGetState();
      if(!st){ warn('attemptSwap: state not ready'); return; }
      if(r2<0||c2<0||r2>=st.rows||c2>=st.cols) return;

      if(typeof Game.swap !== 'function'){ error('attemptSwap: Game.swap missing'); return; }
      Game.swap(r1,c1,r2,c2);
      // decrement moves in core state if available directly: better to let Game manage moves if it has API
      // render to show swap
      render();

      setTimeout(()=>{
        try {
          const pts = Game.checkAndResolve ? Game.checkAndResolve() : 0;
          if(pts>0){
            if(window.Sound && typeof window.Sound.play === 'function') window.Sound.play('pop');
            updateUI();
            if(Game.getState && Game.getState().score >= Game.getState().target){
              if(window.Sound && typeof window.Sound.play === 'function') window.Sound.play('win');
              if(window.Confetti && typeof window.Confetti.fire === 'function') window.Confetti.fire();
              window.dispatchEvent(new CustomEvent('level-complete',{detail:{state:Game.getState()}}));
            }
          } else {
            // swap back
            Game.swap(r1,c1,r2,c2);
            render();
            const node = document.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"]`);
            if(node){ node.classList.add('invalid'); setTimeout(()=> node.classList.remove('invalid'),200); }
          }
          updateUI();
        } catch(e){
          error('attemptSwap inner error', e);
        }
      }, 200);

    } catch(e){
      error('attemptSwap error', e);
    }
  }

  function updateUI(){
    const st = safeGetState();
    if(!st) return;
    if(scoreEl()) scoreEl().textContent = st.score;
    if(movesEl()) movesEl().textContent = st.moves;
    if(targetEl()) targetEl().textContent = st.target;
    const starsEl = document.getElementById('stars');
    if(starsEl){
      const pct = st.score / (st.target || 1);
      const stars = pct >= 1 ? '★ ★ ★' : pct >= 0.6 ? '★ ★ ☆' : pct >= 0.3 ? '★ ☆ ☆' : '☆ ☆ ☆';
      starsEl.textContent = stars;
    }
  }

  function init(){
    try {
      if(!gridEl()) throw new Error('gameGrid missing');
      render();
      initInput();

      const bRestart = document.getElementById('btnRestart');
      const bShuffle = document.getElementById('btnShuffle');
      const bEnd = document.getElementById('btnEnd');
      if(bRestart) bRestart.addEventListener('click', ()=> {
        const lvl = (new URLSearchParams(location.search)).get('level') || 1;
        try { Game.start(lvl); render(); updateUI(); } catch(e){ error('Restart failed', e); }
      });
      if(bShuffle) bShuffle.addEventListener('click', ()=> { try { Game.makeBoard(); render(); updateUI(); } catch(e){ error('Shuffle failed', e); } });
      if(bEnd) bEnd.addEventListener('click', ()=> { alert('End'); });

      window.addEventListener('game-started', ()=> { render(); updateUI(); });
      window.addEventListener('game-ready', ()=> { render(); updateUI(); });

      log('UI initialized');
    } catch(e){
      error('init error', e);
      // throw to allow bootstrap to catch & log stack
      throw e;
    }
  }

  return { init, render, updateUI };
})();

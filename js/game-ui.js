// js/game-ui.js - render, input handling (drag/swipe), UI updates
window.UI = (function(){
  const gridEl = () => document.getElementById('gameGrid');
  const scoreEl = () => document.getElementById('score');
  const movesEl = () => document.getElementById('moves');
  const targetEl = () => document.getElementById('target');
  const timerEl = () => document.getElementById('timer');
  let dragging = null;
  let cellSize = 64;

  function render(){
    const st = Game.getState();
    document.getElementById('levelTitle').textContent = 'Level ' + st.level;
    scoreEl().textContent = st.score;
    movesEl().textContent = st.moves;
    targetEl().textContent = st.target;
    // set grid cols from CSS var
    const cols = getComputedStyle(gridEl()).getPropertyValue('--cols') || '6';
    gridEl().style.gridTemplateColumns = `repeat(${cols.trim()}, var(--cell-size,64px))`;
    // render cells
    gridEl().innerHTML = '';
    for(let r=0;r<st.rows;r++){
      for(let c=0;c<st.cols;c++){
        const val = st.board[r][c];
        const div = document.createElement('div');
        div.className = 'cell';
        div.dataset.r = r; div.dataset.c = c;
        const img = document.createElement('img');
        img.alt = 'candy';
        img.src = `images/candy${val}.png`;
        div.appendChild(img);
        gridEl().appendChild(div);
      }
    }
  }

  function initInput(){
    const grid = gridEl();
    let start = null;
    function onPointerDown(e){
      const el = e.target.closest('.cell');
      if(!el) return;
      const r = Number(el.dataset.r), c = Number(el.dataset.c);
      start = { r,c, x:e.clientX || (e.touches && e.touches[0].clientX), y:e.clientY || (e.touches && e.touches[0].clientY), el };
      el.classList.add('dragging');
      e.preventDefault();
    }
    function onPointerMove(e){
      if(!start) return;
      const x = e.clientX || (e.touches && e.touches[0].clientX);
      const y = e.clientY || (e.touches && e.touches[0].clientY);
      const dx = x - start.x, dy = y - start.y;
      // threshold to decide direction
      const threshold = 18;
      if(Math.abs(dx) > threshold || Math.abs(dy) > threshold){
        let dr=0, dc=0;
        if(Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
        else dr = dy > 0 ? 1 : -1;
        attemptSwap(start.r, start.c, start.r+dr, start.c+dc, start.el);
        start.el.classList.remove('dragging');
        start = null;
      }
    }
    function onPointerUp(e){
      if(start && start.el) start.el.classList.remove('dragging');
      start = null;
    }

    // pointer events
    grid.addEventListener('pointerdown', onPointerDown, {passive:false});
    window.addEventListener('pointermove', onPointerMove, {passive:true});
    window.addEventListener('pointerup', onPointerUp);

    // touch fallback
    grid.addEventListener('touchstart', onPointerDown, {passive:false});
    grid.addEventListener('touchmove', onPointerMove, {passive:true});
    window.addEventListener('touchend', onPointerUp);
  }

  function attemptSwap(r1,c1,r2,c2,el){
    const st = Game.getState();
    if(r2<0||c2<0||r2>=st.rows||c2>=st.cols) return;
    // do swap in core
    const ok = Game.swap(r1,c1,r2,c2);
    if(!ok) return;
    // reduce move
    st.moves = Math.max(0, st.moves-1);
    // render to show swap
    render();
    // check matches
    setTimeout(()=>{
      const pts = Game.checkAndResolve();
      if(pts>0){
        Sound.play('pop');
        updateUI();
        // chain reactions handled inside Game.checkAndResolve loop
        if(Game.getState().score >= Game.getState().target){
          Sound.play('win'); Confetti.fire();
          // game complete event
          window.dispatchEvent(new CustomEvent('level-complete',{detail:{state:Game.getState()}}));
        }
      } else {
        // invalid — swap back and show shake
        Game.swap(r1,c1,r2,c2); // swap back
        render();
        // add invalid class briefly
        const node = document.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"]`);
        if(node){ node.classList.add('invalid'); setTimeout(()=> node.classList.remove('invalid'),200); }
      }
      updateUI();
    }, 200);
  }

  function updateUI(){
    const st = Game.getState();
    scoreEl().textContent = st.score;
    movesEl().textContent = st.moves;
    targetEl().textContent = st.target;
    // stars
    const starsEl = document.getElementById('stars');
    const pct = st.score / (st.target || 1);
    const stars = pct >= 1 ? '★ ★ ★' : pct >= 0.6 ? '★ ★ ☆' : pct >= 0.3 ? '★ ☆ ☆' : '☆ ☆ ☆';
    if(starsEl) starsEl.textContent = stars;
  }

  function init(){
    if(!gridEl()) throw new Error('gameGrid missing');
    render();
    initInput();
    // controls
    document.getElementById('btnRestart').addEventListener('click', ()=> {
      const lvl = (new URLSearchParams(location.search)).get('level') || 1;
      Game.start(lvl); render(); updateUI();
    });
    document.getElementById('btnShuffle').addEventListener('click', ()=> { Game.makeBoard(); render(); updateUI(); });
    document.getElementById('btnEnd').addEventListener('click', ()=> { alert('End'); });
    window.addEventListener('game-started', ()=> { render(); updateUI(); });
    window.addEventListener('game-ready', ()=> { render(); updateUI(); });
  }

  return { init, render, updateUI };
})();

// js/game-ui.js
// UI: render board, touch/swipe handlers, animations, Eruda-friendly logs.
// Requires GameCore to be loaded first.

(function(){
  const log = (...a)=> console.log('[UI]', ...a);
  const warn = (...a)=> console.warn('[UI]', ...a);
  const ERR_IMG = 'images/candy1.png';

  function $id(id){ return document.getElementById(id); }

  function renderAll(){
    const st = window.GameCore.getState();
    if(!st) return;
    // update stats
    if($id('score')) $id('score').textContent = st.score;
    if($id('moves')) $id('moves').textContent = st.moves;
    if($id('target')) $id('target').textContent = st.target;

    const grid = $id('gameGrid');
    if(!grid){
      warn('no gameGrid element found');
      return;
    }
    // set cols var (if responsive script sets CSS vars, this is safe)
    grid.style.gridTemplateColumns = `repeat(${st.cols}, var(--cell-size,64px))`;
    // render cells
    grid.innerHTML = '';
    for(let r=0;r<st.rows;r++){
      for(let c=0;c<st.cols;c++){
        const v = st.board[r][c];
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = `images/candy${v}.png`;
        img.alt = 'candy';
        img.onerror = ()=> img.src = ERR_IMG;
        cell.appendChild(img);
        grid.appendChild(cell);
      }
    }
  }

  // animate pop (on removed) then re-render
  function animatePopThenRender(callback){
    const grid = $id('gameGrid');
    if(!grid) return callback && callback();
    const state = GameCore.getState();
    // add pop class where board is 0
    grid.querySelectorAll('.cell').forEach(cell=>{
      const r = +cell.dataset.r, c = +cell.dataset.c;
      if(state.board[r][c] === 0){
        cell.classList.add('pop');
      }
    });
    setTimeout(()=>{
      renderAll();
      callback && callback();
    }, 260);
  }

  // input: simple pointer/touch swipe detection
  function attachInput(){
    const grid = $id('gameGrid');
    if(!grid) return;
    let start = null;

    function getP(e){
      if(e.touches && e.touches[0]) return {x:e.touches[0].clientX, y:e.touches[0].clientY};
      return {x:e.clientX, y:e.clientY};
    }

    grid.addEventListener('pointerdown', onDown);
    grid.addEventListener('touchstart', onDown, {passive:true});
    window.addEventListener('pointermove', onMove);
    window.addEventListener('touchmove', onMove, {passive:true});
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchend', onUp);

    function onDown(e){
      const cell = e.target.closest('.cell');
      if(!cell) return;
      start = {
        r: +cell.dataset.r,
        c: +cell.dataset.c,
        x: getP(e).x,
        y: getP(e).y,
        node: cell
      };
      cell.classList.add('dragging');
      e.preventDefault();
    }
    function onMove(e){
      if(!start) return;
      const p = getP(e);
      const dx = p.x - start.x, dy = p.y - start.y;
      const thresh = 18;
      if(Math.abs(dx) > thresh || Math.abs(dy) > thresh){
        let dr=0, dc=0;
        if(Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
        else dr = dy > 0 ? 1 : -1;
        handleSwap(start.r, start.c, start.r+dr, start.c+dc, start.node);
        start.node.classList.remove('dragging');
        start = null;
      }
    }
    function onUp(){ if(start && start.node) start.node.classList.remove('dragging'); start = null; }

    function handleSwap(r1,c1,r2,c2,node){
      const state = GameCore.getState();
      if(!state) return;
      if(! (r2>=0 && c2>=0 && r2<state.rows && c2<state.cols) ){
        // invalid direction
        if(node) {
          node.classList.add('invalid');
          setTimeout(()=>node.classList.remove('invalid'),180);
        }
        return;
      }

      // quick visual swap of img src for immediate feedback
      const a = document.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"] img`);
      const b = document.querySelector(`.cell[data-r="${r2}"][data-c="${c2}"] img`);
      if(!a || !b){
        warn('cells not found for swap', r1,c1,r2,c2);
        return;
      }
      const tmp = a.src; a.src = b.src; b.src = tmp;

      const res = GameCore.attemptSwap(r1,c1,r2,c2);
      if(!res.ok){
        // revert after small delay with shake
        const cellA = a.closest('.cell'), cellB = b.closest('.cell');
        if(cellA) cellA.classList.add('invalid');
        if(cellB) cellB.classList.add('invalid');
        setTimeout(()=>{
          // revert images
          const t2 = a.src; a.src = b.src; b.src = t2;
          if(cellA) cellA.classList.remove('invalid');
          if(cellB) cellB.classList.remove('invalid');
        }, 220);
        // update stats only
        setTimeout(()=> updateStats(), 10);
        return;
      }

      // valid swap -> play pop sound (if exists), animate removals
      try { if(window.Sound && typeof Sound.play === 'function') Sound.play('pop'); } catch(e){}
      // animate pop then render (GameCore already did collapse+refill in attemptSwap)
      animatePopThenRender(()=>{
        updateStats();
        // check win
        const st = GameCore.getState();
        if(st.score >= st.target){
          try { if(window.Sound && typeof Sound.play === 'function') Sound.play('win'); } catch(e){}
          try { if(window.Confetti && typeof Confetti.fire === 'function') Confetti.fire(); } catch(e){}
          window.dispatchEvent(new CustomEvent('level-complete',{detail:{state:st}}));
        }
      });
    }
  }

  function updateStats(){
    const st = GameCore.getState();
    if(!st) return;
    if($id('score')) $id('score').textContent = st.score;
    if($id('moves')) $id('moves').textContent = st.moves;
    if($id('target')) $id('target').textContent = st.target;
  }

  // controls
  function attachControls(){
    const bRestart = $id('btnRestart');
    const bShuffle = $id('btnShuffle');
    const bEnd = $id('btnEnd');
    if(bRestart) bRestart.addEventListener('click', ()=>{ GameCore.start(GameCore.getState().level); renderAll(); });
    if(bShuffle) bShuffle.addEventListener('click', ()=>{ GameCore.shuffleBoard(); renderAll(); });
    if(bEnd) bEnd.addEventListener('click', ()=>{ alert('End'); });
  }

  function renderAll(){
    renderAll = undefined; // harmless - keep original name separate
    renderAll = function(){ // placeholder to allow function hoisting earlier
      // actual render implemented above (closure) - call it
    };
  }

  // initialization
  function init(){
    try {
      if(!document.getElementById('gameGrid')) throw new Error('missing #gameGrid');
      renderAll = function(){ renderAll = null; }; // no-op if redefined below
      // call initial render
      renderAll = function(){ renderAll = null; }; // safety
    } catch(e){
      console.error('[UI] init error', e);
    }

    // real init:
    renderAll = function(){ renderAll = null; }; // again safety
    // Now proper calls:
    try {
      // if GameCore not started yet, start default level 1
      if(!GameCore.getState()) GameCore.start(1);
      // render & attach
      renderAll = function(){ renderAll = null; }; // noop fallback
      // call the actual render function above
      // (we just invoke the top-level renderAll function defined earlier)
      // But earlier we placed renderAll implementation at top; call its local implementation via closure:
    } catch(e){}
    // finally call concrete steps:
    renderAllConcrete();
    attachInput();
    attachControls();
    log('UI initialized');
  }

  // Because of closure ordering, we place the concrete renderAll implementation as a named function:
  function renderAllConcrete(){
    renderAllConcrete = null;
    // actual rendering call:
    // reuse the earlier renderAll implementation from top-level by invoking renderBoard function there:
    // but to avoid confusion, call the same code:
    const st = GameCore.getState();
    if(!st) { warn('no state in renderAllConcrete'); return; }
    // update stats + build grid
    if($id('score')) $id('score').textContent = st.score;
    if($id('moves')) $id('moves').textContent = st.moves;
    if($id('target')) $id('target').textContent = st.target;

    const grid = $id('gameGrid');
    if(!grid) return;
    grid.style.gridTemplateColumns = `repeat(${st.cols}, var(--cell-size,64px))`;
    grid.innerHTML = '';
    for(let r=0;r<st.rows;r++){
      for(let c=0;c<st.cols;c++){
        const v = st.board[r][c];
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = `images/candy${v}.png`;
        img.alt = 'candy';
        img.onerror = ()=> img.src = ERR_IMG;
        cell.appendChild(img);
        grid.appendChild(cell);
      }
    }
  }

  // expose init & quick render
  window.GameUI = {
    init,
    render: function(){ renderAllConcrete && renderAllConcrete(); }
  };

})();

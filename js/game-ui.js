// js/game-ui.js
// Renders board, attaches pointer/touch, animates pop/fall and calls Game.attemptSwapAndResolve
window.UI = (function(){
  const log = (...a)=> console.log('[UI]', ...a);
  const err = (...a)=> console.error('[UI]', ...a);

  function el(id){ return document.getElementById(id); }
  const gridWrapSelector = '.game-grid-container';

  function renderBoard(){
    const st = Game.getState();
    if(!st) return;
    const grid = el('gameGrid');
    if(!grid) return;
    // set cols var (responsive script may override)
    grid.style.setProperty('--cols', st.cols);
    grid.style.gridTemplateColumns = `repeat(${st.cols}, var(--cell-size,64px))`;
    grid.innerHTML = '';
    for(let r=0;r<st.rows;r++){
      for(let c=0;c<st.cols;c++){
        const val = st.board[r][c];
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.alt = 'candy';
        img.src = `images/candy${val}.png`;
        img.onerror = ()=> { img.src = 'images/candy1.png'; };
        cell.appendChild(img);
        grid.appendChild(cell);
      }
    }
  }

  function updateStats(){
    const st = Game.getState();
    if(!st) return;
    if(el('score')) el('score').textContent = st.score;
    if(el('moves')) el('moves').textContent = st.moves;
    if(el('target')) el('target').textContent = st.target;
  }

  // animate removal: add .pop to specific coordinates then after animation render board again
  function animateRemoveAndRefill(callback){
    // Add pop class to all empty (0) cells: we will add pop and then render after short timeout
    const grid = el('gameGrid');
    if(!grid) return callback && callback();
    const cells = grid.querySelectorAll('.cell');
    cells.forEach(cell=>{
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      const st = Game.getState();
      if(st && st.board[r][c] === 0){
        cell.classList.add('pop');
      }
    });
    // wait for animation
    setTimeout(()=>{
      // after pop animation, render board (collapse & refill already done in Game)
      renderBoard();
      callback && callback();
    }, 240);
  }

  // input handling (pointer/touch)
  function attachInput(){
    const grid = el('gameGrid');
    if(!grid) return;
    let start = null;

    function getPointer(e){
      if(e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    grid.addEventListener('pointerdown', onDown, {passive:false});
    grid.addEventListener('touchstart', onDown, {passive:false});
    window.addEventListener('pointermove', onMove);
    window.addEventListener('touchmove', onMove, {passive:true});
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchend', onUp);

    function onDown(e){
      const cell = e.target.closest('.cell');
      if(!cell) return;
      start = {
        r: Number(cell.dataset.r),
        c: Number(cell.dataset.c),
        x: getPointer(e).x,
        y: getPointer(e).y,
        node: cell
      };
      cell.classList.add('dragging');
      e.preventDefault();
    }
    function onMove(e){
      if(!start) return;
      const p = getPointer(e);
      const dx = p.x - start.x, dy = p.y - start.y;
      const threshold = 18;
      if(Math.abs(dx) > threshold || Math.abs(dy) > threshold){
        let dr=0, dc=0;
        if(Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
        else dr = dy > 0 ? 1 : -1;
        trySwap(start.r, start.c, start.r+dr, start.c+dc, start.node);
        start.node.classList.remove('dragging');
        start = null;
      }
    }
    function onUp(){ if(start && start.node) start.node.classList.remove('dragging'); start = null; }

    function trySwap(r1,c1,r2,c2, node){
      const st = Game.getState();
      if(!st) return;
      if(r2<0||c2<0||r2>=st.rows||c2>=st.cols){
        if(node){ node.classList.add('invalid'); setTimeout(()=>node.classList.remove('invalid'),200); }
        return;
      }
      // animate swap visually by swapping DOM images first (so user sees movement)
      const a = document.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"] img`);
      const b = document.querySelector(`.cell[data-r="${r2}"][data-c="${c2}"] img`);
      if(!a || !b) return;
      // temporarily swap src
      const tmp = a.src;
      a.src = b.src;
      b.src = tmp;

      // call core attempt
      const res = Game.attemptSwapAndResolve(r1,c1,r2,c2);
      if(!res.ok){
        // invalid swap -> animate shake then revert
        const cA = a.closest('.cell'), cB = b.closest('.cell');
        if(cA) cA.classList.add('invalid');
        if(cB) cB.classList.add('invalid');
        setTimeout(()=>{
          // revert src
          const t2 = a.src; a.src = b.src; b.src = t2;
          if(cA) cA.classList.remove('invalid');
          if(cB) cB.classList.remove('invalid');
        }, 240);
        if(window.Sound && typeof Sound.play === 'function') try{ Sound.play('swap'); }catch(e){}
        updateAll();
        return;
      }
      // valid swap -> play sound and animate removals
      if(window.Sound && typeof Sound.play === 'function') try{ Sound.play('pop'); }catch(e){}
      // Game already did collapse+refill internally; animate pop on removed then render
      animateRemoveAndRefill(()=>{
        updateAll();
        // check win condition
        const state = Game.getState();
        if(state.score >= state.target){
          if(window.Sound && typeof Sound.play === 'function') try{ Sound.play('win'); }catch(e){}
          if(window.Confetti && typeof Confetti.fire === 'function') try{ Confetti.fire(); }catch(e){}
          // dispatch level complete
          window.dispatchEvent(new CustomEvent('level-complete', {detail:{state}}));
        }
      });
    }
  }

  function updateAll(){ renderBoard(); updateStats(); }

  function initUI(){
    try {
      // ensure DOM elements exist
      if(!el('gameGrid')) throw new Error('gameGrid missing');
      renderBoard();
      attachInput();
      updateAll();

      // buttons
      if(el('btnRestart')) el('btnRestart').addEventListener('click', ()=> { Game.start(Game.getState().level); updateAll(); });
      if(el('btnShuffle')) el('btnShuffle').addEventListener('click', ()=> { Game.makeBoard(); renderBoard(); updateAll(); });
      if(el('btnEnd')) el('btnEnd').addEventListener('click', ()=> { alert('End'); });

      // events from Game
      window.addEventListener('game-started', ()=> updateAll());
      window.addEventListener('game-ready', ()=> updateAll());

      log('UI ready');
    } catch(e){
      err('UI init error', e);
      throw e;
    }
  }

  return { init: initUI, renderBoard, updateAll };
})();

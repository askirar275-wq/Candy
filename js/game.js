// js/game.js - input handling + UI glue for GameCore
(function(){
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');
  const levelComplete = document.getElementById('levelComplete');
  const completeScore = document.getElementById('completeScore');
  const btnReplay = document.getElementById('btnReplay');
  const btnNext = document.getElementById('btnNext');
  const btnEnd = document.getElementById('btnEnd');
  const btnRestart = document.getElementById('btnRestart');

  if(!gridEl) return;

  const meta = GameCore.getMeta();
  const ROWS = meta.ROWS, COLS = meta.COLS;

  // adjust columns to screen width
  function adjustGrid(){
    const maxW = Math.min(window.innerWidth - 40, 720);
    const gap = 12;
    const totalGap = (COLS - 1) * gap;
    const cell = Math.floor((maxW - totalGap) / COLS);
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${cell}px)`;
    document.querySelectorAll('.game-grid .cell').forEach(c => { c.style.width = cell + 'px'; c.style.height = cell + 'px'; });
  }
  window.addEventListener('resize', adjustGrid);

  // render function
  function render(state){
    gridEl.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = 'images/candy' + (state.grid[r][c]) + '.png';
        img.alt = 'candy';
        img.draggable = false;
        cell.appendChild(img);
        cell.addEventListener('pointerdown', onPointerDown);
        gridEl.appendChild(cell);
      }
    }
    adjustGrid();

    if(levelTitle) levelTitle.textContent = 'Level ' + (state.level || 1);
    if(scoreEl) scoreEl.textContent = state.score;
    if(movesEl) movesEl.textContent = state.moves;
    if(targetEl) targetEl.textContent = state.target;
    if(starsEl){
      const pct = Math.min(1, state.score / Math.max(1,state.target));
      if(pct>=0.66) starsEl.textContent = '★ ★ ★';
      else if(pct>=0.33) starsEl.textContent = '★ ★ ☆';
      else starsEl.textContent = '☆ ☆ ☆';
    }

    // show complete if ended
    if(state.status === 'won' || state.status === 'lost'){
      completeScore.textContent = state.score;
      levelComplete.classList.remove('hidden');
    } else {
      levelComplete.classList.add('hidden');
    }
  }

  GameCore.onUpdate(render);

  // pointer handling (simple swipe)
  let pstate = null;
  const THRESH = 12;
  function onPointerDown(e){
    try { if(e.cancelable) e.preventDefault(); } catch(_){}
    const el = e.currentTarget;
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
    pstate = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      r: Number(el.dataset.r),
      c: Number(el.dataset.c),
      el
    };
    document.addEventListener('pointermove', onPointerMove, {passive:false});
    document.addEventListener('pointerup', onPointerUp, {passive:false});
    document.addEventListener('pointercancel', onPointerCancel, {passive:false});
  }
  function onPointerMove(e){
    if(!pstate || e.pointerId !== pstate.id) return;
    try { if(e.cancelable) e.preventDefault(); } catch(_){}
    // nothing visual — simple swipe detection on up
  }
  function onPointerUp(e){
    if(!pstate || e.pointerId !== pstate.id) return;
    const dx = e.clientX - pstate.startX;
    const dy = e.clientY - pstate.startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    pstate.el.releasePointerCapture && pstate.el.releasePointerCapture(e.pointerId);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);

    if(Math.max(adx,ady) < THRESH){ pstate = null; return; }
    let dir = null;
    if(adx > ady) dir = dx>0 ? 'right' : 'left';
    else dir = dy>0 ? 'down' : 'up';

    let nr = pstate.r, nc = pstate.c;
    if(dir === 'left') nc = pstate.c -1;
    if(dir === 'right') nc = pstate.c +1;
    if(dir === 'up') nr = pstate.r -1;
    if(dir === 'down') nr = pstate.r +1;

    if(nr<0 || nr>=ROWS || nc<0 || nc>=COLS){ pstate=null; return; }

    // ask core to try swap
    const ok = GameCore.trySwap(pstate.r,pstate.c,nr,nc);
    if(!ok){
      // optionally show quick invalid feedback
      // flash cell
      flashCells([document.querySelector(`.cell[data-r="${pstate.r}"][data-c="${pstate.c}"]`),
                  document.querySelector(`.cell[data-r="${nr}"][data-c="${nc}"]`)]);
      Sound.play && Sound.play('swap');
    } else {
      Sound.play && Sound.play('swap');
    }
    pstate = null;
  }
  function onPointerCancel(e){
    if(!pstate || e.pointerId !== pstate.id) return;
    try { pstate.el.releasePointerCapture && pstate.el.releasePointerCapture(e.pointerId); } catch(_){}
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    pstate = null;
  }

  function flashCells(nodes){
    nodes.forEach(n => { if(!n) return; n.classList.add('swap-anim'); setTimeout(()=>n.classList.remove('swap-anim'), 200); });
  }

  // UI buttons
  btnRestart && btnRestart.addEventListener('click', ()=> {
    const s = GameCore.getState();
    Game.start(s.level || 1);
  });
  btnEnd && btnEnd.addEventListener('click', ()=> {
    location.hash = '#map';
  });
  btnReplay && btnReplay.addEventListener('click', ()=> {
    const s = GameCore.getState(); Game.start(s.level || 1);
  });
  btnNext && btnNext.addEventListener('click', ()=> {
    const s = GameCore.getState(); Game.start((s.level||1)+1);
  });

  // expose Game facade
  window.Game = {
    start(level){
      const s = GameCore.start(level);
      render(s);
      setTimeout(adjustGrid,50);
      return s;
    }
  };

  // initial small render if state exists
  try { const s = GameCore.getState(); if(s) render(s); } catch(e){}
})();

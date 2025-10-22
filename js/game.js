// js/game.js - UI + pointer/touch handlers + animations + cascade/refill
// Requires: storage.js and game-core.js to be loaded first.

const Game = (function(){
  const LEVEL_META = {
    1: { target: 600, star2: 1000, star3: 1600 },
    2: { target: 800, star2: 1400, star3: 2000 },
    default: { target: 1200, star2: 2200, star3: 3200 }
  };

  // state
  let grid = [];
  let level = 1;
  let score = 0;
  let moves = 30;
  let selected = null;
  let dragState = null;

  // DOM refs
  const boardEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');

  function getMeta(l){ return LEVEL_META[l] || LEVEL_META.default; }

  /* ---------- render ---------- */
  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    grid.forEach((color, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;

      const img = document.createElement('img');
      img.src = `images/candy${(color % GameCore.COLORS) + 1}.png`;
      img.alt = 'candy';
      img.draggable = false;
      cell.appendChild(img);

      // pointer handlers
      cell.addEventListener('pointerdown', onPointerDown);
      cell.addEventListener('pointermove', onPointerMove);
      cell.addEventListener('pointerup', onPointerUp);
      cell.addEventListener('pointercancel', onPointerCancel);

      // touch fallback
      cell.addEventListener('touchstart', onTouchStart, { passive: false });
      cell.addEventListener('touchmove', onTouchMove, { passive: false });
      cell.addEventListener('touchend', onTouchEnd, { passive: false });

      // click fallback
      cell.addEventListener('click', onCellClick);

      if(selected === i) cell.classList.add('selected');

      boardEl.appendChild(cell);
    });

    if(scoreEl) scoreEl.textContent = score;
    if(movesEl) movesEl.textContent = moves;
    if(targetEl) targetEl.textContent = getMeta(level).target;
    if(levelTitle) levelTitle.textContent = `Level ${level}`;
    updateStarsUI();
  }

  function updateStarsUI(){
    if(!starsEl) return;
    const meta = getMeta(level);
    const starEls = starsEl.querySelectorAll('.star');
    starEls.forEach((s,i) => {
      s.classList.toggle('on', i===0 ? score >= meta.target : i===1 ? score >= meta.star2 : score >= meta.star3);
    });
  }

  /* ---------- click fallback ---------- */
  function onCellClick(e){
    if(dragState && dragState.dragging) return;
    const idx = Number(e.currentTarget.dataset.index);
    if(selected === null){ selected = idx; render(); return; }
    if(selected === idx){ selected = null; render(); return; }
    if(!GameCore.areAdjacent(selected, idx)){ selected = idx; render(); return; }
    attemptSwap(selected, idx);
  }

  /* ---------- swap attempt + cascade flow ---------- */
  async function attemptSwap(a,b){
    const possible = GameCore.trySwapAndFindMatches(grid, a, b);
    if(!possible || possible.length === 0){
      // invalid swap — animate a small shake/scale by doing transient transform
      await animateSwap(a,b,true);
      selected = null;
      render();
      return;
    }

    await animateSwap(a,b,false);
    GameCore.swap(grid, a, b);
    moves = Math.max(0, moves - 1);
    await processCascadeWithAnimations();
    selected = null;
    render();
    checkEndConditions();
  }

  /* ---------- visual swap (cloned tiles) ---------- */
  function animateSwap(a,b,revert){
    return new Promise(resolve => {
      const elA = boardEl.querySelector(`[data-index="${a}"]`);
      const elB = boardEl.querySelector(`[data-index="${b}"]`);
      if(!elA || !elB){ resolve(); return; }

      const rA = elA.getBoundingClientRect();
      const rB = elB.getBoundingClientRect();

      const cloneA = elA.cloneNode(true);
      const cloneB = elB.cloneNode(true);
      cloneA.classList.add('dragging-clone');
      cloneB.classList.add('dragging-clone');

      [cloneA, cloneB].forEach((cl, i) => {
        cl.style.position = 'fixed';
        cl.style.left = (i===0 ? rA.left : rB.left) + 'px';
        cl.style.top  = (i===0 ? rA.top  : rB.top)  + 'px';
        cl.style.width = rA.width + 'px';
        cl.style.height = rA.height + 'px';
        cl.style.margin = 0;
        cl.style.zIndex = 9999;
        document.body.appendChild(cl);
      });

      elA.style.visibility = 'hidden';
      elB.style.visibility = 'hidden';

      const dx = rB.left - rA.left, dy = rB.top - rA.top;
      requestAnimationFrame(() => {
        cloneA.style.transition = 'transform 220ms ease';
        cloneB.style.transition = 'transform 220ms ease';
        cloneA.style.transform = `translate(${dx}px, ${dy}px)`;
        cloneB.style.transform = `translate(${-dx}px, ${-dy}px)`;
      });

      setTimeout(() => {
        cloneA.remove(); cloneB.remove();
        elA.style.visibility = '';
        elB.style.visibility = '';
        if(revert){
          elA.style.transform = 'scale(.96)';
          elB.style.transform = 'scale(.96)';
          setTimeout(()=>{ elA.style.transform=''; elB.style.transform=''; resolve(); }, 140);
        } else {
          resolve();
        }
      }, 260);
    });
  }

  /* ---------- cascade: find matches -> animate fade -> collapse -> refill -> repeat ---------- */
  async function processCascadeWithAnimations(){
    while(true){
      const matches = GameCore.findMatches(grid);
      if(!matches || matches.length === 0) break;

      // add fade class to matched DOM nodes
      matches.forEach(i => {
        const el = boardEl.querySelector(`[data-index="${i}"]`);
        if(el) el.classList.add('fade-out');
      });

      // wait fade
      await wait(180);

      // collapse & refill
      const result = GameCore.collapseAndRefill(grid, matches);
      grid = result.grid;

      // rerender and animate drop-in
      render();
      const cells = Array.from(boardEl.querySelectorAll('.cell'));
      cells.forEach(c => c.classList.add('drop-in'));
      // second frame to trigger transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => cells.forEach(c => c.classList.add('show')));
      });

      await wait(360);
      // cleanup
      cells.forEach(c => c.classList.remove('drop-in','show','fade-out'));

      // scoring simple formula
      score += matches.length * 60;
      if(scoreEl) scoreEl.textContent = score;

      // small pause then check again
      await wait(80);
    }
  }

  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

  /* ---------- check end ---------- */
  function checkEndConditions(){
    const meta = getMeta(level);
    if(score >= meta.target){
      Storage.unlock(level + 1);
      location.href = `gameover.html?level=${level}&score=${score}`;
      return;
    }
    if(moves <= 0){
      location.href = `gameover.html?level=${level}&score=${score}`;
    }
  }

  /* ---------- Pointer / touch dragging handlers ---------- */
  function onPointerDown(e){
    e.preventDefault();
    const el = e.currentTarget;
    const idx = Number(el.dataset.index);
    try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch(e){}
    dragState = {
      startIdx: idx,
      currentIdx: idx,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      originEl: el,
      clone: null,
      dragging: false
    };
  }

  function onPointerMove(e){
    if(!dragState || dragState.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(!dragState.dragging && dist > 8){
      // start dragging visual clone
      dragState.dragging = true;
      const rect = dragState.originEl.getBoundingClientRect();
      const clone = dragState.originEl.cloneNode(true);
      clone.classList.add('dragging-clone');
      clone.style.position = 'fixed';
      clone.style.left = rect.left + 'px';
      clone.style.top  = rect.top  + 'px';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.zIndex = 9999;
      document.body.appendChild(clone);
      dragState.clone = clone;
      dragState.originEl.style.visibility = 'hidden';
    }
    if(dragState.dragging && dragState.clone){
      dragState.clone.style.transform = `translate(${dx}px, ${dy}px)`;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if(!under) return;
      const cell = under.closest && under.closest('.cell');
      if(cell){
        const hoverIdx = Number(cell.dataset.index);
        if(hoverIdx !== dragState.currentIdx && GameCore.areAdjacent(dragState.startIdx, hoverIdx)){
          dragState.currentIdx = hoverIdx;
        }
      }
    }
  }

  function onPointerUp(e){
    if(!dragState || dragState.pointerId !== e.pointerId) return;
    const start = dragState.startIdx;
    const end = dragState.currentIdx;
    if(dragState.clone){ dragState.clone.remove(); dragState.clone = null; }
    if(dragState.originEl) dragState.originEl.style.visibility = '';
    if(dragState.dragging && end !== start && GameCore.areAdjacent(start, end)){
      attemptSwap(start, end);
    } else {
      // treat like click fallback
      if(!dragState.dragging){
        if(selected === null){ selected = start; render(); }
        else if(selected === start){ selected = null; render(); }
        else if(GameCore.areAdjacent(selected, start)) attemptSwap(selected, start);
        else { selected = start; render(); }
      }
    }
    dragState = null;
  }

  function onPointerCancel(e){
    if(!dragState || dragState.pointerId !== e.pointerId) return;
    if(dragState.clone) dragState.clone.remove();
    if(dragState.originEl) dragState.originEl.style.visibility = '';
    dragState = null;
  }

  /* ---------- touch fallback (maps to pointer handlers) ---------- */
  function onTouchStart(ev){
    if(!ev.touches || ev.touches.length === 0) return;
    ev.preventDefault();
    const touch = ev.touches[0];
    const el = ev.currentTarget;
    onPointerDown({ currentTarget: el, clientX: touch.clientX, clientY: touch.clientY, pointerId: (Date.now()%100000) });
  }
  function onTouchMove(ev){
    if(!ev.touches || ev.touches.length === 0) return;
    ev.preventDefault();
    const touch = ev.touches[0];
    if(!dragState) return;
    onPointerMove({ clientX: touch.clientX, clientY: touch.clientY, pointerId: dragState.pointerId });
  }
  function onTouchEnd(ev){
    ev.preventDefault();
    if(!dragState) return;
    onPointerUp({ pointerId: dragState.pointerId });
  }

  /* ---------- public api ---------- */
  function start(lvl){
    level = Number(lvl) || 1;
    score = 0;
    moves = 30;
    selected = null;
    grid = GameCore.generateGrid();
    render();
    // process any accidental initial matches with animation
    setTimeout(()=> processCascadeWithAnimations().then(()=> render()), 60);
  }

  function restart(){ start(level); }
  function getState(){ return { level, score, moves }; }

  // expose to window (game.html starter uses Game.start)
  window.setCurrentLevel = function(n){ level = Number(n); };

  return { start, restart, getState };
})();

// js/game.js (updated) - includes star targets per level + click-and-drag swap
// Depends on GameCore, Storage and Nav objects already present.

const Game = (function(){
  // config
  const LEVEL_META = {
    // level: { target: scoreNeededFor1Star, star2: threshold, star3: threshold }
    1: { target: 800, star2: 1400, star3: 2200 },
    2: { target: 900, star2: 1600, star3: 2600 },
    3: { target: 1000, star2: 1900, star3: 2800 },
    4: { target: 1100, star2: 2100, star3: 3200 },
    5: { target: 1200, star2: 2300, star3: 3500 },
    // fallback meta
    default: { target: 1200, star2: 2200, star3: 3200 }
  };

  // state
  let grid = [];
  let level = 1;
  let score = 0;
  let moves = 30;
  let selected = null;
  let dragState = null; // {startIdx, currentIdx, startX, startY, elClone}
  const boardEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');

  // helper to get meta
  function getMeta(lvl){
    return LEVEL_META[lvl] || LEVEL_META.default;
  }

  // render UI
  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    // create cells
    grid.forEach((color, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      // background color mapping
      const colors = ['#f44336','#ff9800','#ffeb3b','#4caf50','#2196f3'];
      cell.style.background = colors[color % colors.length];
      // pointer events
      cell.addEventListener('pointerdown', onPointerDown);
      cell.addEventListener('pointerup', onPointerUp);
      cell.addEventListener('pointercancel', onPointerCancel);
      cell.addEventListener('pointermove', onPointerMove);
      // click fallback
      cell.addEventListener('click', onCellClick);
      // show selected outline
      if(selected === i) cell.style.outline = '4px solid rgba(255,255,255,0.25)';
      boardEl.appendChild(cell);
    });
    // HUD
    scoreEl && (scoreEl.textContent = score);
    movesEl && (movesEl.textContent = moves);
    const meta = getMeta(level);
    targetEl && (targetEl.textContent = meta.target);
    updateStarsUI();
    levelTitle && (levelTitle.textContent = `Level ${level}`);
  }

  // update stars based on current score & level meta
  function updateStarsUI(){
    if(!starsEl) return;
    const meta = getMeta(level);
    const starEls = Array.from(starsEl.querySelectorAll('.star'));
    starEls.forEach(s => s.classList.remove('on'));
    if(score >= meta.target) starEls[0] && starEls[0].classList.add('on');
    if(score >= meta.star2) starEls[1] && starEls[1].classList.add('on');
    if(score >= meta.star3) starEls[2] && starEls[2].classList.add('on');
  }

  // click selection flow (fallback for non-drag)
  function onCellClick(e){
    // prevent double-trigger when dragging
    if(dragState && dragState.dragging) return;
    const idx = Number(e.currentTarget.dataset.index);
    if(selected === null){
      selected = idx; render(); return;
    }
    if(selected === idx){ selected = null; render(); return; }
    if(!GameCore.areAdjacent(selected, idx)){ selected = idx; render(); return; }
    // process swap attempt
    attemptSwap(selected, idx);
  }

  // ATTEMPT SWAP: check matches, commit or revert
  async function attemptSwap(a,b){
    const matches = GameCore.trySwapAndFindMatches(grid, a, b);
    if(matches.length === 0){
      // visual revert animation
      await animateSwap(a,b,true);
      selected = null;
      render();
      return;
    }
    // valid move
    await animateSwap(a,b,false);
    // commit swap in grid
    GameCore.swap(grid, a, b);
    moves = Math.max(0, moves-1);
    // process cascades and scoring
    await processMatchesCascade();
    selected = null;
    render();
    checkGameEnd();
  }

  // animate swap (same as previous but adapt to pointer moves)
  function animateSwap(a,b,revert){
    return new Promise(resolve=>{
      const elA = boardEl.querySelector(`[data-index="${a}"]`);
      const elB = boardEl.querySelector(`[data-index="${b}"]`);
      if(!elA || !elB){ resolve(); return; }
      const rectA = elA.getBoundingClientRect();
      const rectB = elB.getBoundingClientRect();
      const cloneA = elA.cloneNode(true);
      const cloneB = elB.cloneNode(true);
      [cloneA,cloneB].forEach(cl=>{
        cl.style.position='fixed';
        cl.style.left = `${cl === cloneA ? rectA.left : rectB.left}px`;
        cl.style.top  = `${cl === cloneA ? rectA.top  : rectB.top }px`;
        cl.style.width = `${rectA.width}px`;
        cl.style.height = `${rectA.height}px`;
        cl.style.zIndex = 9999;
        document.body.appendChild(cl);
      });
      elA.style.visibility='hidden'; elB.style.visibility='hidden';
      const dx = rectB.left - rectA.left;
      const dy = rectB.top - rectA.top;
      cloneA.style.transition = 'transform 210ms ease';
      cloneB.style.transition = 'transform 210ms ease';
      cloneA.style.transform = `translate(${dx}px,${dy}px)`;
      cloneB.style.transform = `translate(${-dx}px,${-dy}px)`;
      setTimeout(()=> {
        cloneA.remove(); cloneB.remove();
        elA.style.visibility=''; elB.style.visibility='';
        if(revert){
          // tiny shake to indicate invalid move
          elA.style.transform = 'scale(.96)'; elB.style.transform = 'scale(.96)';
          setTimeout(()=>{ elA.style.transform=''; elB.style.transform=''; resolve(); }, 140);
        } else resolve();
      }, 260);
    });
  }

  // process matches cascade with scoring & small delays
  async function processMatchesCascade(){
    while(true){
      const matches = GameCore.findMatches(grid);
      if(matches.length === 0) break;
      // scoring: base 60 per tile * multiplier for chain length
      const base = 60;
      const gained = matches.length * base;
      score += gained;
      // optional sound
      try{ window.Sound && window.Sound.play && window.Sound.play('pop'); }catch(e){}
      // remove & refill
      const res = GameCore.collapseAndRefill(grid, matches);
      grid = res.grid;
      render();
      await wait(240);
    }
  }

  function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

  // GAME END check
  function checkGameEnd(){
    const meta = getMeta(level);
    if(score >= meta.target){
      // success; show game over as level complete
      finishLevel(true);
      return;
    }
    if(moves <= 0){
      finishLevel(score >= meta.target);
    }
  }

  function finishLevel(won){
    // show final score; unlock next on win
    const finalScoreEl = document.getElementById('finalScore');
    if(finalScoreEl) finalScoreEl.textContent = score;
    if(won) Storage.unlock(level+1);
    Nav.show('gameOver');
  }

  // ------------ Drag handlers (pointer API) ------------
  function onPointerDown(e){
    e.preventDefault();
    const el = e.currentTarget;
    const idx = Number(el.dataset.index);
    // capture pointer to this element
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
    dragState = {
      startIdx: idx,
      currentIdx: idx,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      dragging: false,
      clone: null,
      originEl: el
    };
  }

  function onPointerMove(e){
    if(!dragState || dragState.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    // if minimal move threshold passed, start dragging visuals
    if(!dragState.dragging && dist > 8){
      dragState.dragging = true;
      // create clone
      const originRect = dragState.originEl.getBoundingClientRect();
      const clone = dragState.originEl.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = `${originRect.left}px`;
      clone.style.top = `${originRect.top}px`;
      clone.style.width = `${originRect.width}px`;
      clone.style.height = `${originRect.height}px`;
      clone.style.zIndex = 9999;
      clone.classList.add('dragging');
      document.body.appendChild(clone);
      dragState.clone = clone;
      dragState.originEl.style.visibility = 'hidden';
    }
    if(dragState.dragging && dragState.clone){
      dragState.clone.style.transform = `translate(${dx}px, ${dy}px)`;
      // determine nearest neighbor under pointer
      const ptX = e.clientX; const ptY = e.clientY;
      const elUnder = document.elementFromPoint(ptX, ptY);
      if(!elUnder) return;
      const cell = elUnder.closest && elUnder.closest('.cell');
      if(cell){
        const idxHover = Number(cell.dataset.index);
        // if hovering a different adjacent cell, show small highlight
        if(idxHover !== dragState.currentIdx && GameCore.areAdjacent(dragState.startIdx, idxHover)){
          dragState.currentIdx = idxHover;
        }
      }
    }
  }

  function onPointerUp(e){
    if(!dragState || dragState.pointerId !== e.pointerId) return;
    const start = dragState.startIdx;
    const end = dragState.currentIdx;
    // cleanup visuals
    if(dragState.clone){ dragState.clone.remove(); dragState.clone = null; }
    dragState.originEl && (dragState.originEl.style.visibility = '');
    // if was dragging and ended on adjacent, attempt swap
    if(dragState.dragging && end !== start && GameCore.areAdjacent(start, end)){
      attemptSwap(start, end);
    } else {
      // click fallback (if not dragging) — selection flow
      if(!dragState.dragging){
        // emulate click selection
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
    dragState.originEl && (dragState.originEl.style.visibility = '');
    dragState = null;
  }

  // PUBLIC API
  function start(lvl){
    level = Number(lvl) || 1;
    score = 0;
    moves = 30;
    selected = null;
    grid = GameCore.generateGrid();
    render();
    Nav.show('game');
  }
  function restart(){ start(level); }
  function getState(){ return { level, score, moves }; }

  // Expose setCurrentLevel for integration (if Nav needs)
  window.setCurrentLevel = function(n){ level = Number(n); };

  return { start, restart, getState };
})();

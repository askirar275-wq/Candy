// js/game.js
// UI integration: image tiles, drag (pointer) + click fallback, scoring, stars, moves, cascade.
// Depends on GameCore, Storage and Nav to exist.

const Game = (function(){
  // level meta thresholds (customize as needed)
  const LEVEL_META = {
    1: { target: 600,  star2: 1000, star3: 1600 },
    2: { target: 800,  star2: 1400, star3: 2000 },
    3: { target: 1000, star2: 1700, star3: 2500 },
    4: { target: 1200, star2: 2000, star3: 2800 },
    5: { target: 1500, star2: 2400, star3: 3200 },
    6: { target: 1800, star2: 2700, star3: 3600 },
    7: { target: 2100, star2: 3000, star3: 4000 },
    8: { target: 2500, star2: 3400, star3: 4500 },
    9: { target: 3000, star2: 4000, star3: 5000 },
    default: { target: 1200, star2: 2200, star3: 3200 }
  };

  // state
  let grid = [];
  let level = 1;
  let score = 0;
  let moves = 30;
  let selected = null;
  let dragState = null; // { startIdx, currentIdx, startX, startY, pointerId, clone, originEl, dragging }
  const boardEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');

  function getMeta(lvl){
    return LEVEL_META[lvl] || LEVEL_META.default;
  }

  // Render board: image tiles
  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    grid.forEach((color, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      // image for this color
      const img = document.createElement('img');
      // image index cycles 1..5
      const imageIndex = (color % GameCore.COLORS) + 1;
      img.src = `images/candy${imageIndex}.png`;
      img.alt = 'candy';
      cell.appendChild(img);
      // attach pointer events for drag
      cell.addEventListener('pointerdown', onPointerDown);
      cell.addEventListener('pointermove', onPointerMove);
      cell.addEventListener('pointerup', onPointerUp);
      cell.addEventListener('pointercancel', onPointerCancel);
      // click fallback
      cell.addEventListener('click', onCellClick);
      // highlight selected
      if(selected === i) cell.style.outline = '4px solid rgba(255,255,255,0.25)';
      boardEl.appendChild(cell);
    });
    // HUD updates
    scoreEl && (scoreEl.textContent = score);
    movesEl && (movesEl.textContent = moves);
    targetEl && (targetEl.textContent = getMeta(level).target);
    updateStarsUI();
    levelTitle && (levelTitle.textContent = `Level ${level}`);
  }

  function updateStarsUI(){
    if(!starsEl) return;
    const meta = getMeta(level);
    const starEls = Array.from(starsEl.querySelectorAll('.star'));
    starEls.forEach(s => s.classList.remove('on'));
    if(score >= meta.target) starEls[0] && starEls[0].classList.add('on');
    if(score >= meta.star2)  starEls[1] && starEls[1].classList.add('on');
    if(score >= meta.star3)  starEls[2] && starEls[2].classList.add('on');
  }

  // Click fallback: selection / attempt swap
  function onCellClick(e){
    // avoid click if dragging
    if(dragState && dragState.dragging) return;
    const idx = Number(e.currentTarget.dataset.index);
    if(selected === null){ selected = idx; render(); return; }
    if(selected === idx){ selected = null; render(); return; }
    if(!GameCore.areAdjacent(selected, idx)){ selected = idx; render(); return; }
    attemptSwap(selected, idx);
  }

  // Attempt swap: check matches then commit or revert
  async function attemptSwap(a,b){
    const matches = GameCore.trySwapAndFindMatches(grid, a, b);
    if(matches.length === 0){
      // invalid, show swap animation then revert
      await animateSwap(a,b,true);
      selected = null;
      render();
      return;
    }
    // valid move
    await animateSwap(a,b,false);
    GameCore.swap(grid, a, b);
    moves = Math.max(0, moves - 1);
    await processMatchesCascade();
    selected = null;
    render();
    checkGameEnd();
  }

  // animate swap visually using clones
  function animateSwap(a,b,revert){
    return new Promise(resolve => {
      const elA = boardEl.querySelector(`[data-index="${a}"]`);
      const elB = boardEl.querySelector(`[data-index="${b}"]`);
      if(!elA || !elB){ resolve(); return; }
      const rectA = elA.getBoundingClientRect();
      const rectB = elB.getBoundingClientRect();
      const cloneA = elA.cloneNode(true);
      const cloneB = elB.cloneNode(true);
      [cloneA, cloneB].forEach(cl=>{
        cl.style.position = 'fixed';
        cl.style.left = `${cl === cloneA ? rectA.left : rectB.left}px`;
        cl.style.top  = `${cl === cloneA ? rectA.top  : rectB.top }px`;
        cl.style.width = `${rectA.width}px`;
        cl.style.height = `${rectA.height}px`;
        cl.style.zIndex = 9999;
        document.body.appendChild(cl);
      });
      elA.style.visibility = 'hidden'; elB.style.visibility = 'hidden';
      const dx = rectB.left - rectA.left;
      const dy = rectB.top  - rectA.top;
      cloneA.style.transition = 'transform 220ms ease'; cloneB.style.transition = 'transform 220ms ease';
      cloneA.style.transform = `translate(${dx}px, ${dy}px)`; cloneB.style.transform = `translate(${-dx}px, ${-dy}px)`;
      setTimeout(()=> {
        cloneA.remove(); cloneB.remove();
        elA.style.visibility = ''; elB.style.visibility = '';
        if(revert){
          elA.style.transform = 'scale(.96)'; elB.style.transform = 'scale(.96)';
          setTimeout(()=>{ elA.style.transform=''; elB.style.transform=''; resolve(); }, 150);
        } else resolve();
      }, 280);
    });
  }

  // process all cascades until no matches remain
  async function processMatchesCascade(){
    while(true){
      const matches = GameCore.findMatches(grid);
      if(matches.length === 0) break;
      // score: base per tile
      const base = 60;
      score += matches.length * base;
      // optional sound
      if(window.Sound && typeof window.Sound.play === 'function'){
        try{ window.Sound.play('pop'); } catch(e){}
      }
      // remove & refill
      const res = GameCore.collapseAndRefill(grid, matches);
      grid = res.grid;
      render();
      await wait(260);
    }
  }

  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  function checkGameEnd(){
    const meta = getMeta(level);
    if(score >= meta.target){
      finishLevel(true);
      return;
    }
    if(moves <= 0){
      finishLevel(score >= meta.target);
    }
  }

  function finishLevel(won){
    // set final score in UI
    const finalScoreEl = document.getElementById('finalScore');
    if(finalScoreEl) finalScoreEl.textContent = score;
    if(won) Storage.unlock(level + 1);
    Nav.show('gameOver');
  }

  // ---------- Pointer (drag) handlers ----------
  function onPointerDown(e){
    e.preventDefault();
    const el = e.currentTarget;
    const idx = Number(el.dataset.index);
    // capture pointer on element (for pointermove/up)
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
      // start dragging visual
      dragState.dragging = true;
      const originRect = dragState.originEl.getBoundingClientRect();
      const clone = dragState.originEl.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = `${originRect.left}px`;
      clone.style.top  = `${originRect.top}px`;
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
      // find element under pointer to detect neighbor
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
      // fallback: treat as click selection if not dragging
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

  // helper to allow Nav to set current level externally
  window.setCurrentLevel = function(n){ level = Number(n); };

  return { start, restart, getState };
})();

// js/game.js
// UI + drag + click fallback + full cascade processing

const Game = (function(){
  const LEVEL_META = {
    1: { target: 600, star2:1000, star3:1600 },
    2: { target: 800, star2:1400, star3:2000 },
    3: { target:1000, star2:1700, star3:2500 },
    default: { target:1200, star2:2200, star3:3200 }
  };

  let grid = [];
  let level = 1;
  let score = 0;
  let moves = 30;
  let selected = null;
  let dragState = null;

  const boardEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');

  function getMeta(l){ return LEVEL_META[l] || LEVEL_META.default; }

  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    grid.forEach((color,i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      const img = document.createElement('img');
      const imgIndex = (color % GameCore.COLORS) + 1;
      img.src = `images/candy${imgIndex}.png`;
      img.alt = 'candy';
      cell.appendChild(img);

      // pointer events (for drag)
      cell.addEventListener('pointerdown', onPointerDown);
      cell.addEventListener('pointermove', onPointerMove);
      cell.addEventListener('pointerup', onPointerUp);
      cell.addEventListener('pointercancel', onPointerCancel);
      // click fallback
      cell.addEventListener('click', onCellClick);

      if(selected === i) cell.style.outline = '4px solid rgba(255,255,255,0.25)';
      boardEl.appendChild(cell);
    });

    if(scoreEl) scoreEl.textContent = score;
    if(movesEl) movesEl.textContent = moves;
    if(targetEl) targetEl.textContent = getMeta(level).target;
    updateStarsUI();
    if(levelTitle) levelTitle.textContent = `स्तर ${level}`; // Hindi label like screenshot
  }

  function updateStarsUI(){
    if(!starsEl) return;
    const meta = getMeta(level);
    const starEls = Array.from(starsEl.querySelectorAll('.star'));
    starEls.forEach(s=>s.classList.remove('on'));
    if(score >= meta.target) starEls[0] && starEls[0].classList.add('on');
    if(score >= meta.star2) starEls[1] && starEls[1].classList.add('on');
    if(score >= meta.star3) starEls[2] && starEls[2].classList.add('on');
  }

  // click fallback
  function onCellClick(e){
    if(dragState && dragState.dragging) return;
    const idx = Number(e.currentTarget.dataset.index);
    if(selected === null){ selected = idx; render(); return; }
    if(selected === idx){ selected = null; render(); return; }
    if(!GameCore.areAdjacent(selected, idx)){ selected = idx; render(); return; }
    attemptSwap(selected, idx);
  }

  async function attemptSwap(a,b){
    const matches = GameCore.trySwapAndFindMatches(grid,a,b);
    if(matches.length === 0){
      // animate invalid swap then revert
      await animateSwap(a,b,true);
      selected = null;
      render();
      return;
    }
    await animateSwap(a,b,false);
    GameCore.swap(grid,a,b);
    moves = Math.max(0,moves-1);
    await processMatchesCascade();
    selected = null;
    render();
    checkGameEnd();
  }

  function animateSwap(a,b,revert){
    return new Promise(resolve=>{
      const elA = boardEl.querySelector(`[data-index="${a}"]`);
      const elB = boardEl.querySelector(`[data-index="${b}"]`);
      if(!elA || !elB){ resolve(); return; }
      const ra = elA.getBoundingClientRect(), rb = elB.getBoundingClientRect();
      const cloneA = elA.cloneNode(true), cloneB = elB.cloneNode(true);
      [cloneA,cloneB].forEach((cl,i)=> {
        cl.style.position='fixed';
        cl.style.left = (i===0?ra.left:rb.left) + 'px';
        cl.style.top  = (i===0?ra.top:rb.top) + 'px';
        cl.style.width = ra.width + 'px';
        cl.style.height = ra.height + 'px';
        cl.style.zIndex = 9999;
        document.body.appendChild(cl);
      });
      elA.style.visibility='hidden'; elB.style.visibility='hidden';
      const dx = rb.left - ra.left, dy = rb.top - ra.top;
      cloneA.style.transition = 'transform 200ms ease'; cloneB.style.transition = 'transform 200ms ease';
      cloneA.style.transform = `translate(${dx}px,${dy}px)`; cloneB.style.transform = `translate(${-dx}px,${-dy}px)`;
      setTimeout(()=> {
        cloneA.remove(); cloneB.remove();
        elA.style.visibility=''; elB.style.visibility='';
        if(revert){
          elA.style.transform='scale(.96)'; elB.style.transform='scale(.96)';
          setTimeout(()=>{ elA.style.transform=''; elB.style.transform=''; resolve(); }, 150);
        } else resolve();
      }, 260);
    });
  }

  async function processMatchesCascade(){
    while(true){
      const matches = GameCore.findMatches(grid);
      if(matches.length === 0) break;
      // scoring
      const base = 60;
      score += matches.length * base;
      // collapse & refill
      const res = GameCore.collapseAndRefill(grid, matches);
      grid = res.grid;
      render();
      // small delay so user sees cascade
      await wait(260);
    }
  }

  function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

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
    const finalScoreEl = document.getElementById('finalScore');
    if(finalScoreEl) finalScoreEl.textContent = score;
    if(won) Storage.unlock(level + 1);
    Nav.show('gameOver');
  }

  // Pointer drag handlers
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
      // start clone
      dragState.dragging = true;
      const rect = dragState.originEl.getBoundingClientRect();
      const clone = dragState.originEl.cloneNode(true);
      clone.style.position='fixed'; clone.style.left = rect.left + 'px'; clone.style.top = rect.top + 'px';
      clone.style.width = rect.width + 'px'; clone.style.height = rect.height + 'px'; clone.style.zIndex = 9999;
      clone.classList.add('dragging');
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
    if(dragState.dragging && end !== start && GameCore.areAdjacent(start,end)){
      attemptSwap(start,end);
    } else {
      // selection fallback
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

  // Public
  function start(lvl){
    level = Number(lvl) || 1;
    score = 0;
    moves = 30;
    selected = null;
    grid = GameCore.generateGrid();
    // ensure no immediate matches remain (safety)
    // process initial cascades if any (rare)
    render();
    Nav.show('game');
    // small auto-process in case generateGrid left matches
    setTimeout(()=> processMatchesCascade().then(()=> render()), 80);
  }
  function restart(){ start(level); }
  function getState(){ return { level, score, moves }; }

  window.setCurrentLevel = function(n){ level = Number(n); };

  return { start, restart, getState };
})();

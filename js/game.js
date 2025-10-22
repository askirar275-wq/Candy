// js/game.js (final) — includes Sound.play and Particles.burstAt integration
// Requires: storage.js, sound.js (optional), particles.js (optional), confetti.js (optional), game-core.js

const Game = (function(){
  const LEVEL_META = {
    1: { target: 600, star2: 1000, star3: 1600 },
    2: { target: 800, star2: 1400, star3: 2000 },
    default: { target: 1200, star2: 2200, star3: 3200 }
  };

  let grid = [];
  let level = 1;
  let score = 0;
  let moves = 30;
  let selected = null;
  let dragState = null;
  let isProcessing = false;
  let combo = 0;

  // DOM refs
  const boardEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const starsEl = document.getElementById('stars');
  const levelTitle = document.getElementById('levelTitle');
  const endBtn = document.getElementById('endBtn');

  function getMeta(l){ return LEVEL_META[l] || LEVEL_META.default; }

  /* ---------- render ---------- */
  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    grid.forEach((t, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;

      const img = document.createElement('img');
      img.src = `images/candy${(t.c % GameCore.COLORS) + 1}.png`;
      img.alt = 'candy';
      img.draggable = false;
      cell.appendChild(img);

      // special badge
      if(t.s){
        const badge = document.createElement('div');
        badge.style.position='absolute';
        badge.style.right='6px';
        badge.style.top='6px';
        badge.style.width='18px';
        badge.style.height='18px';
        badge.style.borderRadius='4px';
        badge.style.fontSize='11px';
        badge.style.display='flex';
        badge.style.alignItems='center';
        badge.style.justifyContent='center';
        badge.style.background='rgba(255,255,255,0.9)';
        badge.style.boxShadow='0 4px 10px rgba(0,0,0,0.08)';
        badge.textContent = (t.s==='row') ? '─' : (t.s==='bomb' ? '•' : '★');
        cell.appendChild(badge);
      }

      // pointer events
      cell.addEventListener('pointerdown', onPointerDown);
      cell.addEventListener('pointermove', onPointerMove);
      cell.addEventListener('pointerup', onPointerUp);
      cell.addEventListener('pointercancel', onPointerCancel);
      // touch fallback
      cell.addEventListener('touchstart', onTouchStart, { passive:false });
      cell.addEventListener('touchmove', onTouchMove, { passive:false });
      cell.addEventListener('touchend', onTouchEnd, { passive:false });
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
      if(i===0) s.classList.toggle('on', score >= meta.target);
      if(i===1) s.classList.toggle('on', score >= meta.star2);
      if(i===2) s.classList.toggle('on', score >= meta.star3);
    });
  }

  /* ---------- click fallback ---------- */
  function onCellClick(e){
    if(isProcessing) return;
    if(dragState && dragState.dragging) return;
    const idx = Number(e.currentTarget.dataset.index);
    if(selected === null){ selected = idx; render(); return; }
    if(selected === idx){ selected = null; render(); return; }
    if(!GameCore.areAdjacent(selected, idx)){ selected = idx; render(); return; }
    attemptSwap(selected, idx);
  }

  /* ---------- attempt swap ---------- */
  async function attemptSwap(a,b){
    if(isProcessing) return;
    isProcessing = true;

    // color-bomb activation detection (swap color-bomb with a normal candy)
    const ta = grid[a], tb = grid[b];
    let colorBombActivation = null;
    if(ta && ta.s === 'color' && tb){
      colorBombActivation = { bombIdx: a, color: tb.c };
    } else if(tb && tb.s === 'color' && ta){
      colorBombActivation = { bombIdx: b, color: ta.c };
    }

    // check possible matches on swap
    const possible = GameCore.trySwapAndFindMatches(grid, a, b);

    if(!possible || possible.length === 0){
      // allow color-bomb activation without regular match
      if(colorBombActivation){
        try { await animateSwap(a,b,false); } catch(e){}
        // remove all of that color
        const targets = [];
        for(let i=0;i<grid.length;i++) if(grid[i].c === colorBombActivation.color) targets.push(i);
        await processRemovalsWithSpecials(targets, colorBombActivation.bombIdx);
        selected = null;
        render();
        isProcessing = false;
        checkEndConditions();
        return;
      }
      // invalid swap — animate and revert (play swap sound too)
      await animateSwap(a,b,true);
      selected = null;
      render();
      isProcessing = false;
      return;
    }

    // valid swap
    try { await animateSwap(a,b,false); } catch(e){}
    try { GameCore.swap(grid, a, b); } catch(e){}
    // play swap sound
    try { if(typeof Sound !== 'undefined') Sound.play('swap'); } catch(e){}

    // decrement moves
    moves = Math.max(0, moves - 1);

    // find matches and create suggested specials
    const matchInfo = GameCore.findMatchesWithSpecials(grid);
    if(matchInfo.specials && matchInfo.specials.length){
      for(const sp of matchInfo.specials){
        if(grid[sp.pos]) grid[sp.pos].s = sp.kind;
      }
    }

    combo = 0;
    await processCascadeWithAnimations();
    selected = null;
    render();
    isProcessing = false;
    checkEndConditions();
  }

  /* ---------- animate swap (visual) ---------- */
  function animateSwap(a,b,revert){
    return new Promise(resolve => {
      const elA = boardEl.querySelector(`[data-index="${a}"]`);
      const elB = boardEl.querySelector(`[data-index="${b}"]`);
      if(!elA || !elB){ resolve(); return; }
      const rA = elA.getBoundingClientRect(), rB = elB.getBoundingClientRect();
      const cloneA = elA.cloneNode(true), cloneB = elB.cloneNode(true);
      cloneA.classList.add('dragging-clone'); cloneB.classList.add('dragging-clone');
      [cloneA, cloneB].forEach((cl,i)=>{
        cl.style.position='fixed';
        cl.style.left = (i===0? rA.left : rB.left) + 'px';
        cl.style.top  = (i===0? rA.top  : rB.top)  + 'px';
        cl.style.width = rA.width + 'px';
        cl.style.height = rA.height + 'px';
        cl.style.margin = 0; cl.style.zIndex = 9999;
        document.body.appendChild(cl);
      });
      elA.style.visibility='hidden'; elB.style.visibility='hidden';
      const dx = rB.left - rA.left, dy = rB.top - rA.top;
      requestAnimationFrame(()=> {
        cloneA.style.transition = 'transform 220ms ease';
        cloneB.style.transition = 'transform 220ms ease';
        cloneA.style.transform = `translate(${dx}px, ${dy}px)`;
        cloneB.style.transform = `translate(${-dx}px, ${-dy}px)`;
      });
      setTimeout(()=> {
        cloneA.remove(); cloneB.remove();
        elA.style.visibility=''; elB.style.visibility='';
        if(revert){
          elA.style.transform='scale(.96)'; elB.style.transform='scale(.96)';
          setTimeout(()=>{ elA.style.transform=''; elB.style.transform=''; resolve(); }, 140);
        } else resolve();
      }, 260);
    });
  }

  /* ---------- process cascade + animations (includes specials & particles & sfx) ---------- */
  async function processCascadeWithAnimations(){
    combo = 0;
    while(true){
      let info = GameCore.findMatchesWithSpecials(grid);
      let removed = info.removed || [];
      if(removed.length === 0) break;

      // expand removed due to specials (row/bomb) present
      removed = GameCore.expandRemovedBySpecials(grid, removed);

      // remove color-bomb triggers that may be in removed (we'll handle below)
      // animate fade and particle for each removed cell
      removed.forEach(i => {
        const el = boardEl.querySelector(`[data-index="${i}"]`);
        if(el) el.classList.add('fade-out');
        try { if(typeof Particles !== 'undefined' && el) Particles.burstAt(el, { count: 6 }); } catch(e){}
      });

      // play pop sound once per batch
      try { if(typeof Sound !== 'undefined') Sound.play('pop'); } catch(e){}

      await wait(180);

      // handle any color-bomb tiles inside removed: remove all of that color
      const colorBombTriggers = [];
      for(const i of removed){
        if(grid[i] && grid[i].s === 'color'){
          colorBombTriggers.push({ idx: i, color: grid[i].c });
        }
      }
      for(const trig of colorBombTriggers){
        for(let j=0;j<grid.length;j++){
          if(grid[j].c === trig.color) removed.push(j);
        }
      }
      removed = Array.from(new Set(removed));

      // scoring with combo multiplier
      combo++;
      const addScore = removed.length * 60 * combo;
      score += addScore;

      // collapse & refill
      const result = GameCore.collapseAndRefill(grid, removed);
      grid = result.grid;

      // rerender and show drop-in
      render();
      const cells = Array.from(boardEl.querySelectorAll('.cell'));
      cells.forEach(c => c.classList.add('drop-in'));
      requestAnimationFrame(()=> requestAnimationFrame(()=> cells.forEach(c => c.classList.add('show'))));
      await wait(360);
      cells.forEach(c => c.classList.remove('drop-in','show','fade-out'));

      if(scoreEl) scoreEl.textContent = score;
      await wait(80);
    }
  }

  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

  /* ---------- helper for removals triggered directly (e.g., color-bomb swap) ---------- */
  async function processRemovalsWithSpecials(removedIndices, originBombIdx){
    // unified removal flow: animate, particles, scoring, collapse
    let removed = Array.from(new Set(removedIndices));
    if(removed.length === 0) return;
    // animate
    removed.forEach(i => {
      const el = boardEl.querySelector(`[data-index="${i}"]`);
      if(el) el.classList.add('fade-out');
      try { if(typeof Particles !== 'undefined' && el) Particles.burstAt(el, { count: 8 }); } catch(e){}
    });
    try { if(typeof Sound !== 'undefined') Sound.play('pop'); } catch(e){}

    await wait(180);

    // if originBombIdx exists and is a color bomb, we already removed color set; otherwise check specials expansion
    removed = GameCore.expandRemovedBySpecials(grid, removed);

    // scoring (single big combo)
    combo++;
    score += removed.length * 60 * combo;

    const result = GameCore.collapseAndRefill(grid, removed);
    grid = result.grid;
    render();
    const cells = Array.from(boardEl.querySelectorAll('.cell'));
    cells.forEach(c => c.classList.add('drop-in'));
    requestAnimationFrame(()=> requestAnimationFrame(()=> cells.forEach(c => c.classList.add('show'))));
    await wait(360);
    cells.forEach(c => c.classList.remove('drop-in','show','fade-out'));

    if(scoreEl) scoreEl.textContent = score;
  }

  /* ---------- check end ---------- */
  function checkEndConditions(){
    const meta = getMeta(level);
    if(score >= meta.target){
      Storage.unlock(level + 1);
      // celebration: confetti + win sound
      try { if(typeof Confetti !== 'undefined') Confetti.burst({count:80}); } catch(e){}
      try { if(typeof Sound !== 'undefined') Sound.play('win'); } catch(e){}
      // small delay so player sees confetti
      setTimeout(()=> { location.href = `gameover.html?level=${level}&score=${score}`; }, 700);
      return;
    }
    if(moves <= 0){
      setTimeout(()=> { location.href = `gameover.html?level=${level}&score=${score}`; }, 180);
    }
  }

  /* ---------- pointer/touch handlers ---------- */
  function onPointerDown(e){
    if(isProcessing) return;
    e.preventDefault();
    const el = e.currentTarget;
    const idx = Number(el.dataset.index);
    try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch(e){}
    dragState = { startIdx: idx, currentIdx: idx, startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, originEl: el, clone: null, dragging: false };
  }

  function onPointerMove(e){
    if(!dragState || dragState.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(!dragState.dragging && dist > 8){
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

  function onTouchStart(ev){
    if(!ev.touches || ev.touches.length===0) return;
    ev.preventDefault();
    const touch = ev.touches[0];
    const el = ev.currentTarget;
    onPointerDown({ currentTarget: el, clientX: touch.clientX, clientY: touch.clientY, pointerId: (Date.now()%100000) });
  }
  function onTouchMove(ev){
    if(!ev.touches || ev.touches.length===0) return;
    ev.preventDefault();
    const touch = ev.touches[0];
    if(!dragState) return;
    onPointerMove({ clientX: touch.clientX, clientY: touch.clientY, pointerId: dragState.pointerId });
  }
  function onTouchEnd(ev){
    if(!dragState) return;
    onPointerUp({ pointerId: dragState.pointerId });
  }

  /* ---------- public API ---------- */
  function start(lvl){
    level = Number(lvl) || 1;
    score = 0;
    moves = 30;
    selected = null;
    isProcessing = false;
    combo = 0;
    grid = GameCore.generateGrid();
    render();
    // process accidental initial matches
    setTimeout(()=> processCascadeWithAnimations().then(()=> render()), 60);

    // End button handler
    if(endBtn) endBtn.onclick = (ev) => { ev.preventDefault(); const s = getState(); location.href = `gameover.html?level=${s.level}&score=${s.score}`; };

    // autoplay background if available and not muted (attempt)
    try { if(typeof Sound !== 'undefined' && !Sound.isMuted()) Sound.play('bg'); } catch(e){}
  }

  function restart(){ start(level); }
  function getState(){ return { level, score, moves }; }

  // expose for debugging if needed
  return { start, restart, getState };
})();

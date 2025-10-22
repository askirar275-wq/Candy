// js/game.js (updated: combo scoring, special candies, confetti)
// Requires game-core.js and confetti.js loaded first.

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

      // show special overlay icon small
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

      // pointer / touch handlers
      cell.addEventListener('pointerdown', onPointerDown);
      cell.addEventListener('pointermove', onPointerMove);
      cell.addEventListener('pointerup', onPointerUp);
      cell.addEventListener('pointercancel', onPointerCancel);
      cell.addEventListener('touchstart', onTouchStart, { passive:false });
      cell.addEventListener('touchmove', onTouchMove, { passive:false });
      cell.addEventListener('touchend', onTouchEnd, { passive:false });
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

  function onCellClick(e){
    if(isProcessing) return;
    if(dragState && dragState.dragging) return;
    const idx = Number(e.currentTarget.dataset.index);
    if(selected === null){ selected = idx; render(); return; }
    if(selected === idx){ selected = null; render(); return; }
    if(!GameCore.areAdjacent(selected, idx)){ selected = idx; render(); return; }
    attemptSwap(selected, idx);
  }

  async function attemptSwap(a,b){
    if(isProcessing) return;
    isProcessing = true;
    // check if either is color-bomb and other is color -> special handling
    const ta = grid[a], tb = grid[b];
    let colorBombActivation = null;
    if(ta.s === 'color' && tb){
      // ta is color-bomb: removes all of color tb.c
      colorBombActivation = { bombIdx: a, color: tb.c };
    } else if(tb.s === 'color' && ta){
      colorBombActivation = { bombIdx: b, color: ta.c };
    }

    const possible = GameCore.trySwapAndFindMatches(grid, a, b);
    if(!possible || possible.length === 0){
      // if color bomb activation, still allow activation without standard match? We'll allow: color bomb + swap with a color triggers.
      if(colorBombActivation){
        // remove all of that color
        const targets = [];
        for(let i=0;i<grid.length;i++) if(grid[i].c === colorBombActivation.color) targets.push(i);
        await animateSwap(a,b,false);
        // clear targets
        await processRemovalsWithSpecials(targets, colorBombActivation.bombIdx);
        isProcessing = false;
        selected = null;
        render();
        checkEndConditions();
        return;
      }
      await animateSwap(a,b,true);
      selected = null;
      render();
      isProcessing = false;
      return;
    }

    // valid swap
    await animateSwap(a,b,false);
    GameCore.swap(grid, a, b);
    moves = Math.max(0, moves - 1);

    // after swap, check if special should be created based on matching groups:
    // find matches with specials return structure
    let matchInfo = GameCore.findMatchesWithSpecials(grid);
    // create specials for lengths detected (the core returns suggested specials)
    if(matchInfo.specials && matchInfo.specials.length){
      for(const sp of matchInfo.specials){
        // create special only if tile at pos still exists and not already special
        if(grid[sp.pos]) grid[sp.pos].s = sp.kind;
      }
    }

    // process cascades with combo scoring
    combo = 0;
    await processCascadeWithAnimations();
    selected = null;
    render();
    checkEndConditions();
    isProcessing = false;
  }

  // animate swap visually (same as earlier)
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
        if(revert){ elA.style.transform='scale(.96)'; elB.style.transform='scale(.96)';
          setTimeout(()=>{ elA.style.transform=''; elB.style.transform=''; resolve(); },140);
        } else resolve();
      }, 260);
    });
  }

  // process removals including special triggered clears; combo multiplier applied
  async function processCascadeWithAnimations(){
    combo = 0;
    while(true){
      let m = GameCore.findMatchesWithSpecials(grid);
      let removed = m.removed || [];
      if(removed.length === 0) break;

      // expand removals due to special tiles present inside removed
      removed = GameCore.expandRemovedBySpecials(grid, removed);

      // apply fade class to matched DOM nodes
      removed.forEach(i => {
        const el = boardEl.querySelector(`[data-index="${i}"]`);
        if(el) el.classList.add('fade-out');
      });
      await wait(180);

      // remove specials which were consumed: if a special tile removed, it may have its own effect (colorbomb handled earlier)
      // compute special activations: if any removed index had s==='color' and it wasn't triggered earlier, trigger as full-color remove
      let colorBombTriggers = [];
      for(const i of removed){
        if(grid[i] && grid[i].s === 'color'){
          colorBombTriggers.push({ idx: i, color: grid[i].c });
        }
      }
      // apply color-bomb effects (remove that color across board)
      for(const trig of colorBombTriggers){
        for(let j=0;j<grid.length;j++){
          if(grid[j].c === trig.color) removed.push(j);
        }
      }
      // dedup removed
      removed = Array.from(new Set(removed));

      // scoring with combo:
      combo++;
      const addScore = removed.length * 60 * combo;
      score += addScore;

      // collapse
      const result = GameCore.collapseAndRefill(grid, removed);
      grid = result.grid;

      // rerender and animate drop-in
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

  function checkEndConditions(){
    const meta = getMeta(level);
    if(score >= meta.target){
      Storage.unlock(level + 1);
      // celebration
      try{ Confetti.burst({count:80}); }catch(e){}
      // navigate to gameover
      setTimeout(()=> location.href = `gameover.html?level=${level}&score=${score}`, 700);
      return;
    }
    if(moves <= 0){
      setTimeout(()=> location.href = `gameover.html?level=${level}&score=${score}`, 200);
    }
  }

  /* ---------- pointer/touch handlers (same as earlier) ---------- */
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
    const dx = e.clientX - dragState.startX; const dy = e.clientY - dragState.startY;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if(!dragState.dragging && dist > 8){
      dragState.dragging = true;
      const rect = dragState.originEl.getBoundingClientRect();
      const clone = dragState.originEl.cloneNode(true); clone.classList.add('dragging-clone');
      clone.style.position='fixed'; clone.style.left = rect.left + 'px'; clone.style.top = rect.top + 'px';
      clone.style.width = rect.width + 'px'; clone.style.height = rect.height + 'px'; clone.style.zIndex = 9999;
      document.body.appendChild(clone); dragState.clone = clone; dragState.originEl.style.visibility = 'hidden';
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
    const start = dragState.startIdx, end = dragState.currentIdx;
    if(dragState.clone){ dragState.clone.remove(); dragState.clone = null; }
    if(dragState.originEl) dragState.originEl.style.visibility = '';
    if(dragState.dragging && end !== start && GameCore.areAdjacent(start,end)){
      attemptSwap(start,end);
    } else {
      if(!dragState.dragging){
        if(selected === null){ selected = start; render(); }
        else if(selected === start){ selected = null; render(); }
        else if(GameCore.areAdjacent(selected,start)) attemptSwap(selected,start);
        else { selected = start; render(); }
      }
    }
    dragState = null;
  }
  function onPointerCancel(e){ if(!dragState || dragState.pointerId !== e.pointerId) return; if(dragState.clone) dragState.clone.remove(); if(dragState.originEl) dragState.originEl.style.visibility = ''; dragState = null; }
  function onTouchStart(ev){ if(!ev.touches || ev.touches.length===0) return; ev.preventDefault(); const touch = ev.touches[0]; const el = ev.currentTarget; onPointerDown({ currentTarget: el, clientX: touch.clientX, clientY: touch.clientY, pointerId: (Date.now()%100000) }); }
  function onTouchMove(ev){ if(!ev.touches || ev.touches.length===0) return; ev.preventDefault(); const touch = ev.touches[0]; if(!dragState) return; onPointerMove({ clientX: touch.clientX, clientY: touch.clientY, pointerId: dragState.pointerId }); }
  function onTouchEnd(ev){ if(!dragState) return; onPointerUp({ pointerId: dragState.pointerId }); }

  // public API
  function start(lvl){
    level = Number(lvl) || 1;
    score = 0; moves = 30; selected = null; isProcessing = false; combo = 0;
    grid = GameCore.generateGrid();
    render();
    setTimeout(()=> processCascadeWithAnimations().then(()=> render()), 60);
    if(endBtn) endBtn.onclick = (ev)=>{ ev.preventDefault(); const s = getState(); location.href = `gameover.html?level=${s.level}&score=${s.score}`; };
  }
  function restart(){ start(level); }
  function getState(){ return { level, score, moves }; }

  return { start, restart, getState };
})();

// js/game.js (updated - supports specials, obstacles, timed levels, combos)
(function(){
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const timerEl = document.getElementById('timer');
  const levelTitle = document.getElementById('levelTitle');
  const starsEl = document.getElementById('stars');
  const overTitle = document.getElementById('overTitle');
  const overScore = document.getElementById('overScore');

  let grid = [];
  let level = 1;
  let score = 0;
  let moves = 30;
  let processing = false;
  let selected = null;
  let dragging = null;
  let combo = 0;
  let timerId = null;
  let timeLeft = 0;

  // level meta: you can set type:'timed' with seconds, or default moves-based
  function LEVEL_META(l){
    // example mapping:
    const base = { target: 600 * Math.min(3,l), moves: 30, type:'moves' };
    if(l>=4 && l<=6) base.target = 1200*l;
    // make level 3 timed as example
    if(l === 3) { base.type = 'timed'; base.seconds = 45; delete base.moves; }
    return base;
  }

  // UI rendering
  function renderGrid(){
    if(!gridEl) return;
    gridEl.style.gridTemplateColumns = `repeat(${GameCore.COLS}, 1fr)`;
    gridEl.innerHTML = '';
    grid.forEach((t,i)=>{
      const cell = document.createElement('div');
      cell.className='cell';
      cell.dataset.index = i;

      const img = document.createElement('img');
      img.src = `images/candy${(t.c % GameCore.COLORS)+1}.png`;
      img.alt = 'candy';
      cell.appendChild(img);

      // obstacle badge
      if(t.o){
        const o = document.createElement('div');
        o.className = 'obs';
        o.textContent = t.o.hits;
        o.style.position='absolute'; o.style.left='6px'; o.style.top='6px';
        o.style.background='rgba(255,255,255,0.95)'; o.style.padding='2px 6px'; o.style.borderRadius='10px';
        cell.appendChild(o);
      }

      // special badge
      if(t.s){
        const badge = document.createElement('div');
        badge.className='badge';
        badge.textContent = t.s === 'color' ? '★' : (t.s === 'row' ? '—' : '︱');
        badge.style.position='absolute'; badge.style.right='6px'; badge.style.top='6px';
        badge.style.background='rgba(255,255,255,0.95)'; badge.style.padding='2px 6px'; badge.style.borderRadius='8px';
        cell.appendChild(badge);
      }

      // pointer handlers
      cell.addEventListener('pointerdown', e=>{ try{ if(e.preventDefault) e.preventDefault(); }catch(_){}; onPointerDown(e,cell); });
      cell.addEventListener('pointermove', e=> onPointerMove(e,cell));
      cell.addEventListener('pointerup', e=> onPointerUp(e,cell));
      cell.addEventListener('pointercancel', ()=> onPointerCancel());
      cell.addEventListener('click', ()=> onClickCell(i));

      if(selected === i) cell.classList.add('selected');
      gridEl.appendChild(cell);
    });
    updateUI();
  }

  function updateUI(){
    scoreEl.textContent = score;
    movesEl.textContent = (LEVEL_META(level).type === 'timed') ? '—' : moves;
    targetEl.textContent = LEVEL_META(level).target;
    updateStars();
    if(LEVEL_META(level).type === 'timed'){
      timerEl.textContent = formatTime(timeLeft || LEVEL_META(level).seconds);
    } else timerEl.textContent = '--:--';
  }

  function formatTime(sec){
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s/60);
    const ss = (s%60).toString().padStart(2,'0');
    return `${m}:${ss}`;
  }

  function updateStars(){
    const meta = LEVEL_META(level);
    const st = starsEl.querySelectorAll('.star');
    st.forEach((el,i)=>{
      if(i === 0) el.classList.toggle('on', score >= meta.target);
      if(i === 1) el.classList.toggle('on', score >= meta.target + 600);
      if(i === 2) el.classList.toggle('on', score >= meta.target + 1200);
      el.textContent = el.classList.contains('on') ? '★' : '☆';
    });
  }

  // input handlers (click and drag)
  function onClickCell(idx){
    if(processing) return;
    if(selected === null){ selected = idx; renderGrid(); return; }
    if(selected === idx){ selected = null; renderGrid(); return; }
    if(!GameCore.areAdjacent(selected, idx)){ selected = idx; renderGrid(); return; }
    attemptSwap(selected, idx);
  }

  // simplified drag (pointer) handlers (we keep existing implementation)
  function onPointerDown(e, el){
    if(processing) return;
    const idx = Number(el.dataset.index);
    dragging = { startIdx: idx, currentIdx: idx, startX: e.clientX, startY: e.clientY, dragging:false, clone:null, pointerId: e.pointerId };
    try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch(e){}
  }
  function onPointerMove(e){
    if(!dragging) return;
    const dx = e.clientX - dragging.startX, dy = e.clientY - dragging.startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(!dragging.dragging && dist > 8){
      // start drag clone
      dragging.dragging = true;
      const origin = gridEl.querySelector(`[data-index="${dragging.startIdx}"]`);
      if(origin){
        const rect = origin.getBoundingClientRect();
        const clone = origin.cloneNode(true);
        clone.classList.add('dragging-clone');
        clone.style.position='fixed';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.zIndex = 9999;
        document.body.appendChild(clone);
        origin.style.visibility='hidden';
        dragging.clone = clone;
      }
    }
    if(dragging.dragging && dragging.clone){
      dragging.clone.style.transform = `translate(${dx}px, ${dy}px)`;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if(!under) return;
      const cell = under.closest && under.closest('.cell');
      if(cell){
        const hoverIdx = Number(cell.dataset.index);
        if(hoverIdx !== dragging.currentIdx && GameCore.areAdjacent(dragging.startIdx, hoverIdx)){
          dragging.currentIdx = hoverIdx;
        }
      }
    }
  }
  function onPointerUp(e){
    if(!dragging) return;
    const start = dragging.startIdx, end = dragging.currentIdx;
    if(dragging.clone){ dragging.clone.remove(); const origin = gridEl.querySelector(`[data-index="${start}"]`); if(origin) origin.style.visibility=''; }
    if(dragging.dragging && end !== start && GameCore.areAdjacent(start,end)){
      attemptSwap(start,end);
    } else {
      if(!dragging.dragging){
        if(selected === null){ selected = start; renderGrid(); }
        else if(selected === start){ selected = null; renderGrid(); }
        else if(GameCore.areAdjacent(selected,start)) attemptSwap(selected,start);
        else { selected = start; renderGrid(); }
      }
    }
    dragging = null;
  }
  function onPointerCancel(){ if(dragging && dragging.clone) dragging.clone.remove(); dragging = null; }

  // attempt swap: verify creates matches, animate, commit and cascade
  async function attemptSwap(a,b){
    if(processing) return;
    processing = true;
    try { Sound && Sound.play && Sound.play('swap'); } catch(e){}
    const possible = GameCore.trySwapAndFindMatches(grid, a, b);
    if(!possible || possible.length === 0){
      await animateSwap(a,b,true);
      selected = null; renderGrid(); processing = false; return;
    }
    await animateSwap(a,b,false);
    GameCore.swap(grid,a,b);
    // decrement moves if level is moves type
    if(LEVEL_META(level).type !== 'timed') moves = Math.max(0, moves-1);
    await cascadeProcess();
    selected = null;
    renderGrid();
    checkEnd();
    processing = false;
  }

  function animateSwap(a,b,revert){
    return new Promise((resolve)=>{
      const elA = gridEl.querySelector(`[data-index="${a}"]`);
      const elB = gridEl.querySelector(`[data-index="${b}"]`);
      if(!elA || !elB){ resolve(); return; }
      const rA=elA.getBoundingClientRect(), rB=elB.getBoundingClientRect();
      const cloneA=elA.cloneNode(true), cloneB=elB.cloneNode(true);
      [cloneA,cloneB].forEach((cl,i)=>{
        cl.classList.add('dragging-clone');
        cl.style.position='fixed';
        cl.style.left = (i===0? rA.left : rB.left) + 'px';
        cl.style.top  = (i===0? rA.top  : rB.top)  + 'px';
        cl.style.width = rA.width + 'px';
        cl.style.height = rA.height + 'px';
        cl.style.zIndex = 9999;
        document.body.appendChild(cl);
      });
      elA.style.visibility='hidden'; elB.style.visibility='hidden';
      const dx = rB.left - rA.left, dy = rB.top - rA.top;
      requestAnimationFrame(()=> {
        cloneA.style.transition='transform 200ms ease'; cloneB.style.transition='transform 200ms ease';
        cloneA.style.transform = `translate(${dx}px, ${dy}px)`;
        cloneB.style.transform = `translate(${-dx}px, ${-dy}px)`;
      });
      setTimeout(()=> {
        cloneA.remove(); cloneB.remove();
        elA.style.visibility=''; elB.style.visibility='';
        resolve();
      }, 260);
    });
  }

  // cascade: detect matches -> decide specials -> apply obstacles -> remove -> collapse -> refill -> repeat
  async function cascadeProcess(){
    combo = 0;
    while(true){
      const info = GameCore.findMatchesWithSpecials(grid);
      if(!info.removed || info.removed.length === 0) break;

      // create specials instructions BEFORE clearing (for 4/5 matches)
      const specials = info.specials || [];
      GameCore.assignSpecialsFromGroups(grid, specials);

      // expand due to existing specials on grid tiles in removed list
      let toBeRemoved = GameCore.expandRemovedBySpecials(grid, info.removed);

      // apply obstacles (reduce hits) and only truly remove tiles allowed
      toBeRemoved = GameCore.applyObstaclesBeforeRemoval(grid, toBeRemoved);

      // mark fade out
      toBeRemoved.forEach(i=>{
        const el = gridEl.querySelector(`[data-index="${i}"]`);
        if(el) el.classList.add('fade-out');
      });

      try { Sound && Sound.play && Sound.play('pop'); } catch(e){}
      await wait(160);

      // scoring: combos increase multiplier
      combo++;
      const gained = toBeRemoved.length * 50 * combo;
      score += gained;

      // If any removed tile included a special of kind color -> handle color bomb behavior (we did assign earlier; but color special removes all of its color when triggered)
      // Note: expandRemovedBySpecials already accounts for existing specials on grid, but if we just created a special that also should explode immediately if part of removal we need to handle.
      // For simplicity, already we added specials into grid prior to expansion.

      // remove flags (we already cleared obstacle-handled ones from toBeRemoved)
      // now do collapse+refill
      const res = GameCore.collapseAndRefill(grid, toBeRemoved, { obstacle:true });
      grid = res.grid;
      renderGrid();

      // small animation for drop
      const cells = Array.from(gridEl.querySelectorAll('.cell'));
      cells.forEach(c=> c.classList.add('drop-in'));
      requestAnimationFrame(()=> requestAnimationFrame(()=> cells.forEach(c=> c.classList.add('show'))));
      await wait(320);
      cells.forEach(c=> c.classList.remove('drop-in','show','fade-out'));
    }

    // after cascade ended -> save best & unlock if target reached
    Storage.saveBest(level, score);
    if(score >= LEVEL_META(level).target){
      Storage.unlockLevel(level+1);
    }
  }

  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

  // timer functions for timed levels
  function startTimer(seconds){
    stopTimer();
    timeLeft = seconds;
    timerEl.textContent = formatTime(timeLeft);
    timerId = setInterval(()=>{
      timeLeft--;
      timerEl.textContent = formatTime(timeLeft);
      if(timeLeft <= 0){
        stopTimer();
        checkEnd();
      }
    }, 1000);
  }
  function stopTimer(){
    if(timerId) clearInterval(timerId);
    timerId = null;
  }

  function checkEnd(){
    const meta = LEVEL_META(level);
    if(meta.type === 'timed'){
      // win condition: score >= target before time runs out
      if(score >= meta.target){
        showGameOver(true);
      } else if(timeLeft <= 0){
        showGameOver(false);
      }
    } else {
      if(score >= meta.target){
        showGameOver(true);
      } else if(moves <= 0){
        showGameOver(false);
      }
    }
  }

  function showGameOver(won){
    stopTimer();
    overTitle.textContent = won ? `स्तर ${level} Complete!` : `Game Over`;
    overScore.textContent = `Score: ${score}`;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-over').classList.add('active');
  }

  // public API
  window.Game = {
    start: function(lvl){
      level = Number(lvl) || 1;
      const meta = LEVEL_META(level);
      score = 0; combo = 0; selected = null; processing=false;
      if(meta.type === 'timed'){ timeLeft = meta.seconds; moves = 0; } else { moves = meta.moves; timeLeft = 0; }
      grid = GameCore.generateGrid({ obstacle: true });
      renderGrid();
      // start timer if timed level
      if(meta.type === 'timed') startTimer(meta.seconds);
      try { if(window.Sound && !Sound.isMuted) Sound.play('bg'); } catch(e){}
    },
    restart: function(){ Game.start(level); },
    getState: function(){ return { level, score, moves, timeLeft }; }
  };

  // Map render (keep existing behavior)
  window.LevelMap = {
    render: function(){
      const container = document.getElementById('mapGrid');
      container.innerHTML = '';
      const unlocked = Storage.getUnlocked();
      for(let i=1;i<=9;i++){
        const card = document.createElement('div');
        card.className = 'level-card' + (unlocked.includes(i) ? '' : ' locked');
        card.innerHTML = `<div style="height:60px; background:url('images/candy1.png') center/cover no-repeat;margin-bottom:8px;border-radius:10px"></div><div>Level ${i}</div><div style="font-size:12px;color:#666">${unlocked.includes(i)?'Play':'Locked'}</div>`;
        card.addEventListener('click', ()=> {
          if(!unlocked.includes(i)){ alert('Level locked'); return; }
          Game.start(i);
          document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
          document.getElementById('page-game').classList.add('active');
        });
        container.appendChild(card);
      }
    }
  };

  // initial map render
  LevelMap.render();

})();

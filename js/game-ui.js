// js/game-ui.js (updated) - timer + scoring + responsive grid hookup
(function(){
  const IMG_PATH = 'images';
  const SOUND_PATH = 'sounds';
  const CANDY_TYPES = 6;

  // state reference (CORE must expose a state container or we create local)
  window.GAMESTATE = window.GAMESTATE || {};
  const state = {
    level:1, rows:7, cols:7, board:[], score:0, moves:30, target:600,
    timeLeft: null, timerInterval: null, timed:false, lock:false
  };
  window.GAMESTATE = state;

  /* ----------------- responsive grid vars helper (call when DOM ready) ----------------- */
  function computeGridVars(gridId='gameGrid'){
    const gridEl = document.getElementById(gridId);
    if(!gridEl) return;
    const parent = gridEl.parentElement;
    const avail = Math.min(parent.getBoundingClientRect().width, window.innerWidth - 32);
    const minCell = 48, maxCell = 72, gap = 12, minCols = 5, maxCols = 8;
    let chosen = minCols, chosenSize = minCell;
    for(let cols=maxCols; cols>=minCols; cols--){
      const requiredMin = cols*minCell + (cols-1)*gap;
      if(requiredMin <= avail){
        const size = Math.min(maxCell, Math.floor((avail - (cols-1)*gap)/cols));
        chosen = cols; chosenSize = Math.max(minCell, size);
        break;
      }
    }
    document.documentElement.style.setProperty('--cols', chosen);
    document.documentElement.style.setProperty('--cell-size', chosenSize + 'px');
    document.documentElement.style.setProperty('--gap', gap + 'px');
  }
  window.addEventListener('resize', ()=>{ clearTimeout(window.__gridT); window.__gridT=setTimeout(()=>computeGridVars(),120); });
  window.addEventListener('load', ()=> computeGridVars());

  /* ----------------- helpers ----------------- */
  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  /* ----------------- UI updates ----------------- */
  function updateUI(){
    document.getElementById('score').textContent = state.score;
    document.getElementById('moves').textContent = state.moves;
    document.getElementById('target').textContent = state.target;
  }
  function updateTimerUI(){
    const el = document.getElementById('timer');
    if(!el) return;
    if(state.timeLeft == null){ el.textContent = '--:--'; return; }
    const mm = String(Math.floor(state.timeLeft/60)).padStart(2,'0');
    const ss = String(state.timeLeft%60).padStart(2,'0');
    el.textContent = `${mm}:${ss}`;
  }

  /* ----------------- rendering grid ----------------- */
  function renderBoard(){
    const container = document.getElementById('gameGrid');
    if(!container) return;
    container.innerHTML = '';
    computeGridVars(); // ensure variables up-to-date

    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const v = state.board[r] && state.board[r][c];
        if(v == null){
          // leave empty
        } else {
          const img = document.createElement('img');
          const idx = (v % CANDY_TYPES) + 1;
          img.src = `${IMG_PATH}/candy${idx}.png`;
          img.alt = 'candy';
          cell.appendChild(img);
        }
        attachTouchHandlers(cell);
        container.appendChild(cell);
      }
    }
  }

  /* ----------------- timer ----------------- */
  function startTimer(seconds){
    if(state.timerInterval) clearInterval(state.timerInterval);
    state.timeLeft = seconds;
    updateTimerUI();
    state.timerInterval = setInterval(()=>{
      if(state.timeLeft == null) return;
      state.timeLeft--;
      updateTimerUI();
      if(state.timeLeft <= 0){
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        // time up -> game over
        handleGameOver();
      }
    },1000);
  }
  function stopTimer(){
    if(state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.timeLeft = null;
    updateTimerUI();
  }

  /* ----------------- scoring helper ----------------- */
  function awardPoints(poppedCount){
    // base 10 per tile
    let points = poppedCount * 10;
    // bonus for large clears
    if(poppedCount >= 4){
      // small extra per tile above 3
      points += (poppedCount - 3) * 15;
    }
    // chain/combos could be increased here
    state.score += points;
    updateUI();
  }

  /* ----------------- swap & resolve flow ----------------- */
  async function trySwapAndResolve(r1,c1,r2,c2){
    if(state.lock) return;
    const d = Math.abs(r1-r2) + Math.abs(c1-c2);
    if(d !== 1) return;
    state.lock = true;

    // optimistic swap
    CORE.swap(state.board, r1, c1, r2, c2);
    renderBoard();
    // play swap sound
    if(typeof Sound !== 'undefined') Sound.play('swap');

    // check for matches
    // CORE.findAllMatches returns array of positions each as [r,c] (one entry per tile to clear)
    await sleep(90);
    const found = CORE.findAllMatches(state.board) || [];
    if(found.length > 0){
      // a valid swap -> consume a move
      state.moves = Math.max(0, state.moves - 1);
      updateUI();

      // cascade: while matches exist, remove -> gravity -> refill -> continue
      let totalClearedInThisMove = 0;
      while(true){
        const matches = CORE.findAllMatches(state.board);
        if(!matches || matches.length === 0) break;
        // matches is array of [r,c] entries; clear them
        matches.forEach(([rr,cc]) => { state.board[rr][cc] = null; });
        totalClearedInThisMove += matches.length;
        renderBoard();
        if(typeof Sound !== 'undefined') Sound.play('pop');
        await sleep(160);
        CORE.gravityAndRefill(state.board);
        renderBoard();
        await sleep(160);
      }

      // award points
      if(totalClearedInThisMove > 0) awardPoints(totalClearedInThisMove);

      // check win
      if(state.score >= state.target){
        handleLevelComplete();
      } else if(state.moves <= 0){
        handleGameOver();
      }
    } else {
      // invalid swap -> swap back and show shake
      await sleep(120);
      CORE.swap(state.board, r1, c1, r2, c2);
      renderBoard();
      const cell = document.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"]`);
      if(cell){ cell.classList.add('invalid'); setTimeout(()=>cell.classList.remove('invalid'),180); }
      if(typeof Sound !== 'undefined') Sound.play('invalid');
    }

    state.lock = false;
  }

  /* ----------------- touch/swipe handlers ----------------- */
  function attachTouchHandlers(cell){
    let startX=0, startY=0, dragging=true;
    let startR, startC;
    function getPoint(e){ const p = (e.touches && e.touches[0]) || e; return {x: p.clientX, y: p.clientY}; }

    function onDown(e){
      if(state.lock) return;
      e.preventDefault();
      const p = getPoint(e);
      startX = p.x; startY = p.y;
      startR = Number(cell.dataset.r); startC = Number(cell.dataset.c);
      dragging = true;
    }
    function onMove(e){
      if(!dragging) return;
      const p = getPoint(e);
      const dx = p.x - startX, dy = p.y - startY;
      if(Math.max(Math.abs(dx),Math.abs(dy)) < 16) return;
      dragging = false;
      let dr=0, dc=0;
      if(Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
      else dr = dy > 0 ? 1 : -1;
      const tr = startR + dr, tc = startC + dc;
      if(tr < 0 || tr >= state.rows || tc < 0 || tc >= state.cols) return;
      trySwapAndResolve(startR, startC, tr, tc);
    }
    function onUp(){ dragging = false; }

    cell.addEventListener('touchstart', onDown, {passive:false});
    cell.addEventListener('mousedown', onDown);
    window.addEventListener('touchmove', onMove, {passive:false});
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onUp);
    window.addEventListener('mouseup', onUp);
  }

  /* ----------------- level complete & game over ----------------- */
  function handleLevelComplete(){
    // play win
    if(typeof Sound !== 'undefined') Sound.play('win');
    if(typeof Confetti !== 'undefined'){
      try{ Confetti.fire({ count: 70, spread: 140, force: 480 }); } catch(e){ console.warn(e); }
    }
    // unlock next level in localStorage
    try {
      const level = state.level || 1;
      const next = level + 1;
      const raw = localStorage.getItem('unlockedLevels');
      let unlocked = raw ? JSON.parse(raw) : [1];
      if(!Array.isArray(unlocked)) unlocked = [1];
      if(!unlocked.includes(next)){ unlocked.push(next); unlocked.sort((a,b)=>a-b); localStorage.setItem('unlockedLevels', JSON.stringify(unlocked)); }
    } catch(e){ console.warn(e); }

    // show modal (simple)
    const modal = document.createElement('div');
    modal.style.position='fixed'; modal.style.left=0; modal.style.top=0; modal.style.right=0; modal.style.bottom=0;
    modal.style.zIndex=10050; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
    modal.style.background='rgba(0,0,0,0.36)';
    modal.innerHTML = `<div style="background:#fff;padding:16px;border-radius:12px;text-align:center;max-width:420px;width:90%">
      <h3>Level ${state.level} Complete!</h3>
      <p>Score: <strong>${state.score}</strong></p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
        <button id="mc-replay" class="btn">Replay</button>
        <button id="mc-next" class="btn">Next</button>
        <button id="mc-map" class="btn">Map</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('mc-replay').onclick = ()=>{ modal.remove(); startLevel(state.level); };
    document.getElementById('mc-next').onclick = ()=>{ modal.remove(); startLevel(state.level+1); };
    document.getElementById('mc-map').onclick = ()=>{ modal.remove(); renderLevelMap(); showPage('map'); };

    stopTimer();
  }

  function handleGameOver(){
    if(typeof Sound !== 'undefined') Sound.play('lose');
    const modal = document.createElement('div');
    modal.style.position='fixed'; modal.style.left=0; modal.style.top=0; modal.style.right=0; modal.style.bottom=0;
    modal.style.zIndex=10050; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
    modal.style.background='rgba(0,0,0,0.36)';
    modal.innerHTML = `<div style="background:#fff;padding:16px;border-radius:12px;text-align:center;max-width:420px;width:90%">
      <h3>Game Over</h3>
      <p>Score: <strong>${state.score}</strong></p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
        <button id="go-replay" class="btn">Replay</button>
        <button id="go-map" class="btn">Map</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('go-replay').onclick = ()=>{ modal.remove(); startLevel(state.level); };
    document.getElementById('go-map').onclick = ()=>{ modal.remove(); renderLevelMap(); showPage('map'); };
    stopTimer();
  }

  /* ----------------- level map rendering ----------------- */
  function renderLevelMap(){
    const grid = document.getElementById('levelGrid');
    if(!grid) return;
    grid.innerHTML = '';
    const LEVELS = 9;
    const raw = localStorage.getItem('unlockedLevels');
    let unlocked = raw ? JSON.parse(raw) : [1];
    if(!Array.isArray(unlocked)) unlocked = [1];
    for(let i=1;i<=LEVELS;i++){
      const box = document.createElement('div');
      box.className = 'level-box';
      box.innerHTML = `<div class="level-title">Level ${i}</div><div style="margin-top:8px"><a href="#play" data-level="${i}" class="btn small">${ unlocked.includes(i) ? 'Play' : 'Locked' }</a></div>`;
      const a = box.querySelector('a');
      a.addEventListener('click', (ev)=>{
        ev.preventDefault();
        if(!unlocked.includes(i)){ alert('यह level अभी locked है'); return; }
        startLevel(i);
        showPage('play');
      });
      grid.appendChild(box);
    }
  }

  /* ----------------- navigation ----------------- */
  function showPage(id){
    document.querySelectorAll('.page').forEach(p=> p.style.display = p.id===id ? '' : 'none');
    location.hash = '#'+id;
    if(id==='play'){ computeGridVars(); renderBoard(); }
  }

  /* ----------------- controls wiring ----------------- */
  function wire(){
    const restart = document.getElementById('restartBtn');
    const shuffle = document.getElementById('shuffleBtn');
    const end = document.getElementById('endBtn');
    const reset = document.getElementById('resetProgress');
    const mute = document.getElementById('muteSound');

    if(restart) restart.addEventListener('click', ()=> startLevel(state.level));
    if(shuffle) shuffle.addEventListener('click', shuffleBoard);
    if(end) end.addEventListener('click', ()=> showPage('map'));
    if(reset) reset.addEventListener('click', ()=> { if(confirm('Reset progress?')){ localStorage.removeItem('unlockedLevels'); renderLevelMap(); }});
    if(mute) mute.addEventListener('change', (e)=> { if(typeof Sound!=='undefined') Sound.setMuted(e.target.checked); });

    window.addEventListener('hashchange', ()=> { const id = location.hash.replace('#','')||'home'; showPage(id); });
  }

  function shuffleBoard(){
    // simple shuffle
    const flat = [];
    for(let r=0;r<state.rows;r++) for(let c=0;c<state.cols;c++) if(state.board[r][c]!=null) flat.push(state.board[r][c]);
    for(let i=flat.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [flat[i],flat[j]]=[flat[j],flat[i]]; }
    let idx=0;
    for(let r=0;r<state.rows;r++) for(let c=0;c<state.cols;c++) state.board[r][c] = flat[idx++] ?? Math.floor(Math.random()*CANDY_TYPES);
    renderBoard();
  }

  /* ----------------- start level ----------------- */
  function startLevel(lvl){
    state.level = Number(lvl) || 1;
    state.rows = 7; state.cols = 7;
    state.board = CORE.createInitialBoard ? CORE.createInitialBoard() : createFallbackBoard(state.rows, state.cols);
    state.score = 0; state.moves = 30; state.target = 600 * state.level;
    state.timed = false; // set true if you want timed level
    stopTimer();
    updateUI(); updateTimerUI();
    renderLevelMap();
    showPage('play');
    renderBoard();
    computeGridVars();
    if(typeof Sound !== 'undefined'){ Sound.play('bg'); }
  }

  function createFallbackBoard(rows,cols){
    const b = Array.from({length:rows}, ()=> Array(cols).fill(0).map(()=> Math.floor(Math.random()*CANDY_TYPES)));
    return b;
  }

  /* ----------------- init ----------------- */
  function init(){
    renderLevelMap();
    wire();
    const h = location.hash.replace('#','') || 'home';
    showPage(h);
    startLevel(1);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // expose for debug
  window.GAME = { state, startLevel, renderBoard };
})();

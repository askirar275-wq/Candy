// game-ui.js (updated) — includes handleLevelComplete + confetti + save-unlock
(function(){
  const IMG_PATH = 'images';
  const SOUND_PATH = 'sounds';
  const CANDY_TYPES = 6; // same as core

  const state = CORE.state;

  // start a level: create board and init HUD
  function startLevel(lvl){
    state.level = Number(lvl) || 1;
    state.rows = 7;
    state.cols = 7;
    state.board = CORE.createInitialBoard();
    state.score = 0;
    state.moves = 30;
    state.target = 600 * state.level;
    updateUI();
    renderBoard();
    Sound.load(SOUND_PATH);
    Sound.setMuted(document.getElementById('muteSound')?.checked ?? false);
    // play bg if allowed (may be blocked until user interacts)
    Sound.play('bg');
  }

  function updateUI(){
    document.getElementById('score').textContent = state.score;
    document.getElementById('moves').textContent = state.moves;
    document.getElementById('target').textContent = state.target;
    document.getElementById('levelTitle').textContent = 'Level ' + state.level;
  }

  function renderBoard(){
    const container = document.getElementById('gameGrid');
    container.innerHTML='';
    container.style.setProperty('--cols', state.cols);
    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        const cell = document.createElement('div');
        cell.className='cell';
        cell.dataset.r=r; cell.dataset.c=c;
        const v = state.board[r][c];
        if(v==null){ cell.classList.add('empty'); }
        else {
          const img = document.createElement('img');
          img.src = `${IMG_PATH}/candy${(v % CANDY_TYPES) + 1}.png`;
          img.alt = 'candy';
          cell.appendChild(img);
        }
        attachTouchHandlers(cell);
        container.appendChild(cell);
      }
    }
  }

  // small sleep helper
  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  // try swap and resolve cascade
  async function trySwapAndResolve(r1,c1,r2,c2){
    if(state.lock) return;
    const d = Math.abs(r1-r2)+Math.abs(c1-c2);
    if(d!==1) return;
    state.lock = true;
    CORE.swap(state.board,r1,c1,r2,c2);
    renderBoard();
    Sound.play('swap');

    if(CORE.hasMatchAt(state.board,r1,c1) || CORE.hasMatchAt(state.board,r2,c2)){
      state.moves = Math.max(0, state.moves-1);
      document.getElementById('moves').textContent = state.moves;
      // cascade resolve loop
      while(true){
        const matches = CORE.findAllMatches(state.board);
        if(matches.length===0) break;
        matches.forEach(([r,c])=> state.board[r][c]=null);
        renderBoard();
        Sound.play('pop');
        await sleep(200);
        CORE.gravityAndRefill(state.board);
        renderBoard();
        await sleep(200);
        state.score += matches.length * 100;
        document.getElementById('score').textContent = state.score;
      }

      // WIN / LOSE checks: अब handleLevelComplete से handle होगा
      if(state.score >= state.target){
        // call centralized handler (plays win sound, confetti, unlock next, modal)
        handleLevelComplete(state);
      } else if(state.moves <= 0){
        // moves खत्म → game over
        handleGameOver(state);
      }
    } else {
      // invalid swap: swap back
      await sleep(120);
      CORE.swap(state.board,r1,c1,r2,c2);
      renderBoard();
      const cell = document.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"]`);
      if(cell){ cell.classList.add('invalid'); setTimeout(()=>cell.classList.remove('invalid'),180); }
    }

    state.lock = false;
  }

  /* Touch/Drag handlers: swipe-based */
  function attachTouchHandlers(cell){
    let startX=0, startY=0, dragging=true;
    let startR, startC;
    function coords(e){ const p = e.touches ? e.touches[0] : e; return {x:p.clientX, y:p.clientY}; }
    function onDown(e){
      if(state.lock) return;
      e.preventDefault();
      const p = coords(e);
      startX=p.x; startY=p.y;
      startR = Number(cell.dataset.r); startC = Number(cell.dataset.c);
      dragging=true;
    }
    function onMove(e){
      if(!dragging) return;
      const p = coords(e);
      const dx = p.x - startX, dy = p.y - startY;
      if(Math.max(Math.abs(dx),Math.abs(dy)) < 18) return;
      dragging=false;
      let dr=0, dc=0;
      if(Math.abs(dx) > Math.abs(dy)) dc = dx>0 ? 1 : -1;
      else dr = dy>0 ? 1 : -1;
      const tr = startR + dr, tc = startC + dc;
      if(tr<0||tr>=state.rows||tc<0||tc>=state.cols) return;
      trySwapAndResolve(startR,startC,tr,tc);
    }
    function onUp(){ dragging=false; }
    cell.addEventListener('touchstart', onDown, {passive:false});
    cell.addEventListener('mousedown', onDown);
    window.addEventListener('touchmove', onMove, {passive:false});
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onUp);
    window.addEventListener('mouseup', onUp);
  }

  /* Level map render */
  function renderLevelMap(){
    const grid = document.getElementById('levelGrid');
    grid.innerHTML='';
    const LEVELS = 9;
    // unlocked levels from storage (default 1)
    const raw = localStorage.getItem('unlockedLevels');
    let unlocked = raw ? JSON.parse(raw) : [1];
    if(!Array.isArray(unlocked)) unlocked = [1];
    for(let i=1;i<=LEVELS;i++){
      const box = document.createElement('div');
      box.className='lvl' + (unlocked.includes(i) ? '' : ' locked');
      box.innerHTML = `<div style="font-weight:600">Level ${i}</div><div style="margin-top:8px"><a href="#play" data-level="${i}" class="btn small-link">${ unlocked.includes(i) ? 'Play' : 'Locked' }</a></div>`;
      const a = box.querySelector('a');
      a.addEventListener('click',(ev)=>{
        ev.preventDefault();
        if(!unlocked.includes(i)){ alert('यह level अभी locked है'); return; }
        startLevel(i);
        showPage('play');
      });
      grid.appendChild(box);
    }
  }

  /* Navigation */
  function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.style.display = p.id===id ? '' : 'none');
    location.hash = '#'+id;
    if(id==='play'){ CORE.setupResponsiveGridVars('gameGrid'); renderBoard(); }
  }

  /* Buttons wiring */
  function wire(){
    document.getElementById('restartBtn').addEventListener('click', ()=> startLevel(state.level));
    document.getElementById('shuffleBtn').addEventListener('click', shuffleBoard);
    document.getElementById('endBtn').addEventListener('click', ()=> location.hash='#map');
    document.getElementById('resetProgress').addEventListener('click', ()=> { if(confirm('प्रगति रीसेट करें?')){ Storage.clear(); renderLevelMap(); }});
    document.getElementById('muteSound').addEventListener('change',(e)=>Sound.setMuted(e.target.checked));
    window.addEventListener('hashchange', ()=>{ const id = location.hash.replace('#','')||'home'; showPage(id); });
  }

  function shuffleBoard(){
    const flat = state.board.flat().filter(v=>v!=null);
    for(let i=flat.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [flat[i],flat[j]]=[flat[j],flat[i]]; }
    let idx=0;
    for(let r=0;r<state.rows;r++) for(let c=0;c<state.cols;c++) state.board[r][c] = flat[idx++] ?? Math.floor(Math.random()*CANDY_TYPES);
    renderBoard();
  }

  /* -------------------------
     Level complete handler
     - plays win sound, fires confetti,
     - unlocks next level, saves best score,
     - shows modal (Replay / Next / Map)
     ------------------------- */
  function handleLevelComplete(st){
    try {
      // play sound
      if(typeof Sound !== 'undefined') Sound.play('win');
      // confetti
      if(typeof Confetti !== 'undefined') {
        try { Confetti.fire({ count: 70, spread: 140, force: 480 }); } catch(e){ console.warn(e); }
      }
      // unlock next
      try {
        const cur = Number(st.level) || 1;
        const next = cur + 1;
        const raw = localStorage.getItem('unlockedLevels');
        let unlocked = raw ? JSON.parse(raw) : [1];
        if(!Array.isArray(unlocked)) unlocked = [1];
        if(!unlocked.includes(next)){ unlocked.push(next); unlocked.sort((a,b)=>a-b); localStorage.setItem('unlockedLevels', JSON.stringify(unlocked)); }
      } catch(e){ console.warn('unlock save failed', e); }

      // save best
      try {
        const key = 'best_level_' + (st.level || 1);
        const prev = Number(localStorage.getItem(key) || 0);
        if((st.score || 0) > prev) localStorage.setItem(key, String(st.score || 0));
      } catch(e){ console.warn('save best failed', e); }

      // modal
      let modal = document.getElementById('level-complete-modal');
      if(!modal){
        modal = document.createElement('div');
        modal.id = 'level-complete-modal';
        modal.style.position = 'fixed';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10050';
        modal.style.background = 'rgba(0,0,0,0.36)';
        modal.innerHTML = `
          <div style="
            width:92%;max-width:420px;background:#fff;border-radius:14px;padding:18px;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,0.18);
          ">
            <h2 style="margin:6px 0 8px;font-size:20px;">Level ${st.level} Complete!</h2>
            <p style="margin:6px 0;color:#333">Score: <strong>${st.score}</strong></p>
            <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
              <button id="lc-replay" style="padding:10px 14px;border-radius:10px;border:none;background:#2fa6ff;color:#fff">Replay</button>
              <button id="lc-next"   style="padding:10px 14px;border-radius:10px;border:none;background:#4cd964;color:#fff">Next</button>
              <button id="lc-map"    style="padding:10px 14px;border-radius:10px;border:1px solid #ddd;background:#fff;color:#333">Map</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('lc-replay').addEventListener('click', ()=> { modal.style.display='none'; startLevel(st.level); });
        document.getElementById('lc-next').addEventListener('click', ()=> { modal.style.display='none'; startLevel(st.level+1); });
        document.getElementById('lc-map').addEventListener('click', ()=> { modal.style.display='none'; renderLevelMap(); showPage('map'); });
      } else {
        modal.querySelector('h2').textContent = `Level ${st.level} Complete!`;
        modal.querySelector('p').innerHTML = `Score: <strong>${st.score}</strong>`;
        modal.style.display='flex';
      }

    } catch(err){
      console.error('handleLevelComplete error', err);
      alert('Level complete! Score: ' + (st.score||0));
    }
  }

  /* -------------------------
     Game over handler (moves finished)
     ------------------------- */
  function handleGameOver(st){
    try {
      Sound.play && Sound.play('lose');
      // simple modal for game over
      let modal = document.getElementById('game-over-modal');
      if(!modal){
        modal = document.createElement('div');
        modal.id = 'game-over-modal';
        modal.style.position='fixed'; modal.style.left='0'; modal.style.top='0';
        modal.style.width='100%'; modal.style.height='100%'; modal.style.display='flex';
        modal.style.alignItems='center'; modal.style.justifyContent='center'; modal.style.zIndex='10050';
        modal.style.background='rgba(0,0,0,0.36)';
        modal.innerHTML = `
          <div style="width:92%;max-width:420px;background:#fff;border-radius:14px;padding:18px;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,0.18);">
            <h2>Game Over</h2>
            <p>Score: <strong>${st.score}</strong></p>
            <div style="margin-top:12px;display:flex;gap:10px;justify-content:center;">
              <button id="go-replay" style="padding:10px 14px;border-radius:10px;border:none;background:#2fa6ff;color:#fff">Replay</button>
              <button id="go-map" style="padding:10px 14px;border-radius:10px;border:1px solid #ddd;background:#fff;color:#333">Map</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('go-replay').addEventListener('click', ()=> { modal.style.display='none'; startLevel(st.level); });
        document.getElementById('go-map').addEventListener('click', ()=> { modal.style.display='none'; renderLevelMap(); showPage('map'); });
      } else {
        modal.querySelector('p').innerHTML = `Score: <strong>${st.score}</strong>`;
        modal.style.display='flex';
      }
    } catch(e){ console.warn(e); alert('Game Over! Score: ' + (st.score||0)); }
  }

  /* Initialize UI: level map, buttons, default page */
  function init(){
    renderLevelMap();
    wire();
    const h = location.hash.replace('#','') || 'home';
    showPage(h);
    startLevel(1); // ready-to-play default
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // export for debugging
  window.GAME = { startLevel, renderBoard, state };

})();

// game-ui.js
(function(){
  const IMG_PATH = 'images';
  const SOUND_PATH = 'sounds';
  const CANDY_TYPES = 6; // same as core

  const state = CORE.state;

  // init state and board
  function startLevel(lvl){
    state.level = Number(lvl) || 1;
    state.rows = 7;
    state.cols = 7;
    state.board = CORE.createInitialBoard();
    state.score = 0;
    state.moves = 30;
    state.target = 600;
    updateUI();
    renderBoard();
    Sound.load(SOUND_PATH);
    Sound.setMuted(document.getElementById('muteSound')?.checked ?? false);
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
          img.src = `${IMG_PATH}/candy${(v% CANDY_TYPES)+1}.png`;
          img.alt='candy';
          cell.appendChild(img);
        }
        attachTouchHandlers(cell);
        container.appendChild(cell);
      }
    }
  }

  // simple sleep
  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  // attempt swap and resolve
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
      // cascade resolve
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
      // win/lose checks
      if(state.score >= state.target){
        Sound.play('win'); alert('स्तर पूरा हुआ!'); // replace with modal if needed
      } else if(state.moves<=0){
        Sound.play('lose'); alert('खेल समाप्त — Moves खत्म');
      }
    } else {
      // invalid: swap back
      await sleep(120);
      CORE.swap(state.board,r1,c1,r2,c2);
      renderBoard();
      // small shake
      const cell = document.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"]`);
      if(cell){ cell.classList.add('invalid'); setTimeout(()=>cell.classList.remove('invalid'),180); }
    }
    state.lock=false;
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
      const clone = document.getElementById('dragClone');
      clone.style.display='none';
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

  // Level map render
  function renderLevelMap(){
    const grid = document.getElementById('levelGrid');
    grid.innerHTML='';
    const LEVELS = 9;
    for(let i=1;i<=LEVELS;i++){
      const box = document.createElement('div');
      box.className='lvl';
      box.innerHTML = `<div style="font-weight:600">Level ${i}</div><div style="margin-top:8px"><a href="#play" data-level="${i}" class="btn small-link">Play</a></div>`;
      box.querySelector('a').addEventListener('click', (ev)=>{
        ev.preventDefault();
        startLevel(i);
        showPage('play');
      });
      grid.appendChild(box);
    }
  }

  // navigation
  function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.style.display = p.id===id ? '' : 'none');
    location.hash = '#'+id;
    if(id==='play'){ CORE.setupResponsiveGridVars('gameGrid'); renderBoard(); }
  }

  // wire buttons
  function wire(){
    document.getElementById('restartBtn').addEventListener('click', ()=> startLevel(state.level));
    document.getElementById('shuffleBtn').addEventListener('click', shuffleBoard);
    document.getElementById('endBtn').addEventListener('click', ()=> location.hash='#map');
    document.getElementById('resetProgress').addEventListener('click', ()=> { if(confirm('प्रगति रीसेट करें?')) Storage.clear(); });
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

  // init
  function init(){
    renderLevelMap();
    wire();
    // default page
    const h = location.hash.replace('#','') || 'home';
    showPage(h);
    // start default board so play page is ready
    startLevel(1);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // export for debug (optional)
  window.GAME = { startLevel, renderBoard, state };
})();

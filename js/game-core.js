// js/game-core.js
(function(){
  const ROWS=8, COLS=8, TYPES=5;
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('nav-score');
  const movesEl = document.getElementById('nav-moves');
  const targetEl = document.getElementById('nav-target');
  const comboEl = document.getElementById('nav-combo');

  let grid=[], cells=[], score=0, moves=30, combo=1, selected=null, animating=false, currentLevel=1;
  let modeTimer=false, timeLeft=60, timerInterval=null;

  function rand(n){ return Math.floor(Math.random()*n); }
  function candySrc(t){ return `images/candy${t+1}.png`; }
  function createEmpty(){ grid=Array.from({length:ROWS}, ()=> Array(COLS).fill(null)); }

  // Fill initial: use LevelMap.getInitial if provided
  function fillInitial(level=1){
    createEmpty();
    const meta = (window.LevelMap && window.LevelMap.getMeta) ? window.LevelMap.getMeta(level) : null;
    if(meta && meta.layout){ const layout=meta.layout; for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ const v = layout[r][c]; grid[r][c] = (v===null||v===undefined)?null:{type:v, special:null}; } }
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(!grid[r][c]) grid[r][c] = {type: rand(TYPES), special:null};
  }

  function buildDOM(){
    if(!boardEl) return;
    boardEl.innerHTML=''; cells=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const el=document.createElement('div'); el.className='cell'; el.dataset.r=r; el.dataset.c=c;
      const img=document.createElement('img'); img.className='candy-img'; el.appendChild(img);
      boardEl.appendChild(el); cells.push(el);
      el.addEventListener('click', onCellClick);
    }
    renderAll();
  }

  function renderAll(){
    if(!cells || cells.length===0) return;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) renderCell(r,c);
    scoreEl && (scoreEl.textContent = score);
    movesEl && (movesEl.textContent = (modeTimer? timeLeft: moves));
    targetEl && (targetEl.textContent = (window.LevelMap&&window.LevelMap.getMeta)? window.LevelMap.getMeta(currentLevel).target : 1000);
    comboEl && (comboEl.textContent = 'x'+combo);
  }

  function renderCell(r,c){
    const idx=r*COLS+c; const el=cells[idx]; const img=el.firstChild; const it=grid[r][c];
    if(!it){ img.removeAttribute('src'); el.classList.remove('selected'); el.style.opacity=''; return; }
    img.src = candySrc(it.type);
    el.classList.toggle('selected', selected && selected.r==r && selected.c==c);
    el.style.transition = "transform .18s ease, opacity .18s";
    el.style.transform = "translateY(0px)";
    el.style.opacity = '';
    // mark special visually (small badge)
    el.title = it.special ? ('special:'+it.special) : '';
  }

  function coordsAdjacent(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1; }

  function onCellClick(e){
    if(animating) return;
    const r=Number(e.currentTarget.dataset.r), c=Number(e.currentTarget.dataset.c);
    if(!selected){ selected={r,c}; renderAll(); return; }
    const target={r,c};
    if(selected.r===target.r && selected.c===target.c){ selected=null; renderAll(); return; }
    if(!coordsAdjacent(selected,target)){ selected=target; renderAll(); return; }
    attemptSwap(selected,target);
  }

  function swapCells(a,b){
    const tmp=grid[a.r][a.c]; grid[a.r][a.c]=grid[b.r][b.c]; grid[b.r][b.c]=tmp;
    renderCell(a.r,a.c); renderCell(b.r,b.c);
  }

  // detect matches with special handling
  function findMatches(){
    const toRemove=[];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let runType=-1, runStart=0, runLen=0;
      for(let c=0;c<=COLS;c++){
        const t = c<COLS && grid[r][c] ? grid[r][c].type : -1;
        if(t === runType) runLen++; else {
          if(runLen>=3) for(let k=runStart;k<runStart+runLen;k++) toRemove.push({r,c:k});
          runType=t; runStart=c; runLen=1;
        }
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let runType=-1, runStart=0, runLen=0;
      for(let r=0;r<=ROWS;r++){
        const t = r<ROWS && grid[r][c] ? grid[r][c].type : -1;
        if(t === runType) runLen++; else {
          if(runLen>=3) for(let k=runStart;k<runStart+runLen;k++) toRemove.push({r:k,c});
          runType=t; runStart=r; runLen=1;
        }
      }
    }
    // dedupe
    const set=new Set(), unique=[];
    for(const p of toRemove){ const k=p.r+','+p.c; if(!set.has(k)){ set.add(k); unique.push(p); } }
    return unique;
  }

  // helper: when 4 or 5 matches create special candies at origin
  function createSpecialsFromRuns(){
    // simple: find runs >=4 horizontally or vertically and convert the last item to special
    // horizontal
    for(let r=0;r<ROWS;r++){
      let runType=-1, runStart=0, runLen=0;
      for(let c=0;c<=COLS;c++){
        const t = c<COLS && grid[r][c] ? grid[r][c].type : -1;
        if(t===runType) runLen++; else {
          if(runLen>=4){
            const pos = {r,c: runStart+runLen-1};
            if(runLen===4) grid[pos.r][pos.c].special='striped-h'; else if(runLen>=5) grid[pos.r][pos.c].special='colorbomb';
          }
          runType=t; runStart=c; runLen=1;
        }
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let runType=-1, runStart=0, runLen=0;
      for(let r=0;r<=ROWS;r++){
        const t = r<ROWS && grid[r][c] ? grid[r][c].type : -1;
        if(t===runType) runLen++; else {
          if(runLen>=4){
            const pos={r: runStart+runLen-1, c};
            if(runLen===4) grid[pos.r][pos.c].special='striped-v'; else if(runLen>=5) grid[pos.r][pos.c].special='colorbomb';
          }
          runType=t; runStart=r; runLen=1;
        }
      }
    }
  }

  async function clearMatchesThenCollapse(){
    animating=true;
    while(true){
      const matches=findMatches();
      if(matches.length===0) break;
      // play pop
      if(window.SFX && typeof window.SFX.play==='function') window.SFX.play('pop');
      // increase combo and score
      combo = (matches.length>3) ? combo+1 : 1;
      const per = 50;
      score += matches.length * per * combo;
      // create specials for runs
      createSpecialsFromRuns();
      // animate matched cells
      for(const m of matches){
        const idx=m.r*COLS+m.c; const el=cells[idx]; if(!el) continue;
        el.style.transform='scale(1.15)'; el.style.opacity='0.6';
        const popup=document.createElement('div'); popup.className='popup-score'; popup.textContent='+' + (per*combo); el.appendChild(popup);
        setTimeout(()=>{ popup.style.transform='translateY(-36px)'; popup.style.opacity='0'; }, 30);
        setTimeout(()=> popup.remove(),900);
      }
      renderAll();
      await sleep(220);
      // clear cells
      for(const m of matches){ grid[m.r][m.c]=null; const idx=m.r*COLS+m.c; const el=cells[idx]; if(el){ el.style.opacity='0'; if(el.firstChild) el.firstChild.src=''; } }
      await sleep(160);
      collapseGrid();
      // bounce animation
      cells.forEach(el=> el.style.transform='translateY(8px)');
      renderAll();
      setTimeout(()=> cells.forEach(el=> el.style.transform='translateY(0px)'),120);
      await sleep(180);
      refillGrid();
      renderAll();
      await sleep(200);
    }
    animating=false;
  }

  function collapseGrid(){
    for(let c=0;c<COLS;c++){
      let write=ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c]){ if(write!==r){ grid[write][c]=grid[r][c]; grid[r][c]=null; } write--; }
      }
      for(let r=write;r>=0;r--) grid[r][c]=null;
    }
  }

  function refillGrid(){
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(!grid[r][c]) grid[r][c]={type:rand(TYPES), special:null};
  }

  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  async function attemptSwap(a,b){
    animating=true;
    swapCells(a,b);
    const matches=findMatches();
    if(matches.length===0){
      await sleep(140); swapCells(a,b); selected=null; animating=false; renderAll(); return;
    }
    moves = Math.max(0, moves-1);
    renderAll();
    await clearMatchesThenCollapse();
    selected=null; renderAll();
    // check target
    const meta = (window.LevelMap && window.LevelMap.getMeta) ? window.LevelMap.getMeta(currentLevel) : null;
    const target = meta? meta.target : 1000;
    if(score >= target){
      // level complete
      try{ window.StorageAPI && window.StorageAPI.setBest && window.StorageAPI.setBest(currentLevel, score); window.StorageAPI && window.StorageAPI.unlock && window.StorageAPI.unlock(currentLevel+1); }catch(e){}
      if(window.SFX && window.SFX.play) window.SFX.play('win');
      if(window.Nav && window.Nav.showGameOver) window.Nav.showGameOver(true, score, currentLevel);
    } else if(moves<=0 || (modeTimer && timeLeft<=0)){
      // out of moves/time -> game over
      if(window.Nav && window.Nav.showGameOver) window.Nav.showGameOver(false,score,currentLevel);
    }
    animating=false;
  }

  // hint: brute force
  function findHint(){
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const dirs=[{r,c:c+1},{r:c+1,c:c}]; // correction below replaced by correct code
    }
    // simpler brute force:
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const s={r,c};
        const neigh=[{r:r,c:c+1},{r:r+1,c:c},{r:r,c:c-1},{r:r-1,c:c}];
        for(const t of neigh){
          if(t.r>=0 && t.r<ROWS && t.c>=0 && t.c<COLS){
            swapCells(s,t);
            const m=findMatches();
            swapCells(s,t);
            if(m.length>0) return [s,t];
          }
        }
      }
    }
    return null;
  }

  // API actions
  function useShuffle(){
    // shuffle all types randomly
    const list=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(grid[r][c]) list.push(grid[r][c].type);
    // shuffle array
    for(let i=list.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [list[i],list[j]]=[list[j],list[i]]; }
    for(let r=0,idx=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ grid[r][c].type=list[idx++]; }
    renderAll();
  }

  function useBombAtCenter(){
    // remove center 3x3
    const r0=Math.floor(ROWS/2)-1, c0=Math.floor(COLS/2)-1;
    for(let r=r0;r<r0+3;r++) for(let c=c0;c<c0+3;c++) if(r>=0 && c>=0 && r<ROWS && c<COLS) grid[r][c]=null;
    renderAll();
    setTimeout(()=>{ collapseGrid(); refillGrid(); renderAll(); },160);
  }

  // timer
  function startTimer(t){
    if(timerInterval) clearInterval(timerInterval);
    timeLeft = t;
    timerInterval = setInterval(()=>{
      timeLeft--; if(timeLeft<=0){ clearInterval(timerInterval); timerInterval=null; renderAll(); if(window.Nav && window.Nav.showGameOver) window.Nav.showGameOver(false,score,currentLevel); }
      renderAll();
    },1000);
  }
  function stopTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval=null; } }

  // public API
  function initGame(level=1){
    currentLevel=level; score=0; moves=30; combo=1; selected=null; animating=false;
    const meta = (window.LevelMap && window.LevelMap.getMeta)? window.LevelMap.getMeta(level): {target:1000,moves:30};
    moves = meta.moves || 30; modeTimer = document.getElementById('opt-timer') && document.getElementById('opt-timer').checked;
    if(modeTimer){ startTimer(60 + (level-1)*10); document.getElementById('moves-label').textContent='Time'; } else { stopTimer(); document.getElementById('moves-label').textContent='Moves'; }
    fillInitial(level); buildDOM(); renderAll();
    const ph=document.getElementById('board-placeholder'); if(ph) ph.style.display='none'; const b=document.getElementById('board'); if(b) b.style.display='grid';
  }

  function reset(){ initGame(currentLevel); }
  function getState(){ return {score,moves,level:currentLevel,grid,combo}; }
  function getHint(){ return findHint(); }
  function applyShuffle(){ if(window.StorageAPI && window.StorageAPI.useBooster && window.StorageAPI.useBooster('shuffle')) useShuffle(); else alert('No shuffle boosters left'); }
  function applyBomb(){ if(window.StorageAPI && window.StorageAPI.useBooster && window.StorageAPI.useBooster('bomb')) useBombAtCenter(); else alert('No bomb boosters left'); }

  window.GameAPI = { initGame, reset, getState, getHint, applyShuffle, applyBomb };

})();

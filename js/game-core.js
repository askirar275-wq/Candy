// js/game-core.js
(function(){
  const ROWS = 8, COLS = 8;
  const TYPES = 5; // candy1..candy5
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('nav-score');
  const movesEl = document.getElementById('nav-moves');

  let grid = [];
  let cells = [];
  let score = 0;
  let moves = 30;
  let selected = null;
  let animating = false;
  let currentLevel = 1;

  function rand(n){ return Math.floor(Math.random()*n); }
  function candySrc(type){ return `images/candy${type+1}.png`; }

  function createEmpty(){ grid = Array.from({length:ROWS}, ()=> Array(COLS).fill(null)); }

  function fillInitial(level = 1){
    createEmpty();
    if(window.LevelMap && typeof window.LevelMap.getInitial === 'function'){
      const layout = window.LevelMap.getInitial(level);
      if(layout && layout.length === ROWS && layout[0].length === COLS){
        for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
          const v = layout[r][c];
          grid[r][c] = (v===null||v===undefined) ? null : {type: v, special: null};
        }
        for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(!grid[r][c]) grid[r][c] = {type: rand(TYPES), special: null};
        return;
      }
    }
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let val;
        do {
          val = rand(TYPES);
        } while (
          (c>=2 && grid[r][c-1] && grid[r][c-2] && grid[r][c-1].type===val && grid[r][c-2].type===val) ||
          (r>=2 && grid[r-1][c] && grid[r-2][c] && grid[r-1][c].type===val && grid[r-2][c].type===val)
        );
        grid[r][c] = {type: val, special: null};
      }
    }
  }

  function buildDOM(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    cells = [];
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const el = document.createElement('div');
        el.className = 'cell';
        el.dataset.r = r; el.dataset.c = c;
        const img = document.createElement('img');
        img.className = 'candy-img';
        el.appendChild(img);
        boardEl.appendChild(el);
        cells.push(el);
        el.addEventListener('click', onCellClick);
      }
    }
    renderAll();
  }

  function renderAll(){
    if(!cells || cells.length === 0) return;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) renderCell(r,c);
    scoreEl && (scoreEl.textContent = score);
    movesEl && (movesEl.textContent = moves);
  }

  function renderCell(r,c){
    const idx = r*COLS + c;
    const el = cells[idx];
    const img = el.firstChild;
    const item = grid[r][c];
    if(!item){ img.removeAttribute('src'); el.classList.remove('selected'); el.style.opacity = ''; return; }
    img.src = candySrc(item.type);
    el.classList.toggle('selected', selected && selected.r==r && selected.c==c);
    // reset transforms so gravity animation can play
    el.style.transition = "transform .2s ease, opacity .18s ease";
    el.style.transform = "translateY(0px)";
    el.style.opacity = "";
  }

  function coordsAdjacent(a,b){
    return Math.abs(a.r-b.r) + Math.abs(a.c-b.c) === 1;
  }

  function onCellClick(e){
    if(animating) return;
    const r = Number(e.currentTarget.dataset.r);
    const c = Number(e.currentTarget.dataset.c);
    if(!selected){ selected = {r,c}; renderAll(); return; }
    const target = {r,c};
    if(selected.r===target.r && selected.c===target.c){ selected = null; renderAll(); return; }
    if(!coordsAdjacent(selected,target)){ selected = target; renderAll(); return; }
    attemptSwap(selected, target);
  }

  function swapCells(a,b){
    const tmp = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = tmp;
    renderCell(a.r,a.c); renderCell(b.r,b.c);
  }

  function findMatches(){
    const toRemove = [];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let runType=-1, runStart=0, runLen=0;
      for(let c=0;c<=COLS;c++){
        const t = c<COLS && grid[r][c] ? grid[r][c].type : -1;
        if(t === runType) runLen++;
        else {
          if(runLen>=3) for(let k=runStart;k<runStart+runLen;k++) toRemove.push({r,c:k});
          runType = t; runStart = c; runLen = 1;
        }
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let runType=-1, runStart=0, runLen=0;
      for(let r=0;r<=ROWS;r++){
        const t = r<ROWS && grid[r][c] ? grid[r][c].type : -1;
        if(t === runType) runLen++;
        else {
          if(runLen>=3) for(let k=runStart;k<runStart+runLen;k++) toRemove.push({r:k,c});
          runType = t; runStart = r; runLen = 1;
        }
      }
    }
    // dedupe
    const set = new Set(), unique = [];
    for(const p of toRemove){
      const k = p.r+','+p.c;
      if(!set.has(k)){ set.add(k); unique.push(p); }
    }
    return unique;
  }

  async function clearMatchesThenCollapse(){
    animating = true;
    while(true){
      const matches = findMatches();
      if(matches.length === 0) break;

      // play pop sound
      if(window.SFX && typeof window.SFX.play === 'function') window.SFX.play('pop');

      // score
      const pointsEach = 50;
      score += matches.length * pointsEach;

      // animate matched cells (scale + popup)
      for(const m of matches){
        const idx = m.r*COLS + m.c;
        const el = cells[idx];
        if(!el) continue;
        el.style.transform = "scale(1.18)";
        el.style.transition = "transform .16s ease, opacity .18s ease";
        el.style.opacity = "0.6";

        // popup score
        const popup = document.createElement("div");
        popup.textContent = `+${pointsEach}`;
        popup.style.position = "absolute";
        popup.style.left = "50%";
        popup.style.top = "10%";
        popup.style.transform = "translateX(-50%)";
        popup.style.color = "#ff4081";
        popup.style.fontWeight = "800";
        popup.style.fontSize = "12px";
        popup.style.pointerEvents = "none";
        popup.style.transition = "transform .9s ease, opacity .9s ease";
        el.appendChild(popup);
        setTimeout(()=>{ popup.style.transform = "translateX(-50%) translateY(-32px)"; popup.style.opacity = "0"; }, 30);
        setTimeout(()=> popup.remove(), 900);
      }

      renderAll();
      await sleep(220);

      // remove matches visually
      for(const m of matches){
        grid[m.r][m.c] = null;
        const idx = m.r*COLS + m.c;
        const el = cells[idx];
        if(el){
          el.style.opacity = "0";
          if(el.firstChild) el.firstChild.src = "";
        }
      }

      await sleep(160);

      // collapse and gravity
      collapseGrid();

      // small bounce animation for falling cells
      cells.forEach(el => {
        el.style.transform = "translateY(8px)";
      });
      // render after collapse
      renderAll();
      setTimeout(()=> {
        cells.forEach(el => el.style.transform = "translateY(0px)");
      }, 120);

      await sleep(180);
      refillGrid();
      renderAll();
      await sleep(180);
    }
    animating = false;
  }

  function collapseGrid(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r][c]){
          if(write !== r){ grid[write][c] = grid[r][c]; grid[r][c] = null; }
          write--;
        }
      }
      for(let r=write;r>=0;r--) grid[r][c] = null;
    }
  }

  function refillGrid(){
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(!grid[r][c]) grid[r][c] = { type: rand(TYPES), special: null };
  }

  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  async function attemptSwap(a,b){
    animating = true;
    swapCells(a,b);
    const matches = findMatches();
    if(matches.length === 0){
      await sleep(160);
      swapCells(a,b);
      selected = null;
      animating = false;
      renderAll();
      return;
    }
    moves = Math.max(0, moves-1);
    renderAll();
    await clearMatchesThenCollapse();
    selected = null;
    renderAll();

    if(moves <= 0){
      // save best and unlock
      try{
        window.StorageAPI && window.StorageAPI.setBestScore && window.StorageAPI.setBestScore(currentLevel, score);
        window.StorageAPI && window.StorageAPI.unlock && window.StorageAPI.unlock(currentLevel+1);
      }catch(e){}
      // play win sound
      if(window.SFX && typeof window.SFX.play === 'function') window.SFX.play('win');
      // call Nav.showGameOver if present
      if(window.Nav && typeof window.Nav.showGameOver === 'function') window.Nav.showGameOver(true, score, currentLevel);
    }
    animating = false;
  }

  function findHint(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const dirs = [{r:r,c:c+1},{r:r+1,c:c}];
        for(const t of dirs){
          if(t.r<ROWS && t.c<COLS){
            swapCells({r,c}, t);
            const matches = findMatches();
            swapCells({r,c}, t);
            if(matches.length>0) return [{r,c}, t];
          }
        }
      }
    }
    return null;
  }

  // Public API
  function initGame(level=1){
    currentLevel = level;
    score = 0; moves = 30; selected = null; animating = false;
    fillInitial(level);
    buildDOM();
    renderAll();
    const ph = document.getElementById('board-placeholder');
    if(ph) ph.style.display = 'none';
    const b = document.getElementById('board');
    if(b) b.style.display = 'grid';
  }

  function reset(){ initGame(currentLevel); }
  function getState(){ return {score, moves, level: currentLevel, grid}; }

  window.GameAPI = { initGame, reset, getState, findHint };

})();

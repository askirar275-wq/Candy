/* ===== game.js =====
   Complete engine:
   - board init
   - swipe (touch + mouse)
   - match detection (>=3), remove, gravity, refill
   - score, level checks
   - shuffle/restart
   - pack switching
*/

(function(){
  // state
  let currentPackKey = Object.keys(IMAGE_PACKS)[0];
  let candies = IMAGE_PACKS[currentPackKey].candies.slice();
  let boardEl = null;
  let rows = 8, cols = 7;
  let grid = []; // grid[row][col] => {id: index into candies}
  let score = 0, coins = 0;
  let currentLevel = 1;
  let movesLeft = 0;
  let animating = false;

  // UI refs
  const HUD = {
    score: ()=>document.querySelector('#hud-score'),
    coins: ()=>document.querySelector('#hud-coins'),
    level: ()=>document.querySelector('#hud-level'),
    goal: ()=>document.querySelector('#hud-goal')
  };

  // util
  function randInt(n){ return Math.floor(Math.random()*n); }

  // initialize board DOM and events
  function initBoard(r,c, packCandies, moves=40){
    if (animating) return;
    rows = r; cols = c;
    candies = packCandies.slice();
    movesLeft = moves;
    score = 0;
    updateHUD();
    boardEl = document.querySelector('#board');
    // style grid columns
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    // create underlying grid data
    grid = Array.from({length:rows}, () => Array.from({length:cols}, () => ({id:-1})));
    // fill random ensuring no initial matches
    for(let r0=0;r0<rows;r0++){
      for(let c0=0;c0<cols;c0++){
        let id;
        do {
          id = randInt(candies.length);
          grid[r0][c0].id = id;
        } while (createsMatchAt(r0,c0));
      }
    }
    renderBoard();
  }

  // render board DOM
  function renderBoard(){
    if (!boardEl) boardEl = document.querySelector('#board');
    boardEl.innerHTML = '';
    for(let r0=0;r0<rows;r0++){
      for(let c0=0;c0<cols;c0++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r0; cell.dataset.c = c0;
        const img = document.createElement('img');
        const id = grid[r0][c0].id;
        img.src = (id>=0 && candies[id]) ? candies[id] : '';
        img.alt = '';
        cell.appendChild(img);
        cell.addEventListener('pointerdown', onPointerDown);
        cell.addEventListener('pointerup', onPointerUp);
        cell.addEventListener('pointercancel', onPointerCancel);
        cell.addEventListener('pointermove', onPointerMove);
        boardEl.appendChild(cell);
      }
    }
  }

  // match helper: check if placing grid[r][c] creates a pre-existing match
  function createsMatchAt(r,c){
    const id = grid[r][c].id;
    // check two left
    if (c>=2 && grid[r][c-1].id===id && grid[r][c-2].id===id) return true;
    // check two up
    if (r>=2 && grid[r-1][c].id===id && grid[r-2][c].id===id) return true;
    return false;
  }

  // pointer/swipe handling
  let startR=-1,startC=-1,dragging=false,startX=0,startY=0;
  function onPointerDown(e){
    if (animating) return;
    const cell = e.currentTarget;
    startR = parseInt(cell.dataset.r,10);
    startC = parseInt(cell.dataset.c,10);
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    cell.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e){
    if (!dragging) return;
    // we allow dragging but we'll process on pointerup for simplicity
  }
  function onPointerCancel(e){
    dragging=false;
  }
  function onPointerUp(e){
    if (!dragging) return;
    dragging=false;
    const endX = e.clientX, endY = e.clientY;
    const dx = endX - startX, dy = endY - startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const threshold = 20; // minimal movement
    if (adx < threshold && ady < threshold) {
      // tapped — no swap
      return;
    }
    let dr=0, dc=0;
    if (adx > ady) {
      // horizontal move
      dc = dx>0 ? 1 : -1;
    } else {
      dr = dy>0 ? 1 : -1;
    }
    const r2 = startR+dr, c2 = startC+dc;
    if (r2<0 || r2>=rows || c2<0 || c2>=cols) return;
    swapAndResolve(startR,startC,r2,c2);
  }

  // swap two cells (r1,c1) <-> (r2,c2) and process matches. If swap produces no match -> revert.
  async function swapAndResolve(r1,c1,r2,c2){
    if (animating) return;
    animating=true;
    // swap data
    const tmp = grid[r1][c1].id; grid[r1][c1].id = grid[r2][c2].id; grid[r2][c2].id = tmp;
    renderBoard();
    await sleep(120);
    const matches = findAllMatches();
    if (matches.length===0) {
      // revert
      const tmp2 = grid[r1][c1].id; grid[r1][c1].id = grid[r2][c2].id; grid[r2][c2].id = tmp2;
      renderBoard();
      animating=false;
      return;
    }
    // valid swap
    movesLeft = Math.max(0, movesLeft-1);
    // remove matches repeatedly until none
    let totalRemoved = 0;
    while(true){
      const mm = findAllMatches();
      if (mm.length===0) break;
      const removed = removeMatches(mm);
      totalRemoved += removed;
      await animateRemove(mm);
      applyGravity();
      await sleep(140);
      refillBoard();
      renderBoard();
      await sleep(120);
    }
    // score update
    score += totalRemoved * 60; // each candy 60 points (tweakable)
    coins += Math.floor(totalRemoved/3);
    updateHUD();
    checkLevelComplete();
    animating=false;
  }

  // find all matches (list of cells to remove). returns array of {r,c}
  function findAllMatches(){
    const toRemove = [];
    // rows
    for(let r0=0;r0<rows;r0++){
      let runId = -1, runStart=0, runLen=0;
      for(let c0=0;c0<=cols;c0++){
        const id = (c0<cols) ? grid[r0][c0].id : -999;
        if (id === runId) { runLen++; }
        else {
          if (runLen >= 3) {
            for(let k=runStart;k<runStart+runLen;k++) toRemove.push({r:r0,c:k});
          }
          runId = id; runStart = c0; runLen = 1;
        }
      }
    }
    // cols
    for(let c0=0;c0<cols;c0++){
      let runId=-1, runStart=0, runLen=0;
      for(let r0=0;r0<=rows;r0++){
        const id = (r0<rows) ? grid[r0][c0].id : -999;
        if (id === runId) runLen++;
        else {
          if (runLen >= 3) {
            for(let k=runStart;k<runStart+runLen;k++) toRemove.push({r:k,c:c0});
          }
          runId = id; runStart = r0; runLen = 1;
        }
      }
    }
    // dedupe
    const keyset = new Set();
    const out = [];
    for(const p of toRemove){ const key = p.r+','+p.c; if (!keyset.has(key)){ keyset.add(key); out.push(p); } }
    return out;
  }

  // remove matches (set id=-1) and return count
  function removeMatches(list){
    for(const p of list) grid[p.r][p.c].id = -1;
    return list.length;
  }

  // animate remove: simple fade / scale
  async function animateRemove(list){
    for(const item of list){
      const cell = boardEl.querySelector(`.cell[data-r="${item.r}"][data-c="${item.c}"]`);
      if (cell){
        cell.style.transform = 'scale(0.6)';
        const img = cell.querySelector('img');
        if (img) img.style.transform = 'scale(0.4)';
        cell.style.opacity = '0.25';
      }
    }
    await sleep(180);
  }

  // gravity: for each column, drop candies down to fill -1
  function applyGravity(){
    for(let c0=0;c0<cols;c0++){
      let write = rows-1;
      for(let r0=rows-1;r0>=0;r0--){
        if (grid[r0][c0].id >= 0){
          grid[write][c0].id = grid[r0][c0].id;
          write--;
        }
      }
      for(let rfill = write; rfill>=0; rfill--){
        grid[rfill][c0].id = -1;
      }
    }
  }

  // refill empty slots with random (ensure no instant matches maybe)
  function refillBoard(){
    for(let c0=0;c0<cols;c0++){
      for(let r0=0;r0<rows;r0++){
        if (grid[r0][c0].id === -1){
          let id;
          do { id = randInt(candies.length); } while (wouldCreateImmediateMatch(r0,c0,id));
          grid[r0][c0].id = id;
        }
      }
    }
  }

  function wouldCreateImmediateMatch(r,c,id){
    // check left x2
    if (c>=2 && grid[r][c-1].id===id && grid[r][c-2].id===id) return true;
    // up x2
    if (r>=2 && grid[r-1][c].id===id && grid[r-2][c].id===id) return true;
    return false;
  }

  // shuffle board randomly (fixed — no recursion, retry up to N times)
function shuffleBoard(){
  if (!grid || rows <= 0 || cols <= 0) return;
  // collect all ids
  const all = [];
  for(let r0=0;r0<rows;r0++){
    for(let c0=0;c0<cols;c0++){
      all.push(grid[r0][c0].id);
    }
  }
  // fisher-yates once
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  // try to place them back and ensure no immediate matches remain.
  // We'll retry reshuffling up to 10 times (loop, not recursion).
  const MAX_TRIES = 10;
  let tries = 0;
  let ok = false;

  while (tries < MAX_TRIES && !ok) {
    // put back into grid
    let idx = 0;
    for(let r0=0;r0<rows;r0++){
      for(let c0=0;c0<cols;c0++){
        grid[r0][c0].id = all[idx++];
      }
    }
    // check result
    const matches = findAllMatches();
    if (matches.length === 0) {
      ok = true;
      break;
    }
    // otherwise reshuffle the array and try again (in-place)
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    tries++;
  }

  // If still not ok after MAX_TRIES, we will accept the board (prevents infinite loop)
  renderBoard();
     }
  
    // Fisher-Yates
    for(let i=all.length-1;i>0;i--){ const j=randInt(i+1); [all[i],all[j]]=[all[j],all[i]]; }
    let idx=0;
    for(let r0=0;r0<rows;r0++) for(let c0=0;c0<cols;c0++) grid[r0][c0].id = all[idx++];
    // if immediate matches exist, try again (but limit tries)
    let tries=0;
    while(findAllMatches().length>0 && tries<6){ shuffleBoard(); tries++; return; }
    renderBoard();
  }

  // small helper
  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  // HUD updates
  function updateHUD(){
    document.querySelector('#hud-score').textContent = score;
    document.querySelector('#hud-coins').textContent = coins;
    document.querySelector('#hud-level').textContent = currentLevel;
  }

  // level checks
  function getLevelCfg(levelNum){
    return LEVELS.find(l => l.level === levelNum);
  }
  function startLevel(levelNum){
    const cfg = getLevelCfg(levelNum);
    if (!cfg) {
      alert('Level not defined: '+levelNum);
      return;
    }
    // ensure unlocked:
    const unlocked = getUnlockedLevels();
    if (!unlocked.includes(levelNum)){
      alert('This level is locked!');
      return;
    }
    currentLevel = levelNum;
    // set background according to pack
    const pack = IMAGE_PACKS[currentPackKey];
    if (pack && pack.bg) document.body.style.backgroundImage = `url("${pack.bg}")`;
    initBoard(cfg.rows, cfg.cols, candies, cfg.moves);
    updateHUD();
    showPage('gamePage');
  }

  function checkLevelComplete(){
    const cfg = getLevelCfg(currentLevel);
    if (!cfg) return;
    if (score >= cfg.goalScore){
      // unlock next level
      unlockLevel(currentLevel+1);
      // show modal
      const modal = document.querySelector('#levelComplete');
      modal.classList.remove('hidden');
    }
  }

  // unlock helpers
  function getUnlockedLevels(){
    try{
      const raw = localStorage.getItem('unlockedLevels');
      if (!raw) return [1];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [1];
      return arr;
    }catch(e){ return [1]; }
  }
  function unlockLevel(n){
    const arr = new Set(getUnlockedLevels());
    arr.add(1);
    arr.add(n);
    localStorage.setItem('unlockedLevels', JSON.stringify(Array.from(arr).sort((a,b)=>a-b)));
  }

  // pack switching
  function setImagePack(key){
    if (!IMAGE_PACKS[key]) return;
    currentPackKey = key;
    candies = IMAGE_PACKS[key].candies.slice();
    if (IMAGE_PACKS[key].bg) document.body.style.backgroundImage = `url("${IMAGE_PACKS[key].bg}")`;
    // re-init current level to apply new images
    const cfg = getLevelCfg(currentLevel) || LEVELS[0];
    initBoard(cfg.rows, cfg.cols, candies, cfg.moves);
  }

  // build level map UI
  function buildMap(){
    const mapList = document.querySelector('#mapList');
    mapList.innerHTML = '';
    const unlocked = getUnlockedLevels();
    for(const cfg of LEVELS){
      const item = document.createElement('div');
      item.className = 'map-item';
      item.textContent = `Level ${cfg.level} — Goal: ${cfg.goalScore}`;
      if (!unlocked.includes(cfg.level)) {
        item.style.opacity = '0.45';
        item.style.cursor = 'not-allowed';
        item.innerHTML += ' 🔒';
      } else {
        item.addEventListener('click', ()=> startLevel(cfg.level));
      }
      mapList.appendChild(item);
    }
  }

  // public small API for app.js
  window.CandyEngine = {
    initBoard, renderBoard, startLevel, setImagePack, shuffleBoard,
    getUnlockedLevels, unlockLevel
  };

  // export a simple debug mount
  console.log('CandyEngine ready');
})();

// game.js
/* Candy Match core - simple and robust
   - 6 candies (images/candy1..6.png)
   - grid size controlled by LEVELS
   - match detection (3+), gravity, refill
   - touch swipe support + mouse click select
*/
console.log('Loaded: game.js');

(function(){
  // Config - levels define board size and goal
  const LEVELS = [
    null,
    {id:1, title:'Beginner', boardSize:7, goal:200, reward:50},
    {id:2, title:'Explorer', boardSize:7, goal:500, reward:120},
    {id:3, title:'Challenger', boardSize:8, goal:1000, reward:250},
    {id:4, title:'Master', boardSize:8, goal:2000, reward:600},
  ];

  const CANDIES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png']; // images/
  const IMAGE_PATH = 'images/';

  // state
  let boardSize = 7;
  let cells = []; // array of div cells (row-major)
  let grid = [];  // 2D array of candy names
  let selected = null; // {r,c}
  let score = 0;
  let currentLevel = StorageAPI.getPlayLevel() || 1;
  const boardEl = document.getElementById('gameBoard');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const levelEl = document.getElementById('currentLevel');

  // safe element checks
  if(!boardEl){ console.warn('gameBoard not found'); }

  // helpers
  const randCandy = ()=> IMAGE_PATH + CANDIES[Math.floor(Math.random()*CANDIES.length)];

  function setScore(n){ score = n; if(scoreEl) scoreEl.textContent = score; }
  function updateCoins(){ if(coinsEl) coinsEl.textContent = StorageAPI.getCoins(); }

  function getLevelInfo(l){
    return LEVELS[l] || LEVELS[1];
  }

  // build initial grid (no immediate matches)
  function buildGrid(){
    const info = getLevelInfo(currentLevel);
    boardSize = info.boardSize || 7;
    grid = Array.from({length:boardSize}, ()=> Array(boardSize).fill(null));
    // fill ensuring few immediate matches
    for(let r=0;r<boardSize;r++){
      for(let c=0;c<boardSize;c++){
        do {
          grid[r][c] = randCandy();
        } while(createsImmediateMatch(r,c));
      }
    }
  }

  function createsImmediateMatch(r,c){
    // check left and up
    const val = grid[r][c];
    if(c>=2 && grid[r][c-1] === val && grid[r][c-2] === val) return true;
    if(r>=2 && grid[r-1][c] === val && grid[r-2][c] === val) return true;
    return false;
  }

  // render board DOM
  function renderBoard(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;
    cells = [];
    for(let r=0;r<boardSize;r++){
      for(let c=0;c<boardSize;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.src = grid[r][c] || '';
        cell.appendChild(img);
        boardEl.appendChild(cell);
        cells.push(cell);

        // click/touch handlers
        cell.addEventListener('click', onCellClick);
        addTouchSwipe(cell);
      }
    }
  }

  // click select / swap logic
  function onCellClick(e){
    const el = e.currentTarget;
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    if(!selected){
      selected = {r,c};
      el.classList.add('selected');
    } else {
      const prev = document.querySelector('.cell.selected');
      if(prev) prev.classList.remove('selected');
      const pr = selected.r, pc = selected.c;
      // if same cell => deselect
      if(pr===r && pc===c){ selected = null; return; }
      // if adjacent -> swap
      if( Math.abs(pr-r)+Math.abs(pc-c) === 1 ){
        swapAndProcess(pr,pc,r,c);
      } else {
        // select new
        selected = {r,c};
        el.classList.add('selected');
      }
    }
  }

  // add touch swipe on a cell (for mobile up/down/left/right)
  function addTouchSwipe(cell){
    let sx=0, sy=0, moved=false;
    cell.addEventListener('touchstart', (ev)=>{
      const t = ev.touches[0]; sx=t.clientX; sy=t.clientY; moved=false;
    }, {passive:true});
    cell.addEventListener('touchmove', (ev)=>{ moved=true; }, {passive:true});
    cell.addEventListener('touchend', (ev)=>{
      if(!moved) { cell.click(); return; }
      const t = ev.changedTouches[0]; const ex = t.clientX, ey = t.clientY;
      const dx = ex - sx, dy = ey - sy;
      if(Math.hypot(dx,dy) < 18) return;
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      let nr=r, nc=c;
      if(Math.abs(dx) > Math.abs(dy)){
        // horizontal
        nc = dx > 0 ? c+1 : c-1;
      } else {
        nr = dy > 0 ? r+1 : r-1;
      }
      if(nr<0||nr>=boardSize||nc<0||nc>=boardSize) return;
      swapAndProcess(r,c,nr,nc);
    }, {passive:true});
  }

  // swap tiles (r1,c1) <-> (r2,c2) and process matches
  function swapAndProcess(r1,c1,r2,c2){
    // guard
    if(!grid[r1] || !grid[r2]) return;
    // swap in grid
    const tmp = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = tmp;
    // update DOM quickly
    updateCellImg(r1,c1); updateCellImg(r2,c2);
    // check for matches
    const matches = findAllMatches();
    if(matches.length === 0){
      // if no match -> revert swap (animate quick)
      setTimeout(()=>{ // small delay for visual
        const t = grid[r1][c1]; grid[r1][c1]=grid[r2][c2]; grid[r2][c2]=t;
        updateCellImg(r1,c1); updateCellImg(r2,c2);
      }, 180);
      return;
    }
    // else remove and collapse
    handleMatchesAndGravity();
  }

  function updateCellImg(r,c){
    const idx = r*boardSize + c;
    const cell = cells[idx];
    if(!cell) return;
    const img = cell.querySelector('img.tile');
    if(img) img.src = grid[r][c] || '';
  }

  // find all matches (returns array of positions)
  function findAllMatches(){
    const toRemove = new Set();
    // horizontal
    for(let r=0;r<boardSize;r++){
      let streak = 1;
      for(let c=1;c<=boardSize;c++){
        const cur = grid[r][c], prev = grid[r][c-1];
        if(c<boardSize && cur && prev && cur === prev){
          streak++;
        } else {
          if(streak>=3){
            for(let k=0;k<streak;k++){
              toRemove.add(`${r},${c-1-k}`);
            }
          }
          streak = 1;
        }
      }
    }
    // vertical
    for(let c=0;c<boardSize;c++){
      let streak=1;
      for(let r=1;r<=boardSize;r++){
        const cur = (r<boardSize)?grid[r][c]:null, prev = (r-1>=0)?grid[r-1][c]:null;
        if(r<boardSize && cur && prev && cur === prev){
          streak++;
        } else {
          if(streak>=3){
            for(let k=0;k<streak;k++){
              toRemove.add(`${r-1-k},${c}`);
            }
          }
          streak=1;
        }
      }
    }
    // convert to array of coords
    return Array.from(toRemove).map(s => s.split(',').map(Number));
  }

  // remove matches, add score, collapse and refill
  function handleMatchesAndGravity(){
    const matches = findAllMatches();
    if(matches.length === 0) return;
    // mark removed by null and animate
    matches.forEach(([r,c])=>{
      const idx = r*boardSize + c;
      const cell = cells[idx];
      if(cell){
        cell.classList.add('pop');
        setTimeout(()=> cell.classList.remove('pop'), 300);
      }
      grid[r][c] = null;
    });

    // add score
    const gained = matches.length * 10;
    setScore(score + gained);

    // coins reward small
    StorageAPI.addCoins(Math.floor(matches.length/3));
    updateCoins();

    // collapse columns
    setTimeout(()=> {
      for(let c=0;c<boardSize;c++){
        let write = boardSize-1;
        for(let r=boardSize-1;r>=0;r--){
          if(grid[r][c]){
            grid[write][c] = grid[r][c];
            write--;
          }
        }
        // fill above with new candies
        for(let r=write;r>=0;r--){
          grid[r][c] = randCandy();
        }
      }
      // update DOM imgs
      for(let r=0;r<boardSize;r++){
        for(let c=0;c<boardSize;c++){
          updateCellImg(r,c);
        }
      }
      // after refill, check for chain matches recursively
      setTimeout(()=> {
        if(findAllMatches().length>0) handleMatchesAndGravity();
        else checkLevelComplete();
      }, 180);
    }, 260);
  }

  // ensure no immediate leftover matches (used on restart)
  function removeExistingMatches(){
    let any=false;
    do{
      const m = findAllMatches();
      if(m.length>0){
        any=true;
        m.forEach(([r,c])=> grid[r][c]=randCandy());
      } else break;
    } while(true);
    return any;
  }

  function checkLevelComplete(){
    const info = getLevelInfo(currentLevel);
    if(score >= (info.goal || Infinity)){
      // reward and unlock next
      const reward = info.reward || 0;
      StorageAPI.addCoins(reward);
      const next = currentLevel+1;
      if(getLevelInfo(next)){
        StorageAPI.setLevel(next);
        showLevelUp(next, reward);
        currentLevel = next;
      } else {
        showLevelUp(currentLevel, reward, true);
      }
      updateCoins();
      if(levelEl) levelEl.textContent = currentLevel;
    }
  }

  function showLevelUp(nextLevel, reward, finished){
    const modal = document.getElementById('levelUpModal');
    const title = document.getElementById('levelUpTitle');
    const msg = document.getElementById('levelUpMsg');
    if(!modal || !title || !msg) return;
    title.textContent = finished ? 'All Levels Complete!' : 'Level Unlocked!';
    msg.textContent = finished ? `आपने सभी levels complete किए। Reward: ${reward} coins.` : `Level ${nextLevel} unlocked! Reward: ${reward} coins.`;
    modal.style.display = 'flex';
    document.getElementById('levelUpClose').onclick = ()=>{ modal.style.display='none'; initGame(); };
  }

  // shuffle board randomly
  function shuffleBoard(){
    for(let r=0;r<boardSize;r++){
      for(let c=0;c<boardSize;c++){
        grid[r][c] = randCandy();
      }
    }
    renderBoard(); // rebind events
    removeExistingMatches();
    console.log('Board shuffled');
  }

  // restart
  function restart(){
    setScore(0);
    buildGrid();
    renderBoard();
    updateCoins();
    console.log('Game restarted');
  }

  // init game
  function initGame(){
    currentLevel = StorageAPI.getPlayLevel() || StorageAPI.getLevel() || 1;
    const info = getLevelInfo(currentLevel);
    if(levelEl) levelEl.textContent = currentLevel;
    setScore(0);
    buildGrid();
    renderBoard();
    updateCoins();
    // safety: ensure no leftover matches
    removeExistingMatches();
    console.log('Game initialized at level', currentLevel);
  }

  // expose some functions to global for buttons
  window.shuffleBoard = shuffleBoard;
  window.restartGame = restart;
  window.initGame = initGame;

  // wire UI buttons (if present)
  document.addEventListener('DOMContentLoaded', ()=>{
    const r = document.getElementById('restartBtn'); if(r) r.addEventListener('click', ()=>{ restart(); });
    const s = document.getElementById('shuffleBtn'); if(s) s.addEventListener('click', ()=>{ shuffleBoard(); });
    const openShop = document.getElementById('openShop');
    if(openShop) openShop.addEventListener('click', ()=>{ alert('Shop placeholder — coins: '+StorageAPI.getCoins()); });
    // start
    try { initGame(); } catch(e){ console.error('initGame error', e); }
  });
})();

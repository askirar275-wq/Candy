// js/game.js (updated)
(function(){
  const $ = id => document.getElementById(id);

  // candy images (use 6 images as requested)
  const CANDY_IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  // simple storage API stub (replace with your storage.js if exists)
  if(!window.StorageAPI){
    window.StorageAPI = {
      _coins: 0, _level:1,
      getCoins(){ return Number(localStorage.getItem('coins')||this._coins); },
      addCoins(n){ const v=this.getCoins()+Number(n||0); localStorage.setItem('coins',v); return v; },
      setLevel(l){ localStorage.setItem('level',l); },
      getLevel(){ return Number(localStorage.getItem('level')||1); }
    };
  }

  // state
  const state = {
    board: [], // 2D array [r][c] -> image index
    size: 7,
    level: 1,
    score: 0,
    movesLeft: 0,
    running: false,
    selected: null
  };

  // helpers
  function randCandyIndex(){ return Math.floor(Math.random()*CANDY_IMAGES.length); }

  // read level data
  function getLevelData(l){
    if(Array.isArray(window.LevelData)) {
      return LevelData.find(x=>x.id===l) || LevelData[0];
    }
    return { id:1, goal:500, moves:30, reward:50, boardSize:7 };
  }

  // build board element
  function createBoardElements(){
    const boardEl = $('game-board');
    if(!boardEl) return;
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${state.size}, 1fr)`;

    for(let r=0;r<state.size;r++){
      for(let c=0;c<state.size;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        const idx = state.board[r][c];
        img.src = CANDY_IMAGES[idx];
        cell.appendChild(img);
        boardEl.appendChild(cell);
        // mouse click select
        cell.addEventListener('click', ()=> handleCellClick(r,c));
      }
    }
  }

  // init board array with no immediate matches
  function initBoardArray(){
    const size = state.size;
    state.board = Array.from({length:size}, ()=> Array(size).fill(0));
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        let idx;
        do {
          idx = randCandyIndex();
          state.board[r][c] = idx;
        } while(hasMatchAt(r,c)); // avoid initial match
      }
    }
  }

  // check if current placed tile at r,c creates match (used for initial fill)
  function hasMatchAt(r,c){
    const idx = state.board[r][c];
    // check left-left
    if(c>1 && state.board[r][c-1]===idx && state.board[r][c-2]===idx) return true;
    // up-up
    if(r>1 && state.board[r-1][c]===idx && state.board[r-2][c]===idx) return true;
    return false;
  }

  // swap two positions in board and update DOM
  function swapPos(r1,c1,r2,c2, animate=true ){
    const tmp = state.board[r1][c1];
    state.board[r1][c1] = state.board[r2][c2];
    state.board[r2][c2] = tmp;
    // update DOM images
    const boardEl = $('game-board');
    if(!boardEl) return;
    const cellA = boardEl.querySelector(`.cell[data-r="${r1}"][data-c="${c1}"] img`);
    const cellB = boardEl.querySelector(`.cell[data-r="${r2}"][data-c="${c2}"] img`);
    if(cellA && cellB){
      const t1 = state.board[r1][c1], t2 = state.board[r2][c2];
      cellA.src = CANDY_IMAGES[t1];
      cellB.src = CANDY_IMAGES[t2];
    }
  }

  // clicking selection handling
  function handleCellClick(r,c){
    if(!state.running) return;
    if(!state.selected){
      state.selected = {r,c};
      highlightCell(r,c,true);
    } else {
      const sel = state.selected;
      // if same, deselect
      if(sel.r===r && sel.c===c){ highlightCell(r,c,false); state.selected=null; return; }
      // if adjacent, swap and process
      if(Math.abs(sel.r-r)+Math.abs(sel.c-c)===1){
        highlightCell(sel.r,sel.c,false);
        state.selected=null;
        makeMove(sel.r,sel.c,r,c);
      } else {
        // select new
        highlightCell(sel.r,sel.c,false);
        highlightCell(r,c,true);
        state.selected = {r,c};
      }
    }
  }

  function highlightCell(r,c,on){
    const boardEl = $('game-board');
    if(!boardEl) return;
    const cell = boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if(cell) {
      if(on) cell.classList.add('selected-cell'); else cell.classList.remove('selected-cell');
    }
  }

  // perform move (swap), then check matches
  function makeMove(r1,c1,r2,c2){
    // swap
    swapPos(r1,c1,r2,c2);
    // check matches
    const matches = findAllMatches();
    if(matches.length>0){
      state.movesLeft = Math.max(0,state.movesLeft-1);
      updateMovesUI();
      removeMatchesAndRefill(matches);
    } else {
      // revert swap (no match)
      setTimeout(()=> swapPos(r1,c1,r2,c2), 180);
    }
  }

  // find matches: return array of unique cell coords [{r,c}]
  function findAllMatches(){
    const size = state.size;
    const toRemove = new Set();
    // horizontal
    for(let r=0;r<size;r++){
      let run = 1;
      for(let c=1;c<=size;c++){
        if(c<size && state.board[r][c]===state.board[r][c-1]) run++;
        else {
          if(run>=3){
            for(let k=0;k<run;k++) toRemove.add(`${r},${c-1-k}`);
          }
          run=1;
        }
      }
    }
    // vertical
    for(let c=0;c<size;c++){
      let run=1;
      for(let r=1;r<=size;r++){
        if(r<size && state.board[r][c]===state.board[r-1][c]) run++;
        else {
          if(run>=3){
            for(let k=0;k<run;k++) toRemove.add(`${r-1-k},${c}`);
          }
          run=1;
        }
      }
    }
    return Array.from(toRemove).map(s=>{ const [r,c]=s.split(',').map(Number); return {r,c}; });
  }

  // remove matches, animate, apply gravity and refill
  function removeMatchesAndRefill(matches){
    // mark dom tiles removing
    const boardEl = $('game-board');
    if(!boardEl) return;
    matches.forEach(cell=>{
      const img = boardEl.querySelector(`.cell[data-r="${cell.r}"][data-c="${cell.c}"] img`);
      if(img) img.classList.add('tile-removing');
    });

    // calculate score
    state.score += matches.length * 10;
    updateScoreUI();

    // after animation remove and collapse
    setTimeout(()=>{
      // set removed cells to null
      matches.forEach(({r,c})=> state.board[r][c] = null);

      collapseBoard(); // gravity
      refillBoard(); // refill empties with random
      createBoardElements(); // re-render quickly
      // after refill, check new matches (chain)
      setTimeout(()=>{
        const newMatches = findAllMatches();
        if(newMatches.length>0){
          removeMatchesAndRefill(newMatches);
        } else {
          // chain ended, check level completion or moves
          checkLevelStatus();
        }
      }, 180);
    }, 260);
  }

  // gravity collapse - drop candies down to fill nulls
  function collapseBoard(){
    const size = state.size;
    for(let c=0;c<size;c++){
      let write = size-1;
      for(let r=size-1;r>=0;r--){
        if(state.board[r][c] !== null){
          state.board[write][c] = state.board[r][c];
          if(write!==r) state.board[r][c] = null;
          write--;
        }
      }
      // fill above with nulls (they'll be refilled)
      for(let r=write;r>=0;r--) state.board[r][c]=null;
    }
  }

  // refill nulls with new candies
  function refillBoard(){
    const size = state.size;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        if(state.board[r][c]===null || typeof state.board[r][c]==='undefined'){
          state.board[r][c] = randCandyIndex();
        }
      }
    }
  }

  // update UI helpers
  function updateScoreUI(){ const el = $('score'); if(el) el.textContent = state.score; }
  function updateMovesUI(){ const el = $('movesLeft'); if(el) el.textContent = state.movesLeft; }
  function updateCoinsUI(){ const el = $('coins'); if(el) el.textContent = StorageAPI.getCoins(); }
  function updateLevelUI(){ const el = $('levelNum'); if(el) el.textContent = state.level; }

  // check level complete or out of moves
  function checkLevelStatus(){
    const lvlData = getLevelData(state.level);
    if(state.score >= lvlData.goal){
      // give reward, unlock next
      StorageAPI.addCoins(lvlData.reward);
      updateCoinsUI();
      // unlock
      const next = state.level + 1;
      StorageAPI.setLevel(next);
      // show modal
      if(window.showLevelUpModal) window.showLevelUpModal(state.level, lvlData.reward);
    } else if(state.movesLeft<=0){
      // out of moves -> restart same level or prompt
      alert('Out of moves! Restarting level.');
      restartLevel(state.level);
    }
  }

  // restart level
  function restartLevel(l){
    state.level = l;
    startLevel(l);
  }

  // startLevel (exposed)
  window.startLevel = function(l){
    state.level = l || StorageAPI.getLevel() || 1;
    const data = getLevelData(state.level);
    state.size = data.boardSize || 7;
    state.score = 0;
    state.movesLeft = data.moves;
    state.running = true;
    initBoardArray();
    createBoardElements();
    updateScoreUI();
    updateMovesUI();
    updateLevelUI();
    updateCoinsUI();
    console.log('Game initialized at level', state.level);
  };

  // start game entry (called when Play pressed)
  window.initGame = function(){
    const current = StorageAPI.getLevel() || 1;
    const data = getLevelData(current);
    // show start overlay modal
    if(window.showStartOverlay) { window.showStartOverlay(data); }
    else { window.startLevel(current); }
  };

  // shuffle board (simple)
  window.shuffleBoard = function(){
    for(let r=0;r<state.size;r++){
      for(let c=0;c<state.size;c++){
        state.board[r][c] = randCandyIndex();
      }
    }
    createBoardElements();
    console.log('Board shuffled');
  };

  // restart game button
  window.restartGame = function(){
    startLevel(state.level);
  };

  // detect swipe (touch + mouse) on board
  (function addSwipeHandlers(){
    const boardEl = ()=>$('game-board');
    if(!boardEl()) return;
    let startX=0, startY=0, startR=null, startC=null, startTime=0;
    function getRCFromTarget(target){
      const cell = target.closest('.cell');
      if(!cell) return null;
      return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
    }
    // touchstart / mousedown
    function onPointerStart(e){
      const p = e.touches ? e.touches[0] : e;
      const pos = document.elementFromPoint(p.clientX, p.clientY);
      const rc = getRCFromTarget(pos);
      if(!rc) return;
      startX = p.clientX; startY = p.clientY; startR = rc.r; startC = rc.c; startTime = Date.now();
    }
    function onPointerEnd(e){
      if(startR===null) return;
      const p = (e.changedTouches ? e.changedTouches[0] : e);
      const dx = p.clientX - startX;
      const dy = p.clientY - startY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      const THRESH = 18; // minimal px to count as swipe
      let dr=0, dc=0;
      if(absX>absY && absX>THRESH){ dc = dx>0 ? 1 : -1; }
      else if(absY>absX && absY>THRESH){ dr = dy>0 ? 1 : -1; }
      if(dr!==0 || dc!==0){
        const r2 = startR + dr, c2 = startC + dc;
        if(r2>=0 && r2<state.size && c2>=0 && c2<state.size){
          // perform move
          makeMove(startR, startC, r2, c2);
        }
      }
      startR = null; startC = null;
    }
    // add handlers
    const el = boardEl();
    el.addEventListener('touchstart', onPointerStart, {passive:true});
    el.addEventListener('touchend', onPointerEnd, {passive:true});
    el.addEventListener('mousedown', onPointerStart);
    document.addEventListener('mouseup', onPointerEnd);
  })();

  // init on load: attach UI buttons
  document.addEventListener('DOMContentLoaded', ()=>{
    // wire UI buttons if present
    const playBtn = $('playBtn'); if(playBtn) playBtn.addEventListener('click', ()=> initGame());
    const restartBtn = $('btnRestart'); if(restartBtn) restartBtn.addEventListener('click', ()=> restartGame());
    const shuffleBtn = $('btnShuffle'); if(shuffleBtn) shuffleBtn.addEventListener('click', ()=> shuffleBoard());
    // next-level button
    const nextBtn = document.querySelector('.level-up-next');
    if(nextBtn) nextBtn.addEventListener('click', ()=>{
      const next = state.level + 1;
      StorageAPI.setLevel(next);
      window.startLevel(next);
      const modal = document.getElementById('levelUpModal');
      if(modal){ modal.classList.remove('show'); setTimeout(()=> modal.style.display='none',220); }
    });

    console.log('Loaded: js/game.js (updated)');
  });

})();

// js/game.js
(function(){
  // Config: Use only 6 candies
  const CANDY_IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  // Levels (simple)
  const LEVELS = [ null, { id:1, title:'Beginner', goalScore:100, rewardCoins:50, boardSize:8 }, { id:2, title:'Explorer', goalScore:300, rewardCoins:120, boardSize:8 } ];

  // state
  let state = { level:1, score:0, boardSize:8, running:false, grid:[] };

  const $ = id => document.getElementById(id);

  // StorageAPI wrappers (safe)
  function getLevelFromStorage(){ try{ if(window.StorageAPI && typeof StorageAPI.getLevel==='function') return Number(StorageAPI.getLevel())||1; }catch(e){} return 1; }
  function getCoinsFromStorage(){ try{ if(window.StorageAPI && typeof StorageAPI.getCoins==='function') return Number(StorageAPI.getCoins())||0; }catch(e){} return 0; }

  window.updateCoinDisplay = function(){
    const el = $('coins'); if(el) el.textContent = getCoinsFromStorage();
    const shop = $('shopCoins'); if(shop) shop.textContent = getCoinsFromStorage();
  };

  // helpers
  function randCandySrc(){ return CANDY_IMAGES[Math.floor(Math.random()*CANDY_IMAGES.length)]; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  // update level UI
  window.updateLevelUI = function(){
    state.level = getLevelFromStorage();
    const levelInfo = LEVELS[state.level] || LEVELS[1];
    state.boardSize = levelInfo.boardSize || 8;
    const cur = $('currentLevel'); if(cur) cur.textContent = state.level;
    const curTop = $('currentLevelTop'); if(curTop) curTop.textContent = state.level;
    // set board grid template
    const board = $('game-board');
    if(board) {
      board.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${state.boardSize}, 1fr)`;
    }
    const title = $('levelTitle'); if(title) title.textContent = levelInfo.title || '';
    const goal = $('levelGoalScore'); if(goal) goal.textContent = levelInfo.goalScore || 0;
  };

  // build empty grid representation
  function createEmptyGrid(){
    const size = Number(state.boardSize) || 8;
    const g = new Array(size);
    for(let r=0;r<size;r++){ g[r] = new Array(size); for(let c=0;c<size;c++) g[r][c] = null; }
    state.grid = g;
  }

  // render board DOM from state.grid
  function renderBoard(){
    const board = $('game-board'); if(!board) return;
    board.innerHTML = '';
    const size = state.boardSize;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.src = state.grid[r][c] || randCandySrc();
        state.grid[r][c] = img.src;
        cell.appendChild(img);
        board.appendChild(cell);
        attachCellHandlers(cell);
      }
    }
  }

  // attach click/touch handlers for a cell
  let touchStart = null;
  function attachCellHandlers(cell){
    // click select toggle
    cell.addEventListener('click', () => {
      cell.classList.toggle('selected-cell');
    });

    // touch swipe support
    cell.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, r: +cell.dataset.r, c: +cell.dataset.c };
    }, {passive:true});

    cell.addEventListener('touchend', (e) => {
      if(!touchStart) return;
      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if(!t) { touchStart = null; return; }
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      const dir = absX > absY ? (dx>0? 'right':'left') : (dy>0?'down':'up');
      const r = touchStart.r, c = touchStart.c;
      let nr = r, nc = c;
      if(dir === 'right') nc = c+1;
      if(dir === 'left') nc = c-1;
      if(dir === 'down') nr = r+1;
      if(dir === 'up') nr = r-1;
      if(nr>=0 && nr<state.boardSize && nc>=0 && nc<state.boardSize){
        swapTiles(r,c,nr,nc);
      }
      touchStart = null;
    }, {passive:true});
  }

  // swap two tiles (r1,c1) <-> (r2,c2)
  function swapTiles(r1,c1,r2,c2){
    // swap in state.grid
    const tmp = state.grid[r1][c1];
    state.grid[r1][c1] = state.grid[r2][c2];
    state.grid[r2][c2] = tmp;
    // update DOM quickly
    const board = $('game-board');
    if(board){
      const idx1 = r1*state.boardSize + c1;
      const idx2 = r2*state.boardSize + c2;
      const cell1 = board.children[idx1];
      const cell2 = board.children[idx2];
      if(cell1 && cell2){
        const img1 = cell1.querySelector('img.tile');
        const img2 = cell2.querySelector('img.tile');
        if(img1 && img2){
          const s1 = img1.src, s2 = img2.src;
          img1.src = s2; img2.src = s1;
        }
      }
    }
    // after swap check matches; if none, swap back (simple rule)
    const matches = findMatches();
    if(matches.length === 0){
      // swap back
      const tmp2 = state.grid[r1][c1];
      state.grid[r1][c1] = state.grid[r2][c2];
      state.grid[r2][c2] = tmp2;
      // restore dom
      if(board){
        const idx1 = r1*state.boardSize + c1;
        const idx2 = r2*state.boardSize + c2;
        const cell1 = board.children[idx1];
        const cell2 = board.children[idx2];
        if(cell1 && cell2){
          const img1 = cell1.querySelector('img.tile');
          const img2 = cell2.querySelector('img.tile');
          const s1 = img1.src, s2 = img2.src;
          img1.src = s2; img2.src = s1;
        }
      }
      return; // no match
    }
    // if matches found, resolve them
    resolveMatches(matches);
  }

  // find matches (simple horizontal/vertical 3+)
  function findMatches(){
    const size = state.boardSize;
    const grid = state.grid;
    const matches = []; // array of positions {r,c}
    const addMatch = (arr) => { if(arr.length>=3) matches.push(...arr); };

    // horizontal
    for(let r=0;r<size;r++){
      let run = [{r,c:0}];
      for(let c=1;c<size;c++){
        if(grid[r][c] && grid[r][c-1] && grid[r][c] === grid[r][c-1]){
          run.push({r,c});
        } else {
          addMatch(run);
          run = [{r,c}];
        }
      }
      addMatch(run);
    }

    // vertical
    for(let c=0;c<size;c++){
      let run = [{r:0,c}];
      for(let r=1;r<size;r++){
        if(grid[r][c] && grid[r-1][c] && grid[r][c] === grid[r-1][c]){
          run.push({r,c});
        } else {
          addMatch(run);
          run = [{r,c}];
        }
      }
      addMatch(run);
    }

    // make unique positions (some overlapped)
    const keySet = new Set();
    const uniq = [];
    matches.forEach(p => {
      const k = p.r + ',' + p.c;
      if(!keySet.has(k)){ keySet.add(k); uniq.push(p); }
    });
    return uniq;
  }

  // resolve matches: remove, gravity, fill, score increment, then re-check chain
  function resolveMatches(matches){
    if(matches.length===0) return;
    // remove matched tiles
    matches.forEach(p => { state.grid[p.r][p.c] = null; });
    // animate removal: quick DOM hide
    const board = $('game-board');
    if(board){
      matches.forEach(p => {
        const idx = p.r*state.boardSize + p.c;
        const cell = board.children[idx];
        if(cell){
          const img = cell.querySelector('img.tile');
          if(img) { img.style.opacity = '0.2'; img.style.transform = 'scale(0.85)'; }
        }
      });
    }
    // scoring
    state.score += matches.length * 10;
    updateScoreUI();
    // gravity: for each column, drop down and fill top with new random candy
    const size = state.boardSize;
    for(let c=0;c<size;c++){
      let write = size-1;
      for(let r=size-1;r>=0;r--){
        if(state.grid[r][c] !== null){
          state.grid[write][c] = state.grid[r][c];
          if(write !== r) state.grid[r][c] = null;
          write--;
        }
      }
      // fill remaining top
      for(let r=write;r>=0;r--){
        state.grid[r][c] = randCandySrcLocal();
      }
    }
    // update DOM to reflect new grid
    if(board){
      for(let r=0;r<size;r++){
        for(let c=0;c<size;c++){
          const idx = r*size + c;
          const cell = board.children[idx];
          if(cell){
            const img = cell.querySelector('img.tile');
            if(img){
              img.style.transition = 'transform 180ms, opacity 180ms';
              img.src = state.grid[r][c];
              img.style.opacity = '1';
              img.style.transform = 'scale(1)';
            }
          }
        }
      }
    }
    // after gravity & fill, small delay then check new matches (chain)
    setTimeout(() => {
      const next = findMatches();
      if(next.length>0) {
        // small delay to show chain
        setTimeout(()=> resolveMatches(next), 220);
      } else {
        // done, update coins maybe
        try { if(window.StorageAPI && typeof StorageAPI.addCoins === 'function') StorageAPI.addCoins(matches.length); } catch(e){}
        updateCoinDisplay();
      }
    }, 220);
  }

  // helper to get random candy quickly (no external path confusion)
  function randCandySrcLocal(){ return CANDY_IMAGES[Math.floor(Math.random()*CANDY_IMAGES.length)]; }

  // update score UI
  function updateScoreUI(){ const s = $('score'); if(s) s.textContent = state.score; }

  // public functions
  window.initGame = function(){
    try {
      state.level = getLevelFromStorage() || 1;
      state.score = 0;
      state.running = true;
      // level UI
      window.updateLevelUI && window.updateLevelUI();
      // create grid and render
      createEmptyGrid();
      // fill grid with random candies, avoid initial immediate matches by reshuffling few times
      const size = state.boardSize;
      for(let r=0;r<size;r++){
        for(let c=0;c<size;c++){
          state.grid[r][c] = randCandySrcLocal();
        }
      }
      // remove any immediate matches by reassigning randoms until no initial matches
      let tries = 0;
      while(findMatches().length>0 && tries<8){
        for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(Math.random()<0.3) state.grid[r][c] = randCandySrcLocal();
        tries++;
      }
      renderBoard();
      updateScoreUI();
      updateCoinDisplay();
      console.log('Game initialized at level', state.level);
    } catch(e){
      console.error('initGame error', e);
    }
  };

  window.restartGame = function(){ state.score=0; initGame && initGame(); console.log('Game restarted'); };
  window.shuffleBoard = function(){ // simple shuffle: randomize every cell
    const size = state.boardSize;
    for(let r=0;r<size;r++) for(let c=0;c<size;c++) state.grid[r][c] = randCandySrcLocal();
    renderBoard();
    console.log('Board shuffled');
  };

  // buy handler
  window.buyFromShop = function(item){
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const p = prices[item] || 0;
    const coins = getCoinsFromStorage();
    if(coins >= p){
      try{ StorageAPI.addCoins(-p); }catch(e){}
      updateCoinDisplay();
      if(item === 'shuffle') shuffleBoard();
      console.log('Bought', item);
    } else {
      console.warn('Not enough coins for', item);
    }
  };

  window.addCoins = function(n){ try{ StorageAPI.addCoins(Number(n||0)); updateCoinDisplay(); }catch(e){} };

  // small helper: set level (dev)
  window.setGameLevel = function(l){ try{ StorageAPI.setLevel(Number(l)); window.updateLevelUI && window.updateLevelUI(); }catch(e){console.warn(e);} };

  console.log('Loaded: js/game.js (6-candy engine)');
})();

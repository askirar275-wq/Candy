/* game.js
   Core game: create board, swap by touch/click, find matches, gravity, HUD updates.
   Hindi comments for clarity.
*/

(function(){
  const defaultSize = 8; // default board size (can be overridden by LevelAPI)
  const IMAGE_BASE = 'images/';
  const CANDY_NAMES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png','candy7.png','candy8.png','candy9.png','candy10.png'];

  let BOARD_SIZE = defaultSize;
  let SIZE = BOARD_SIZE * BOARD_SIZE;
  let board = []; // array of {src: 'images/..', id: number} or null
  let nextId = 1;
  let score = 0, moves = 40, combo = 1;
  let dragging = false, pointerId = null, startIndex = null, locked = false;

  // preload images (light)
  const pool = CANDY_NAMES.map(n => IMAGE_BASE + n);

  function randCandy(){
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function makeTile(src){
    return { id: nextId++, src: src || randCandy() };
  }

  function setBoardSizeFromLevel(){
    try{
      const lvl = (window.LevelAPI && window.LevelAPI.getLevel) ? window.LevelAPI.getLevel() : StorageAPI.getLevel();
      const info = (window.LevelAPI && window.LevelAPI.getInfo) ? window.LevelAPI.getInfo(lvl) : null;
      BOARD_SIZE = info && info.boardSize ? info.boardSize : defaultSize;
    }catch(e){
      BOARD_SIZE = defaultSize;
    }
    SIZE = BOARD_SIZE * BOARD_SIZE;
  }

  function createGridDOM(){
    const grid = document.getElementById('game-board');
    if(!grid) return;
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    for(let i=0;i<SIZE;i++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = String(i);
      const img = document.createElement('img');
      img.className = 'tile';
      img.draggable = false;
      cell.appendChild(img);
      cell.addEventListener('pointerdown', onPointerDown);
      grid.appendChild(cell);
    }
  }

  function render(dropMap){
    const cells = document.querySelectorAll('#game-board .cell');
    cells.forEach((cell, i)=>{
      const img = cell.querySelector('.tile');
      const tile = board[i];
      if(tile){
        if(img.dataset.src !== tile.src){
          img.dataset.src = tile.src; img.src = tile.src;
        }
        cell.style.visibility = '';
      } else {
        img.dataset.src = ''; img.src = '';
        cell.style.visibility = 'hidden';
      }
      cell.style.transform = '';
      cell.classList.remove('selected-cell');
      img.classList.remove('pop');
      // dropMap handling for new tiles (optional)
      if(dropMap && tile && dropMap[tile.id]){
        cell.style.transform = `translateY(${dropMap[tile.id]})`;
        requestAnimationFrame(()=> requestAnimationFrame(()=> { cell.style.transition = 'transform 320ms cubic-bezier(.2,.8,.2,1)'; cell.style.transform = ''; }));
      }
    });
    updateHUD();
  }

  function initBoard(){
    setBoardSizeFromLevel();
    board = new Array(SIZE).fill(null).map(()=>makeTile());
    // avoid initial matches by regenerating (simple)
    let tries = 0;
    while(findMatches().length > 0 && tries++ < 800){
      board = new Array(SIZE).fill(null).map(()=>makeTile());
    }
    nextId = SIZE + 1;
  }

  /* ---------- Swap animation (cloned images) ---------- */
  function tileEl(index){
    return document.querySelector(`.cell[data-index="${index}"] .tile`);
  }
  function swapModel(i,j){ [board[i], board[j]] = [board[j], board[i]]; }

  function swapWithAnimation(aIndex, bIndex){
    return new Promise(resolve => {
      const aTile = tileEl(aIndex), bTile = tileEl(bIndex);
      if(!aTile || !bTile){
        swapModel(aIndex, bIndex);
        render();
        return resolve(true);
      }
      const aRect = aTile.getBoundingClientRect(), bRect = bTile.getBoundingClientRect();
      const dx = bRect.left - aRect.left, dy = bRect.top - aRect.top;

      const aClone = aTile.cloneNode(true), bClone = bTile.cloneNode(true);
      [aClone,bClone].forEach((cl, idx)=>{
        cl.style.position = 'absolute';
        cl.style.left = (idx===0 ? aRect.left : bRect.left) + 'px';
        cl.style.top = (idx===0 ? aRect.top : bRect.top) + 'px';
        cl.style.width = aRect.width + 'px';
        cl.style.height = aRect.height + 'px';
        cl.style.margin = 0; cl.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1)'; cl.style.zIndex = 9999;
        cl.classList.add('swap-moving');
        document.body.appendChild(cl);
      });

      aTile.style.visibility = 'hidden'; bTile.style.visibility = 'hidden';

      requestAnimationFrame(()=> {
        aClone.style.transform = `translate(${dx}px, ${dy}px)`;
        bClone.style.transform = `translate(${-dx}px, ${-dy}px)`;
      });

      const cleanup = ()=>{
        aClone.remove(); bClone.remove();
        aTile.style.visibility = ''; bTile.style.visibility = '';
        swapModel(aIndex, bIndex);
        render();
        resolve(true);
      };
      setTimeout(cleanup, 300);
    });
  }

  /* ---------- Match detection ---------- */
  function findMatches(){
    const matches = new Set();
    // horizontal
    for(let r=0;r<BOARD_SIZE;r++){
      for(let c=0;c<BOARD_SIZE-2;c++){
        const i = r*BOARD_SIZE + c;
        if(board[i] && board[i+1] && board[i+2] &&
           board[i].src === board[i+1].src && board[i].src === board[i+2].src){
          let k=c;
          while(k<BOARD_SIZE && board[r*BOARD_SIZE+k] && board[r*BOARD_SIZE+k].src === board[i].src){ matches.add(r*BOARD_SIZE+k); k++; }
        }
      }
    }
    // vertical
    for(let c=0;c<BOARD_SIZE;c++){
      for(let r=0;r<BOARD_SIZE-2;r++){
        const i = r*BOARD_SIZE + c;
        if(board[i] && board[i+BOARD_SIZE] && board[i+2*BOARD_SIZE] &&
           board[i].src === board[i+BOARD_SIZE].src && board[i].src === board[i+2*BOARD_SIZE].src){
          let k=r;
          while(k<BOARD_SIZE && board[k*BOARD_SIZE + c] && board[k*BOARD_SIZE + c].src === board[i].src){ matches.add(k*BOARD_SIZE + c); k++; }
        }
      }
    }
    return Array.from(matches).sort((a,b)=>a-b);
  }

  /* ---------- Handle matches (pop -> gravity -> refill) ---------- */
  function handleMatches(matches){
    if(!matches || matches.length === 0) return;
    locked = true;
    // scoring & coins: each tile -> 10 points and +1 coin
    const removedCount = matches.length;
    score += removedCount * 10 * (combo || 1);
    StorageAPI.addCoins(Math.floor(removedCount)); // 1 coin per tile
    combo++;
    // animate pop
    matches.forEach(i=>{
      const el = tileEl(i);
      if(el){
        el.classList.add('pop');
        el.style.transition = 'transform 320ms, opacity 320ms';
        el.style.transform = 'scale(0.2)';
        el.style.opacity = '0';
      }
      board[i] = null;
    });
    updateHUD();
    setTimeout(()=> {
      // gravity + refill: build columns
      const cols = [];
      for(let c=0;c<BOARD_SIZE;c++){
        const col = [];
        for(let r=BOARD_SIZE-1;r>=0;r--){
          const idx = r*BOARD_SIZE + c;
          if(board[idx]) col.push(board[idx]);
        }
        cols.push(col);
      }
      const newBoard = new Array(SIZE).fill(null);
      const dropMap = {};
      const tilePx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || 64;
      const oldIds = new Set(board.filter(Boolean).map(t=>t.id));
      for(let c=0;c<BOARD_SIZE;c++){
        const col = cols[c];
        while(col.length < BOARD_SIZE) col.push(makeTile());
        for(let r=BOARD_SIZE-1,i=0;r>=0;r--,i++){
          const tile = col[i];
          newBoard[r*BOARD_SIZE + c] = tile;
          if(!oldIds.has(tile.id)) dropMap[tile.id] = `-${(i+1)*tilePx}px`;
        }
      }
      board = newBoard;
      render(dropMap);
      // chain detection
      setTimeout(()=> {
        const next = findMatches();
        if(next.length>0) handleMatches(next);
        else { combo = 1; locked = false; updateHUD(); }
      }, 260);
    }, 360);
  }

  /* ---------- Input (pointer drag to swap) ---------- */
  function onPointerDown(e){
    if(locked) return;
    const el = e.currentTarget;
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
    dragging = true; pointerId = e.pointerId; startIndex = Number(el.dataset.index);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }
  function onPointerMove(e){
    if(!dragging || e.pointerId !== pointerId) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if(!target) return;
    const cell = target.closest && target.closest('.cell') ? target.closest('.cell') : null;
    if(!cell) return;
    const idx = Number(cell.dataset.index);
    if(Number.isNaN(idx)) return;
    if(isAdjacent(startIndex, idx) && idx !== startIndex && !locked){
      // attempt swap
      locked = true;
      swapWithAnimation(startIndex, idx).then(()=> {
        const matches = findMatches();
        if(matches.length>0){
          moves = Math.max(0, moves-1);
          handleMatches(matches);
        } else {
          // swap back
          setTimeout(()=> {
            swapWithAnimation(startIndex, idx).then(()=> { locked = false; updateHUD(); });
          }, 260);
        }
      });
      startIndex = idx;
    }
  }
  function onPointerUp(e){
    dragging = false; pointerId = null; startIndex = null;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  }
  function isAdjacent(a,b){
    if(a==null||b==null) return false;
    const r1 = Math.floor(a/BOARD_SIZE), c1 = a%BOARD_SIZE, r2 = Math.floor(b/BOARD_SIZE), c2 = b%BOARD_SIZE;
    return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
  }

  /* ---------- HUD ---------- */
  function updateHUD(){
    const s = document.getElementById('score'); if(s) s.textContent = score;
    const m = document.getElementById('moves'); if(m) m.textContent = moves;
    const coinsEl = document.getElementById('coins'); if(coinsEl) coinsEl.textContent = StorageAPI.getCoins();
    if(window.refreshShopUI) window.refreshShopUI();
    // check level completion via LevelAPI goal
    try{
      const level = (window.LevelAPI && window.LevelAPI.getLevel) ? window.LevelAPI.getLevel() : StorageAPI.getLevel();
      const info = (window.LevelAPI && window.LevelAPI.getInfo) ? window.LevelAPI.getInfo(level) : null;
      if(info && score >= info.goalScore){
        // notify level API
        if(window.LevelAPI && window.LevelAPI.onLevelComplete) window.LevelAPI.onLevelComplete();
        // reset score (or you can keep cumulative), here we reset
        score = 0;
      }
    }catch(e){}
  }

  /* ---------- Helper functions ---------- */
  function shuffleBoard(){
    const srcs = board.map(b => b ? b.src : randCandy());
    for(let i=srcs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [srcs[i],srcs[j]]=[srcs[j],srcs[i]]; }
    board = srcs.map(s => ({id: nextId++, src:s}));
    render();
    updateHUD();
  }
  function restartGame(){
    initGame();
  }
  function addMoves(n){ moves = Number(moves||0) + Number(n||0); updateHUD(); }

  /* ---------- Expose API to window ---------- */
  window.initGame = function(){
    try{
      setBoardSizeFromLevel();
      initBoard();
      createGridDOM();
      render();
      score = 0; moves = 40; combo = 1;
      updateHUD();
      console.log('Game initialized. Board size:', BOARD_SIZE);
    }catch(e){ console.error('initGame error', e); }
  };
  window.shuffleBoard = shuffleBoard;
  window.restartGame = restartGame;
  window.addMoves = addMoves;
  window.buyFromShop = window.buyFromShop || function(item){ if(typeof window.buyFromShop === 'function') window.buyFromShop(item); };

  // init hook (preload minimal images)
  window.addEventListener('load', ()=> {
    // create DOM cells if not present
    const grid = document.getElementById('game-board');
    if(grid && grid.children.length === 0) createGridDOM();
  }, {passive:true});

})();

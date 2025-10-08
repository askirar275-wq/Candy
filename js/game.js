/* === js/game.js ===
   Copy-paste this file into js/game.js in your repo.
   Works with images: images/candy1.png .. candy6.png (as in your repo)
   Provides: initGame(), restartGame(), shuffleBoard(), buyFromShop(), updateCoinDisplay()
   Safe checks so it won't crash if elements missing.
*/

(function () {
  // Config
  const ROWS = 8;
  const COLS = 8;
  const CANDY_COUNT = 6; // candy1..candy6
  const COINS_PER_TILE = 1; // coins gained per removed tile
  const STORAGE_KEY_COINS = 'candy_coins_v1';

  // State
  let board = []; // linear array length ROWS*COLS, each value 1..CANDY_COUNT
  let tileElements = []; // DOM <img> for each cell
  let busy = false;
  let score = 0;
  let coins = 0;

  // Helpers
  function $id(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Storage helpers
  function loadCoins() {
    try {
      const v = parseInt(localStorage.getItem(STORAGE_KEY_COINS));
      coins = isNaN(v) ? 0 : v;
    } catch (e) { coins = 0; }
    updateCoinDisplay();
  }
  function saveCoins() {
    try { localStorage.setItem(STORAGE_KEY_COINS, String(coins)); } catch(e){}
    updateCoinDisplay();
  }

  function updateCoinDisplay() {
    const el = $id('coins') || document.querySelector('.coins-bubble');
    if (el) {
      el.textContent = coins;
    } else {
      console.warn('updateCoinDisplay: coins element not found');
    }
    const shopCoins = $id('shopCoins');
    if (shopCoins) shopCoins.textContent = coins;
  }

  // Create random candy value 1..CANDY_COUNT
  function randCandy() { return Math.floor(Math.random() * CANDY_COUNT) + 1; }

  // Index helpers
  function idx(r,c){ return r * COLS + c; }
  function rc(i){ return {r: Math.floor(i / COLS), c: i % COLS}; }
  function neighbors(a,b){
    const ar = rc(a), br = rc(b);
    const dr = Math.abs(ar.r - br.r), dc = Math.abs(ar.c - br.c);
    return (dr + dc) === 1;
  }

  // Render board DOM
  function ensureBoardDom(){
    const boardEl = $id('game-board');
    if(!boardEl){
      console.warn('game-board not found');
      return null;
    }
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    tileElements = [];
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = idx(r,c);

        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.alt = 'candy';
        // size controlled by CSS; set src below
        cell.appendChild(img);
        boardEl.appendChild(cell);
        tileElements.push(img);
      }
    }
    attachTileEvents();
    return boardEl;
  }

  // Set image src for candy value
  function candySrc(v){
    return `images/candy${v}.png`;
  }

  // Apply board values to DOM
  function renderBoard() {
    for(let i=0;i<board.length;i++){
      const v = board[i];
      const img = tileElements[i];
      if(!img) continue;
      img.src = candySrc(v);
      img.dataset.value = v;
      img.style.opacity = '1';
      img.classList.remove('pop');
    }
  }

  // Initialize random board ensuring no immediate matches
  function fillBoardRandom(){
    board = new Array(ROWS*COLS).fill(0);
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let i = idx(r,c);
        let tries = 0;
        do {
          board[i] = randCandy();
          tries++;
          // avoid 3-in-a-row horizontally
          if(c>=2 && board[i] === board[idx(r,c-1)] && board[i] === board[idx(r,c-2)]) continue;
          // avoid 3-in-a-row vertically
          if(r>=2 && board[i] === board[idx(r-1,c)] && board[i] === board[idx(r-2,c)]) continue;
          break;
        } while(tries < 10);
      }
    }
  }

  // Find matches (returns set of indices to remove)
  function findMatches() {
    const remove = new Set();

    // Horizontal
    for(let r=0;r<ROWS;r++){
      let runVal = null, runStart = 0, runLen = 0;
      for(let c=0;c<=COLS;c++){
        const i = (c < COLS) ? idx(r,c) : -1;
        const val = (i>=0) ? board[i] : null;
        if(val === runVal){
          runLen++;
        } else {
          if(runLen >= 3){
            for(let k=0;k<runLen;k++) remove.add(idx(r, runStart + k));
          }
          runVal = val;
          runStart = c;
          runLen = (c < COLS) ? 1 : 0;
        }
      }
    }

    // Vertical
    for(let c=0;c<COLS;c++){
      let runVal = null, runStart = 0, runLen = 0;
      for(let r=0;r<=ROWS;r++){
        const i = (r < ROWS) ? idx(r,c) : -1;
        const val = (i>=0) ? board[i] : null;
        if(val === runVal){
          runLen++;
        } else {
          if(runLen >= 3){
            for(let k=0;k<runLen;k++) remove.add(idx(runStart + k, c));
          }
          runVal = val;
          runStart = r;
          runLen = (r < ROWS) ? 1 : 0;
        }
      }
    }

    return Array.from(remove).sort((a,b)=>a-b);
  }

  // Remove indices, animate, collapse, refill
  function resolveMatchesAndDrop() {
    return new Promise(async (resolve) => {
      let totalRemoved = 0;
      async function loopStep(){
        const matches = findMatches();
        if(matches.length === 0){
          resolve(totalRemoved);
          return;
        }
        totalRemoved += matches.length;
        // animate pop for matched tiles
        matches.forEach(i => {
          const img = tileElements[i];
          if(img){
            img.classList.add('pop');
            // small opacity/fade handled by CSS .tile.pop
          }
        });
        // wait for animation (300ms)
        await new Promise(r=>setTimeout(r, 320));

        // actually remove (set to 0)
        matches.forEach(i => board[i] = 0);

        // collapse columns
        for(let c=0;c<COLS;c++){
          const colVals = [];
          for(let r=ROWS-1;r>=0;r--){
            const v = board[idx(r,c)];
            if(v !== 0) colVals.push(v);
          }
          // fill new at top
          while(colVals.length < ROWS) colVals.push(randCandy());
          // write back
          for(let r=ROWS-1, k=0;r>=0;r--,k++){
            board[idx(r,c)] = colVals[k];
          }
        }
        renderBoard();
        // continue to catch chain matches
        await loopStep();
      }
      await loopStep();
    });
  }

  // Swap two indices visually + in board
  function doSwap(a,b) {
    // swap in model
    const t = board[a]; board[a] = board[b]; board[b] = t;
    // animate clones (simple: just re-render)
    renderBoard();
  }

  // Attempt swap: if leads to matches keep, else swap back
  async function trySwap(a,b){
    if(busy) return false;
    if(!neighbors(a,b)) return false;
    busy = true;
    doSwap(a,b);
    const matches = findMatches();
    if(matches.length === 0){
      // revert
      await new Promise(r=>setTimeout(r, 180));
      doSwap(a,b);
      busy = false;
      return false;
    } else {
      // resolve matches, award coins/score
      const removed = await resolveMatchesAndDrop();
      score += removed * 10;
      coins += removed * COINS_PER_TILE;
      saveCoins();
      updateScoreDisplay();
      busy = false;
      return true;
    }
  }

  // UI: score
  function updateScoreDisplay(){
    const el = $id('score');
    if(el) el.textContent = score;
  }

  // Shuffle board (randomize)
  function shuffleBoard(){
    if(busy) return;
    busy = true;
    // flat random but ensure no immediate matches
    fillBoardRandom();
    renderBoard();
    busy = false;
  }

  // Restart
  function restartGame(){
    score = 0;
    updateScoreDisplay();
    loadCoins();
    fillBoardRandom();
    renderBoard();
  }

  // Simple shop buy handler (bomb/shuffle/moves/rainbow) - placeholder effects
  function buyFromShop(item){
    if(!item) return;
    const priceMap = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const price = priceMap[item] || 0;
    if(coins < price){
      alert('Not enough coins');
      return;
    }
    coins -= price;
    saveCoins();
    if(item === 'shuffle'){
      shuffleBoard();
      alert('Shuffle used!');
    } else if(item === 'moves'){
      alert('Extra moves bought (demo)');
    } else if(item === 'bomb'){
      // remove a random tile + resolve
      const randIdx = Math.floor(Math.random() * board.length);
      board[randIdx] = 0; // mark removed
      // collapse & refill then resolve chains
      (async ()=>{
        await resolveMatchesAndDrop();
        updateScoreDisplay();
      })();
    } else if(item === 'rainbow'){
      alert('Rainbow bought (demo)');
    }
  }

  // Touch/mouse swipe handling
  function attachTileEvents(){
    // remove old listeners by cloning nodes (safe)
    tileElements.forEach((img, i) => {
      const parent = img.parentNode;
      if(!parent) return;
    });

    let startIdx = null;
    let touchStart = null;

    function onPointerDown(e){
      if(busy) return;
      const t = e.target;
      const parent = t.closest('.cell');
      if(!parent) return;
      startIdx = parseInt(parent.dataset.index, 10);
      touchStart = { x: (e.touches ? e.touches[0].clientX : e.clientX), y: (e.touches ? e.touches[0].clientY : e.clientY) };
      e.preventDefault && e.preventDefault();
    }

    function onPointerUp(e){
      if(startIdx === null) return;
      const endX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
      const endY = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
      const dx = endX - touchStart.x;
      const dy = endY - touchStart.y;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      let targetIdx = null;
      if(Math.max(absX, absY) < 18){
        // treat as tap - no swap
        startIdx = null; touchStart = null;
        return;
      }
      if(absX > absY){
        // horizontal
        targetIdx = dx > 0 ? startIdx + 1 : startIdx -1;
      } else {
        // vertical
        targetIdx = dy > 0 ? startIdx + COLS : startIdx - COLS;
      }
      // bounds check
      if(targetIdx < 0 || targetIdx >= board.length) { startIdx = null; touchStart = null; return; }
      // also ensure not wrapping across rows for horizontal
      const a = rc(startIdx), b = rc(targetIdx);
      if(Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) { startIdx = null; touchStart = null; return; }

      trySwap(startIdx, targetIdx).catch(err => console.error(err));
      startIdx = null; touchStart = null;
    }

    // attach listeners on container and use event delegation
    const boardEl = $id('game-board');
    if(!boardEl) {
      console.warn('attachTileEvents: game-board not found');
      return;
    }
    // remove existing listeners if any by cloning node
    const newBoardEl = boardEl.cloneNode(true);
    boardEl.parentNode.replaceChild(newBoardEl, boardEl);

    // re-populate tileElements reference to new DOM nodes
    const cells = newBoardEl.querySelectorAll('.cell');
    tileElements = Array.from(cells).map(cell => cell.querySelector('.tile'));

    // pointer/touch events
    newBoardEl.addEventListener('touchstart', onPointerDown, {passive:true});
    newBoardEl.addEventListener('touchend', onPointerUp, {passive:true});
    newBoardEl.addEventListener('mousedown', onPointerDown);
    newBoardEl.addEventListener('mouseup', onPointerUp);

    // also support simple click for desktop: swap with neighbor to right (debug)
    newBoardEl.addEventListener('click', (ev)=>{
      // no default action
    });
  }

  // Public init
  function initGame() {
    try {
      // ensure DOM exists
      const boardEl = ensureBoardDom();
      if(!boardEl) return console.warn('initGame: missing game-board');

      loadCoins();
      // initialize game state
      score = 0;
      updateScoreDisplay();

      fillBoardRandom();
      renderBoard();

      // expose functions globally for safe-ui to call if needed
      window.restartGame = restartGame;
      window.shuffleBoard = shuffleBoard;
      window.buyFromShop = buyFromShop;
      window.initGame = initGame; // idempotent
      window.updateCoinDisplay = updateCoinDisplay;

      console.log('initGame done');
    } catch (err) {
      console.error('initGame error', err);
      throw err;
    }
  }

  // Auto-init if game screen is active on load
  document.addEventListener('DOMContentLoaded', ()=> {
    // don't auto-start—start when user presses Start (safe-ui triggers initGame)
    // but set up board DOM so CSS sizing is correct
    ensureBoardDom();
    loadCoins();
  });

  // Export for debugging
  window._candyGame = {
    initGame, restartGame, shuffleBoard, buyFromShop, updateCoinDisplay
  };

})();

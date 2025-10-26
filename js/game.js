/* js/game.js */
/* Simple but working match-3 engine:
   - 8x8 board
   - 6 candy types (images: images/candy1.png .. candy6.png)
   - click/tap select then click neighbor to swap OR touch-swipe to swap
   - matches removed, gravity, refill, score updated
   - CandyGame.startLevel(n) exposed
*/

const CandyGame = (function(){
  const cols = 8, rows = 8;
  const types = 6; // candy1..candy6
  let board = new Array(rows*cols).fill(0);
  let selectedIndex = null;
  let score = 0;
  let coins = 0;
  let levelNum = 1;
  let boardEl, scoreEl, coinsEl, levelEl;
  let isProcessing = false;

  function randCandy(){ return Math.floor(Math.random()*types) + 1; }

  function idx(r,c){ return r*cols + c; }
  function rc(i){ return [Math.floor(i/cols), i%cols]; }

  // create initial board without immediate matches
  function createBoard(){
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        let i = idx(r,c);
        do {
          board[i] = randCandy();
        } while (createsMatchAt(i));
      }
    }
  }

  // check if placing current board[i] causes immediate match (used while populating)
  function createsMatchAt(i){
    const [r,c] = rc(i);
    const val = board[i];
    // horizontal left 2
    if(c>=2 && board[idx(r,c-1)]===val && board[idx(r,c-2)]===val) return true;
    // vertical up 2
    if(r>=2 && board[idx(r-1,c)]===val && board[idx(r-2,c)]===val) return true;
    return false;
  }

  // render
  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    for(let i=0;i<rows*cols;i++){
      const div = document.createElement('div');
      div.className = 'tile';
      div.dataset.index = i;
      const n = board[i];
      const img = document.createElement('img');
      img.alt = 'candy';
      img.src = `images/candy${n}.png`;
      div.appendChild(img);
      // selected UI
      if(selectedIndex === i) div.classList.add('selected');
      boardEl.appendChild(div);
    }
    // update stats UI
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    levelEl.textContent = levelNum;
  }

  // neighbours?
  function isNeighbor(a,b){
    const [ra,ca] = rc(a);
    const [rb,cb] = rc(b);
    const dr = Math.abs(ra-rb);
    const dc = Math.abs(ca-cb);
    return (dr+dc)===1;
  }

  // swap in array
  function swap(i,j){
    const t = board[i]; board[i]=board[j]; board[j]=t;
  }

  // find matches (return array of indices to remove)
  function findMatches(){
    const remove = new Set();
    // horizontal
    for(let r=0;r<rows;r++){
      let runVal = null, runStart=0;
      for(let c=0;c<=cols;c++){
        const i = idx(r,c);
        const val = (c<cols)? board[i] : null;
        if(val === runVal){
          // continue
        } else {
          const runLen = c - runStart;
          if(runVal !== null && runLen >= 3){
            for(let k=runStart;k<c;k++) remove.add(idx(r,k));
          }
          runVal = val;
          runStart = c;
        }
      }
    }
    // vertical
    for(let c=0;c<cols;c++){
      let runVal = null, runStart=0;
      for(let r=0;r<=rows;r++){
        const i = (r<rows)? idx(r,c) : null;
        const val = (r<rows)? board[i] : null;
        if(val === runVal){
        } else {
          const runLen = r - runStart;
          if(runVal !== null && runLen >= 3){
            for(let k=runStart;k<r;k++) remove.add(idx(k,c));
          }
          runVal = val;
          runStart = r;
        }
      }
    }
    return Array.from(remove);
  }

  // remove indices -> set to 0, add score
  function removeMatches(indices){
    indices.forEach(i=>{
      board[i] = 0;
      score += 10;
    });
  }

  // gravity + refill
  function collapseAndRefill(){
    for(let c=0;c<cols;c++){
      let write = rows-1;
      for(let r=rows-1;r>=0;r--){
        const i = idx(r,c);
        if(board[i] !== 0){
          if(write !== r){
            board[idx(write,c)] = board[i];
            board[i] = 0;
          }
          write--;
        }
      }
      // fill remaining at top
      for(let r=write; r>=0; r--){
        board[idx(r,c)] = randCandy();
      }
    }
  }

  // attempt swap and resolve matches; if no match revert
  async function trySwap(i,j){
    if(isProcessing) return;
    if(!isNeighbor(i,j)) return;
    isProcessing = true;
    swap(i,j);
    render();
    await sleep(150);
    let matches = findMatches();
    if(matches.length === 0){
      // revert
      swap(i,j);
      render();
      await sleep(120);
      isProcessing = false;
      return;
    }
    // resolve chain
    while(matches.length){
      removeMatches(matches);
      render();
      await sleep(150);
      collapseAndRefill();
      render();
      await sleep(180);
      matches = findMatches();
    }
    // after all resolved
    isProcessing = false;
    unlockNextIfNeeded();
  }

  // small util
  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  // event handlers - click select & swap
  function onTileClick(e){
    if(isProcessing) return;
    const t = e.target.closest('.tile');
    if(!t) return;
    const i = Number(t.dataset.index);
    if(selectedIndex === null){
      selectedIndex = i;
      render();
    } else {
      if(i === selectedIndex){
        selectedIndex = null;
        render();
      } else if(isNeighbor(i, selectedIndex)){
        const a = selectedIndex; selectedIndex = null;
        trySwap(a, i);
      } else {
        // change selection
        selectedIndex = i;
        render();
      }
    }
  }

  // touch swipe support
  let touchStart = null;
  function onTouchStart(e){
    if(isProcessing) return;
    const t = e.target.closest('.tile');
    if(!t) return;
    touchStart = {x: e.touches ? e.touches[0].clientX : e.clientX, y: e.touches ? e.touches[0].clientY : e.clientY, idx: Number(t.dataset.index)};
  }
  function onTouchEnd(e){
    if(!touchStart || isProcessing) { touchStart = null; return; }
    const endX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    const endY = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
    const dx = endX - touchStart.x;
    const dy = endY - touchStart.y;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    let targetIdx = null;
    const [r,c] = rc(touchStart.idx);
    if(Math.max(absX,absY) < 20){
      // treat as tap
      const fake = {target: document.querySelector(`.tile[data-index="${touchStart.idx}"]`)};
      onTileClick(fake);
      touchStart = null;
      return;
    }
    if(absX > absY){
      // horizontal swipe
      if(dx > 0) { if(c < cols-1) targetIdx = idx(r, c+1); }
      else { if(c > 0) targetIdx = idx(r, c-1); }
    } else {
      // vertical swipe
      if(dy > 0) { if(r < rows-1) targetIdx = idx(r+1, c); }
      else { if(r > 0) targetIdx = idx(r-1, c); }
    }
    if(targetIdx !== null){
      trySwap(touchStart.idx, targetIdx);
    }
    touchStart = null;
  }

  // shuffle board (randomize)
  function shuffleBoard(){
    if(isProcessing) return;
    // basic shuffle
    for(let i=0;i<board.length;i++){
      const j = Math.floor(Math.random()*board.length);
      const t = board[i]; board[i] = board[j]; board[j] = t;
    }
    // ensure no immediate matches
    for(let i=0;i<board.length;i++){
      if(createsMatchAt(i)){
        board[i] = randCandy();
      }
    }
    render();
  }

  // level unlock logic (store)
  function unlockNextIfNeeded(){
    // simple rule: when score crosses threshold (e.g., level*500) unlock next
    const unlocked = Storage.get('unlockedLevels', 1);
    const goal = levelNum * 500;
    if(score >= goal && unlocked < levelNum + 1){
      Storage.set('unlockedLevels', levelNum+1);
      coins += 50;
      // notify
      console.log('Level complete! Next unlocked:', levelNum+1);
    }
  }

  // expose startLevel
  function startLevel(n=1){
    // set UI pages
    document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
    document.getElementById('game').classList.remove('hidden');
    levelNum = n;
    score = 0;
    coins = Storage.get('coins', 0) || 0;
    // prepare
    createBoard();
    render();
    bindBoardEvents();
    console.log('CandyGame ready, level', n);
  }

  // bind board events (only once)
  function bindBoardEvents(){
    boardEl = document.getElementById('board');
    scoreEl = document.getElementById('score');
    coinsEl = document.getElementById('coins');
    levelEl = document.getElementById('level-num');

    // ensure listeners only once
    boardEl.removeEventListener('click', onTileClick);
    boardEl.addEventListener('click', onTileClick);

    boardEl.removeEventListener('touchstart', onTouchStart);
    boardEl.removeEventListener('touchend', onTouchEnd);
    boardEl.addEventListener('touchstart', onTouchStart, {passive:true});
    boardEl.addEventListener('touchend', onTouchEnd);

    // restart/shuffle buttons
    document.getElementById('btn-restart').onclick = ()=> startLevel(levelNum);
    document.getElementById('btn-shuffle').onclick = ()=> shuffleBoard();
  }

  // init hooking start button & map navigation
  function initUI(){
    document.getElementById('btn-start').addEventListener('click', ()=>{
      // start default level 1
      startLevel(1);
    });
    document.getElementById('btn-map').addEventListener('click', ()=>{
      document.getElementById('home').classList.add('hidden');
      document.getElementById('map').classList.remove('hidden');
    });
    // also back buttons handled in safe-ui.js
  }

  // public API
  return {
    init(){
      initUI();
      console.log('CandyEngine ready');
    },
    startLevel
  };
})();

// init on DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  // ensure global reference
  window.CandyGame = CandyGame;
  CandyGame.init();
});

// js/game.js
// Candy Match core game logic (6 candies, swipe, match, gravity, levels)
// Author: assistant patch for user's project
// IMPORTANT: images must exist at images/c1.png ... images/c6.png
// and optional backgrounds images/bg-level-1.png ... images/bg-level-3.png

/* ========= configuration ========= */
const CONFIG = {
  rows: 8,
  cols: 8,
  candyCount: 6,
  candyPrefix: 'images/c', // will use c1.png ... c6.png
  candyExt: '.png',
  scorePerCandy: 60, // per candy removed
  levelGoals: level => 500 * level // simple increasing goal
};

/* ========= game state ========= */
let board = []; // 2D array rows x cols storing candy index (1..6) or 0 empty
let busy = false; // during animations
let score = 0;
let coins = 0;
let level = 1;
let selectedCell = null; // {r,c}
let touchStart = null; // {x,y}
let boardEl, scoreEl, coinsEl, levelNumEl, restartBtn, shuffleBtn;

/* ========= helpers ========= */
function log(...args){ console.log(...args); }
function idxToImg(i){ return `${CONFIG.candyPrefix}${i}${CONFIG.candyExt}`; }
function inBounds(r,c){ return r>=0 && r<CONFIG.rows && c>=0 && c<CONFIG.cols; }
function randCandy(){ return Math.floor(Math.random()*CONFIG.candyCount)+1; }

/* ========= storage helpers (simple localStorage if external storage.js not present) ========= */
const Storage = (function(){
  function get(key, def){
    try{ const v = localStorage.getItem(key); return v===null?def:JSON.parse(v); }catch(e){ return def; }
  }
  function set(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ /* ignore */ }
  }
  return {
    getLevel: ()=> get('cm_level',1),
    setLevel: (v)=> set('cm_level',v),
    getCoins: ()=> get('cm_coins',0),
    setCoins: (v)=> set('cm_coins',v),
    getUnlocked: ()=> get('cm_unlocked',[1]),
    unlockLevel: (n)=> {
      const arr = get('cm_unlocked',[1]);
      if(!arr.includes(n)) { arr.push(n); set('cm_unlocked',arr); }
    },
    isUnlocked: (n)=> (get('cm_unlocked',[1]).includes(n))
  };
})();

/* ========= UI helpers ========= */
function $(id){ return document.getElementById(id); }
function createCandyEl(i,r,c){
  const el = document.createElement('div');
  el.className = 'candy';
  el.dataset.r = r; el.dataset.c = c;
  el.style.backgroundImage = `url("${idxToImg(i)}")`;
  el.style.backgroundSize = 'cover';
  return el;
}

/* ========= board functions ========= */
function buildFresh(){
  board = Array.from({length:CONFIG.rows},()=>Array(CONFIG.cols).fill(0));
  // fill randomly but avoid initial matches by simple retry
  for(let r=0;r<CONFIG.rows;r++){
    for(let c=0;c<CONFIG.cols;c++){
      let tries=0;
      do{
        board[r][c] = randCandy();
        tries++;
        // break if no early matches at this cell
      } while(tries<10 && createsMatchAt(r,c));
    }
  }
}

function createsMatchAt(r,c){
  const val = board[r][c];
  // check horizontal: two left same?
  if(c>=2 && board[r][c-1] === val && board[r][c-2] === val) return true;
  // vertical
  if(r>=2 && board[r-1][c] === val && board[r-2][c] === val) return true;
  return false;
}

function render(){
  if(!boardEl) return;
  boardEl.innerHTML = '';
  boardEl.style.setProperty('--rows', CONFIG.rows);
  boardEl.style.setProperty('--cols', CONFIG.cols);

  for(let r=0;r<CONFIG.rows;r++){
    for(let c=0;c<CONFIG.cols;c++){
      const i = board[r][c];
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r=r; cell.dataset.c=c;
      if(i>0){
        const candy = createCandyEl(i,r,c);
        cell.appendChild(candy);
      }
      boardEl.appendChild(cell);
    }
  }
  scoreEl && (scoreEl.textContent = score);
  coinsEl && (coinsEl.textContent = coins);
  levelNumEl && (levelNumEl.textContent = level);
}

/* ========= match detection ========= */
// returns array of {r,c}
function findMatches(){
  const remove = [];
  // horizontal
  for(let r=0;r<CONFIG.rows;r++){
    let runVal = 0, runStart = 0, runLen=0;
    for(let c=0;c<=CONFIG.cols;c++){
      const val = (c<CONFIG.cols)?board[r][c]:0;
      if(val && val === runVal){ runLen++; }
      else{
        if(runVal && runLen>=3){
          for(let k=runStart;k<runStart+runLen;k++) remove.push({r,c:k});
        }
        runVal=val; runStart=c; runLen= (val?1:0);
      }
    }
  }
  // vertical
  for(let c=0;c<CONFIG.cols;c++){
    let runVal=0, runStart=0, runLen=0;
    for(let r=0;r<=CONFIG.rows;r++){
      const val = (r<CONFIG.rows)?board[r][c]:0;
      if(val && val===runVal){ runLen++; }
      else{
        if(runVal && runLen>=3){
          for(let k=runStart;k<runStart+runLen;k++) remove.push({r:k,c});
        }
        runVal=val; runStart=r; runLen=(val?1:0);
      }
    }
  }
  // unique filter
  const key = x => `${x.r},${x.c}`;
  const uniq = {};
  return remove.filter(x=>{ if(uniq[key(x)]) return false; uniq[key(x)]=true; return true; });
}

/* ========= apply removal, gravity and refill ========= */
function removeMatches(matches){
  // set matched cells to 0 (empty)
  for(const m of matches) board[m.r][m.c]=0;
  // increment score & coins
  score += matches.length * CONFIG.scorePerCandy;
  coins += Math.floor(matches.length/3); // some coin rule
  Storage.setCoins && Storage.setCoins(coins); // if external storage overrides it will be ignored
}

function collapseAndRefill(){
  // for each column, let candies fall down
  for(let c=0;c<CONFIG.cols;c++){
    let write = CONFIG.rows-1;
    for(let r=CONFIG.rows-1;r>=0;r--){
      if(board[r][c] > 0){
        board[write][c] = board[r][c];
        write--;
      }
    }
    // fill top with new candies
    for(let r=write;r>=0;r--){
      board[r][c] = randCandy();
    }
  }
}

/* ========= processing loop ========= */
function processChains(){
  busy = true;
  const matches = findMatches();
  if(matches.length === 0){
    busy = false;
    render();
    checkLevelComplete();
    return;
  }
  // show removal animation by clearing DOM candies (simple fade using class)
  // For simplicity we just update board then animate via CSS by re-render
  removeMatches(matches);
  render();
  // after a short delay collapse and refill
  setTimeout(()=>{
    collapseAndRefill();
    render();
    // chain again after refill
    setTimeout(()=> processChains(), 220);
  }, 200);
}

/* ========= swapping / touch handling ========= */
function swapCells(r1,c1,r2,c2){
  const tmp = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = tmp;
}

function trySwap(r1,c1,r2,c2){
  if(!inBounds(r1,c1) || !inBounds(r2,c2)) return false;
  if(Math.abs(r1-r2)+Math.abs(c1-c2) !== 1) return false; // only adjacent
  swapCells(r1,c1,r2,c2);
  const matches = findMatches();
  if(matches.length>0){
    render();
    setTimeout(()=> processChains(), 80);
    return true;
  } else {
    // revert
    swapCells(r1,c1,r2,c2);
    render();
    return false;
  }
}

function onCellPointerDown(e){
  if(busy) return;
  const el = e.target.closest('.cell');
  if(!el) return;
  const r = parseInt(el.dataset.r,10), c = parseInt(el.dataset.c,10);
  selectedCell = {r,c};
  touchStart = {x: e.clientX || (e.touches && e.touches[0].clientX), y: e.clientY || (e.touches && e.touches[0].clientY)};
}

function onCellPointerUp(e){
  if(busy || !selectedCell || !touchStart) { selectedCell = null; touchStart=null; return; }
  const el = e.target.closest('.cell');
  let endX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
  let endY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
  if(endX === undefined) endX = touchStart.x;
  if(endY === undefined) endY = touchStart.y;
  const dx = endX - touchStart.x;
  const dy = endY - touchStart.y;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const minSwipe = 18; // pixels
  if(absX < minSwipe && absY < minSwipe){ selectedCell=null; touchStart=null; return; }

  let dir;
  if(absX > absY){
    dir = dx>0? 'right':'left';
  } else {
    dir = dy>0? 'down':'up';
  }
  const {r,c} = selectedCell;
  let r2=r,c2=c;
  if(dir==='right') c2=c+1;
  if(dir==='left') c2=c-1;
  if(dir==='down') r2=r+1;
  if(dir==='up') r2=r-1;

  try{
    const ok = trySwap(r,c,r2,c2);
    if(!ok){
      // optional: small shake animation (not implemented)
    }
  }catch(err){
    console.error('swap error',err);
  } finally {
    selectedCell=null; touchStart=null;
  }
}

/* ========= events bind ========= */
function bindEvents(){
  if(!boardEl) return;
  // pointer events: use touchstart/touchend for mobile, mousedown/mouseup for desktop
  boardEl.addEventListener('touchstart', onCellPointerDown, {passive:true});
  boardEl.addEventListener('touchend', onCellPointerUp, {passive:true});
  boardEl.addEventListener('mousedown', onCellPointerDown);
  boardEl.addEventListener('mouseup', onCellPointerUp);

  restartBtn && restartBtn.addEventListener('click', ()=>{
    if(busy) return;
    score=0;
    buildFresh();
    render();
  });

  shuffleBtn && shuffleBtn.addEventListener('click', ()=>{
    if(busy) return;
    // simple shuffle: re-randomize every cell
    for(let r=0;r<CONFIG.rows;r++) for(let c=0;c<CONFIG.cols;c++) board[r][c]=randCandy();
    render();
    // if no matches and no moves maybe shuffle again (not checking moves here)
  });
}

/* ========= level check ========= */
function checkLevelComplete(){
  const goal = CONFIG.levelGoals(level);
  if(score >= goal){
    // unlock next level
    Storage.unlockLevel && Storage.unlockLevel(level+1);
    // show congrats - simple confirm
    setTimeout(()=> {
      if(confirm('Level complete! Next level खोलें?')){
        level++;
        Storage.setLevel && Storage.setLevel(level);
        // choose different background maybe
        initGame();
      }
    }, 200);
  }
}

/* ========= init (DOM bind) ========= */
function initDOMRefs(){
  boardEl = $('board');
  scoreEl = $('score');
  coinsEl = $('coins');
  levelNumEl = $('levelNum');
  restartBtn = $('restartBtn');
  shuffleBtn = $('shuffleBtn');
  // if some elements missing, log
  if(!boardEl) console.warn('Missing #board element!');
  if(!scoreEl) console.warn('Missing #score element!');
}

/* ========= full public initGame block with robustness and observer ========= */
(function(){
  // helper to safe-log (visible in eruda or browser console)
  function logp(...args){ try{ console.log(...args); }catch(e){} }

  window.initGame = function(){
    try{
      logp('initGame called');
      // ensure DOM refs
      initDOMRefs();
      // initialize state from storage
      level = (Storage.getLevel && Storage.getLevel()) || 1;
      coins = (Storage.getCoins && Storage.getCoins()) || 0;
      score = 0;
      // set background if available
      const gameScreen = $('game');
      if(gameScreen){
        const bg = `images/bg-level-${ (level<=3?level:1) }.png`;
        gameScreen.dataset.bg = bg;
        try { gameScreen.style.backgroundImage = `url("${bg}")`; }catch(e){ logp('bg style failed',e); }
      }
      // build board and render
      buildFresh();
      render();
      bindEvents();
      // auto-resolve initial accidental matches (rare)
      setTimeout(()=>{
        try{
          const matches = findMatches();
          if(matches.length>0){
            logp('resolving initial matches');
            processChains();
          } else { busy=false; }
        }catch(er){ console.error('initial resolve error',er); busy=false;}
      },150);
    }catch(err){
      console.error('initGame error:', err);
      try{ alert('Game init failed: '+(err.message||err)); }catch(e){}
    }
  };

  // observe body for class changes (if you use .active toggles)
  const observeTarget = document.body;
  if(observeTarget && window.MutationObserver){
    const mo = new MutationObserver((muts)=>{
      for(const m of muts){
        if(m.type === 'attributes' || m.type === 'childList'){
          const gameScreen = $('game');
          if(gameScreen && gameScreen.classList.contains('active')){
            setTimeout(()=>{ try{ if(window.initGame) window.initGame(); }catch(e){ console.error(e);} },160);
          }
        }
      }
    });
    mo.observe(observeTarget, {attributes:true, childList:true, subtree:true});
  }

  logp('game.js loaded — call initGame() to start');
})();

/* ========= simple auto-start when script loaded (only if DOM ready) ========= */
document.addEventListener('DOMContentLoaded', ()=>{
  // if #game exists and has data-autostart=1, call initGame automatically
  const gs = $('game');
  if(gs && gs.dataset && gs.dataset.autostart === '1'){
    setTimeout(()=>{ try{ window.initGame(); }catch(e){ console.error(e);} }, 200);
  }
});

/* ========= CSS hint - you should include these styles in your CSS =========
#board { display: grid; grid-template-columns: repeat(var(--cols), 52px); gap:12px; }
.cell { width:52px; height:52px; background: #fff; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); display:flex; align-items:center; justify-content:center; }
.candy { width:44px; height:44px; background-size:cover; }
Adjust sizes for mobile. ========= */

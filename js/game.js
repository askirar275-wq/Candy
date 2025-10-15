/* js/game.js
   Complete game core:
   - preload images
   - board model (state.board, state.boardSize)
   - render grid
   - pointer (tap/drag) swap + swapWithAnimation
   - match detection, handleMatches, applyGravity (chain)
   - coins, save/load
   - Hindi comments for help
*/

/* ========== CONFIG ========== */
const CONFIG = {
  TILE_IMAGES: [
    'candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png'
  ], // **6 candies** as requested
  IMAGE_BASE: 'images/',
  BOARD_SIZE_DEFAULT: 8,
  START_MOVES: 40,
  COIN_PER_TILE: 5, // coins per removed tile
  ERUDA: true // set false to disable mobile console autoload
};

/* ========== STATE ========== */
const state = {
  boardSize: CONFIG.BOARD_SIZE_DEFAULT,
  board: [],          // length = boardSize*boardSize, each {id,src}
  nextId: 1,
  score: 0,
  moves: CONFIG.START_MOVES,
  combo: 1,
  coins: Number(localStorage.getItem('candy_coins') || 250),
  inv: JSON.parse(localStorage.getItem('candy_inv') || '{"bomb":0,"shuffle":0}')
};

let pool = []; // preloaded image URLs

/* ========== UTIL: preload images ========== */
async function preloadImages(){
  const promises = CONFIG.TILE_IMAGES.map(name => {
    const url = CONFIG.IMAGE_BASE + name;
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(url);
      img.onerror = () => {
        console.warn('image failed', url);
        res('');
      };
      img.src = url;
    });
  });
  pool = (await Promise.all(promises)).filter(Boolean);
  if(pool.length === 0){
    // fallback: use emoji-data URIs if no images
    pool = CONFIG.TILE_IMAGES.slice(0,4).map(()=> 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="120">🍭</text></svg>');
  }
  // ensure bomb image key if present
  // pool.bomb = CONFIG.IMAGE_BASE + 'bomb.png'; // optional
  console.log('images preloaded:', pool.length);
}

/* ========== BOARD helpers ========== */
function makeTile(src){
  return { id: state.nextId++, src: src || pool[Math.floor(Math.random()*pool.length)] };
}

function initBoard(size){
  state.boardSize = size || state.boardSize;
  const N = state.boardSize * state.boardSize;
  state.board = new Array(N).fill(null).map(()=> makeTile());
  // prevent immediate matches by reshuffling a few times if needed
  let tries = 0;
  while(findMatches().length > 0 && tries++ < 800){
    state.board = new Array(N).fill(null).map(()=> makeTile());
  }
}

/* ========== RENDER ========== */
function render(dropMap){
  const boardEl = document.getElementById('game-board');
  if(!boardEl) return;
  // set CSS grid columns/rows according to boardSize
  boardEl.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${state.boardSize}, 1fr)`;
  boardEl.innerHTML = '';
  for(let i=0;i<state.board.length;i++){
    const tile = state.board[i];
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    const img = document.createElement('img');
    img.className = 'tile';
    img.draggable = false;
    img.alt = 'candy';
    if(tile) img.src = tile.src;
    cell.appendChild(img);
    boardEl.appendChild(cell);
  }
  updateHUD();
}

/* ========== HUD ========== */
function updateHUD(){
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  if(scoreEl) scoreEl.textContent = state.score;
  if(coinsEl) coinsEl.textContent = state.coins;
  const shopCoins = document.getElementById('shopCoins');
  if(shopCoins) shopCoins.textContent = state.coins;
}

/* ========== MATCH detection (by src) ========== */
function findMatches(){
  const N = state.boardSize, matchesSet = new Set();
  const bd = state.board;
  // horizontal
  for(let r=0;r<N;r++){
    for(let c=0;c<N-2;c++){
      const i = r*N + c;
      if(bd[i] && bd[i+1] && bd[i+2] &&
         bd[i].src === bd[i+1].src && bd[i].src === bd[i+2].src){
        let k = c;
        while(k < N && bd[r*N + k] && bd[r*N + k].src === bd[i].src){ matchesSet.add(r*N + k); k++; }
      }
    }
  }
  // vertical
  for(let c=0;c<N;c++){
    for(let r=0;r<N-2;r++){
      const i = r*N + c;
      if(bd[i] && bd[i+N] && bd[i+2*N] &&
         bd[i].src === bd[i+N].src && bd[i].src === bd[i+2*N].src){
        let k = r;
        while(k < N && bd[k*N + c] && bd[k*N + c].src === bd[i].src){ matchesSet.add(k*N + c); k++; }
      }
    }
  }
  return Array.from(matchesSet).sort((a,b)=>a-b);
}

/* ========== Swap animation (cloned tiles) ========== */
function tileEl(index){
  return document.querySelector(`.cell[data-index="${index}"] .tile`);
}

function swapWithAnimation(aIndex, bIndex){
  return new Promise(resolve => {
    const aTile = tileEl(aIndex), bTile = tileEl(bIndex);
    if(!aTile || !bTile){
      [state.board[aIndex], state.board[bIndex]] = [state.board[bIndex], state.board[aIndex]];
      render();
      return resolve(true);
    }

    const aRect = aTile.getBoundingClientRect(), bRect = bTile.getBoundingClientRect();
    const dx = bRect.left - aRect.left, dy = bRect.top - aRect.top;

    const aClone = aTile.cloneNode(true), bClone = bTile.cloneNode(true);
    [aClone, bClone].forEach((cl, idx) => {
      cl.classList.add('swap-moving');
      cl.style.position = 'absolute';
      cl.style.left = (idx===0 ? aRect.left : bRect.left) + 'px';
      cl.style.top = (idx===0 ? aRect.top  : bRect.top)  + 'px';
      cl.style.width = aRect.width + 'px';
      cl.style.height = aRect.height + 'px';
      cl.style.margin = 0;
      cl.style.zIndex = 9999;
      document.body.appendChild(cl);
    });

    aTile.style.visibility = 'hidden'; bTile.style.visibility = 'hidden';

    requestAnimationFrame(()=> {
      aClone.style.transform = `translate(${dx}px, ${dy}px)`;
      bClone.style.transform = `translate(${-dx}px, ${-dy}px)`;
    });

    const cleanup = ()=>{
      try{ aClone.remove(); bClone.remove(); }catch(e){}
      aTile.style.visibility = ''; bTile.style.visibility = '';
      [state.board[aIndex], state.board[bIndex]] = [state.board[bIndex], state.board[aIndex]];
      render();
      resolve(true);
    };

    setTimeout(cleanup, 340);
  });
}

/* ========== Handle matches: animate pop, particles, coins ========== */
function createSparkles(cellEl){
  if(!cellEl) return;
  const sp = document.createElement('div'); sp.className = 'sparkle';
  cellEl.appendChild(sp);
  setTimeout(()=> sp.remove(), 700);
}
function createPopParticles(cx, cy, amt=6){
  for(let i=0;i<amt;i++){
    const p = document.createElement('div'); p.className='pop-dot';
    document.body.appendChild(p);
    p.style.left = (cx - 5) + 'px';
    p.style.top  = (cy - 5) + 'px';
    const a = Math.random()*Math.PI*2, d = 12 + Math.random()*36;
    const nx = Math.cos(a)*d, ny = Math.sin(a)*d;
    p.animate([{transform:'translate(0,0) scale(1)', opacity:1},{transform:`translate(${nx}px, ${ny}px) scale(.3)`, opacity:0}],{duration:420+Math.random()*240, easing:'cubic-bezier(.2,.8,.2,1)'});
    setTimeout(()=> p.remove(), 900);
  }
}
function showCoinPopup(amount, x=window.innerWidth/2, y=window.innerHeight/2){
  const el = document.createElement('div'); el.className = 'coin-popup'; el.textContent = `+${amount} 💰`;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el); setTimeout(()=> el.remove(), 1300);
}

function handleMatches(matches){
  if(!matches || matches.length===0) return;
  const removedCount = matches.length;
  // scoring
  state.score += removedCount * 10 * (state.combo || 1);
  state.combo = (state.combo || 1) + 1;
  // compute center for particles
  let cx=0, cy=0, cnt=0;
  matches.forEach(i=>{
    const cell = document.querySelector(`.cell[data-index="${i}"]`);
    const img = cell ? cell.querySelector('.tile') : null;
    if(cell && img){
      const rc = cell.getBoundingClientRect();
      cx += rc.left + rc.width/2; cy += rc.top + rc.height/2; cnt++;
      img.classList.add('pop');
      createSparkles(cell);
    }
    state.board[i] = null;
  });
  if(cnt>0) createPopParticles(Math.round(cx/cnt), Math.round(cy/cnt), Math.min(18, 4+cnt));
  // reward coins
  const coinsEarned = removedCount * CONFIG.COIN_PER_TILE;
  state.coins += coinsEarned;
  saveState();
  showCoinPopup(coinsEarned, Math.round(cx/cnt), Math.round(cy/cnt));
  // after short delay, gravity
  setTimeout(()=> applyGravity(), 360);
  updateHUD();
}

/* ========== Gravity + refill (chain) ========== */
function applyGravity(){
  const N = state.boardSize;
  const oldBoard = state.board.slice();
  // for each column, compress and refill
  for(let c=0;c<N;c++){
    const col = [];
    for(let r=N-1;r>=0;r--){
      const idx = r*N + c;
      if(state.board[idx]) col.push(state.board[idx]);
    }
    while(col.length < N) col.push(makeTile());
    for(let r=N-1,i=0;r>=0;r--,i++){
      state.board[r*N + c] = col[i];
    }
  }
  render();
  // animate fall per tile (staggered)
  const cells = document.querySelectorAll('#game-board .cell');
  cells.forEach((cell, idx)=>{
    const tile = cell.querySelector('.tile');
    if(!tile) return;
    const row = Math.floor(idx / state.boardSize);
    const delay = (state.boardSize - row) * 30;
    tile.style.animation = `tileFall 360ms cubic-bezier(.2,.9,.2,1) ${delay}ms both`;
    setTimeout(()=> tile.style.animation = '', 600 + delay);
  });

  // chain detection
  setTimeout(()=>{
    const next = findMatches();
    if(next.length>0) {
      setTimeout(()=> handleMatches(next), 180);
    } else {
      state.combo = 1;
    }
    state.isLocked = false;
    updateHUD();
  }, 420);
}

/* ========== Input: selection / swipe support ========== */
let dragging=false, pointerId=null, startIndex=null;

function onPointerDown(e){
  if(state.isLocked) return;
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
  if(isAdjacent(startIndex, idx) && idx !== startIndex){
    // attempt swap
    state.isLocked = true;
    swapWithAnimation(startIndex, idx).then(()=>{
      const matches = findMatches();
      if(matches.length>0){ handleMatches(matches); }
      else {
        // swap-back
        swapWithAnimation(startIndex, idx).then(()=> { state.isLocked = false; updateHUD(); });
      }
    });
    state.moves = Math.max(0, state.moves - 1);
    updateHUD();
    // allow further drags to continue from new index
    startIndex = idx;
  }
}
function onPointerUp(e){
  dragging=false; pointerId=null; startIndex=null;
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
}

function isAdjacent(a,b){
  if(a==null||b==null) return false;
  const r1 = Math.floor(a/state.boardSize), c1 = a%state.boardSize;
  const r2 = Math.floor(b/state.boardSize), c2 = b%state.boardSize;
  return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
}

/* helper to attach pointer handlers to cells */
function attachCellHandlers(){
  const cells = document.querySelectorAll('#game-board .cell');
  cells.forEach(c => {
    c.removeEventListener('pointerdown', onPointerDown);
    c.addEventListener('pointerdown', onPointerDown);
    // also click selection fallback
    c.onclick = (ev)=>{
      if(state.isLocked) return;
      const idx = Number(c.dataset.index);
      // selection logic: if none selected, mark; if same, unmark; else if adjacent swap
      if(state._selected == null){
        state._selected = idx;
        c.classList.add('selected-cell');
      } else {
        const prev = state._selected;
        const prevEl = document.querySelector(`.cell[data-index="${prev}"]`);
        if(prevEl) prevEl.classList.remove('selected-cell');
        if(isAdjacent(prev, idx) && prev !== idx){
          state.isLocked = true;
          swapWithAnimation(prev, idx).then(()=>{
            const matches = findMatches();
            if(matches.length>0) handleMatches(matches);
            else swapWithAnimation(prev, idx).then(()=> state.isLocked=false);
          });
          state.moves = Math.max(0, state.moves - 1);
          updateHUD();
        }
        state._selected = null;
      }
    };
  });
}

/* ========== Shuffle ========== */
function shuffleBoard(){
  const srcs = state.board.map(t => t ? t.src : pool[Math.floor(Math.random()*pool.length)]);
  for(let i=srcs.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [srcs[i], srcs[j]] = [srcs[j], srcs[i]];
  }
  state.board = srcs.map(s=> ({ id: state.nextId++, src: s }));
  render();
  attachCellHandlers();
}

/* ========== Save / Load state ========== */
function saveState(){
  try{
    localStorage.setItem('candy_coins', String(state.coins));
    localStorage.setItem('candy_inv', JSON.stringify(state.inv));
  }catch(e){}
}

/* ========== Game init / API ========== */
window.initGame = async function(opts){
  // opts: { boardSize }
  if(opts && opts.boardSize) state.boardSize = opts.boardSize;
  state.score = 0; state.moves = CONFIG.START_MOVES; state.combo = 1; state.isLocked = false; state._selected = null;
  if(pool.length === 0) await preloadImages();
  initBoard(state.boardSize);
  render();
  attachCellHandlers();
  updateHUD();
};

window.restartGame = function(){ initBoard(state.boardSize); render(); attachCellHandlers(); state.score=0; state.combo=1; updateHUD(); };
window.shuffleBoard = shuffleBoard;
window.addCoins = function(n){ state.coins += Number(n||0); saveState(); updateHUD(); };

/* shop buy hook (used by shop UI) */
window.buyFromShop = function(item){
  const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
  const p = prices[item] || 0;
  if(state.coins >= p){ state.coins -= p; state.inv[item] = (state.inv[item]||0) + 1; saveState(); updateHUD(); alert('खरीदारी सफल: ' + item); 
    if(item === 'shuffle') shuffleBoard();
  } else alert('कॉइन्स कम हैं');
};

/* ========== Start on load (preload images for snappier experience) ========== */
window.addEventListener('load', async ()=>{
  if(CONFIG.ERUDA){
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/eruda';
    s.onload = ()=> { try{ eruda.init(); console.log('Eruda loaded'); }catch(e){} };
    document.body.appendChild(s);
  }
  await preloadImages();
  // don't auto init — init on Start button click (index.html glue calls initGame)
  console.log('game.js loaded, images:', pool.length);
});

/* Expose some helpers for debugging */
window._gameState = state;
window._render = render;
window._findMatches = findMatches;

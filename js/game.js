/* js/game.js
   Candy Match — updated with coin system + coin popup & localStorage sync
   Ready to paste (replace your existing js/game.js)
*/

const WIDTH = 8;
const HEIGHT = 8;
const SIZE = WIDTH * HEIGHT;
const IMAGE_BASE = 'images/';
const CANDIES = [
  'candy1.png','candy2.png','candy3.png','candy4.png',
  'candy5.png','candy6.png','candy7.png','candy8.png'
];

let pool = [];      // preloaded image URLs
let board = [];     // array of {src: 'images/...'} or null
let score = 0, moves = 40, combo = 1;
let selected = null;
let isSwapping = false;

/* ---------- Coins state (persisted) ---------- */
let coins = Number(localStorage.getItem('candy_coins') || 50); // default 50 coins

function persistCoins(){
  localStorage.setItem('candy_coins', String(coins));
  // if shop module exists, ask it to refresh
  if(typeof refreshShopUI === 'function') {
    try { refreshShopUI(); } catch(e){ /* ignore */ }
  }
}

/* ---------- PRELOAD IMAGES (optional) ---------- */
async function preload() {
  pool = await Promise.all(CANDIES.map(n => {
    const url = IMAGE_BASE + n;
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(url);
      img.onerror = () => {
        console.warn('image load failed', url);
        res(''); // empty fallback
      };
      img.src = url;
    });
  }));
  pool = pool.filter(Boolean);
  if(pool.length === 0){
    // fallback small set
    pool = CANDIES.slice(0,6).map(n => IMAGE_BASE + n);
  }
}

/* ---------- RENDER BOARD ---------- */
function render(){
  const grid = document.getElementById('game-board') || document.getElementById('grid');
  if(!grid) return console.warn('No grid element found (#game-board or #grid).');

  grid.innerHTML = '';
  // ensure grid uses CSS grid with WIDTH columns (if not set in CSS)
  grid.style.gridTemplateColumns = `repeat(${WIDTH}, 1fr)`;

  board.forEach((tile, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    // create image tile
    const img = document.createElement('img');
    img.className = 'tile';
    img.draggable = false;
    img.alt = '';
    img.src = tile ? tile.src : pool[Math.floor(Math.random()*pool.length)];
    img.setAttribute('data-index', i);

    // attach click handler (and touch handlers will be added separately)
    cell.onclick = () => handleSelect(i);

    // add swipe (touch) support: translate simple drag into neighbor select
    addTouchHandlers(cell, i);

    cell.appendChild(img);
    grid.appendChild(cell);
  });
}

/* ---------- INIT GAME ---------- */
function initGame(){
  score = 0; moves = 40; combo = 1; selected = null; isSwapping = false;
  // make sure pool is ready
  if(!pool || pool.length === 0){
    pool = CANDIES.map(n => IMAGE_BASE + n);
  }
  board = new Array(SIZE).fill(null).map(()=>({ src: pool[Math.floor(Math.random()*pool.length)] }));
  render();
  updateHUD();
}

/* ---------- SELECTION & SWAP FLOW ---------- */
function handleSelect(i){
  if(isSwapping) return;
  if(selected === null){
    selected = i;
    highlight(i);
    return;
  }
  if(selected === i){
    unhighlight(i);
    selected = null;
    return;
  }
  if(isAdjacent(selected, i)){
    // Try swap with animation and post-swap logic
    isSwapping = true;
    unhighlight(selected);
    const a = selected, b = i;
    selected = null;

    swapWithAnimation(a,b).then(()=> {
      const matches = findMatches();
      if(matches.length > 0){
        handleMatches(matches);
      } else {
        // no match -> swap back with animation
        swapWithAnimation(a,b).then(()=> {
          isSwapping = false;
          updateHUD();
        });
      }
      // decrease moves when a player attempts a swap
      moves = Math.max(0, moves - 1);
      updateHUD();
    });
  } else {
    unhighlight(selected);
    selected = i;
    highlight(i);
  }
}

function highlight(i){
  const cell = document.querySelector(`.cell[data-index="${i}"]`);
  if(cell) cell.classList.add('selected-cell');
  const tile = tileEl(i);
  if(tile) tile.classList.add('selected');
}
function unhighlight(i){
  const cell = document.querySelector(`.cell[data-index="${i}"]`);
  if(cell) cell.classList.remove('selected-cell');
  const tile = tileEl(i);
  if(tile) tile.classList.remove('selected');
}
function isAdjacent(a,b){
  const r1 = Math.floor(a / WIDTH), c1 = a % WIDTH;
  const r2 = Math.floor(b / WIDTH), c2 = b % WIDTH;
  return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
}

/* ---------- Helper: get tile img element ---------- */
function tileEl(index){
  return document.querySelector(`.cell[data-index="${index}"] .tile`) || document.querySelector(`.tile[data-index="${index}"]`);
}

/* ---------- Animated swap (cloned tiles) ---------- */
function swapWithAnimation(aIndex, bIndex){
  return new Promise(resolve => {
    const aTile = tileEl(aIndex);
    const bTile = tileEl(bIndex);

    // If DOM not ready (fallback), swap in model and render
    if(!aTile || !bTile){
      [board[aIndex], board[bIndex]] = [board[bIndex], board[aIndex]];
      render();
      return resolve(true);
    }

    // get DOM rects
    const aRect = aTile.getBoundingClientRect();
    const bRect = bTile.getBoundingClientRect();
    const dx = bRect.left - aRect.left;
    const dy = bRect.top - aRect.top;

    // clone nodes
    const aClone = aTile.cloneNode(true);
    const bClone = bTile.cloneNode(true);

    // style clones
    [aClone, bClone].forEach((cl, idx) => {
      cl.style.position = 'absolute';
      cl.style.left = (idx===0 ? aRect.left : bRect.left) + 'px';
      cl.style.top = (idx===0 ? aRect.top : bRect.top) + 'px';
      cl.style.width = aRect.width + 'px';
      cl.style.height = aRect.height + 'px';
      cl.style.margin = 0;
      cl.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1)';
      cl.style.zIndex = 9999;
      cl.classList.add('swap-moving');
      document.body.appendChild(cl);
    });

    // hide originals
    aTile.style.visibility = 'hidden';
    bTile.style.visibility = 'hidden';

    // trigger transform
    requestAnimationFrame(()=>{
      aClone.style.transform = `translate(${dx}px, ${dy}px)`;
      bClone.style.transform = `translate(${-dx}px, ${-dy}px)`;
    });

    // after animation
    const cleanup = ()=>{
      aClone.remove();
      bClone.remove();
      aTile.style.visibility = '';
      bTile.style.visibility = '';

      // swap model
      [board[aIndex], board[bIndex]] = [board[bIndex], board[aIndex]];

      // re-render to update indices and event handlers
      render();
      resolve(true);
    };

    // safety timeout
    setTimeout(cleanup, 300);
  });
}

/* ---------- Match detection ---------- */
function findMatches(){
  const matches = new Set();

  // horizontal
  for(let r=0; r<HEIGHT; r++){
    for(let c=0; c<WIDTH-2; c++){
      const i = r*WIDTH + c;
      if(board[i] && board[i+1] && board[i+2] &&
         board[i].src === board[i+1].src && board[i].src === board[i+2].src){
        matches.add(i); matches.add(i+1); matches.add(i+2);
        // extend right if longer than 3
        let k = c+3;
        while(k<WIDTH && board[r*WIDTH + k] && board[r*WIDTH + k].src === board[i].src){
          matches.add(r*WIDTH + k); k++;
        }
      }
    }
  }

  // vertical
  for(let c=0; c<WIDTH; c++){
    for(let r=0; r<HEIGHT-2; r++){
      const i = r*WIDTH + c;
      if(board[i] && board[i+WIDTH] && board[i+2*WIDTH] &&
         board[i].src === board[i+WIDTH].src && board[i].src === board[i+2*WIDTH].src){
        matches.add(i); matches.add(i+WIDTH); matches.add(i+2*WIDTH);
        // extend down if longer
        let k = r+3;
        while(k<HEIGHT && board[k*WIDTH + c] && board[k*WIDTH + c].src === board[i].src){
          matches.add(k*WIDTH + c); k++;
        }
      }
    }
  }

  return Array.from(matches).sort((a,b)=>a-b);
}

/* ---------- Handle matches (pop + gravity) ---------- */
function handleMatches(matches){
  if(matches.length === 0) return;
  // scoring
  score += matches.length * 10 * combo;

  // coins earned for this match (adjust multiplier as you like)
  const coinsEarned = matches.length * 5 * combo;
  addCoins(coinsEarned);

  combo++;

  // add pop animation class on matched tiles
  matches.forEach(i => {
    const el = document.querySelector(`.cell[data-index="${i}"] .tile`);
    if(el){
      el.classList.add('pop');
      // optional: small fade
      el.style.transition = 'transform 300ms, opacity 300ms';
      el.style.transform = 'scale(0.2)';
      el.style.opacity = '0';
    }
    board[i] = null;
  });

  // show coin popup near top-right (or center). You can change content.
  showCoinPopup('+' + coinsEarned);

  // after pop animation, apply gravity
  setTimeout(()=> applyGravity(), 350);
  updateHUD();
}

/* ---------- APPLY GRAVITY & CHAIN ---------- */
function applyGravity(){
  for(let c=0; c<WIDTH; c++){
    const col = [];
    for(let r=HEIGHT-1; r>=0; r--){
      const i = r*WIDTH + c;
      if(board[i]) col.push(board[i]);
    }
    while(col.length < HEIGHT){
      col.push({ src: pool[Math.floor(Math.random() * pool.length)] });
    }
    for(let r=HEIGHT-1; r>=0; r--){
      board[r*WIDTH + c] = col[HEIGHT-1 - r];
    }
  }

  render();

  // chain matches
  const newMatches = findMatches();
  if(newMatches.length > 0){
    setTimeout(()=> handleMatches(newMatches), 200);
  } else {
    // reset combo after chains finish
    combo = 1;
    isSwapping = false;
    updateHUD();
  }
}

/* ---------- HUD ---------- */
function updateHUD(){
  const scoreEl = document.getElementById('score');
  if(scoreEl) scoreEl.textContent = score;
  const movesEl = document.getElementById('moves');
  if(movesEl) movesEl.textContent = moves || 0;
  const comboEl = document.getElementById('combo');
  if(comboEl) comboEl.textContent = combo + 'x';
  const coinsBubble = document.getElementById('coins');
  if(coinsBubble) coinsBubble.textContent = coins;
  // if no coins element, try shop's display via refreshShopUI
  if(!coinsBubble && typeof refreshShopUI === 'function') refreshShopUI();

  if(moves <= 0){
    setTimeout(()=> alert('🏁 Game Over! Score: ' + score), 200);
  }
}

/* ---------- Small utilities ---------- */
function shuffleBoard(){
  // Fisher-Yates shuffle of board sources
  const srcs = board.map(b => b ? b.src : pool[Math.floor(Math.random()*pool.length)]);
  for(let i=srcs.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [srcs[i], srcs[j]] = [srcs[j], srcs[i]];
  }
  board = srcs.map(s => ({src:s}));
  render();
  updateHUD();
}

/* ---------- Hint helper (optional) ---------- */
function showHint(){
  const m = findMatches();
  if(m.length>0){
    const el = document.querySelector(`.cell[data-index="${m[0]}"] .tile`);
    if(el){
      el.style.transform = 'scale(1.2)';
      setTimeout(()=>{ if(el) el.style.transform=''; }, 900);
    }
  }
}

/* ---------- Coins: Add + Popup ---------- */
function addCoins(n){
  coins = (coins || 0) + Number(n || 0);
  persistCoins();
  updateHUD();
}
function showCoinPopup(text){
  // create coin popup element and remove after animation
  try {
    const el = document.createElement('div');
    el.className = 'coin-popup';
    el.textContent = text || '+1';
    document.body.appendChild(el);
    // remove after animation ends (1.2s to match CSS)
    setTimeout(()=> {
      el.remove();
    }, 1300);
  } catch(e){ console.warn('coin popup failed', e); }
}

/* ---------- Touch / swipe helpers (simple) ---------- */
function addTouchHandlers(cell, index){
  let startX=0, startY=0, moved=false;
  cell.addEventListener('touchstart', (ev)=>{
    const t = ev.touches[0];
    startX = t.clientX; startY = t.clientY; moved=false;
  }, {passive:true});
  cell.addEventListener('touchmove', (ev)=>{
    moved = true; // user is dragging
  }, {passive:true});
  cell.addEventListener('touchend', (ev)=>{
    if(!moved) {
      // treat as tap
      handleSelect(index);
      return;
    }
    // determine swipe direction by comparing start to end
    const t = ev.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const absx = Math.abs(dx), absy = Math.abs(dy);
    if(Math.max(absx, absy) < 20) return; // too small
    let targetIndex = null;
    if(absx > absy){
      // horizontal swipe
      if(dx > 0) targetIndex = index + 1;
      else targetIndex = index - 1;
    } else {
      // vertical swipe
      if(dy > 0) targetIndex = index + WIDTH;
      else targetIndex = index - WIDTH;
    }
    if(targetIndex !== null && targetIndex>=0 && targetIndex < SIZE && isAdjacent(index, targetIndex)){
      handleSelect(index); // select source
      handleSelect(targetIndex); // then target -> triggers swap
    }
  }, {passive:true});
}

/* ---------- Expose some functions to global (so HTML buttons can call) ---------- */
window.initGame = initGame;
window.shuffleBoard = shuffleBoard;
window.showHint = showHint;
window.addCoins = addCoins;

/* ---------- Start: preload then init (when page loaded) ---------- */
window.addEventListener('load', async ()=>{
  await preload();
  console.log('Images preloaded:', pool.length);
  // try to update HUD coins display after preload
  setTimeout(()=> updateHUD(), 100);
});

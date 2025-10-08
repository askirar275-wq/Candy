/* js/game.js
   Ready-to-paste. Hindi comments.
   Board size: WIDTH = 6, HEIGHT = 8 (you asked earlier).
*/

const WIDTH = 6;
const HEIGHT = 8;
const SIZE = WIDTH * HEIGHT;
const IMAGE_BASE = 'images/';
const CANDIES = [
  'candy1.png','candy2.png','candy3.png','candy4.png',
  'candy5.png','candy6.png','candy7.png','candy8.png'
];

let pool = [];      // preloaded image URLs
let board = [];     // array of {src: 'images/...'} or null
let score = 0;
let moves = 40;
let combo = 1;
let selected = null;
let isSwapping = false;

// Coins (for shop). Persisted in localStorage under 'candy_coins'
let coins = Number(localStorage.getItem('candy_coins') || 50);

// --- PRELOAD IMAGES (so images exist when creating board) ---
async function preload() {
  const promises = CANDIES.map(name => {
    const url = IMAGE_BASE + name;
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(url);
      img.onerror = () => {
        console.warn('Image load failed:', url);
        res(null);
      };
      img.src = url;
    });
  });

  const results = await Promise.all(promises);
  pool = results.filter(Boolean);
  if (pool.length === 0) {
    // fallback: use data-URLs or empty placeholders (avoid crash)
    console.warn('No candy images loaded, using placeholders.');
    pool = CANDIES.slice(0,4).map(n => IMAGE_BASE + n);
  }
}

// --- RENDER BOARD ---
function render() {
  const grid = document.getElementById('game-board');
  if (!grid) {
    // safe: no grid found
    return;
  }

  // set CSS grid columns to match WIDTH (if CSS not set)
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${WIDTH}, 1fr)`;
  grid.style.gap = getComputedStyle(document.documentElement).getPropertyValue('--tile-gap') || '8px';

  grid.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    const img = document.createElement('img');
    img.className = 'tile';
    img.draggable = false;
    img.alt = '';
    const tile = board[i];
    img.src = tile ? tile.src : pool[Math.floor(Math.random() * pool.length)];
    img.setAttribute('data-index', i);

    // click handler
    cell.addEventListener('click', () => handleSelect(i));
    // touch handlers for swipe
    addTouchHandlers(cell, i);

    cell.appendChild(img);
    grid.appendChild(cell);
  }

  updateHUD();
}

// --- INIT GAME ---
function initGame() {
  // safety: ensure pool loaded
  if (pool.length === 0) {
    // try to preload synchronously (best-effort)
    preload().then(() => initGame());
    return;
  }

  score = 0;
  moves = 40;
  combo = 1;
  selected = null;
  isSwapping = false;

  board = new Array(SIZE).fill(null).map(() => ({ src: pool[Math.floor(Math.random() * pool.length)] }));

  // ensure no initial immediate matches (optional)
  removeInitialMatches();

  render();
  persistCoins();
  updateHUD();
  console.log('initGame() done.');
}

// remove immediate matches on start (simple attempt)
function removeInitialMatches(){
  let changed = true;
  let attempts = 0;
  while(changed && attempts < 10){
    changed = false;
    const m = findMatches();
    if(m.length > 0){
      m.forEach(i => {
        board[i] = { src: pool[Math.floor(Math.random() * pool.length)] };
        changed = true;
      });
    }
    attempts++;
  }
}

// --- SELECTION & SWAP FLOW ---
function handleSelect(i){
  if (isSwapping) return;
  if (selected === null){
    selected = i;
    addSelectedVisual(i);
    return;
  }
  if (selected === i){
    removeSelectedVisual(i);
    selected = null;
    return;
  }
  if (isAdjacent(selected, i)){
    isSwapping = true;
    removeSelectedVisual(selected);
    const a = selected, b = i;
    selected = null;

    swapWithAnimation(a,b).then(() => {
      const matches = findMatches();
      if (matches.length > 0){
        // award moves/score handled in handleMatches
        handleMatches(matches);
      } else {
        // swap back
        swapWithAnimation(a,b).then(() => {
          isSwapping = false;
          // reduce moves for attempted swap
          moves = Math.max(0, moves - 1);
          updateHUD();
        });
      }
      // reduce moves on attempt (if you want only when successful, adjust)
      moves = Math.max(0, moves - 0); // currently reduce only on swap-back earlier, change if needed
    });
  } else {
    removeSelectedVisual(selected);
    selected = i;
    addSelectedVisual(i);
  }
}

function addSelectedVisual(i){
  const cell = document.querySelector(`.cell[data-index="${i}"]`);
  if (cell) cell.classList.add('selected-cell');
  const tile = tileEl(i);
  if (tile) tile.classList.add('selected');
}
function removeSelectedVisual(i){
  const cell = document.querySelector(`.cell[data-index="${i}"]`);
  if (cell) cell.classList.remove('selected-cell');
  const tile = tileEl(i);
  if (tile) tile.classList.remove('selected');
}
function isAdjacent(a,b){
  const r1 = Math.floor(a / WIDTH), c1 = a % WIDTH;
  const r2 = Math.floor(b / WIDTH), c2 = b % WIDTH;
  return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
}
function tileEl(index){
  return document.querySelector(`.cell[data-index="${index}"] .tile`) || document.querySelector(`.tile[data-index="${index}"]`);
}

// --- Animated swap (cloned tiles) ---
function swapWithAnimation(aIndex, bIndex){
  return new Promise(resolve => {
    const aTile = tileEl(aIndex);
    const bTile = tileEl(bIndex);

    // If DOM not ready -> swap model and render
    if(!aTile || !bTile){
      [board[aIndex], board[bIndex]] = [board[bIndex], board[aIndex]];
      render();
      return resolve(true);
    }

    const aRect = aTile.getBoundingClientRect();
    const bRect = bTile.getBoundingClientRect();
    const dx = bRect.left - aRect.left;
    const dy = bRect.top - aRect.top;

    const aClone = aTile.cloneNode(true);
    const bClone = bTile.cloneNode(true);

    [aClone,bClone].forEach((cl, idx) => {
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

    aTile.style.visibility = 'hidden';
    bTile.style.visibility = 'hidden';

    requestAnimationFrame(()=> {
      aClone.style.transform = `translate(${dx}px, ${dy}px)`;
      bClone.style.transform = `translate(${-dx}px, ${-dy}px)`;
    });

    const cleanup = ()=>{
      aClone.remove();
      bClone.remove();
      aTile.style.visibility = '';
      bTile.style.visibility = '';

      [board[aIndex], board[bIndex]] = [board[bIndex], board[aIndex]];

      render();
      resolve(true);
    };

    setTimeout(cleanup, 300);
  });
}

// --- Match detection ---
function findMatches(){
  const matches = new Set();

  // horizontal
  for(let r=0; r<HEIGHT; r++){
    for(let c=0; c<WIDTH-2; c++){
      const i = r*WIDTH + c;
      if(board[i] && board[i+1] && board[i+2] &&
         board[i].src === board[i+1].src && board[i].src === board[i+2].src){
        matches.add(i); matches.add(i+1); matches.add(i+2);
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
        let k = r+3;
        while(k<HEIGHT && board[k*WIDTH + c] && board[k*WIDTH + c].src === board[i].src){
          matches.add(k*WIDTH + c); k++;
        }
      }
    }
  }

  return Array.from(matches).sort((a,b)=>a-b);
}

// --- Handle matches (pop + gravity) ---
function handleMatches(matches){
  if(matches.length === 0) return;
  // scoring & coins
  score += matches.length * 10 * combo;
  const coinsEarned = Math.max(1, Math.floor(matches.length / 3) * 5 * combo);
  coins += coinsEarned;
  persistCoins();
  // small popup
  showCoinPopup('+' + coinsEarned);

  combo++;

  matches.forEach(i => {
    const el = document.querySelector(`.cell[data-index="${i}"] .tile`);
    if(el){
      el.classList.add('pop');
      el.style.transition = 'transform 300ms, opacity 300ms';
      el.style.transform = 'scale(0.2)';
      el.style.opacity = '0';
    }
    board[i] = null;
  });

  setTimeout(()=> applyGravity(), 350);
  updateHUD();
}

// --- Gravity ---
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

  const newMatches = findMatches();
  if(newMatches.length > 0){
    setTimeout(()=> handleMatches(newMatches), 220);
  } else {
    combo = 1;
    isSwapping = false;
    updateHUD();
  }
}

// --- HUD & Coins persistence ---
function updateHUD(){
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins') || document.querySelector('.coins-bubble') || document.getElementById('shopCoins');
  if(scoreEl) scoreEl.textContent = score;
  if(coinsEl) coinsEl.textContent = coins;
  // moves element optional
  const movesEl = document.getElementById('moves');
  if(movesEl) movesEl.textContent = moves;
  if(moves <= 0){
    setTimeout(()=> alert('🏁 Game Over! Score: ' + score), 200);
  }
}

function persistCoins(){
  localStorage.setItem('candy_coins', String(coins));
}

// --- Shuffle ---
function shuffleBoard(){
  const srcs = board.map(b => b ? b.src : pool[Math.floor(Math.random()*pool.length)]);
  for(let i=srcs.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [srcs[i], srcs[j]] = [srcs[j], srcs[i]];
  }
  board = srcs.map(s => ({src:s}));
  render();
  updateHUD();
}

// --- Hint helper ---
function showHint(){
  const m = findMatches();
  if(m.length>0){
    const el = document.querySelector(`.cell[data-index="${m[0]}"] .tile`);
    if(el){
      el.style.transform = 'scale(1.2)';
      setTimeout(()=>{ if(el) el.style.transform=''; }, 900);
    }
  } else {
    // optionally highlight a random movable tile
  }
}

// --- coin popup visual ---
function showCoinPopup(text){
  const popup = document.createElement('div');
  popup.className = 'coin-popup';
  popup.textContent = text;
  document.body.appendChild(popup);
  setTimeout(()=> popup.remove(), 1200);
}

// --- Touch swipe helpers ---
function addTouchHandlers(cell, index){
  let startX = 0, startY = 0, moved = false;
  cell.addEventListener('touchstart', ev => {
    if(!ev.touches || ev.touches.length === 0) return;
    startX = ev.touches[0].clientX;
    startY = ev.touches[0].clientY;
    moved = false;
  }, {passive:true});

  cell.addEventListener('touchmove', ev => {
    if(!ev.touches || ev.touches.length === 0) return;
    const dx = ev.touches[0].clientX - startX;
    const dy = ev.touches[0].clientY - startY;
    if(Math.abs(dx) > 24 || Math.abs(dy) > 24){
      moved = true;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? WIDTH : -WIDTH);
      const target = index + dir;
      if(target >=0 && target < SIZE && isAdjacent(index, target)){
        handleSelect(target);
      }
    }
  }, {passive:true});
}

// --- expose to global ---
window.initGame = initGame;
window.shuffleBoard = shuffleBoard;
window.showHint = showHint;

// --- start: preload images on load ---
window.addEventListener('load', async () => {
  await preload();
  console.log('Images preloaded:', pool.length);
  // do not auto-init; wait for Start button which calls initGame()
});

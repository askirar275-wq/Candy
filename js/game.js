/* js/game.js - Coin-awarding version
   Replace your existing js/game.js with this file.
   नोट: यह वही मैच-3 लॉजिक रखता है जो पहले था; मैंने केवल coin awarding + popup + storage sync जोड़ा है.
*/

/* ===== CONFIG ===== */
const WIDTH = 6;     // user requested: width = 6
const HEIGHT = 8;    // user requested: height = 8
const SIZE = WIDTH * HEIGHT;
const IMAGE_BASE = 'images/';
const CANDIES = [
  'candy1.png','candy2.png','candy3.png','candy4.png',
  'candy5.png','candy6.png','candy7.png','candy8.png'
];

/* ===== STATE ===== */
let pool = [];      // preloaded image URLs
let board = [];     // tile objects {id, src}
let score = 0, moves = 40, combo = 1;
let selected = null;
let isSwapping = false;
let nextId = 1;

/* coins & inventory persisted */
let coins = Number(localStorage.getItem('candy_coins') || 0);
let inv = JSON.parse(localStorage.getItem('candy_inv') || JSON.stringify({bomb:0,shuffle:0}));

/* ===== PRELOAD IMAGES ===== */
async function preload(){
  pool = await Promise.all(CANDIES.map(n => {
    const url = IMAGE_BASE + n;
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(url);
      img.onerror = () => { console.warn('image load failed', url); res(''); };
      img.src = url;
    });
  }));
  pool = pool.filter(Boolean);
  if(pool.length === 0){
    // fallback: use relative names (will still show broken if missing) but avoid empty pool
    pool = CANDIES.map(n => IMAGE_BASE + n);
  }
}

/* ===== UTIL ===== */
function makeTile(src){
  return { id: nextId++, src: src || pool[Math.floor(Math.random()*pool.length)], power: null };
}
function randTile(){ return makeTile(); }

/* ===== RENDER ===== */
function render(){
  const grid = document.getElementById('game-board') || document.getElementById('grid');
  if(!grid) return console.warn('No grid element found (#game-board or #grid).');

  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${WIDTH}, 1fr)`;
  // ensure board has SIZE entries (may be null)
  for(let i=0;i<SIZE;i++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    const img = document.createElement('img');
    img.className = 'tile';
    img.draggable = false;

    const tile = board[i];
    if(tile){
      img.src = tile.src;
      img.dataset.src = tile.src;
    } else {
      img.src = ''; img.dataset.src = '';
    }

    cell.appendChild(img);
    cell.addEventListener('pointerdown', ()=> handleSelect(i));
    grid.appendChild(cell);
  }
  updateHUD();
}

/* ===== INIT ===== */
function initGame(){
  nextId = 1;
  score = 0; moves = 40; combo = 1; selected = null; isSwapping = false;
  board = new Array(SIZE).fill(null).map(()=> randTile());

  // avoid initial automatic matches (simple retry)
  let tries = 0;
  while(findMatches().length > 0 && tries++ < 800){
    board = new Array(SIZE).fill(null).map(()=> randTile());
  }

  render();
  persistState(); // save coins/inventory etc (safe)
}

/* ===== SELECTION & SWAP ===== */
function handleSelect(i){
  if(isSwapping) return;
  if(selected === null){
    selected = i; highlight(i); return;
  }
  if(selected === i){
    unhighlight(i); selected = null; return;
  }
  if(isAdjacent(selected, i)){
    // swap with animation
    isSwapping = true;
    unhighlight(selected);
    const a = selected, b = i; selected = null;

    swapWithAnimation(a,b).then(()=>{
      const matches = findMatches();
      if(matches.length > 0){
        // successful swap -> process matches
        moves = Math.max(0, moves - 1);
        updateHUD();
        handleMatches(matches);
      } else {
        // no match -> swap back
        swapWithAnimation(a,b).then(()=>{
          isSwapping = false;
          moves = Math.max(0, moves - 1); // still count as attempt
          updateHUD();
        });
      }
    });
  } else {
    unhighlight(selected); selected = i; highlight(i);
  }
}
function highlight(i){
  const el = document.querySelector(`.cell[data-index="${i}"]`);
  if(el) el.classList.add('selected-cell');
  const t = el && el.querySelector('.tile');
  if(t) t.classList.add('selected');
}
function unhighlight(i){
  const el = document.querySelector(`.cell[data-index="${i}"]`);
  if(el) el.classList.remove('selected-cell');
  const t = el && el.querySelector('.tile');
  if(t) t.classList.remove('selected');
}
function isAdjacent(a,b){
  if(a==null || b==null) return false;
  const r1 = Math.floor(a/WIDTH), c1 = a%WIDTH;
  const r2 = Math.floor(b/WIDTH), c2 = b%WIDTH;
  return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
}

/* ===== swapWithAnimation (cloned tiles) ===== */
function tileEl(index){
  return document.querySelector(`.cell[data-index="${index}"] .tile`);
}
function swapWithAnimation(aIndex, bIndex){
  return new Promise(resolve=>{
    const aTile = tileEl(aIndex), bTile = tileEl(bIndex);

    if(!aTile || !bTile){
      // fallback: swap model & render
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

    [aClone, bClone].forEach((cl, idx)=>{
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
      try{ aClone.remove(); bClone.remove(); }catch(e){}
      aTile.style.visibility = ''; bTile.style.visibility = '';
      // swap model
      [board[aIndex], board[bIndex]] = [board[bIndex], board[aIndex]];
      render();
      resolve(true);
    };

    setTimeout(cleanup, 300);
  });
}

/* ===== MATCH DETECTION ===== */
function findMatches(){
  const matches = new Set();

  // horizontal
  for(let r=0;r<HEIGHT;r++){
    for(let c=0;c<WIDTH-2;c++){
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
  for(let c=0;c<WIDTH;c++){
    for(let r=0;r<HEIGHT-2;r++){
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

/* ===== HANDLE MATCHES + COIN REWARD ===== */
function handleMatches(matches){
  if(!matches || matches.length === 0) return;
  // score
  score += matches.length * 10 * combo;
  // coin reward: example rule -> प्रति मिलाए गए tile पर 2 coin (आप बदल सकते हो)
  const coinEarned = matches.length * 2 * Math.max(1, combo-1); // combo increases reward
  if(coinEarned > 0) {
    addCoins(coinEarned);
  }

  combo++;
  updateHUD();

  // animate pop and nullify
  matches.forEach(i=>{
    const el = document.querySelector(`.cell[data-index="${i}"] .tile`);
    if(el){
      el.classList.add('pop');
      el.style.transition = 'transform 300ms, opacity 300ms';
      el.style.transform = 'scale(0.2)';
      el.style.opacity = '0';
    }
    board[i] = null;
  });

  // after pop animation apply gravity
  setTimeout(()=> applyGravity(), 350);
}

/* ===== GRAVITY + REFILL ===== */
function applyGravity(){
  for(let c=0;c<WIDTH;c++){
    const col = [];
    for(let r=HEIGHT-1;r>=0;r--){
      const idx = r*WIDTH + c;
      if(board[idx]) col.push(board[idx]);
    }
    // fill with new tiles at top
    while(col.length < HEIGHT) col.push(makeTile());
    for(let r=HEIGHT-1,i=0;r>=0;r--,i++){
      board[r*WIDTH + c] = col[i];
    }
  }

  render();

  // chain reactions
  const newMatches = findMatches();
  if(newMatches.length > 0){
    setTimeout(()=> handleMatches(newMatches), 220);
  } else {
    combo = 1;
    isSwapping = false;
    updateHUD();
  }
}

/* ===== COIN UI + STORAGE ===== */
function addCoins(amount){
  if(!amount || amount <= 0) return;
  coins = Number(coins || 0) + Number(amount);
  persistState();
  showCoinPopup('+' + amount + ' 💰');
  refreshShopUI();
}
function showCoinPopup(text){
  const el = document.createElement('div');
  el.className = 'coin-popup';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

/* ===== HUD & SHOP UI SYNC ===== */
function updateHUD(){
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const comboEl = document.getElementById('combo');
  const coinsEl = document.getElementById('coins');
  if(scoreEl) scoreEl.textContent = score;
  if(movesEl) movesEl.textContent = moves;
  if(comboEl) comboEl.textContent = combo + 'x';
  if(coinsEl) coinsEl.textContent = coins;

  // also update shop modal counters if present
  const shopCoins = document.getElementById('shopCoins');
  if(shopCoins) shopCoins.textContent = coins;
}

/* helper refresh (used by shop module) */
function refreshShopUI(){
  updateHUD();
  // If shop module has additional refresh logic, call it
  if(typeof window.refreshShopUI === 'function') window.refreshShopUI();
}

/* ===== SHUFFLE ===== */
function shuffleBoard(){
  const srcs = board.map(b => b ? b.src : pool[Math.floor(Math.random()*pool.length)]);
  for(let i=srcs.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [srcs[i], srcs[j]] = [srcs[j], srcs[i]];
  }
  board = srcs.map(s=> ({ src: s, id: nextId++ }));
  render(); updateHUD();
}

/* ===== PERSIST ===== */
function persistState(){
  try{
    localStorage.setItem('candy_coins', String(coins));
    localStorage.setItem('candy_inv', JSON.stringify(inv));
  }catch(e){ console.warn('persist failed', e); }
}

/* ===== HINT (optional) ===== */
function showHint(){
  const m = findMatches();
  if(m.length > 0){
    const el = document.querySelector(`.cell[data-index="${m[0]}"] .tile`);
    if(el){
      el.style.transform = 'scale(1.2)';
      setTimeout(()=> { if(el) el.style.transform = ''; }, 900);
    }
  }
}

/* ===== EXPORTS (global hooks) ===== */
window.initGame = initGame;
window.shuffleBoard = shuffleBoard;
window.showHint = showHint;
window.addCoins = addCoins;
window.refreshShopUI = refreshShopUI;

/* ===== STARTUP ===== */
window.addEventListener('load', async ()=>{
  await preload();
  // init automatically so Start button can call again if needed
  initGame();
  updateHUD();
  // debug log
  console.log('game.js loaded — board', WIDTH + 'x' + HEIGHT, 'pool:', pool.length, 'coins:', coins);
});

/* js/game.js
   Candy Match main logic — fixed for width=6, height=8 and safe HUD updates.
   Includes animated swapping, matches, gravity, combo system, and score HUD.
*/

const WIDTH = 6;   // columns
const HEIGHT = 8;  // rows
const SIZE = WIDTH * HEIGHT;
const IMAGE_BASE = 'images/';
const CANDIES = [
  'candy1.png','candy2.png','candy3.png','candy4.png',
  'candy5.png','candy6.png','candy7.png','candy8.png'
];

let pool = [];
let board = [];
let score = 0, moves = 40, combo = 1;
let selected = null;
let isSwapping = false;

/* ---------- PRELOAD IMAGES ---------- */
async function preload() {
  pool = await Promise.all(CANDIES.map(n => {
    const url = IMAGE_BASE + n;
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(url);
      img.onerror = () => {
        console.warn('❌ image load failed', url);
        res('');
      };
      img.src = url;
    });
  }));
  pool = pool.filter(Boolean);
  if(pool.length === 0){
    pool = CANDIES.slice(0,6).map(n => IMAGE_BASE + n);
  }
}

/* ---------- RENDER BOARD ---------- */
function render(){
  const grid = document.getElementById('game-board') || document.getElementById('grid');
  if(!grid) return console.warn('⚠️ No grid element found (#game-board or #grid).');

  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${WIDTH}, 1fr)`;

  board.forEach((tile, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    const img = document.createElement('img');
    img.className = 'tile';
    img.draggable = false;
    img.alt = '';
    img.src = tile ? tile.src : pool[Math.floor(Math.random()*pool.length)];
    img.setAttribute('data-index', i);

    cell.onclick = () => handleSelect(i);
    cell.appendChild(img);
    grid.appendChild(cell);
  });
}

/* ---------- INIT GAME ---------- */
function initGame(){
  score = 0; moves = 40; combo = 1;
  selected = null; isSwapping = false;
  board = new Array(SIZE).fill(null).map(()=>({ src: pool[Math.floor(Math.random()*pool.length)] }));
  render();
  updateHUD();
}

/* ---------- SELECTION & SWAP ---------- */
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
    isSwapping = true;
    unhighlight(selected);
    const a = selected, b = i;
    selected = null;

    swapWithAnimation(a,b).then(()=> {
      const matches = findMatches();
      if(matches.length > 0){
        handleMatches(matches);
      } else {
        swapWithAnimation(a,b).then(()=> {
          isSwapping = false;
          updateHUD();
        });
      }
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
  const tile = tileEl(i);
  if(tile) tile.classList.add('selected');
}
function unhighlight(i){
  const tile = tileEl(i);
  if(tile) tile.classList.remove('selected');
}
function isAdjacent(a,b){
  const r1 = Math.floor(a / WIDTH), c1 = a % WIDTH;
  const r2 = Math.floor(b / WIDTH), c2 = b % WIDTH;
  return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
}
function tileEl(index){
  return document.querySelector(`.cell[data-index="${index}"] .tile`);
}

/* ---------- SWAP ANIMATION ---------- */
function swapWithAnimation(aIndex, bIndex){
  return new Promise(resolve => {
    const aTile = tileEl(aIndex);
    const bTile = tileEl(bIndex);
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
    [aClone, bClone].forEach((cl, idx) => {
      cl.style.position = 'absolute';
      cl.style.left = (idx===0 ? aRect.left : bRect.left) + 'px';
      cl.style.top = (idx===0 ? aRect.top : bRect.top) + 'px';
      cl.style.width = aRect.width + 'px';
      cl.style.height = aRect.height + 'px';
      cl.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1)';
      cl.style.zIndex = 9999;
      document.body.appendChild(cl);
    });

    aTile.style.visibility = 'hidden';
    bTile.style.visibility = 'hidden';

    requestAnimationFrame(()=>{
      aClone.style.transform = `translate(${dx}px, ${dy}px)`;
      bClone.style.transform = `translate(${-dx}px, ${-dy}px)`;
    });

    setTimeout(()=>{
      aClone.remove();
      bClone.remove();
      aTile.style.visibility = '';
      bTile.style.visibility = '';
      [board[aIndex], board[bIndex]] = [board[bIndex], board[aIndex]];
      render();
      resolve(true);
    }, 300);
  });
}

/* ---------- MATCH DETECTION ---------- */
function findMatches(){
  const matches = new Set();

  for(let r=0; r<HEIGHT; r++){
    for(let c=0; c<WIDTH-2; c++){
      const i = r*WIDTH + c;
      if(board[i] && board[i+1] && board[i+2] &&
         board[i].src === board[i+1].src && board[i].src === board[i+2].src){
        matches.add(i); matches.add(i+1); matches.add(i+2);
      }
    }
  }

  for(let c=0; c<WIDTH; c++){
    for(let r=0; r<HEIGHT-2; r++){
      const i = r*WIDTH + c;
      if(board[i] && board[i+WIDTH] && board[i+2*WIDTH] &&
         board[i].src === board[i+WIDTH].src && board[i].src === board[i+2*WIDTH].src){
        matches.add(i); matches.add(i+WIDTH); matches.add(i+2*WIDTH);
      }
    }
  }

  return Array.from(matches).sort((a,b)=>a-b);
}

/* ---------- HANDLE MATCHES ---------- */
function handleMatches(matches){
  if(matches.length === 0) return;
  score += matches.length * 10 * combo;
  combo++;

  matches.forEach(i => {
    const el = document.querySelector(`.cell[data-index="${i}"] .tile`);
    if(el){
      el.style.transition = 'transform 300ms, opacity 300ms';
      el.style.transform = 'scale(0.2)';
      el.style.opacity = '0';
    }
    board[i] = null;
  });

  setTimeout(()=> applyGravity(), 350);
  updateHUD();
}

/* ---------- GRAVITY ---------- */
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
    setTimeout(()=> handleMatches(newMatches), 200);
  } else {
    combo = 1;
    isSwapping = false;
    updateHUD();
  }
}

/* ---------- HUD SAFE UPDATE ---------- */
function updateHUD(){
  const scoreEl = document.getElementById('score');
  if(scoreEl) scoreEl.textContent = score;

  const movesEl = document.getElementById('moves');
  if(movesEl) movesEl.textContent = moves || 0;

  const comboEl = document.getElementById('combo');
  if(comboEl) comboEl.textContent = combo + 'x';

  const coinsEl = document.getElementById('coins');
  if(coinsEl) coinsEl.textContent = window.coins || coinsEl.textContent || 0;

  if(typeof moves !== 'undefined' && moves <= 0){
    setTimeout(()=> alert('🏁 Game Over! Score: ' + score), 200);
  }
}

/* ---------- SHUFFLE ---------- */
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

/* ---------- HINT ---------- */
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

/* ---------- EXPORTS ---------- */
window.initGame = initGame;
window.shuffleBoard = shuffleBoard;
window.showHint = showHint;

/* ---------- AUTO START ---------- */
window.addEventListener('load', async ()=>{
  await preload();
  console.log('✅ Images preloaded:', pool.length);
});

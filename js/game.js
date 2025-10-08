/* ================= Candy Match Game – Jungle Version ================= */

const rows = 8;
const cols = 8;
const tileTypes = 6;

let board = [];
let score = 0;
let coins = 0;
let moves = 30;
let combo = 1;
let isLocked = false;

/* ---------- Helpers ---------- */
function $id(id){ return document.getElementById(id) || null; }
function $q(sel){ return document.querySelector(sel) || null; }
function safeAddClass(el, cls){ if(el && el.classList) el.classList.add(cls); }
function safeRemoveClass(el, cls){ if(el && el.classList) el.classList.remove(cls); }
function safeStyle(el, prop, val){ if(el && el.style) el.style[prop] = val; }

/* ---------- Initialization ---------- */
function init(){
  const savedCoins = localStorage.getItem('coins');
  if(savedCoins) coins = parseInt(savedCoins) || 0;

  generateBoard();
  render();
  updateHUD();
}

function persistCoins(){
  localStorage.setItem('coins', coins);
}

/* ---------- Board Logic ---------- */
function generateBoard(){
  board = [];
  for(let r=0; r<rows*cols; r++){
    board.push(Math.floor(Math.random() * tileTypes));
  }
  // avoid initial matches
  while(findMatches().length > 0){
    board = board.map(()=> Math.floor(Math.random() * tileTypes));
  }
}

/* ---------- Render ---------- */
function render(){
  const container = $id('game-board');
  if(!container) return;
  container.innerHTML = '';
  container.classList.add('board');

  for(let i=0; i<board.length; i++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    const tile = document.createElement('img');
    tile.className = 'tile';
    tile.draggable = false;
    tile.src = `images/candy${board[i]+1}.png`;

    cell.appendChild(tile);
    container.appendChild(cell);

    cell.addEventListener('click', ()=> handleClick(i));
  }
}

/* ---------- Tile Selection / Swap ---------- */
let selectedIndex = null;

function handleClick(index){
  if(isLocked) return;
  if(selectedIndex === null){
    highlight(index);
    selectedIndex = index;
  } else if(selectedIndex === index){
    unhighlight(index);
    selectedIndex = null;
  } else {
    swapTiles(selectedIndex, index);
    unhighlight(selectedIndex);
    selectedIndex = null;
  }
}

function tileEl(index){
  const cell = $q(`.cell[data-index="${index}"]`);
  return cell ? cell.querySelector('.tile') : null;
}

function highlight(i){
  const cell = $q(`.cell[data-index="${i}"]`);
  safeAddClass(cell, 'selected-cell');
  safeAddClass(tileEl(i), 'selected');
}
function unhighlight(i){
  const cell = $q(`.cell[data-index="${i}"]`);
  safeRemoveClass(cell, 'selected-cell');
  safeRemoveClass(tileEl(i), 'selected');
}

/* ---------- Swap Animation ---------- */
function swapTiles(aIndex, bIndex){
  const a = Math.floor(aIndex / cols), b = Math.floor(bIndex / cols);
  const aCol = aIndex % cols, bCol = bIndex % cols;
  const diff = Math.abs(a - b) + Math.abs(aCol - bCol);
  if(diff !== 1) return;

  swapWithAnimation(aIndex, bIndex).then(()=>{
    const matches = findMatches();
    if(matches.length > 0){
      moves--;
      resolveChain();
    } else {
      swapWithAnimation(aIndex, bIndex);
    }
    updateHUD();
  });
}

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
      safeStyle(cl, 'position', 'absolute');
      safeStyle(cl, 'left', (idx===0 ? aRect.left : bRect.left) + 'px');
      safeStyle(cl, 'top', (idx===0 ? aRect.top : bRect.top) + 'px');
      safeStyle(cl, 'width', aRect.width + 'px');
      safeStyle(cl, 'height', aRect.height + 'px');
      safeStyle(cl, 'margin', 0);
      safeStyle(cl, 'transition', 'transform 220ms cubic-bezier(.2,.9,.2,1)');
      safeStyle(cl, 'zIndex', 9999);
      cl.classList.add('swap-moving');
      document.body.appendChild(cl);
    });

    safeStyle(aTile, 'visibility', 'hidden');
    safeStyle(bTile, 'visibility', 'hidden');

    requestAnimationFrame(()=>{
      safeStyle(aClone, 'transform', `translate(${dx}px, ${dy}px)`);
      safeStyle(bClone, 'transform', `translate(${-dx}px, ${-dy}px)`);
    });

    const cleanup = ()=>{
      aClone.remove(); bClone.remove();
      safeStyle(aTile, 'visibility', '');
      safeStyle(bTile, 'visibility', '');
      [board[aIndex], board[bIndex]] = [board[bIndex], board[aIndex]];
      render();
      resolve(true);
    };

    setTimeout(cleanup, 320);
  });
}

/* ---------- Match Finder ---------- */
function findMatches(){
  const matches = [];

  // horizontal
  for(let r=0; r<rows; r++){
    for(let c=0; c<cols-2; c++){
      const idx = r*cols + c;
      const v = board[idx];
      if(v === board[idx+1] && v === board[idx+2] && v != null){
        matches.push(idx, idx+1, idx+2);
      }
    }
  }

  // vertical
  for(let c=0; c<cols; c++){
    for(let r=0; r<rows-2; r++){
      const idx = r*cols + c;
      const v = board[idx];
      if(v === board[idx+cols] && v === board[idx+cols*2] && v != null){
        matches.push(idx, idx+cols, idx+cols*2);
      }
    }
  }

  return [...new Set(matches)];
}

/* ---------- Gravity & Refill ---------- */
function applyGravityAndRefill(){
  for(let c=0; c<cols; c++){
    let empty = 0;
    for(let r=rows-1; r>=0; r--){
      const idx = r*cols + c;
      if(board[idx] === null){
        empty++;
      } else if(empty > 0){
        board[(r+empty)*cols + c] = board[idx];
        board[idx] = null;
      }
    }
    for(let r=0; r<empty; r++){
      board[r*cols + c] = Math.floor(Math.random() * tileTypes);
    }
  }
}

/* ---------- Chain Resolution ---------- */
function resolveChain(){
  if(isLocked) return;
  isLocked = true;
  combo = 1;

  (function step(){
    const matches = findMatches();
    if(matches.length === 0){
      isLocked = false;
      updateHUD();
      return;
    }

    const gained = matches.length * 5 * combo;
    score += gained;
    const coinGained = Math.floor(matches.length / 3);
    coins += coinGained;
    persistCoins();

    matches.forEach(i => {
      const t = tileEl(i);
      if(t){
        safeAddClass(t, 'pop');
        safeStyle(t, 'transform', 'scale(0.2) rotate(-30deg)');
        safeStyle(t, 'opacity', '0');
      }
      board[i] = null;
    });

    if(coinGained > 0) showCoinPopup('+' + coinGained + ' 💰');
    combo++;

    setTimeout(()=>{
      applyGravityAndRefill();
      render();
      setTimeout(()=> step(), 250);
    }, 400);
  })();
}

/* ---------- HUD ---------- */
function updateHUD(){
  const scoreEl = $id('score');
  const coinsEl = $id('coins');
  const movesEl = $id('moves');

  if(scoreEl) scoreEl.textContent = score;
  if(coinsEl) coinsEl.textContent = coins;
  if(movesEl) movesEl.textContent = moves;

  if(moves <= 0){
    setTimeout(()=> alert(`🏁 Game Over!\nScore: ${score}`), 200);
  }
}

/* ---------- Coin Popup ---------- */
function showCoinPopup(text){
  if(!text) return;
  const el = document.createElement('div');
  el.className = 'coin-popup';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

/* ---------- Restart ---------- */
function restartGame(){
  score = 0; moves = 30; combo = 1;
  generateBoard();
  render();
  updateHUD();
}

/* ---------- Start ---------- */
window.addEventListener('load', init);

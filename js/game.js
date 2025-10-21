// js/game.js
// Candy Match — image-based (tap to swap) prototype
const ROWS = 8, COLS = 8;
const TYPES = 5; // uses images candy1..candy5
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const msgEl = document.getElementById('message');
const btnRestart = document.getElementById('btnRestart');
const btnHint = document.getElementById('btnHint');

let grid = [];
let cells = [];
let score = 0;
let moves = 30;
let selected = null;
let animating = false;

function rand(n){ return Math.floor(Math.random()*n); }
function candySrc(type){ return `images/candy${type+1}.png`; } // type:0..4 -> candy1.png..candy5.png

function createEmpty(){
  grid = Array.from({length:ROWS}, ()=> Array(COLS).fill(null));
}

function fillNoInitialMatches(){
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      let val;
      do {
        val = rand(TYPES);
      } while (
        (c>=2 && grid[r][c-1] && grid[r][c-2] && grid[r][c-1].type === val && grid[r][c-2].type === val) ||
        (r>=2 && grid[r-1][c] && grid[r-2][c] && grid[r-1][c].type === val && grid[r-2][c].type === val)
      );
      grid[r][c] = {type: val, special: null};
    }
  }
}

function buildDOM(){
  boardEl.innerHTML = '';
  cells = [];
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r; el.dataset.c = c;
      const img = document.createElement('img');
      img.className = 'candy-img';
      el.appendChild(img);
      boardEl.appendChild(el);
      cells.push(el);
      el.addEventListener('click', onCellClick);
    }
  }
  renderAll();
}

function renderAll(){
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      renderCell(r,c);
    }
  }
  scoreEl.textContent = score;
  movesEl.textContent = moves;
}

function renderCell(r,c){
  const idx = r*COLS + c;
  const el = cells[idx];
  const img = el.firstChild;
  const item = grid[r][c];
  if(!item){ img.removeAttribute('src'); el.classList.remove('selected'); return; }
  img.src = candySrc(item.type);
  el.classList.toggle('selected', selected && selected.r==r && selected.c==c);
}

function coordsAdjacent(a,b){
  return Math.abs(a.r-b.r) + Math.abs(a.c-b.c) === 1;
}

function onCellClick(e){
  if(animating) return;
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  if(!selected){
    selected = {r,c};
    renderAll();
    return;
  }
  const target = {r,c};
  if(selected.r===target.r && selected.c===target.c){ selected = null; renderAll(); return; }
  if(!coordsAdjacent(selected,target)){ selected = target; renderAll(); return; }
  attemptSwap(selected,target);
}

function swapCells(a,b){
  const tmp = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = tmp;
  renderCell(a.r,a.c);
  renderCell(b.r,b.c);
}

function findMatches(){
  const toRemove = [];
  // horizontal runs
  for(let r=0;r<ROWS;r++){
    let runType=-1, runStart=0, runLen=0;
    for(let c=0;c<=COLS;c++){
      const t = c<COLS && grid[r][c] ? grid[r][c].type : -1;
      if(t === runType) runLen++;
      else {
        if(runLen>=3) for(let k=runStart;k<runStart+runLen;k++) toRemove.push({r,c:k});
        runType = t; runStart = c; runLen = 1;
      }
    }
  }
  // vertical runs
  for(let c=0;c<COLS;c++){
    let runType=-1, runStart=0, runLen=0;
    for(let r=0;r<=ROWS;r++){
      const t = r<ROWS && grid[r][c] ? grid[r][c].type : -1;
      if(t === runType) runLen++;
      else {
        if(runLen>=3) for(let k=runStart;k<runStart+runLen;k++) toRemove.push({r:k,c});
        runType = t; runStart = r; runLen = 1;
      }
    }
  }
  // dedupe
  const set = new Set();
  const unique = [];
  for(const p of toRemove){
    const k = p.r+','+p.c;
    if(!set.has(k)){ set.add(k); unique.push(p); }
  }
  return unique;
}

async function clearMatchesThenCollapse(){
  animating = true;
  while(true){
    const matches = findMatches();
    if(matches.length===0) break;
    score += matches.length * 60;
    msgEl.textContent = `Cleared ${matches.length} candies!`;
    // clear
    for(const m of matches) grid[m.r][m.c] = null;
    renderAll();
    await sleep(200);
    collapseGrid();
    renderAll();
    await sleep(160);
    refillGrid();
    renderAll();
    await sleep(180);
  }
  animating = false;
}

function collapseGrid(){
  for(let c=0;c<COLS;c++){
    let write = ROWS-1;
    for(let r=ROWS-1;r>=0;r--){
      if(grid[r][c]){
        if(write !== r){ grid[write][c] = grid[r][c]; grid[r][c] = null; }
        write--;
      }
    }
    for(let r=write;r>=0;r--) grid[r][c] = null;
  }
}

function refillGrid(){
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(!grid[r][c]) grid[r][c] = {type: rand(TYPES), special: null};
    }
  }
}

function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

async function attemptSwap(a,b){
  animating = true;
  swapCells(a,b);
  const matches = findMatches();
  if(matches.length === 0){
    await sleep(180);
    swapCells(a,b); // revert
    msgEl.textContent = 'No match — swap reverted';
    selected = null;
    animating = false;
    renderAll();
    return;
  }
  moves = Math.max(0, moves-1);
  renderAll();
  await clearMatchesThenCollapse();
  selected = null;
  renderAll();
  if(moves <= 0) msgEl.textContent = `Game over! Final score: ${score}`;
  else msgEl.textContent = `Moves left: ${moves}`;
  animating = false;
}

function findHint(){
  // brute-force swap check
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const dirs = [{r:r,c:c+1},{r:r+1,c:c}];
      for(const t of dirs){
        if(t.r<ROWS && t.c<COLS){
          swapCells({r,c}, t);
          const matches = findMatches();
          swapCells({r,c}, t);
          if(matches.length>0) return [{r,c}, t];
        }
      }
    }
  }
  return null;
}

/* UI bindings */
btnRestart.addEventListener('click', ()=> initGame());
btnHint.addEventListener('click', ()=>{
  const h = findHint();
  if(!h) msgEl.textContent = 'No hints available!';
  else {
    selected = h[0];
    renderAll();
    setTimeout(()=>{ msgEl.textContent = 'Try swapping highlighted cells'; selected = null; renderAll(); }, 700);
  }
});

/* Init */
function initGame(){
  score = 0; moves = 30; selected = null; animating = false;
  createEmpty(); fillNoInitialMatches(); buildDOM(); renderAll();
  msgEl.textContent = 'Tap one candy then tap adjacent candy to swap.';
}

// start
initGame();

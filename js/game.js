// js/game.js
// Config
const CONFIG = {
  candies: 6,        // number of candy images (1..6) in images/candy-#.png
  cols: 7,           // default grid width
  rows: 7,           // default grid height
  matchSize:3,
  tileSize:56,
  gap:10,
  baseScore:100
};

let boardEl, scoreEl, coinsEl, levelEl;
let boardCols, boardRows;
let board = []; // 2D array [r][c] storing candy index or null
let selectedStart = null;
let score=0, coins=0, level=1, goal=500;

function $(id){return document.getElementById(id)}

function makeBoardGrid(cols, rows){
  boardCols = cols; boardRows = rows;
  const b = $( 'board');
  // set CSS grid
  b.style.gridTemplateColumns = `repeat(${cols}, ${CONFIG.tileSize}px)`;
  b.style.gridTemplateRows = `repeat(${rows}, ${CONFIG.tileSize}px)`;
  b.innerHTML = '';
  board = Array.from({length:rows}, ()=>Array(cols).fill(0));
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const el = document.createElement('div');
      el.className='candy';
      el.dataset.r=r; el.dataset.c=c;
      el.style.width=`${CONFIG.tileSize}px`; el.style.height=`${CONFIG.tileSize}px`;
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointermove', onPointerMove);
      b.appendChild(el);
    }
  }
}

function randomCandy(){
  return Math.floor(Math.random()*CONFIG.candies)+1;
}

function fillInitial(){
  for(let r=0;r<boardRows;r++){
    for(let c=0;c<boardCols;c++){
      board[r][c]=randomCandy();
    }
  }
  // remove any initial matches
  while(true){
    const matches = findMatches();
    if(matches.length===0) break;
    for(const m of matches){
      for(const {r,c} of m) board[r][c]=randomCandy();
    }
  }
  renderAll();
}

function renderAll(){
  const nodes = document.querySelectorAll('#board .candy');
  nodes.forEach(n=>{
    const r = +n.dataset.r, c=+n.dataset.c;
    renderTile(n, r, c);
  });
}

function renderTile(node,r,c){
  const val = board[r][c];
  node.innerHTML='';
  if(val){
    const img = document.createElement('img');
    img.src = `images/candy-${val}.png`;
    img.alt='c';
    node.appendChild(img);
  }
}

// pointer swipe handling
let pointerStartX=0, pointerStartY=0, pointerDown=false, startR=-1, startC=-1;
function onPointerDown(e){
  e.preventDefault();
  const el = e.currentTarget; pointerDown=true;
  pointerStartX = e.clientX; pointerStartY = e.clientY;
  startR = +el.dataset.r; startC = +el.dataset.c;
}
function onPointerMove(e){
  if(!pointerDown) return;
}
function onPointerUp(e){
  if(!pointerDown) return; pointerDown=false;
  const dx = e.clientX - pointerStartX; const dy = e.clientY - pointerStartY;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  let tr=startR, tc=startC;
  if(Math.max(absX,absY) < 20) return; // small tap
  if(absX>absY){ // horizontal
    tc = dx>0 ? startC+1 : startC-1;
  } else {
    tr = dy>0 ? startR+1 : startR-1;
  }
  if(tr<0||tr>=boardRows||tc<0||tc>=boardCols) return;
  swapAndResolve(startR,startC,tr,tc);
}

function swapAndResolve(r1,c1,r2,c2){
  const tmp = board[r1][c1]; board[r1][c1]=board[r2][c2]; board[r2][c2]=tmp;
  renderAll();
  // check for matches, if none swap back
  const matches = findMatches();
  if(matches.length===0){
    // invalid move -> swap back
    setTimeout(()=>{ const t=board[r1][c1]; board[r1][c1]=board[r2][c2]; board[r2][c2]=t; renderAll(); }, 220);
    return;
  }
  // we have matches -> process until none
  processMatchesLoop();
}

function findMatches(){
  const out = [];
  // horizontal
  for(let r=0;r<boardRows;r++){
    let run=[{r,c:0}];
    for(let c=1;c<boardCols;c++){
      if(board[r][c] && board[r][c]===board[r][c-1]) run.push({r,c}); else { if(run.length>=CONFIG.matchSize) out.push(run); run=[{r,c}]; }
    }
    if(run.length>=CONFIG.matchSize) out.push(run);
  }
  // vertical
  for(let c=0;c<boardCols;c++){
    let run=[{r:0,c}];
    for(let r=1;r<boardRows;r++){
      if(board[r][c] && board[r][c]===board[r-1][c]) run.push({r,c}); else { if(run.length>=CONFIG.matchSize) out.push(run); run=[{r,c}]; }
    }
    if(run.length>=CONFIG.matchSize) out.push(run);
  }
  return out;
}

async function processMatchesLoop(){
  while(true){
    const matches = findMatches();
    if(matches.length===0) break;
    const removeSet = new Set();
    for(const m of matches) for(const p of m) removeSet.add(`${p.r},${p.c}`);
    // animate remove
    for(const key of removeSet){
      const [r,c] = key.split(',').map(Number);
      const node = document.querySelector(`#board .candy[data-r='${r}'][data-c='${c}']`);
      node.classList.add('removing');
    }
    // increment score
    score += removeSet.size * CONFIG.baseScore;
    updateUI();
    await delay(260);
    // clear
    for(const key of removeSet){
      const [r,c] = key.split(',').map(Number);
      board[r][c]=null;
    }
    renderAll();
    // gravity
    applyGravity();
    renderAll();
    await delay(260);
  }
  // check goal
  if(score >= goal){
    unlockNextLevel();
    alert('Level complete! Next level unlocked.');
  }
}

function applyGravity(){
  for(let c=0;c<boardCols;c++){
    let writeRow = boardRows-1;
    for(let r=boardRows-1;r>=0;r--){
      if(board[r][c]){ board[writeRow][c] = board[r][c]; writeRow--; }
    }
    for(let r=writeRow;r>=0;r--){ board[r][c] = randomCandy(); }
  }
}

function delay(ms){return new Promise(res=>setTimeout(res,ms))}

function updateUI(){
  scoreEl.textContent = score;
  coinsEl.textContent = coins;
  levelEl.textContent = level;
}

function unlockNextLevel(){
  const unlocked = Storage.get('unlocked',[1]);
  if(!unlocked.includes(level+1)){
    unlocked.push(level+1); Storage.set('unlocked',unlocked);
  }
}

function initGame(levelIndex=1){
  level = levelIndex;
  // customize by level (grid size / goal)
  const cols = Math.min(9, 6 + Math.floor((level-1)/3));
  const rows = Math.min(9, 6 + Math.floor((level-1)/3));
  goal = 500 * level;
  CONFIG.cols = cols; CONFIG.rows = rows;
  makeBoardGrid(cols, rows);
  fillInitial();
  score=0; updateUI();
}

window.addEventListener('load', ()=>{
  boardEl = $('board'); scoreEl=$('score'); coinsEl=$('coins'); levelEl=$('level');
  // setup default size
  initGame(Storage.get('currentLevel',1));

  $('restart').addEventListener('click', ()=> initGame(level));
  $('shuffle').addEventListener('click', ()=>{
    // shuffle board
    for(let r=0;r<boardRows;r++) for(let c=0;c<boardCols;c++) board[r][c]=randomCandy(); renderAll();
  });
});

// expose initGame for level-map.js
window.initGame = initGame;

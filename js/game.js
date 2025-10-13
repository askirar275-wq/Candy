// game.js
/* core game: 6 candies, match-3, gravity, shuffle, level handling */
let currentLevel = 1;
let size = 7; // grid size (7x7)
let score = 0;
const candies = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png'];

function $id(id){ return document.getElementById(id); }
const boardEl = $id('board');
const scoreEl = $id('score');
const levelEl = $id('level');

function randomCandy(){
  const n = Math.floor(Math.random() * candies.length);
  return 'images/' + candies[n];
}

let board = []; // 2d array
let selected = null;

function initGame(level=1){
  try {
    currentLevel = level;
    size = 7; // could change per level later
    score = 0;
    board = [];
    // ensure elements exist
    if(!boardEl){ console.warn('initGame: board element not found'); return; }
    if(scoreEl) scoreEl.textContent = score;
    if(levelEl) levelEl.textContent = currentLevel;

    // build board model
    for(let r=0;r<size;r++){
      board[r]=[];
      for(let c=0;c<size;c++){
        board[r][c]=randomCandy();
      }
    }

    renderBoard();
    // initial clean of any accidental matches
    setTimeout(() => { checkMatches(); }, 60);
    console.log('Game initialized at level', currentLevel);
  } catch(e){
    console.error('initGame error', e);
  }
}

function renderBoard(){
  if(!boardEl){ console.warn('renderBoard: no #board'); return; }
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      const img = document.createElement('img');
      img.draggable = false;
      img.alt = 'candy';
      img.src = board[r][c] || '';
      cell.appendChild(img);

      // pointer interactions (click to select / swap)
      cell.addEventListener('click', () => onCellClick(r,c));

      // touch swipe support (basic)
      let startX=0, startY=0;
      cell.addEventListener('touchstart', (ev)=> {
        const t = ev.touches[0];
        startX = t.clientX; startY = t.clientY;
      }, {passive:true});
      cell.addEventListener('touchend', (ev)=> {
        const t = ev.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        const absX = Math.abs(dx), absY = Math.abs(dy);
        if(Math.max(absX,absY) < 20) { /* tap */ return; }
        // determine direction
        let dr=0, dc=0;
        if(absX > absY){
          dc = dx>0?1:-1;
        } else {
          dr = dy>0?1:-1;
        }
        const nr = r+dr, nc = c+dc;
        if(nr>=0 && nr<size && nc>=0 && nc<size){
          swapCells({r,c},{r:nr,c:nc});
        }
      }, {passive:true});

      boardEl.appendChild(cell);
    }
  }
}

function onCellClick(r,c){
  const cellEl = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if(!selected){
    selected = {r,c};
    if(cellEl) cellEl.classList.add('selected');
  } else {
    // if same cell clicked, deselect
    if(selected.r===r && selected.c===c){
      selected = null;
      document.querySelectorAll('.cell.selected').forEach(el=>el.classList.remove('selected'));
      return;
    }
    swapCells(selected, {r,c});
    selected = null;
    document.querySelectorAll('.cell.selected').forEach(el=>el.classList.remove('selected'));
  }
}

function swapCells(a,b){
  // simple neighbour check: allow any swap but better to restrict to neighbors only
  const dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c);
  if(!( (dr===1 && dc===0) || (dr===0 && dc===1) )){
    // not adjacent — ignore
    console.warn('swapCells: not adjacent', a,b);
    return;
  }
  // swap model
  const tmp = board[a.r][a.c];
  board[a.r][a.c] = board[b.r][b.c];
  board[b.r][b.c] = tmp;
  renderBoard();
  // check matches. If none, swap back (simple rule)
  setTimeout(()=> {
    const matched = findMatches();
    if(matched.length === 0){
      // swap back
      const t = board[a.r][a.c];
      board[a.r][a.c] = board[b.r][b.c];
      board[b.r][b.c] = t;
      renderBoard();
      console.log('swap reverted (no match)');
    } else {
      // remove matched etc
      removeMatched(matched);
    }
  }, 120);
}

function findMatches(){
  const matched = [];
  // horizontal
  for(let r=0;r<size;r++){
    for(let c=0;c<size-2;c++){
      const v = board[r][c];
      if(!v) continue;
      if(board[r][c+1]===v && board[r][c+2]===v){
        matched.push([r,c],[r,c+1],[r,c+2]);
        // extend run
        let j=c+3;
        while(j<size && board[r][j]===v){ matched.push([r,j]); j++; }
      }
    }
  }
  // vertical
  for(let c=0;c<size;c++){
    for(let r=0;r<size-2;r++){
      const v = board[r][c];
      if(!v) continue;
      if(board[r+1] && board[r+1][c]===v && board[r+2] && board[r+2][c]===v){
        matched.push([r,c],[r+1,c],[r+2,c]);
        let i=r+3;
        while(i<size && board[i] && board[i][c]===v){ matched.push([i,c]); i++; }
      }
    }
  }
  // unique
  const uniq = {};
  matched.forEach(([r,c]) => { uniq[`${r},${c}`]=[r,c]; });
  return Object.values(uniq);
}

function removeMatched(matched){
  if(!matched || matched.length===0) return;
  matched.forEach(([r,c]) => { board[r][c] = null; });
  score += matched.length * 10;
  if(scoreEl) scoreEl.textContent = score;
  // animation pause then gravity
  setTimeout(()=> { applyGravity(); }, 120);
}

function applyGravity(){
  for(let c=0;c<size;c++){
    let empties = [];
    for(let r=size-1;r>=0;r--){
      if(!board[r][c]) empties.push(r);
      else if(empties.length){
        const newR = empties.shift();
        board[newR][c] = board[r][c];
        board[r][c] = null;
        empties.push(r);
      }
    }
    // fill top empties
    for(let r=0;r<size;r++){
      if(!board[r][c]) board[r][c] = randomCandy();
    }
  }
  renderBoard();
  // check new matches
  setTimeout(()=> {
    const m = findMatches();
    if(m.length) removeMatched(m);
  }, 120);
}

function shuffleBoard(){
  // flatten and reshuffle
  const flat = board.flat().sort(()=>Math.random()-0.5);
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      board[r][c] = flat[r*size + c];
    }
  }
  renderBoard();
  console.log('Board shuffled');
}

// expose to global
window.initGame = initGame;
window.shuffleBoard = shuffleBoard;
window.startLevel = function(l){
  currentLevel = l;
  if($id('level')) $id('level').textContent = l;
  initGame(l);
  // ensure game screen visible (UI shows map->game)
  const gameScreen = $id('game'); if(gameScreen) document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')), gameScreen.classList.add('active');
};

// auto init: if index loaded directly into game, do nothing — wait for user.
console.log('Loaded: js/game.js');

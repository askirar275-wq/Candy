/* Candy Match core */
const COLS = 8, ROWS = 8, SIZE = COLS * ROWS;
const IMAGE_BASE = '/images/';
const THEMES = {
  candy: ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png','candy7.png','candy8.png','candy9.png','candy10.png'],
  fruit: ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png','candy7.png','candy8.png','candy9.png','candy10.png']
};

let pool = []; // loaded urls
let state = { nextId:1, board: new Array(SIZE).fill(null), score:0, moves:40, level:1, combo:1 };
let CELL = [];
let dragging=false, pointerId=null, startIndex=null, locked=false;

/* helper to load images (detect available) */
function tryLoad(url){ return new Promise(res=>{ const i=new Image(); i.onload=()=>res({ok:true,url}); i.onerror=()=>res({ok:false,url}); i.src=url; }); }
async function loadTheme(theme='candy'){
  const list = THEMES[theme] || THEMES.candy;
  const results = await Promise.all(list.map(n => tryLoad(IMAGE_BASE + n)));
  pool = results.filter(r=>r.ok).map(r=>r.url);
  if(pool.length === 0){
    // fallback to emoji SVG data URIs
    pool = list.slice(0,6).map((_,i)=>`data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='100%' height='100%' fill='%23f6f6f6' /><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='80'>🍭</text></svg>`);
  }
  document.getElementById('imgCount').textContent = pool.length;
  return pool;
}

/* create grid cells once */
function createCells(){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  CELL = [];
  for(let i=0;i<SIZE;i++){
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.dataset.index = i;
    const img = document.createElement('img');
    img.alt = 'candy';
    img.draggable = false;
    btn.appendChild(img);
    btn.addEventListener('pointerdown', onDown);
    grid.appendChild(btn);
    CELL.push({btn,img});
  }
}

/* create a tile object */
function makeTile(src){ return { id: state.nextId++, src: src || pool[Math.floor(Math.random()*pool.length)], power:null }; }
function randTile(){ return makeTile(); }

/* render board (no random generation here) */
function render(dropMap){
  for(let i=0;i<SIZE;i++){
    const tile = state.board[i];
    const {btn,img} = CELL[i];
    btn.childNodes.forEach(n=>{ if(n.nodeType===3) n.remove(); });
    if(tile){
      if(img.dataset.src !== tile.src){ img.dataset.src = tile.src; img.src = tile.src; }
      btn.style.visibility = 'visible';
    } else {
      img.dataset.src=''; img.src=''; btn.style.visibility='hidden';
    }
    btn.style.transition = '';
    btn.style.transform = '';
    if(dropMap && tile && dropMap[tile.id]){
      btn.style.transform = `translateY(${dropMap[tile.id]})`;
      requestAnimationFrame(()=> requestAnimationFrame(()=> {
        btn.style.transition = `transform .32s cubic-bezier(.2,.8,.2,1)`;
        btn.style.transform = 'translateY(0)';
      }));
    }
    btn.classList.remove('pop');
  }
  updateHUD();
}

/* match detection (horizontal + vertical) by src */
function findMatches(bd){
  const matches=[];
  // horizontal
  for(let r=0;r<ROWS;r++){
    let run=[r*COLS];
    for(let c=1;c<COLS;c++){
      const p=r*COLS+c-1, i=r*COLS+c;
      if(bd[i] && bd[p] && bd[i].src === bd[p].src) run.push(i);
      else { if(run.length>=3) matches.push([...run]); run=[i]; }
    }
    if(run.length>=3) matches.push([...run]);
  }
  // vertical
  for(let c=0;c<COLS;c++){
    let run=[c];
    for(let r=1;r<ROWS;r++){
      const p=(r-1)*COLS+c, i=r*COLS+c;
      if(bd[i] && bd[p] && bd[i].src === bd[p].src) run.push(i);
      else { if(run.length>=3) matches.push([...run]); run=[i]; }
    }
    if(run.length>=3) matches.push([...run]);
  }
  return matches;
}

/* resolve matches -> remove -> gravity -> refill */
function resolveChain(){
  if(locked) return;
  locked=true; state.combo=1;
  (function step(){
    const matches = findMatches(state.board);
    if(matches.length === 0){ locked=false; updateHUD(); return; }
    const removeSet = new Set();
    matches.forEach(run=>run.forEach(i=>removeSet.add(i)));
    const removeIdx = Array.from(removeSet).sort((a,b)=>a-b);
    const removedCount = removeIdx.length;
    state.score += removedCount * 10 * state.combo; state.combo++; updateHUD();

    // pop
    let cx=0, cy=0, cnt=0;
    removeIdx.forEach(i=>{
      const el = CELL[i].btn;
      if(el){ const rc = el.getBoundingClientRect(); cx+=rc.left+rc.width/2; cy+=rc.top+rc.height/2; cnt++; el.classList.add('pop'); }
      state.board[i] = null;
    });

    setTimeout(()=> {
      // gravity & refill (only here create new tiles)
      const cols=[];
      for(let c=0;c<COLS;c++){
        const col=[];
        for(let r=ROWS-1;r>=0;r--){
          const idx=r*COLS+c;
          if(state.board[idx]) col.push(state.board[idx]);
        }
        cols.push(col);
      }
      const newBoard = new Array(SIZE).fill(null);
      const dropMap = {};
      const tilePx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || 64;
      const oldIds = new Set(state.board.filter(Boolean).map(t=>t.id));
      for(let c=0;c<COLS;c++){
        const col = cols[c];
        while(col.length < ROWS) col.push(randTile());
        for(let r=ROWS-1,i=0;r>=0;r--,i++){
          const tile = col[i];
          newBoard[r*COLS+c] = tile;
          if(!oldIds.has(tile.id)) dropMap[tile.id] = `-${(i+1)*tilePx}px`;
        }
      }
      state.board = newBoard;
      render(dropMap);

      setTimeout(()=> setTimeout(step, 220), 320);
    }, 300);
  })();
}

/* input handlers (pointer drag) */
function onDown(e){
  if(locked) return;
  const el = e.currentTarget; el.setPointerCapture && el.setPointerCapture(e.pointerId);
  dragging=true; pointerId=e.pointerId; startIndex = Number(el.dataset.index);
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}
function onMove(e){
  if(!dragging || e.pointerId !== pointerId) return;
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if(!target) return;
  const cell = target.closest && target.closest('.cell') ? target.closest('.cell') : null;
  if(!cell) return;
  const idx = Number(cell.dataset.index);
  if(Number.isNaN(idx)) return;
  if(isAdjacent(startIndex, idx) && idx !== startIndex){
    swapTiles(startIndex, idx);
    render();
    state.moves = Math.max(0, state.moves-1);
    updateHUD();
    const matches = findMatches(state.board);
    if(matches.length > 0) resolveChain();
    else setTimeout(()=>{ swapTiles(startIndex, idx); render(); }, 260);
    startIndex = idx;
  }
}
function onUp(e){
  dragging=false; pointerId=null; startIndex=null;
  document.removeEventListener('pointermove', onMove);
  document.removeEventListener('pointerup', onUp);
}
function isAdjacent(a,b){ if(a==null||b==null) return false; const r1=Math.floor(a/COLS),c1=a%COLS,r2=Math.floor(b/COLS),c2=b%COLS; return Math.abs(r1-r2)+Math.abs(c1-c2)===1; }
function swapTiles(i,j){ [state.board[i], state.board[j]] = [state.board[j], state.board[i]]; }

/* UI controls */
document.getElementById('restart').addEventListener('click', ()=> init(true));
document.getElementById('shuffle').addEventListener('click', ()=>{
  const arr = state.board.slice();
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  state.board = arr; render();
});
document.getElementById('placeBomb').addEventListener('click', ()=>{
  if(locked) return;
  const valid = state.board.map((t,i)=> t ? i : -1).filter(i=>i>=0);
  if(valid.length===0) return;
  const idx = valid[Math.floor(Math.random()*valid.length)];
  state.board[idx] = makeTile(pool[0]); state.board[idx].power = {type:'bomb'};
  render();
  setTimeout(()=> {
    const rem = new Set();
    const r0 = Math.floor(idx/COLS), c0 = idx%COLS;
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      const nr=r0+dr, nc=c0+dc;
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS) rem.add(nr*COLS+nc);
    }
    Array.from(rem).forEach(i=>{ CELL[i].btn.classList.add('pop'); state.board[i]=null; });
    state.score += rem.size * 10; updateHUD(); setTimeout(()=> resolveChain(), 240);
  }, 220);
});

/* HUD update */
function updateHUD(){
  document.getElementById('score').textContent = state.score;
  document.getElementById('moves').textContent = state.moves;
  document.getElementById('level').textContent = state.level;
}

/* Init board (no immediate matches) */
function fillInitialBoard(){
  state.nextId = 1;
  state.board = new Array(SIZE).fill(null).map(()=>randTile());
  let tries=0;
  while(findMatches(state.board).length > 0 && tries++ < 900){
    state.board = new Array(SIZE).fill(null).map(()=>randTile());
  }
}

/* responsive fit */
function fitTiles(){
  const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 6;
  const wrap = document.querySelector('.board-wrap').getBoundingClientRect();
  const availW = Math.min(wrap.width - 16, window.innerWidth - 48);
  const candidateW = Math.floor((availW - gap*(COLS-1))/COLS);
  const desired = Math.max(36, Math.min(candidateW, 80));
  document.documentElement.style.setProperty('--tile', desired + 'px');
}

/* public init */
async function init(force=false){
  const theme = document.getElementById('themeSelect')?.value || 'candy';
  await loadTheme(theme);
  if(CELL.length === 0) createCells();
  if(force || !state.board || state.board.filter(Boolean).length===0) fillInitialBoard();
  state.score = force ? 0 : state.score;
  state.moves = force ? 40 : state.moves;
  state.combo = 1;
  fitTiles(); render();
  updateHUD();
}

/* startup */
window._game = { init, render, state };
window.addEventListener('resize', ()=> { clearTimeout(window._resizeTO); window._resizeTO=setTimeout(()=>{ fitTiles(); render(); },120); });
(async ()=>{ await loadTheme('candy'); createCells(); init(true); })();

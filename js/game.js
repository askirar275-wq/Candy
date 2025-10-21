/* js/game.js
  CandyMatch minimal engine: grid, swap by swipe/drag, match detect, collapse, refill.
  Works with IDs: board, score, coins, level-num, btn-restart, btn-shuffle, btn-start, btn-map
*/

const CandyGame = (function(){
  // config
  const TYPES = ['c1','c2','c3','c4','c5','c6']; // 6 candy types (map to image files in images/)
  const ROWS = 8, COLS = 8; // grid size
  const CELL_PREFIX = 'cell-';

  // state
  let boardEl, scoreEl, coinsEl, levelEl;
  let board = []; // 2D array of type strings
  let score = 0, coins = 0, level = 1;
  let selected = null; // {r,c,el}
  let isAnimating = false;

  // images mapping (put your candy images in images/c1.png ... c6.png)
  function candyImgSrc(type){
    return `images/${type}.png`;
  }

  // helpers
  function randType(){ return TYPES[Math.floor(Math.random()*TYPES.length)]; }

  // DOM helpers
  function createCellElement(r,c,type){
    const el = document.createElement('div');
    el.className = 'cell';
    el.id = `${CELL_PREFIX}${r}-${c}`;
    el.dataset.r = r; el.dataset.c = c;
    const img = document.createElement('img');
    img.src = candyImgSrc(type);
    img.alt = type;
    el.appendChild(img);
    return el;
  }

  function renderBoard(){
    boardEl.innerHTML = '';
    // ensure grid columns style
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const type = board[r][c];
        const cell = createCellElement(r,c,type);
        // add pointer events for drag/swipe
        addPointerHandlers(cell);
        boardEl.appendChild(cell);
      }
    }
  }

  // initialize board with no immediate matches
  function initBoard(){
    board = Array.from({length:ROWS}, ()=> Array(COLS).fill(null));
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let t;
        do {
          t = randType();
          board[r][c] = t;
        } while (createsMatchAt(r,c));
      }
    }
    renderBoard();
  }

  // check if placing board[r][c] creates immediate 3+ match (used during fill)
  function createsMatchAt(r,c){
    const t = board[r][c];
    // horizontal
    let count=1;
    for(let x=c-1;x>=0 && board[r][x]===t; x--) count++;
    for(let x=c+1;x<COLS && board[r][x]===t; x++) count++;
    if (count>=3) return true;
    // vertical
    count=1;
    for(let y=r-1;y>=0 && board[y][c]===t; y--) count++;
    for(let y=r+1;y<ROWS && board[y][c]===t; y++) count++;
    return count>=3;
  }

  // pointer (mouse/touch) handling
  function addPointerHandlers(cell){
    // use pointer events
    cell.addEventListener('pointerdown', onPointerDown);
    cell.addEventListener('pointerup', onPointerUp);
    cell.addEventListener('pointercancel', onPointerCancel);
    cell.addEventListener('pointermove', onPointerMove);
    // disable default drag
    cell.addEventListener('dragstart', e=>e.preventDefault());
  }

  let pointerStart = null;
  function onPointerDown(e){
    if (isAnimating) return;
    const el = e.currentTarget;
    const r = +el.dataset.r, c = +el.dataset.c;
    pointerStart = {x: e.clientX, y: e.clientY, r, c, el};
    selected = {r,c,el};
    el.classList.add('selected');
    el.setPointerCapture(e.pointerId);
  }
  function onPointerCancel(e){ clearSelection(e); }
  function onPointerUp(e){
    if (!pointerStart) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    const thresh = 18; // minimal drag distance to count as swipe
    if (absX<thresh && absY<thresh){
      // small tap -> deselect
      clearSelection(e);
      return;
    }
    // determine direction
    let dr=0, dc=0;
    if (absX>absY){
      dc = dx>0 ? 1 : -1;
    } else {
      dr = dy>0 ? 1 : -1;
    }
    const sr = pointerStart.r, sc = pointerStart.c;
    const tr = sr + dr, tc = sc + dc;
    clearSelection(e);
    if (tr<0||tr>=ROWS||tc<0||tc>=COLS) return;
    // try swap
    swapAndHandle(sr,sc,tr,tc);
  }

  function onPointerMove(e){
    // optional: show drag direction visual - skip for simplicity
  }

  function clearSelection(e){
    if (!selected) return;
    selected.el.classList.remove('selected');
    try{ selected.el.releasePointerCapture && selected.el.releasePointerCapture(e.pointerId); }catch(_){}
    selected = null;
    pointerStart = null;
  }

  // swap two cells in data and animate DOM
  async function swapAndHandle(r1,c1,r2,c2){
    if (isAnimating) return;
    // only adjacent allowed
    if (Math.abs(r1-r2)+Math.abs(c1-c2) !== 1) return;
    isAnimating = true;
    // swap data
    const t1 = board[r1][c1], t2 = board[r2][c2];
    board[r1][c1] = t2; board[r2][c2] = t1;
    // update DOM images
    const el1 = document.getElementById(`${CELL_PREFIX}${r1}-${c1}`);
    const el2 = document.getElementById(`${CELL_PREFIX}${r2}-${c2}`);
    // animate basic: swap img src and small translate
    animateSwap(el1, el2);
    await sleep(180);
    // after swap, check for matches
    const matches = findMatches();
    if (matches.length===0){
      // revert swap (no match allowed)
      board[r1][c1] = t1; board[r2][c2] = t2;
      animateSwap(el1, el2);
      await sleep(180);
      isAnimating = false;
      return;
    }
    // else process matches loop until none
    while(true){
      const m = findMatches();
      if (m.length===0) break;
      highlightMatches(m);
      await sleep(220);
      const removed = removeMatches(m);
      updateScore(removed);
      await sleep(80);
      collapseColumns();
      await sleep(240);
      refillBoard();
      await sleep(240);
    }
    isAnimating = false;
    // after finishing check level completion criteria (example: target score)
    checkLevelComplete();
  }

  function animateSwap(el1, el2){
    // swap img src
    const img1 = el1.querySelector('img'), img2 = el2.querySelector('img');
    const s1 = img1.src, s2 = img2.src;
    img1.src = s2; img2.src = s1;
  }

  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  // find all matches (returns array of positions arrays)
  function findMatches(){
    const matches = [];
    const visited = Array.from({length:ROWS}, ()=> Array(COLS).fill(false));
    // horizontal
    for(let r=0;r<ROWS;r++){
      let start=0;
      for(let c=1;c<=COLS;c++){
        if (c<COLS && board[r][c]===board[r][start]) continue;
        const len = c-start;
        if (len>=3){
          const group = [];
          for(let x=start;x<c;x++){ group.push({r, c:x}); visited[r][x]=true; }
          matches.push(group);
        }
        start = c;
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let start=0;
      for(let r=1;r<=ROWS;r++){
        if (r<ROWS && board[r][c]===board[start][c]) continue;
        const len = r-start;
        if (len>=3){
          const group = [];
          for(let y=start;y<r;y++){ if(!visited[y][c]) group.push({r:y, c}); }
          if (group.length) matches.push(group);
        }
        start = r;
      }
    }
    return matches;
  }

  function highlightMatches(matches){
    // add .matched to corresponding DOM cells
    matches.forEach(group=>{
      group.forEach(p=>{
        const el = document.getElementById(`${CELL_PREFIX}${p.r}-${p.c}`);
        if (el) el.classList.add('matched');
      });
    });
    // remove class after short time
    setTimeout(()=> {
      matches.forEach(group=>{
        group.forEach(p=>{
          const el = document.getElementById(`${CELL_PREFIX}${p.r}-${p.c}`);
          if (el) el.classList.remove('matched');
        });
      });
    }, 400);
  }

  // removeMatches: set those board positions to null and clear DOM imgs
  function removeMatches(matches){
    let count = 0;
    matches.forEach(group=>{
      group.forEach(p=>{
        if (board[p.r][p.c]!==null){
          board[p.r][p.c] = null;
          const el = document.getElementById(`${CELL_PREFIX}${p.r}-${p.c}`);
          if (el){
            const img = el.querySelector('img');
            img.src = ''; // blank
          }
          count++;
        }
      });
    });
    return count;
  }

  // collapse columns downward
  function collapseColumns(){
    for(let c=0;c<COLS;c++){
      let write = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if (board[r][c]!==null){
          if (r!==write){
            board[write][c] = board[r][c];
            // update DOM img
            const src = candyImgSrc(board[write][c]);
            const el = document.getElementById(`${CELL_PREFIX}${write}-${c}`);
            if (el) el.querySelector('img').src = src;
            board[r][c] = null;
            const oldEl = document.getElementById(`${CELL_PREFIX}${r}-${c}`);
            if (oldEl) oldEl.querySelector('img').src = '';
          }
          write--;
        }
      }
      // fill the remaining top with nulls (to be refilled)
      for(let r=write;r>=0;r--) board[r][c] = null;
    }
  }

  // refill board: set null positions to random types and update DOM
  function refillBoard(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if (board[r][c]===null){
          board[r][c] = randType();
          const el = document.getElementById(`${CELL_PREFIX}${r}-${c}`);
          if (el){
            const img = el.querySelector('img');
            img.src = candyImgSrc(board[r][c]);
          }
        }
      }
    }
  }

  function updateScore(removedCount){
    const gained = removedCount * 10; // example scoring
    score += gained;
    coins += Math.floor(gained/50);
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
  }

  // simple shuffle (random reorder)
  function shuffleBoard(){
    const flat = [];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) flat.push(board[r][c]);
    // shuffle
    for(let i=flat.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    // reassign
    let k=0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      board[r][c] = flat[k++];
    }
    renderBoard();
  }

  // restart
  function restart(){
    score = 0; coins = 0;
    scoreEl.textContent = score; coinsEl.textContent = coins;
    initBoard();
  }

  // placeholder for level complete criteria
  function checkLevelComplete(){
    // example: reach score >= level*500
    const goal = level * 500;
    if (score >= goal){
      // unlock next level in localStorage
      const maxUnlocked = Number(localStorage.getItem('maxLevel')||1);
      if (level >= maxUnlocked) localStorage.setItem('maxLevel', level+1);
      console.info('Level complete! unlocked next level.');
      // show simple alert and go to map
      setTimeout(()=> alert('Level complete! Next level unlocked.'), 120);
    }
  }

  // init: bind UI
  function init(){
    boardEl = document.getElementById('board');
    scoreEl = document.getElementById('score');
    coinsEl = document.getElementById('coins');
    levelEl = document.getElementById('level-num');

    document.getElementById('btn-restart').addEventListener('click', restart);
    document.getElementById('btn-shuffle').addEventListener('click', ()=>{ if(!isAnimating) shuffleBoard(); });

    // map/start buttons
    const startBtn = document.getElementById('btn-start');
    if (startBtn) startBtn.addEventListener('click', ()=>{ showPage('map'); });

    // level navigation from level-map handled in level-map.js (calls startLevel)
    // default initialize board for playing level 1 on load (but hidden until game page)
    initBoard();
    // update UI values
    scoreEl.textContent = score; coinsEl.textContent = coins; levelEl.textContent = level;

    // log ready
    console.info('CandyEngine ready');
  }

  // Start specified level (called from level-map)
  function startLevel(n){
    if (isAnimating) return;
    level = n || 1;
    levelEl.textContent = level;
    score = 0; coins = 0;
    scoreEl.textContent = score; coinsEl.textContent = coins;
    initBoard();
    showPage('game');
  }

  function showPage(pageId){
    document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
    const el = document.getElementById(pageId);
    if (el) el.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  // expose
  return {
    init,
    startLevel,
    restart,
    shuffleBoard,
    showPage
  };
})();

// auto init when DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  // hide/show helper: ensure pages have class page and hidden controls
  document.querySelectorAll('.page').forEach(p=>{
    if (!p.id || p.id==='home') p.classList.remove('hidden');
    else p.classList.add('hidden');
  });
  CandyGame.init();

  // connect top back buttons (data-go)
  document.querySelectorAll('.back[data-go]').forEach(btn=>{
    btn.addEventListener('click', ()=> CandyGame.showPage(btn.dataset.go));
  });

  // connect start/map buttons on home
  const btnMap = document.getElementById('btn-map');
  if(btnMap) btnMap.addEventListener('click', ()=> CandyGame.showPage('map'));
});

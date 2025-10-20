// game.js
console.log('Loaded: js/game.js — CandyEngine starting');

(function(){
  // constants
  const rows = 8;
  const cols = 8;
  const candyCount = 6; // exactly 6 candy images: candy1..candy6.png
  const candyPrefix = 'images/candy';
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const levelEl = document.getElementById('levelNum');

  // state
  let grid = []; // grid[r][c] = {id: number, el: DOM}
  let score = 0;
  let coins = 0;
  let currentLevel = 1;
  let isAnimating = false;

  // expose for level-map to call
  window.CandyGame = {
    startLevel(level){
      currentLevel = level || 1;
      levelEl.textContent = currentLevel;
      initBoard();
      console.log('Game initialized at level', currentLevel);
    }
  };

  // helper: create cell DOM
  function createCell(r,c,id){
    const div = document.createElement('div');
    div.className = 'cell';
    div.dataset.r = r; div.dataset.c = c;
    const img = document.createElement('img');
    img.draggable = false;
    img.src = `${candyPrefix}${id}.png`;
    img.alt = 'candy';
    div.appendChild(img);
    return {id, el: div};
  }

  function randomCandy(){
    return Math.floor(Math.random()*candyCount)+1;
  }

  function initBoard(){
    score = 0; updateHUD();
    boardEl.innerHTML = '';
    grid = [];
    // build random grid, ensuring no immediate matches (simple attempt)
    for (let r=0;r<rows;r++){
      const row = [];
      for (let c=0;c<cols;c++){
        let id;
        let attempt=0;
        do{
          id = randomCandy(); attempt++;
          // avoid horizontal match
          if (c>=2 && id===row[c-1].id && id===row[c-2].id) continue;
          // avoid vertical match
          if (r>=2 && id=== (grid[r-1][c] && grid[r-1][c].id) && id=== (grid[r-2][c] && grid[r-2][c].id) ) continue;
          break;
        } while(attempt<20);
        const cellObj = createCell(r,c,id);
        row.push(cellObj);
      }
      grid.push(row);
    }
    // render DOM rows
    for (let r=0;r<rows;r++){
      const rowDiv = document.createElement('div');
      rowDiv.className = 'row';
      for (let c=0;c<cols;c++){
        rowDiv.appendChild(grid[r][c].el);
      }
      boardEl.appendChild(rowDiv);
    }

    attachEvents();
    // final safe check: if initial matches exist, remove them once to avoid instant clears
    setTimeout(()=>{ const matches = findAllMatches(); if (matches.length) { removeMatches(matches).then(()=>{ refillBoard(); }); } }, 120);
  }

  function updateHUD(){
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
  }

  /* ---------- Matching logic ---------- */
  function findAllMatches(){
    const matches = [];
    // rows
    for (let r=0;r<rows;r++){
      let run = [ {r, c:0, id:grid[r][0].id} ];
      for (let c=1;c<cols;c++){
        const id = grid[r][c].id;
        if (id===run[0].id) run.push({r,c,id});
        else {
          if (run.length>=3) matches.push(run.slice());
          run = [{r,c,id}];
        }
      }
      if (run.length>=3) matches.push(run.slice());
    }
    // cols
    for (let c=0;c<cols;c++){
      let run = [ {r:0, c, id:grid[0][c].id} ];
      for (let r=1;r<rows;r++){
        const id = grid[r][c].id;
        if (id===run[0].id) run.push({r,c,id});
        else {
          if (run.length>=3) matches.push(run.slice());
          run = [{r,c,id}];
        }
      }
      if (run.length>=3) matches.push(run.slice());
    }
    // flatten and unique coordinates
    const coordSet = new Set();
    matches.forEach(group=>{
      group.forEach(cell=> coordSet.add(`${cell.r},${cell.c}`));
    });
    const unique = Array.from(coordSet).map(s=>{ const [r,c]=s.split(',').map(Number); return {r,c, id:grid[r][c].id}; });
    return unique;
  }

  // removes matches with animation, returns Promise resolved when done
  function removeMatches(matches){
    if (!matches || !matches.length) return Promise.resolve();
    isAnimating = true;
    console.log('Matches found:', matches.length);
    matches.forEach(m=>{
      const el = grid[m.r][m.c].el;
      el.classList.add('fade');
    });
    // after animation remove and mark empty (id=0)
    return new Promise((resolve)=>{
      setTimeout(()=>{
        matches.forEach(m=>{
          grid[m.r][m.c].id = 0;
          const img = grid[m.r][m.c].el.querySelector('img');
          if (img) img.style.visibility = 'hidden';
          grid[m.r][m.c].el.classList.remove('fade');
        });
        // update score
        score += matches.length * 10;
        updateHUD();
        isAnimating = false;
        resolve();
      }, 300);
    });
  }

  // gravity: collapse columns and create new candies at top
  function collapseColumns(){
    for (let c=0;c<cols;c++){
      let write = rows-1;
      for (let r=rows-1;r>=0;r--){
        if (grid[r][c].id !== 0){
          if (write !== r){
            // move id down
            grid[write][c].id = grid[r][c].id;
            const srcImg = grid[r][c].el.querySelector('img');
            const dstImg = grid[write][c].el.querySelector('img');
            dstImg.src = srcImg.src;
            dstImg.style.visibility = 'visible';
          }
          write--;
        }
      }
      // fill remainder with new candies
      for (let r=write;r>=0;r--){
        const nid = randomCandy();
        grid[r][c].id = nid;
        const img = grid[r][c].el.querySelector('img');
        img.src = `${candyPrefix}${nid}.png`;
        img.style.visibility = 'visible';
      }
    }
  }

  function refillBoard(){ // loop: find matches, remove, collapse, repeat until no matches (safe limited loop)
    if (isAnimating) return;
    let loopCount = 0;
    const MAX_LOOPS = 10;
    function step(){
      const matches = findAllMatches();
      if (matches.length && loopCount < MAX_LOOPS){
        loopCount++;
        removeMatches(matches).then(()=>{
          collapseColumns();
          updateHUD();
          setTimeout(step, 180);
        });
      } else {
        // done
        checkLevelComplete();
      }
    }
    step();
  }

  function checkLevelComplete(){
    // simple goal: reach score threshold per level
    const goal = currentLevel * 500;
    if (score >= goal){
      // unlock next level in storage
      const prog = Storage.get('candy_progress', {unlocked:[1], coins:0});
      if (!prog.unlocked.includes(currentLevel+1)){
        prog.unlocked.push(currentLevel+1);
        Storage.set('candy_progress', prog);
      }
      alert('Level cleared! Next level unlocked.');
      console.log('Level completed:', currentLevel);
    }
  }

  /* ---------- Interaction (swipe / drag) ---------- */

  let startR=null, startC=null;
  let isTouch=false;

  function attachEvents(){
    // remove existing listeners
    boardEl.querySelectorAll('.cell').forEach(cell=>{
      cell.onpointerdown = null;
      cell.onpointerup = null;
      cell.ondragstart = ()=>false;
    });

    boardEl.querySelectorAll('.cell').forEach(cell=>{
      cell.addEventListener('pointerdown', e=>{
        if (isAnimating) return;
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        startR = r; startC = c;
        cell.classList.add('moving');
        e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
      });

      cell.addEventListener('pointerup', e=>{
        if (isAnimating) return;
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        const dr = r - startR, dc = c - startC;
        const absr = Math.abs(dr), absc = Math.abs(dc);
        if ((absr+absc) === 1){ // adjacent
          trySwap(startR, startC, r, c);
        }
        boardEl.querySelectorAll('.cell').forEach(x=>x.classList.remove('moving'));
        startR = startC = null;
      });

      // also support pointercancel
      cell.addEventListener('pointercancel', ()=>{
        boardEl.querySelectorAll('.cell').forEach(x=>x.classList.remove('moving'));
        startR = startC = null;
      });
    });

    // restart & shuffle
    $('#restartBtn').onclick = ()=>{
      initBoard();
    };
    $('#shuffleBtn').onclick = ()=>{
      safeShuffleBoard();
    };
  }

  // try swapping two cells; if swap produces match then keep and animate, else revert
  function trySwap(r1,c1,r2,c2){
    if (isAnimating) return;
    // swap ids
    const tmp = grid[r1][c1].id;
    grid[r1][c1].id = grid[r2][c2].id;
    grid[r2][c2].id = tmp;
    // update DOM images
    const img1 = grid[r1][c1].el.querySelector('img');
    const img2 = grid[r2][c2].el.querySelector('img');
    const t1 = img1.src, t2 = img2.src;
    img1.src = t2; img2.src = t1;

    // check matches
    const matches = findAllMatches();
    if (matches.length){
      // accept swap
      removeMatches(matches).then(()=>{ collapseColumns(); setTimeout(refillBoard,120); });
    } else {
      // revert swap visually after short delay
      isAnimating = true;
      setTimeout(()=>{
        const tmp2 = grid[r1][c1].id;
        grid[r1][c1].id = grid[r2][c2].id;
        grid[r2][c2].id = tmp2;
        img1.src = t1; img2.src = t2;
        isAnimating = false;
      }, 160);
    }
  }

  /* ---------- Safe shuffle (non recursive) ---------- */
  function safeShuffleBoard(){
    console.log('safeShuffleBoard start');
    // collect ids
    const all = [];
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) all.push(grid[r][c].id);
    // fisher-yates
    for (let i=all.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    const MAX_TRIES = 12;
    let tries=0;
    let ok=false;
    while(tries<MAX_TRIES && !ok){
      // place back
      let idx=0;
      for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){
        grid[r][c].id = all[idx++];
        const img = grid[r][c].el.querySelector('img');
        img.src = `${candyPrefix}${grid[r][c].id}.png`;
        img.style.visibility = 'visible';
      }
      const matches = findAllMatches();
      if (matches.length === 0) ok=true;
      else {
        // reshuffle all array and try again
        for (let i=all.length-1;i>0;i--){
          const j = Math.floor(Math.random()*(i+1));
          [all[i], all[j]] = [all[j], all[i]];
        }
      }
      tries++;
    }
    renderBoardImages();
    console.log('safeShuffleBoard done tries=',tries,'ok=',ok);
  }

  function renderBoardImages(){
    for (let r=0;r<rows;r++){
      for (let c=0;c<cols;c++){
        const img = grid[r][c].el.querySelector('img');
        img.src = `${candyPrefix}${grid[r][c].id}.png`;
        img.style.visibility = 'visible';
      }
    }
  }

  // Expose small API
  window.CandyGame.safeShuffle = safeShuffleBoard;

  // initialize once DOM loaded
  document.addEventListener('DOMContentLoaded', ()=>{
    console.log('DOM ready - creating initial board');
    // ensure gameScreen visible check: don't auto-start; wait for user to hit startLevel
    // But create empty placeholder cells so layout exists
    boardEl.innerHTML = '';
    for (let r=0;r<rows;r++){
      const rowDiv = document.createElement('div'); rowDiv.className='row';
      for (let c=0;c<cols;c++){
        const div = document.createElement('div'); div.className='cell';
        const img = document.createElement('img'); img.src='images/candy1.png'; img.style.visibility='hidden';
        div.appendChild(img);
        rowDiv.appendChild(div);
      }
      boardEl.appendChild(rowDiv);
    }
    // When map starts level, CandyGame.startLevel will build the actual board.
    console.log('CandyEngine ready');
  });

})();

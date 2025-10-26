/* CandyGame core */
const CandyGame = (function(){
  const boardEl = UI.$('#board');
  const scoreEl = UI.$('#score');
  const coinsEl = UI.$('#coins');
  const levelEl = UI.$('#level-num');
  const restartBtn = UI.$('#btn-restart');
  const shuffleBtn = UI.$('#btn-shuffle');

  const rows = 8, cols = 8; // grid
  const candyTypes = [
    'images/c1.png','images/c2.png','images/c3.png',
    'images/c4.png','images/c5.png','images/c6.png'
  ];

  let grid = []; // length rows*cols, each: {type: index}
  let score = 0, coins = 0, currentLevel = 1;
  let selectedIndex = null;
  let checking = false;

  // Ensure board grid styles
  function setupGridUI(){
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    boardEl.innerHTML = '';
    boardEl.style.gap = '10px';
    for(let i=0;i<rows*cols;i++){
      const sq = document.createElement('div');
      sq.className = 'square';
      sq.dataset.index = i;
      sq.addEventListener('click', onSquareClick);
      // touch (for swipes)
      let startX=0, startY=0;
      sq.addEventListener('touchstart', e=>{
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, {passive:true});
      sq.addEventListener('touchend', e=>{
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        const absdx = Math.abs(dx), absdy = Math.abs(dy);
        const idx = Number(sq.dataset.index);
        if(Math.max(absdx,absdy) < 20) return; // tap already handled
        if(absdx>absdy){
          if(dx>0) trySwap(idx, idx+1); else trySwap(idx, idx-1);
        } else {
          if(dy>0) trySwap(idx, idx+cols); else trySwap(idx, idx-cols);
        }
      }, {passive:true});
      boardEl.appendChild(sq);
    }
  }

  function randType(){ return Math.floor(Math.random()*candyTypes.length); }

  function fillInitial(){
    grid = new Array(rows*cols).fill(null).map(()=>({type: randType()}));
    // avoid starting with matches
    removeInitialMatches();
    render();
  }

  function removeInitialMatches(){
    let changed = true;
    while(changed){
      changed = false;
      const matches = findMatches();
      if(matches.length){
        changed = true;
        matches.forEach(idx=>{
          grid[idx] = {type: randType()};
        });
      }
    }
  }

  function render(){
    const squares = boardEl.children;
    for(let i=0;i<rows*cols;i++){
      const s = squares[i];
      s.classList.remove('selected');
      const img = s.querySelector('img');
      if(img) s.removeChild(img);
      const cell = grid[i];
      if(cell){
        const im = document.createElement('img');
        im.src = candyTypes[cell.type];
        im.alt = 'candy';
        s.appendChild(im);
      }
    }
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    levelEl.textContent = currentLevel;
  }

  function getRow(i){ return Math.floor(i/cols); }
  function isAdjacent(a,b){
    if(b<0 || b>=rows*cols) return false;
    const ra = getRow(a), rb = getRow(b);
    return (Math.abs(a-b) === 1 && ra===rb) || Math.abs(a-b) === cols;
  }

  function onSquareClick(e){
    const idx = Number(e.currentTarget.dataset.index);
    if(selectedIndex===null){
      selectedIndex = idx;
      e.currentTarget.classList.add('selected');
    } else {
      if(idx === selectedIndex){
        // deselect
        boardEl.children[selectedIndex].classList.remove('selected');
        selectedIndex = null;
      } else if(isAdjacent(idx, selectedIndex)){
        trySwap(selectedIndex, idx);
        boardEl.children[selectedIndex].classList.remove('selected');
        selectedIndex = null;
      } else {
        // new selection
        boardEl.children[selectedIndex].classList.remove('selected');
        selectedIndex = idx;
        e.currentTarget.classList.add('selected');
      }
    }
  }

  function trySwap(a,b){
    if(checking) return;
    if(b<0 || b>=rows*cols) return;
    if(!isAdjacent(a,b)) return;
    checking = true;
    swapCells(a,b);
    const matches = findMatches();
    if(matches.length){
      // good swap
      doMatches();
    } else {
      // revert
      setTimeout(()=>{ swapCells(a,b); checking=false; render(); }, 180);
    }
    render();
  }

  function swapCells(a,b){
    const tmp = grid[a];
    grid[a] = grid[b];
    grid[b] = tmp;
  }

  // find all matching indices (3 or more in row or column)
  function findMatches(){
    const matches = new Set();
    // rows
    for(let r=0;r<rows;r++){
      let start = r*cols;
      let runType = grid[start].type;
      let runLen = 1;
      for(let c=1;c<cols;c++){
        const idx = start+c;
        if(grid[idx].type === runType){ runLen++; }
        else {
          if(runLen>=3){
            for(let k=0;k<runLen;k++) matches.add(start + c-1-k);
          }
          runType = grid[idx].type;
          runLen = 1;
        }
      }
      if(runLen>=3) for(let k=0;k<runLen;k++) matches.add(start + cols-1 - k);
    }
    // cols
    for(let c=0;c<cols;c++){
      let start = c;
      let runType = grid[start].type;
      let runLen = 1;
      for(let r=1;r<rows;r++){
        const idx = r*cols + c;
        if(grid[idx].type === runType){ runLen++; }
        else {
          if(runLen>=3){
            for(let k=0;k<runLen;k++) matches.add((r-1-k)*cols + c);
          }
          runType = grid[idx].type;
          runLen = 1;
        }
      }
      if(runLen>=3) for(let k=0;k<runLen;k++) matches.add((rows-1-k)*cols + c);
    }
    return Array.from(matches);
  }

  // remove matches, collapse, refill — loop until no more matches
  async function doMatches(){
    let totalRemoved = 0;
    let loop=0;
    while(true){
      const matches = findMatches();
      if(matches.length===0) break;
      loop++;
      // remove
      matches.forEach(i => grid[i] = null);
      totalRemoved += matches.length;
      score += matches.length * 10;
      render();
      // wait animation
      await new Promise(r=>setTimeout(r, 250));
      // collapse columns
      for(let c=0;c<cols;c++){
        let write = (rows-1)*cols + c;
        for(let r=rows-1;r>=0;r--){
          const idx = r*cols + c;
          if(grid[idx]!==null){
            grid[write] = grid[idx];
            if(write!==idx) grid[idx] = null;
            write -= cols;
          }
        }
        // fill remaining with new candies
        for(let rr = Math.floor(write/cols); rr>=0; rr--){
          const id = rr*cols + c;
          grid[id] = {type: randType()};
        }
      }
      render();
      await new Promise(r=>setTimeout(r, 180));
      // prevent infinite loops
      if(loop>20) break;
    }
    checking = false;
    // after finishing, award coins & maybe unlock next level
    coins += Math.floor(totalRemoved/5);
    Storage.set('coins', coins);
    // simple check for level complete (score goal: level*500)
    const goal = (currentLevel*500);
    if(score >= goal){
      // unlock next
      const next = currentLevel+1;
      window.LevelMapUI && window.LevelMapUI.unlock(next);
      alert('Level complete! अगला level अनलॉक हुआ।');
    }
    render();
  }

  // shuffle grid randomly
  function shuffleGrid(){
    for(let i=grid.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      const tmp = grid[i]; grid[i]=grid[j]; grid[j]=tmp;
    }
    render();
  }

  // public method to start level
  function startLevel(level=1){
    currentLevel = level;
    score = 0;
    coins = Storage.get('coins', 0) || 0;
    setupGridUI();
    fillInitial();
    render();
    UI.showPage('game');
  }

  // bind buttons
  restartBtn && restartBtn.addEventListener('click', ()=> startLevel(currentLevel));
  shuffleBtn && shuffleBtn.addEventListener('click', ()=> { shuffleGrid(); });

  // expose
  window.CandyGame = { startLevel };

  return { startLevel };
})();

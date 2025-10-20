// CandyGame engine (exposed as window.CandyGame)
(function(){
  const width = 8;
  const candyCount = 6;
  let board = [];
  let boardEl, scoreEl, coinsEl, levelEl;
  let score = 0, coins = 0, currentLevel = 1;
  let isProcessing = false;

  function randCandy(){ return Math.floor(Math.random()*candyCount)+1; }

  function createBoardUI(){
    boardEl.innerHTML = '';
    for(let i=0;i<width*width;i++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.idx = i;
      boardEl.appendChild(cell);
    }
  }

  function renderBoard(){
    for(let i=0;i<board.length;i++){
      const cell = boardEl.children[i];
      cell.innerHTML = '';
      const v = board[i];
      if(v){
        const img = document.createElement('img');
        img.src = `images/candy${v}.png`;
        img.alt = '';
        cell.appendChild(img);
      }
    }
  }

  function fillInitial(){
    board = new Array(width*width).fill(0);
    for(let i=0;i<board.length;i++) board[i]=randCandy();
    // ensure no immediate matches
    while(checkAnyMatches().length) {
      for(let i=0;i<board.length;i++) board[i]=randCandy();
    }
  }

  // swap and check
  function swap(i,j){
    const tmp = board[i]; board[i]=board[j]; board[j]=tmp;
  }

  function inSameRow(a,b){
    return Math.floor(a/width)===Math.floor(b/width);
  }

  function checkAnyMatches(){
    const matches = [];
    // horizontal
    for(let r=0;r<width;r++){
      for(let c=0;c<width-2;c++){
        const i = r*width+c;
        const v = board[i];
        if(!v) continue;
        if(board[i+1]===v && board[i+2]===v){
          let j=i;
          const group=[];
          while(j<r*width+width && board[j]===v){ group.push(j); j++; }
          matches.push(group);
        }
      }
    }
    // vertical
    for(let c=0;c<width;c++){
      for(let r=0;r<width-2;r++){
        const i = r*width+c;
        const v=board[i];
        if(!v) continue;
        if(board[i+width]===v && board[i+2*width]===v){
          let j=r;
          const group=[];
          while(j<width && board[j*width+c]===v){ group.push(j*width+c); j++; }
          matches.push(group);
        }
      }
    }
    return matches;
  }

  function removeMatchesAndScore(){
    const matches = checkAnyMatches();
    if(!matches.length) return false;
    let removedCount=0;
    matches.forEach(g=>{
      g.forEach(idx=>{
        if(board[idx]!==0){ board[idx]=0; removedCount++; }
      });
    });
    score += removedCount * 10;
    coins += Math.floor(removedCount/3);
    updateStats();
    return true;
  }

  function collapseAndRefill(){
    for(let c=0;c<width;c++){
      const col=[];
      for(let r=0;r<width;r++){
        const v = board[r*width+c];
        if(v) col.push(v);
      }
      const missing = width - col.length;
      const newCol = new Array(missing).fill(0).map(()=>randCandy()).concat(col);
      for(let r=0;r<width;r++){
        board[r*width+c]=newCol[r];
      }
    }
  }

  function updateStats(){
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    levelEl.textContent = currentLevel;
  }

  // touch / mouse swap handling
  let dragStartIdx = null;
  function bindInput(){
    let startX=0,startY=0;
    boardEl.addEventListener('pointerdown', (e)=>{
      const el = e.target.closest('.cell');
      if(!el) return;
      dragStartIdx = parseInt(el.dataset.idx,10);
      startX = e.clientX; startY = e.clientY;
    });
    boardEl.addEventListener('pointerup',(e)=>{
      if(dragStartIdx===null) return;
      const el = e.target.closest('.cell');
      if(!el){ dragStartIdx=null; return; }
      const endIdx = parseInt(el.dataset.idx,10);
      if(endIdx===dragStartIdx){ dragStartIdx=null; return;}
      // check adjacency: up/down/left/right
      const di = Math.abs(endIdx-dragStartIdx);
      const valid = (di===1 && inSameRow(endIdx,dragStartIdx)) || (di===width);
      if(!valid){ dragStartIdx=null; return; }
      trySwapAndResolve(dragStartIdx,endIdx);
      dragStartIdx=null;
    });
  }

  async function trySwapAndResolve(i,j){
    if(isProcessing) return;
    isProcessing = true;
    swap(i,j);
    renderBoard();
    await sleep(120);
    let matched = checkAnyMatches().length>0;
    if(!matched){
      // revert
      swap(i,j);
      renderBoard();
      isProcessing=false;
      return;
    }
    // resolve loop
    while(true){
      await sleep(120);
      removeMatchesAndScore();
      renderBoard();
      await sleep(120);
      collapseAndRefill();
      renderBoard();
      await sleep(140);
      if(!checkAnyMatches().length) break;
    }
    isProcessing=false;
    saveProgress();
  }

  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function shuffleBoard(){
    for(let i=0;i<board.length;i++) board[i]=randCandy();
    // ensure at least one valid match exists
    while(!checkAnyMatches().length){
      for(let i=0;i<board.length;i++) board[i]=randCandy();
    }
    renderBoard();
  }

  function restart(){
    score=0;
    fillInitial();
    renderBoard();
    updateStats();
    saveProgress();
  }

  function saveProgress(){
    Storage.set('candy-coins', coins);
    Storage.set('candy-best-score', score);
  }

  // public API
  window.CandyGame = {
    init: function(opts){
      boardEl = document.getElementById('board');
      scoreEl = document.getElementById('score');
      coinsEl = document.getElementById('coins');
      levelEl = document.getElementById('level-num');

      coins = Storage.get('candy-coins', 0);
      score = 0;
      currentLevel = opts && opts.level ? opts.level : 1;
      updateStats();
      createBoardUI();
      fillInitial();
      renderBoard();
      bindInput();

      // expose actions for UI
      document.getElementById('btn-restart').addEventListener('click',restart);
      document.getElementById('btn-shuffle').addEventListener('click',()=>{
        shuffleBoard();
        saveProgress();
      });
      console.info('CandyEngine ready');
    },
    startLevel: function(level){
      currentLevel = level;
      score = 0;
      // level settings (example): you could vary width / targets per level - keep simple now
      updateStats();
      fillInitial();
      renderBoard();
      console.info('Started level', level);
    }
  };
})();

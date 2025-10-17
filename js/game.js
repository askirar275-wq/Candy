(function(){
  // images (6 candies). Make sure files exist in images/
  const CANDIES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  const ROWS = 8;
  const COLS = 8;

  const boardEl = document.getElementById('gameBoard');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const levelEl = document.getElementById('levelNum');
  const restartBtn = document.getElementById('restartBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');

  // level goals (simple formula) - you can customize per index
  function getGoalForLevel(level){
    // उदाहरण: level 1 => 500, 2 => 1000, 3 => 1500 ...
    return level * 500;
  }

  let board = [];
  let score = 0;
  let selected = null;
  let animating = false;

  function randCandyIndex(){ return Math.floor(Math.random()*CANDIES.length); }

  function buildBoard(){
    board = Array.from({length: ROWS}, ()=> Array.from({length: COLS}, ()=> 0));
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        let idx;
        do {
          idx = randCandyIndex();
          board[r][c]=idx;
        } while (createsImmediateMatch(r,c));
      }
    }
  }

  function createsImmediateMatch(r,c){
    const v = board[r][c];
    if(c>=2 && board[r][c-1]===v && board[r][c-2]===v) return true;
    if(r>=2 && board[r-1][c]===v && board[r-2][c]===v) return true;
    return false;
  }

  function renderBoard(){
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = CANDIES[ board[r][c] ];
        img.draggable = false;
        cell.appendChild(img);

        cell.addEventListener('click', onCellClick);
        addSwipeHandlers(cell);
        boardEl.appendChild(cell);
      }
    }
  }

  function onCellClick(e){
    if(animating) return;
    const el = e.currentTarget;
    if(!selected){
      selected = el;
      el.classList.add('selected');
    } else if(selected === el){
      selected.classList.remove('selected');
      selected = null;
    } else {
      const r1 = Number(selected.dataset.r), c1 = Number(selected.dataset.c);
      const r2 = Number(el.dataset.r), c2 = Number(el.dataset.c);
      if(isAdjacent(r1,c1,r2,c2)){
        swapAndCheck(selected, el);
      } else {
        selected.classList.remove('selected');
        selected = el;
        el.classList.add('selected');
      }
    }
  }

  function isAdjacent(r1,c1,r2,c2){
    const dr = Math.abs(r1-r2), dc = Math.abs(c1-c2);
    return (dr+dc)===1;
  }

  function swapAndCheck(aEl,bEl){
    if(animating) return;
    animating = true;
    const r1=+aEl.dataset.r, c1=+aEl.dataset.c;
    const r2=+bEl.dataset.r, c2=+bEl.dataset.c;

    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;

    updateCellImage(aEl, board[r1][c1]);
    updateCellImage(bEl, board[r2][c2]);

    const matches = findAllMatches();
    if(matches.length===0){
      setTimeout(()=>{
        const tmp2 = board[r1][c1];
        board[r1][c1] = board[r2][c2];
        board[r2][c2] = tmp2;
        updateCellImage(aEl, board[r1][c1]);
        updateCellImage(bEl, board[r2][c2]);
        cleanupSelection();
        animating=false;
      },200);
    } else {
      cleanupSelection();
      processMatchesLoop();
    }
  }

  function updateCellImage(cellEl, candyIndex){
    const img = cellEl.querySelector('img');
    if(img) img.src = CANDIES[candyIndex];
  }

  function cleanupSelection(){ if(selected){ selected.classList.remove('selected'); selected=null; } }

  function findAllMatches(){
    const matched = Array.from({length:ROWS}, ()=> Array(COLS).fill(false));
    for(let r=0;r<ROWS;r++){
      let c=0;
      while(c<COLS){
        const v = board[r][c];
        let len=1;
        for(let k=c+1;k<COLS;k++){
          if(board[r][k]===v) len++; else break;
        }
        if(v!==undefined && len>=3){
          for(let k=c;k<c+len;k++) matched[r][k]=true;
        }
        c += len;
      }
    }
    for(let c=0;c<COLS;c++){
      let r=0;
      while(r<ROWS){
        const v = board[r][c];
        let len=1;
        for(let k=r+1;k<ROWS;k++){
          if(board[k][c]===v) len++; else break;
        }
        if(v!==undefined && len>=3){
          for(let k=r;k<r+len;k++) matched[k][c]=true;
        }
        r += len;
      }
    }

    const matches = [];
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(matched[r][c]) matches.push([r,c]);
      }
    }
    return matches;
  }

  function processMatchesLoop(){
    const matches = findAllMatches();
    if(matches.length===0){
      animating=false;
      // after all chains done, check level completion
      checkLevelComplete();
      return;
    }
    animating=true;
    matches.forEach(([r,c])=>{
      const cell = getCellEl(r,c);
      if(cell) cell.classList.add('matching');
    });

    score += matches.length * 10;
    scoreEl.textContent = score;

    setTimeout(()=>{
      matches.forEach(([r,c])=> board[r][c] = null );
      applyGravity();
      renderBoardImages();
      setTimeout(()=> processMatchesLoop(), 220);
    }, 200);
  }

  function getCellEl(r,c){ return boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }

  function applyGravity(){
    for(let c=0;c<COLS;c++){
      let writeRow = ROWS-1;
      for(let r=ROWS-1;r>=0;r--){
        if(board[r][c] !== null && board[r][c] !== undefined){
          board[writeRow][c] = board[r][c];
          writeRow--;
        }
      }
      for(let r=writeRow;r>=0;r--){
        board[r][c] = randCandyIndex();
      }
    }
  }

  function renderBoardImages(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = getCellEl(r,c);
        if(cell){
          const img = cell.querySelector('img');
          if(img) img.src = CANDIES[ board[r][c] ];
          cell.classList.remove('matching');
        }
      }
    }
  }

  function settleInitial(){
    const m = findAllMatches();
    if(m.length>0) processMatchesLoop();
  }

  function shuffleBoard(){
    buildBoard();
    renderBoard();
    settleInitial();
  }

  // Level completion logic
  function checkLevelComplete(){
    const currentLevel = Storage.getLevel() || 1;
    const goal = getGoalForLevel(currentLevel);
    if(score >= goal){
      // unlock next level
      Storage.unlockNextLevel(currentLevel);
      // give coins reward
      Storage.addCoins(100);
      coinsEl.textContent = Storage.getCoins();

      // notify user and go to map
      setTimeout(()=>{
        alert(`बधाई! Level ${currentLevel} पूरा हुआ। Level ${currentLevel+1} अनलॉक हो गया।`);
        // go to level map and refresh
        document.getElementById('levelList') && window.renderLevels && window.renderLevels();
        // show map
        document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
        document.getElementById('levelMap').classList.add('active');
      }, 200);
    }
  }

  // initGame called from level-map when user selects level
  window.initGame = function(){
    score = 0;
    scoreEl.textContent = score;
    coinsEl.textContent = Storage.getCoins();
    const curLevel = Storage.getLevel() || 1;
    levelEl.textContent = curLevel;

    // build and render board
    buildBoard();
    renderBoard();
    settleInitial();

    // show goal to user (optional)
    const goal = getGoalForLevel(curLevel);
    // small message in console
    console.log('Game initialized at level', curLevel, 'goal', goal);
  };

  restartBtn?.addEventListener('click', ()=> initGame());
  shuffleBtn?.addEventListener('click', ()=> shuffleBoard());

  // scoreboard initial
})();

// js/game.js
(function(){
  // LEVELS config (index 0 unused)
  const LEVELS = [
    null,
    { id:1, title:'Beginner', goalScore:100, rewardCoins: 50, boardSize:8 },
    { id:2, title:'Explorer', goalScore:300, rewardCoins:120, boardSize:8 },
    { id:3, title:'Challenger', goalScore:700, rewardCoins:250, boardSize:8 }
    // add more if needed
  ];

  // fallback StorageAPI if your storage.js not present
  if(!window.StorageAPI){
    window.StorageAPI = {
      _coins: 0,
      _level: 1,
      getCoins(){ return Number(localStorage.getItem('coins')||this._coins); },
      addCoins(n){ var c=this.getCoins()+Number(n||0); localStorage.setItem('coins',c); return c; },
      getLevel(){ return Number(localStorage.getItem('level')||this._level); },
      setLevel(l){ localStorage.setItem('level', Number(l||1)); },
    };
    console.warn('StorageAPI fallback active');
  }

  // state
  let state = { level:1, score:0, boardSize:8, running:false };

  const $ = id => document.getElementById(id);

  // update coin display
  window.updateCoinDisplay = function(){
    const el = $('coins');
    if(el) el.textContent = StorageAPI.getCoins();
    const shopCoins = $('shopCoins');
    if(shopCoins) shopCoins.textContent = StorageAPI.getCoins();
  };

  // 6 candy images only
  const CANDY_IMAGES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png'];
  function randCandy(){ return 'images/' + CANDY_IMAGES[Math.floor(Math.random()*CANDY_IMAGES.length)]; }

  function updateLevelUI(){
    const lvl = state.level || 1;
    const levelInfo = LEVELS[lvl] || LEVELS[1];
    const cur = $('currentLevel'); if(cur) cur.textContent = lvl;
    state.boardSize = (levelInfo && levelInfo.boardSize) ? levelInfo.boardSize : 8;
    const board = $('game-board');
    if(board){
      board.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${state.boardSize}, 1fr)`;
    }
  }

  // create board (click-to-select & swap adjacent)
  function createBoard(){
    const board = $('game-board'); if(!board) return;
    board.innerHTML = '';
    const size = state.boardSize;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.src = randCandy();
        cell.appendChild(img);
        board.appendChild(cell);

        // click handler: select or swap with selected
        cell.addEventListener('click', () => {
          handleCellClick(cell);
        });
      }
    }
  }

  let selectedCell = null;
  function areAdjacent(a,b){
    if(!a||!b) return false;
    const ra = Number(a.dataset.r), ca = Number(a.dataset.c);
    const rb = Number(b.dataset.r), cb = Number(b.dataset.c);
    const dr = Math.abs(ra-rb), dc = Math.abs(ca-cb);
    return (dr+dc) === 1;
  }

  function handleCellClick(cell){
    if(!selectedCell){
      selectedCell = cell;
      cell.classList.add('selected-cell');
      return;
    }
    if(cell === selectedCell){
      cell.classList.remove('selected-cell');
      selectedCell = null;
      return;
    }
    // if adjacent -> swap images
    if(areAdjacent(cell, selectedCell)){
      swapTiles(cell, selectedCell);
      // deselect
      selectedCell.classList.remove('selected-cell');
      selectedCell = null;
      // after swap, you should call match-detection (not implemented here fully)
      // placeholder: add small score and continue
      addScore(10);
    } else {
      // not adjacent -> change selection
      selectedCell.classList.remove('selected-cell');
      selectedCell = cell;
      cell.classList.add('selected-cell');
    }
  }

  function swapTiles(cellA, cellB){
    const imgA = cellA.querySelector('img.tile');
    const imgB = cellB.querySelector('img.tile');
    if(!imgA || !imgB) return;
    const srcA = imgA.src, srcB = imgB.src;
    // animate using transform
    imgA.style.transform = 'scale(1.05)';
    imgB.style.transform = 'scale(1.05)';
    setTimeout(()=> {
      imgA.src = srcB;
      imgB.src = srcA;
      imgA.style.transform = '';
      imgB.style.transform = '';
    }, 120);
  }

  // score UI
  function updateScoreUI(){ const s = $('score'); if(s) s.textContent = state.score; }

  function addScore(n){
    state.score += Number(n||0);
    updateScoreUI();
    // level goal check
    const lvlInfo = LEVELS[state.level] || LEVELS[1];
    if(state.score >= (lvlInfo.goalScore || Infinity)){
      state.score = 0;
      updateScoreUI();
      try { levelCompleted(); } catch(e){ console.error('level complete error', e); }
    }
  }

  function levelCompleted(){
    const curLevel = state.level;
    const nextLevel = curLevel + 1;
    const reward = LEVELS[curLevel] ? (LEVELS[curLevel].rewardCoins||0) : 0;
    if(reward) StorageAPI.addCoins(reward);
    if(LEVELS[nextLevel]){
      StorageAPI.setLevel(nextLevel);
      state.level = nextLevel;
      updateLevelUI();
      showLevelUpModal(nextLevel, reward);
    } else {
      showLevelUpModal(curLevel, reward, true);
    }
    updateCoinDisplay();
  }

  function showLevelUpModal(level, coinsReward, last=false){
    const modal = $('levelUpModal'); if(!modal) return;
    const title = $('levelUpTitle'); const text = $('levelUpText');
    title.textContent = last ? 'All Levels Complete!' : 'Level Up!';
    text.textContent = last ? `You completed level ${level}. Reward: ${coinsReward} coins.` :
                              `Level ${level-1} complete. Level ${level} unlocked! Reward: ${coinsReward} coins.`;
    modal.style.display = 'flex';
  }

  function initLevelModalClose(){
    const btn = $('levelUpClose');
    if(btn) btn.addEventListener('click', () => {
      const modal = $('levelUpModal'); if(modal) modal.style.display = 'none';
    });
  }

  // API for UI
  window.initGame = function(){
    try {
      state.level = (StorageAPI && typeof StorageAPI.getLevel === 'function') ? StorageAPI.getLevel() : 1;
      state.score = 0;
      state.running = true;
      updateLevelUI();
      createBoard();
      updateScoreUI();
      updateCoinDisplay();
      initLevelModalClose();
      console.log('Game initialized at level', state.level);
    } catch(err){
      console.error('Error: initGame error', err);
      throw err;
    }
  };

  window.restartGame = function(){
    state.score = 0;
    createBoard();
    updateScoreUI();
    console.log('Game restarted');
  };

  window.shuffleBoard = function(){
    const imgs = document.querySelectorAll('#game-board .tile');
    imgs.forEach(img => { img.src = randCandy(); });
    console.log('Board shuffled');
  };

  window.buyFromShop = function(item){
    const coins = StorageAPI.getCoins();
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const p = prices[item] || 0;
    if(coins >= p){
      StorageAPI.addCoins(-p);
      if(item === 'shuffle') shuffleBoard();
      updateCoinDisplay();
      console.log('Bought', item);
    } else {
      console.warn('Not enough coins for', item);
    }
  };

  window.addCoins = function(n){ StorageAPI.addCoins(Number(n||0)); updateCoinDisplay(); };

  window.setGameLevel = function(l){ StorageAPI.setLevel(l); state.level = StorageAPI.getLevel(); updateLevelUI(); };

  try { console.log('Loaded: js/game.js'); } catch(e){}
})();

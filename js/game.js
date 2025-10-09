// js/game.js
// Basic game core with Level Unlock support
(function(){
  // Config: levels (increase as needed)
  const LEVELS = [
    /* index 0 unused to keep human levels 1-based */
    null,
    { id:1, title:'Beginner', goalScore: 100, rewardCoins: 50, boardSize:8 },
    { id:2, title:'Explorer', goalScore: 300, rewardCoins: 120, boardSize:8 },
    { id:3, title:'Challenger', goalScore: 700, rewardCoins: 250, boardSize:9 },
    { id:4, title:'Master', goalScore: 1500, rewardCoins: 600, boardSize:9 },
    // add more levels here...
  ];

  // state
  let state = {
    level: 1,
    score: 0,
    boardSize: 8,
    running: false
  };

  // caching DOM
  const $ = id => document.getElementById(id);

  // update coin display (hook used by storage.js)
  window.updateCoinDisplay = function(){
    const el = $('coins');
    if(el) el.textContent = StorageAPI.getCoins();
    const shopCoins = $('shopCoins');
    if(shopCoins) shopCoins.textContent = StorageAPI.getCoins();
  };

  // level UI update
  function updateLevelUI(){
    const lvl = state.level;
    const levelInfo = LEVELS[lvl] || LEVELS[1];
    const cur = $('currentLevel');
    if(cur) cur.textContent = lvl;
    // board size from level
    state.boardSize = levelInfo.boardSize || 8;
    // adjust board CSS grid if present
    const board = $('game-board');
    if(board){
      board.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${state.boardSize}, 1fr)`;
      // width/height adjust (if using vmin sizing in CSS, it's fine)
    }
  }

  // call when player reaches goal for current level
  function levelCompleted(){
    const curLevel = state.level;
    const nextLevel = curLevel + 1;
    const reward = (LEVELS[curLevel] && LEVELS[curLevel].rewardCoins) ? LEVELS[curLevel].rewardCoins : 0;

    // give coins
    if(reward) StorageAPI.addCoins(reward);
    // unlock next if exists
    if(LEVELS[nextLevel]){
      StorageAPI.setLevel(nextLevel);
      state.level = nextLevel;
      // show modal
      showLevelUpModal(nextLevel, reward);
      // update UI
      updateLevelUI();
    } else {
      // no more levels — congrats
      showLevelUpModal(curLevel, reward, true);
    }
    updateCoinDisplay();
  }

  function showLevelUpModal(level, coinsReward, last=false){
    const modal = $('levelUpModal');
    if(!modal) return;
    const title = $('levelUpTitle');
    const text = $('levelUpText');
    title.textContent = last ? '¡All Levels Complete!' : 'Level Up!';
    text.textContent = last ? `You completed level ${level}. Reward: ${coinsReward} coins.` :
                              `Level ${level-1} complete. Level ${level} unlocked! Reward: ${coinsReward} coins.`;
    modal.style.display = 'flex';
  }

  // hide modal handler
  function initLevelModalClose(){
    const btn = $('levelUpClose');
    if(btn){
      btn.addEventListener('click', () => {
        const modal = $('levelUpModal');
        if(modal) modal.style.display = 'none';
      });
    }
  }

  // small helper to create board cells and random candies
  const CANDY_IMAGES = [
    'candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png','candy7.png','candy8.png','candy9.png','candy10.png'
  ];
  function randCandy(){
    const i = Math.floor(Math.random() * CANDY_IMAGES.length);
    return `images/${CANDY_IMAGES[i]}`;
  }

  // render board
  function createBoard(){
    const board = $('game-board');
    if(!board) return;
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
        // add basic tap to select or swap (very simple)
        cell.addEventListener('click', () => {
          cell.classList.toggle('selected-cell');
        });
      }
    }
  }

  // update score UI
  function updateScoreUI(){
    const s = $('score');
    if(s) s.textContent = state.score;
  }

  // simple function to add score (call from your match logic)
  function addScore(n){
    state.score += Number(n || 0);
    updateScoreUI();
    // check level goal
    const lvlInfo = LEVELS[state.level] || LEVELS[1];
    if(state.score >= (lvlInfo.goalScore || Infinity)){
      // reset score for next level or keep accumulation? we'll reset to 0 for next level
      state.score = 0;
      updateScoreUI();
      try { levelCompleted(); } catch(e){ console.error('level complete error', e); }
    }
  }

  // Expose global functions to be used by UI/safe-ui
  window.initGame = function(){
    try {
      state.level = StorageAPI.getLevel();
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
    // simple reshuffle: reassign random candies to images
    const imgs = document.querySelectorAll('#game-board .tile');
    imgs.forEach(img => { img.src = randCandy(); });
    console.log('Board shuffled');
  };

  // buying from shop placeholder
  window.buyFromShop = function(item){
    const coins = StorageAPI.getCoins();
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const p = prices[item] || 0;
    if(coins >= p){
      StorageAPI.addCoins(-p);
      // apply effect
      if(item === 'shuffle') shuffleBoard();
      // other effects should be implemented by your game logic
      console.log('Bought', item);
      updateCoinDisplay();
    } else {
      console.warn('Not enough coins for', item);
    }
  };

  // quick debug helper to add coins from console
  window.addCoins = function(n){
    StorageAPI.addCoins(Number(n||0));
    updateCoinDisplay();
  };

  // expose a function to set level (dev)
  window.setGameLevel = function(l){
    StorageAPI.setLevel(l);
    state.level = StorageAPI.getLevel();
    updateLevelUI();
  };

  // safe load log
  try { console.log('Loaded: js/game.js'); } catch(e){}
})();

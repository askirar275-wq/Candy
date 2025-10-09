// js/game.js
// 🍬 Candy Match Game Core with Level Unlock + Safe UI Integration
(function(){
  // =============== CONFIGURATION ===============
  const LEVELS = [
    null,
    { id:1, title:'Beginner', goalScore: 100, rewardCoins: 50, boardSize:8 },
    { id:2, title:'Explorer', goalScore: 300, rewardCoins: 120, boardSize:8 },
    { id:3, title:'Challenger', goalScore: 700, rewardCoins: 250, boardSize:9 },
    { id:4, title:'Master', goalScore: 1500, rewardCoins: 600, boardSize:9 }
  ];

  const CANDY_IMAGES = [
    'candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png','candy7.png','candy8.png'
  ];

  // =============== GAME STATE ===============
  let state = {
    level: 1,
    score: 0,
    boardSize: 8,
    running: false
  };

  const $ = id => document.getElementById(id);

  // =============== UI HELPERS ===============
  window.updateCoinDisplay = function(){
    const el = $('coins');
    if(el) el.textContent = StorageAPI.getCoins();
    const shopCoins = $('shopCoins');
    if(shopCoins) shopCoins.textContent = StorageAPI.getCoins();
  };

  function updateLevelUI(){
    const lvl = state.level;
    const info = LEVELS[lvl] || LEVELS[1];
    const cur = $('currentLevel');
    if(cur) cur.textContent = lvl;

    state.boardSize = info.boardSize || 8;
    const board = $('game-board');
    if(board){
      try {
        board.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${state.boardSize}, 1fr)`;
      } catch(e){ console.warn('Board style update failed', e); }
    }
  }

  // =============== LEVEL COMPLETION ===============
  function levelCompleted(){
    const curLevel = state.level;
    const nextLevel = curLevel + 1;
    const reward = (LEVELS[curLevel] && LEVELS[curLevel].rewardCoins) ? LEVELS[curLevel].rewardCoins : 0;

    if(reward) StorageAPI.addCoins(reward);

    if(LEVELS[nextLevel]){
      StorageAPI.setLevel(nextLevel);
      state.level = nextLevel;
      showLevelUpModal(nextLevel, reward);
      updateLevelUI();
    } else {
      showLevelUpModal(curLevel, reward, true);
    }

    updateCoinDisplay();
  }

  function showLevelUpModal(level, coinsReward, last=false){
    const modal = $('levelUpModal');
    if(!modal){ console.warn('Modal missing'); return; }

    const title = $('levelUpTitle');
    const text = $('levelUpText');
    if(title) title.textContent = last ? '🎉 All Levels Complete!' : 'Level Up!';
    if(text) text.textContent = last
      ? `You completed level ${level}. Reward: ${coinsReward} coins.`
      : `Level ${level-1} complete. Level ${level} unlocked! Reward: ${coinsReward} coins.`;

    try { modal.style.display = 'flex'; } catch(e){ console.warn('Modal style error', e); }
  }

  function initLevelModalClose(){
    const btn = $('levelUpClose');
    if(btn){
      btn.addEventListener('click', () => {
        const modal = $('levelUpModal');
        if(modal) modal.style.display = 'none';
      });
    }
  }

  // =============== BOARD CREATION ===============
  function randCandy(){
    const i = Math.floor(Math.random() * CANDY_IMAGES.length);
    return `images/${CANDY_IMAGES[i]}`;
  }

  function createBoard(){
    const board = $('game-board');
    if(!board){ console.error('No game-board element'); return; }
    board.innerHTML = '';

    const size = state.boardSize;
    for(let r=0; r<size; r++){
      for(let c=0; c<size; c++){
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

        cell.addEventListener('click', () => {
          cell.classList.toggle('selected-cell');
        });
      }
    }
  }

  // =============== SCORE SYSTEM ===============
  function updateScoreUI(){
    const s = $('score');
    if(s) s.textContent = state.score;
  }

  function addScore(n){
    state.score += Number(n || 0);
    updateScoreUI();

    const info = LEVELS[state.level] || LEVELS[1];
    if(state.score >= (info.goalScore || Infinity)){
      state.score = 0;
      updateScoreUI();
      try { levelCompleted(); } catch(e){ console.error('level complete error', e); }
    }
  }

  // =============== PUBLIC API ===============
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

      console.log('🎮 Game initialized at level', state.level);
    } catch(err){
      console.error('Error: initGame error', err);
    }
  };

  window.restartGame = function(){
    state.score = 0;
    createBoard();
    updateScoreUI();
    console.log('🔁 Game restarted');
  };

  window.shuffleBoard = function(){
    const imgs = document.querySelectorAll('#game-board .tile');
    if(!imgs.length){ console.warn('No tiles found to shuffle'); return; }
    imgs.forEach(img => { img.src = randCandy(); });
    console.log('🔀 Board shuffled');
  };

  window.buyFromShop = function(item){
    const coins = StorageAPI.getCoins();
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const p = prices[item] || 0;

    if(coins >= p){
      StorageAPI.addCoins(-p);
      if(item === 'shuffle') shuffleBoard();
      console.log('🛒 Bought', item);
      updateCoinDisplay();
    } else {
      console.warn('Not enough coins for', item);
    }
  };

  window.addScore = addScore;

  window.addCoins = function(n){
    StorageAPI.addCoins(Number(n||0));
    updateCoinDisplay();
  };

  window.setGameLevel = function(l){
    StorageAPI.setLevel(l);
    state.level = StorageAPI.getLevel();
    updateLevelUI();
  };

  // =============== INIT CHECK ===============
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Game script loaded safely');
  });

})();

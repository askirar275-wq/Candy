/* js/level.js
   Level / Progress module for Candy Match
   - Compatible with an existing StorageAPI if present
   - Fallback to localStorage if not
   - Exposes window.LevelAPI with helper functions
   - Hindi comments for समझने में आसानी
*/

(function(){
  // ----- Config: levels -----
  const LEVELS = [
    null, // keep 1-based index
    { id:1, title:'Beginner', goalScore: 100, rewardCoins: 50, boardSize: 8 },
    { id:2, title:'Explorer', goalScore: 300, rewardCoins: 120, boardSize: 8 },
    { id:3, title:'Challenger', goalScore: 700, rewardCoins: 250, boardSize: 8 },
    { id:4, title:'Master', goalScore:1500, rewardCoins: 600, boardSize: 8 },
    // अगर और लेवल चाहिए तो यहाँ जोड़ें
  ];

  // ----- Storage wrapper: उपयोग करो existing StorageAPI अगर मिले, वरना fallback -----
  const HasStorageAPI = typeof window.StorageAPI === 'object' && window.StorageAPI !== null;
  const Storage = {
    // Get current saved level (default 1)
    getLevel(){
      if(HasStorageAPI && typeof window.StorageAPI.getLevel === 'function') {
        try { return Number(window.StorageAPI.getLevel()) || 1; } catch(e){ console.warn('StorageAPI.getLevel error', e); }
      }
      return Number(localStorage.getItem('candy_level') || 1);
    },
    setLevel(l){
      if(HasStorageAPI && typeof window.StorageAPI.setLevel === 'function'){
        try { window.StorageAPI.setLevel(Number(l)); return; } catch(e){ console.warn('StorageAPI.setLevel error', e); }
      }
      localStorage.setItem('candy_level', String(Number(l)));
    },
    getCoins(){
      if(HasStorageAPI && typeof window.StorageAPI.getCoins === 'function'){
        try { return Number(window.StorageAPI.getCoins()) || 0; } catch(e){ console.warn('StorageAPI.getCoins error', e); }
      }
      return Number(localStorage.getItem('candy_coins') || 0);
    },
    addCoins(n){
      if(HasStorageAPI && typeof window.StorageAPI.addCoins === 'function'){
        try { return window.StorageAPI.addCoins(Number(n)); } catch(e){ console.warn('StorageAPI.addCoins error', e); }
      }
      const cur = Number(localStorage.getItem('candy_coins') || 0);
      const next = cur + Number(n || 0);
      localStorage.setItem('candy_coins', String(Math.max(0, next)));
      return next;
    }
  };

  // ----- Internal state -----
  const state = {
    level: Storage.getLevel(),
    score: 0
  };

  // ----- Helpers to find DOM nodes (fail-safe) -----
  function $id(id){ return document.getElementById(id) || null; }
  function safeText(id, txt){
    const el = $id(id);
    if(el) el.textContent = String(txt);
  }

  // ----- Update level badge and UI -----
  function updateLevelUI(){
    safeText('currentLevel', state.level);
    const badge = $id('levelBadge');
    if(badge){
      badge.style.display = ''; // visible
      badge.innerHTML = `Level: <strong id="currentLevel">${state.level}</strong>`;
    }
    // If game.js expects board size per level, update CSS grid here (if board exists)
    const board = $id('game-board');
    const info = LEVELS[state.level] || LEVELS[1];
    if(board && info){
      board.style.gridTemplateColumns = `repeat(${info.boardSize || 8}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${info.boardSize || 8}, 1fr)`;
    }
  }

  // ----- Show level-up modal -----
  function showLevelUpModal(nextLevel, reward, isLast){
    const modal = $id('levelUpModal');
    if(!modal){
      // create lightweight modal if not present
      const built = document.createElement('div');
      built.id = 'levelUpModal';
      built.style.position = 'fixed';
      built.style.inset = '0';
      built.style.display = 'flex';
      built.style.alignItems = 'center';
      built.style.justifyContent = 'center';
      built.style.background = 'rgba(0,0,0,0.45)';
      built.style.zIndex = 9999;
      built.innerHTML = `
        <div style="background:#fff;padding:18px;border-radius:12px;max-width:420px;width:92%;text-align:center;">
          <h2 id="levelUpTitle">${isLast ? 'All Levels Complete!' : 'Level Up!'}</h2>
          <p id="levelUpText">Level unlocked.</p>
          <div style="margin-top:12px;"><button id="levelUpClose">Continue</button></div>
        </div>
      `;
      document.body.appendChild(built);
    }
    safeText('levelUpTitle', isLast ? 'All Levels Complete!' : 'Level Up!');
    safeText('levelUpText', isLast
      ? `तुमने लेवल ${nextLevel - 1} पूरा किया। पुरस्कार: ${reward} कॉइन्स।`
      : `लेवल ${nextLevel - 1} पूरा हुआ। लेवल ${nextLevel} अनलॉक हुआ! पुरस्कार: ${reward} कॉइन्स।`);
    const mm = $id('levelUpModal') || built;
    if(mm) mm.style.display = 'flex';

    // close button hookup
    const close = $id('levelUpClose');
    if(close){
      close.onclick = ()=>{ const m = $id('levelUpModal'); if(m) m.style.display='none'; };
    }
  }

  // ----- When level completes: reward + unlock next -----
  function levelCompleted(){
    const cur = state.level;
    const info = LEVELS[cur] || LEVELS[1];
    const reward = (info && info.rewardCoins) ? info.rewardCoins : 0;

    // give coins
    if(reward) Storage.addCoins(reward);

    // unlock next
    const next = cur + 1;
    if(LEVELS[next]){
      Storage.setLevel(next);
      state.level = next;
      updateLevelUI();
      showLevelUpModal(next, reward, false);
    } else {
      // last level
      showLevelUpModal(cur, reward, true);
    }

    // update coins UI if present (some pages use updateCoinDisplay from game/StorageAPI)
    if(typeof window.updateCoinDisplay === 'function') {
      try { window.updateCoinDisplay(); } catch(e){ /* ignore */ }
    } else {
      // fallback update DOM elements
      const shopCoins = $id('shopCoins');
      const coins = $id('coins');
      const curCoins = Storage.getCoins();
      if(shopCoins) shopCoins.textContent = curCoins;
      if(coins) coins.textContent = curCoins;
    }
  }

  // ----- Public API used by game.js -----
  function reportScoreAndCheck(scoreDelta){
    // जब गेम में स्कोर बढ़े, इसे कॉल करें
    state.score += Number(scoreDelta || 0);
    // Check against current level goal
    const levelInfo = LEVELS[state.level] || LEVELS[1];
    if(levelInfo && state.score >= levelInfo.goalScore){
      // reset score for next level (या आप accumulation रखना चाहें तो अलग करें)
      state.score = 0;
      try { levelCompleted(); } catch(e){ console.error('levelCompleted error', e); }
    }
    // update small UI element if present
    const scoreEl = $id('score');
    if(scoreEl) scoreEl.textContent = state.score;
  }

  // ----- Expose functions -----
  window.LevelAPI = {
    getLevel(){ return state.level; },
    setLevel(l){
      Storage.setLevel(l);
      state.level = Number(l) || 1;
      updateLevelUI();
    },
    getCoins(){ return Storage.getCoins(); },
    addCoins(n){ return Storage.addCoins(n); },
    reportScoreAndCheck, // call from game when score increases
    updateUI: updateLevelUI,
    showLevelUpModal
  };

  // ----- Init on load -----
  document.addEventListener('DOMContentLoaded', ()=>{
    // adopt stored level
    state.level = Storage.getLevel() || 1;
    state.score = 0;
    updateLevelUI();

    // hook modal close button safe (if exists)
    const close = $id('levelUpClose');
    if(close) close.addEventListener('click', ()=> { const m=$id('levelUpModal'); if(m) m.style.display='none'; });

    // debug log
    try { console.log('Level module loaded. Current level:', state.level); } catch(e){}
  });

})();

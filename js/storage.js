// js/storage.js
// Local storage system for coins and unlocked levels
const Storage = (function(){
  const KEY = 'candy_match_v1';
  const defaultState = { coins: 0, unlockedLevels: [1] };

  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : defaultState;
    } catch(e){
      console.warn('Storage load error:', e);
      return defaultState;
    }
  }

  function save(state){
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch(e){
      console.warn('Storage save error:', e);
    }
  }

  const state = load();

  return {
    getCoins(){ return state.coins || 0; },
    addCoins(n){ state.coins = (state.coins || 0) + n; save(state); },
    spendCoins(n){ state.coins = Math.max(0, (state.coins || 0) - n); save(state); },
    isUnlocked(l){ return (state.unlockedLevels || []).includes(l); },
    unlock(l){
      state.unlockedLevels = state.unlockedLevels || [];
      if(!state.unlockedLevels.includes(l)){
        state.unlockedLevels.push(l);
        save(state);
      }
    },
    getState(){ return JSON.parse(JSON.stringify(state)); }
  };
})();
console.log('✅ Loaded: js/storage.js');

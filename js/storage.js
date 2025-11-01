// js/storage.js
// Storage with guaranteed Level 1 unlocked
const Storage = (function(){
  const KEY = 'candy_match_v1';
  const defaultState = { coins: 0, unlockedLevels: [1] };

  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      if(!raw) {
        localStorage.setItem(KEY, JSON.stringify(defaultState));
        return JSON.parse(JSON.stringify(defaultState));
      }
      const parsed = JSON.parse(raw);
      // safety: ensure unlockedLevels exists and contains 1
      if(!Array.isArray(parsed.unlockedLevels)) parsed.unlockedLevels = [1];
      if(!parsed.unlockedLevels.includes(1)) parsed.unlockedLevels.unshift(1);
      return parsed;
    } catch(e){
      console.warn('Storage load error:', e);
      localStorage.setItem(KEY, JSON.stringify(defaultState));
      return JSON.parse(JSON.stringify(defaultState));
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
    getState(){ return JSON.parse(JSON.stringify(state)); },
    reset(){ // debug helper
      localStorage.setItem(KEY, JSON.stringify(defaultState));
    }
  };
})();
console.log('✅ Loaded: js/storage.js (ensures Level 1 unlocked)');

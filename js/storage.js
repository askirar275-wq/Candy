// js/storage.js
// Simple wrapper for localStorage: coins, level
(function(){
  const KEY_COINS = 'candy_coins_v1';
  const KEY_LEVEL = 'candy_level_v1';

  function read(key, fallback){
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch(e){ return fallback; }
  }
  function write(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ return false; }
  }

  // coins API
  window.StorageAPI = {
    getCoins(){
      return read(KEY_COINS, 0);
    },
    setCoins(n){
      write(KEY_COINS, Number(n) || 0);
      // notify (if someone listens)
      if(typeof window.updateCoinDisplay === 'function') window.updateCoinDisplay();
      return StorageAPI.getCoins();
    },
    addCoins(n){
      const cur = StorageAPI.getCoins();
      const next = cur + Number(n || 0);
      StorageAPI.setCoins(next);
      return next;
    },

    // level API
    getLevel(){
      return read(KEY_LEVEL, 1);
    },
    setLevel(l){
      const L = Math.max(1, Number(l) || 1);
      write(KEY_LEVEL, L);
      return StorageAPI.getLevel();
    },
    // reset (dev helper)
    _resetAll(){
      write(KEY_COINS, 0);
      write(KEY_LEVEL, 1);
    }
  };

  // quick console log on load
  try { console.log('Loaded: js/storage.js'); } catch(e){}
})();

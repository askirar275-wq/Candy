// js/storage.js
window.StorageAPI = (function(){
  const KEY_LEVEL = 'candy_level_v1';
  const KEY_COINS = 'candy_coins_v1';
  return {
    getLevel: function(){ const v = localStorage.getItem(KEY_LEVEL); return v ? Number(v) : 1; },
    setLevel: function(l){ localStorage.setItem(KEY_LEVEL, Number(l)); },
    getCoins: function(){ const v = localStorage.getItem(KEY_COINS); return v ? Number(v) : 0; },
    addCoins: function(n){ const cur = Number(localStorage.getItem(KEY_COINS) || 0); localStorage.setItem(KEY_COINS, cur + Number(n)); }
  };
})();
console.log('Loaded: js/storage.js');

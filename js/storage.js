// js/storage.js
// Simple Storage API wrapper
window.StorageAPI = (function(){
  const KEY_LEVEL = 'candy_level';
  const KEY_COINS = 'candy_coins';
  function getLevel(){ return Number(localStorage.getItem(KEY_LEVEL) || 1); }
  function setLevel(n){ localStorage.setItem(KEY_LEVEL, Number(n)); }
  function getCoins(){ return Number(localStorage.getItem(KEY_COINS) || 0); }
  function addCoins(n){ localStorage.setItem(KEY_COINS, getCoins() + Number(n || 0)); }
  return { getLevel, setLevel, getCoins, addCoins };
})();
console.log('Loaded: js/storage.js');

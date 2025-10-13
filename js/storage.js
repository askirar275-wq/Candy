// small StorageAPI wrapper
window.StorageAPI = (function(){
  const KEY_COINS = 'candy_coins';
  const KEY_LEVEL = 'candy_level';
  function getCoins(){ return Number(localStorage.getItem(KEY_COINS) || 0); }
  function addCoins(n){ localStorage.setItem(KEY_COINS, getCoins()+Number(n||0)); }
  function setLevel(l){ localStorage.setItem(KEY_LEVEL, Number(l||1)); }
  function getLevel(){ return Number(localStorage.getItem(KEY_LEVEL) || 1); }
  return { getCoins, addCoins, setLevel, getLevel };
})();
console.log('Loaded: js/storage.js');

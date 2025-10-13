// js/storage.js
window.StorageAPI = (function(){
  var KEY_COINS = 'candy_coins_v1';
  var KEY_LEVEL = 'candy_level_v1';

  function read(k, def){ try{ var v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); }catch(e){ return def; } }
  function write(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ console.warn('storage write failed',e); } }

  var api = {
    getCoins: function(){ return Number(read(KEY_COINS, 0) || 0); },
    setCoins: function(n){ write(KEY_COINS, Number(n||0)); },
    addCoins: function(n){ var c = api.getCoins() + Number(n||0); if(c<0) c=0; write(KEY_COINS, c); return c; },
    getLevel: function(){ return Number(read(KEY_LEVEL, 1) || 1); },
    setLevel: function(l){ write(KEY_LEVEL, Math.max(1,Number(l||1))); }
  };

  // init defaults
  if(read(KEY_COINS, null) === null) write(KEY_COINS, 0);
  if(read(KEY_LEVEL, null) === null) write(KEY_LEVEL, 1);

  console.log('Loaded: js/storage.js');
  return api;
})();

// tiny storage API using localStorage
window.StorageAPI = (function(){
  const KEY_COINS = 'cm_coins_v1';
  const KEY_LEVEL = 'cm_level_v1';
  function _get(k,def){ try{ const v=localStorage.getItem(k); return v!==null?JSON.parse(v):def;}catch(e){return def} }
  function _set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){console.warn('storage set fail',e);} }
  return {
    getCoins:function(){return _get(KEY_COINS,0)},
    addCoins:function(n){ const c=this.getCoins()+Number(n||0); _set(KEY_COINS,c); return c },
    setLevel:function(l){ _set(KEY_LEVEL,Number(l||1)); },
    getLevel:function(){return _get(KEY_LEVEL,1) }
  };
})();

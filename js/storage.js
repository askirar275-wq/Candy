/* storage.js
   Simple Storage API — coins, level, inventory saved in localStorage.
   Provides StorageAPI global object used by other modules.
*/
window.StorageAPI = (function(){
  const KEY = 'candy_v2_save_v1';
  function _load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return { coins:250, level:1, inv:{bomb:0,shuffle:0,moves:0,rainbow:0} };
      return JSON.parse(raw);
    }catch(e){ console.warn('Storage load error', e); return { coins:250, level:1, inv:{bomb:0,shuffle:0,moves:0,rainbow:0} }; }
  }
  function _save(state){
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){ console.warn('Storage save error', e); }
  }

  let state = _load();

  return {
    getCoins(){ return Number(state.coins || 0); },
    addCoins(n){
      state.coins = Number(state.coins || 0) + Number(n||0);
      if(state.coins < 0) state.coins = 0;
      _save(state);
      return state.coins;
    },
    getLevel(){ return Number(state.level || 1); },
    setLevel(l){ state.level = Number(l||1); _save(state); return state.level; },
    getInv(){ return state.inv || {}; },
    addInv(item, qty=1){
      state.inv = state.inv || {};
      state.inv[item] = (state.inv[item]||0) + Number(qty||1);
      _save(state);
      return state.inv[item];
    },
    useInv(item, qty=1){
      state.inv = state.inv || {};
      state.inv[item] = Math.max(0, (state.inv[item]||0) - Number(qty||1));
      _save(state);
      return state.inv[item];
    },
    export(){ return JSON.parse(JSON.stringify(state)); },
    import(raw){ try{ state = raw; _save(state); }catch(e){console.warn(e);} }
  };
})();

// storage.js — small wrapper for coins / level (localStorage)
window.StorageAPI = (function(){
  const KEY = 'candy_v2_save';
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || '{}'); }catch(e){return {};} }
  function save(obj){ localStorage.setItem(KEY, JSON.stringify(obj)); }

  let store = load();
  if(!store.coins) store.coins = 250;
  if(!store.level) store.level = 1;
  save(store);

  return {
    getCoins: ()=> (load().coins || 0),
    addCoins: (n)=> { const s = load(); s.coins = (s.coins || 0) + Number(n||0); if(s.coins<0) s.coins=0; save(s); },
    getLevel: ()=> (load().level || 1),
    setLevel: (l)=> { const s = load(); s.level = l; save(s); },
    saveState: (data)=> { const s = load(); s.state = data; save(s); },
    loadState: ()=> (load().state || null)
  };
})();

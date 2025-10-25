// छोटा localStorage wrapper
window.Store = {
  get: function(k, def){
    try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch(e){ return def; }
  },
  set: function(k,v){
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ console.warn('store.set failed', e); }
  }
};

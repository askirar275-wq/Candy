// js/storage.js
const Store = {
  key: 'candy_progress_v1',
  load(){
    try { return JSON.parse(localStorage.getItem(this.key) || '{}'); }
    catch(e){ return {}; }
  },
  save(obj){
    localStorage.setItem(this.key, JSON.stringify(obj));
  },
  clear(){ localStorage.removeItem(this.key); }
};

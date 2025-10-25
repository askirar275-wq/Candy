// storage.js
const Storage = {
  key: 'candy_progress_v1',
  load() {
    try {
      const s = localStorage.getItem(this.key);
      return s ? JSON.parse(s) : {};
    } catch(e){ return {}; }
  },
  save(data){
    try{ localStorage.setItem(this.key, JSON.stringify(data)); }catch(e){}
  },
  clear(){
    try{ localStorage.removeItem(this.key); }catch(e){}
  }
};

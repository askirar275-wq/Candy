// small helper for level/coins persistence
const Storage = {
  get(key, def){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch(e){ return def; }
  },
  set(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }
};

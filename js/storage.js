// simple storage wrapper
const Storage = {
  get(key, fallback){
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  },
  set(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch(e){ console.warn('storage set failed', e); }
  }
};

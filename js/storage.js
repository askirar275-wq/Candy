// simple storage helpers for prefs and unlocked level
const Storage = {
  get(key, fallback=null){ try{ const v = localStorage.getItem(key); return v===null?fallback:JSON.parse(v); }catch(e){return fallback}},
  set(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} },
  clear(){ localStorage.clear() }
};

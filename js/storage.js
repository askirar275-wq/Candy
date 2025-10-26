// small wrapper for localStorage usage (levels, coins)
window.AppStorage = {
  get(key, def){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):def; }catch(e){return def;} },
  set(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch(e){} }
};

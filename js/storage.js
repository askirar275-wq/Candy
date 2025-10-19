// js/storage.js
const Storage = {
  get(key, def){ try{const v=localStorage.getItem(key); return v?JSON.parse(v):def}catch(e){console.error('storage.get',e);return def} },
  set(key,val){ try{localStorage.setItem(key,JSON.stringify(val))}catch(e){console.error('storage.set',e)} }
};

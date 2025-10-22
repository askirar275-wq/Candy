/* js/storage.js */
const Storage = (function(){
  const KEY = 'candy_unlocked_v1';
  function getUnlocked(){
    try {
      const raw = localStorage.getItem(KEY);
      if(!raw) return [1];
      return JSON.parse(raw);
    } catch(e){ return [1]; }
  }
  function setUnlocked(arr){
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch(e){}
  }
  function clearProgress(){ try{ localStorage.removeItem(KEY); }catch(e){} }
  // export
  return { getUnlocked, setUnlocked, clearProgress };
})();
window.Storage = Storage;

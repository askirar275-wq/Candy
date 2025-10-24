window.CMStorage = (function(){
  const KEY = 'cm_unlocked';
  return {
    getUnlocked(){
      try { return JSON.parse(localStorage.getItem(KEY) || 'null') || [1]; } catch(e){ return [1]; }
    },
    unlock(n){
      try{
        const arr = this.getUnlocked();
        if(arr.indexOf(n)===-1){ arr.push(n); localStorage.setItem(KEY, JSON.stringify(arr)); }
      }catch(e){}
    },
    reset(){
      try{ localStorage.removeItem(KEY); }catch(e){}
    }
  };
})();

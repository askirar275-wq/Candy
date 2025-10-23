// simple storage helpers
window.CMStorage = {
  getProgress(){
    try { return JSON.parse(localStorage.getItem('cm_progress')||'{}'); } catch(e){return {};}
  },
  saveProgress(obj){
    localStorage.setItem('cm_progress', JSON.stringify(obj||{}));
  },
  getUnlocked(){
    try { return JSON.parse(localStorage.getItem('cm_unlocked')||'[1]'); } catch(e){ return [1]; }
  },
  unlock(level){
    const arr = this.getUnlocked();
    if(!arr.includes(level)) arr.push(level);
    arr.sort((a,b)=>a-b);
    localStorage.setItem('cm_unlocked', JSON.stringify(arr));
  }
};

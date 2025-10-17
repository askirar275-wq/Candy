// Simple storage helpers
const Storage = {
  getCoins(){ return Number(localStorage.getItem('cm_coins') || 0); },
  addCoins(n){ const v = Storage.getCoins()+Number(n||0); localStorage.setItem('cm_coins', v); return v; },
  // highest unlocked level
  getUnlockedLevel(){ return Number(localStorage.getItem('cm_unlocked') || 1); },
  unlockNextLevel(current){
    const cur = Number(current || Storage.getUnlockedLevel());
    const unlocked = Storage.getUnlockedLevel();
    if(cur+1 > unlocked){
      localStorage.setItem('cm_unlocked', cur+1);
    }
  },
  setLevel(v){ localStorage.setItem('cm_level', Number(v||1)); },
  getLevel(){ return Number(localStorage.getItem('cm_level') || 1); }
};

// js/storage.js
const Storage = {
  getProgress: () => {
    try { return JSON.parse(localStorage.getItem('progress') || '{"unlocked":[1]}'); }
    catch(e){ return {unlocked:[1]}; }
  },
  saveProgress: (d) => localStorage.setItem('progress', JSON.stringify(d)),
  unlock: (level) => {
    const data = Storage.getProgress();
    if (!data.unlocked.includes(level)) data.unlocked.push(level);
    Storage.saveProgress(data);
  },
  reset: () => { localStorage.removeItem('progress'); }
};

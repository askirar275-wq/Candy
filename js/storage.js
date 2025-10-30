// js/storage.js
// small wrapper around localStorage used by other modules

const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Storage.get error', e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage.set error', e);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// initialize defaults
(function initStorageDefaults(){
  if (Storage.get('candy_state') === null) {
    Storage.set('candy_state', {
      coins: 0,
      unlockedLevels: [1], // level 1 unlocked
      bestScores: {}
    });
  }
})();

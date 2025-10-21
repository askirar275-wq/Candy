const Storage = {
  getProgress: () => JSON.parse(localStorage.getItem('progress') || '{"unlocked":[1]}'),
  saveProgress: (data) => localStorage.setItem('progress', JSON.stringify(data)),
  unlock: (level) => {
    const data = Storage.getProgress();
    if (!data.unlocked.includes(level)) data.unlocked.push(level);
    Storage.saveProgress(data);
  },
  reset: () => localStorage.removeItem('progress')
};

window.StorageAPI = {
  getCoins() { return Number(localStorage.getItem("coins") || 0); },
  addCoins(n) {
    const newCoins = this.getCoins() + Number(n || 0);
    localStorage.setItem("coins", newCoins);
    return newCoins;
  },
  getLevel() { return Number(localStorage.getItem("level") || 1); },
  setLevel(lvl) { localStorage.setItem("level", lvl); },
  reset() { localStorage.clear(); }
};

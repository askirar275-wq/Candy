console.log("storage.js loaded");

window.StorageAPI = {
  getCoins() {
    return Number(localStorage.getItem("coins") || 0);
  },
  addCoins(amount) {
    let coins = this.getCoins() + Number(amount || 0);
    if (coins < 0) coins = 0;
    localStorage.setItem("coins", coins);
    return coins;
  },
  getLevel() {
    return Number(localStorage.getItem("level") || 1);
  },
  setLevel(level) {
    localStorage.setItem("level", level);
  },
  reset() {
    localStorage.clear();
  },
};

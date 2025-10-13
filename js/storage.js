// storage.js — simple coin & level storage system
console.log("Loaded: storage.js ✅");

window.StorageAPI = {
  getCoins() {
    return Number(localStorage.getItem("coins") || 0);
  },
  addCoins(amount) {
    let coins = this.getCoins() + amount;
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
    localStorage.removeItem("coins");
    localStorage.removeItem("level");
  },
};

// js/storage.js
window.StorageAPI = {
  getCoins() { return parseInt(localStorage.getItem("coins") || "0"); },
  addCoins(v) {
    const newVal = this.getCoins() + v;
    localStorage.setItem("coins", newVal);
    return newVal;
  },
  getLevel() { return parseInt(localStorage.getItem("level") || "1"); },
  setLevel(l) { localStorage.setItem("level", l); }
};

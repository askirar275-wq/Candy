// Local Storage API
window.StorageAPI = {
  getLevel() {
    return parseInt(localStorage.getItem("level") || "1");
  },
  setLevel(lvl) {
    localStorage.setItem("level", lvl);
  },
  getCoins() {
    return parseInt(localStorage.getItem("coins") || "0");
  },
  addCoins(c) {
    const total = this.getCoins() + c;
    localStorage.setItem("coins", total);
    return total;
  }
};
console.log("Loaded: storage.js");

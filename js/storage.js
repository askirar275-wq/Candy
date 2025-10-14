// Local Storage system
const StorageAPI = {
  data: { coins: 0, level: 1 },

  load() {
    const d = localStorage.getItem("CandyData");
    if (d) this.data = JSON.parse(d);
  },

  save() {
    localStorage.setItem("CandyData", JSON.stringify(this.data));
  },

  getCoins() { return this.data.coins; },
  addCoins(n) { this.data.coins += n; this.save(); },

  getLevel() { return this.data.level; },
  setLevel(n) { this.data.level = n; this.save(); }
};

StorageAPI.load();

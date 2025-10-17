// Storage manager
const Storage = {
  getCoins: () => +localStorage.getItem("coins") || 0,
  setCoins: v => localStorage.setItem("coins", v),
  getLevel: () => +localStorage.getItem("level") || 1,
  setLevel: v => localStorage.setItem("level", v)
};

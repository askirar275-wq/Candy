window.StorageAPI = {
  getCoins(){ return Number(localStorage.getItem('candy_coins') || 0); },
  addCoins(n){ const c = this.getCoins() + Number(n||0); localStorage.setItem('candy_coins', c); return c; },
  getLevel(){ return Number(localStorage.getItem('candy_level') || 1); },
  setLevel(l){ localStorage.setItem('candy_level', Number(l)); },
  getPlayLevel(){ return Number(localStorage.getItem('candy_play') || this.getLevel() || 1); },
  setPlayLevel(l){ localStorage.setItem('candy_play', Number(l)); },
  reset(){ localStorage.clear(); alert('Progress reset!'); }
};

// storage.js
console.log('Loaded: storage.js');
window.StorageAPI = {
  getCoins(){
    return Number(localStorage.getItem('cm_coins') || 0);
  },
  addCoins(n){
    let c = this.getCoins() + Number(n||0);
    if(c<0) c=0;
    localStorage.setItem('cm_coins', c);
    return c;
  },
  getLevel(){
    return Number(localStorage.getItem('cm_level') || 1);
  },
  setLevel(l){
    localStorage.setItem('cm_level', Number(l||1));
  },
  reset(){
    localStorage.removeItem('cm_coins');
    localStorage.removeItem('cm_level');
    localStorage.removeItem('cm_playLevel');
    console.log('Storage reset');
  },
  setPlayLevel(l){
    localStorage.setItem('cm_playLevel', Number(l||1));
  },
  getPlayLevel(){
    return Number(localStorage.getItem('cm_playLevel') || this.getLevel() || 1);
  }
};

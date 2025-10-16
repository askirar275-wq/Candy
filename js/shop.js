// shop.js — simple buy logic using StorageAPI
(function(){
  function price(item){
    return {bomb:200, shuffle:100, moves:80, rainbow:350}[item] || 0;
  }
  window.buyFromShop = function(item){
    if(!window.StorageAPI) return console.warn('StorageAPI missing');
    const p = price(item);
    if(window.StorageAPI.getCoins() < p){ alert('कॉइन्स कम हैं'); return; }
    window.StorageAPI.addCoins(-p);
    // simple application: shuffle if shuffle bought, add moves if moves bought
    if(item === 'shuffle') { if(typeof shuffleBoard === 'function') shuffleBoard(); }
    if(item === 'moves') { if(typeof addMoves === 'function') addMoves(10); else alert('+10 moves purchased'); }
    if(item === 'bomb') { alert('Bomb purchased (demo). Use from inventory)'); }
    if(item === 'rainbow') { alert('Rainbow purchased (demo).'); }
    // update coins display
    const shopCoins = document.getElementById('shopCoins');
    if(shopCoins) shopCoins.textContent = window.StorageAPI.getCoins();
    const coins = document.getElementById('coins');
    if(coins) coins.textContent = window.StorageAPI.getCoins();
  };

  // hook buy buttons
  document.addEventListener('DOMContentLoaded', function(){
    ['buyBomb','buyShuffle','buyMoves','buyRainbow'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.addEventListener('click', ()=> {
        const key = id.replace('buy','').toLowerCase();
        buyFromShop(key);
      });
    });
  });
})();

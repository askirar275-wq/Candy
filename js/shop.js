/* shop.js
   Shop behavior: buyItem(item) which uses StorageAPI and triggers in-game effects.
*/
(function(){
  function buyItem(item){
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const price = prices[item] || 0;
    const coins = StorageAPI.getCoins();
    if(coins < price){
      alert('कॉइन्स कम हैं — पहले गेम खेलकर कमाएँ।');
      return false;
    }
    StorageAPI.addCoins(-price);
    StorageAPI.addInv(item, 1);
    refreshShopUI();
    // immediate apply for some items:
    if(item === 'shuffle' && typeof window.shuffleBoard === 'function'){
      window.shuffleBoard();
    } else if(item === 'moves'){
      // award extra moves via game API if exists
      if(typeof window.addMoves === 'function') window.addMoves(5);
      else alert('Buy successful — Extra moves added in inventory.');
    }
    return true;
  }

  function refreshShopUI(){
    const coinsEl = document.getElementById('shopCoins');
    if(coinsEl) coinsEl.textContent = StorageAPI.getCoins();
    const coinsTop = document.getElementById('coins');
    if(coinsTop) coinsTop.textContent = StorageAPI.getCoins();
  }

  // hook buttons if present
  document.addEventListener('DOMContentLoaded', ()=>{
    const map = { buyBomb:'bomb', buyShuffle:'shuffle', buyMoves:'moves', buyRainbow:'rainbow' };
    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if(el) el.addEventListener('click', ()=> buyItem(map[id]));
    });
    const open = document.getElementById('openShopBtn') || document.getElementById('shopBtn');
    if(open) open.addEventListener('click', ()=> {
      const modal = document.getElementById('shopModal'); if(modal) modal.style.display = 'flex';
    });
    const close = document.getElementById('closeShop');
    if(close) close.addEventListener('click', ()=> {
      const modal = document.getElementById('shopModal'); if(modal) modal.style.display = 'none';
    });
    refreshShopUI();
  });

  // expose small API
  window.buyFromShop = buyItem;
  window.refreshShopUI = refreshShopUI;
})();

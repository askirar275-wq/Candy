// js/shop.js
console.log('Loaded: js/shop.js (stub)');
window.buyFromShop = function(item){
  if(item==='shuffle') { if(typeof shuffleBoard==='function') shuffleBoard(); }
  // simple demo pricing
  const prices = { bomb:200, shuffle:100, moves:80 };
  const p = prices[item] || 0;
  if(StorageAPI.getCoins() >= p){ StorageAPI.addCoins(-p); alert('Bought ' + item); window.updateCoinDisplay && window.updateCoinDisplay(); }
  else alert('Not enough coins');
};

// js/inventory.js (clean stub) 
// Save this file as UTF-8 without BOM. No HTML or stray characters.

(function(){
  'use strict';
  console.log('Loaded: js/inventory.js (stub)');

  // Simple Inventory API that uses StorageAPI (storage.js)
  window.Inventory = {
    getCoins: function(){
      try { return Number(window.StorageAPI ? window.StorageAPI.getCoins() : 0); }
      catch(e){ return 0; }
    },
    addCoins: function(n){
      try { if(window.StorageAPI) window.StorageAPI.addCoins(Number(n||0)); }
      catch(e){ console.warn('Inventory.addCoins error', e); }
    },
    buyItem: function(item, price){
      // returns true if bought
      try {
        var coins = this.getCoins();
        price = Number(price||0);
        if(coins >= price){
          this.addCoins(-price);
          return true;
        }
        return false;
      } catch(e){ console.warn('Inventory.buyItem error', e); return false; }
    }
  };

})();

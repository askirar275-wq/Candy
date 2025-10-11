// js/safe-ui.js
(function(){
  // prevent double-init
  if (window._safeUIInitialized) return;
  window._safeUIInitialized = true;

  function $id(id){ return document.getElementById(id); }
  function safeAdd(id, evt, h){
    var el = $id(id);
    if(!el){
      console.warn('safe-ui: missing #' + id);
      return;
    }
    el.addEventListener(evt, h);
  }

  document.addEventListener('DOMContentLoaded', function(){
    console.log('✅ Safe UI loaded');

    safeAdd('startBtn','click', function(){
      var hs = $id('home-screen'), gs = $id('game-screen');
      if(hs) hs.classList.remove('active');
      if(gs) gs.classList.add('active');

      if(typeof initGame === 'function'){
        try { initGame(); }
        catch(err){ console.error('Error: initGame error', err); }
      } else {
        console.warn('initGame not found');
      }
    });

    safeAdd('backBtn','click', function(){
      var hs = $id('home-screen'), gs = $id('game-screen');
      if(gs) gs.classList.remove('active');
      if(hs) hs.classList.add('active');
    });

    // shop open/close
    function openShop(){ var m=$id('shopModal'); if(m){ m.style.display='flex'; m.setAttribute('aria-hidden','false'); } else console.warn('shopModal not found'); }
    safeAdd('shopBtn','click', openShop);
    safeAdd('openShopBtn','click', openShop);
    safeAdd('closeShop','click', function(){ var m=$id('shopModal'); if(m){ m.style.display='none'; m.setAttribute('aria-hidden','true'); } });

    // restart/shuffle hooks
    safeAdd('restartBtn','click', function(){ if(typeof restartGame==='function') restartGame(); else console.warn('restartGame missing'); });
    safeAdd('shuffleBtn','click', function(){ if(typeof shuffleBoard==='function') shuffleBoard(); else console.warn('shuffleBoard missing'); });

    // shop buys placeholders
    safeAdd('buyBomb','click', function(){ if(typeof buyFromShop==='function') buyFromShop('bomb'); else console.warn('buyFromShop missing'); });
    safeAdd('buyShuffle','click', function(){ if(typeof buyFromShop==='function') buyFromShop('shuffle'); else console.warn('buyFromShop missing'); });
    safeAdd('buyMoves','click', function(){ if(typeof buyFromShop==='function') buyFromShop('moves'); else console.warn('buyFromShop missing'); });
    safeAdd('buyRainbow','click', function(){ if(typeof buyFromShop==='function') buyFromShop('rainbow'); else console.warn('buyFromShop missing'); });

    // level modal close (if modal exists before game loads)
    safeAdd('levelUpClose','click', function(){ var m=$id('levelUpModal'); if(m) m.style.display='none'; });

    // quick debug: show stored level/coins in console
    try {
      if(window.StorageAPI && typeof StorageAPI.getLevel==='function'){
        console.log('Stored level:', StorageAPI.getLevel());
      }
    } catch(e){}
  });
})();

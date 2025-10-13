// js/safe-ui.js
(function(){
  function $id(id){ return document.getElementById(id); }
  function safeAdd(id, evt, h){ var el=$id(id); if(!el){ console.warn('safe-ui: missing #' + id); return; } el.addEventListener(evt,h); }

  document.addEventListener('DOMContentLoaded', function(){
    console.log('✅ Safe UI loaded');

    safeAdd('startBtn','click', function(){
      var hs=$id('home-screen'), ms=$id('map-screen');
      if(hs) hs.classList.remove('active');
      if(ms) ms.classList.add('active');
      // show map first (user asked map before game). map.js will render
      if(typeof renderLevelMap === 'function') renderLevelMap();
      else console.warn('renderLevelMap not found');
    });

    safeAdd('mapBtn','click', function(){
      var hs=$id('home-screen'), ms=$id('map-screen');
      if(hs) hs.classList.remove('active');
      if(ms) ms.classList.add('active');
      if(typeof renderLevelMap === 'function') renderLevelMap();
    });

    safeAdd('mapBack','click', function(){
      var hs=$id('home-screen'), ms=$id('map-screen');
      if(ms) ms.classList.remove('active');
      if(hs) hs.classList.add('active');
    });

    safeAdd('backBtn','click', function(){
      var hs=$id('home-screen'), gs=$id('game-screen');
      if(gs) gs.classList.remove('active');
      if(hs) hs.classList.add('active');
    });

    // shop open/close
    function openShop(){ var m=$id('shopModal'); if(m){ m.style.display='flex'; m.setAttribute('aria-hidden','false'); } else console.warn('shopModal not found'); }
    safeAdd('shopBtn','click', openShop);
    safeAdd('openShopBtn','click', openShop);
    safeAdd('closeShop','click', function(){ var m=$id('shopModal'); if(m){ m.style.display='none'; m.setAttribute('aria-hidden','true'); } });

    // game controls
    safeAdd('restartBtn','click', function(){ if(typeof restartGame==='function') restartGame(); else console.warn('restartGame missing'); });
    safeAdd('shuffleBtn','click', function(){ if(typeof shuffleBoard==='function') shuffleBoard(); else console.warn('shuffleBoard missing'); });

    // shop buys
    safeAdd('buyShuffle','click', function(){ if(typeof buyFromShop==='function') buyFromShop('shuffle'); else console.warn('buyFromShop missing'); });
    safeAdd('buyMoves','click', function(){ if(typeof buyFromShop==='function') buyFromShop('moves'); else console.warn('buyFromShop missing'); });

    // level modal close
    safeAdd('levelUpClose','click', function(){ var m=$id('levelUpModal'); if(m) m.style.display='none'; });
  });
})();

// js/safe-ui.js
(function(){
  function $id(id){ return document.getElementById(id); }
  function safeAdd(id, evt, h){ var el=$id(id); if(!el){ console.warn('safe-ui: missing #' + id); return; } el.addEventListener(evt,h); }

  document.addEventListener('DOMContentLoaded', function(){
    console.log('✅ Safe UI loaded');

    safeAdd('startBtn','click', function(){
      // show level screen (instead of direct game)
      var hs=$id('home-screen'), ls=$id('level-screen');
      if(hs) hs.classList.remove('active');
      if(ls) ls.classList.add('active');
      // update level UI if game script loaded
      if(typeof updateLevelUI === 'function') updateLevelUI();
    });

    safeAdd('levelStartBtn','click', function(){
      // show game screen
      var ls=$id('level-screen'), gs=$id('game-screen');
      if(ls) ls.classList.remove('active');
      if(gs) gs.classList.add('active');
      if(typeof initGame === 'function') initGame();
      else console.warn('initGame not found');
    });

    safeAdd('backToHomeFromLevel','click', function(){
      var ls=$id('level-screen'), hs=$id('home-screen');
      if(ls) ls.classList.remove('active');
      if(hs) hs.classList.add('active');
    });

    safeAdd('backHome','click', function(){
      var gs=$id('game-screen'), hs=$id('home-screen');
      if(gs) gs.classList.remove('active');
      if(hs) hs.classList.add('active');
    });

    safeAdd('restartBtn','click', function(){ if(typeof restartGame==='function') restartGame(); else console.warn('restartGame missing'); });
    safeAdd('shuffleBtn','click', function(){ if(typeof shuffleBoard==='function') shuffleBoard(); else console.warn('shuffleBoard missing'); });

    safeAdd('openShopBtn','click', function(){ var m=$id('shopModal'); if(m){ m.style.display='flex'; m.setAttribute('aria-hidden','false'); } else console.warn('shopModal not found'); });
    safeAdd('shopBtn','click', function(){ var m=$id('shopModal'); if(m){ m.style.display='flex'; m.setAttribute('aria-hidden','false'); } else console.warn('shopModal not found'); });
    safeAdd('closeShop','click', function(){ var m=$id('shopModal'); if(m){ m.style.display='none'; m.setAttribute('aria-hidden','true'); } });

    // shop buy handlers (if buyFromShop exists)
    safeAdd('buyBomb','click', function(){ if(typeof buyFromShop==='function') buyFromShop('bomb'); else console.warn('buyFromShop missing'); });
    safeAdd('buyShuffle','click', function(){ if(typeof buyFromShop==='function') buyFromShop('shuffle'); else console.warn('buyFromShop missing'); });

    // level map
    safeAdd('levelMapBtn','click', function(){ // open level map screen (if implemented)
      if(typeof openLevelMap === 'function'){ openLevelMap(); }
      else alert('Level map not implemented'); 
    });
  });
})();

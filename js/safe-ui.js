// js/safe-ui.js
(function(){
  function $id(id){ return document.getElementById(id); }
  function safeAdd(id, evt, h){
    var el = $id(id);
    if(!el){ console.warn('safe-ui: missing #' + id); return; }
    el.addEventListener(evt,h);
  }
  document.addEventListener('DOMContentLoaded', function(){
    console.log('Safe UI loaded');
    safeAdd('startBtn','click', function(){
      // go to map first
      var hs=$id('home-screen'), ms=$id('map-screen'); if(hs) hs.classList.remove('active'); if(ms) ms.classList.add('active');
      // map script will render and let player choose level
      if(typeof renderLevelMap === 'function') renderLevelMap();
    });
    safeAdd('backFromMap','click', function(){
      var hs=$id('home-screen'), ms=$id('map-screen'); if(ms) ms.classList.remove('active'); if(hs) hs.classList.add('active');
    });
    safeAdd('backBtn','click', function(){
      var gs=$id('game-screen'), ms=$id('map-screen'); if(gs) gs.classList.remove('active'); if(ms) ms.classList.add('active');
    });

    safeAdd('restartBtn','click', function(){ if(typeof restartGame==='function') restartGame(); else console.warn('restartGame missing'); });
    safeAdd('shuffleBtn','click', function(){ if(typeof shuffleBoard==='function') shuffleBoard(); else console.warn('shuffleBoard missing'); });

    safeAdd('shopBtn','click', function(){ var m=$id('shopModal'); if(m){ m.style.display='flex'; } });
    safeAdd('closeShop','click', function(){ var m=$id('shopModal'); if(m){ m.style.display='none'; } });

    // close help on clicking outside
    document.addEventListener('click', function(e){
      var modal = $id('shopModal');
      if(modal && modal.style.display==='flex' && e.target === modal){ modal.style.display='none'; }
    });
  });
})();
console.log('Loaded: js/safe-ui.js');

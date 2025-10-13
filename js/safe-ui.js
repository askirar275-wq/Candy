(function(){
  function $id(id){return document.getElementById(id)}
  function safeAdd(id,evt,fn){var el=$id(id); if(!el){console.warn('safe-ui: missing #' + id); return;} el.addEventListener(evt,fn)}
  document.addEventListener('DOMContentLoaded',function(){
    console.log('Safe UI loaded');
    safeAdd('openMap','click',function(){ document.getElementById('home-screen').classList.remove('active'); document.getElementById('map-screen').classList.add('active'); if(typeof renderLevelMap==='function') renderLevelMap(); });
    safeAdd('backFromMap','click',function(){ document.getElementById('map-screen').classList.remove('active'); document.getElementById('home-screen').classList.add('active'); });
    safeAdd('backHome','click',function(){ document.getElementById('game-screen').classList.remove('active'); document.getElementById('home-screen').classList.add('active'); });
    safeAdd('restartBtn','click',function(){ if(typeof restartGame==='function') restartGame(); else console.warn('restartGame missing'); });
    safeAdd('shuffleBtn','click',function(){ if(typeof shuffleBoard==='function') shuffleBoard(); else console.warn('shuffleBoard missing'); });
    safeAdd('openShopBtn','click',function(){ alert('Shop placeholder'); });
    safeAdd('levelUpClose','click',function(){ var m=$id('levelUpModal'); if(m) m.style.display='none'; });
  });
})();

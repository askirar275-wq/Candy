// safe-ui.js — binds UI buttons safely, shows warnings if anything missing
(function(){
  function $id(id){ return document.getElementById(id); }
  document.addEventListener('DOMContentLoaded', function(){
    // Start
    const startBtn = $id('startBtn');
    if(startBtn) startBtn.addEventListener('click', function(){
      document.getElementById('home-screen').classList.remove('active');
      document.getElementById('level-screen').classList.add('active');
      // show level map
      if(typeof buildLevelMap === 'function') buildLevelMap();
      else console.warn('level-map.js missing buildLevelMap');
    });

    // Level map back
    const mapBack = $id('mapBack');
    if(mapBack) mapBack.addEventListener('click', function(){
      document.getElementById('level-screen').classList.remove('active');
      document.getElementById('home-screen').classList.add('active');
    });

    // Shop open/close
    const openShop = function(){ const m=$id('shopModal'); if(m){ m.style.display='flex'; m.setAttribute('aria-hidden','false'); } };
    const closeShop = function(){ const m=$id('shopModal'); if(m){ m.style.display='none'; m.setAttribute('aria-hidden','true'); } };
    $id('shopBtn') && $id('shopBtn').addEventListener('click', openShop);
    $id('openShopBtn') && $id('openShopBtn').addEventListener('click', openShop);
    $id('closeShop') && $id('closeShop').addEventListener('click', closeShop);

    // game screen back
    $id('backBtn') && $id('backBtn').addEventListener('click', function(){
      document.getElementById('game-screen').classList.remove('active');
      document.getElementById('home-screen').classList.add('active');
    });

    // restart / shuffle
    $id('restartBtn') && $id('restartBtn').addEventListener('click', function(){ if(typeof restartGame === 'function') restartGame(); else console.warn('restartGame missing'); });
    $id('shuffleBtn') && $id('shuffleBtn').addEventListener('click', function(){ if(typeof shuffleBoard === 'function') shuffleBoard(); else console.warn('shuffleBoard missing'); });

    // shop buys mapped to shop.js buyFromShop
    ['buyBomb','buyShuffle','buyMoves','buyRainbow'].forEach(id=>{
      if($id(id)) $id(id).addEventListener('click', ()=>{ if(typeof buyFromShop==='function') buyFromShop(id.replace('buy','').toLowerCase()); else console.warn('buyFromShop missing'); });
    });
  });
})();

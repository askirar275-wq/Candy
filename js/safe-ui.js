// js/safe-ui.js
(function(){
  function $id(id){ return document.getElementById(id); }

  window.showPage = function(id){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $id(id);
    if(el) el.classList.add('active');
    else console.warn('showPage: missing', id);
  };

  document.addEventListener('DOMContentLoaded', function(){
    console.log('Safe UI loaded');
    const start = $id('startBtn');
    if(start) start.addEventListener('click', ()=> {
      const map = $id('levelMap');
      if(map) window.showPage('levelMap');
      else {
        window.showPage('game-screen');
        if(typeof window.initGame === 'function') window.initGame();
      }
    });

    const backHome = $id('backHome');
    if(backHome) backHome.addEventListener('click', ()=> window.showPage('home-screen'));

    // shop open/close
    const shopBtn = $id('shopBtn');
    if(shopBtn) shopBtn.addEventListener('click', ()=> {
      const m = $id('shopModal'); if(m) m.style.display='flex';
    });
    const closeShop = $id('closeShop');
    if(closeShop) closeShop.addEventListener('click', ()=> {
      const m = $id('shopModal'); if(m) m.style.display='none';
    });
  });
})();

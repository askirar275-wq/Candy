// js/safe-ui.js
(function(){
  // add eruda for debugging (only if network available)
  try {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda';
    s.onload = function(){ try{ eruda.init(); console.log('Eruda loaded'); }catch(e){} };
    document.head.appendChild(s);
  } catch(e) {}

  // small helper for navigation
  window.AppNav = {
    showPage: function(name){
      var pages = document.querySelectorAll('.page');
      for(var i=0;i<pages.length;i++) pages[i].classList.add('hidden');
      var el = document.getElementById(name);
      if(el) el.classList.remove('hidden');
      document.body.setAttribute('data-page', name);
    }
  };

  document.addEventListener('DOMContentLoaded', function(){
    console.log('Safe UI loaded');
    // basic nav buttons
    var btnPlay = document.getElementById('btnPlay');
    var btnMap = document.getElementById('btnMap');
    var btnMapBack = document.getElementById('btnMapBack');
    var btnHome = document.getElementById('btnHome');

    if(btnPlay) btnPlay.onclick = function(){ AppNav.showPage('levelMap'); };
    if(btnMap) btnMap.onclick = function(){ AppNav.showPage('levelMap'); };
    if(btnMapBack) btnMapBack.onclick = function(){ AppNav.showPage('home'); };
    if(btnHome) btnHome.onclick = function(){ AppNav.showPage('levelMap'); };

    // shop modal
    var openShop = document.getElementById('openShop');
    var shop = document.getElementById('shop');
    var closeShop = document.getElementById('closeShop');
    if(openShop) openShop.onclick = function(){ if(shop) shop.classList.remove('hidden'); };
    if(closeShop) closeShop.onclick = function(){ if(shop) shop.classList.add('hidden'); };
  });
})();

// js/safe-ui.js — navigation helper
(function(){
  window.showPage = function(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    const start = document.getElementById('startBtn');
    if(start) start.addEventListener('click', ()=> window.showPage('levelMap'));
    const shop = document.getElementById('shopBtn');
    if(shop) shop.addEventListener('click', ()=> document.getElementById('shopModal').style.display='flex');
    const close = document.getElementById('closeShop');
    if(close) close.addEventListener('click', ()=> document.getElementById('shopModal').style.display='none');
  });
})();

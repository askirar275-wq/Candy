// js/level-map.js
(function(){
  const map = document.getElementById('map-container');
  const $ = id => document.getElementById(id);

  document.addEventListener('DOMContentLoaded', ()=>{
    const total = 10;
    map.innerHTML='';
    for(let i=1;i<=total;i++){
      const btn = document.createElement('button');
      btn.className='level-node';
      btn.textContent='Level '+i;
      btn.onclick = ()=>{
        StorageAPI.setLevel(i);
        window.showPage('game-screen');
        initGame();
      };
      map.appendChild(btn);
    }
    $('backHome').onclick = ()=> window.showPage('home-screen');
  });
})();

// game.js — routing + basic start logic (Hindi comments)

(function(){
  // आसान router: hash के आधार पर page दिखाए
  function showPage(route){
    const pages = ['page-home','page-map','page-play','page-about'];
    pages.forEach(id => document.getElementById(id).classList.add('hidden'));
    if(route.startsWith('/map')) document.getElementById('page-map').classList.remove('hidden');
    else if(route.startsWith('/play')) document.getElementById('page-play').classList.remove('hidden');
    else if(route.startsWith('/about')) document.getElementById('page-about').classList.remove('hidden');
    else document.getElementById('page-home').classList.remove('hidden');
  }

  function router(){
    const hash = location.hash || '#/home';
    showPage(hash.replace('#',''));
    // अगर play route तो level parameter से level शुरू करें
    if(hash.startsWith('#/play')){
      // level: ?level=2 या #/play?level=2
      const q = hash.split('?')[1];
      let lvl = 1;
      if(q){
        const p = new URLSearchParams(q);
        const v = p.get('level');
        if(v) lvl = parseInt(v,10);
      }
      // Game.start() बुलाने की जगह — नीचे placeholder है
      if(typeof Game === 'object' && typeof Game.start === 'function'){
        Game.start(lvl);
      } else {
        // placeholder UI init (जब Game नहीं है)
        document.getElementById('levelTitle').textContent = 'Level ' + lvl;
      }
    }
  }

  window.addEventListener('hashchange', router);
  document.addEventListener('DOMContentLoaded', ()=> {
    router();
    // map grid बनाएं (simple)
    const levelGrid = document.getElementById('levelGrid');
    if(levelGrid){
      levelGrid.innerHTML = '';
      for(let i=1;i<=9;i++){
        const card = document.createElement('div');
        card.className = 'level-card';
        card.innerHTML = `<strong>Level ${i}</strong><div style="margin-top:8px"><a class="btn outline" href="#/play?level=${i}">Play</a></div>`;
        levelGrid.appendChild(card);
      }
    }
  });
})();

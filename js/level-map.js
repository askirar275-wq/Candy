// simple level map UI that reads maxLevel from localStorage
(function(){
  function init(){
    const btnMap = document.getElementById('btn-map');
    const btnStart = document.getElementById('btn-start');
    const levelsEl = document.getElementById('levels');
    const pages = document.querySelectorAll('.page');

    btnMap?.addEventListener('click', ()=>{ showPage('map'); renderLevels(); });
    btnStart?.addEventListener('click', ()=>{ CandyGame.startLevel(1); showPage('game'); });
    document.querySelectorAll('.back').forEach(b=>b.addEventListener('click', ()=>{ const g=b.dataset.go; showPage(g); }));

    renderLevels();
  }

  function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');
  }

  function renderLevels(){
    const levelsEl = document.getElementById('levels');
    const max = Number(localStorage.getItem('maxLevel')||1);
    levelsEl.innerHTML = '';
    for(let i=1;i<=30;i++){
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = 'Level '+i;
      if(i>max){ btn.disabled=true; btn.textContent = 'Level '+i+' 🔒'; }
      else btn.addEventListener('click', ()=>{ CandyGame.startLevel(i); });
      levelsEl.appendChild(btn);
    }
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    init();
    // init game engine after UI prepared
    if(window.CandyGame && typeof window.CandyGame.init==='function') window.CandyGame.init();
  });
})();

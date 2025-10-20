// small UI router + level map
(function(){
  const pages = {
    home: document.getElementById('home'),
    map: document.getElementById('map'),
    game: document.getElementById('game'),
  };
  const btnStart = document.getElementById('btn-start');
  const btnMap = document.getElementById('btn-map');
  const levelsContainer = document.getElementById('levels');

  const LEVEL_GOALS = [500,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000];

  function showPage(name){
    Object.values(pages).forEach(p=>p.classList.add('hidden'));
    pages[name].classList.remove('hidden');
  }

  function setupNav(){
    document.querySelectorAll('[data-go]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        showPage(btn.dataset.go);
      });
    });
    btnStart.addEventListener('click', ()=> {
      showPage('map');
    });
    btnMap.addEventListener('click', ()=> showPage('map'));
  }

  function buildLevelMap(){
    levelsContainer.innerHTML = '';
    const unlocked = Storage.get('unlocked-level', 1);
    for(let i=1;i<=24;i++){
      const div = document.createElement('div');
      div.className = 'level-btn ' + (i<=unlocked? '':'locked');
      div.innerHTML = `<div style="font-weight:700">Level ${i}</div>
        <div style="margin-top:8px;color:#666">Score goal: ${LEVEL_GOALS[(i-1)%LEVEL_GOALS.length]}</div>`;
      if(i<=unlocked){
        div.addEventListener('click', ()=>{
          // go to game and start
          showPage('game');
          // ensure CandyGame available
          if(window.CandyGame && typeof window.CandyGame.startLevel === 'function'){
            window.CandyGame.startLevel(i);
          } else {
            // wait short and then call
            const wait = setInterval(()=>{
              if(window.CandyGame && typeof window.CandyGame.startLevel === 'function'){
                clearInterval(wait);
                window.CandyGame.startLevel(i);
              }
            },80);
          }
        });
      }
      levelsContainer.appendChild(div);
    }
  }

  function init(){
    setupNav();
    buildLevelMap();
    showPage('home');
    console.info('level-map initialized');
  }
  window.addEventListener('DOMContentLoaded', init);
})();

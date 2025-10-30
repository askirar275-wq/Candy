// js/level-map.js
// basic map showing buttons and unlocking logic via Storage

const LevelMap = (function(){
  const containerId = 'levels';
  const maxLevels = 50; // you can increase
  function render(){
    const cont = document.getElementById(containerId);
    if(!cont) return;
    cont.innerHTML = '';
    const state = Storage.get('candy_state') || { unlockedLevels:[1] };
    for(let i=1;i<=Math.min(maxLevels, 30); i++){
      const btn = document.createElement('button');
      const unlocked = (state.unlockedLevels || []).includes(i);
      btn.textContent = unlocked ? `Level ${i}` : `Level ${i} 🔒`;
      btn.className = 'btn';
      btn.style.margin = '8px';
      if(unlocked){
        btn.addEventListener('click', ()=> {
          // call CandyGame.startLevel if exists
          if(window.CandyGame && typeof window.CandyGame.startLevel === 'function'){
            window.CandyGame.startLevel(i);
            // show game page
            document.getElementById('home').classList.add('hidden');
            document.getElementById('map').classList.add('hidden');
            document.getElementById('game').classList.remove('hidden');
          } else {
            SafeUI.toast('Game engine not ready');
            console.warn('CandyGame.startLevel not available yet');
          }
        });
      } else {
        btn.disabled = true;
      }
      cont.appendChild(btn);
    }
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    // wire nav map button
    document.getElementById('btn-map')?.addEventListener('click', ()=>{
      document.getElementById('home').classList.add('hidden');
      document.getElementById('map').classList.remove('hidden');
      document.getElementById('game').classList.add('hidden');
      render();
    });
    // back nav
    document.querySelectorAll('[data-go]').forEach(el=>{
      el.addEventListener('click', ()=> {
        const target = el.getAttribute('data-go');
        document.getElementById('home').classList.add('hidden');
        document.getElementById('map').classList.add('hidden');
        document.getElementById('game').classList.add('hidden');
        document.getElementById(target)?.classList.remove('hidden');
      });
    });
    SafeUI.log('level-map initialized');
  });

  return { render };
})();

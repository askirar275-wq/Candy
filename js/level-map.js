// js/level-map.js
function renderLevelMap(){
  const el = document.getElementById('levelPath');
  if(!el) return;
  el.innerHTML = '';
  // show a simple vertical list of 10 levels for demo (unlimited possible)
  for(let i=1;i<=12;i++){
    const card = document.createElement('div');
    card.className = 'level-card';
    card.style.cssText = 'background:#fff;margin:10px;padding:12px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.06);cursor:pointer';
    card.textContent = 'Level ' + i + ' — Score goal: ' + (i*500);
    card.addEventListener('click', ()=> {
      document.getElementById('map-screen').classList.remove('active');
      document.getElementById('game-screen').classList.add('active');
      // set level and init game
      StorageAPI.setLevel(i);
      if(typeof initGame === 'function') initGame();
    });
    el.appendChild(card);
  }
  console.log('Rendered level map');
}
console.log('Loaded: js/level-map.js');

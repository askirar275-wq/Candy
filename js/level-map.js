// js/level-map.js
document.addEventListener('DOMContentLoaded', ()=>{
  console.log('✅ Loaded: js/level-map.js');

  const container = document.getElementById('levels');
  if(!container){
    console.warn('level-map: #levels not found');
    return;
  }
  const TOTAL = 30; // जितने levels दिखाने हैं

  // safety: ensure level1 unlocked
  if(!Storage.isUnlocked(1)) Storage.unlock(1);

  function render(){
    container.innerHTML = '';
    for(let i=1;i<=TOTAL;i++){
      const div = document.createElement('div');
      div.className = 'level-item';
      div.dataset.level = i;

      const title = document.createElement('div');
      title.className = 'level-title';
      title.textContent = `Level ${i}`;

      const goal = document.createElement('div');
      goal.className = 'level-goal';
      goal.textContent = `Score goal: ${i * 500}`;

      const btn = document.createElement('button');
      btn.className = 'level-btn';
      if(Storage.isUnlocked(i)){
        btn.textContent = 'Play';
        btn.disabled = false;
      } else {
        btn.textContent = '🔒';
        btn.disabled = true;
      }

      btn.addEventListener('click', ()=>{
        if(!Storage.isUnlocked(i)){ alert('🔒 यह level locked है — पहले previous level पूरा करें'); return; }
        // go to game and start
        if(window.UI && typeof window.UI.showPage === 'function') window.UI.showPage('game');
        // small delay to ensure game page visible
        setTimeout(()=> {
          if(window.CandyGame && typeof window.CandyGame.startLevel === 'function'){
            window.CandyGame.startLevel(i);
          } else {
            console.warn('CandyGame.startLevel not available yet');
          }
        }, 120);
      });

      const wrap = document.createElement('div');
      wrap.className = 'level-wrap';
      wrap.appendChild(title);
      wrap.appendChild(goal);
      wrap.appendChild(btn);

      container.appendChild(wrap);
    }
  }

  render();

  // re-render when a new level unlocked
  window.addEventListener('game:levelUnlocked', render);
  // also re-render when storage changes (optional)
  window.addEventListener('storage', render);
});

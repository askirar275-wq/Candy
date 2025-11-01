// js/level-map.js
// Generate level map and handle unlocks
document.addEventListener('DOMContentLoaded', ()=>{
  console.log('✅ Loaded: js/level-map.js');

  const container = document.getElementById('levels');
  if(!container) return;
  const TOTAL = 20;

  function render(){
    container.innerHTML = '';
    for(let i=1;i<=TOTAL;i++){
      const div = document.createElement('div');
      div.className = 'level';
      if(!Storage.isUnlocked(i)) div.classList.add('locked');
      div.innerHTML = `
        <strong>Level ${i}</strong>
        <div style="font-size:12px;">Goal: ${i*500}</div>`;
      div.addEventListener('click', ()=>{
        if(!Storage.isUnlocked(i)){ alert('🔒 Level locked! पहले वाला level पूरा करो'); return; }
        UI.showPage('game');
        CandyGame.startLevel(i);
      });
      container.appendChild(div);
    }
  }

  render();
  window.addEventListener('game:levelUnlocked', render);
});

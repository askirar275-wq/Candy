// js/level-map.js - render a map with clickable levels
const LevelMap = (function(){
  const container = document.getElementById('mapGrid');
  function render(){
    if(!container) return;
    container.innerHTML = '';
    // show 12 levels for demo
    for(let i=1;i<=12;i++){
      const card = document.createElement('div');
      card.className = 'level-card' + (Storage.isUnlocked(i) ? '' : ' locked');
      card.innerHTML = `<div class="thumb"><img src="images/candy1.png" alt=""></div>
        <div class="txt">Level ${i}</div>
        <div class="sub">${Storage.isUnlocked(i) ? 'Play' : 'Locked'}</div>`;
      card.dataset.level = i;
      card.addEventListener('click', (e)=>{
        const lvl = Number(card.dataset.level);
        if(!Storage.isUnlocked(lvl)){ alert('Level locked — complete previous levels to unlock'); return; }
        location.hash = '#game?level=' + lvl;
      });
      container.appendChild(card);
    }
  }
  return { render };
})();

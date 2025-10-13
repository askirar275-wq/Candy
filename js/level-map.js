// level-map.js
console.log('Loaded: level-map.js');
(function(){
  const MAP = document.getElementById('mapGrid');
  if(!MAP){ console.warn('mapGrid element missing'); return; }

  const MAX = 10;
  const unlocked = StorageAPI.getLevel() || 1;

  for(let i=1;i<=MAX;i++){
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = 'Level ' + i;
    if(i <= unlocked){
      btn.onclick = ()=>{ StorageAPI.setPlayLevel(i); location.href='game.html'; };
    } else {
      btn.disabled = true;
      btn.textContent = 'Locked';
    }
    MAP.appendChild(btn);
  }
})();

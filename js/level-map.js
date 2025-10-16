// level-map.js — simple level map and selection
(function(){
  const LEVELS = [
    null,
    {id:1, title:'Beginner', goal:100, moves:40},
    {id:2, title:'Explorer', goal:300, moves:35},
    {id:3, title:'Challenger', goal:700, moves:30},
    {id:4, title:'Master', goal:1400, moves:28},
    // add more...
  ];
  window.buildLevelMap = function(){
    const container = document.getElementById('levelContainer');
    if(!container) return console.warn('levelContainer missing');
    container.innerHTML = '';
    LEVELS.slice(1).forEach(l=>{
      const d = document.createElement('div');
      d.className = 'level-tile';
      d.style.cssText = 'padding:12px;margin:8px;border-radius:12px;background:#fff7fb;min-width:120px;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,0.06);';
      d.innerHTML = `<div style="font-weight:900">Level ${l.id}</div><div style="font-size:13px">${l.title}</div><div style="color:#666;margin-top:6px">Goal: ${l.goal}</div><div style="margin-top:8px"><button data-level="${l.id}" class="play-level">Play</button></div>`;
      container.appendChild(d);
    });
    container.querySelectorAll('.play-level').forEach(b=>{
      b.addEventListener('click', function(){
        const lvl = Number(this.dataset.level);
        // set level and go to game
        if(window.StorageAPI && typeof window.StorageAPI.setLevel === 'function') window.StorageAPI.setLevel(lvl);
        document.getElementById('level-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        if(typeof initGame === 'function') initGame();
      });
    });
  };
})();

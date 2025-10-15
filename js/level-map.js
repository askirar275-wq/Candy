// very small level map renderer — infinite-ish list
(function(){
  const containerId = 'levelPath';
  function makeLevelButton(n, unlocked){
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Level ' + n + (unlocked ? '' : ' 🔒');
    btn.style.margin = '8px';
    btn.style.width = 'auto';
    btn.style.padding = '10px 14px';
    btn.disabled = !unlocked;
    btn.addEventListener('click', function(){ 
      // set level and open game
      localStorage.setItem('candy_level', String(n));
      window.setTimeout(()=>{ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById('game-screen').classList.add('active'); if(typeof initGame==='function') initGame(); }, 120);
    });
    return btn;
  }

  window.initLevelMap = function(){
    const el = document.getElementById(containerId);
    if(!el) return;
    el.innerHTML = '';
    const title = document.createElement('h3'); title.textContent = 'Select Level (scroll)';
    el.appendChild(title);

    // show many levels
    const grid = document.createElement('div'); grid.style.display='flex'; grid.style.flexWrap='wrap';
    const unlocked = Number(localStorage.getItem('candy_level') || 1);
    for(let i=1;i<=200;i++){
      const btn = makeLevelButton(i, i <= unlocked+5); // unlocked + some preview
      grid.appendChild(btn);
    }
    el.appendChild(grid);

    const more = document.createElement('p'); more.style.margin='12px 0'; more.textContent = 'यदि आप level unlock करोगे तो अगला खुलता रहेगा।';
    el.appendChild(more);
  };

})();

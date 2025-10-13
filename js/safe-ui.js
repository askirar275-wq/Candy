// ui.js
(function(){
  function $id(id){ return document.getElementById(id); }
  function safe(fn){ try{ fn(); } catch(e){ console.error('UI error', e); } }

  document.addEventListener('DOMContentLoaded', function(){
    console.log('UI: DOMContentLoaded');

    const screens = {
      home: $id('home'),
      map: $id('map'),
      game: $id('game')
    };

    function show(name){
      Object.values(screens).forEach(s => { if(s) s.classList.remove('active'); });
      if(screens[name]) screens[name].classList.add('active');
      else console.warn('UI: screen not found', name);
    }

    // Buttons (guarded)
    const playBtn = $id('playBtn'); if(playBtn) playBtn.addEventListener('click', () => {
      safe(() => {
        if(typeof renderLevelMap === 'function') renderLevelMap();
        show('map');
      });
    });

    const backHomeBtn = $id('backHomeBtn'); if(backHomeBtn) backHomeBtn.addEventListener('click', () => show('home'));
    const backMapBtn = $id('backMapBtn'); if(backMapBtn) backMapBtn.addEventListener('click', () => show('map'));

    const restartBtn = $id('restartBtn'); if(restartBtn) restartBtn.addEventListener('click', () => { if(typeof initGame==='function'){ initGame(currentLevel); } else console.warn('initGame missing'); });
    const shuffleBtn = $id('shuffleBtn'); if(shuffleBtn) shuffleBtn.addEventListener('click', () => { if(typeof shuffleBoard==='function'){ shuffleBoard(); } else console.warn('shuffleBoard missing'); });

    // expose renderLevelMap if game provides it - or provide default here
    window.renderLevelMap = window.renderLevelMap || function(){
      const container = $id('levelButtons');
      if(!container){ console.warn('renderLevelMap: levelButtons missing'); return; }
      container.innerHTML = '';
      for(let i=1;i<=5;i++){
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = 'Level ' + i;
        btn.addEventListener('click', () => {
          if(typeof startLevel === 'function'){ startLevel(i); }
          else {
            // fallback: call initGame and show game
            currentLevel = i;
            if(typeof initGame === 'function'){ initGame(i); show('game'); }
            else console.warn('startLevel/initGame missing');
          }
        });
        container.appendChild(btn);
      }
    };

    // initial screen
    show('home');
  });
})();

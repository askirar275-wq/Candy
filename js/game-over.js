// js/game-over.js
(function(window){

  // DOM refs
  const modal = document.getElementById('gameOverModal');
  const backdrop = document.getElementById('goBackdrop');
  const goLevel = document.getElementById('go-level');
  const goScore = document.getElementById('go-score');
  const btnReplay = document.getElementById('go-replay');
  const btnNext = document.getElementById('go-next');
  const btnMap = document.getElementById('go-map');

  function showGameOver({ level = 1, score = 0 } = {}){
    if(!modal) return;
    goLevel.textContent = level;
    goScore.textContent = score;
    // show
    modal.classList.remove('hidden');
    // small timeout to trigger transitions
    requestAnimationFrame(()=> modal.classList.add('show'));
    // prevent body scroll while modal open
    document.body.style.overflow = 'hidden';
  }

  function hideGameOver(){
    if(!modal) return;
    modal.classList.remove('show');
    // remove from DOM after transition end
    setTimeout(()=>{
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }, 220);
  }

  // attach handlers (customize actions)
  btnReplay && btnReplay.addEventListener('click', ()=>{
    hideGameOver();
    if(window.Game && typeof window.Game.restart === 'function'){
      window.Game.restart();
    } else {
      const lvl = parseInt(goLevel.textContent || '1', 10);
      if(window.Game && typeof window.Game.start === 'function') window.Game.start(lvl);
      else location.reload();
    }
  });

  btnNext && btnNext.addEventListener('click', ()=>{
    hideGameOver();
    if(window.Game && typeof window.Game.nextLevel === 'function'){
      window.Game.nextLevel();
    } else {
      const lvl = parseInt(goLevel.textContent || '1', 10) + 1;
      if(window.Game && typeof window.Game.start === 'function') window.Game.start(lvl);
      else location.href = './index.html#map';
    }
  });

  btnMap && btnMap.addEventListener('click', ()=>{
    hideGameOver();
    // navigate to map page — change if your map page is map.html
    location.href = './index.html#map';
  });

  // click backdrop to close
  backdrop && backdrop.addEventListener('click', hideGameOver);

  // expose to global
  window.GameOverUI = {
    show: showGameOver,
    hide: hideGameOver
  };

})(window);

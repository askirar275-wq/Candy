// boot.js  — compatibility / init shim
// purpose: ensure there is a global initGame/createBoard/startGame function
// and call the correct existing functions (if any).

(function(){
  // helper to attempt many known init names
  function tryCalls(list){
    for(const name of list){
      try{
        const fn = window[name];
        if(typeof fn === 'function'){
          console.log('boot: calling', name);
          try { fn(); } catch(e){ console.warn('boot: error calling', name, e); }
          return true;
        }
      }catch(e){}
    }
    return false;
  }

  // global initGame shim - will try existing functions in order
  window.initGame = window.initGame || function(){
    // common names seen in variants
    const candidates = ['init','start','startGame','initGame','fillInitialBoard','createBoard'];
    const ok = tryCalls(candidates);
    // after calling, ensure render/fitTiles run if available
    setTimeout(()=>{
      if(typeof window.fitTiles === 'function') try { window.fitTiles(); } catch(e){ }
      if(typeof window.render === 'function') try { window.render(); } catch(e){ }
    }, 40);
    return ok;
  };

  // alias createBoard to initGame for older callers
  window.createBoard = window.createBoard || window.initGame;

  // startGame (for Start button) — hides home, shows game and init
  window.startGame = window.startGame || function(){
    try{
      const home = document.getElementById('home-screen') || document.getElementById('homeScreen');
      const game = document.getElementById('game-screen') || document.getElementById('gameScreen');
      if(home) home.style.display = 'none';
      if(game) game.style.display = 'block';
      // call init
      window.initGame();
      // small delay then fit & render
      setTimeout(()=>{ if(typeof window.fitTiles === 'function') window.fitTiles(); if(typeof window.render === 'function') window.render(); }, 80);
    }catch(e){
      console.warn('boot.startGame error', e);
    }
  };

  // auto wire Start button(s) if they exist and not wired
  document.addEventListener('DOMContentLoaded', ()=>{
    const startEls = document.querySelectorAll('#startBtn, #start, .start-btn, button[data-start]');
    startEls.forEach(el=>{
      if(!el.dataset.bootAttached){
        el.addEventListener('click', (ev)=>{
          ev.preventDefault();
          window.startGame();
        });
        el.dataset.bootAttached = '1';
      }
    });
  });

  console.log('boot.js loaded — initGame/startGame shims installed');
})();

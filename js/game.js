// small starter: init sound & core, start level from query
(function(){
  Sound.init();
  Game.init();
  window.addEventListener('load', ()=>{
    const params = new URLSearchParams(location.search);
    const level = parseInt(params.get('level')||'1',10);
    console.log('[MAIN] start level', level);
    Game.start(level);
  });
})();

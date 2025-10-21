// js/sound.js
(function(){
  const sounds = {};
  function load(name, path){
    try{
      const a = new Audio(path);
      a.preload = 'auto';
      sounds[name] = a;
    }catch(e){
      console.warn('sound load err', name, path, e);
    }
  }

  load('pop', 'sounds/pop.mp3');
  load('win', 'sounds/win.mp3');

  window.SFX = {
    play(name){
      const s = sounds[name];
      if(!s) return;
      try{
        s.currentTime = 0;
        s.play();
      }catch(e){ /* user gesture required? ignore */ }
    }
  };
})();

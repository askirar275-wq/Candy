// js/sound.js
(function(){
  const sounds = {
    pop: new Audio('sounds/pop.mp3'),
    win: new Audio('sounds/win.mp3')
  };
  sounds.pop.volume = 0.3;
  sounds.win.volume = 0.4;

  window.SFX = {
    play(name){
      const s = sounds[name];
      if(!s) return;
      try{ s.currentTime = 0; s.play(); }catch(e){}
    }
  };
})();

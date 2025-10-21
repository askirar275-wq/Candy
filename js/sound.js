// js/sound.js (robust: try mp3 then ogg)
(function(){
  const sounds = {};
  function load(name){
    const mp3 = `sounds/${name}.mp3`;
    const ogg = `sounds/${name}.ogg`;
    const a = new Audio();
    a.preload = 'auto';
    // try mp3 first; browser will try to fetch it; if fails, set source to ogg
    a.src = mp3;
    a.addEventListener('error', () => {
      // fallback to ogg
      a.src = ogg;
    });
    sounds[name] = a;
  }

  load('pop');
  load('win');

  window.SFX = {
    play(name){
      const s = sounds[name];
      if(!s) return;
      try{ s.currentTime = 0; s.play(); }catch(e){}
    }
  };
})();

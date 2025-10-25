// 🔊 Sound.js - handle all game audio
(function(global){
  console.log('[SOUND] लोड हो गया ✅');

  const sounds = {
    swap: new Audio('sounds/swap.mp3'),
    match: new Audio('sounds/match.mp3'),
    win: new Audio('sounds/win.mp3'),
    lose: new Audio('sounds/lose.mp3'),
    bg: new Audio('sounds/bg.mp3')
  };

  // Loop background music
  sounds.bg.loop = true;
  sounds.bg.volume = 0.3;

  const Sound = {
    play(name){
      if(!sounds[name]) return console.warn(`[SOUND] "${name}" नहीं मिला`);
      console.log(`[SOUND] ▶ ${name}`);
      sounds[name].currentTime = 0;
      sounds[name].play().catch(e=>console.warn('[SOUND ERROR]', e));
    },
    stop(name){
      if(sounds[name]) sounds[name].pause();
    },
    startBG(){ sounds.bg.play().catch(()=>console.log('BG start blocked (autoplay policy)')); },
    stopBG(){ sounds.bg.pause(); }
  };
  global.Sound = Sound;
})(window);

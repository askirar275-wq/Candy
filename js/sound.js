// sound.js
(function(global){
  console.log('[SOUND] initializing');
  const S = {};
  const audioFiles = {
    swap: 'sounds/swap.mp3',
    pop:  'sounds/pop.mp3',
    win:  'sounds/win.mp3',
    lose: 'sounds/lose.mp3',
    bg:   'sounds/bg.mp3'
  };

  const audios = {};
  Object.keys(audioFiles).forEach(k=>{
    try {
      audios[k] = new Audio(audioFiles[k]);
      audios[k].preload = 'auto';
    } catch(e){
      console.warn('[SOUND] load error', k, e);
    }
  });

  audios.bg && (audios.bg.loop = true, audios.bg.volume = 0.28);

  S.play = (name)=>{
    if(!audios[name]) return console.warn('[SoundDebug] Sound object not found. Ensure js/sound.js is loaded.');
    try{
      audios[name].currentTime = 0;
      const p = audios[name].play();
      if(p && p.catch) p.catch(e=>console.warn('[Sound] play blocked', e));
      console.log('[SoundDebug] Sound.play("' + name + '")');
    }catch(e){ console.warn('[Sound] err', e); }
  };
  S.stop = (name)=> audios[name] && audios[name].pause();
  S.startBG = ()=> audios.bg && audios.bg.play().catch(()=>console.log('[Sound] bg play blocked'));
  S.muted = false;
  S.setMuted = (m)=>{
    S.muted = !!m;
    Object.values(audios).forEach(a=>{ if(a) a.muted = S.muted; });
  };

  global.Sound = S;
})(window);

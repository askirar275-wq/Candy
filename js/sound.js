// js/sound.js - safe sound wrapper with blocked/play fallback
window.Sound = (function(){
  const sounds = {};
  let bg = null;
  function load(name, url){
    try {
      const a = new Audio(url);
      a.preload = 'auto';
      sounds[name] = a;
      console.log('[Sound] loaded', name, url);
    } catch(e){ console.warn('[Sound] load failed', name, e); }
  }
  function play(name){
    try {
      const a = sounds[name];
      if(!a) { console.warn('[SoundDebug] sound not found', name); return; }
      const p = a.play();
      if(p && p.catch) p.catch(err=> console.warn('[Sound] play blocked', err));
    } catch(e){ console.warn('[Sound] play error', e); }
  }
  function playBg(){
    try {
      if(!sounds.bg) return;
      sounds.bg.loop = true;
      const p = sounds.bg.play();
      if(p && p.catch) p.catch(()=> console.warn('[Sound] bg play blocked'));
    } catch(e){}
  }
  // preload expected files (you must have these in /sound)
  load('pop','sound/pop.mp3');
  load('swap','sound/swap.mp3');
  load('win','sound/win.mp3');
  load('bg','sound/bg.mp3');
  return { load, play, playBg };
})();

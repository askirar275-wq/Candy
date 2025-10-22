// js/sound.js
// Simple Sound Manager - expects files at images/sounds/<name>.mp3
(function(window){
  const basePath = 'images/sounds/';
  const files = { pop:'pop.mp3', swap:'swap.mp3', win:'win.mp3', bg:'bg-loop.mp3' };
  const audio = {};
  const prefsKey = 'prefs_sound_muted';
  let muted = localStorage.getItem(prefsKey) === '1';
  let bgInstance = null;

  function log(...args){ if(window.console) console.log('[Sound]', ...args); }

  // preload
  Object.keys(files).forEach(key => {
    try {
      const a = new Audio();
      a.src = basePath + files[key];
      a.preload = 'auto';
      a.volume = (key==='bg' ? 0.25 : 0.85);
      a.addEventListener('error', (ev)=> log('error loading', key, ev));
      a.addEventListener('canplaythrough', ()=> log('canplaythrough', key));
      audio[key] = a;
    } catch(e){
      log('preload failed', key, e);
    }
  });

  function play(name){
    if(muted){ log('muted — not playing', name); return; }
    if(!audio[name]){
      // fallback: try play direct path
      try {
        const a = new Audio(basePath + (files[name] || name));
        a.volume = 0.85;
        a.play().catch(e => log('play rejected (fallback)', name, e));
      } catch(e){
        log('no audio for', name, e);
      }
      return;
    }
    try {
      if(name === 'bg'){
        if(bgInstance && !bgInstance.paused) return;
        bgInstance = audio.bg.cloneNode(true);
        bgInstance.loop = true;
        bgInstance.play().catch(e => log('bg play rejected', e));
      } else {
        const clone = audio[name].cloneNode(true);
        clone.play().catch(e => log('play rejected', name, e));
      }
    } catch(e){
      log('play error', e);
    }
  }

  function stopBg(){
    try { if(bgInstance){ bgInstance.pause(); bgInstance.currentTime = 0; bgInstance = null; } } catch(e){}
  }

  function toggleMute(val){
    if(typeof val === 'boolean') muted = val; else muted = !muted;
    localStorage.setItem(prefsKey, muted ? '1' : '0');
    log('mute set ->', muted);
    if(muted) stopBg(); else play('bg');
  }

  function isMuted(){ return !!muted; }

  // expose
  window.Sound = { play, toggleMute, isMuted, stopBg, _audioMap: audio };
  log('Sound manager initialized. muted=', muted);
})(window);

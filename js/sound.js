// js/sound.js
// Simple sound manager — preloads and exposes play/mute API.
// Expects sound files at 'images/sounds/<name>.mp3' unless custom path provided.

const Sound = (function(){
  const basePath = 'images/sounds/';
  const files = {
    pop: 'pop.mp3',
    swap: 'swap.mp3',
    win: 'win.mp3',
    bg: 'bg-loop.mp3'
  };

  const audio = {};
  let muted = false;
  let bgInstance = null;

  function preload(){
    Object.keys(files).forEach(key => {
      try {
        const a = new Audio();
        a.src = basePath + files[key];
        a.preload = 'auto';
        a.volume = (key === 'bg' ? 0.25 : 0.75);
        audio[key] = a;
      } catch(e){
        console.warn('Sound preload failed for', key, e);
      }
    });
    // try load muted state from storage
    const s = localStorage.getItem('prefs_sound_muted');
    muted = s === '1';
  }

  function play(name){
    if(muted) return;
    if(!audio[name]) {
      // try lazy create
      try {
        const a = new Audio(basePath + (files[name] || name));
        a.volume = 0.75;
        a.play().catch(()=>{});
      } catch(e){}
      return;
    }
    // for short effects play clone to avoid cutting previous
    try {
      if(name === 'bg'){ // bg loop
        if(bgInstance && !bgInstance.paused) return;
        bgInstance = audio.bg.cloneNode(true);
        bgInstance.loop = true;
        bgInstance.volume = audio.bg.volume;
        bgInstance.play().catch(()=>{});
      } else {
        const clone = audio[name].cloneNode(true);
        clone.volume = audio[name].volume;
        clone.play().catch(()=>{});
      }
    } catch(e){
      // ignore play errors
    }
  }

  function stopBg(){
    try {
      if(bgInstance){ bgInstance.pause(); bgInstance.currentTime = 0; bgInstance = null; }
    } catch(e){}
  }

  function toggleMute(val){
    if(typeof val === 'boolean') muted = val;
    else muted = !muted;
    localStorage.setItem('prefs_sound_muted', muted ? '1' : '0');
    if(muted) stopBg();
    else play('bg');
  }

  function isMuted(){ return !!muted; }

  // init automatically
  preload();
  return { play, toggleMute, isMuted, stopBg };
})();

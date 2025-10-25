// js/sound.js - improved: checks, fetch existence, unlock-on-gesture, eruda-friendly logs
// फ़ाइलें expected: /sound/pop.mp3, /sound/swap.mp3, /sound/win.mp3, /sound/bg.mp3
(function(window){
  const ASSET_DIR = 'sound'; // folder in your repo
  const FILES = {
    swap: 'swap.mp3',
    pop:  'pop.mp3',
    win:  'win.mp3',
    bg:   'bg.mp3'
  };

  const audios = {};      // Audio objects if created
  const available = {};   // boolean: file available & playable
  let unlocked = false;   // whether unlocked by user gesture
  let bgPlaying = false;

  function log(...args){ try { console.log('[SOUND]', ...args); } catch(e){} }

  // check canPlayType for mp3 (most browsers support 'audio/mpeg')
  function canPlayMime(mime){
    try {
      const a = document.createElement('audio');
      return !!(a.canPlayType && a.canPlayType(mime));
    } catch(e){ return false; }
  }

  async function fileExists(url){
    // try HEAD first, fallback GET small
    try {
      const resp = await fetch(url, { method:'HEAD' , cache:'no-store' });
      if(resp && resp.ok) return true;
      // some servers don't allow HEAD -> try GET but don't download whole body
      const resp2 = await fetch(url, { method:'GET', cache:'no-store' });
      return resp2 && resp2.ok;
    } catch(e){
      return false;
    }
  }

  async function prepare(){
    log('initializing');
    const mime = 'audio/mpeg';
    const mp3Ok = canPlayMime(mime);
    if(!mp3Ok) log('⚠️ browser may not support mp3 (audio/mpeg). canPlayType=false');

    // test each file, create Audio only if exists and playable
    await Promise.all(Object.keys(FILES).map(async key=>{
      const name = FILES[key];
      const url = `${ASSET_DIR}/${name}`;
      try {
        const ok = await fileExists(url);
        if(!ok){ available[key]=false; log(`missing: ${url}`); return; }
        // create audio element
        const a = new Audio(url);
        a.preload = 'auto';
        a.loop = (key==='bg');
        audios[key] = a;
        available[key] = true;
        log('loaded', key, url);
      } catch(err){
        available[key]=false;
        log('err checking', key, err);
      }
    }));
  }

  // try to play safely
  async function tryPlay(key){
    try{
      if(!available[key] || !audios[key]) { log('no audio for', key); return; }
      const a = audios[key];
      a.currentTime = 0;
      const p = a.play();
      if(p && p instanceof Promise){
        await p.catch(err=>{
          // common mobile: play blocked until user gesture
          log('play blocked', key, err && err.name ? err.name : err);
          throw err;
        });
      }
    }catch(e){
      // swallow but log
      log('play failed', key, e);
      throw e;
    }
  }

  function safePlay(key){
    // public wrapper - won't throw
    try {
      if(!available[key]) { log('[Sound] not available ->', key); return; }
      tryPlay(key).catch(()=>{ /* ignore blocked */ });
    } catch(e){ log('safePlay error', e); }
  }

  // unlock on first user gesture (mobile) - call once
  function unlockOnFirstInteraction(){
    if(unlocked) return;
    const handler = ()=>{
      unlocked = true;
      log('[Sound] user interaction detected -> attempting to unlock audio');
      // try immediate background play (muted) then unmute
      if(available.bg && audios.bg){
        const a = audios.bg;
        a.muted = true;
        const p = a.play();
        if(p && p.then){
          p.then(()=>{
            a.pause(); a.currentTime = 0; a.muted = false;
            log('[Sound] bg unlocked (muted play test succeeded)');
          }).catch((err)=>{
            log('[Sound] bg muted play failed', err);
          });
        }
      }
      // remove listeners
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('click', handler);
    };
    window.addEventListener('pointerdown', handler, { once:true });
    window.addEventListener('touchstart', handler, { once:true });
    window.addEventListener('click', handler, { once:true });
    log('[Sound] waiting for first user gesture to unlock audio');
  }

  // API
  const API = {
    init: async function(){
      try {
        await prepare();
        log('[SOUND] initialized');
      } catch(e){ log('[SOUND] init error', e); }
    },
    play: function(key){
      safePlay(key);
    },
    playBg: function(){
      if(!available.bg || !audios.bg){ log('[Sound] bg missing'); return; }
      try{
        const a = audios.bg;
        a.loop = true;
        a.volume = 0.6;
        const p = a.play();
        if(p && p.catch) p.catch(err=> log('[Sound] bg play blocked', err));
        bgPlaying = true;
      }catch(e){ log('bg play err', e); }
    },
    stopBg: function(){
      if(audios.bg){ try{ audios.bg.pause(); audios.bg.currentTime = 0; }catch(e){} }
      bgPlaying=false;
    },
    isAvailable: function(key){ return !!available[key]; },
    unlockOnFirstInteraction: unlockOnFirstInteraction,
    _debug_list: function(){ return { available, audios, unlocked }; }
  };

  // auto-init (non-blocking)
  API.init();
  // expose
  window.Sound = API;

})(window);

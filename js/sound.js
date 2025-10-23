window.CMSound = (function(){
  const sounds = {};
  let muted = false;
  function load(name, src){
    if(!src) return;
    try {
      const a = new Audio(src);
      a.preload = 'auto';
      sounds[name] = a;
    } catch(e){
      console.warn('[SoundDebug] failed load', name, src, e);
    }
  }
  function play(name){
    const s = sounds[name];
    if(!s){ console.warn('[SoundDebug] no sound', name); return; }
    if(muted) return;
    try {
      const clone = s.cloneNode();
      clone.play().catch(e => { /* autoplay blocked */ console.warn('[SoundStub] play blocked',e); });
    } catch(e){
      console.warn('[SoundDebug] play err', e);
    }
  }
  function setMuted(v){
    muted = !!v;
    localStorage.setItem('cm_muted', muted?'1':'0');
  }
  function init(){
    muted = localStorage.getItem('cm_muted')==='1';
    // default names: swap,pop,bg
    load('swap','sound/swap.mp3');
    load('pop','sound/pop.mp3');
    load('bg','sound/bg.mp3');
    // try to autoplay background if allowed
    if(!muted && sounds.bg){
      try { sounds.bg.loop = true; sounds.bg.volume = 0.25; sounds.bg.play().catch(()=>{}); } catch(e){}
    }
  }
  init();
  return { play, setMuted, load, sounds, isMuted: ()=>muted };
})();

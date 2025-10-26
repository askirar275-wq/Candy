// sound.js - simple wrapper
const Sound = (function(){
  const sounds = {};
  let enabled = true;
  function load(name, src){
    const a = new Audio();
    a.src = src;
    a.preload = 'auto';
    sounds[name]=a;
  }
  function play(name, opts={}){
    if(!enabled) return;
    const a = sounds[name];
    if(!a) { console.warn('[Sound] not found', name); return; }
    // clone to allow overlapping
    const clone = a.cloneNode();
    clone.volume = ('volume' in opts)? opts.volume : 1;
    const p = clone.play();
    if(p && p.catch) p.catch(err=> console.warn('[Sound] play blocked', err));
  }
  function bgPlay(name){
    const a = sounds[name];
    if(!a) return;
    a.loop = true;
    a.play().catch(e=> console.warn('[Sound] bg play blocked', e));
  }
  function setEnabled(v){ enabled = !!v; }
  return { load, play, bgPlay, setEnabled };
})();

// preload common files (paths used in this project)
Sound.load('pop','sound/pop.mp3');
Sound.load('swap','sound/pop.mp3');
Sound.load('win','sound/win.mp3');
Sound.load('bg','sound/bg.mp3');

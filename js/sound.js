// js/sound.js
const Sound = (function(){
  const sounds = {};
  let muted = false;
  function load(name, url){
    const a = new Audio(); a.src = url; sounds[name] = a;
  }
  function play(name){
    if(muted) return;
    const a = sounds[name];
    if(!a) return;
    try { a.currentTime = 0; a.play().catch(()=>{}); } catch(e){}
  }
  return {
    load, play,
    setMuted(v){ muted = !!v; },
    isMuted(){ return muted; }
  };
})();

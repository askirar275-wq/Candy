// सिंपल साउंड मैनेजर — assets/sound में swap.mp3 pop.mp3 win.mp3 bg.mp3 रखें
window.Sound = (function(){
  const names = { swap:'swap.mp3', pop:'pop.mp3', win:'win.mp3', bg:'bg.mp3' };
  const audios = {};
  const base = 'sound'; // आपकी repo में sound/ फोल्डर नाम
  Object.keys(names).forEach(k=>{
    try{
      const a = new Audio(`${base}/${names[k]}`);
      a.preload='auto';
      audios[k]=a;
    }catch(e){ audios[k]=null; }
  });
  return {
    init: function(){ console.log('[SOUND] initializing'); },
    play: function(name){
      try{
        const a = audios[name];
        if(!a) return console.warn('[Sound] missing', name);
        a.currentTime = 0;
        const p = a.play();
        if(p && p.catch) p.catch(e=> console.warn('[Sound] play blocked', e));
      }catch(e){ console.warn('[Sound] play error', e); }
    }
  };
})();

// sound.js
const Sound = {
  enabled: true,
  audios: {},
  map: { bg: 'bg.mp3', swap: 'swap.mp3', pop: 'pop.mp3', win: 'win.mp3', lose: 'lose.mp3' },
  load(basePath='sounds'){
    Object.entries(this.map).forEach(([k,f])=>{
      const path = `${basePath}/${f}`;
      const a = new Audio(path);
      a.preload = 'auto';
      a.loop = (k==='bg');
      this.audios[k]=a;
      // if load error, ignore
      a.addEventListener('error', ()=>{ /* silent */ });
    });
  },
  play(name){
    if(!this.enabled) return;
    const a = this.audios[name];
    if(!a) return;
    try{ a.currentTime=0; a.play().catch(()=>{}); }catch(e){}
  },
  stop(name){
    const a=this.audios[name]; if(a){ a.pause(); a.currentTime=0; }
  },
  setMuted(m){
    this.enabled = !m;
    if(m) Object.values(this.audios).forEach(a=>a.pause());
    else this.play('bg');
  }
};

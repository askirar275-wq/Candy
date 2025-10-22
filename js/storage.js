// js/storage.js - small wrapper to save unlocked levels & best scores
const Storage = (function(){
  const KEY = 'candy_v1';
  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { unlocked: [1], best: {} , prefs:{soundMuted:false}};
    } catch(e){ return {unlocked:[1], best:{}, prefs:{soundMuted:false}}; }
  }
  function save(obj){
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch(e){}
  }
  let state = load();
  return {
    get(){ return state; },
    isUnlocked(level){ return state.unlocked.indexOf(level) !== -1; },
    unlock(level){
      if(!state.unlocked.includes(level)) state.unlocked.push(level);
      save(state);
    },
    setBest(level,score){
      state.best[level] = Math.max(state.best[level] || 0, score);
      save(state);
    },
    getBest(level){ return state.best[level] || 0; },
    prefs(){ return state.prefs; },
    setPref(k,v){ state.prefs[k]=v; save(state); },
    reset(){ state = { unlocked:[1], best:{}, prefs:{soundMuted:false}}; save(state); }
  };
})();

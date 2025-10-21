// js/storage.js
(function(){
  const KEY = 'candy_match_v1';

  function read(){
    try{
      const s = localStorage.getItem(KEY);
      return s ? JSON.parse(s) : {unlocked:[1], bestScores:{}};
    }catch(e){
      return {unlocked:[1], bestScores:{}};
    }
  }

  function write(obj){
    try{ localStorage.setItem(KEY, JSON.stringify(obj)); } catch(e){ console.warn('storage err', e); }
  }

  function getUnlocked(){ return (read().unlocked || [1]).slice(); }
  function unlock(level){
    if(!level || level < 1) return getUnlocked();
    const st = read();
    st.unlocked = Array.from(new Set([...(st.unlocked||[]), level])).sort((a,b)=>a-b);
    write(st);
    return st.unlocked;
  }
  function isUnlocked(level){ return getUnlocked().includes(level); }

  function getBestScore(level){
    const st = read();
    return (st.bestScores && st.bestScores[level]) || 0;
  }
  function setBestScore(level, score){
    const st = read();
    st.bestScores = st.bestScores || {};
    st.bestScores[level] = Math.max(st.bestScores[level]||0, score);
    write(st);
  }

  window.StorageAPI = {
    getUnlocked, unlock, isUnlocked, getBestScore, setBestScore
  };
})();

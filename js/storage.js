// js/storage.js
(function(){
  const KEY = 'candy_match_v2';
  function read(){ try{ const s = localStorage.getItem(KEY); return s?JSON.parse(s):{unlocked:[1],best:{},boosters:{bomb:1,shuffle:1},achievements:{levels:0,combos:0}}; }catch(e){return {unlocked:[1],best:{},boosters:{bomb:1,shuffle:1},achievements:{levels:0,combos:0}};}}
  function write(v){ try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} }
  function getUnlocked(){ return (read().unlocked||[1]).slice(); }
  function unlock(level){ const st = read(); st.unlocked = Array.from(new Set([...(st.unlocked||[]), level])).sort((a,b)=>a-b); write(st); return st.unlocked; }
  function getBest(level){ const st = read(); return (st.best && st.best[level])||0; }
  function setBest(level,score){ const st = read(); st.best = st.best || {}; st.best[level] = Math.max(st.best[level]||0, score); write(st); }
  function getBoosters(){ const st=read(); st.boosters=st.boosters||{bomb:1,shuffle:1}; return st.boosters; }
  function useBooster(name){ const st=read(); st.boosters=st.boosters||{bomb:1,shuffle:1}; if(st.boosters[name] && st.boosters[name]>0){ st.boosters[name]--; write(st); return true;} return false;}
  function getAchievements(){ return read().achievements || {}; }
  function recordAchievement(k,val){ const st=read(); st.achievements=st.achievements||{}; st.achievements[k]= (st.achievements[k]||0)+val; write(st); }
  function resetAll(){ const init={unlocked:[1],best:{},boosters:{bomb:1,shuffle:1},achievements:{levels:0,combos:0}}; write(init); return init; }

  window.StorageAPI = { getUnlocked, unlock, getBest, setBest, getBoosters, useBooster, getAchievements, recordAchievement, resetAll };
})();

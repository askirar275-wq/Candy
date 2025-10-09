/* level.js
   Level definitions and UI helpers.
   Exposes LevelAPI to query goals and notify when a level is complete.
*/
window.LevelAPI = (function(){
  // index 1-based for readability
  const LEVELS = [
    null,
    { id:1, title:'Beginner', goalScore:100, reward:50, boardSize:8 },
    { id:2, title:'Explorer', goalScore:300, reward:120, boardSize:8 },
    { id:3, title:'Challenger', goalScore:700, reward:250, boardSize:8 },
    { id:4, title:'Master', goalScore:1500, reward:600, boardSize:8 }
  ];

  function getLevel(){ return StorageAPI.getLevel() || 1; }
  function getInfo(level){
    return LEVELS[level] || LEVELS[1];
  }

  function updateLevelBadge(){
    const el = document.getElementById('currentLevel');
    if(el) el.textContent = String(getLevel());
    const targetEl = document.getElementById('levelTarget');
    if(targetEl) targetEl.textContent = `Target: ${getInfo(getLevel()).goalScore}`;
  }

  function onLevelComplete(cb){
    // cb(levelId, reward)
    // simple: show modal and promote
    const cur = getLevel();
    const info = getInfo(cur);
    const reward = info && info.reward ? info.reward : 0;
    // give coins
    if(reward) StorageAPI.addCoins(reward);
    // unlock next if exists
    if(LEVELS[cur+1]){
      StorageAPI.setLevel(cur+1);
      updateLevelBadge();
      // show modal UI
      const modal = document.getElementById('levelUpModal');
      if(modal){
        document.getElementById('levelUpTitle').textContent = 'Level Up!';
        document.getElementById('levelUpText').textContent = `Level ${cur} complete. Level ${cur+1} unlocked! Reward: ${reward} coins.`;
        modal.style.display = 'flex';
      }
    } else {
      const modal = document.getElementById('levelUpModal');
      if(modal){
        document.getElementById('levelUpTitle').textContent = 'All Levels Complete!';
        document.getElementById('levelUpText').textContent = `You completed level ${cur}. Reward: ${reward} coins.`;
        modal.style.display = 'flex';
      }
    }
    if(typeof cb === 'function') cb(cur, reward);
  }

  // init UI on load
  document.addEventListener('DOMContentLoaded', ()=> updateLevelBadge());

  return { getInfo, getLevel, updateLevelBadge, onLevelComplete };
})();

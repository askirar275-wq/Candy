// js/level-modal.js
(function(){
  const $ = id => document.getElementById(id);

  function nextLevel(){
    try {
      const cur = StorageAPI.getLevel();
      StorageAPI.setLevel(cur + 1);
      // hide modal
      const m = $('levelUpModal'); if(m) m.style.display = 'none';
      if(typeof initGame === 'function') initGame();
    } catch(e){ console.error(e); }
  }

  function replayLevel(){
    try {
      // just restart
      const m = $('levelUpModal'); if(m) m.style.display = 'none';
      if(typeof restartGame === 'function') restartGame();
      else if(typeof initGame === 'function') initGame();
    } catch(e){ console.error(e); }
  }

  function attach(){
    const n = $('levelNext'), r = $('levelReplay'), m = $('levelUpModal');
    if(!n || !r || !m){ setTimeout(attach, 200); return; }
    n.addEventListener('click', nextLevel);
    r.addEventListener('click', replayLevel);
    m.addEventListener('click', (e)=>{ if(e.target===m) nextLevel(); });
    console.log('Level modal attached');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', attach); else attach();
})();
console.log('Loaded: js/level-modal.js');

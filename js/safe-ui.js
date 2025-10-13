// Safe UI glue: attach buttons and protect missing elements
(function(){
  function $id(id){ return document.getElementById(id); }
  function safeAdd(id,evt,fn){ const el=$id(id); if(!el){ console.warn('safe-ui: missing #' + id); return; } el.addEventListener(evt,fn); }
  document.addEventListener('DOMContentLoaded', function(){
    console.log('\u2705 Safe UI loaded');
    safeAdd('playBtn','click', ()=>{ document.getElementById('home-screen').classList.remove('active'); document.getElementById('map-screen').classList.add('active'); if(window.renderLevelMap) renderLevelMap(); });
    safeAdd('backFromMap','click', ()=>{ document.getElementById('map-screen').classList.remove('active'); document.getElementById('home-screen').classList.add('active'); });
    safeAdd('openMapBtn','click', ()=>{ document.getElementById('game-screen').classList.remove('active'); document.getElementById('map-screen').classList.add('active'); if(window.renderLevelMap) renderLevelMap(); });
    safeAdd('homeBtn','click', ()=>{ document.getElementById('game-screen').classList.remove('active'); document.getElementById('home-screen').classList.add('active'); });
    safeAdd('restartBtn','click', ()=>{ if(typeof restartGame==='function') restartGame(); else console.warn('restartGame missing'); });
    safeAdd('shuffleBtn','click', ()=>{ if(typeof shuffleBoard==='function') shuffleBoard(); else console.warn('shuffleBoard missing'); });

    // level up modal close
    const lvlClose = $id('levelUpClose'); if(lvlClose) lvlClose.addEventListener('click', ()=>{ const m = $id('levelUpModal'); if(m) m.style.display='none'; });
  });
})();

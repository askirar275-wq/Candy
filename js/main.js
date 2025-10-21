// js/main.js
(function(){
  const screens = { home:document.getElementById('screen-home'), map:document.getElementById('screen-map'), game:document.getElementById('screen-game'), gameover:document.getElementById('screen-gameover') };
  const btnPlay=document.getElementById('btn-play'), btnOpenMap=document.getElementById('btn-open-map'), mapGrid=document.getElementById('map-grid');
  const gameTitle=document.getElementById('game-title'), goTitle=document.getElementById('go-title'), goScore=document.getElementById('go-score'), goBest=document.getElementById('go-best-score');
  const btnPause=document.getElementById('btn-pause'), pauseModal=document.getElementById('pause-modal'), btnResume=document.getElementById('btn-resume'), btnQuit=document.getElementById('btn-quit');
  const btnHint=document.getElementById('btn-hint'), btnShuffle=document.getElementById('btn-shuffle'), btnBomb=document.getElementById('btn-use-bomb');
  const settingsDrawer=document.getElementById('settings-drawer'), btnSettings=document.getElementById('btn-settings'), btnCloseSettings=document.getElementById('btn-close-settings');
  const btnResetProgress=document.getElementById('btn-reset-progress');

  document.querySelectorAll('.back').forEach(b => b.addEventListener('click', e=> navigateTo(e.currentTarget.dataset.target || 'home')));

  const LEVEL_COUNT = 12;
  function renderMap(){
    mapGrid.innerHTML=''; const unlocked = new Set(window.StorageAPI.getUnlocked());
    for(let i=1;i<=LEVEL_COUNT;i++){
      const card=document.createElement('div'); card.className='level-card'+(unlocked.has(i)?'':' locked'); card.dataset.level=i;
      const thumb=document.createElement('div'); thumb.className='level-thumb';
      const candyRow=document.createElement('div'); candyRow.className='candies';
      for(let c=0;c<5;c++){ const img=document.createElement('img'); img.src=`images/candy${(c%5)+1}.png`; candyRow.appendChild(img); }
      thumb.appendChild(candyRow);
      const lvl=document.createElement('div'); lvl.className='lvl'; lvl.textContent=`Level ${i}`;
      const desc=document.createElement('div'); desc.className='desc'; desc.textContent = unlocked.has(i)? 'Play' : 'Locked';
      card.appendChild(thumb); card.appendChild(lvl); card.appendChild(desc);
      card.addEventListener('click', ()=> { if(!unlocked.has(i)){ alert('Locked'); return;} startLevel(i); });
      mapGrid.appendChild(card);
    }
  }

  function showScreen(n){ Object.values(screens).forEach(s=> s.classList.remove('active')); if(screens[n]) screens[n].classList.add('active'); }

  function navigateTo(n){ history.pushState({screen:n},'',`#${n}`); showScreen(n); }

  function startLevel(level){
    gameTitle.textContent = `Level ${level}`; showScreen('game');
    if(window.GameAPI && window.GameAPI.initGame) window.GameAPI.initGame(level);
  }

  btnPlay && btnPlay.addEventListener('click', ()=>{ renderMap(); navigateTo('map'); });
  btnOpenMap && btnOpenMap.addEventListener('click', ()=>{ renderMap(); navigateTo('map'); });
  btnSettings && btnSettings.addEventListener('click', ()=> settingsDrawer.hidden = !settingsDrawer.hidden);
  btnCloseSettings && btnCloseSettings.addEventListener('click', ()=> settingsDrawer.hidden = true);

  btnPause && btnPause.addEventListener('click', ()=> { pauseModal.hidden = false; });
  btnResume && btnResume.addEventListener('click', ()=> { pauseModal.hidden=true; });
  btnQuit && btnQuit.addEventListener('click', ()=> { pauseModal.hidden=true; navigateTo('map'); });

  btnHint && btnHint.addEventListener('click', ()=> { if(window.GameAPI && window.GameAPI.getHint){ const h=window.GameAPI.getHint(); if(!h) alert('No hint'); else{ const a=h[0], b=h[1]; // highlight simple
    const idx=a.r*8+a.c, jdx=b.r*8+b.c; const el=document.querySelectorAll('.cell')[idx], el2=document.querySelectorAll('.cell')[jdx]; el && (el.style.outline='3px solid #ffd166'); el2 && (el2.style.outline='3px solid #ffd166'); setTimeout(()=>{ el && (el.style.outline=''); el2 && (el2.style.outline=''); },900);
  }}});

  btnShuffle && btnShuffle.addEventListener('click', ()=> { if(window.GameAPI && window.GameAPI.applyShuffle) window.GameAPI.applyShuffle(); });

  btnBomb && btnBomb.addEventListener('click', ()=> { if(window.GameAPI && window.GameAPI.applyBomb) window.GameAPI.applyBomb(); });

  btnResetProgress && btnResetProgress.addEventListener('click', ()=> { if(confirm('Reset progress?')){ window.StorageAPI.resetAll(); renderMap(); alert('Progress reset.'); } });

  // on gameover
  window.Nav = { showGameOver: function(win, score, level){
    goTitle.textContent = win? `Level ${level} Complete!` : `Level ${level} Over`;
    goScore.textContent = score; goBest.textContent = (window.StorageAPI && window.StorageAPI.getBest)? window.StorageAPI.getBest(level):0;
    // record achievements
    if(win){ window.StorageAPI && window.StorageAPI.recordAchievement && window.StorageAPI.recordAchievement('levels',1); }
    // unlock next
    if(win){ window.StorageAPI && window.StorageAPI.unlock && window.StorageAPI.unlock(level+1); }
    showScreen('gameover');
  }};

  // preloads
  function preload(){
    for(let i=1;i<=5;i++){ const img=new Image(); img.src=`images/candy${i}.png`; }
  }

  window.addEventListener('popstate', (e)=>{ const s = e.state && e.state.screen; if(s) showScreen(s); else showScreen('home'); });

  function init(){ preload(); renderMap(); const h=location.hash.replace('#',''); if(h && screens[h]) showScreen(h); else showScreen('home'); }
  document.addEventListener('DOMContentLoaded', init);
})();

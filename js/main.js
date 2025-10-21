// js/main.js - Navigation + improved pause modal with swipe-to-close
(function(){
  const screens = {
    home: document.getElementById('screen-home'),
    map: document.getElementById('screen-map'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover')
  };

  // controls
  const btnPlay = document.getElementById('btn-play');
  const btnOpenMap = document.getElementById('btn-open-map');
  const mapGrid = document.getElementById('map-grid');
  const gameTitle = document.getElementById('game-title');

  // HUD
  const navScore = document.getElementById('nav-score');
  const navMoves = document.getElementById('nav-moves');
  const navTarget = document.getElementById('nav-target');
  const navCombo = document.getElementById('nav-combo');

  // pause modal
  const btnPause = document.getElementById('btn-pause');
  const pauseModal = document.getElementById('pause-modal');
  const pauseCard = document.getElementById('pause-card');
  const btnResume = document.getElementById('btn-resume');
  const btnRestart2 = document.getElementById('btn-restart2');
  const btnQuit = document.getElementById('btn-quit');

  // other controls
  const btnHint = document.getElementById('btn-hint');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnBomb = document.getElementById('btn-use-bomb');
  const btnSettings = document.getElementById('btn-settings');
  const settingsDrawer = document.getElementById('settings-drawer');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnResetProgress = document.getElementById('btn-reset-progress');

  // basic nav
  document.querySelectorAll('.back').forEach(b => b.addEventListener('click', (e)=>{
    const t = e.currentTarget.dataset.target || 'home'; navigateTo(t);
  }));

  function getUnlocked(){ return (window.StorageAPI && window.StorageAPI.getUnlocked) ? window.StorageAPI.getUnlocked() : [1]; }
  function unlockLevel(n){ window.StorageAPI && window.StorageAPI.unlock && window.StorageAPI.unlock(n); }

  const LEVEL_COUNT = 12;

  function preloadCandyImages(){
    for(let i=1;i<=5;i++){ const im=new Image(); im.src=`images/candy${i}.png`; }
  }

  function renderMap(){
    if(!mapGrid) return;
    mapGrid.innerHTML='';
    const unlocked = new Set(getUnlocked());
    for(let i=1;i<=LEVEL_COUNT;i++){
      const card=document.createElement('div'); card.className='level-card'+(unlocked.has(i)?'':' locked'); card.dataset.level=i;
      const thumb=document.createElement('div'); thumb.className='level-thumb';
      const candyRow=document.createElement('div'); candyRow.className='candies';
      for(let c=0;c<5;c++){ const img=document.createElement('img'); img.src=`images/candy${(c%5)+1}.png`; candyRow.appendChild(img); }
      thumb.appendChild(candyRow);
      const lvl=document.createElement('div'); lvl.className='lvl'; lvl.textContent=`Level ${i}`;
      const desc=document.createElement('div'); desc.className='desc'; desc.textContent=unlocked.has(i)?'Play':'Locked';
      card.appendChild(thumb); card.appendChild(lvl); card.appendChild(desc);
      card.addEventListener('click', ()=>{ if(!unlocked.has(i)){ alert('Level locked — complete previous levels.'); return;} startLevel(i); });
      mapGrid.appendChild(card);
    }
  }

  function showScreen(name){
    Object.values(screens).forEach(s=> s.classList.remove('active'));
    if(screens[name]) screens[name].classList.add('active');
  }

  function navigateTo(name){
    history.pushState({screen:name}, '', `#${name}`);
    showScreen(name);
  }

  function startLevel(level){
    gameTitle.textContent = `Level ${level}`;
    showScreen('game');
    if(window.GameAPI && typeof window.GameAPI.initGame === 'function'){
      window.GameAPI.initGame(level);
      startHUDUpdater();
    } else {
      // fallback demo
      setTimeout(()=>{ window.Nav && window.Nav.showGameOver && window.Nav.showGameOver(true, 900, level); }, 800);
    }
  }

  // ===== Pause modal: open/close with swipe-to-close support =====
  function openPause(){
    if(!pauseModal) return;
    pauseModal.hidden = false;
    document.body.classList.add('modal-open');
    // optional: call game pause if implemented
    if(window.GameAPI && typeof window.GameAPI.pause === 'function') try{ window.GameAPI.pause(); }catch(e){}
    // ensure card reset transform
    resetPauseCard();
  }

  function closePause(){
    if(!pauseModal) return;
    pauseModal.hidden = true;
    document.body.classList.remove('modal-open');
    if(window.GameAPI && typeof window.GameAPI.resume === 'function') try{ window.GameAPI.resume(); }catch(e){}
    resetPauseCard();
  }

  function resetPauseCard(){
    if(!pauseCard) return;
    pauseCard.style.transition = 'transform .18s cubic-bezier(.22,.9,.32,1), opacity .12s';
    pauseCard.style.transform = 'translateY(0)'; pauseCard.style.opacity = '1';
  }

  if(btnPause) btnPause.addEventListener('click', ()=> openPause());
  if(btnResume) btnResume.addEventListener('click', ()=> closePause());
  if(btnRestart2) btnRestart2.addEventListener('click', ()=> {
    closePause();
    if(window.GameAPI && typeof window.GameAPI.reset === 'function') window.GameAPI.reset();
  });
  if(btnQuit) btnQuit.addEventListener('click', ()=> {
    closePause();
    navigateTo('map');
  });

  // Swipe-to-close implementation (touch)
  (function attachSwipeToClose(){
    if(!pauseCard || !pauseModal) return;
    let startY = 0, currentY = 0, dragging=false, lastTime=0;
    const threshold = 80; // px to dismiss
    const velocityThreshold = 0.45; // px/ms fast flick

    function onStart(e){
      dragging = true;
      startY = (e.touches && e.touches[0]) ? e.touches[0].clientY : (e.clientY || 0);
      currentY = startY;
      lastTime = Date.now();
      pauseCard.style.transition = 'none';
    }
    function onMove(e){
      if(!dragging) return;
      const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : (e.clientY || 0);
      const dy = Math.max(0, y - startY);
      currentY = y;
      // apply translation but with resistance
      const translate = dy * (dy < 140 ? 0.85 : 0.6);
      pauseCard.style.transform = `translateY(${translate}px)`;
      // reduce backdrop opacity slightly for feel
      pauseModal.style.background = `rgba(0,0,0,${Math.max(0.12, 0.42 - (translate/600))})`;
      e.preventDefault && e.preventDefault();
    }
    function onEnd(e){
      if(!dragging) return;
      dragging = false;
      const endY = currentY;
      const dy = endY - startY;
      const dt = Math.max(1, Date.now() - lastTime);
      const velocity = dy / dt; // px per ms
      pauseCard.style.transition = 'transform .18s cubic-bezier(.22,.9,.32,1), opacity .12s';

      // if pulled far enough OR flicked quickly -> dismiss
      if(dy > threshold || velocity > velocityThreshold){
        // animate out
        pauseCard.style.transform = `translateY(120vh)`; // huge translate down
        pauseCard.style.opacity = '0';
        setTimeout(()=> {
          closePause(); // fully hide & reset
          pauseModal.style.background = 'rgba(0,0,0,0.42)';
        }, 220);
      } else {
        // reset to center
        pauseCard.style.transform = 'translateY(0)';
        pauseModal.style.background = 'rgba(0,0,0,0.42)';
      }
    }

    // attach listeners (touch)
    pauseCard.addEventListener('touchstart', onStart, {passive:true});
    pauseCard.addEventListener('touchmove', onMove, {passive:false});
    pauseCard.addEventListener('touchend', onEnd);
    // also support mouse drag for desktop testing
    pauseCard.addEventListener('mousedown', (e)=>{ onStart(e); const mm = (ev)=>onMove(ev); const mu = (ev)=>{ onEnd(ev); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu);} ; window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu); });
  })();
  // ===== end swipe-to-close =====


  // Settings drawer
  if(btnSettings) btnSettings.addEventListener('click', ()=> { if(settingsDrawer) settingsDrawer.hidden = !settingsDrawer.hidden; });
  if(btnCloseSettings) btnCloseSettings.addEventListener('click', ()=> { if(settingsDrawer) settingsDrawer.hidden = true; });

  // Hint / shuffle / bomb
  if(btnHint) btnHint.addEventListener('click', ()=> {
    if(window.GameAPI && window.GameAPI.getHint){
      const h = window.GameAPI.getHint();
      if(!h) alert('No hint available');
      else {
        const a = h[0], b = h[1];
        const cells = document.querySelectorAll('.cell');
        const idx = a.r*8 + a.c, jdx = b.r*8 + b.c;
        const el = cells[idx], el2 = cells[jdx];
        if(el && el2){
          el.style.outline = '3px solid #ffd166'; el2.style.outline = '3px solid #ffd166';
          setTimeout(()=>{ el.style.outline=''; el2.style.outline=''; }, 900);
        }
      }
    }
  });

  if(btnShuffle) btnShuffle.addEventListener('click', ()=> { if(window.GameAPI && window.GameAPI.applyShuffle) window.GameAPI.applyShuffle(); });
  if(btnBomb) btnBomb.addEventListener('click', ()=> { if(window.GameAPI && window.GameAPI.applyBomb) window.GameAPI.applyBomb(); });

  if(btnResetProgress) btnResetProgress.addEventListener('click', ()=> {
    if(confirm('Reset progress?')){
      window.StorageAPI && window.StorageAPI.resetAll && window.StorageAPI.resetAll();
      renderMap();
      alert('Progress reset.');
    }
  });

  // HUD updater
  let hudInterval = null;
  function startHUDUpdater(){
    if(hudInterval) clearInterval(hudInterval);
    hudInterval = setInterval(()=>{
      if(window.GameAPI && window.GameAPI.getState){
        const s = window.GameAPI.getState();
        navScore && (navScore.textContent = s.score || 0);
        navMoves && (navMoves.textContent = s.moves || 0);
        navCombo && (navCombo.textContent = 'x' + (s.combo || 1));
        if(navTarget && window.LevelMap && window.LevelMap.getMeta) {
          const meta = window.LevelMap.getMeta(s.level || 1);
          navTarget.textContent = meta ? meta.target : '';
        }
      }
    }, 300);
  }

  // Nav.showGameOver integration (calls confetti when win)
  window.Nav = {
    showGameOver(win, score, level){
      if(win && window.Confetti && typeof window.Confetti.launch === 'function'){
        const count = Math.min(160, Math.floor(window.innerWidth / 6) + 40);
        window.Confetti.launch({ count: count, spread: 90, lifetime: 2000 });
      }
      const goTitle = document.getElementById('go-title');
      const goScore = document.getElementById('go-score');
      const goBest = document.getElementById('go-best-score');
      if(goTitle) goTitle.textContent = win? `Level ${level} Complete!` : `Level ${level} Over`;
      if(goScore) goScore.textContent = score;
      if(goBest && window.StorageAPI && window.StorageAPI.getBest) goBest.textContent = window.StorageAPI.getBest(level) || 0;
      if(win) window.StorageAPI && window.StorageAPI.unlock && window.StorageAPI.unlock(level+1);
      showScreen('gameover');
    }
  };

  // init
  function init(){
    preloadCandyImages();
    renderMap();
    const h = location.hash.replace('#','');
    if(h && screens[h]) showScreen(h); else showScreen('home');
  }
  document.addEventListener('DOMContentLoaded', init);

  // expose for debugging
  window.AppNav = { openPause, closePause };

})();
<script>
(function(){
  // safety: wait until DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    // small helper to parse current level from UI if window._currentLevel not set
    function getCurrentLevelFromUI(){
      if(window._currentLevel) return window._currentLevel;
      const title = document.getElementById('go-title') || document.getElementById('game-title');
      if(title){
        const m = title.textContent.match(/Level\s*(\d+)/i);
        if(m) return parseInt(m[1],10);
      }
      return 1;
    }

    // expose current level setter (call from your startLevel if possible)
    window.setCurrentLevel = function(n){ window._currentLevel = Number(n); };

    // attach handlers (id must match your HTML)
    const btnReplay = document.getElementById('btn-replay');
    const btnNext   = document.getElementById('btn-next');
    const btnToMap  = document.getElementById('btn-to-map');

    // helper: navigate to map (tries many fallbacks)
    function goToMap(){
      if(typeof navigateTo === 'function') return navigateTo('map');
      if(typeof showScreen === 'function') return showScreen('map');
      if(window.Nav && typeof window.Nav.renderMap === 'function'){ window.Nav.renderMap(); }
      // fallback: toggle class
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      const mg = document.getElementById('screen-map'); if(mg) mg.classList.add('active');
    }

    // handler implementations
    function handleReplay(){
      const lvl = getCurrentLevelFromUI();
      console.log('REPLAY level', lvl);
      // prefer GameAPI.reset()
      if(window.GameAPI && typeof window.GameAPI.reset === 'function'){
        try{ window.GameAPI.reset(); return; } catch(e){ console.warn(e); }
      }
      // fallback: re-init same level
      if(window.GameAPI && typeof window.GameAPI.initGame === 'function'){
        window.GameAPI.initGame(lvl); return;
      }
      // fallback UI: just show game screen and call Nav.startLevel if exists
      if(window.Nav && typeof window.Nav.startLevel === 'function'){ window.Nav.startLevel(lvl); return; }
      // last fallback: navigate to game screen
      showScreen && showScreen('game');
    }

    function handleNext(){
      const lvl = getCurrentLevelFromUI();
      const next = Number(lvl)+1;
      console.log('NEXT ->', next);
      // unlock next if StorageAPI available
      if(window.StorageAPI && typeof window.StorageAPI.unlock === 'function'){
        try{ window.StorageAPI.unlock(next); } catch(e){ console.warn(e); }
      }
      // start next if possible
      if(window.GameAPI && typeof window.GameAPI.initGame === 'function'){
        window.GameAPI.initGame(next); return;
      }
      if(window.Nav && typeof window.Nav.startLevel === 'function'){ window.Nav.startLevel(next); return; }
      // otherwise go to map so user can tap level
      goToMap();
      setTimeout(()=>{ // optionally highlight card
        const card = document.querySelector(`.level-card[data-level="${next}"]`);
        if(card) card.style.boxShadow = '0 12px 30px rgba(66,165,245,0.22)';
      },200);
    }

    function handleMap(){
      console.log('MAP pressed');
      goToMap();
    }

    // attach with safety checks and a small debug feedback
    if(btnReplay) btnReplay.addEventListener('click', function(e){ e.preventDefault(); handleReplay(); });
    else console.warn('btn-replay not found');

    if(btnNext) btnNext.addEventListener('click', function(e){ e.preventDefault(); handleNext(); });
    else console.warn('btn-next not found');

    if(btnToMap) btnToMap.addEventListener('click', function(e){ e.preventDefault(); handleMap(); });
    else console.warn('btn-to-map not found');

    // quick visual debug: flash buttons to show listeners attached
    [btnReplay, btnNext, btnToMap].forEach(b=>{
      if(!b) return;
      b.style.transition = 'transform .12s';
      b.addEventListener('click', ()=>{ b.style.transform = 'scale(.98)'; setTimeout(()=>b.style.transform='scale(1)',120); });
    });

    // Optional: if your startLevel doesn't set current level, auto-set when game screen opens
    // If your code calls startLevel(level) somewhere, try to call window.setCurrentLevel(level) there.
    console.log('Game buttons handler attached (replay/next/map). CurrentLevel:', window._currentLevel || getCurrentLevelFromUI());
  });
})();
</script>

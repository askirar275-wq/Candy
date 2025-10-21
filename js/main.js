// js/main.js - Navigation + small flow manager (with improved pause modal handling)
(function(){
  const screens = {
    home: document.getElementById('screen-home'),
    map: document.getElementById('screen-map'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover')
  };

  const btnPlay = document.getElementById('btn-play');
  const btnOpenMap = document.getElementById('btn-open-map');
  const mapGrid = document.getElementById('map-grid');
  const gameTitle = document.getElementById('game-title');
  const boardPlaceholder = document.getElementById('board-placeholder');
  const goTitle = document.getElementById('go-title');
  const goScore = document.getElementById('go-score');

  const navScore = document.getElementById('nav-score');
  const navMoves = document.getElementById('nav-moves');
  const navTarget = document.getElementById('nav-target');
  const navCombo = document.getElementById('nav-combo');

  const btnRestart = document.getElementById('btn-restart-level');
  const btnEnd = document.getElementById('btn-end-level');
  const btnReplay = document.getElementById('btn-replay');
  const btnNext = document.getElementById('btn-next');
  const btnToMap = document.getElementById('btn-to-map');

  // Pause modal elements
  const btnPause = document.getElementById('btn-pause');
  const pauseModal = document.getElementById('pause-modal');
  const btnResume = document.getElementById('btn-resume');
  const btnRestart2 = document.getElementById('btn-restart2');
  const btnQuit = document.getElementById('btn-quit');

  // Settings & small controls
  const btnHint = document.getElementById('btn-hint');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnBomb = document.getElementById('btn-use-bomb');
  const btnSettings = document.getElementById('btn-settings');
  const settingsDrawer = document.getElementById('settings-drawer');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnResetProgress = document.getElementById('btn-reset-progress');

  document.querySelectorAll('.back').forEach(b => b.addEventListener('click', (e)=>{
    const target = e.currentTarget.dataset.target || 'home';
    navigateTo(target);
  }));

  function getUnlocked(){ return (window.StorageAPI && window.StorageAPI.getUnlocked) ? window.StorageAPI.getUnlocked() : [1]; }
  function unlockLevel(n){ window.StorageAPI && window.StorageAPI.unlock && window.StorageAPI.unlock(n); }

  const LEVEL_COUNT = 12;

  // preload candy images to avoid flicker
  function preloadCandyImages() {
    for(let i=1;i<=5;i++){
      const img = new Image();
      img.src = `images/candy${i}.png`;
    }
  }

  function renderMap(){
    if(!mapGrid) return;
    mapGrid.innerHTML = '';
    const unlocked = new Set(getUnlocked());
    for(let i=1;i<=LEVEL_COUNT;i++){
      const card = document.createElement('div');
      card.className = 'level-card' + (unlocked.has(i) ? '' : ' locked');
      card.dataset.level = i;

      const thumb = document.createElement('div');
      thumb.className = 'level-thumb';
      const candyRow = document.createElement('div');
      candyRow.className = 'candies';
      for(let c=0;c<5;c++){
        const img = document.createElement('img');
        img.src = `images/candy${(c%5)+1}.png`;
        img.alt = 'candy';
        candyRow.appendChild(img);
      }
      thumb.appendChild(candyRow);

      const lvl = document.createElement('div');
      lvl.className = 'lvl';
      lvl.textContent = `Level ${i}`;

      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = unlocked.has(i) ? 'Play' : 'Locked';

      card.appendChild(thumb);
      card.appendChild(lvl);
      card.appendChild(desc);

      card.addEventListener('click', ()=> {
        if(!unlocked.has(i)){ alert('Level locked — complete previous levels to unlock.'); return; }
        startLevel(i);
      });

      mapGrid.appendChild(card);
    }
  }

  function showScreen(name){
    Object.values(screens).forEach(s=> s.classList.remove('active'));
    if(screens[name]) screens[name].classList.add('active');
  }

  function navigateTo(name, state = {}){
    history.pushState({screen:name, state}, '', `#${name}`);
    showScreen(name);
  }

  function startLevel(level){
    gameTitle.textContent = `Level ${level}`;
    showScreen('game');
    if(window.GameAPI && typeof window.GameAPI.initGame === 'function'){
      window.GameAPI.initGame(level);
      updateHUDLoop();
    } else {
      if(boardPlaceholder) boardPlaceholder.style.display = 'block';
      const b = document.getElementById('board'); if(b) b.style.display = 'none';
      fakePlayDemo(level);
    }
  }

  function fakePlayDemo(level){
    navScore.textContent = 0;
    navMoves.textContent = 30;
    setTimeout(()=>{
      const fakeScore = 800 + level*100;
      showGameOver(true, fakeScore, level);
      unlockLevel(level+1);
      renderMap();
    }, 1600);
  }

  function showGameOver(win, score, level){
    goTitle.textContent = win ? `Level ${level} Complete!` : `Level ${level} Failed`;
    goScore.textContent = score;
    showScreen('gameover');
  }

  // ===== Pause modal behavior (improved) =====
  // open pause: lock scrolling / show modal
  if(btnPause){
    btnPause.addEventListener('click', ()=>{
      if(!pauseModal) return;
      pauseModal.hidden = false;
      // lock body scroll & touch
      document.body.classList.add('modal-open');
      // if GameAPI has a pause/timer, stop it (optional)
      if(window.GameAPI && window.GameAPI.pause) try{ window.GameAPI.pause(); }catch(e){}
    });
  }

  if(btnResume){
    btnResume.addEventListener('click', ()=>{
      if(!pauseModal) return;
      pauseModal.hidden = true;
      document.body.classList.remove('modal-open');
      if(window.GameAPI && window.GameAPI.resume) try{ window.GameAPI.resume(); }catch(e){}
    });
  }

  if(btnRestart2){
    btnRestart2.addEventListener('click', ()=>{
      if(!pauseModal) return;
      pauseModal.hidden = true;
      document.body.classList.remove('modal-open');
      if(window.GameAPI && window.GameAPI.reset) window.GameAPI.reset();
    });
  }

  if(btnQuit){
    btnQuit.addEventListener('click', ()=>{
      if(!pauseModal) return;
      pauseModal.hidden = true;
      document.body.classList.remove('modal-open');
      // navigate back to map
      navigateTo('map');
    });
  }
  // ===== end pause modal =====

  // Settings drawer
  if(btnSettings) btnSettings.addEventListener('click', ()=> { if(settingsDrawer) settingsDrawer.hidden = !settingsDrawer.hidden; });
  if(btnCloseSettings) btnCloseSettings.addEventListener('click', ()=> { if(settingsDrawer) settingsDrawer.hidden = true; });

  // Hint / shuffle / bomb actions
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
          el.style.outline = '3px solid #ffd166';
          el2.style.outline = '3px solid #ffd166';
          setTimeout(()=>{ el.style.outline=''; el2.style.outline=''; }, 900);
        }
      }
    }
  });

  if(btnShuffle) btnShuffle.addEventListener('click', ()=> {
    if(window.GameAPI && window.GameAPI.applyShuffle) window.GameAPI.applyShuffle();
  });

  if(btnBomb) btnBomb.addEventListener('click', ()=> {
    if(window.GameAPI && window.GameAPI.applyBomb) window.GameAPI.applyBomb();
  });

  if(btnResetProgress) btnResetProgress.addEventListener('click', ()=> {
    if(confirm('Reset progress?')){
      window.StorageAPI && window.StorageAPI.resetAll && window.StorageAPI.resetAll();
      renderMap();
      alert('Progress reset.');
    }
  });

  let hudInterval = null;
  function updateHUDLoop(){
    if(hudInterval) clearInterval(hudInterval);
    hudInterval = setInterval(()=>{
      if(window.GameAPI && window.GameAPI.getState){
        const st = window.GameAPI.getState();
        navScore.textContent = st.score || 0;
        navMoves.textContent = st.moves || 0;
        if(navCombo) navCombo.textContent = 'x' + (st.combo || 1);
        if(navTarget) {
          const meta = window.LevelMap && window.LevelMap.getMeta ? window.LevelMap.getMeta(st.level || 1) : null;
          navTarget.textContent = meta ? meta.target : '';
        }
      }
    }, 300);
  }

  window.addEventListener('popstate', (ev)=>{
    const state = ev.state;
    if(state && state.screen) showScreen(state.screen);
    else showScreen('home');
  });

  function init(){
    preloadCandyImages();
    renderMap();
    const h = location.hash.replace('#','');
    if(h && screens[h]) showScreen(h);
    else showScreen('home');
  }

  window.Nav = {
    startLevel(level){ startLevel(level); },
    showGameOver(win, score, level){
      // call confetti if present and win
      if(win && window.Confetti && typeof window.Confetti.launch === 'function'){
        const count = Math.min(160, Math.floor(window.innerWidth / 6) + 40);
        window.Confetti.launch({ count: count, spread: 90, lifetime: 2200 });
      }
      // show screen and update texts
      const goTitleEl = document.getElementById('go-title');
      const goScoreEl = document.getElementById('go-score');
      const goBestEl = document.getElementById('go-best-score');
      if(goTitleEl) goTitleEl.textContent = win ? `Level ${level} Complete!` : `Level ${level} Over`;
      if(goScoreEl) goScoreEl.textContent = score;
      if(goBestEl && window.StorageAPI && window.StorageAPI.getBest) goBestEl.textContent = window.StorageAPI.getBest(level) || 0;
      // unlock next level if win
      if(win) window.StorageAPI && window.StorageAPI.unlock && window.StorageAPI.unlock(level+1);
      showScreen('gameover');
    },
    renderMap(){ renderMap(); }
  };

  function preloadCandyImages() {
    for(let i=1;i<=5;i++){
      const img = new Image();
      img.src = `images/candy${i}.png`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();

// js/main.js - Navigation + small flow manager (with enhanced renderMap)
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
  const btnRestart = document.getElementById('btn-restart-level');
  const btnEnd = document.getElementById('btn-end-level');
  const btnReplay = document.getElementById('btn-replay');
  const btnNext = document.getElementById('btn-next');
  const btnToMap = document.getElementById('btn-to-map');

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

  btnPlay && btnPlay.addEventListener('click', ()=> { renderMap(); navigateTo('map'); });
  btnOpenMap && btnOpenMap.addEventListener('click', ()=> { renderMap(); navigateTo('map'); });

  if(btnRestart) btnRestart.addEventListener('click', ()=> { if(window.GameAPI && window.GameAPI.reset) window.GameAPI.reset(); });
  if(btnEnd) btnEnd.addEventListener('click', ()=> {
    if(window.GameAPI && window.GameAPI.getState){ const st = window.GameAPI.getState(); showGameOver(false, st.score||0, st.level||1); }
    else showGameOver(false,0,1);
  });
  if(btnReplay) btnReplay.addEventListener('click', ()=> { if(window.GameAPI && window.GameAPI.reset) window.GameAPI.reset(); navigateTo('game'); });
  if(btnNext) btnNext.addEventListener('click', ()=> {
    if(window.GameAPI && window.GameAPI.getState){
      const cur = window.GameAPI.getState(); const next = (cur.level||1)+1; unlockLevel(next); renderMap(); startLevel(next);
    } else { const unlocked = getUnlocked(); const next = Math.min(unlocked[unlocked.length-1]+1, LEVEL_COUNT); unlockLevel(next); renderMap(); startLevel(next); }
  });
  if(btnToMap) btnToMap.addEventListener('click', ()=> { renderMap(); navigateTo('map'); });

  let hudInterval = null;
  function updateHUDLoop(){
    if(hudInterval) clearInterval(hudInterval);
    hudInterval = setInterval(()=>{
      if(window.GameAPI && window.GameAPI.getState){
        const st = window.GameAPI.getState();
        navScore.textContent = st.score || 0;
        navMoves.textContent = st.moves || 0;
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

  window.Nav = { startLevel, showGameOver, unlockLevel, navigateTo, renderMap };
  document.addEventListener('DOMContentLoaded', init);
})();

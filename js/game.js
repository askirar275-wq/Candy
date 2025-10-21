// js/main.js - Navigation + small flow manager
(function(){
  // Screen elements
  const screens = {
    home: document.getElementById('screen-home'),
    map: document.getElementById('screen-map'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover')
  };

  // UI elements
  const btnPlay = document.getElementById('btn-play');
  const btnOpenMap = document.getElementById('btn-open-map');
  const mapGrid = document.getElementById('map-grid');
  const gameTitle = document.getElementById('game-title');
  const boardPlaceholder = document.getElementById('board-placeholder');
  const goTitle = document.getElementById('go-title');
  const goScore = document.getElementById('go-score');

  // game sidebar controls
  const navScore = document.getElementById('nav-score');
  const navMoves = document.getElementById('nav-moves');
  const btnRestart = document.getElementById('btn-restart-level');
  const btnEnd = document.getElementById('btn-end-level');
  const btnReplay = document.getElementById('btn-replay');
  const btnNext = document.getElementById('btn-next');
  const btnToMap = document.getElementById('btn-to-map');

  // back buttons (declared in markup)
  document.querySelectorAll('.back').forEach(b => b.addEventListener('click', (e)=>{
    const target = e.currentTarget.dataset.target || 'home';
    navigateTo(target);
  }));

  // Simple persistent storage for unlocked levels
  const STORAGE_KEY = 'cm_unlocked_levels_v1';
  function getUnlocked(){
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if(!v) return [1]; // level 1 unlocked
      return JSON.parse(v);
    } catch(e){ return [1]; }
  }
  function setUnlocked(list){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function unlockLevel(n){
    const list = new Set(getUnlocked());
    list.add(n);
    setUnlocked(Array.from(list).sort((a,b)=>a-b));
  }

  // sample number of levels
  const LEVEL_COUNT = 12;

  // render map/grid of levels
  function renderMap(){
    mapGrid.innerHTML = '';
    const unlocked = new Set(getUnlocked());
    for(let i=1;i<=LEVEL_COUNT;i++){
      const card = document.createElement('div');
      card.className = 'level-card' + (unlocked.has(i) ? '' : ' locked');
      card.dataset.level = i;
      card.innerHTML = `<div class="lvl">Level ${i}</div><div class="desc">${unlocked.has(i)?'Play':'Locked'}</div>`;
      card.addEventListener('click', ()=> {
        if(!unlocked.has(i)){ alert('Level locked — complete previous levels to unlock.'); return; }
        startLevel(i);
      });
      mapGrid.appendChild(card);
    }
  }

  // navigation
  function showScreen(name){
    Object.values(screens).forEach(s=> s.classList.remove('active'));
    if(screens[name]) screens[name].classList.add('active');
  }

  function navigateTo(name, state = {}){
    // push to history so native back works
    history.pushState({screen:name, state}, '', `#${name}`);
    showScreen(name);
  }

  // Start gameplay - calls GameAPI if available
  function startLevel(level){
    gameTitle.textContent = `Level ${level}`;
    showScreen('game');
    // try to init game via GameAPI (provided by your game-core.js)
    if(window.GameAPI && typeof window.GameAPI.initGame === 'function'){
      window.GameAPI.initGame(level);
      // optionally poll UI values
      updateHUDLoop();
    } else {
      // placeholder: show message in board
      boardPlaceholder.textContent = `Game engine not found. Level ${level} would run here.`;
      // simulate a fake score and then go to game over for demo
      fakePlayDemo(level);
    }
  }

  // fake demo (only when GameAPI not present) — shows game over after 2s
  function fakePlayDemo(level){
    navScore.textContent = 0;
    navMoves.textContent = 30;
    setTimeout(()=>{
      const fakeScore = 1200 + level*100;
      showGameOver(true, fakeScore, level);
      unlockLevel(level+1);
      renderMap();
    }, 1500);
  }

  // show game over screen
  function showGameOver(win, score, level){
    goTitle.textContent = win ? `Level ${level} Complete!` : `Level ${level} Failed`;
    goScore.textContent = score;
    showScreen('gameover');
  }

  // Link buttons
  btnPlay.addEventListener('click', ()=> {
    // default Play -> map
    renderMap();
    navigateTo('map');
  });
  btnOpenMap.addEventListener('click', ()=> { renderMap(); navigateTo('map'); });

  // restart / end / replay / next buttons
  if(btnRestart) btnRestart.addEventListener('click', ()=> {
    // restart via GameAPI if available
    if(window.GameAPI && window.GameAPI.reset) window.GameAPI.reset();
  });
  if(btnEnd) btnEnd.addEventListener('click', ()=> {
    // end level (report game over)
    if(window.GameAPI && window.GameAPI.getState){
      const st = window.GameAPI.getState();
      showGameOver(false, st.score||0, st.level||1);
    } else {
      showGameOver(false, 0, 1);
    }
  });
  if(btnReplay) btnReplay.addEventListener('click', ()=> {
    // replay current level
    if(window.GameAPI && window.GameAPI.reset) window.GameAPI.reset();
    navigateTo('game');
  });
  if(btnNext) btnNext.addEventListener('click', ()=> {
    // next level (unlock and start)
    if(window.GameAPI && window.GameAPI.getState){
      const cur = window.GameAPI.getState();
      const next = (cur.level || 1) + 1;
      unlockLevel(next);
      renderMap();
      startLevel(next);
    } else {
      // fallback: pick next unlocked
      const unlocked = getUnlocked();
      const next = Math.min(unlocked[unlocked.length-1]+1, LEVEL_COUNT);
      unlockLevel(next);
      renderMap();
      startLevel(next);
    }
  });
  if(btnToMap) btnToMap.addEventListener('click', ()=> { renderMap(); navigateTo('map'); });

  // HUD update loop (if GameAPI present)
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

  // handle popstate (back/forward)
  window.addEventListener('popstate', (ev)=>{
    const state = ev.state;
    if(state && state.screen) showScreen(state.screen);
    else showScreen('home');
  });

  // initial load: if hash present, navigate there
  function init(){
    renderMap();
    const h = location.hash.replace('#','');
    if(h && screens[h]) showScreen(h);
    else showScreen('home');

    // quick demo hook: if GameAPI exists, register onUpdate to get game over callback
    if(window.LevelMap && window.LevelMap.onUpdate && window.GameAPI){
      // optional: LevelMap can call this; left for advanced integration
    }
  }

  // expose small API if needed
  window.Nav = {
    startLevel,
    showGameOver,
    unlockLevel,
    navigateTo,
    renderMap
  };

  document.addEventListener('DOMContentLoaded', init);
})();

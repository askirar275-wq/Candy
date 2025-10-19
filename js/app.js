// small glue between UI and engine
document.addEventListener('DOMContentLoaded', ()=>{

  const pages = {
    home: document.querySelector('#homePage'),
    map: document.querySelector('#mapPage'),
    game: document.querySelector('#gamePage')
  };

  function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const sel = (id==='home') ? '#homePage' : (id==='map' ? '#mapPage' : '#gamePage');
    document.querySelector(sel).classList.add('active');
  }
  window.showPage = showPage; // for engine usage if needed

  // buttons
  document.getElementById('btnStart').addEventListener('click', ()=> {
    // go to map first
    showPage('map');
    buildMap();
  });

  document.getElementById('btnPacks').addEventListener('click', ()=> {
    document.getElementById('packModal').classList.remove('hidden');
  });
  document.getElementById('closePacks').addEventListener('click', ()=> document.getElementById('packModal').classList.add('hidden'));
  document.getElementById('pack-classic').addEventListener('click', ()=> { CandyEngine.setImagePack('classic'); document.getElementById('packModal').classList.add('hidden')});
  document.getElementById('pack-neon').addEventListener('click', ()=> { CandyEngine.setImagePack('neon'); document.getElementById('packModal').classList.add('hidden')});

  // map page
  const buildMap = ()=> {
    if (typeof CandyEngine !== 'undefined') {
      // build via engine helper
      CandyEngine.getUnlockedLevels; // just ensure loaded
      // call engine's map builder if exists
      if (typeof window.buildMap === 'function') window.buildMap();
      else {
        // fallback: call engine buildMap by triggering the DOM building via engine (we exported it earlier)
        const mapList = document.querySelector('#mapList');
        mapList.innerHTML = '';
        const unlocked = JSON.parse(localStorage.getItem('unlockedLevels')||'[1]');
        for(const cfg of LEVELS){
          const item = document.createElement('div');
          item.className = 'map-item';
          item.textContent = `Level ${cfg.level} — Goal: ${cfg.goalScore}`;
          if (!unlocked.includes(cfg.level)) { item.style.opacity='0.45'; item.innerHTML+= ' 🔒'; }
          else item.addEventListener('click', ()=> window.CandyEngine.startLevel(cfg.level));
          mapList.appendChild(item);
        }
      }
    }
  };
  // expose for engine
  window.buildMap = buildMap;

  document.getElementById('backFromMap').addEventListener('click', ()=> showPage('home'));
  document.getElementById('btnBackHome').addEventListener('click', ()=> showPage('home'));
  document.getElementById('btnOpenMap').addEventListener('click', ()=> { showPage('map'); buildMap(); });

  // game controls
  document.getElementById('btnRestart').addEventListener('click', ()=> {
    const lvl = document.querySelector('#hud-level').textContent || 1;
    window.CandyEngine.startLevel(Number(lvl));
  });
  document.getElementById('btnShuffle').addEventListener('click', ()=> CandyEngine.shuffleBoard());

  // level complete modal
  const lc = document.getElementById('levelComplete');
  document.getElementById('closeLC').addEventListener('click', ()=> lc.classList.add('hidden'));
  document.getElementById('nextLevelBtn').addEventListener('click', ()=> {
    lc.classList.add('hidden');
    const cur = Number(document.querySelector('#hud-level').textContent || 1);
    const next = cur+1;
    if (LEVELS.find(l=>l.level===next)) window.CandyEngine.startLevel(next);
    else alert('No more levels configured yet. Add in config.js');
  });

  // start at home
  showPage('home');

  // initialize default pack background
  const pack = IMAGE_PACKS[Object.keys(IMAGE_PACKS)[0]];
  if (pack && pack.bg) document.body.style.backgroundImage = `url("${pack.bg}")`;

  // small: if user refreshes and had unlocked levels, reflect that on map
  buildMap();
});

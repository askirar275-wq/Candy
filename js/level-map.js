// js/level-map.js
(function(){
  const TOTAL = 10; // total nodes/levels to show
  const STORAGE_KEY = 'candy_level_v1'; // same key used by game/storage
  const mapPath = document.getElementById('mapPath');
  const toast = document.getElementById('mapToast');

  function getUnlocked(){ return Number(localStorage.getItem(STORAGE_KEY) || 1); }
  function setLevel(v){ localStorage.setItem(STORAGE_KEY, String(v)); }

  function showToast(text,timeout=1800){
    if(!toast) return;
    toast.textContent = text;
    toast.style.display='block';
    setTimeout(()=>{ toast.style.display='none'; }, timeout);
  }

  function createNode(i){
    const node = document.createElement('div');
    node.className = 'level-node level-pos-' + i;
    node.dataset.level = i;
    node.innerHTML = `<div style="text-align:center">
                        <div style="font-size:20px">🍬</div>
                        <div style="font-size:14px;margin-top:4px">${i}</div>
                      </div>`;
    const label = document.createElement('div');
    label.className='level-label';
    label.textContent = `Level ${i}`;
    const badge = document.createElement('div');
    badge.className='node-badge';
    badge.textContent = i===1 ? '★' : (i % 5 === 0 ? '👑' : '');
    node.appendChild(badge);
    node.appendChild(label);
    return node;
  }

  function buildMap(){
    if(!mapPath) return;
    const unlocked = getUnlocked();
    mapPath.innerHTML = '';
    for(let i=1;i<=TOTAL;i++){
      const n = createNode(i);
      if(i<=unlocked){
        n.classList.add('active');
        n.addEventListener('click', ()=> {
          setLevel(i);
          showToast('Level '+i+' selected — खेल शुरू हो रहा है...');
          // delay a bit then go to index (game)
          setTimeout(()=>{ window.location.href = 'index.html'; }, 700);
        });
      } else {
        n.classList.add('locked');
        n.addEventListener('click', ()=> {
          showToast('यह level अभी locked है');
        });
      }
      mapPath.appendChild(n);
    }
  }

  // back to home button
  const backBtn = document.getElementById('mapBackBtn');
  if(backBtn) backBtn.addEventListener('click', ()=>{ window.location.href='index.html'; });

  // update coins bubble (optional if you use StorageAPI)
  const coinsEl = document.getElementById('mapCoins');
  function updateCoins(){
    let coins = 0;
    try {
      // try StorageAPI if present
      if(window.StorageAPI && typeof StorageAPI.getCoins === 'function') coins = StorageAPI.getCoins();
      else coins = Number(localStorage.getItem('candy_coins_v1') || 0);
    } catch(e){}
    if(coinsEl) coinsEl.textContent = coins;
  }

  // init
  document.addEventListener('DOMContentLoaded', ()=>{
    buildMap();
    updateCoins();
    console.log('Level map ready');
  });

  // expose for debug
  window._mapRebuild = buildMap;
})();

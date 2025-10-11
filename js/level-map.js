// js/level-map.js — map logic with animated clouds & background parallax
(function(){
  const TOTAL = 10;
  const STORAGE_KEY = 'candy_level_v1';
  const pathNode = document.getElementById('levelNodes');
  const toast = document.getElementById('mapToast');
  const coinsEl = document.getElementById('mapCoins');
  const container = document.getElementById('mapContainer');
  const cloudsEl = document.getElementById('bgClouds');
  const jungleEl = document.getElementById('bgJungle');

  function getLevel(){ return Number(localStorage.getItem(STORAGE_KEY) || 1); }
  function setLevel(v){ localStorage.setItem(STORAGE_KEY, v); }

  function showToast(text, time=1400){
    if(!toast) return;
    toast.textContent = text;
    toast.style.display = 'block';
    setTimeout(()=> toast.style.display='none', time);
  }

  // decorative sparkles + clouds movement
  function buildDecorations(){
    // sparkles
    const totalSpark = 12;
    for(let i=0;i<totalSpark;i++){
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.left = (10 + Math.random()*80) + '%';
      s.style.top = (40 + Math.random()*1400) + 'px';
      s.style.animationDelay = (Math.random()*3)+'s';
      container.appendChild(s);
    }
    // animate clouds by changing background-positionX periodically
    if(cloudsEl){
      let t = 0;
      setInterval(()=>{
        t += 0.3;
        cloudsEl.style.backgroundPosition = `${- (t % 800)}px center`;
      }, 80);
    }
    // small parallax on scroll for jungle layer
    document.addEventListener('scroll', ()=>{
      if(!jungleEl) return;
      const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1);
      jungleEl.style.transform = `translateY(${pct * 40}px)`;
    }, {passive:true});
  }

  // create a level node element
  function createNode(i, yPx){
    const node = document.createElement('div');
    node.className = 'level-node';
    node.style.top = yPx + 'px';
    // image pick (6 candy images loop)
    const img = document.createElement('img');
    const idx = ((i-1) % 6) + 1;
    img.src = `images/candy${idx}.png`;
    img.alt = 'level-' + i;
    const label = document.createElement('span');
    label.textContent = i;
    node.appendChild(img);
    node.appendChild(label);
    return node;
  }

  function buildNodes(){
    const unlocked = getLevel();
    pathNode.innerHTML = '';
    // place nodes evenly along the path: y positions chosen to align with SVG path
    for(let i=1;i<=TOTAL;i++){
      // spacing: 120px per level (adjust if you change CSS path height)
      const y = i * 140 + 40;
      const node = createNode(i, y);
      if(i <= unlocked){
        node.classList.add('unlocked');
        node.addEventListener('click', ()=>{
          setLevel(i);
          showToast('🍬 Level ' + i + ' selected!');
          setTimeout(()=> window.location.href = 'index.html', 700);
        });
      } else {
        node.classList.add('locked');
        node.addEventListener('click', ()=> showToast('🔒 Level ' + i + ' locked!'));
      }
      pathNode.appendChild(node);
    }
  }

  // coins display: try to read from StorageAPI if present, else localStorage
  function updateCoins(){
    let coins = 0;
    try{
      if(window.StorageAPI && typeof StorageAPI.getCoins === 'function'){
        coins = StorageAPI.getCoins();
      } else {
        coins = Number(localStorage.getItem('candy_coins_v1') || 0);
      }
    }catch(e){}
    if(coinsEl) coinsEl.textContent = coins;
    const shopCoins = document.getElementById('shopCoins');
    if(shopCoins) shopCoins.textContent = coins;
  }

  // back button
  const back = document.getElementById('mapBackBtn');
  if(back) back.addEventListener('click', ()=> { window.location.href = 'index.html'; });

  document.addEventListener('DOMContentLoaded', ()=>{
    buildDecorations();
    buildNodes();
    updateCoins();
  });

  // expose for console/debug
  window.CandyMap = { rebuild: buildNodes, updateCoins: updateCoins, setLevel };
})();

// js/level-map.js
// Simple level map renderer and handlers
(function(){
  const $ = id => document.getElementById(id);

  // sample levels (real app should read unlocked level from StorageAPI)
  const LEVEL_COUNT = 30;
  // try to read unlocked level from StorageAPI if present
  const StorageAPI = window.StorageAPI || {
    // fallback simple storage
    getLevel: ()=> Number(localStorage.getItem('gameLevel')||1),
    setLevel: (l)=> localStorage.setItem('gameLevel', String(l))
  };

  function buildMap(){
    const container = $('levelPath');
    if(!container) {
      console.warn('levelPath element missing');
      return;
    }
    container.innerHTML = ''; // clear
    const row = document.createElement('div');
    row.className = 'level-row';
    container.appendChild(row);

    const unlocked = StorageAPI.getLevel ? StorageAPI.getLevel() : 1;
    for(let i=1;i<=LEVEL_COUNT;i++){
      const node = document.createElement('div');
      node.className = 'level-node' + (i>unlocked ? ' locked' : '');
      node.dataset.level = i;

      const img = document.createElement('img');
      // try to use your images if exist: images/level-<n>.png else use candy icon
      img.src = (i<=10) ? `images/candy${((i-1)%10)+1}.png` : 'images/candy1.png';
      img.alt = 'Level ' + i;
      node.appendChild(img);

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = i;
      node.appendChild(num);

      if(i <= unlocked){
        node.addEventListener('click', () => {
          console.log('Level clicked', i);
          // navigate to level (you can adjust path)
          // example: open game with ?level=i or separate URL
          // window.location.href = `game.html?level=${i}`;
          alert('Open level ' + i + ' — यहाँ अपना navigation डालें');
        });
      } else {
        // locked — show hint on click
        node.addEventListener('click', () => {
          console.log('Locked level clicked', i);
        });
      }

      row.appendChild(node);
    }
  }

  // back home button
  const back = $('backHome');
  if(back) back.addEventListener('click', () => {
    // go to index (adjust path if needed)
    window.location.href = 'index.html';
  });

  // init
  document.addEventListener('DOMContentLoaded', ()=>{
    try {
      buildMap();
      console.log('Level map built, unlocked level =', StorageAPI.getLevel ? StorageAPI.getLevel() : 1);
    } catch(e){
      console.error('Error building level map', e);
    }
  });

})();

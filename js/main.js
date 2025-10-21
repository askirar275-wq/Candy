// render map/grid of levels (enhanced visuals)
  function renderMap(){
    mapGrid.innerHTML = '';
    const unlocked = new Set(getUnlocked());
    for(let i=1;i<=LEVEL_COUNT;i++){
      const card = document.createElement('div');
      card.className = 'level-card' + (unlocked.has(i) ? '' : ' locked');
      card.dataset.level = i;

      // thumbnail area
      const thumb = document.createElement('div');
      thumb.className = 'level-thumb';

      // candy row inside thumbnail (if images exist, show images; otherwise show colored dots)
      const candyRow = document.createElement('div');
      candyRow.className = 'candies';

      // try to use images/candy1.png... if present else fallback colored SVGs
      for(let c=0;c<5;c++){
        const img = document.createElement('img');
        // image path assumption — if file missing browser will show broken image, but CSS fallback helps
        img.src = `images/candy${(c%5)+1}.png`;
        img.alt = 'candy';
        candyRow.appendChild(img);
      }
      thumb.appendChild(candyRow);

      // info
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

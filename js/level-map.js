// level-map.js
const LevelMap = {
  total: 9,
  render: () => {
    const grid = document.getElementById('levelGrid');
    const progress = Storage.getProgress();
    grid.innerHTML = '';
    for (let i = 1; i <= LevelMap.total; i++) {
      const card = document.createElement('div');
      card.className = 'level-card' + (progress.unlocked.includes(i) ? '' : ' locked');
      card.dataset.level = i;

      const thumb = document.createElement('div');
      thumb.className = 'level-thumb';
      // show 3 candy thumbnails (cycle images)
      for(let j=0;j<3;j++){
        const img = document.createElement('img');
        const idx = (i + j) % 5 + 1; // 1..5
        img.src = `images/candy${idx}.png`;
        img.alt = 'candy';
        thumb.appendChild(img);
      }

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = progress.unlocked.includes(i) ? `Level ${i} • Play` : `Level ${i} • Locked`;

      card.appendChild(thumb);
      card.appendChild(label);

      card.addEventListener('click', () => {
        if (!progress.unlocked.includes(i)){
          alert('Level locked — complete previous levels to unlock.');
          return;
        }
        // start level
        Game.start(i);
      });

      grid.appendChild(card);
    }
  }
};

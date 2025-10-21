const LevelMap = {
  total: 9,
  render: () => {
    const grid = document.getElementById('levelGrid');
    const progress = Storage.getProgress();
    grid.innerHTML = '';
    for (let i = 1; i <= LevelMap.total; i++) {
      const div = document.createElement('div');
      div.className = 'level' + (progress.unlocked.includes(i) ? '' : ' locked');
      div.textContent = progress.unlocked.includes(i) ? `Level ${i}` : `🔒 Level ${i}`;
      div.addEventListener('click', () => {
        if (!progress.unlocked.includes(i)) return alert('Locked Level');
        Game.start(i);
      });
      grid.appendChild(div);
    }
  }
};

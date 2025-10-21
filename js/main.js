const Nav = {
  show: (id) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('active');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Navigation buttons
  document.getElementById('playBtn').onclick = () => Nav.show('map');
  document.getElementById('mapBtn').onclick = () => Nav.show('map');
  document.getElementById('backHome').onclick = () => Nav.show('home');

  document.getElementById('endBtn').onclick = () => Game.end();
  document.getElementById('replayBtn').onclick = () => Game.start(Game.currentLevel);
  document.getElementById('nextBtn').onclick = () => Game.start(Game.currentLevel + 1);
  document.getElementById('mapReturn').onclick = () => Nav.show('map');
  document.getElementById('resetProgress').onclick = () => {
    if(confirm('Reset all progress?')) { Storage.reset(); LevelMap.render(); }
  };

  LevelMap.render();
});

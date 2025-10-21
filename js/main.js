// main.js
const Nav = {
  show: (id) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if(el){ el.classList.remove('hidden'); el.classList.add('active'); window.scrollTo(0,0); }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // hooks
  document.getElementById('playBtn').onclick = () => Nav.show('map');
  document.getElementById('mapBtn').onclick = () => Nav.show('map');
  document.getElementById('backHome').onclick = () => Nav.show('home');
  document.getElementById('mapBack').onclick = () => Nav.show('map');

  document.getElementById('endBtn').onclick = () => { Game.start(Game.getState().level); }; // quick restart
  document.getElementById('replayBtn').onclick = () => Game.start(Game.getState().level);
  document.getElementById('nextBtn').onclick = () => Game.start(Game.getState().level + 1);
  document.getElementById('mapReturn').onclick = () => Nav.show('map');

  document.getElementById('resetProgress').onclick = () => {
    if(confirm('Reset all progress?')) { Storage.reset(); LevelMap.render(); Nav.show('map'); }
  };

  // initial render of map
  LevelMap.render();
});

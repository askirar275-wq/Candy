// js/level-map.js (simple list of many levels)
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    console.log('Loaded: js/level-map.js (init)');
    var container = document.getElementById('levelsContainer');
    if(!container) return;
    var prog = window.Storage.get('candy_progress', {unlocked:[1],coins:0});
    var unlocked = prog.unlocked || [1];
    container.innerHTML = '';
    for(var i=1;i<=30;i++){
      var item = document.createElement('div');
      item.className = 'level-item';
      var lbl = document.createElement('div');
      lbl.textContent = 'Level ' + i;
      var btn = document.createElement('button');
      btn.className = 'btn';
      if(unlocked.indexOf(i) !== -1){
        btn.textContent = 'Play';
        (function(level){
          btn.onclick = function(){
            window.AppNav.showPage('game');
            // start level via CandyGame API (game.js must expose)
            setTimeout(function(){
              if(window.CandyGame && window.CandyGame.startLevel) {
                window.CandyGame.startLevel(level);
              } else {
                console.warn('CandyGame.startLevel not available yet');
              }
            }, 60);
          };
        }(i));
      } else {
        btn.textContent = '🔒';
        btn.className += ' lock';
      }
      item.appendChild(lbl);
      item.appendChild(btn);
      container.appendChild(item);
    }
  });
})();

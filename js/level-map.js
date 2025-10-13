// js/level-map.js
(function(){
  function $id(id){ return document.getElementById(id); }
  var LEVELS = [
    null,
    { id:1, title:'Beginner', goalScore:100, boardSize:8 },
    { id:2, title:'Explorer', goalScore:300, boardSize:8 },
    { id:3, title:'Challenger', goalScore:700, boardSize:9 },
    { id:4, title:'Master', goalScore:1500, boardSize:9 }
  ];

  window.renderLevelMap = function(){
    var wrap = $id('levelPath');
    if(!wrap){ console.warn('levelPath not found'); return; }
    wrap.innerHTML = '';
    var unlocked = StorageAPI.getLevel();
    var row = document.createElement('div'); row.className = 'level-row';
    LEVELS.forEach(function(l){
      if(!l) return;
      var node = document.createElement('div');
      node.className = 'level-node ' + (l.id <= unlocked ? 'unlocked' : 'locked');
      node.innerHTML = '<div style="font-weight:800;">' + l.id + '</div><div class="level-label">' + l.title + '</div>';
      if(l.id <= unlocked){
        node.addEventListener('click', function(){
          // set level and open game
          StorageAPI.setLevel(l.id);
          // update currentLevel element
          var cl = $id('currentLevel'); if(cl) cl.textContent = l.id;
          // switch screens
          var hs=$id('home-screen'), ms=$id('map-screen'), gs=$id('game-screen');
          if(ms) ms.classList.remove('active');
          if(gs) gs.classList.add('active');
          // try initGame
          if(typeof initGame === 'function'){ initGame(); } else console.warn('initGame not found yet');
        });
      }
      row.appendChild(node);
    });
    wrap.appendChild(row);

    // optionally add info row
    var info = document.createElement('div');
    info.className = 'note';
    info.textContent = 'Unlocked level: ' + unlocked + '. Tap any unlocked node to start that level.';
    wrap.appendChild(info);
  };

  console.log('Loaded: js/level-map.js');
})();

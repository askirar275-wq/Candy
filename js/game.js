/* js/game.js
   Wrapper that connects UI (buttons, pages) with GameCore.
   Exposes global Game with start/restart for index.html script to call.
*/

const Game = (function(){
  // Hook Level complete from core
  GameCore.setOnComplete(({score, level}) => {
    // show over page
    document.getElementById('overTitle').textContent = `Level ${level} Complete!`;
    document.getElementById('overScore').textContent = `Score: ${score}`;
    // show page-over
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-over').classList.add('active');
  });

  // public start
  function start(level = 1){
    // show game page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-game').classList.add('active');
    // start core
    GameCore.start(level);
    // ensure HUD target/moves are visible
    const s = GameCore.getState();
    if(document.getElementById('target')) document.getElementById('target').textContent = s.target;
    if(document.getElementById('moves')) document.getElementById('moves').textContent = s.moves;
    if(document.getElementById('score')) document.getElementById('score').textContent = s.score;
  }

  function restart(){
    const s = GameCore.getState();
    GameCore.start(s.currentLevel);
  }

  // Expose minimal API
  return { start, restart };
})();

// Expose global name for index.html to call
window.Game = Game;

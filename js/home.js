// js/home.js — अगर नहीं है तो यह पूरी फाइल बनाओ/append करो
function startGame(){
  // hide home, show game
  const home = document.getElementById('home-screen');
  const game = document.getElementById('game-screen');
  if(home) home.style.display = 'none';
  if(game) game.style.display = 'block';

  // अगर आपके game init का नाम initGame या createBoard है, उसे call करो
  if(!window._candyStarted){
    window._candyStarted = true;
    if(typeof window.initGame === 'function') window.initGame();
    else if(typeof window.createBoard === 'function') window.createBoard();
    else console.warn('Game init function not found. Check js/game.js for initGame/createBoard.');
  }
}

// अगर index.html मैं button id 'startBtn' है, तो add listener भी रखें
const startBtn = document.getElementById('startBtn');
if(startBtn) {
  startBtn.addEventListener('click', startGame);
}

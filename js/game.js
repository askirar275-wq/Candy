const Game = {
  currentLevel: 1,
  score: 0,
  moves: 30,
  start: (level) => {
    Game.currentLevel = level;
    Game.score = 0;
    Game.moves = 30;
    document.getElementById('score').textContent = 0;
    document.getElementById('moves').textContent = 30;
    document.getElementById('levelTitle').textContent = `Level ${level}`;
    Nav.show('game');

    const grid = GameCore.generateGrid();
    const gameGrid = document.getElementById('gameGrid');
    gameGrid.innerHTML = '';
    grid.forEach(() => {
      const candy = document.createElement('div');
      candy.style.background = ['#f44336','#ff9800','#ffeb3b','#4caf50','#2196f3'][Math.floor(Math.random()*5)];
      candy.style.borderRadius = '8px';
      candy.style.height = '55px';
      gameGrid.appendChild(candy);
    });
  },
  end: () => {
    document.getElementById('finalScore').textContent = Game.score;
    Storage.unlock(Game.currentLevel + 1);
    Nav.show('gameOver');
  }
};

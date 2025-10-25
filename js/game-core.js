// 🧠 Game Core - Candy Match main logic with debug logs
(function(global){
  console.log('[CORE] लोड हो गया ✅');

  const state = {
    score: 0,
    target: 1000,
    moves: 20,
    board: [],
    size: 6
  };

  function createBoard(){
    console.log('[CORE] Creating board...');
    const candies = ['🍬','🍭','🍩','🍫','🍪'];
    state.board = [];
    for(let i=0;i<state.size;i++){
      const row = [];
      for(let j=0;j<state.size;j++){
        const candy = candies[Math.floor(Math.random()*candies.length)];
        row.push(candy);
      }
      state.board.push(row);
    }
    console.log('[CORE] Board ready ✅', state.board);
    renderBoard();
  }

  function renderBoard(){
    const grid = document.getElementById('gameGrid');
    if(!grid){ console.error('[CORE] gameGrid नहीं मिला!'); return; }
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;

    for(let i=0;i<state.size;i++){
      for(let j=0;j<state.size;j++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.textContent = state.board[i][j];
        grid.appendChild(cell);
      }
    }
  }

  function addScore(points){
    state.score += points;
    console.log(`[CORE] +${points} points (Total: ${state.score})`);
    document.getElementById('score').textContent = state.score;

    if(state.score >= state.target){
      console.log('[CORE] 🎉 Level Complete!');
      Sound.play('win');
      Confetti.fire();
      alert('Level Complete!');
    }
  }

  global.GameCore = { createBoard, addScore, state };
  document.addEventListener('DOMContentLoaded', createBoard);
})(window);

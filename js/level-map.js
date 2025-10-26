// Level map UI + unlock logic
const LevelMapUI = (function(){
  const levelsEl = document.getElementById('levels');
  const LEVEL_COUNT = 30;
  const unlocked = Storage.get('unlockedLevels', [1]); // array of level numbers unlocked

  function render(){
    levelsEl.innerHTML = '';
    for(let i=1;i<=LEVEL_COUNT;i++){
      const div = document.createElement('div');
      div.className = 'level-item' + (unlocked.includes(i) ? '' : ' locked');
      div.innerHTML = `<div>Level ${i}</div>
        <div>
          ${unlocked.includes(i) ? `<button class="btn play" data-level="${i}">Play</button>` : `<span>🔒</span>`}
        </div>`;
      levelsEl.appendChild(div);
    }
  }

  // bind play buttons
  document.addEventListener('click', (e)=>{
    const p = e.target.closest('.play');
    if(!p) return;
    const level = Number(p.dataset.level||1);
    // set UI level number
    document.getElementById('level-num').textContent = level;
    // start game
    if(window.CandyGame && window.CandyGame.startLevel){
      window.CandyGame.startLevel(level);
      UI.showPage('game');
    } else {
      console.warn('CandyGame.startLevel not available yet');
    }
  });

  function unlockLevel(n){
    if(!unlocked.includes(n)){
      unlocked.push(n);
      Storage.set('unlockedLevels', unlocked);
      render();
    }
  }

  // initial render
  if(levelsEl) render();

  return { render, unlockLevel };
})();

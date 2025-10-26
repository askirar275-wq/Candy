// level map UI
(function(){
  const levelsContainer = UI.$('#levels');
  if(!levelsContainer) return;
  const unlocked = Storage.get('unlockedLevels', [1]);

  function render(){
    levelsContainer.innerHTML = '';
    for(let i=1;i<=30;i++){
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      btn.textContent = `Level ${i} — Goal: ${i*500}`;
      if(unlocked.includes(i)){
        btn.onclick = ()=> CandyGame.startLevel(i);
      } else {
        btn.disabled = true;
        btn.textContent += ' 🔒';
      }
      levelsContainer.appendChild(btn);
    }
  }

  render();
  // expose reload for later
  window.LevelMapUI = { render, unlock(level){
    const u = Storage.get('unlockedLevels', [1]);
    if(!u.includes(level)) { u.push(level); Storage.set('unlockedLevels', u); }
    render();
  }};
})();

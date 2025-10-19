// js/level-map.js
window.addEventListener('load',()=>{
  const levelsDiv = document.getElementById('levels');
  const modal = document.getElementById('levelModal');
  const closeMap = document.getElementById('closeMap');
  const backHome = document.getElementById('backHome');

  const unlocked = Storage.get('unlocked', [1]);
  const MAX = 30;
  for(let i=1;i<=MAX;i++){
    const b = document.createElement('button');
    b.className = 'level-btn';
    b.textContent = `Level ${i}`;
    if(!unlocked.includes(i)){
      b.disabled=true; b.style.opacity=0.35; b.textContent = `🔒 Level ${i}`;
    }
    b.addEventListener('click',()=>{
      // start level
      Storage.set('currentLevel', i);
      // simple page flow: ensure game.js has initGame exposed
      if(window.initGame) window.initGame(i);
      modal.classList.add('hidden');
    });
    levelsDiv.appendChild(b);
  }

  backHome.addEventListener('click', ()=> modal.classList.remove('hidden'));
  closeMap.addEventListener('click', ()=> modal.classList.add('hidden'));
});

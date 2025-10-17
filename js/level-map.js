(function(){
  const startBtn = document.getElementById('startBtn');
  const backHome = document.getElementById('backHome');
  const btnBackMap = document.getElementById('btnBackMap');

  function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
  }

  startBtn.addEventListener('click', ()=>{
    showScreen('levelMap');
    renderLevels();
  });

  backHome?.addEventListener('click', ()=> showScreen('home'));
  btnBackMap?.addEventListener('click', ()=> showScreen('levelMap'));

  window.renderLevels = function(){
    const container = document.getElementById('levelList');
    container.innerHTML = '';
    const unlocked = Storage.getUnlockedLevel() || 1;
    const total = 50; // जितने levels चाहिए
    for(let i=1;i<=total;i++){
      const b = document.createElement('button');
      b.className = 'level-btn';
      b.textContent = `Level ${i}`;
      if(i > unlocked){
        b.disabled = true; // locked
        b.style.opacity = '0.55';
        b.title = 'पहले पिछले level को पूरा करें';
      } else {
        b.disabled = false;
        b.addEventListener('click', ()=>{
          Storage.setLevel(i);
          showScreen('gameScreen');
          if(window.initGame) window.initGame();
        });
      }
      container.appendChild(b);
    }
  };

  // refresh levels when returning to map
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState==='visible'){
      try{ renderLevels(); }catch(e){}
    }
  });

})();

// js/level-modal.js
(function(){
  const $ = id => document.getElementById(id);
  window.showStartOverlay = function(levelInfo){
    let overlay = document.getElementById('startOverlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'startOverlay';
      overlay.className = 'start-overlay';
      overlay.innerHTML = `<div class="start-card" id="startCard">
        <h2>Level ${levelInfo.id}</h2>
        <p>Goal: ${levelInfo.goal} points • Moves: ${levelInfo.moves}</p>
        <button class="bigbtn" id="startNowBtn">Start Level</button>
      </div>`;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('#startCard h2').textContent = `Level ${levelInfo.id}`;
      overlay.querySelector('#startCard p').textContent = `Goal: ${levelInfo.goal} points • Moves: ${levelInfo.moves}`;
    }
    overlay.style.display = 'flex';
    setTimeout(()=> overlay.querySelector('.start-card').classList.add('show'), 30);
    document.getElementById('startNowBtn').onclick = () => {
      overlay.querySelector('.start-card').classList.remove('show');
      setTimeout(()=> overlay.style.display = 'none', 260);
      if(window.startLevel) window.startLevel(levelInfo.id);
    };
  };

  window.showLevelUpModal = function(level, reward){
    const modal = document.getElementById('levelUpModal');
    if(!modal) return;
    const title = modal.querySelector('.title');
    const text = modal.querySelector('.text');
    title.textContent = `Level ${level} Complete!`;
    text.textContent = `Reward: ${reward} coins`;
    modal.classList.add('show');
    modal.style.display = 'flex';
  };
  // close handler
  document.addEventListener('click', (e)=>{
    const modal = document.getElementById('levelUpModal');
    if(modal && e.target.matches('.level-up-close')) {
      modal.classList.remove('show');
      setTimeout(()=> modal.style.display='none', 220);
    }
  });

  console.log('Loaded: js/level-modal.js');
})();

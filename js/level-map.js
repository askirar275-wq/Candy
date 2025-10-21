/* js/level-map.js */
document.addEventListener('DOMContentLoaded', ()=>{
  const levelsEl = document.getElementById('levels');
  if (!levelsEl) { console.warn('level-map: #levels not found'); return; }
  const MAX_ALL = 40; // total levels you want
  const unlocked = Number(localStorage.getItem('maxLevel')||1);

  for(let i=1;i<=MAX_ALL;i++){
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.margin = '10px';
    btn.textContent = `Level ${i}`;
    if (i>unlocked){
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.textContent = `Level ${i} 🔒`;
    } else {
      btn.addEventListener('click', ()=> {
        // ensure game module available
        if (window.CandyGame && CandyGame.startLevel){
          CandyGame.startLevel(i);
        } else {
          console.warn('CandyGame.startLevel not available yet');
        }
      });
    }
    levelsEl.appendChild(btn);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const levelsContainer = document.getElementById('levels');
  const total = 40; // जितने लेवल चाहिए
  const unlocked = Storage.get('unlockedLevels', 1); // default 1 unlocked

  // Populate
  for(let i=1;i<=total;i++){
    const row = document.createElement('div');
    row.className = 'level-row';
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = `Level ${i}`;
    if(i > unlocked){
      btn.disabled = true;
      btn.textContent = `Level ${i} 🔒`;
    } else {
      btn.addEventListener('click', ()=> {
        // unlock into game
        CandyGame.startLevel(i);
      });
    }
    row.appendChild(btn);
    levelsContainer.appendChild(row);
  }

  // wire home/map buttons
  document.getElementById('btn-map').addEventListener('click', ()=> {
    document.getElementById('home').classList.add('hidden');
    document.getElementById('map').classList.remove('hidden');
  });

  // back buttons
  document.querySelectorAll('.back').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
      const go = b.getAttribute('data-go') || 'home';
      document.getElementById(go).classList.remove('hidden');
    });
  });
});

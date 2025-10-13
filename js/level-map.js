const mapEl = document.getElementById('mapGrid');
const maxLevels = 10;
const unlocked = StorageAPI.getLevel() || 1;

for(let i=1;i<=maxLevels;i++){
  const btn=document.createElement('button');
  btn.textContent = (i<=unlocked)?`Level ${i}`:'🔒 Locked';
  if(i>unlocked){
    btn.classList.add('locked');
  } else {
    btn.onclick=()=>{
      StorageAPI.setPlayLevel(i);
      location.href='game.html';
    };
  }
  mapEl.appendChild(btn);
}

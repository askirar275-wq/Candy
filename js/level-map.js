document.addEventListener('DOMContentLoaded', function(){
  console.log('🎯 Level map script loaded');

  const container = document.getElementById('levelPath');
  if(!container){
    console.error('❌ levelPath element missing');
    return;
  }

  container.innerHTML = '';

  const TOTAL = 20;  // total levels
  const unlocked = Number(localStorage.getItem('unlockedLevel') || 3);
  const spacingY = 120;
  let xPct = 12;
  let dir = 1;
  let top = 40;

  function makeNode(i, leftPct, topPx, isLocked){
    const n = document.createElement('div');
    n.className = 'level' + (isLocked ? ' locked' : '');
    n.textContent = i;
    n.style.left = leftPct + '%';
    n.style.top = topPx + 'px';
    n.style.zIndex = 3;

    if(!isLocked) n.style.background = 'radial-gradient(circle,#ff9fcf,#ff5c8d)';
    else n.style.background = 'linear-gradient(#bdbdbd,#808080)';

    n.addEventListener('click', ()=> {
      if(isLocked){
        alert('🔒 Level Locked');
      } else {
        console.log('Starting Level', i);
        alert('🎮 Starting Level ' + i);
        // redirect to game if you want
        // window.location.href = 'index.html?level=' + i;
      }
    });

    container.appendChild(n);
  }

  for(let i=1;i<=TOTAL;i++){
    const isLocked = i > unlocked;
    makeNode(i, xPct, top, isLocked);

    if(i < TOTAL){
      const line = document.createElement('div');
      line.className = 'path-line';
      line.style.left = (xPct + 4) + '%';
      line.style.top = (top + 82) + 'px';
      line.style.height = (spacingY - 20) + 'px';
      container.appendChild(line);
    }

    if(dir === 1) xPct += 22; else xPct -= 22;
    if(xPct > 78) dir = -1;
    if(xPct < 6) dir = 1;
    top += spacingY;
  }

  const btn = document.getElementById('backHome');
  if(btn) btn.addEventListener('click', ()=> {
    window.location.href = 'index.html';
  });

  console.log('✅ Level map rendered successfully');
});

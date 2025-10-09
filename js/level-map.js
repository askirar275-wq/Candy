document.addEventListener('DOMContentLoaded', function(){
  const container = document.getElementById('levelPath');
  if(!container){
    console.error('levelPath element missing');
    return;
  }

  container.innerHTML = ''; // clear loading

  // CONFIG
  const TOTAL = 20;                     // कुल levels show करने हैं
  const unlocked = Number(localStorage.getItem('unlockedLevel') || 3); // demo default unlocked
  const spacingY = 120;                 // vertical distance between nodes
  const startX = 12;                    // left% start
  const width = container.clientWidth || window.innerWidth;
  let xPct = startX;
  let dir = 1;

  // helper create
  function makeNode(i, leftPct, topPx, isLocked){
    const n = document.createElement('div');
    n.className = 'level' + (isLocked ? ' locked' : '');
    n.textContent = i;
    n.style.left = leftPct + '%';
    n.style.top = topPx + 'px';
    n.style.zIndex = 3;
    // visual color for unlocked
    if(!isLocked) n.style.background = 'radial-gradient(circle,#ff9fcf,#ff5c8d)'; else n.style.background = 'linear-gradient(#bdbdbd,#808080)';
    n.addEventListener('click', ()=> {
      if(isLocked){
        // small locked feedback
        n.animate([{ transform:'scale(1)' }, { transform:'scale(.95)' }, { transform:'scale(1)'}], { duration:180 });
        return alert('Level locked 🔒');
      } else {
        // call to start real level — replace with your start call or redirect
        console.log('Start level', i);
        // example redirect to game page with query ?level=#
        // window.location.href = 'index.html?level=' + i;
        alert('Game start placeholder — level ' + i);
      }
    });
    container.appendChild(n);
    return n;
  }

  // draw zig-zag nodes + lines
  let top = 40;
  for(let i=1;i<=TOTAL;i++){
    const isLocked = i > unlocked;
    const node = makeNode(i, xPct, top, isLocked);

    // draw vertical connector line to next (except last)
    if(i < TOTAL){
      const line = document.createElement('div');
      line.className = 'path-line';
      // position line roughly centered relative to node
      line.style.left = (xPct + 4) + '%'; // small offset to align with circle center
      line.style.top = (top + 82) + 'px';
      line.style.height = spacingY - 20 + 'px';
      container.appendChild(line);
    }

    // update position: zig-zag horizontally
    if(dir === 1) xPct += 22; else xPct -= 22;
    if(xPct > 78) dir = -1;
    if(xPct < 6) dir = 1;
    top += spacingY;
  }

  // HOME button
  const btn = document.getElementById('backHome');
  if(btn) btn.addEventListener('click', ()=> { window.location.href = 'index.html'; });

  console.log('Level map rendered, total', TOTAL);
});

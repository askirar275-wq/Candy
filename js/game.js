/* UI layer: render grid, handle touch/swipe, buttons, popup */
(function(){
  const gridEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const levelTitle = document.getElementById('levelTitle');
  const starsEl = document.getElementById('stars');
  const restartBtn = document.getElementById('restartBtn');
  const endBtn = document.getElementById('endBtn');
  const overlay = document.getElementById('overlay');
  const popup = document.getElementById('popup');
  const muteToggle = document.getElementById('muteToggle');

  let selectedCell = null;
  let touchStart = null;
  let draggingClone = null;

  function render(){
    const state = Game.getState();
    const g = Game.getGrid();
    scoreEl.textContent = state.score;
    movesEl.textContent = state.movesRemaining;
    targetEl.textContent = state.target;
    levelTitle.textContent = `Level ${state.level}`;
    // stars
    const pct = Math.min(1, state.score / state.target);
    const stars = Math.round(pct*3);
    starsEl.textContent = '★ '.repeat(stars) + '☆ '.repeat(3-stars);

    // build grid
    gridEl.innerHTML = '';
    if(!g) return;
    const rows = g.length, cols = g[0].length;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        const t = g[r][c].type;
        const img = document.createElement('img');
        const type = t || 1;
        img.src = `images/candy${((type-1)%5)+1}.png`;
        img.alt = 'candy';
        cell.appendChild(img);
        // events
        cell.addEventListener('pointerdown', onPointerDown);
        cell.addEventListener('pointerup', onPointerUp);
        cell.addEventListener('pointermove', onPointerMove);
        cell.addEventListener('touchstart', (e)=>e.preventDefault(), {passive:false});
        gridEl.appendChild(cell);
      }
    }
  }

  function showPopup(title,html, buttons=[]){
    overlay.classList.remove('hidden'); popup.classList.remove('hidden');
    popup.innerHTML = `<h2>${title}</h2><div class="popup-body">${html||''}</div><div class="popup-actions"></div>`;
    const actions = popup.querySelector('.popup-actions');
    buttons.forEach(b=>{
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = b.label;
      btn.addEventListener('click', ()=>{
        overlay.classList.add('hidden'); popup.classList.add('hidden');
        if(b.onClick) b.onClick();
      });
      actions.appendChild(btn);
    });
  }

  function onPointerDown(e){
    e.preventDefault();
    const el = e.currentTarget;
    selectedCell = { r: +el.dataset.r, c: +el.dataset.c };
    touchStart = { x: e.clientX, y: e.clientY };
    // create dragging clone
    if(draggingClone){
      draggingClone.remove();
      draggingClone = null;
    }
    draggingClone = el.cloneNode(true);
    draggingClone.className = 'dragging-clone';
    document.body.appendChild(draggingClone);
    moveClone(e.clientX, e.clientY);
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e){
    if(!touchStart || !draggingClone) return;
    e.preventDefault();
    moveClone(e.clientX, e.clientY);
  }

  function moveClone(x,y){
    draggingClone.style.left = x + 'px';
    draggingClone.style.top = y + 'px';
  }

  function onPointerUp(e){
    e.preventDefault();
    const el = e.currentTarget;
    const end = { x: e.clientX, y: e.clientY };
    if(draggingClone){ draggingClone.remove(); draggingClone=null; }
    if(!touchStart || !selectedCell) { touchStart=null; selectedCell=null; return; }
    const dx = end.x - touchStart.x;
    const dy = end.y - touchStart.y;
    const absx = Math.abs(dx), absy = Math.abs(dy);
    const threshold = 18; // minimal pixel to consider swipe
    let dr=0, dc=0;
    if(absx>absy && absx>threshold){
      dc = dx>0 ? 1 : -1;
    } else if(absy>absx && absy>threshold){
      dr = dy>0 ? 1 : -1;
    } else {
      // tap — maybe swap with neighbor if tapped neighbor?
      // ignore for now
    }
    if(dr!==0 || dc!==0){
      const r2 = selectedCell.r + dr;
      const c2 = selectedCell.c + dc;
      // bounds
      const g = Game.getGrid();
      if(r2<0 || r2>=g.length || c2<0 || c2>=g[0].length){
        shakeCell(selectedCell.r, selectedCell.c);
      } else {
        // attempt swap
        // visual small effect
        const cellEl = findCellEl(selectedCell.r, selectedCell.c);
        const targetEl = findCellEl(r2,c2);
        cellEl && cellEl.classList.add('swapping');
        targetEl && targetEl.classList.add('swapping');
        Game.trySwap(selectedCell.r, selectedCell.c, r2, c2).then(accepted=>{
          if(accepted){
            CMSound && CMSound.play('pop');
          } else {
            // invalid — shake both
            cellEl && cellEl.classList.add('invalid');
            targetEl && targetEl.classList.add('invalid');
            setTimeout(()=>{ cellEl && cellEl.classList.remove('invalid'); targetEl && targetEl.classList.remove('invalid'); },240);
            CMSound && CMSound.play('swap'); // small feedback
          }
          cellEl && cellEl.classList.remove('swapping');
          targetEl && targetEl.classList.remove('swapping');
          // re-render
          render();
          checkEndConditions();
        });
      }
    }
    touchStart=null; selectedCell=null;
  }

  function findCellEl(r,c){
    return gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  }

  function shakeCell(r,c){
    const el = findCellEl(r,c);
    if(!el) return;
    el.classList.add('invalid');
    setTimeout(()=>el.classList.remove('invalid'), 220);
  }

  function checkEndConditions(){
    const state = Game.getState();
    if(state.score >= state.target){
      // level complete
      CMConfetti.burst(window.innerWidth/2, 160, 36);
      // unlock next level
      window.CMStorage.unlock(state.level+1);
      showPopup(`Level ${state.level} Complete!`, `<p>Score: ${state.score}</p>`, [
        {label:'Replay', onClick: ()=> Game.start(state.level) },
        {label:'Next', onClick: ()=> location.href=`game.html?level=${state.level+1}`},
        {label:'Map', onClick: ()=> location.href='map.html'}
      ]);
    } else if(state.movesRemaining<=0){
      // game over
      showPopup('Game Over', `<p>Score: ${state.score}</p>`, [
        {label:'Replay', onClick: ()=> Game.start(state.level) },
        {label:'Map', onClick: ()=> location.href='map.html' }
      ]);
    }
  }

  // bind controls
  restartBtn && restartBtn.addEventListener('click', ()=>{
    const lvl = Game.getState().level;
    Game.start(lvl);
    render();
  });
  endBtn && endBtn.addEventListener('click', ()=>{
    if(confirm('Quit level and return to map?')) location.href='map.html';
  });

  // mute toggle
  muteToggle && (muteToggle.checked = CMSound ? CMSound.isMuted() : false);
  muteToggle && muteToggle.addEventListener('change', (e)=>{
    CMSound && CMSound.setMuted(e.target.checked);
  });

  // expose a global update callback so Game core can call when state changes
  window.onGameUpdate = function(){
    render();
  };

  // start will be called from game.html script after Game exists
  window.GameReady = true;
})();

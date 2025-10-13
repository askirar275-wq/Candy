// basic match-3 engine with 6 candies, swipe support, gravity and level system
(function(){
  const CANDIES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png'];
  const LEVELS = [null, {id:1,goal:200, size:8}, {id:2,goal:400,size:8}, {id:3,goal:700,size:8}];
  let state = { level:1, score:0, size:8 };
  const $ = id => document.getElementById(id);

  function randCandy(){ return 'images/'+CANDIES[Math.floor(Math.random()*CANDIES.length)]; }

  function updateCoins(){ const el=$('coins'); if(el) el.textContent = StorageAPI.getCoins(); }
  function updateScore(){ const el=$('score'); if(el) el.textContent = state.score; }
  function updateLevelUI(){ const el=$('currentLevel'); if(el) el.textContent = state.level; }

  // board data array
  let board = [];
  function index(r,c){ return r*state.size + c; }

  function createBoard(){
    const bEl = $('game-board'); if(!bEl) return;
    bEl.innerHTML=''; board = new Array(state.size*state.size).fill(null);
    for(let r=0;r<state.size;r++){
      for(let c=0;c<state.size;c++){
        const idx = index(r,c);
        const cell = document.createElement('div'); cell.className='cell'; cell.dataset.r=r; cell.dataset.c=c; cell.dataset.i=idx;
        const img = document.createElement('img'); img.className='tile'; img.draggable=false;
        img.src = randCandy();
        cell.appendChild(img);
        bEl.appendChild(cell);
        board[idx] = img.src;
        attachTouch(cell);
      }
    }
    // resolve any starting matches
    setTimeout(()=>{ while(removeAllMatches()) applyGravity(); }, 60);
  }

  // touch / swipe handlers
  function attachTouch(cell){
    let sx=0, sy=0, touching=false;
    cell.addEventListener('touchstart', e=>{ touching=true; const t=e.touches[0]; sx=t.clientX; sy=t.clientY; });
    cell.addEventListener('mousedown', e=>{ touching=true; sx=e.clientX; sy=e.clientY; });
    function endHandler(e){ if(!touching) return; touching=false; let ex=(e.changedTouches?e.changedTouches[0].clientX:e.clientX); let ey=(e.changedTouches?e.changedTouches[0].clientY:e.clientY); handleSwipe(cell, sx,sy, ex,ey); }
    cell.addEventListener('touchend', endHandler); cell.addEventListener('mouseup', endHandler);
  }

  function handleSwipe(cell, sx,sy, ex,ey){
    const dx = ex-sx, dy = ey-sy; if(Math.abs(dx)<10 && Math.abs(dy)<10) return; // tap
    const dir = Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up');
    const r=Number(cell.dataset.r), c=Number(cell.dataset.c);
    let nr=r, nc=c;
    if(dir==='right') nc=c+1; if(dir==='left') nc=c-1; if(dir==='down') nr=r+1; if(dir==='up') nr=r-1;
    if(nr<0||nr>=state.size||nc<0||nc>=state.size) return;
    swapAndCheck(r,c,nr,nc);
  }

  function swapAndCheck(r1,c1,r2,c2){
    const i1=index(r1,c1), i2=index(r2,c2);
    // swap DOM images and board array
    const bEl=$('game-board'); const cell1=bEl.querySelector(`[data-i='${i1}'] img`); const cell2=bEl.querySelector(`[data-i='${i2}'] img`);
    if(!cell1||!cell2) return;
    const tmp = cell1.src; cell1.src=cell2.src; cell2.src=tmp; board[i1]=cell1.src; board[i2]=cell2.src;
    // if no match produced -> revert
    if(!hasAnyMatch()){ // no match, revert after short anim
      setTimeout(()=>{ const t=cell1.src; cell1.src=cell2.src; cell2.src=t; board[i1]=cell1.src; board[i2]=cell2.src; }, 160);
    } else {
      // remove matches + gravity loop
      while(removeAllMatches()) applyGravity();
    }
  }

  // match detection: find runs of 3+ horizontally or vertically
  function removeAllMatches(){
    const toRemove = new Set();
    // rows
    for(let r=0;r<state.size;r++){
      let runStart=0; for(let c=1;c<=state.size;c++){
        const a = board[index(r,c)] || null; const b = board[index(r,c-1)] || null;
        if(c===state.size || a!==b){
          const runLen = c-runStart; if(runLen>=3){ for(let cc=runStart;cc<c;cc++) toRemove.add(index(r,cc)); }
          runStart=c;
        }
      }
    }
    // cols
    for(let c=0;c<state.size;c++){
      let runStart=0; for(let r=1;r<=state.size;r++){
        const a = board[index(r,c)] || null; const b = board[index(r-1,c)] || null;
        if(r===state.size || a!==b){
          const runLen = r-runStart; if(runLen>=3){ for(let rr=runStart;rr<r;rr++) toRemove.add(index(rr,c)); }
          runStart=r;
        }
      }
    }
    if(toRemove.size===0) return false;
    // remove visually and increase score
    toRemove.forEach(i=>{
      const bEl=$('game-board'); const img = bEl.querySelector(`[data-i='${i}'] img`); if(img) img.style.opacity=0; board[i]=null;
    });
    state.score += toRemove.size * 20;
    updateScore();
    return true;
  }

  function applyGravity(){
    const size=state.size; // column by column
    for(let c=0;c<size;c++){
      let write = size-1;
      for(let r=size-1;r>=0;r--){ const i=index(r,c); if(board[i]){ board[index(write,c)] = board[i]; write--; } }
      for(let r=write;r>=0;r--){ board[index(r,c)] = randCandy(); }
    }
    // update DOM images
    const bEl=$('game-board'); if(!bEl) return;
    for(let r=0;r<size;r++){ for(let c=0;c<size;c++){ const i=index(r,c); const img = bEl.querySelector(`[data-i='${i}'] img`); if(img){ img.src = board[i]; img.style.opacity=1; } } }
  }

  function hasAnyMatch(){
    // quick check if any 3+ exists (similar to removeAllMatches but without mutating)
    const size=state.size;
    for(let r=0;r<size;r++){
      for(let c=0;c<size-2;c++){
        const a=board[index(r,c)], b=board[index(r,c+1)], d=board[index(r,c+2)]; if(a && a===b && a===d) return true;
      }
    }
    for(let c=0;c<size;c++){
      for(let r=0;r<size-2;r++){
        const a=board[index(r,c)], b=board[index(r+1,c)], d=board[index(r+2,c)]; if(a && a===b && a===d) return true;
      }
    }
    return false;
  }

  // public APIs
  window.initGame = function(){
    try{
      state.level = StorageAPI.getLevel() || 1; state.score=0;
      const lvl = LEVELS[state.level] || LEVELS[1]; state.size = lvl.size || 8;
      updateCoins(); updateScore(); updateLevelUI();
      createBoard();
      console.log('Game initialized at level', state.level);
    }catch(e){ console.error('initGame error', e); }
  };

  window.restartGame = function(){ state.score=0; updateScore(); createBoard(); console.log('Game restarted'); };
  window.shuffleBoard = function(){ // reshuffle random
    const imgs = document.querySelectorAll('#game-board img'); imgs.forEach(img=> img.src = randCandy()); board = Array.from(document.querySelectorAll('#game-board img')).map(i=>i.src); console.log('Board shuffled'); };

  window.setGameLevel = function(l){ StorageAPI.setLevel(l); state.level = l; updateLevelUI(); };

  console.log('Loaded: js/game.js');
})();

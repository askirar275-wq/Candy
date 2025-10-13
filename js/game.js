// game.js - simple match-3 core (6 candies), swipe support, gravity, refill, levels
(function(){
  const IMAGES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png']; // place in images/
  const LEVELS = [null, {id:1,goal:100,reward:50,size:8}, {id:2,goal:220,reward:120,size:8}, {id:3,goal:500,reward:250,size:8}];
  let state = { level:1, score:0, size:8 };

  const $ = id=>document.getElementById(id);
  function log(){ if(window.console) console.log.apply(console,arguments); }

  function randImg(){ return 'images/' + IMAGES[Math.floor(Math.random()*IMAGES.length)]; }

  // storage helpers
  function updateCoinDisplay(){ const el=$('coins'); if(el) el.textContent = StorageAPI.getCoins(); const sc=$('currentLevel'); if(sc) sc.textContent = state.level; }

  // grid data (2D array of image src or null)
  let grid = [];

  function initGrid(){ grid = []; for(let r=0;r<state.size;r++){ const row=[]; for(let c=0;c<state.size;c++){ row.push(randImg()); } grid.push(row); } }

  // render grid
  function renderGrid(){ const board = $('game-board'); if(!board) return; board.innerHTML=''; board.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    for(let r=0;r<state.size;r++){
      for(let c=0;c<state.size;c++){
        const cell = document.createElement('div'); cell.className='cell'; cell.dataset.r=r; cell.dataset.c=c;
        const img = document.createElement('img'); img.className='tile'; img.draggable=false; img.alt=''; img.src = grid[r][c] || '';
        cell.appendChild(img);
        attachPointerHandlers(cell);
        board.appendChild(cell);
      }
    }
  }

  // utilities
  function inBounds(r,c){ return r>=0 && c>=0 && r<state.size && c<state.size }
  function swapCells(r1,c1,r2,c2){ const t = grid[r1][c1]; grid[r1][c1]=grid[r2][c2]; grid[r2][c2]=t }

  // match detection - returns array of coordinates to clear
  function detectMatches(){ const toClear = Array.from({length:state.size},()=>Array(state.size).fill(false));
    // rows
    for(let r=0;r<state.size;r++){
      let runStart=0;
      for(let c=1;c<=state.size;c++){
        if(c<state.size && grid[r][c]===grid[r][runStart]) continue;
        const runLen = c-runStart;
        if(runLen>=3){ for(let k=runStart;k<c;k++) toClear[r][k]=true }
        runStart=c;
      }
    }
    // cols
    for(let c=0;c<state.size;c++){
      let runStart=0;
      for(let r=1;r<=state.size;r++){
        if(r<state.size && grid[r][c]===grid[runStart][c]) continue;
        const runLen = r-runStart;
        if(runLen>=3){ for(let k=runStart;k<r;k++) toClear[k][c]=true }
        runStart=r;
      }
    }
    // collect list
    const list=[];
    for(let r=0;r<state.size;r++) for(let c=0;c<state.size;c++) if(toClear[r][c]) list.push([r,c]);
    return list;
  }

  // remove matched tiles, award score, apply gravity and refill
  function collapseAndRefill(matched){ if(!matched || matched.length===0) return 0; const points = matched.length*20; state.score += points; // update score
    // set matched to null
    matched.forEach(([r,c])=>{ grid[r][c]=null });
    // gravity: for each column, pull items down
    for(let c=0;c<state.size;c++){
      let write = state.size-1;
      for(let r=state.size-1;r>=0;r--){ if(grid[r][c]!==null){ grid[write][c]=grid[r][c]; write--; } }
      while(write>=0){ grid[write][c]=randImg(); write--; }
    }
    return points;
  }

  // repeatedly detect-match -> collapse until no more auto matches
  function resolveBoard(){ let totalPoints=0; while(true){ const m = detectMatches(); if(m.length===0) break; const pts = collapseAndRefill(m); totalPoints+=pts; renderGrid(); }
    updateScoreUI(); return totalPoints;
  }

  function updateScoreUI(){ const s=$('score'); if(s) s.textContent=state.score }

  // swipe support: we use pointer/touch events
  let pointer = {down:false, startX:0, startY:0, cellR:null, cellC:null};
  function attachPointerHandlers(cell){
    cell.addEventListener('pointerdown', (e)=>{
      cell.setPointerCapture(e.pointerId);
      pointer.down=true; pointer.startX=e.clientX; pointer.startY=e.clientY; pointer.cellR=Number(cell.dataset.r); pointer.cellC=Number(cell.dataset.c);
      cell.classList.add('selected');
    });
    cell.addEventListener('pointerup', (e)=>{
      try{ e.target.releasePointerCapture(e.pointerId); }catch(e){}
      pointer.down=false; const sel = document.querySelector('.cell.selected'); if(sel) sel.classList.remove('selected');
    });
    cell.addEventListener('pointercancel', ()=>{ pointer.down=false; const sel=document.querySelector('.cell.selected'); if(sel) sel.classList.remove('selected'); });
    cell.addEventListener('pointermove', (e)=>{
      if(!pointer.down) return; const dx = e.clientX - pointer.startX; const dy = e.clientY - pointer.startY; const absX = Math.abs(dx); const absY = Math.abs(dy);
      const threshold = 20; // minimal swipe distance
      if(Math.max(absX,absY) < threshold) return;
      // determine direction
      let dr=0, dc=0;
      if(absX>absY){ dc = dx<0 ? -1 : 1; } else { dr = dy<0 ? -1 : 1; }
      const r1 = pointer.cellR, c1 = pointer.cellC; const r2 = r1+dr, c2 = c1+dc;
      if(!inBounds(r2,c2)) return;
      // perform swap, check for match, if not swap back
      swapCells(r1,c1,r2,c2); renderGrid(); const matches = detectMatches(); if(matches.length>0){ const pts = collapseAndRefill(matches); updateScoreUI(); // resolve chain
        setTimeout(()=>{ resolveBoard(); },120);
      } else { // revert
        setTimeout(()=>{ swapCells(r1,c1,r2,c2); renderGrid(); },120);
      }
      // reset pointer down so one swipe per drag
      pointer.down=false; const sel=document.querySelector('.cell.selected'); if(sel) sel.classList.remove('selected');
    });
  }

  // shuffle board
  window.shuffleBoard = function(){ for(let r=0;r<state.size;r++) for(let c=0;c<state.size;c++) grid[r][c]=randImg(); renderGrid(); log('Board shuffled'); };
  window.restartGame = function(){ state.score=0; initGrid(); renderGrid(); updateScoreUI(); updateCoinDisplay(); log('Game restarted'); };

  // level map render
  window.renderLevelMap = function(){ const list = $('levelList'); if(!list) return; list.innerHTML=''; for(let i=1;i<LEVELS.length;i++){ const li=document.createElement('div'); li.style.padding='8px'; li.style.margin='6px'; li.style.border='1px solid #f0d'; li.style.display='inline-block'; li.style.borderRadius='10px'; li.style.cursor='pointer'; li.textContent = 'Level ' + i + '  — goal ' + LEVELS[i].goal; li.dataset.level = i; li.addEventListener('click',()=>{ StorageAPI.setLevel(i); startLevel(i); document.getElementById('map-screen').classList.remove('active'); document.getElementById('game-screen').classList.add('active'); }); list.appendChild(li); } };

  function startLevel(l){ state.level = Number(l||StorageAPI.getLevel()||1); state.size = LEVELS[state.level].size || 8; state.score = 0; initGrid(); renderGrid(); updateScoreUI(); updateCoinDisplay(); log('Game initialized at level', state.level); }

  // level completion check
  function checkLevelComplete(){ const goal = (LEVELS[state.level] && LEVELS[state.level].goal) || Infinity; if(state.score >= goal){ // give reward & unlock
      const reward = LEVELS[state.level] ? LEVELS[state.level].reward : 0; if(reward) StorageAPI.addCoins(reward); const next = state.level+1; if(LEVELS[next]) StorageAPI.setLevel(next); // show modal
      const modal = $('levelUpModal'); if(modal){ $('levelUpTitle').textContent='Level Up!'; $('levelUpText').textContent = 'You reached the goal. Reward: ' + reward + ' coins.'; modal.style.display='flex'; }
      updateCoinDisplay();
    }
  }

  // expose update functions for safe-ui
  window.initGame = function(){ try{ state.level = StorageAPI.getLevel() || 1; state.size = LEVELS[state.level].size || 8; initGrid(); renderGrid(); updateScoreUI(); updateCoinDisplay(); log('Game initialized at level', state.level); } catch(e){ console.error('initGame error', e); } };

  // quick add coins (console)
  window.addCoins = function(n){ StorageAPI.addCoins(Number(n||0)); updateCoinDisplay(); };

  // basic auto-resolve every few seconds to clear accidental auto-matches on start
  setTimeout(()=>{ if(typeof initGame==='function'){ initGame(); } },200);

  // after every grid change, check level completion (simple hook)
  const scoreObserver = new MutationObserver(()=>{ checkLevelComplete(); });
  const scoreNode = $('score'); if(scoreNode) scoreObserver.observe(scoreNode,{childList:true});

  // save modules loaded
  try{ console.log('Loaded: js/game.js'); }catch(e){}
})();

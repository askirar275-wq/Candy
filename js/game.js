// game.js
// Uses GameCore above. Responsible for rendering board, handling input, scoring & moves.

const Game = (function(){
  let grid = [];                 // color indexes
  let level = 1;
  let score = 0;
  let moves = 30;
  let selected = null;           // selected index or null
  const boardEl = document.getElementById('gameGrid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const levelTitle = document.getElementById('levelTitle');

  // render the grid to DOM
  function render(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    grid.forEach((color, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      // color style
      const colors = ['#f44336','#ff9800','#ffeb3b','#4caf50','#2196f3'];
      cell.style.background = colors[color % colors.length];
      // highlight selected
      if(selected === i) cell.style.outline = '4px solid rgba(255,255,255,0.25)';
      // attach events
      cell.addEventListener('click', onCellClick);
      // touch support: long tap not needed, simple tap
      boardEl.appendChild(cell);
    });
    // update HUD
    scoreEl && (scoreEl.textContent = score);
    movesEl && (movesEl.textContent = moves);
    levelTitle && (levelTitle.textContent = `Level ${level}`);
  }

  // select / swap flow
  function onCellClick(e){
    const idx = Number(e.currentTarget.dataset.index);
    if(selected === null){
      selected = idx;
      render();
      return;
    }
    if(selected === idx){ selected = null; render(); return; }
    // check adjacency
    if(!GameCore.areAdjacent(selected, idx)){
      selected = idx; render(); return;
    }
    // attempt swap — optimistic: do visual swap, then evaluate matches
    const matches = GameCore.trySwapAndFindMatches(grid, selected, idx);
    if(matches.length === 0){
      // no match -> briefly animate swap then revert
      animateSwap(selected, idx, true);
    } else {
      // valid move
      animateSwap(selected, idx, false).then(() => {
        // commit swap
        GameCore.swap(grid, selected, idx);
        moves = Math.max(0, moves-1);
        // process cascades
        processMatchesCascade().then(() => {
          selected = null;
          render();
          checkGameEnd();
        });
      });
    }
  }

  // animate swap (visual only). if revert true then swap back.
  function animateSwap(a,b, revert){
    return new Promise(resolve=>{
      const elA = boardEl.querySelector(`[data-index="${a}"]`);
      const elB = boardEl.querySelector(`[data-index="${b}"]`);
      if(!elA || !elB){ resolve(); return; }
      // create clones for smooth anim
      const rectA = elA.getBoundingClientRect();
      const rectB = elB.getBoundingClientRect();
      const cloneA = elA.cloneNode(true);
      const cloneB = elB.cloneNode(true);
      // position clones absolute over original
      [cloneA, cloneB].forEach(cl=>{
        cl.style.position = 'fixed';
        cl.style.left = `${cl === cloneA ? rectA.left : rectB.left}px`;
        cl.style.top = `${cl === cloneA ? rectA.top : rectB.top}px`;
        cl.style.width = `${rectA.width}px`;
        cl.style.height = `${rectA.height}px`;
        cl.style.zIndex = 9999;
        document.body.appendChild(cl);
      });
      elA.style.visibility = 'hidden';
      elB.style.visibility = 'hidden';
      // animate clones
      const dx = rectB.left - rectA.left;
      const dy = rectB.top - rectA.top;
      cloneA.style.transition = 'transform 210ms ease';
      cloneB.style.transition = 'transform 210ms ease';
      cloneA.style.transform = `translate(${dx}px,${dy}px)`;
      cloneB.style.transform = `translate(${-dx}px,${-dy}px)`;
      setTimeout(()=> {
        // cleanup
        cloneA.remove(); cloneB.remove();
        elA.style.visibility = ''; elB.style.visibility = '';
        if(revert){
          // quick flash to show invalid move
          elA.style.transform = 'scale(.96)';
          elB.style.transform = 'scale(.96)';
          setTimeout(()=> { elA.style.transform=''; elB.style.transform=''; resolve(); }, 160);
        } else {
          resolve();
        }
      }, 260);
    });
  }

  // process matches continually (cascades). returns promise resolved once done.
  async function processMatchesCascade(){
    while(true){
      const matches = GameCore.findMatches(grid);
      if(matches.length === 0) break;
      // scoring: base 50 per tile, extra for multi-match
      score += matches.length * 50;
      // remove and refill
      const {grid: newGrid, removedCount} = GameCore.collapseAndRefill(grid, matches);
      grid = newGrid;
      // small delay for visible cascade
      render();
      await wait(220);
    }
  }

  function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

  // check end (no moves or target reached) — simple: if moves==0 then end
  function checkGameEnd(){
    if(moves <= 0){
      // end
      finishLevel();
    }
  }

  function finishLevel(){
    // set final score in UI (use existing element id finalScore)
    const finalScoreEl = document.getElementById('finalScore');
    if(finalScoreEl) finalScoreEl.textContent = score;
    // unlock next
    Storage.unlock(level+1);
    // show game over screen
    Nav.show('gameOver');
  }

  // Public API
  function start(lvl){
    level = Number(lvl) || 1;
    score = 0;
    moves = 30;
    selected = null;
    grid = GameCore.generateGrid();
    render();
    Nav.show('game');
  }

  function restart(){
    start(level);
  }

  function getState(){
    return {level, score, moves};
  }

  return {start, restart, getState};
})();

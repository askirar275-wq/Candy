// js/game.js
// UI + game flow: render, touch/swipe, swap animation, match/remove loop
// Depends on GameCore

(function(global){
  const GC = global.GameCore;
  if(!GC) { console.error('GameCore not loaded'); return; }

  // DOM ids
  const gridEl = document.getElementById('grid');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');

  // state
  let score = 0;
  let moves = 30;
  let target = 600;
  let level = 1;
  let busy = false; // prevents concurrent actions
  let rows = GC.ROWS, cols = GC.COLS;

  // initialize & start
  function start(lvl=1){
    level = Number(lvl) || 1;
    // simple level tuning
    moves = Math.max(10, 30 - (level-1)*2);
    target = 600 + (level-1)*300;
    score = 0;
    scoreEl && (scoreEl.textContent = score);
    movesEl && (movesEl.textContent = moves);
    targetEl && (targetEl.textContent = target);
    // create grid and render
    GC.initGrid();
    renderGrid();
    bindEvents();
    // auto-check any initial matches (should not exist) then done
  }

  // render cells
  function renderGrid(){
    const grid = GC.getGrid();
    gridEl.innerHTML = '';
    // ensure CSS grid-template-columns updated for cols
    gridEl.style.gridTemplateColumns = `repeat(${cols}, minmax(44px, 56px))`;

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const v = grid[r][c];
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const img = document.createElement('img');
        img.draggable = false;
        img.alt = 'candy';
        img.src = `images/candy${v}.png`;

        cell.appendChild(img);
        gridEl.appendChild(cell);
      }
    }
  }

  // helper to get cell element by r,c
  function getCellEl(r,c){
    return gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  }

  // animate swap visually by moving img srcs and small transform
  function animateSwap(aR,aC,bR,bC, cb){
    // swap srcs
    const aEl = getCellEl(aR,aC), bEl = getCellEl(bR,bC);
    if(!aEl || !bEl){ if(cb) cb(); return; }
    const aImg = aEl.querySelector('img'), bImg = bEl.querySelector('img');
    // quick transform animation
    aEl.style.transition = 'transform 180ms ease';
    bEl.style.transition = 'transform 180ms ease';
    const dx = (bEl.getBoundingClientRect().left - aEl.getBoundingClientRect().left);
    const dy = (bEl.getBoundingClientRect().top - aEl.getBoundingClientRect().top);
    aEl.style.transform = `translate(${dx}px, ${dy}px)`;
    bEl.style.transform = `translate(${-dx}px, ${-dy}px)`;
    // after animation swap images & reset transform
    setTimeout(()=> {
      // swap src values
      const tmp = aImg.src;
      aImg.src = bImg.src;
      bImg.src = tmp;
      aEl.style.transition = '';
      bEl.style.transition = '';
      aEl.style.transform = '';
      bEl.style.transform = '';
      if(cb) cb();
    }, 200);
  }

  // perform remove->collapse->refill loop until no matches
  function resolveMatchesChain(){
    if(busy) return;
    busy = true;
    let chainScore = 0;
    (function loop(){
      const matches = GC.detectMatches();
      if(matches.length === 0){
        busy = false;
        // update UI score etc
        scoreEl && (scoreEl.textContent = score);
        movesEl && (movesEl.textContent = moves);
        return;
      }
      // remove marked (visual fade)
      const unique = {};
      matches.forEach(p => { unique[`${p.r},${p.c}`]=true; });
      // animate fade out
      matches.forEach(p=>{
        const el = getCellEl(p.r,p.c);
        if(el) el.querySelector('img').style.opacity = '0.15';
      });
      // score add
      const n = Object.keys(unique).length;
      chainScore += n*10;
      score += n*10;
      // wait a bit then remove in data & refill visually
      setTimeout(()=>{
        GC.removeMatches(matches);
        // collapse + refill
        GC.collapseAndRefill();
        // re-render entire grid with small animation (fade-in)
        renderGridWithDropAnimation( () => {
          // chain continue
          setTimeout(loop, 180);
        });
      }, 220);
    })();
  }

  // render grid but animate 'dropping' effect after refill
  function renderGridWithDropAnimation(cb){
    const old = gridEl.innerHTML;
    renderGrid();
    // set small transform for each cell from -20px to 0 randomized
    const cells = Array.from(gridEl.children);
    cells.forEach((cell,i)=>{
      cell.style.transition = 'transform 260ms cubic-bezier(.2,.8,.2,1), opacity 200ms';
      cell.style.transform = 'translateY(-14px)';
      cell.style.opacity = '0.0';
    });
    // trigger
    requestAnimationFrame(()=> {
      cells.forEach((cell,i)=>{
        setTimeout(()=> {
          cell.style.transform = '';
          cell.style.opacity = '';
        }, i*12);
      });
    });
    setTimeout(()=>{
      cells.forEach(cell=>{ cell.style.transition=''; });
      if(cb) cb();
    }, 420 + cells.length*6);
  }

  // attempt swap triggered by touch/drag or click
  function attemptSwap(aR,aC,bR,bC){
    if(busy) return;
    // bounds
    if(bR<0||bR>=rows||bC<0||bC>=cols) return;
    // only adjacent
    const dr = Math.abs(aR-bR), dc = Math.abs(aC-bC);
    if((dr+dc)!==1) return;
    // check if swap would produce a match
    if(!GC.swapCreatesMatch(aR,aC,bR,bC)){
      // small shake animation to indicate invalid
      const aEl = getCellEl(aR,aC), bEl = getCellEl(bR,bC);
      if(aEl && bEl){
        aEl.style.transition='transform 120ms';
        bEl.style.transition='transform 120ms';
        aEl.style.transform='translateX(6px)';
        bEl.style.transform='translateX(-6px)';
        setTimeout(()=>{ aEl.style.transform=''; bEl.style.transform=''; setTimeout(()=>{ aEl.style.transition=''; bEl.style.transition=''; },100); },120);
      }
      // still count move? typical games do count only on successful swap. we'll not decrement moves.
      return;
    }

    // perform visual swap then update data, resolve chain
    busy = true;
    animateSwap(aR,aC,bR,bC, ()=> {
      // update data
      GC.swapPositions(aR,aC,bR,bC);
      // decrement move
      moves = Math.max(0, moves-1);
      movesEl && (movesEl.textContent = moves);
      // play swap sound if available
      if(global.Sound && typeof global.Sound.play === 'function') { try { global.Sound.play('swap'); } catch(e){} }
      // now resolve matches chain
      resolveMatchesChain();
    });
  }

  // swipe/touch handling
  let touchStart = null;
  function bindEvents(){
    // remove previous listeners; simplified by replacing gridEl reference
    gridEl.ontouchstart = gridEl.onpointerdown = function(e){
      if(busy) return;
      const isTouch = e.touches && e.touches[0];
      const clientX = isTouch ? e.touches[0].clientX : (e.clientX || e.touches && e.touches[0] && e.touches[0].clientX);
      const clientY = isTouch ? e.touches[0].clientY : (e.clientY || e.touches && e.touches[0] && e.touches[0].clientY);
      const target = e.target.closest('.cell');
      if(!target) return;
      const r = Number(target.dataset.r), c = Number(target.dataset.c);
      touchStart = {x: clientX, y: clientY, r, c, time: Date.now()};
      e.preventDefault?.(); // avoid page scroll
    };

    gridEl.ontouchmove = gridEl.onpointermove = function(e){
      if(!touchStart) return;
      e.preventDefault?.();
    };

    gridEl.ontouchend = gridEl.onpointerup = function(e){
      if(!touchStart) return;
      const isTouch = e.changedTouches && e.changedTouches[0];
      const clientX = isTouch ? e.changedTouches[0].clientX : (e.clientX || 0);
      const clientY = isTouch ? e.changedTouches[0].clientY : (e.clientY || 0);
      const dx = clientX - touchStart.x;
      const dy = clientY - touchStart.y;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      const threshold = 18; // min pixels to count as swipe
      let toR = touchStart.r, toC = touchStart.c;

      if(absX < threshold && absY < threshold){
        // treat as tap — do nothing
        touchStart = null;
        return;
      }
      if(absX > absY){
        // horizontal
        if(dx > 0) toC = touchStart.c + 1; else toC = touchStart.c - 1;
      } else {
        // vertical
        if(dy > 0) toR = touchStart.r + 1; else toR = touchStart.r - 1;
      }

      attemptSwap(touchStart.r, touchStart.c, toR, toC);
      touchStart = null;
    };

    // also support desktop click-to-swap (select one then another)
    let selected = null;
    gridEl.onclick = function(e){
      if(busy) return;
      const cell = e.target.closest('.cell');
      if(!cell) return;
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      if(!selected){
        selected = {r,c,el:cell};
        cell.classList.add('selected');
        setTimeout(()=>{ if(selected && selected.el) selected.el.classList.remove('selected'); selected = null; }, 1200);
      } else {
        // attempt swap
        const a = selected; selected.el.classList.remove('selected'); selected = null;
        attemptSwap(a.r,a.c,r,c);
      }
    };
  }

  // expose Game global for easy start
  global.Game = {
    start: start,
    getState: ()=> ({score,moves,target,level}),
    // utility to unlock next level
    unlockNextLevel: function(){
      const key = 'candy_unlocked';
      const cur = parseInt(localStorage.getItem(key) || '1',10);
      const next = Math.max(cur, level+1);
      localStorage.setItem(key, String(next));
    }
  };

  // auto-start if page includes ?level=N via simple script in HTML or call Game.start manually
  global.GameCore = GC;

})(window);

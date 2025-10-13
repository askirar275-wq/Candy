/* js/game.js — Advanced game core
   - swipe/drag support (touch + mouse)
   - smooth transitions (via transform/opacity)
   - matching (3-in-row column/row), removal, gravity & refill
   - level complete + reward hooks
   - uses StorageAPI if present, otherwise fallback
*/

(function(){
  // ---------- CONFIG ----------
  const BOARD_SIZE = 8; // grid 8x8
  const CANDY_IMAGES = [
    "images/candy1.png",
    "images/candy2.png",
    "images/candy3.png",
    "images/candy4.png",
    "images/candy5.png",
    "images/candy6.png"
  ];
  const MATCH_SCORE = 30;
  const COINS_PER_MATCH = 5;
  const ANIM_MS = 180;

  // ---------- STORAGE FALLBACK ----------
  const StorageAPI = (function(){
    if(window.StorageAPI && typeof window.StorageAPI.getCoins === 'function') {
      return window.StorageAPI;
    }
    // fallback simple localStorage wrapper
    return {
      getCoins(){ return Number(localStorage.getItem('coins')||0); },
      addCoins(n=0){ const cur = Number(localStorage.getItem('coins')||0); localStorage.setItem('coins', cur + Number(n||0)); },
      getLevel(){ return Number(localStorage.getItem('level')||1); },
      setLevel(l){ localStorage.setItem('level', Number(l||1)); },
    };
  })();

  // ---------- STATE ----------
  let board = []; // 2D array of <img> DOM nodes
  let isProcessing = false;
  let score = 0;
  let level = StorageAPI.getLevel() || 1;
  let coins = StorageAPI.getCoins();
  const $ = id => document.getElementById(id);

  // UI elements (may be null until DOM ready)
  function getEls(){
    return {
      boardEl: $('game-board'),
      scoreEl: $('score'),
      coinsEl: $('coins'),
      levelEl: $('currentLevel'),
    };
  }

  // ---------- UTIL ----------
  function randCandySrc(){
    return CANDY_IMAGES[Math.floor(Math.random()*CANDY_IMAGES.length)];
  }

  function setTextSafe(el, text){
    if(!el) return;
    el.textContent = text;
  }

  // ---------- CREATE BOARD ----------
  function buildBoard(){
    const {boardEl} = getEls();
    if(!boardEl) { console.warn('game-board element missing'); return; }
    boardEl.innerHTML = '';
    board = [];
    // set grid CSS columns to match size (if not in CSS)
    boardEl.style.display = 'grid';
    boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    boardEl.style.gridGap = '10px';

    for(let r=0;r<BOARD_SIZE;r++){
      const row = [];
      for(let c=0;c<BOARD_SIZE;c++){
        const img = document.createElement('img');
        img.className = 'candy';
        img.draggable = false;
        img.src = randCandySrc();
        img.dataset.r = r; img.dataset.c = c;
        // visual wrapper (optional) - keep simple: images directly in grid
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '14px';
        img.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)';
        img.style.transition = `transform ${ANIM_MS}ms ease, opacity ${ANIM_MS}ms ease`;
        // attach pointer/touch handlers
        attachPointerHandlers(img);
        boardEl.appendChild(img);
        row.push(img);
      }
      board.push(row);
    }
    // remove any immediate matches (so starting board has no matches)
    removeAllInitialMatches();
  }

  // ensure no 3+ straight matches on initial fill
  function removeAllInitialMatches(){
    let changed = true;
    while(changed){
      changed = false;
      for(let r=0;r<BOARD_SIZE;r++){
        for(let c=0;c<BOARD_SIZE;c++){
          // check horizontal
          if(c<=BOARD_SIZE-3){
            if(board[r][c].src === board[r][c+1].src && board[r][c].src === board[r][c+2].src){
              board[r][c+1].src = randCandySrc(); changed = true;
            }
          }
          // check vertical
          if(r<=BOARD_SIZE-3){
            if(board[r][c].src === board[r+1][c].src && board[r][c].src === board[r+2][c].src){
              board[r+1][c].src = randCandySrc(); changed = true;
            }
          }
        }
      }
    }
  }

  // ---------- POINTER / SWIPE HANDLERS ----------
  let pointerStart = null; // {r,c,x,y}
  function attachPointerHandlers(img){
    // touch support
    img.addEventListener('touchstart', onPointerStart, {passive:true});
    img.addEventListener('touchend', onPointerEnd);
    // mouse support
    img.addEventListener('mousedown', onPointerStart);
    img.addEventListener('mouseup', onPointerEnd);
  }

  function onPointerStart(e){
    if(isProcessing) return;
    const target = e.currentTarget;
    const r = Number(target.dataset.r), c = Number(target.dataset.c);
    const x = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    pointerStart = {r,c,x,y};
  }

  function onPointerEnd(e){
    if(!pointerStart || isProcessing) { pointerStart = null; return; }
    const target = e.currentTarget;
    const r2 = Number(target.dataset.r), c2 = Number(target.dataset.c);
    const x2 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : (e.clientX || pointerStart.x);
    const y2 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : (e.clientY || pointerStart.y);
    const dx = x2 - pointerStart.x;
    const dy = y2 - pointerStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const threshold = 18; // pixels to consider a swipe
    // if user tapped different cell -> allow direct swap if adjacent
    if(pointerStart.r === r2 && pointerStart.c === c2 && adx < threshold && ady < threshold){
      pointerStart = null;
      return;
    }
    // determine direction
    let dr = 0, dc = 0;
    if(adx > ady){
      if(adx < threshold){ pointerStart = null; return; }
      dc = dx>0?1:-1;
    } else {
      if(ady < threshold){ pointerStart = null; return; }
      dr = dy>0?1:-1;
    }
    const rFrom = pointerStart.r, cFrom = pointerStart.c;
    const rTo = rFrom + dr, cTo = cFrom + dc;
    // bounds check
    if(rTo<0||rTo>=BOARD_SIZE||cTo<0||cTo>=BOARD_SIZE){ pointerStart=null; return; }
    // perform swap with animation & match check
    performSwapWithCheck(rFrom,cFrom,rTo,cTo);
    pointerStart = null;
  }

  // ---------- SWAP + MATCH FLOW ----------
  function performSwapWithCheck(r1,c1,r2,c2){
    if(isProcessing) return;
    isProcessing = true;
    const a = board[r1][c1], b = board[r2][c2];
    animateSwap(a,b).then(()=>{
      // after swap visually, swap srcs in board
      const tmp = a.src; a.src = b.src; b.src = tmp;
      // check for matches
      const any = findAndRemoveMatches();
      if(!any){
        // revert swap after short delay
        setTimeout(()=>{
          animateSwap(a,b).then(()=>{
            const tmp2 = a.src; a.src = b.src; b.src = tmp2;
            isProcessing = false;
          });
        }, ANIM_MS);
      } else {
        // handle removal + gravity loop until no matches
        processMatchesLoop().then(()=>{ isProcessing=false; });
      }
    });
  }

  function animateSwap(aImg, bImg){
    return new Promise(res=>{
      // simple transform animation: shift each towards other's center
      aImg.style.transition = `transform ${ANIM_MS}ms ease`;
      bImg.style.transition = `transform ${ANIM_MS}ms ease`;
      aImg.style.transform = `scale(0.95) translate(${(bImg.offsetLeft - aImg.offsetLeft)}px, ${(bImg.offsetTop - aImg.offsetTop)}px)`;
      bImg.style.transform = `scale(0.95) translate(${(aImg.offsetLeft - bImg.offsetLeft)}px, ${(aImg.offsetTop - bImg.offsetTop)}px)`;
      setTimeout(()=>{
        // reset transforms
        aImg.style.transform = '';
        bImg.style.transform = '';
        setTimeout(()=>{ res(); }, 30);
      }, ANIM_MS);
    });
  }

  // ---------- MATCH DETECTION & REMOVAL ----------
  function findAndRemoveMatches(){
    const toRemove = Array.from({length:BOARD_SIZE}, ()=>Array(BOARD_SIZE).fill(false));
    let any = false;
    // horizontal
    for(let r=0;r<BOARD_SIZE;r++){
      for(let c=0;c<BOARD_SIZE-2;c++){
        const s = board[r][c].src;
        if(!s) continue;
        if(board[r][c+1].src === s && board[r][c+2].src === s){
          toRemove[r][c]=toRemove[r][c+1]=toRemove[r][c+2]=true;
        }
      }
    }
    // vertical
    for(let c=0;c<BOARD_SIZE;c++){
      for(let r=0;r<BOARD_SIZE-2;r++){
        const s = board[r][c].src;
        if(!s) continue;
        if(board[r+1][c].src === s && board[r+2][c].src === s){
          toRemove[r][c]=toRemove[r+1][c]=toRemove[r+2][c]=true;
        }
      }
    }
    // apply removal (fade out)
    for(let r=0;r<BOARD_SIZE;r++){
      for(let c=0;c<BOARD_SIZE;c++){
        if(toRemove[r][c]){
          any = true;
          board[r][c].style.transition = `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms ease`;
          board[r][c].style.opacity = '0';
          board[r][c].style.transform = 'scale(0.6)';
        }
      }
    }
    if(any){
      // update score and coins
      // count removed
      let count = 0;
      for(let r=0;r<BOARD_SIZE;r++) for(let c=0;c<BOARD_SIZE;c++) if(toRemove[r][c]) count++;
      score += MATCH_SCORE * (Math.floor(count/3));
      coins += COINS_PER_MATCH * (Math.floor(count/3));
      StorageAPI.addCoins(0); // ensure storage exists (no-op)
      // after animation, clear srcs and drop
      setTimeout(()=>{
        for(let r=0;r<BOARD_SIZE;r++){
          for(let c=0;c<BOARD_SIZE;c++){
            if(toRemove[r][c]){
              board[r][c].src = ''; // mark empty
              board[r][c].style.opacity = '';
              board[r][c].style.transform = '';
            }
          }
        }
        updateUI();
      }, ANIM_MS + 20);
    }
    return any;
  }

  // ---------- DROP (gravity) + REFILL ----------
  function dropAndRefill(){
    return new Promise(res=>{
      for(let c=0;c<BOARD_SIZE;c++){
        let write = BOARD_SIZE-1;
        for(let r=BOARD_SIZE-1;r>=0;r--){
          if(board[r][c].src){
            if(write !== r){
              board[write][c].src = board[r][c].src;
              board[r][c].src = '';
            }
            write--;
          }
        }
        // fill remaining top
        for(let r=write;r>=0;r--){
          board[r][c].src = randCandySrc();
        }
      }
      // small delay for visual continuity
      setTimeout(()=>res(), ANIM_MS+40);
    });
  }

  // loop until no matches
  async function processMatchesLoop(){
    let loop = 0;
    while(true){
      const removed = findAndRemoveMatches();
      if(!removed) break;
      await new Promise(res=>setTimeout(res, ANIM_MS+40));
      await dropAndRefill();
      updateUI();
      loop++; if(loop>12) break;
    }
    // after all, check level complete (simple threshold)
    checkLevelComplete();
  }

  // ---------- UI UPDATE ----------
  function updateUI(){
    const {scoreEl, coinsEl, levelEl} = getEls();
    setTextSafe(scoreEl, score);
    setTextSafe(coinsEl, coins);
    setTextSafe(levelEl, level);
  }

  // ---------- RESTART / SHUFFLE ----------
  window.restartGame = function(){
    if(isProcessing) return;
    score = 0;
    coins = StorageAPI.getCoins();
    buildBoard();
    updateUI();
    console.log('Game restarted');
  };

  window.shuffleBoard = function(){
    if(isProcessing) return;
    // randomize all candies
    for(let r=0;r<BOARD_SIZE;r++){
      for(let c=0;c<BOARD_SIZE;c++){
        board[r][c].src = randCandySrc();
      }
    }
    // ensure no immediate matches
    removeAllInitialMatches();
    updateUI();
    console.log('Board shuffled');
  };

  // ---------- LEVEL COMPLETE ----------
  function checkLevelComplete(){
    // simple example: complete when score >= threshold
    const threshold = 200 * level; // example threshold per level
    if(score >= threshold){
      // give reward
      const reward = 50 * level;
      StorageAPI.addCoins(reward);
      coins = StorageAPI.getCoins();
      // increase level
      level++;
      StorageAPI.setLevel(level);
      // show modal if present
      const modal = $('levelUpModal');
      if(modal){
        const title = $('levelUpTitle'); if(title) title.textContent = 'Level Up!';
        const text = $('levelUpText'); if(text) text.textContent = `Level unlocked! Reward ${reward} coins.`;
        modal.style.display = 'flex';
      } else {
        alert(`Level Up! Reward ${reward} coins.`);
      }
      updateUI();
    }
  }

  // ---------- INIT ----------
  window.initGame = function(){
    try {
      score = 0;
      coins = StorageAPI.getCoins();
      level = StorageAPI.getLevel() || 1;
      buildBoard();
      updateUI();
      console.log('Game initialized at level', level);
    } catch(err){
      console.error('initGame error', err);
    }
  };

  // debug helper
  window.addCoins = function(n){
    StorageAPI.addCoins(n||0); coins = StorageAPI.getCoins(); updateUI();
  };

  // load log
  console.log('Loaded: js/game.js (advanced)');
})();

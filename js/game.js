// game.js — main game logic (cols=6, rows=8, 6 candy images)
(function(){
  const COLS = 6, ROWS = 8, SIZE = COLS * ROWS;
  const IMAGE_BASE = 'images/';
  const CANDIES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png'];
  const BOMB = 'bomb.png';

  // state
  let pool = []; // loaded urls
  let board = new Array(SIZE).fill(null);
  let score = 0, moves = 40, combo = 1;
  let dragging = false, startIdx = null, pointerId = null, locked = false;
  // expose helper addMoves used by shop
  window.addMoves = function(n){ moves = (moves||0) + Number(n||0); updateHUD(); };

  // preload images
  async function preload(){
    pool = await Promise.all(CANDIES.map(n => {
      return new Promise(res=>{ const i=new Image(); i.onload=()=>res(IMAGE_BASE+n); i.onerror=()=>res(IMAGE_BASE+n); i.src = IMAGE_BASE+n; });
    }));
    // bomb fallback
    (new Image()).src = IMAGE_BASE + BOMB;
  }

  function randSrc(){ return pool[Math.floor(Math.random()*pool.length)]; }
  function makeTile(src){ return {id: Math.random().toString(36).slice(2,9), src: src || randSrc(), power:null}; }

  // create DOM cells
  function createBoardDOM(){
    const grid = document.getElementById('game-board');
    if(!grid) return;
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    for(let i=0;i<SIZE;i++){
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.index = i;
      cell.addEventListener('pointerdown', onDown);
      cell.addEventListener('pointerup', onUp);
      const img = document.createElement('img');
      img.className = 'tile';
      img.draggable = false;
      cell.appendChild(img);
      grid.appendChild(cell);
    }
  }

  function render(dropMap){
    const grid = document.getElementById('game-board');
    if(!grid) return;
    const cells = grid.children;
    for(let i=0;i<SIZE;i++){
      const tile = board[i];
      const cell = cells[i];
      const img = cell.querySelector('.tile');
      if(tile){
        if(img.dataset.src !== tile.src){ img.src = tile.src; img.dataset.src = tile.src; }
        cell.style.visibility = 'visible';
      } else {
        img.src = '';
        img.dataset.src = '';
        cell.style.visibility = 'hidden';
      }
      cell.classList.remove('selected-cell');
      cell.classList.remove('pop');
      // handle drop map animation (not used heavily here)
      if(dropMap && tile && dropMap[tile.id]){
        cell.style.transform = `translateY(${dropMap[tile.id]})`;
        requestAnimationFrame(()=> requestAnimationFrame(()=> { cell.style.transition = 'transform 320ms cubic-bezier(.2,.8,.2,1)'; cell.style.transform = 'translateY(0)'; }));
      } else {
        cell.style.transition = '';
        cell.style.transform = '';
      }
    }
    updateHUD();
  }

  function fillInitial(){
    for(let i=0;i<SIZE;i++) board[i] = makeTile();
    // avoid starting matches
    let tries=0;
    while(findMatches().length > 0 && tries++ < 800){
      for(let i=0;i<SIZE;i++) board[i] = makeTile();
    }
  }

  // MATCH detection
  function findMatches(){
    const matches = new Set();
    // horizontal
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS-2;c++){
        const i = r*COLS + c;
        if(tileEq(i, i+1) && tileEq(i, i+2)){
          let k=c;
          while(k<COLS && tileEq(r*COLS+k, i)) { matches.add(r*COLS+k); k++; }
        }
      }
    }
    // vertical
    for(let c=0;c<COLS;c++){
      for(let r=0;r<ROWS-2;r++){
        const i = r*COLS + c;
        if(tileEq(i, i+COLS) && tileEq(i, i+2*COLS)){
          let k=r;
          while(k<ROWS && tileEq(k*COLS+c, i)) { matches.add(k*COLS+c); k++; }
        }
      }
    }
    return Array.from(matches).sort((a,b)=>a-b);
  }
  function tileEq(a,b){
    if(a<0||b<0||a>=SIZE||b>=SIZE) return false;
    return board[a] && board[b] && board[a].src === board[b].src;
  }

  // resolve chain
  function resolveChain(){
    if(locked) return;
    locked = true; combo = 1;
    (function step(){
      const matches = findMatches();
      if(matches.length === 0){ locked = false; updateHUD(); return; }
      // compute center for burst
      let cx=0, cy=0, cnt=0;
      matches.forEach(i=>{
        const cell = document.querySelector(`.cell[data-index="${i}"]`);
        if(cell){ const r = cell.getBoundingClientRect(); cx+= r.left + r.width/2; cy+= r.top + r.height/2; cnt++; cell.classList.add('pop'); }
        board[i] = null;
      });
      if(cnt>0) spawnParticles(cx/cnt, cy/cnt, Math.min(12, 3+matches.length));
      // scoring
      score += matches.length * 10 * combo;
      combo++;
      // gravity + refill
      setTimeout(()=> {
        gravityRefill();
        render();
        setTimeout(()=> step(), 260);
      }, 360);
    })();
  }

  function spawnParticles(x,y,amt=8){
    const parent = document.body;
    for(let i=0;i<amt;i++){
      const p = document.createElement('div');
      p.style.position='absolute'; p.style.left = x+'px'; p.style.top = y+'px';
      const s = 6 + Math.random()*10; p.style.width = p.style.height = s+'px';
      p.style.borderRadius='50%'; p.style.background = `rgba(255,80,150,${0.3+Math.random()*0.6})`;
      p.style.pointerEvents='none';
      parent.appendChild(p);
      const a = Math.random()*Math.PI*2, d = 18 + Math.random()*60;
      const nx=Math.cos(a)*d, ny=Math.sin(a)*d;
      p.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(-50%,-50%) translate(${nx}px,${ny}px) scale(.3)`,opacity:0}],{duration:500+Math.random()*300,easing:'cubic-bezier(.2,.8,.2,1)'});
      setTimeout(()=> p.remove(),1100);
    }
  }

  function gravityRefill(){
    const cols = [];
    for(let c=0;c<COLS;c++){
      let col = [];
      for(let r=ROWS-1;r>=0;r--){
        const idx = r*COLS + c;
        if(board[idx]) col.push(board[idx]);
      }
      while(col.length < ROWS) col.push(makeTile());
      cols.push(col);
    }
    const newB = new Array(SIZE).fill(null);
    for(let c=0;c<COLS;c++){
      for(let r=ROWS-1,i=0;r>=0;r--,i++){
        newB[r*COLS + c] = cols[c][i];
      }
    }
    board = newB;
  }

  // SWAP with animation (clones)
  function swapWithAnim(a,b){
    return new Promise(resolve=>{
      const aEl = document.querySelector(`.cell[data-index="${a}"] .tile`);
      const bEl = document.querySelector(`.cell[data-index="${b}"] .tile`);
      if(!aEl || !bEl){
        [board[a], board[b]] = [board[b], board[a]]; render(); return resolve();
      }
      const ar = aEl.getBoundingClientRect(), br = bEl.getBoundingClientRect();
      const dx = br.left - ar.left, dy = br.top - ar.top;
      const aClone = aEl.cloneNode(true), bClone = bEl.cloneNode(true);
      [aClone,bClone].forEach((cl,idx)=>{
        cl.classList.add('swap-moving');
        cl.style.left = (idx===0?ar.left:br.left) + 'px';
        cl.style.top = (idx===0?ar.top:br.top) + 'px';
        cl.style.width = ar.width + 'px';
        cl.style.height = ar.height + 'px';
        cl.style.position = 'fixed';
        cl.style.margin = 0;
        cl.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1)';
        document.body.appendChild(cl);
      });
      aEl.style.visibility='hidden'; bEl.style.visibility='hidden';
      requestAnimationFrame(()=> {
        aClone.style.transform = `translate(${dx}px, ${dy}px)`;
        bClone.style.transform = `translate(${-dx}px, ${-dy}px)`;
      });
      setTimeout(()=> {
        aClone.remove(); bClone.remove();
        aEl.style.visibility=''; bEl.style.visibility='';
        [board[a], board[b]] = [board[b], board[a]];
        render();
        resolve();
      }, 300);
    });
  }

  // Pointer handlers to support swipe in all 4 directions
  function onDown(e){
    if(locked) return;
    this.setPointerCapture && this.setPointerCapture(e.pointerId);
    dragging = true; pointerId = e.pointerId; startIdx = Number(this.dataset.index);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
  function onMove(e){
    if(!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - (eventStartX || e.clientX);
    const dy = e.clientY - (eventStartY || e.clientY);
    // we will detect direction when crossing threshold on pointerup using nearest cell under pointer
  }
  function onUp(e){
    dragging = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    const pt = document.elementFromPoint(e.clientX, e.clientY);
    if(!pt) return;
    const cell = pt.closest && pt.closest('.cell') ? pt.closest('.cell') : null;
    if(!cell) return;
    const idx = Number(cell.dataset.index);
    if(Number.isNaN(idx) || idx===startIdx) return;
    // check adjacency
    if(isAdjacent(startIdx, idx)){
      // attempt swap
      (async ()=>{
        try{
          await swapWithAnim(startIdx, idx);
          moves = Math.max(0, (moves||0) - 1);
          render(); updateHUD();
          const matches = findMatches();
          if(matches.length > 0) {
            resolveChain();
            // reward coins for matches
            const coinsEarned = Math.max(5, Math.floor(matches.length * 2));
            if(window.StorageAPI) window.StorageAPI.addCoins(coinsEarned);
            showCoinPopup('+' + coinsEarned + ' 💰');
            if(window.updateCoinDisplay) window.updateCoinDisplay();
          } else {
            // swap back
            await swapWithAnim(startIdx, idx);
          }
        }catch(err){ console.error('swap error', err); }
      })();
    }
  }
  function isAdjacent(a,b){
    if(a==null||b==null) return false;
    const r1=Math.floor(a/COLS), c1=a%COLS, r2=Math.floor(b/COLS), c2=b%COLS;
    return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
  }

  function updateHUD(){
    const sc = document.getElementById('score'); if(sc) sc.textContent = score;
    const mv = document.getElementById('moves'); if(mv) mv.textContent = moves;
    const coins = document.getElementById('coins'); if(coins && window.StorageAPI) coins.textContent = window.StorageAPI.getCoins();
    const level = document.getElementById('currentLevel'); if(level) level.textContent = window.StorageAPI ? window.StorageAPI.getLevel() : 1;
  }

  function showCoinPopup(text){
    const p = document.createElement('div'); p.className='coin-popup'; p.textContent = text;
    document.body.appendChild(p); setTimeout(()=> p.remove(), 1200);
  }

  // public functions
  window.initGame = async function(){
    await preload();
    createBoardDOM();
    fillInitial();
    score = 0; moves = 40; combo = 1;
    // if level stored, you can use StorageAPI.getLevel() to adjust moves/goal
    const level = (window.StorageAPI && window.StorageAPI.getLevel) ? window.StorageAPI.getLevel() : 1;
    document.getElementById('currentLevel') && (document.getElementById('currentLevel').textContent = level);
    render();
    updateHUD();
  };

  window.restartGame = function(){ fillInitial(); score=0; moves=40; render(); updateHUD(); };
  window.shuffleBoard = function(){ board = board.map(()=> makeTile()); render(); updateHUD(); };

  // expose shuffle and addMoves already
  window.shuffleBoard = shuffleBoard;
  function shuffleBoard(){ const s = board.map(b => b?b.src:randSrc()); for(let i=s.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [s[i],s[j]]=[s[j],s[i]]; } board = s.map(src=> ({id: Math.random().toString(36).slice(2,9), src})); render(); }

  // show level up (simple check) — integrated with StorageAPI
  function checkLevelComplete(){
    // placeholder: if score >= goal -> level up
    const level = (window.StorageAPI && window.StorageAPI.getLevel) ? window.StorageAPI.getLevel() : 1;
    // simple goals (you can refine)
    const goals = {1:100,2:300,3:700,4:1400};
    if(score >= (goals[level]||9999)){
      // reward coins and unlock
      const reward = 50 + level*20;
      window.StorageAPI && window.StorageAPI.addCoins(reward);
      const next = level + 1;
      window.StorageAPI && window.StorageAPI.setLevel(next);
      // show modal
      const modal = document.getElementById('levelUpModal');
      if(modal){
        document.getElementById('levelUpTitle').textContent = 'Level ' + level + ' Complete!';
        document.getElementById('levelUpText').textContent = `आपको ${reward} कॉइन मिले — अब Level ${next} अनलॉक हुआ।`;
        modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false');
      }
    }
  }

  // hook levelUp close
  document.addEventListener('DOMContentLoaded', function(){
    const close = document.getElementById('levelUpClose');
    if(close) close.addEventListener('click', function(){ const m=document.getElementById('levelUpModal'); if(m){ m.style.display='none'; m.setAttribute('aria-hidden','true'); } });
    // open shop hooks handled in safe-ui
  });

  // small helper to show errors in console
  try{ console.log('game.js loaded'); }catch(e){}
})();

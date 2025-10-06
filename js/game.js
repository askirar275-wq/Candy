// game.js — main candy match logic (V3 Advance simplified)
window.Game = (function(){
  const COLS = 8, ROWS = 8, SIZE = COLS*ROWS;
  const IMAGE_BASE = '/images/';
  const IMAGE_NAMES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png','candy7.png','candy8.png','candy9.png','candy10.png'];
  const gridEl = document.getElementById('grid');
  const imgCountEl = document.getElementById('imgCount');
  const scoreEl = document.getElementById('score'), movesEl = document.getElementById('moves'), levelEl = document.getElementById('level');

  let pool = [];
  let state = { nextId:1, board: new Array(SIZE).fill(null), score:0, moves:40, combo:1, level:1 };
  let CELL = []; // DOM references
  let dragging=false, pointerId=null, startIndex=null, locked=false;

  /* preload images (detect files on GitHub pages) */
  function tryLoad(url){
    return new Promise(res=>{
      const img = new Image();
      img.onload = ()=> res({ok:true,url});
      img.onerror = ()=> res({ok:false,url});
      img.src = url;
    });
  }
  async function loadPool(){
    const results = await Promise.all(IMAGE_NAMES.map(n => tryLoad(IMAGE_BASE + n)));
    pool = results.filter(r=>r.ok).map(r=>r.url);
    if(pool.length === 0){
      // fallback placeholder
      pool = IMAGE_NAMES.slice(0,6).map((_,i)=>`data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='100%' height='100%' fill='%23f6f6f6' /><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48'>🍭</text></svg>`);
    }
    imgCountEl && (imgCountEl.textContent = pool.length);
  }

  function makeTile(src){
    return { id: state.nextId++, src: src || pool[Math.floor(Math.random()*pool.length)], power:null };
  }
  function randTile(){ return makeTile(); }

  /* create grid cells */
  function createCells(){
    gridEl.innerHTML = '';
    CELL = [];
    gridEl.style.setProperty('--cols', COLS);
    for(let i=0;i<SIZE;i++){
      const btn = document.createElement('button');
      btn.className = 'cell';
      btn.dataset.index = i;
      const img = document.createElement('img');
      img.alt = 'candy';
      img.draggable = false;
      btn.appendChild(img);
      btn.addEventListener('pointerdown', onPointerDown);
      gridEl.appendChild(btn);
      CELL.push({btn,img});
    }
  }

  /* render board (don't create randoms here) */
  function render(dropMap){
    for(let i=0;i<SIZE;i++){
      const tile = state.board[i];
      const {btn,img} = CELL[i];
      btn.childNodes.forEach(n=>{ if(n.nodeType===3) n.remove(); });
      if(tile){
        if(img.dataset.src !== tile.src){
          img.dataset.src = tile.src;
          img.src = tile.src;
        }
        btn.style.visibility = 'visible';
      } else {
        img.dataset.src = '';
        img.src = '';
        btn.style.visibility = 'hidden';
      }
      btn.style.transition = '';
      btn.style.transform = '';
      if(dropMap && tile && dropMap[tile.id]){
        btn.style.transform = `translateY(${dropMap[tile.id]})`;
        requestAnimationFrame(()=> requestAnimationFrame(()=>{
          btn.style.transition = `transform 300ms cubic-bezier(.2,.8,.2,1)`;
          btn.style.transform = 'translateY(0)';
        }));
      }
      btn.classList.remove('pop');
    }
    updateHUD();
  }

  /* find matches by src */
  function findMatches(bd){
    const matches = [];
    // horizontal
    for(let r=0;r<ROWS;r++){
      let run=[r*COLS];
      for(let c=1;c<COLS;c++){
        const p=r*COLS+c-1, i=r*COLS+c;
        if(bd[i] && bd[p] && bd[i].src === bd[p].src) run.push(i);
        else { if(run.length>=3) matches.push([...run]); run=[i]; }
      }
      if(run.length>=3) matches.push([...run]);
    }
    // vertical
    for(let c=0;c<COLS;c++){
      let run=[c];
      for(let r=1;r<ROWS;r++){
        const p=(r-1)*COLS+c, i=r*COLS+c;
        if(bd[i] && bd[p] && bd[i].src === bd[p].src) run.push(i);
        else { if(run.length>=3) matches.push([...run]); run=[i]; }
      }
      if(run.length>=3) matches.push([...run]);
    }
    return matches;
  }

  function detectSpecials(matches){
    const assign = {};
    matches.forEach(run=>{
      if(run.length>=5){ const idx = run[Math.floor(run.length/2)]; assign[idx] = {type:'bomb'}; }
      else if(run.length===4){ const idx = run[Math.floor(run.length/2)]; assign[idx] = {type:'bomb'}; }
    });
    return assign;
  }

  function burst(cx,cy,amt=8){
    amt = Math.min(12,amt);
    const rect = gridEl.getBoundingClientRect();
    const ox = cx - rect.left, oy = cy - rect.top;
    for(let i=0;i<amt;i++){
      const p = document.createElement('div');
      p.style.position='absolute'; p.style.left=ox+'px'; p.style.top=oy+'px';
      const s = 6 + Math.random()*10; p.style.width=p.style.height=s+'px';
      p.style.borderRadius='50%'; p.style.background = `rgba(255,90,140,${0.35+Math.random()*0.5})`; p.style.pointerEvents='none';
      gridEl.parentElement.appendChild(p);
      const a = Math.random()*Math.PI*2, d = 18 + Math.random()*40;
      const nx = Math.cos(a)*d, ny = Math.sin(a)*d;
      p.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(-50%,-50%) translate(${nx}px,${ny}px) scale(.3)`,opacity:0}],{duration:420+Math.random()*260,easing:'cubic-bezier(.2,.8,.2,1)'});
      setTimeout(()=>p.remove(),1000);
    }
  }

  /* resolve chain: remove matches -> gravity -> refill */
  function resolveChain(){
    if(locked) return;
    locked = true; state.combo = 1;
    (function step(){
      const matches = findMatches(state.board);
      if(matches.length === 0){ locked=false; updateHUD(); return; }
      const specialMap = detectSpecials(matches);
      const removeSet = new Set();
      matches.forEach(run => run.forEach(i => removeSet.add(i)));
      const removeIdx = Array.from(removeSet).sort((a,b)=>a-b);
      const removedCount = removeIdx.length;
      state.score += removedCount * 12 * state.combo;
      state.combo++;
      updateHUD();

      // animate pop
      let cx=0, cy=0, cnt=0;
      removeIdx.forEach(i=>{
        const el = CELL[i] && CELL[i].btn;
        if(el){ const rc = el.getBoundingClientRect(); cx += rc.left + rc.width/2; cy += rc.top + rc.height/2; cnt++; el.classList.add('pop'); }
        state.board[i] = null;
      });
      if(cnt>0) burst(cx/cnt, cy/cnt, Math.min(12, 4+cnt));

      // gravity + refill
      setTimeout(()=>{
        try{
          const cols = [];
          for(let c=0;c<COLS;c++){
            const col = [];
            for(let r=ROWS-1;r>=0;r--){
              const idx = r*COLS + c;
              if(state.board[idx]) col.push(state.board[idx]);
            }
            cols.push(col);
          }
          const newBoard = new Array(SIZE).fill(null);
          const dropMap = {};
          const tilePx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || 64;
          const oldIds = new Set(state.board.filter(Boolean).map(t=>t.id));
          for(let c=0;c<COLS;c++){
            const col = cols[c];
            while(col.length < ROWS) col.push(randTile()); // NEW tiles only here
            for(let r=ROWS-1,i=0;r>=0;r--,i++){
              const tile = col[i];
              newBoard[r*COLS + c] = tile;
              if(!oldIds.has(tile.id)) dropMap[tile.id] = `-${(i+1)*tilePx}px`;
            }
          }

          Object.keys(specialMap).forEach(k=>{
            const idx = Number(k);
            if(newBoard[idx]) newBoard[idx].src = IMAGE_BASE + 'candy1.png';
          });

          state.board = newBoard;
          render(dropMap);
        }catch(e){ console.error('gravity error', e); }
        setTimeout(()=> setTimeout(step, 220), 320);
      }, 300);
    })();
  }

  /* input handling: pointer drag swap */
  function onPointerDown(e){
    if(locked) return;
    const el = e.currentTarget;
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
    dragging=true; pointerId=e.pointerId; startIndex = Number(el.dataset.index);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }
  function onPointerMove(e){
    if(!dragging || e.pointerId !== pointerId) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if(!target) return;
    const cell = target.closest && target.closest('.cell') ? target.closest('.cell') : null;
    if(!cell) return;
    const idx = Number(cell.dataset.index);
    if(Number.isNaN(idx)) return;
    if(isAdjacent(startIndex, idx) && idx !== startIndex){
      swap(startIndex, idx);
      render();
      state.moves = Math.max(0, state.moves-1);
      updateHUD();
      const matches = findMatches(state.board);
      if(matches.length>0) resolveChain();
      else setTimeout(()=>{ swap(startIndex, idx); render(); }, 260);
      startIndex = idx;
    }
  }
  function onPointerUp(e){
    dragging=false; pointerId=null; startIndex=null;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  }
  function isAdjacent(a,b){ if(a==null||b==null) return false; const r1=Math.floor(a/COLS),c1=a%COLS,r2=Math.floor(b/COLS),c2=b%COLS; return Math.abs(r1-r2)+Math.abs(c1-c2)===1; }
  function swap(i,j){ [state.board[i], state.board[j]] = [state.board[j], state.board[i]]; }

  /* UI actions */
  document.getElementById('restartBtn').addEventListener('click', ()=> init(true));
  document.getElementById('shuffleBtn').addEventListener('click', ()=> {
    const arr = state.board.slice();
    for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    state.board = arr; render();
  });
  document.getElementById('bombBtn').addEventListener('click', ()=>{
    if(locked) return;
    const valid = state.board.map((t,i)=> t ? i : -1).filter(i=>i>=0);
    if(valid.length===0) return;
    const idx = valid[Math.floor(Math.random()*valid.length)];
    state.board[idx] = makeTile(IMAGE_BASE + 'candy1.png');
    state.board[idx].power = {type:'bomb'};
    render();
    setTimeout(()=> {
      const removed = new Set();
      const r0 = Math.floor(idx/COLS), c0 = idx%COLS;
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        const nr=r0+dr, nc=c0+dc;
        if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS) removed.add(nr*COLS+nc);
      }
      Array.from(removed).forEach(i=>{ CELL[i].btn.classList.add('pop'); state.board[i] = null; });
      state.score += removed.size * 12; updateHUD();
      setTimeout(()=> resolveChain(), 260);
    }, 240);
  });

  function updateHUD(){
    scoreEl && (scoreEl.textContent = state.score);
    movesEl && (movesEl.textContent = state.moves);
    levelEl && (levelEl.textContent = state.level);
  }

  /* fit tile sizes responsive */
  function fitTiles(){
    const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 6;
    const wrap = document.querySelector('.grid-wrap').getBoundingClientRect();
    const avail = Math.min(wrap.width - 16, window.innerWidth - 48);
    const candidate = Math.floor((avail - gap*(COLS-1))/COLS);
    const desired = Math.max(36, Math.min(candidate, 80));
    document.documentElement.style.setProperty('--tile', desired + 'px');
  }

  /* init board */
  function fillInitialBoard(){
    state.nextId = 1;
    state.board = new Array(SIZE).fill(null).map(()=>randTile());
    let tries=0;
    while(findMatches(state.board).length>0 && tries++ < 900){
      state.board = new Array(SIZE).fill(null).map(()=>randTile());
    }
  }

  function init(force=false){
    loadPool().then(()=> {
      if(!CELL.length) createCells();
      if(force || !state.board || state.board.filter(Boolean).length === 0) fillInitialBoard();
      state.score = force ? 0 : state.score;
      state.moves = force ? 40 : state.moves;
      state.combo = 1;
      fitTiles(); render();
      updateHUD();
    });
  }

  /* expose onStart for home.js */
  function onStart(){ if(!CELL.length) createCells(); if(state.board.filter(Boolean).length===0) init(true); render(); }

  window.addEventListener('resize', ()=> { clearTimeout(window._resizeTO); window._resizeTO = setTimeout(()=>{ fitTiles(); render(); }, 120); });

  /* public API */
  return { init, onStart, state, render };
})();

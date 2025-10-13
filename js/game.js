// js/game.js — responsive, 6 candies, smooth gravity + match detection

(function(){
  const CANDY_IMAGES = [
    'images/candy1.png',
    'images/candy2.png',
    'images/candy3.png',
    'images/candy4.png',
    'images/candy5.png',
    'images/candy6.png'
  ];

  const LEVELS = [ null,
    { id:1, title:'Beginner', goalScore:100, rewardCoins:50, boardSize:8 },
    { id:2, title:'Explorer', goalScore:300, rewardCoins:120, boardSize:8 },
    { id:3, title:'Challenger', goalScore:700, rewardCoins:250, boardSize:9 },
    { id:4, title:'Master', goalScore:1500, rewardCoins:600, boardSize:9 }
  ];

  const $ = id => document.getElementById(id);
  let state = { level:1, score:0, boardSize:8, board:[], running:false };

  // 🔸 Responsive sizing helper
  function adjustCellSizeForViewport(boardEl, boardSize){
    if(!boardEl) return;
    const maxW = 720;
    let containerWidth = Math.min(boardEl.clientWidth || window.innerWidth - 40, maxW);
    const style = getComputedStyle(boardEl);
    const gap = parseFloat(style.gap || 10);
    const padL = parseFloat(style.paddingLeft || 0);
    const padR = parseFloat(style.paddingRight || 0);
    const usable = containerWidth - padL - padR - gap*(boardSize-1);
    let cell = Math.floor(usable / boardSize);
    if(cell<40) cell=40;
    if(cell>84) cell=84;
    document.documentElement.style.setProperty('--cell-size', cell+'px');
  }

  // 📊 UI Updates
  function updateScoreUI(){ const s=$('score'); if(s) s.textContent=state.score; }
  window.updateCoinDisplay = function(){
    const c1=$('coins'), c2=$('shopCoins');
    const v=StorageAPI.getCoins();
    if(c1) c1.textContent=v; if(c2) c2.textContent=v;
  };

  function updateLevelUI(){
    const lvl=state.level;
    const info=LEVELS[lvl]||LEVELS[1];
    state.boardSize = info.boardSize || 8;
    const cur=$('currentLevel'); if(cur) cur.textContent=lvl;
    const board=$('game-board');
    if(board){
      board.style.gridTemplateColumns=`repeat(${state.boardSize},1fr)`;
      adjustCellSizeForViewport(board, state.boardSize);
    }
  }

  // 🎲 Random / board generation
  const randIndex=()=>Math.floor(Math.random()*CANDY_IMAGES.length);
  function createBoardArray(){
    const n=state.boardSize; state.board=[];
    for(let r=0;r<n;r++){ state.board[r]=Array.from({length:n},randIndex); }
    eliminateInitialMatches();
  }
  function eliminateInitialMatches(){
    const n=state.boardSize;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(c>=2 && state.board[r][c]===state.board[r][c-1] && state.board[r][c]===state.board[r][c-2])
          state.board[r][c]=(state.board[r][c]+1)%CANDY_IMAGES.length;
        if(r>=2 && state.board[r][c]===state.board[r-1][c] && state.board[r][c]===state.board[r-2][c])
          state.board[r][c]=(state.board[r][c]+1)%CANDY_IMAGES.length;
      }
    }
  }

  // 🎨 Render board
  function renderBoard(){
    const boardEl=$('game-board'); if(!boardEl) return;
    adjustCellSizeForViewport(boardEl,state.boardSize);
    boardEl.innerHTML='';
    for(let r=0;r<state.boardSize;r++){
      for(let c=0;c<state.boardSize;c++){
        const cell=document.createElement('div');
        cell.className='cell'; cell.dataset.r=r; cell.dataset.c=c;
        const img=document.createElement('img');
        img.className='tile'; img.src=CANDY_IMAGES[state.board[r][c]];
        img.draggable=false; img.dataset.r=r; img.dataset.c=c;
        makeTileInteractive(cell,img);
        cell.appendChild(img); boardEl.appendChild(cell);
      }
    }
  }

  // 🖐 Interaction: tap / swipe
  function makeTileInteractive(cell,img){
    cell.addEventListener('click',()=>{
      const prev=document.querySelector('.cell.selected-cell');
      if(prev && prev!==cell){ doSwap(prev,cell); prev.classList.remove('selected-cell'); }
      else cell.classList.toggle('selected-cell');
    });
    let sx,sy;
    img.addEventListener('touchstart',e=>{
      if(e.touches.length){ sx=e.touches[0].clientX; sy=e.touches[0].clientY; }
    },{passive:true});
    img.addEventListener('touchend',e=>{
      if(sx==null) return;
      const ex=e.changedTouches[0].clientX, ey=e.changedTouches[0].clientY;
      const dx=ex-sx, dy=ey-sy;
      if(Math.abs(dx)<20 && Math.abs(dy)<20){ sx=null; sy=null; return; }
      const r=+img.dataset.r, c=+img.dataset.c;
      let tr=r, tc=c;
      if(Math.abs(dx)>Math.abs(dy)) tc+=(dx>0?1:-1); else tr+=(dy>0?1:-1);
      sx=null; sy=null;
      const other=document.querySelector(`.cell[data-r="${tr}"][data-c="${tc}"]`);
      if(other) doSwap(cell,other);
    },{passive:true});
  }

  // 🔄 Swap + check
  function doSwap(a,b){
    const ar=+a.dataset.r, ac=+a.dataset.c, br=+b.dataset.r, bc=+b.dataset.c;
    if(Math.abs(ar-br)+Math.abs(ac-bc)!==1) return;
    const tmp=state.board[ar][ac];
    state.board[ar][ac]=state.board[br][bc];
    state.board[br][bc]=tmp;
    updateImg(a,ar,ac); updateImg(b,br,bc);
    const m=findMatches();
    if(!m.length){ // revert
      setTimeout(()=>{
        const t2=state.board[ar][ac];
        state.board[ar][ac]=state.board[br][bc];
        state.board[br][bc]=t2;
        updateImg(a,ar,ac); updateImg(b,br,bc);
      },180);
      return;
    }
    processMatches();
  }
  const updateImg=(cell,r,c)=>{ const i=cell.querySelector('.tile'); if(i) i.src=CANDY_IMAGES[state.board[r][c]]; };

  // 🔍 Match detection
  function findMatches(){
    const n=state.boardSize, rem=[];
    for(let r=0;r<n;r++){
      let run=1;
      for(let c=1;c<=n;c++){
        if(c<n && state.board[r][c]===state.board[r][c-1]) run++;
        else { if(run>=3) for(let k=c-run;k<c;k++) rem.push([r,k]); run=1; }
      }
    }
    for(let c=0;c<n;c++){
      let run=1;
      for(let r=1;r<=n;r++){
        if(r<n && state.board[r][c]===state.board[r-1][c]) run++;
        else { if(run>=3) for(let k=r-run;k<r;k++) rem.push([k,c]); run=1; }
      }
    }
    const seen={}, uniq=[];
    rem.forEach(([r,c])=>{const key=r+','+c;if(!seen[key]){seen[key]=1;uniq.push([r,c]);}});
    return uniq;
  }

  // 💥 Process matches
  function processMatches(){
    const matches=findMatches();
    if(!matches.length) return;
    state.score+=matches.length*10; updateScoreUI();
    matches.forEach(([r,c])=>{
      state.board[r][c]=null;
      const img=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .tile`);
      if(img){ img.style.opacity='0'; img.style.transform='scale(0.5)'; }
    });
    setTimeout(()=>{ gravityRefill(); setTimeout(processMatches,180); },220);
  }

  // 🧲 Gravity + refill
  function gravityRefill(){
    const n=state.boardSize;
    for(let c=0;c<n;c++){
      const col=[];
      for(let r=0;r<n;r++) if(state.board[r][c]!=null) col.push(state.board[r][c]);
      for(let r=n-1,idx=col.length-1;r>=0;r--,idx--){
        const val=idx>=0?col[idx]:randIndex();
        state.board[r][c]=val;
        const img=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .tile`);
        if(img){ img.src=CANDY_IMAGES[val]; img.style.opacity='1'; img.style.transform='scale(1)'; }
      }
    }
  }

  // 🧩 Public functions
  window.shuffleBoard=function(){
    const n=state.boardSize;
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) state.board[r][c]=randIndex();
    eliminateInitialMatches(); renderBoard(); console.log('Board shuffled');
  };
  window.restartGame=function(){ state.score=0; updateScoreUI(); createBoardArray(); renderBoard(); };
  window.initGame=function(){
    state.level=StorageAPI.getLevel(); state.score=0; updateLevelUI(); createBoardArray(); renderBoard();
    updateScoreUI(); updateCoinDisplay(); console.log('Game initialized at level',state.level);
  };
  window.buyFromShop=function(item){
    const price={shuffle:100,moves:80}[item]||0;
    if(StorageAPI.getCoins()>=price){ StorageAPI.addCoins(-price); updateCoinDisplay(); if(item==='shuffle') shuffleBoard(); }
    else console.warn('Not enough coins');
  };

  console.log('Loaded: js/game.js ✅');
})();

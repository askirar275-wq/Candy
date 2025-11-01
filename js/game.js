// js/game.js
// Core Candy Game logic (6x8 grid, swipe, match, refill)
const CandyGame = (function(){
  console.log('✅ Loaded: js/game.js');

  const ROWS = 8, COLS = 6, TYPES = 6;
  const CANDIES = [
    'images/candy1.png','images/candy2.png','images/candy3.png',
    'images/candy4.png','images/candy5.png','images/candy6.png'
  ];

  const boardEl = document.getElementById('board');
  let board = [], score = 0, level = 1;
  let busy = false;

  // Generate random candy index
  const rand = () => Math.floor(Math.random()*TYPES);

  // Create board
  function initBoard(){
    board = Array.from({length:ROWS},()=>Array.from({length:COLS},rand));
    removeInitialMatches();
    render();
  }

  function removeInitialMatches(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(matchAt(r,c)){
          board[r][c] = rand();
          c--;
        }
      }
    }
  }

  function matchAt(r,c){
    const v = board[r][c];
    return (
      (c>=2 && v===board[r][c-1] && v===board[r][c-2]) ||
      (r>=2 && v===board[r-1][c] && v===board[r-2][c])
    );
  }

  // Render board
  function render(){
    boardEl.innerHTML = '';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'candy-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const img = document.createElement('img');
        img.src = CANDIES[board[r][c]];
        cell.appendChild(img);
        boardEl.appendChild(cell);
      }
    }
    addSwipeEvents();
  }

  function addSwipeEvents(){
    const cells = boardEl.querySelectorAll('.candy-cell');
    cells.forEach(cell=>{
      cell.addEventListener('pointerdown', onDown);
    });
  }

  let start = null;
  function onDown(e){
    if(busy) return;
    const cell = e.currentTarget;
    start = {x:e.clientX, y:e.clientY, r:+cell.dataset.r, c:+cell.dataset.c};
    document.addEventListener('pointerup', onUp);
  }

  function onUp(e){
    document.removeEventListener('pointerup', onUp);
    if(!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if(Math.max(absX,absY)<20){ start=null; return; }
    let tr = start.r, tc = start.c;
    if(absX>absY){ tc += dx>0?1:-1; } else { tr += dy>0?1:-1; }
    swapAndCheck(start.r,start.c,tr,tc);
    start=null;
  }

  async function swapAndCheck(r1,c1,r2,c2){
    if(r2<0||c2<0||r2>=ROWS||c2>=COLS) return;
    busy=true;
    [board[r1][c1],board[r2][c2]] = [board[r2][c2],board[r1][c1]];
    render();
    await sleep(150);
    const matches = findMatches();
    if(matches.length===0){
      // revert
      [board[r1][c1],board[r2][c2]] = [board[r2][c2],board[r1][c1]];
      render();
      busy=false;
      return;
    }
    await handleMatches();
    busy=false;
  }

  function findMatches(){
    const matched=[];
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const v=board[r][c];
        if(!v) continue;
        // horizontal
        if(c<=COLS-3 && v===board[r][c+1] && v===board[r][c+2]){
          matched.push({r,c}); matched.push({r,c+1}); matched.push({r,c+2});
        }
        // vertical
        if(r<=ROWS-3 && v===board[r+1][c] && v===board[r+2][c]){
          matched.push({r,c}); matched.push({r+1,c}); matched.push({r+2,c});
        }
      }
    }
    const unique = [];
    const seen={};
    matched.forEach(p=>{ const k=p.r+'_'+p.c; if(!seen[k]){seen[k]=1; unique.push(p);} });
    return unique;
  }

  async function handleMatches(){
    while(true){
      const matches=findMatches();
      if(matches.length===0) break;
      matches.forEach(p=>board[p.r][p.c]=null);
      score+=matches.length*100;
      Storage.addCoins(Math.floor(matches.length/2));
      updateUI();
      render();
      await sleep(250);
      applyGravity();
      render();
      await sleep(200);
    }
    const goal = level*500;
    if(score>=goal){
      Storage.unlock(level+1);
      window.dispatchEvent(new CustomEvent('game:levelUnlocked',{detail:{level:level+1}}));
      alert('🎉 Level '+level+' complete! Next level unlocked.');
    }
  }

  function applyGravity(){
    for(let c=0;c<COLS;c++){
      let empty=[];
      for(let r=ROWS-1;r>=0;r--){
        if(board[r][c]===null) empty.push(r);
        else if(empty.length>0){
          const newR=empty.shift();
          board[newR][c]=board[r][c];
          board[r][c]=null;
          empty.push(r);
        }
      }
      for(let k=empty.length-1;k>=0;k--){
        board[empty[k]][c]=rand();
      }
    }
  }

  const sleep = ms=>new Promise(r=>setTimeout(r,ms));

  function updateUI(){
    window.dispatchEvent(new CustomEvent('game:state',{detail:{score,coins:Storage.getCoins(),level}}));
  }

  // Public
  function startLevel(l){
    level=l; score=0;
    initBoard();
    updateUI();
  }

  document.getElementById('btn-restart')?.addEventListener('click',()=> startLevel(level));
  document.getElementById('btn-shuffle')?.addEventListener('click',()=>{
    board.forEach((r,ri)=>r.forEach((_,ci)=>board[ri][ci]=rand()));
    render();
  });

  window.addEventListener('shop:buy',(e)=>{
    if(e.detail.id==='shuffle'){
      board.forEach((r,ri)=>r.forEach((_,ci)=>board[ri][ci]=rand()));
      render();
    }
    if(e.detail.id==='bomb'){
      const r=Math.floor(Math.random()*ROWS);
      const c=Math.floor(Math.random()*COLS);
      board[r][c]=rand();
      render();
    }
  });

  return {startLevel};
})();

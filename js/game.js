// js/game.js (V4 — full swipe + gravity + match)
console.log('Loaded: game.js (V4)');

(function(){
  const CANDIES = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png'];
  const IMAGE_PATH = 'images/';

  const LEVELS = [
    null,
    { id:1, boardSize:7, goal:200, reward:50 },
    { id:2, boardSize:8, goal:600, reward:150 },
    { id:3, boardSize:8, goal:1200, reward:300 },
  ];

  let grid=[], cells=[], selected=null;
  let boardSize=7, score=0, currentLevel=1;
  const boardEl=document.getElementById('gameBoard');
  const scoreEl=document.getElementById('score');
  const coinsEl=document.getElementById('coins');
  const levelEl=document.getElementById('currentLevel');

  function randCandy(){ return IMAGE_PATH + CANDIES[Math.floor(Math.random()*CANDIES.length)]; }

  function setScore(n){ score=n; scoreEl.textContent=n; }
  function updateCoins(){ coinsEl.textContent=StorageAPI.getCoins(); }

  function buildGrid(){
    const info=LEVELS[currentLevel]||LEVELS[1];
    boardSize=info.boardSize;
    grid=Array.from({length:boardSize},()=>Array(boardSize).fill(null));
    for(let r=0;r<boardSize;r++){
      for(let c=0;c<boardSize;c++){
        do{ grid[r][c]=randCandy(); }while(createsImmediateMatch(r,c));
      }
    }
  }

  function createsImmediateMatch(r,c){
    const val=grid[r][c];
    if(c>=2 && grid[r][c-1]===val && grid[r][c-2]===val) return true;
    if(r>=2 && grid[r-1][c]===val && grid[r-2][c]===val) return true;
    return false;
  }

  function renderBoard(){
    boardEl.innerHTML='';
    boardEl.style.gridTemplateColumns=`repeat(${boardSize},1fr)`;
    cells=[];
    for(let r=0;r<boardSize;r++){
      for(let c=0;c<boardSize;c++){
        const cell=document.createElement('div');
        cell.className='cell';
        cell.dataset.r=r; cell.dataset.c=c;
        const img=document.createElement('img');
        img.className='tile';
        img.src=grid[r][c];
        cell.appendChild(img);
        boardEl.appendChild(cell);
        cells.push(cell);
        cell.addEventListener('click',onCellClick);
        addSwipeSupport(cell);
      }
    }
  }

  function onCellClick(e){
    const el=e.currentTarget;
    const r=+el.dataset.r, c=+el.dataset.c;
    if(!selected){ selected={r,c}; el.classList.add('selected'); return; }
    const prev=document.querySelector('.cell.selected');
    if(prev) prev.classList.remove('selected');
    const pr=selected.r, pc=selected.c;
    if(pr===r && pc===c){ selected=null; return; }
    if(Math.abs(pr-r)+Math.abs(pc-c)===1){ swapAndProcess(pr,pc,r,c); }
    selected=null;
  }

  // 🟢 ADD: Swipe detection in all 4 directions
  function addSwipeSupport(cell){
    let sx=0, sy=0, ex=0, ey=0;
    cell.addEventListener('touchstart',ev=>{
      const t=ev.touches[0]; sx=t.clientX; sy=t.clientY;
    },{passive:true});
    cell.addEventListener('touchend',ev=>{
      const t=ev.changedTouches[0]; ex=t.clientX; ey=t.clientY;
      const dx=ex-sx, dy=ey-sy;
      if(Math.abs(dx)<20 && Math.abs(dy)<20){ cell.click(); return; } // small tap
      const r=+cell.dataset.r, c=+cell.dataset.c;
      let nr=r, nc=c;
      if(Math.abs(dx)>Math.abs(dy)){
        nc=dx>0?c+1:c-1;
      } else {
        nr=dy>0?r+1:r-1;
      }
      if(nr<0||nr>=boardSize||nc<0||nc>=boardSize) return;
      swapAndProcess(r,c,nr,nc);
    },{passive:true});

    // optional mouse drag for desktop
    let md=false,mx,my;
    cell.addEventListener('mousedown',ev=>{md=true;mx=ev.clientX;my=ev.clientY;});
    document.addEventListener('mouseup',ev=>{
      if(!md) return; md=false;
      const dx=ev.clientX-mx, dy=ev.clientY-my;
      if(Math.abs(dx)<20&&Math.abs(dy)<20) return;
      const r=+cell.dataset.r, c=+cell.dataset.c;
      let nr=r, nc=c;
      if(Math.abs(dx)>Math.abs(dy)){ nc=dx>0?c+1:c-1; } else { nr=dy>0?r+1:r-1; }
      if(nr<0||nr>=boardSize||nc<0||nc>=boardSize) return;
      swapAndProcess(r,c,nr,nc);
    });
  }

  function swapAndProcess(r1,c1,r2,c2){
    const tmp=grid[r1][c1]; grid[r1][c1]=grid[r2][c2]; grid[r2][c2]=tmp;
    updateCell(r1,c1); updateCell(r2,c2);
    const matches=findMatches();
    if(matches.length===0){
      setTimeout(()=>{ const t=grid[r1][c1]; grid[r1][c1]=grid[r2][c2]; grid[r2][c2]=t; updateCell(r1,c1); updateCell(r2,c2); },180);
    } else handleMatches();
  }

  function updateCell(r,c){
    const idx=r*boardSize+c; const cell=cells[idx]; if(!cell) return;
    cell.querySelector('.tile').src=grid[r][c]||'';
  }

  function findMatches(){
    const rmv=new Set();
    // horizontal
    for(let r=0;r<boardSize;r++){
      let run=1;
      for(let c=1;c<=boardSize;c++){
        const cur=grid[r][c],prev=grid[r][c-1];
        if(c<boardSize && cur===prev){run++;}
        else{ if(run>=3){ for(let k=0;k<run;k++) rmv.add(`${r},${c-1-k}`); } run=1; }
      }
    }
    // vertical
    for(let c=0;c<boardSize;c++){
      let run=1;
      for(let r=1;r<=boardSize;r++){
        const cur=r<boardSize?grid[r][c]:null,prev=r>0?grid[r-1][c]:null;
        if(cur===prev){run++;}
        else{ if(run>=3){ for(let k=0;k<run;k++) rmv.add(`${r-1-k},${c}`); } run=1; }
      }
    }
    return [...rmv].map(s=>s.split(',').map(Number));
  }

  function handleMatches(){
    const matches=findMatches();
    if(matches.length===0) return;
    matches.forEach(([r,c])=>{
      const idx=r*boardSize+c;
      const cell=cells[idx];
      if(cell) cell.classList.add('pop');
      grid[r][c]=null;
    });
    setScore(score+matches.length*10);
    StorageAPI.addCoins(Math.floor(matches.length/3));
    updateCoins();
    setTimeout(()=>{ collapseAndFill(); },250);
  }

  function collapseAndFill(){
    for(let c=0;c<boardSize;c++){
      let write=boardSize-1;
      for(let r=boardSize-1;r>=0;r--){
        if(grid[r][c]){
          grid[write][c]=grid[r][c];
          write--;
        }
      }
      for(let r=write;r>=0;r--){ grid[r][c]=randCandy(); }
    }
    for(let r=0;r<boardSize;r++){ for(let c=0;c<boardSize;c++) updateCell(r,c); }
    setTimeout(()=>{ if(findMatches().length>0) handleMatches(); else checkLevel(); },180);
  }

  function checkLevel(){
    const info=LEVELS[currentLevel]||LEVELS[1];
    if(score>=info.goal){
      const next=currentLevel+1;
      const reward=info.reward||0;
      StorageAPI.addCoins(reward);
      if(LEVELS[next]) StorageAPI.setLevel(next);
      showLevelModal(next,reward);
    }
  }

  function showLevelModal(next,reward){
    const modal=document.getElementById('levelUpModal');
    const title=document.getElementById('levelUpTitle');
    const msg=document.getElementById('levelUpMsg');
    modal.style.display='flex';
    title.textContent='Level Complete!';
    msg.textContent=`Level ${next-1} done! Reward: ${reward} coins.`;
    document.getElementById('levelUpClose').onclick=()=>{
      modal.style.display='none';
      StorageAPI.setPlayLevel(next);
      currentLevel=next;
      initGame();
    };
  }

  function initGame(){
    currentLevel=StorageAPI.getPlayLevel()||StorageAPI.getLevel()||1;
    if(levelEl) levelEl.textContent=currentLevel;
    setScore(0);
    buildGrid();
    renderBoard();
    updateCoins();
    console.log('Game init level',currentLevel);
  }

  window.shuffleBoard=function(){ buildGrid(); renderBoard(); };
  window.restartGame=function(){ initGame(); };
  window.initGame=initGame;

  document.addEventListener('DOMContentLoaded',()=>{ initGame(); });
})();

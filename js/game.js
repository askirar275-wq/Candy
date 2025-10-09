// js/game.js
// Candy Match: Smooth Swap + Match Detection + Gravity + Level + Coins
(function(){
  'use strict';

  const CANDY_IMAGES = [
    'images/candy1.png','images/candy2.png','images/candy3.png','images/candy4.png',
    'images/candy5.png','images/candy6.png','images/candy7.png','images/candy8.png'
  ];

  const LEVELS = [ null,
    { id:1, goalScore:100, rewardCoins:50, boardSize:8 },
    { id:2, goalScore:300, rewardCoins:120, boardSize:8 },
    { id:3, goalScore:600, rewardCoins:250, boardSize:8 }
  ];

  let state = {
    level: 1,
    score: 0,
    boardSize: 8,
    board: [],
    selected: null,
    busy: false
  };

  const $ = id => document.getElementById(id);

  if(typeof window.StorageAPI === 'undefined'){
    window.StorageAPI = {
      getCoins(){ return Number(localStorage.getItem('coins')||0); },
      addCoins(n){ let v=Number(localStorage.getItem('coins')||0)+Number(n||0); localStorage.setItem('coins',v); return v; },
      getLevel(){ return Number(localStorage.getItem('level')||1); },
      setLevel(l){ localStorage.setItem('level',Number(l||1)); }
    };
  }

  function randCandy(){ return Math.floor(Math.random()*CANDY_IMAGES.length); }

  function updateHUD(){
    const s=$('score'); if(s) s.textContent=state.score;
    const c=$('coins'); if(c) c.textContent=StorageAPI.getCoins();
    const lvl=$('currentLevel'); if(lvl) lvl.textContent=state.level;
  }

  function levelInfo(){ return LEVELS[state.level] || LEVELS[1]; }

  function initBoard(){
    const n=state.boardSize;
    state.board=[];
    for(let r=0;r<n;r++){
      const row=[];
      for(let c=0;c<n;c++){ row.push(randCandy()); }
      state.board.push(row);
    }
    removeInitialMatches();
  }

  function removeInitialMatches(){
    let found=true;
    while(found){
      found=false;
      const matches=findMatches();
      if(matches.length>0){
        found=true;
        for(const [r,c] of matches){ state.board[r][c]=randCandy(); }
      }
    }
  }

  function renderBoard(){
    const grid=$('game-board');
    if(!grid) return;
    grid.innerHTML='';
    const n=state.boardSize;
    grid.style.gridTemplateColumns=`repeat(${n},1fr)`;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        const cell=document.createElement('div');
        cell.className='cell';
        cell.dataset.r=r; cell.dataset.c=c;
        const img=document.createElement('img');
        img.className='tile';
        img.src=CANDY_IMAGES[state.board[r][c]];
        cell.appendChild(img);
        cell.addEventListener('click',()=>onCellClick(r,c,cell));
        grid.appendChild(cell);
      }
    }
  }

  function onCellClick(r,c,cell){
    if(state.busy) return;
    const sel=state.selected;
    if(!sel){ selectCell(r,c,cell); return; }
    if(sel.r===r && sel.c===c){ unselectCell(); return; }
    if(isAdjacent(sel,{r,c})){
      unselectCell();
      swapAndCheck(sel,{r,c});
    } else selectCell(r,c,cell);
  }

  function selectCell(r,c,el){
    unselectCell();
    el.classList.add('selected-cell');
    state.selected={r,c,el};
  }

  function unselectCell(){
    if(state.selected && state.selected.el){
      state.selected.el.classList.remove('selected-cell');
    }
    state.selected=null;
  }

  function isAdjacent(a,b){
    return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;
  }

  async function swapAndCheck(a,b){
    state.busy=true;
    swapCandies(a,b);
    await animateSwap(a,b);
    const matches=findMatches();
    if(matches.length>0){
      await handleMatches(matches);
    } else {
      // revert swap
      swapCandies(a,b);
      await animateSwap(a,b);
    }
    state.busy=false;
  }

  function swapCandies(a,b){
    const tmp=state.board[a.r][a.c];
    state.board[a.r][a.c]=state.board[b.r][b.c];
    state.board[b.r][b.c]=tmp;
    renderCell(a.r,a.c);
    renderCell(b.r,b.c);
  }

  function renderCell(r,c){
    const img=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] img`);
    if(img) img.src=CANDY_IMAGES[state.board[r][c]];
  }

  function animateSwap(a,b){
    return new Promise(res=>{
      const elA=document.querySelector(`.cell[data-r="${a.r}"][data-c="${a.c}"] img`);
      const elB=document.querySelector(`.cell[data-r="${b.r}"][data-c="${b.c}"] img`);
      if(!elA||!elB) return res();
      const rectA=elA.getBoundingClientRect(), rectB=elB.getBoundingClientRect();
      const dx=rectB.left-rectA.left, dy=rectB.top-rectA.top;
      elA.style.transition='transform .25s ease'; elB.style.transition='transform .25s ease';
      elA.style.transform=`translate(${dx}px,${dy}px)`; elB.style.transform=`translate(${-dx}px,${-dy}px)`;
      setTimeout(()=>{
        elA.style.transition=''; elB.style.transition='';
        elA.style.transform=''; elB.style.transform='';
        res();
      },260);
    });
  }

  function findMatches(){
    const matches=[];
    const n=state.boardSize;
    // horizontal
    for(let r=0;r<n;r++){
      for(let c=0;c<n-2;c++){
        const val=state.board[r][c];
        if(val===state.board[r][c+1] && val===state.board[r][c+2]){
          let k=c;
          while(k<n && state.board[r][k]===val){
            matches.push([r,k]); k++;
          }
        }
      }
    }
    // vertical
    for(let c=0;c<n;c++){
      for(let r=0;r<n-2;r++){
        const val=state.board[r][c];
        if(val===state.board[r+1][c] && val===state.board[r+2][c]){
          let k=r;
          while(k<n && state.board[k][c]===val){
            matches.push([k,c]); k++;
          }
        }
      }
    }
    // unique
    return Array.from(new Set(matches.map(m=>m.join(',')))).map(s=>s.split(',').map(Number));
  }

  async function handleMatches(matches){
    // remove matched candies
    for(const [r,c] of matches){
      const img=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] img`);
      if(img){ img.style.opacity='0'; img.style.transform='scale(0.1)'; }
      state.board[r][c]=null;
    }
    const gained=matches.length*10;
    state.score+=gained;
    StorageAPI.addCoins(matches.length);
    updateHUD();
    await new Promise(res=>setTimeout(res,250));
    applyGravity();
    refillBoard();
    renderBoard();
    const next=findMatches();
    if(next.length>0) await handleMatches(next);
    checkLevelGoal();
  }

  function applyGravity(){
    const n=state.boardSize;
    for(let c=0;c<n;c++){
      let empty=[];
      for(let r=n-1;r>=0;r--){
        if(state.board[r][c]===null) empty.push(r);
        else if(empty.length>0){
          const e=empty.shift();
          state.board[e][c]=state.board[r][c];
          state.board[r][c]=null;
          empty.push(r);
        }
      }
    }
  }

  function refillBoard(){
    const n=state.boardSize;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(state.board[r][c]===null) state.board[r][c]=randCandy();
      }
    }
  }

  function checkLevelGoal(){
    const info=levelInfo();
    if(state.score>=info.goalScore){
      const next=state.level+1;
      const reward=info.rewardCoins;
      StorageAPI.addCoins(reward);
      if(LEVELS[next]) StorageAPI.setLevel(next);
      showLevelUpModal(next, reward);
      state.level=StorageAPI.getLevel();
      state.score=0;
      updateHUD();
    }
  }

  function showLevelUpModal(next,reward){
    const modal=$('levelUpModal');
    if(!modal) return;
    const title=$('levelUpTitle');
    const text=$('levelUpText');
    if(title) title.textContent='🎉 Level Up!';
    if(text) text.textContent=`Next Level Unlocked! Reward: ${reward} Coins`;
    modal.style.display='flex';
  }

  // Public functions
  window.initGame=function(){
    try{
      state.level=StorageAPI.getLevel();
      const info=levelInfo();
      state.boardSize=info.boardSize||8;
      state.score=0; state.busy=false;
      initBoard();
      renderBoard();
      updateHUD();
      console.log('Game initialized Level',state.level);
    }catch(e){console.error(e);}
  };

  window.restartGame=function(){
    state.score=0;
    initBoard();
    renderBoard();
    updateHUD();
  };

  window.shuffleBoard=function(){
    const n=state.boardSize;
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) state.board[r][c]=randCandy();
    renderBoard();
  };

  window.addCoins=function(n){
    StorageAPI.addCoins(Number(n||0));
    updateHUD();
  };

  document.addEventListener('DOMContentLoaded',()=>console.log('Loaded: js/game.js'));
})();

// js/game.js — Pull Update Version (multi-level Candy Crush mode)
(function(){
  const CANDY_SETS = {
    1: ['images/candy1.png','images/candy2.png','images/candy3.png'],
    2: ['images/candy1.png','images/candy2.png','images/candy3.png','images/candy4.png'],
    3: ['images/candy1.png','images/candy2.png','images/candy3.png','images/candy4.png','images/candy5.png'],
    4: ['images/candy1.png','images/candy2.png','images/candy3.png','images/candy4.png','images/candy5.png','images/candy6.png']
  };

  const LEVELS = [
    { id:1, size:6, target:500, name:"Beginner" },
    { id:2, size:7, target:1200, name:"Explorer" },
    { id:3, size:8, target:2000, name:"Challenger" },
    { id:4, size:8, target:3500, name:"Sweet Master" },
    { id:5, size:9, target:5000, name:"Candy Legend" },
  ];

  let state = {
    board: [], size:8, score:0, target:1000,
    level:1, running:false, selected:null
  };

  const $ = id=>document.getElementById(id);
  const rand = arr => arr[Math.floor(Math.random()*arr.length)];

  function randCandy(){
    const set = CANDY_SETS[Math.min(state.level,4)];
    return rand(set);
  }

  function initGame(){
    const lv = StorageAPI.getLevel();
    const levelData = LEVELS.find(l=>l.id===lv) || LEVELS[0];
    state.level = levelData.id;
    state.size = levelData.size;
    state.target = levelData.target;
    state.score = 0;
    state.board = Array.from({length:state.size**2}, ()=>({img:randCandy()}));
    renderBoard();
    removeMatches(true);
    updateHUD();
    console.log("🎯 Level", state.level, "started, Target:", state.target);
  }

  function renderBoard(){
    const g = $('game-board');
    g.innerHTML='';
    g.style.gridTemplateColumns=`repeat(${state.size},1fr)`;
    state.board.forEach((cell,i)=>{
      const div=document.createElement('div');
      div.className='cell';
      div.dataset.i=i;
      const img=document.createElement('img');
      img.src=cell.img;
      div.appendChild(img);
      div.addEventListener('click',onClick);
      addSwipe(div);
      g.appendChild(div);
    });
  }

  function onClick(e){
    const idx=Number(e.currentTarget.dataset.i);
    if(state.selected===null){ select(idx); }
    else if(state.selected===idx){ deselect(); }
    else{
      swapTry(state.selected, idx);
    }
  }

  function select(i){
    deselect();
    state.selected=i;
    const el=document.querySelector(`.cell[data-i='${i}']`);
    if(el) el.classList.add('selected');
  }

  function deselect(){
    const el=document.querySelector('.cell.selected');
    if(el) el.classList.remove('selected');
    state.selected=null;
  }

  function swapTry(a,b){
    if(!adjacent(a,b)){ deselect(); return; }
    swap(a,b);
    const m=findMatches();
    if(m.length){ removeMatches(); } 
    else { swap(a,b); }
    deselect();
  }

  function swap(a,b){
    [state.board[a],state.board[b]]=[state.board[b],state.board[a]];
    renderBoard();
  }

  function adjacent(a,b){
    const s=state.size;
    const ax=a%s, ay=Math.floor(a/s);
    const bx=b%s, by=Math.floor(b/s);
    return Math.abs(ax-bx)+Math.abs(ay-by)===1;
  }

  function findMatches(){
    const s=state.size,m=[];
    for(let r=0;r<s;r++){
      let run=[r*s];
      for(let c=1;c<s;c++){
        const i=r*s+c;
        if(state.board[i].img===state.board[i-1].img){run.push(i);}
        else{ if(run.length>=3)m.push(...run); run=[i]; }
      }
      if(run.length>=3)m.push(...run);
    }
    for(let c=0;c<s;c++){
      let run=[c];
      for(let r=1;r<s;r++){
        const i=r*s+c;
        if(state.board[i].img===state.board[i-s].img){run.push(i);}
        else{ if(run.length>=3)m.push(...run); run=[i]; }
      }
      if(run.length>=3)m.push(...run);
    }
    return [...new Set(m)];
  }

  function removeMatches(initial){
    const matches=findMatches();
    if(!matches.length) return;
    matches.forEach(i=>state.board[i]=null);
    state.score+=matches.length*50;
    StorageAPI.addCoins(matches.length*2);
    updateHUD();
    collapse();
    refill();
    setTimeout(()=>removeMatches(),initial?0:200);
  }

  function collapse(){
    const s=state.size;
    for(let c=0;c<s;c++){
      for(let r=s-1;r>=0;r--){
        if(!state.board[r*s+c]){
          for(let r2=r-1;r2>=0;r2--){
            if(state.board[r2*s+c]){
              state.board[r*s+c]=state.board[r2*s+c];
              state.board[r2*s+c]=null;
              break;
            }
          }
        }
      }
    }
  }

  function refill(){
    const s=state.size;
    for(let i=0;i<s*s;i++){
      if(!state.board[i]) state.board[i]={img:randCandy()};
    }
    renderBoard();
    checkLevelComplete();
  }

  function updateHUD(){
    $('score').textContent=state.score;
    $('scoreTop').textContent=state.score;
    $('coins').textContent=StorageAPI.getCoins();
    $('currentLevelDisplay').textContent=state.level;
  }

  function checkLevelComplete(){
    if(state.score>=state.target){
      StorageAPI.setLevel(state.level+1);
      const modal=$('levelUpModal');
      $('levelUpTitle').textContent=`Level ${state.level} Complete!`;
      $('levelUpText').textContent=`Target ${state.target} points reached! Next level unlocked.`;
      modal.style.display='flex';
      $('levelUpClose').onclick=function(){
        modal.style.display='none';
        initGame();
      };
    }
  }

  function restart(){
    state.score=0;
    initGame();
  }

  function shuffle(){
    for(let i=state.board.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [state.board[i],state.board[j]]=[state.board[j],state.board[i]];
    }
    renderBoard();
  }

  // swipe handlers (mobile)
  function addSwipe(el){
    let sx,sy,si;
    el.addEventListener('touchstart',e=>{
      const t=e.touches[0];
      sx=t.clientX; sy=t.clientY;
      si=Number(el.dataset.i);
    },{passive:true});
    el.addEventListener('touchend',e=>{
      const t=e.changedTouches[0];
      const dx=t.clientX-sx, dy=t.clientY-sy;
      const adx=Math.abs(dx), ady=Math.abs(dy);
      const th=20;
      if(adx>ady && adx>th){
        swapTry(si, si+(dx>0?1:-1));
      } else if(ady>adx && ady>th){
        swapTry(si, si+(dy>0?state.size:-state.size));
      }
    },{passive:true});
  }

  // public bindings
  window.initGame=initGame;
  window.restartGame=restart;
  window.shuffleBoard=shuffle;

  document.addEventListener('DOMContentLoaded',()=>{
    $('restartBtn').onclick=restart;
    $('shuffleBtn').onclick=shuffle;
  });
})();

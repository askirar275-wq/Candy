// js/game.js — swipe + gravity refill animation
const Game = (function(){
  const META={1:{target:600,star2:1000,star3:1600},default:{target:1200,star2:2200,star3:3200}};
  let grid=[],level=1,score=0,moves=30,selected=null,dragState=null;

  const boardEl=document.getElementById('gameGrid');
  const scoreEl=document.getElementById('score');
  const movesEl=document.getElementById('moves');
  const targetEl=document.getElementById('target');
  const starsEl=document.getElementById('stars');
  const levelTitle=document.getElementById('levelTitle');

  function getMeta(){return META[level]||META.default;}

  function render(){
    if(!boardEl)return;
    boardEl.innerHTML='';
    grid.forEach((color,i)=>{
      const c=document.createElement('div');
      c.className='cell'; c.dataset.index=i;
      const img=document.createElement('img');
      img.src=`images/candy${(color%GameCore.COLORS)+1}.png`;
      c.appendChild(img);
      c.addEventListener('pointerdown',onPointerDown);
      c.addEventListener('pointermove',onPointerMove);
      c.addEventListener('pointerup',onPointerUp);
      c.addEventListener('pointercancel',onPointerCancel);
      c.addEventListener('click',onCellClick);
      if(selected===i)c.style.outline='4px solid rgba(255,255,255,0.3)';
      boardEl.appendChild(c);
    });
    scoreEl&&(scoreEl.textContent=score);
    movesEl&&(movesEl.textContent=moves);
    targetEl&&(targetEl.textContent=getMeta().target);
    updateStarsUI();
    if(levelTitle)levelTitle.textContent=`स्तर ${level}`;
  }

  function updateStarsUI(){
    if(!starsEl)return;
    const meta=getMeta(),st=Array.from(starsEl.querySelectorAll('.star'));
    st.forEach(s=>s.classList.remove('on'));
    if(score>=meta.target)st[0].classList.add('on');
    if(score>=meta.star2)st[1].classList.add('on');
    if(score>=meta.star3)st[2].classList.add('on');
  }

  function onCellClick(e){
    if(dragState&&dragState.dragging)return;
    const i=+e.currentTarget.dataset.index;
    if(selected===null){selected=i;render();return;}
    if(selected===i){selected=null;render();return;}
    if(!GameCore.areAdjacent(selected,i)){selected=i;render();return;}
    attemptSwap(selected,i);
  }

  async function attemptSwap(a,b){
    const m=GameCore.trySwapAndFindMatches(grid,a,b);
    if(!m.length){await animateSwap(a,b,true);selected=null;render();return;}
    await animateSwap(a,b,false);
    GameCore.swap(grid,a,b); moves=Math.max(0,moves-1);
    await cascadeAnimation(); selected=null;render(); checkEnd();
  }

  function animateSwap(a,b,revert){
    return new Promise(res=>{
      const A=boardEl.querySelector(`[data-index="${a}"]`),B=boardEl.querySelector(`[data-index="${b}"]`);
      if(!A||!B){res();return;}
      const ra=A.getBoundingClientRect(),rb=B.getBoundingClientRect();
      const cA=A.cloneNode(true),cB=B.cloneNode(true);
      [cA,cB].forEach((cl,i)=>{
        cl.style.position='fixed';
        cl.style.left=(i?rb.left:ra.left)+'px';
        cl.style.top=(i?rb.top:ra.top)+'px';
        cl.style.width=ra.width+'px';cl.style.height=ra.height+'px';cl.style.zIndex=9999;
        document.body.appendChild(cl);
      });
      A.style.visibility='hidden';B.style.visibility='hidden';
      const dx=rb.left-ra.left,dy=rb.top-ra.top;
      cA.style.transition='transform .2s';cB.style.transition='transform .2s';
      cA.style.transform=`translate(${dx}px,${dy}px)`;cB.style.transform=`translate(${-dx}px,${-dy}px)`;
      setTimeout(()=>{cA.remove();cB.remove();A.style.visibility='';B.style.visibility='';res();},230);
    });
  }

  async function cascadeAnimation(){
    while(true){
      const m=GameCore.findMatches(grid);
      if(!m.length)break;
      m.forEach(i=>{
        const el=boardEl.querySelector(`[data-index="${i}"]`);
        if(el)el.classList.add('fade-out');
      });
      await wait(180);
      const r=GameCore.collapseAndRefill(grid,m);
      grid=r.grid; score+=m.length*60;
      render();
      const cells=Array.from(boardEl.querySelectorAll('.cell'));
      cells.forEach(c=>c.classList.add('drop-in'));
      requestAnimationFrame(()=>{requestAnimationFrame(()=>cells.forEach(c=>c.classList.add('show')));});
      await wait(340);
      cells.forEach(c=>c.classList.remove('drop-in','show'));
      render();
      await wait(50);
    }
  }

  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const checkEnd=()=>{
    const m=getMeta();
    if(score>=m.target){finish(true);return;}
    if(moves<=0){finish(score>=m.target);}
  };
  function finish(win){
    const f=document.getElementById('finalScore'); if(f)f.textContent=score;
    if(win)Storage.unlock(level+1); Nav.show('gameOver');
  }

  // drag/swipe
  function onPointerDown(e){e.preventDefault();
    const el=e.currentTarget;const i=+el.dataset.index;
    try{el.setPointerCapture(e.pointerId);}catch{}
    dragState={startIdx:i,currentIdx:i,startX:e.clientX,startY:e.clientY,pointerId:e.pointerId,originEl:el,clone:null,dragging:false};
  }
  function onPointerMove(e){
    if(!dragState||dragState.pointerId!==e.pointerId)return;
    const dx=e.clientX-dragState.startX,dy=e.clientY-dragState.startY;
    if(!dragState.dragging&&Math.hypot(dx,dy)>8){
      dragState.dragging=true;
      const r=dragState.originEl.getBoundingClientRect(),cl=dragState.originEl.cloneNode(true);
      Object.assign(cl.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:9999});
      document.body.appendChild(cl); dragState.clone=cl; dragState.originEl.style.visibility='hidden';
    }
    if(dragState.dragging&&dragState.clone){
      dragState.clone.style.transform=`translate(${dx}px,${dy}px)`;
      const u=document.elementFromPoint(e.clientX,e.clientY);
      if(!u)return;const c=u.closest('.cell');if(c){
        const h=+c.dataset.index;
        if(h!==dragState.currentIdx&&GameCore.areAdjacent(dragState.startIdx,h))dragState.currentIdx=h;
      }
    }
  }
  function onPointerUp(e){
    if(!dragState||dragState.pointerId!==e.pointerId)return;
    const s=dragState.startIdx,eIdx=dragState.currentIdx;
    dragState.clone&&dragState.clone.remove();
    dragState.originEl&&(dragState.originEl.style.visibility='');
    if(dragState.dragging&&eIdx!==s&&GameCore.areAdjacent(s,eIdx))attemptSwap(s,eIdx);
    else if(!dragState.dragging){
      if(selected===null)selected=s;else if(selected===s)selected=null;
      else if(GameCore.areAdjacent(selected,s))attemptSwap(selected,s);
      else selected=s; render();
    }
    dragState=null;
  }
  function onPointerCancel(){dragState=null;}

  function start(lvl){
    level=+lvl||1;score=0;moves=30;selected=null;grid=GameCore.generateGrid();render();
    setTimeout(()=>cascadeAnimation(),100);Nav.show('game');
  }
  function restart(){start(level);}
  return{start,restart};
})();

/* ===== Candy Match - Final JS (with swipe + sparkle + floating +10) ===== */

const WIDTH = 8;
const HEIGHT = 8;
const CANDIES = [
  'candy1.png','candy2.png','candy3.png','candy4.png',
  'candy5.png','candy6.png','candy7.png','candy8.png'
];
const IMAGE_BASE = 'images/';
let board = [];
let score = 0;
let combo = 1;
let isSwapping = false;
let firstSelected = null;

/* ========== INIT ========== */
window.addEventListener('DOMContentLoaded', () => {
  initBoard();
  render();
  updateHUD();
  enableSwipeSupport();
});

/* ---------- Board setup ---------- */
function initBoard(){
  board = [];
  for(let i=0;i<WIDTH*HEIGHT;i++){
    const src = IMAGE_BASE + CANDIES[Math.floor(Math.random()*CANDIES.length)];
    board.push({src});
  }
}

/* ---------- Render ---------- */
function render(){
  const grid = document.querySelector('.board');
  if(!grid) return;
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${WIDTH}, 1fr)`;

  board.forEach((tile,i)=>{
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    const img = document.createElement('img');
    img.src = tile.src;
    img.className = 'tile';
    cell.appendChild(img);

    cell.addEventListener('click', ()=> selectTile(i));
    grid.appendChild(cell);
  });
}

/* ---------- Click select ---------- */
function selectTile(i){
  if(isSwapping) return;
  const el = document.querySelector(`.cell[data-index="${i}"]`);
  if(!firstSelected){
    firstSelected = i;
    el.classList.add('selected-cell');
    return;
  }
  if(firstSelected === i){
    el.classList.remove('selected-cell');
    firstSelected = null;
    return;
  }

  const j = firstSelected;
  const [r1,c1] = [Math.floor(j/WIDTH), j%WIDTH];
  const [r2,c2] = [Math.floor(i/WIDTH), i%WIDTH];
  const adj = Math.abs(r1-r2)+Math.abs(c1-c2)===1;

  if(adj){
    swapTiles(i,j);
  } else {
    document.querySelector(`.cell[data-index="${j}"]`).classList.remove('selected-cell');
    firstSelected = null;
  }
}

/* ---------- Swipe support (mobile) ---------- */
function enableSwipeSupport(){
  let startX,startY,startIdx;
  const grid = document.querySelector('.board');
  grid.addEventListener('touchstart', e=>{
    const t = e.touches[0];
    const cell = e.target.closest('.cell');
    if(!cell) return;
    startX = t.clientX;
    startY = t.clientY;
    startIdx = parseInt(cell.dataset.index);
  });

  grid.addEventListener('touchend', e=>{
    if(startIdx==null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if(Math.max(absX,absY)<25) return;
    let targetIdx = null;
    if(absX>absY) targetIdx = startIdx + (dx>0?1:-1);
    else targetIdx = startIdx + (dy>0?WIDTH:-WIDTH);
    if(targetIdx>=0 && targetIdx<WIDTH*HEIGHT){
      swapTiles(startIdx,targetIdx);
    }
    startIdx=null;
  });
}

/* ---------- Swap ---------- */
function swapTiles(i,j){
  isSwapping=true;
  [board[i], board[j]] = [board[j], board[i]];
  render();

  const matches = findMatches();
  if(matches.length>0){
    handleMatches(matches);
  } else {
    setTimeout(()=>{
      [board[i], board[j]] = [board[j], board[i]];
      render();
      isSwapping=false;
    },300);
  }
}

/* ---------- Match detection ---------- */
function findMatches(){
  const matches=[];
  // horizontal
  for(let r=0;r<HEIGHT;r++){
    let streak=1;
    for(let c=1;c<WIDTH;c++){
      const curr=board[r*WIDTH+c].src;
      const prev=board[r*WIDTH+c-1].src;
      if(curr===prev) streak++;
      else{
        if(streak>=3)
          for(let k=0;k<streak;k++) matches.push(r*WIDTH+c-1-k);
        streak=1;
      }
    }
    if(streak>=3) for(let k=0;k<streak;k++) matches.push(r*WIDTH+WIDTH-1-k);
  }

  // vertical
  for(let c=0;c<WIDTH;c++){
    let streak=1;
    for(let r=1;r<HEIGHT;r++){
      const curr=board[r*WIDTH+c].src;
      const prev=board[(r-1)*WIDTH+c].src;
      if(curr===prev) streak++;
      else{
        if(streak>=3)
          for(let k=0;k<streak;k++) matches.push((r-1-k)*WIDTH+c);
        streak=1;
      }
    }
    if(streak>=3) for(let k=0;k<streak;k++) matches.push((HEIGHT-1-k)*WIDTH+c);
  }
  return matches;
}

/* ---------- Handle matches ---------- */
function handleMatches(matches){
  const uniq=[...new Set(matches)];
  score += uniq.length * 10 * combo;
  combo++;

  uniq.forEach(i=>{
    const el=document.querySelector(`.cell[data-index="${i}"] .tile`);
    if(el){
      el.classList.add('pop');
      spawnFloatingScore(i, '+10');
      spawnSparkles(i);
    }
    board[i]=null;
  });

  updateHUD();
  setTimeout(()=>applyGravity(),400);
}

/* ---------- Floating score + sparkles ---------- */
function spawnFloatingScore(i,text){
  const cell=document.querySelector(`.cell[data-index="${i}"]`);
  if(!cell) return;
  const el=document.createElement('div');
  el.textContent=text;
  el.style.position='absolute';
  el.style.color='#ff55aa';
  el.style.fontWeight='800';
  el.style.fontSize='18px';
  el.style.textShadow='0 0 6px white';
  el.style.left='50%';
  el.style.top='50%';
  el.style.transform='translate(-50%,-50%)';
  el.style.animation='floatUp 0.8s ease-out forwards';
  cell.appendChild(el);
  setTimeout(()=>el.remove(),800);
}

/* sparkles */
function spawnSparkles(i){
  const cell=document.querySelector(`.cell[data-index="${i}"]`);
  if(!cell) return;
  for(let j=0;j<5;j++){
    const sp=document.createElement('div');
    sp.className='sparkle';
    sp.style.left=Math.random()*100+'%';
    sp.style.top=Math.random()*100+'%';
    sp.style.background='radial-gradient(circle,#fff,#ff6fb3)';
    sp.style.position='absolute';
    sp.style.width='6px';sp.style.height='6px';
    sp.style.borderRadius='50%';
    sp.style.opacity='0.9';
    sp.style.animation=`sparkleFly ${300+Math.random()*200}ms ease-out forwards`;
    cell.appendChild(sp);
    setTimeout(()=>sp.remove(),600);
  }
}

/* ---------- Gravity ---------- */
function applyGravity(){
  for(let c=0;c<WIDTH;c++){
    const stack=[];
    for(let r=HEIGHT-1;r>=0;r--){
      const i=r*WIDTH+c;
      if(board[i]) stack.push(board[i]);
    }
    while(stack.length<HEIGHT){
      const src=IMAGE_BASE+CANDIES[Math.floor(Math.random()*CANDIES.length)];
      stack.push({src});
    }
    for(let r=HEIGHT-1;r>=0;r--){
      board[r*WIDTH+c]=stack[HEIGHT-1-r];
    }
  }
  render();
  const next=findMatches();
  if(next.length>0) setTimeout(()=>handleMatches(next),250);
  else{
    combo=1;
    isSwapping=false;
  }
  updateHUD();
}

/* ---------- HUD ---------- */
function updateHUD(){
  const el=document.getElementById('score');
  if(el) el.textContent=score;
}

/* ---------- Key animations ---------- */
const style=document.createElement('style');
style.textContent=`
@keyframes floatUp{
  0%{opacity:1;transform:translate(-50%,-50%) scale(1);}
  100%{opacity:0;transform:translate(-50%,-150%) scale(1.3);}
}
@keyframes sparkleFly{
  0%{opacity:1;transform:translate(0,0) scale(1);}
  100%{opacity:0;transform:translate(${Math.random()*40-20}px,${-40-Math.random()*40}px) scale(0.3);}
}`;
document.head.appendChild(style);

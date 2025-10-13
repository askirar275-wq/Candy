(function(){
  const candies = ['candy1.png','candy2.png','candy3.png','candy4.png','candy5.png','candy6.png'];
  let grid = [], size = 8, score = 0;

  const $ = id => document.getElementById(id);

  // रैंडम कैंडी
  const randCandy = () => 'images/' + candies[Math.floor(Math.random() * candies.length)];

  // ग्रिड बनाओ
  function createGrid(){
    grid = Array.from({length: size}, ()=>Array.from({length: size}, randCandy));
    renderGrid();
  }

  // ग्रिड दिखाओ
  function renderGrid(){
    const board = $('game-board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;

        const img = document.createElement('img');
        img.className = 'tile';
        img.src = grid[r][c];
        cell.appendChild(img);
        board.appendChild(cell);

        attachSwipe(cell);
      }
    }
  }

  // स्वाइप इवेंट
  let startX, startY;
  function attachSwipe(cell){
    cell.addEventListener('touchstart', e => {
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
    });
    cell.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      if(Math.max(absX, absY) < 25) return;
      const r = +cell.dataset.r, c = +cell.dataset.c;
      let r2=r, c2=c;
      if(absX > absY) c2 += dx > 0 ? 1 : -1;
      else r2 += dy > 0 ? 1 : -1;
      if(r2<0||r2>=size||c2<0||c2>=size) return;
      swap(r,c,r2,c2);
    });
  }

  function swap(r1,c1,r2,c2){
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    renderGrid();
    checkMatches();
  }

  // मैच डिटेक्शन
  function checkMatches(){
    let matched = [];
    for(let r=0;r<size;r++){
      for(let c=0;c<size-2;c++){
        if(grid[r][c] && grid[r][c]===grid[r][c+1] && grid[r][c]===grid[r][c+2])
          matched.push([r,c],[r,c+1],[r,c+2]);
      }
    }
    for(let c=0;c<size;c++){
      for(let r=0;r<size-2;r++){
        if(grid[r][c] && grid[r][c]===grid[r+1][c] && grid[r][c]===grid[r+2][c])
          matched.push([r,c],[r+1,c],[r+2,c]);
      }
    }
    if(matched.length>0) removeMatched(matched);
  }

  // मैच हटाना + ग्रेविटी
  function removeMatched(matched){
    matched.forEach(([r,c])=> grid[r][c]=null);
    score += matched.length * 10;
    $('score').textContent = score;

    // ग्रेविटी
    for(let c=0;c<size;c++){
      for(let r=size-1;r>=0;r--){
        if(!grid[r][c]){
          for(let k=r-1;k>=0;k--){
            if(grid[k][c]){
              grid[r][c]=grid[k][c]; grid[k][c]=null; break;
            }
          }
        }
      }
      for(let r=0;r<size;r++) if(!grid[r][c]) grid[r][c]=randCandy();
    }
    renderGrid();
    setTimeout(checkMatches,100);
  }

  // गेम शुरू
  window.restartGame = function(){
    score=0; $('score').textContent='0';
    createGrid();
  };
  window.shuffleBoard = function(){
    grid.flat().sort(()=>Math.random()-0.5);
    createGrid();
  };

  // लेवल लिस्ट दिखाओ
  window.renderLevelMap = function(){
    const map = $('levelList');
    map.innerHTML = '';
    for(let i=1;i<=5;i++){
      const btn=document.createElement('button');
      btn.className='btn';
      btn.textContent='Level '+i;
      btn.onclick=()=>startLevel(i);
      map.appendChild(btn);
    }
  };

  function startLevel(lvl){
    $('currentLevel').textContent=lvl;
    createGrid();
    document.getElementById('map-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
  }

  // गेम इनिशियलाइज़
  document.addEventListener("DOMContentLoaded", ()=> createGrid());
})();

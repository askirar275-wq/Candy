// js/game.js
(function(){
  const CANDIES = [
    'images/candy1.png','images/candy2.png','images/candy3.png',
    'images/candy4.png','images/candy5.png','images/candy6.png'
  ];

  // state
  let state = {
    size: 8,
    board: [], // flat array length size*size of {img,index}
    score: 0,
    level: 1,
    running: false,
    selectedIndex: null
  };

  const $ = id => document.getElementById(id);

  // utility
  function randCandy(){ return CANDIES[Math.floor(Math.random()*CANDIES.length)]; }

  function updateHUD(){
    const s = $('score'); if(s) s.textContent = state.score;
    const c = $('coins'); if(c) c.textContent = StorageAPI.getCoins();
    const lv = $('currentLevel'); if(lv){ lv.textContent = state.level; }
  }

  // create fresh board
  function createBoard(){
    const size = state.size;
    state.board = new Array(size*size).fill(null).map((_,i)=>({ img: randCandy(), idx:i }));
    // render DOM
    renderBoard();
    // ensure no instant matches at start (very basic)
    removeAllMatches(true);
  }

  // render DOM cells
  function renderBoard(){
    const boardEl = $('game-board');
    if(!boardEl) return;
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${state.size},1fr)`;
    state.board.forEach((cell, index) => {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.index = index;
      if(!cell || !cell.img){ div.style.visibility='hidden'; } // empty
      const img = document.createElement('img');
      img.className = 'tile';
      img.draggable = false;
      img.src = (cell && cell.img) ? cell.img : '';
      div.appendChild(img);
      // click select for desktop fallback
      div.addEventListener('click', onCellClick);
      // touch handlers for swipe
      addTouchHandlers(div);
      boardEl.appendChild(div);
    });
  }

  function onCellClick(e){
    const idx = Number(e.currentTarget.dataset.index);
    if(state.selectedIndex === null){ selectIndex(idx); }
    else if(state.selectedIndex === idx){ deselect(); }
    else {
      // try swap
      trySwap(state.selectedIndex, idx);
    }
  }

  function selectIndex(i){
    state.selectedIndex = i;
    const prev = document.querySelector('.cell.selected');
    if(prev) prev.classList.remove('selected');
    const el = document.querySelector(`.cell[data-index="${i}"]`);
    if(el) el.classList.add('selected');
  }
  function deselect(){
    state.selectedIndex = null;
    const prev = document.querySelector('.cell.selected');
    if(prev) prev.classList.remove('selected');
  }

  // check adjacency
  function isAdjacent(a,b){
    const size = state.size;
    if(a<0||b<0) return false;
    const ax=a%size, ay=Math.floor(a/size);
    const bx=b%size, by=Math.floor(b/size);
    const dx=Math.abs(ax-bx), dy=Math.abs(ay-by);
    return (dx+dy)===1;
  }

  // swap & validate
  function trySwap(a,b){
    if(!isAdjacent(a,b)) { deselect(); return; }
    swap(a,b);
    // check match
    const matches = findMatches();
    if(matches.length){
      // good, remove and collapse
      removeAllMatches();
      deselect();
    } else {
      // revert swap
      swap(a,b);
      deselect();
    }
  }

  function swap(a,b){
    const t = state.board[a]; state.board[a]=state.board[b]; state.board[b]=t;
    renderBoard();
  }

  // find matches (rows/cols of 3+)
  function findMatches(){
    const size = state.size;
    const matches = [];
    const visited = new Set();

    // rows
    for(let r=0;r<size;r++){
      let runStart=0;
      for(let c=1;c<=size;c++){
        const prevIdx = r*size + (c-1);
        const curIdx = r*size + c;
        const prev = state.board[prevIdx];
        const cur = state.board[curIdx];
        if(c<size && prev && cur && prev.img===cur.img) {
          // continue run
        } else {
          const runLen = c - runStart;
          if(runLen>=3){
            for(let k=runStart;k<runStart+runLen;k++) matches.push(r*size + k);
          }
          runStart = c;
        }
      }
    }
    // cols
    for(let c=0;c<size;c++){
      let runStart=0;
      for(let r=1;r<=size;r++){
        const prevIdx = (r-1)*size + c;
        const curIdx = r*size + c;
        const prev = state.board[prevIdx];
        const cur = state.board[curIdx];
        if(r<size && prev && cur && prev.img===cur.img){
          // continue
        } else {
          const runLen = r - runStart;
          if(runLen>=3){
            for(let k=runStart;k<runStart+runLen;k++) matches.push(k*size + c);
          }
          runStart = r;
        }
      }
    }

    // unique
    return Array.from(new Set(matches));
  }

  // remove matches, score, gravity, refill. if initial:true avoid animation
  function removeAllMatches(initial){
    let matches = findMatches();
    if(matches.length===0) return false;
    // mark removed
    matches.forEach(i => state.board[i]=null);
    // update score/coins
    const gained = matches.length * 20;
    state.score += gained;
    StorageAPI.addCoins(Math.floor(gained/10));
    updateHUD();
    // collapse columns
    collapseBoard();
    // refill
    refillBoard();
    // after refill, chain reaction
    setTimeout(()=> {
      if(findMatches().length) removeAllMatches();
    }, initial ? 0 : 180);
    renderBoard();
    return true;
  }

  function collapseBoard(){
    const size = state.size;
    for(let c=0;c<size;c++){
      let write = size-1;
      for(let r=size-1;r>=0;r--){
        const idx = r*size + c;
        if(state.board[idx]){
          if(write !== r){
            state.board[write] = state.board[idx];
            state.board[write].idx = write;
            state.board[idx]=null;
          }
          write--;
        }
      }
      // above write positions become null (already)
    }
  }

  function refillBoard(){
    const size = state.size;
    for(let i=0;i<size*size;i++){
      if(!state.board[i]){
        state.board[i] = { img: randCandy(), idx:i };
      }
    }
  }

  // shuffle board randomize all candies
  window.shuffleBoard = function(){
    state.board.forEach((cell,i) => { state.board[i] = { img: randCandy(), idx:i }; });
    renderBoard();
    console.log('Board shuffled');
  };

  // restart
  window.restartGame = function(){
    state.score = 0;
    StorageAPI.setCoins( StorageAPI.getCoins() ); // keep
    createBoard();
    updateHUD();
    console.log('Game restarted');
  };

  // buy from shop (simple)
  window.buyFromShop = function(item){
    const coins = StorageAPI.getCoins();
    const prices = { shuffle:100, bomb:200 };
    const p = prices[item] || 0;
    if(coins>=p){ StorageAPI.addCoins(-p); if(item==='shuffle') shuffleBoard(); updateHUD(); console.log('bought',item); }
    else alert('Not enough coins');
  };

  // touch / swipe helpers
  function addTouchHandlers(div){
    let startX=0,startY=0, startIdx=null;
    div.addEventListener('touchstart', (e)=>{
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      startIdx = Number(div.dataset.index);
    }, {passive:true});

    div.addEventListener('touchend', (e)=>{
      if(startIdx===null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      const threshold = 18; // min swipe
      let targetIdx = null;
      if(absX>absY && absX>threshold){
        // horizontal
        if(dx>0) targetIdx = startIdx+1; else targetIdx = startIdx-1;
      } else if(absY>absX && absY>threshold){
        // vertical
        if(dy>0) targetIdx = startIdx + state.size; else targetIdx = startIdx - state.size;
      }
      if(targetIdx!==null && isAdjacent(startIdx,targetIdx)){
        trySwap(startIdx, targetIdx);
      }
      startIdx = null;
    }, {passive:true});
  }

  // init game
  window.initGame = function(opts){
    try{
      state.level = StorageAPI.getLevel() || 1;
      state.size = (opts && opts.boardSize) ? opts.boardSize : (state.level>=3 ? 9 : 8);
      state.score = 0;
      state.running = true;
      // create board
      createBoard();
      updateHUD();
      console.log('Game initialized at level', state.level);
    }catch(e){ console.error('Error: initGame', e); }
  };

  // expose small debug helpers
  window.addCoins = function(n){ StorageAPI.addCoins(Number(n||0)); updateHUD(); };
  window.setGameLevel = function(l){ StorageAPI.setLevel(l); state.level = l; updateHUD(); };

  // initial HUD update
  document.addEventListener('DOMContentLoaded', updateHUD);

  console.log('Loaded: js/game.js');
})();

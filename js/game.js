// ========================= Candy Match (Stable) =========================
// Fixed version: candies no longer change when swapped
// Includes: level, coins, shop compatibility

(function(){
  // --- Game config ---
  const WIDTH = 6;        // columns
  const HEIGHT = 8;       // rows
  const SIZE = WIDTH * HEIGHT;
  const IMGPATH = "images/";
  const CANDIES = [
    "candy1.png","candy2.png","candy3.png","candy4.png",
    "candy5.png","candy6.png","candy7.png","candy8.png"
  ];

  // --- State ---
  let board = [];
  let selectedIndex = null;
  let score = 0;
  let combo = 1;
  let isResolving = false;
  let nextId = 1;

  // --- Helpers ---
  const $ = id => document.getElementById(id);
  const randCandy = () => IMGPATH + CANDIES[Math.floor(Math.random() * CANDIES.length)];
  const makeTile = () => ({ id: nextId++, src: randCandy() });

  // --- Storage API ---
  const StorageAPI = {
    getCoins(){ return Number(localStorage.getItem('cm_coins') || 0); },
    addCoins(n){ const v = this.getCoins() + Number(n||0); localStorage.setItem('cm_coins', String(Math.max(0,v))); },
    getLevel(){ return Number(localStorage.getItem('cm_level') || 1); },
    setLevel(l){ localStorage.setItem('cm_level', String(l)); }
  };

  // --- Init ---
  function initBoard(){
    nextId = 1;
    board = new Array(SIZE).fill(null).map(()=> makeTile());
    score = 0;
    combo = 1;
    selectedIndex = null;
    render();
  }

  // --- Render ---
  function render(dropMap){
    const grid = $('game-board') || $('board');
    if(!grid) return console.warn('No board element found');

    grid.style.gridTemplateColumns = `repeat(${WIDTH}, var(--tile))`;
    grid.innerHTML = '';

    for(let i=0;i<SIZE;i++){
      const tile = board[i];
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;

      const img = document.createElement('img');
      img.className = 'tile';
      img.draggable = false;

      // ✅ fix: show same candy, not new random
      if(tile && tile.src){
        img.src = tile.src;
        img.style.visibility = '';
      } else {
        img.src = '';
        img.style.visibility = 'hidden';
      }

      cell.appendChild(img);

      // selection
      if(selectedIndex === i) cell.classList.add('selected');

      // clicking logic
      cell.addEventListener('click', () => onCellClick(i));

      grid.appendChild(cell);
    }

    // Update HUD
    const s = $('score'); if(s) s.textContent = score;
    const c = $('coins'); if(c) c.textContent = StorageAPI.getCoins();
    const sc = $('shopCoins'); if(sc) sc.textContent = StorageAPI.getCoins();
    const lvl = $('currentLevel'); if(lvl) lvl.textContent = StorageAPI.getLevel();
  }

  // --- Click handler ---
  function onCellClick(i){
    if(isResolving) return;
    if(selectedIndex === null){
      selectedIndex = i;
      render();
      return;
    }

    if(selectedIndex === i){
      selectedIndex = null;
      render();
      return;
    }

    // Only swap adjacent
    if(!isAdjacent(selectedIndex, i)){
      selectedIndex = i;
      render();
      return;
    }

    swapTiles(selectedIndex, i);
    render();
    const matches = findMatches();
    if(matches.length){
      resolveMatches(matches);
    } else {
      // revert after small delay
      setTimeout(()=> {
        swapTiles(selectedIndex, i);
        render();
      }, 250);
    }
    selectedIndex = null;
  }

  // --- Helpers ---
  function isAdjacent(a,b){
    const r1 = Math.floor(a/WIDTH), c1 = a%WIDTH;
    const r2 = Math.floor(b/WIDTH), c2 = b%WIDTH;
    return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
  }

  function swapTiles(a,b){
    [board[a], board[b]] = [board[b], board[a]];
  }

  // --- Match detection ---
  function findMatches(){
    const set = new Set();
    // horizontal
    for(let r=0;r<HEIGHT;r++){
      for(let c=0;c<WIDTH-2;c++){
        const i = r*WIDTH + c;
        if(board[i] && board[i+1] && board[i+2] &&
           board[i].src === board[i+1].src &&
           board[i].src === board[i+2].src){
          set.add(i); set.add(i+1); set.add(i+2);
          let k=c+3;
          while(k<WIDTH && board[r*WIDTH+k] && board[r*WIDTH+k].src===board[i].src){
            set.add(r*WIDTH+k); k++;
          }
        }
      }
    }
    // vertical
    for(let c=0;c<WIDTH;c++){
      for(let r=0;r<HEIGHT-2;r++){
        const i = r*WIDTH + c;
        if(board[i] && board[i+WIDTH] && board[i+2*WIDTH] &&
           board[i].src===board[i+WIDTH].src &&
           board[i].src===board[i+2*WIDTH].src){
          set.add(i); set.add(i+WIDTH); set.add(i+2*WIDTH);
          let k=r+3;
          while(k<HEIGHT && board[k*WIDTH+c] && board[k*WIDTH+c].src===board[i].src){
            set.add(k*WIDTH+c); k++;
          }
        }
      }
    }
    return Array.from(set);
  }

  // --- Resolve matches ---
  function resolveMatches(matches){
    if(matches.length===0) return;
    isResolving = true;

    matches.forEach(i => { board[i] = null; });

    // scoring
    score += matches.length * 10 * combo;
    const coinGain = Math.floor(matches.length / 3) * 5;
    if(coinGain > 0){
      StorageAPI.addCoins(coinGain);
      showCoinPopup('+' + coinGain + ' 💰');
    }

    render();

    setTimeout(()=>{
      // gravity
      for(let c=0;c<WIDTH;c++){
        const stack = [];
        for(let r=HEIGHT-1;r>=0;r--){
          const idx = r*WIDTH + c;
          if(board[idx]) stack.push(board[idx]);
        }
        while(stack.length<HEIGHT) stack.push(makeTile());
        for(let r=HEIGHT-1,i=0;r>=0;r--,i++){
          board[r*WIDTH + c] = stack[i];
        }
      }
      render();
      const nextMatches = findMatches();
      if(nextMatches.length){
        setTimeout(()=>resolveMatches(nextMatches), 200);
      } else {
        combo = 1;
        isResolving = false;
      }
    }, 300);
  }

  // --- Coin popup ---
  function showCoinPopup(text){
    const el = document.createElement('div');
    el.className = 'coin-popup';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(()=> el.remove(), 1000);
  }

  // --- Restart & Shuffle ---
  function restartGame(){
    initBoard();
  }

  function shuffleBoard(){
    const srcs = board.map(t => t ? t.src : randCandy());
    for(let i=srcs.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [srcs[i],srcs[j]]=[srcs[j],srcs[i]];
    }
    for(let i=0;i<SIZE;i++){
      board[i].src = srcs[i];
    }
    render();
  }

  // --- Shop handler ---
  window.buyFromShop = function(item){
    const prices = {bomb:200, shuffle:100, moves:80, rainbow:350};
    const price = prices[item] || 0;
    if(StorageAPI.getCoins() < price){
      alert('कॉइन्स कम हैं!');
      return;
    }
    StorageAPI.addCoins(-price);
    if(item==='shuffle') shuffleBoard();
    if(item==='moves') showCoinPopup('+10 Moves ✨');
    render();
  };

  // --- Expose for UI ---
  window.initGame = function(){
    initBoard();
    score = 0;
    render();
    console.log("✅ Game initialized");
  };
  window.restartGame = restartGame;
  window.shuffleBoard = shuffleBoard;

  // --- Auto load message ---
  console.log("🎮 game.js loaded successfully (no random swap bug)");
})();

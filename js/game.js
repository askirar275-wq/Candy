// ===== Candy Match - 6 Candy Version =====
(function(){
  console.log("✅ game.js (6 candy version) loaded");

  const CANDY_IMAGES = [
    "images/candy1.png",
    "images/candy2.png",
    "images/candy3.png",
    "images/candy4.png",
    "images/candy5.png",
    "images/candy6.png"
  ];

  const LEVELS = [
    null,
    { id: 1, title: "Beginner", goalScore: 100, rewardCoins: 50, boardSize: 7 },
    { id: 2, title: "ChocoLand", goalScore: 300, rewardCoins: 120, boardSize: 7 },
    { id: 3, title: "SugarHill", goalScore: 700, rewardCoins: 200, boardSize: 8 },
  ];

  let state = {
    level: 1,
    score: 0,
    board: [],
    size: 7,
    selected: null,
    running: false
  };

  const $ = id => document.getElementById(id);

  function randCandy(){
    const i = Math.floor(Math.random() * CANDY_IMAGES.length);
    return CANDY_IMAGES[i];
  }

  // ====== BOARD CREATION ======
  function createBoard(){
    const board = $('game-board');
    if(!board) return;
    const size = state.size;
    state.board = [];
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for(let r=0;r<size;r++){
      state.board[r] = [];
      for(let c=0;c<size;c++){
        const candy = randCandy();
        state.board[r][c] = candy;

        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        const img = document.createElement("img");
        img.src = candy;
        img.className = "tile";
        cell.appendChild(img);
        board.appendChild(cell);
      }
    }
    bindTiles();
  }

  // ====== TILE BINDING & SWAP ======
  function bindTiles(){
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
      cell.addEventListener("click", () => selectTile(cell));
    });
  }

  function selectTile(cell){
    if(!cell) return;
    const sel = state.selected;
    if(sel){
      const r1 = +sel.dataset.r, c1 = +sel.dataset.c;
      const r2 = +cell.dataset.r, c2 = +cell.dataset.c;
      if(Math.abs(r1-r2)+Math.abs(c1-c2)===1){
        swapTiles(sel, cell);
        state.selected = null;
      } else {
        sel.classList.remove("selected-cell");
        state.selected = cell;
        cell.classList.add("selected-cell");
      }
    } else {
      cell.classList.add("selected-cell");
      state.selected = cell;
    }
  }

  function swapTiles(a,b){
    const imgA = a.querySelector("img");
    const imgB = b.querySelector("img");
    const temp = imgA.src;
    imgA.src = imgB.src;
    imgB.src = temp;
    a.classList.remove("selected-cell");
    checkMatches();
  }

  // ====== MATCH DETECTION ======
  function checkMatches(){
    const imgs = Array.from(document.querySelectorAll("#game-board .tile"));
    const size = state.size;
    const matches = [];

    // grid index from list
    const get = (r,c) => imgs[r*size + c];

    for(let r=0;r<size;r++){
      for(let c=0;c<size-2;c++){
        const a=get(r,c), b=get(r,c+1), c2=get(r,c+2);
        if(a && b && c2 && a.src===b.src && b.src===c2.src){
          matches.push(a,b,c2);
        }
      }
    }
    for(let c=0;c<size;c++){
      for(let r=0;r<size-2;r++){
        const a=get(r,c), b=get(r+1,c), c2=get(r+2,c);
        if(a && b && c2 && a.src===b.src && b.src===c2.src){
          matches.push(a,b,c2);
        }
      }
    }

    if(matches.length>0){
      matches.forEach(m=>m.classList.add("pop"));
      setTimeout(()=>{
        matches.forEach(m=>{
          m.src = randCandy();
          m.classList.remove("pop");
        });
        state.score += matches.length * 10;
        updateScoreUI();
      }, 300);
    }
  }

  // ====== SCORE & LEVEL ======
  function updateScoreUI(){
    const el = $('score');
    if(el) el.textContent = state.score;
    const lvlInfo = LEVELS[state.level];
    if(state.score >= lvlInfo.goalScore){
      nextLevel();
    }
  }

  function nextLevel(){
    const next = state.level + 1;
    if(LEVELS[next]){
      alert(`🎉 Level ${next} Unlocked!`);
      state.level = next;
      state.score = 0;
      StorageAPI.setLevel(next);
      createBoard();
      updateScoreUI();
    } else {
      alert("🏆 You completed all levels!");
    }
  }

  // ====== INIT ======
  window.initGame = function(){
    state.level = StorageAPI.getLevel();
    const lvlInfo = LEVELS[state.level];
    state.size = lvlInfo.boardSize;
    state.score = 0;
    state.running = true;
    createBoard();
    updateScoreUI();
    console.log("Game ready with 6 candies 🍬");
  };

  window.restartGame = function(){
    createBoard();
    state.score = 0;
    updateScoreUI();
  };

  window.shuffleBoard = function(){
    const imgs = document.querySelectorAll("#game-board .tile");
    imgs.forEach(i=>i.src=randCandy());
  };

})();

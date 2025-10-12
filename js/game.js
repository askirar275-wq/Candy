// js/game.js
// Complete game logic with matches, clear, gravity and refill
(function(){
  const BOARD_SIZE = 8;                // 8x8 board
  const CANDIES = [
    "candy1.png","candy2.png","candy3.png",
    "candy4.png","candy5.png","candy6.png"
  ];
  const BOARD_SEL = "#game-board";

  let boardElem;
  let tiles = [];      // array of <img> elements (length = BOARD_SIZE*BOARD_SIZE)
  let selected = null;
  let score = 0;

  // helper
  const $ = id => document.getElementById(id);

  function randomCandySrc(){
    return "images/" + CANDIES[Math.floor(Math.random() * CANDIES.length)];
  }

  function indexToRC(idx){
    return { r: Math.floor(idx/BOARD_SIZE), c: idx % BOARD_SIZE };
  }
  function rcToIndex(r,c){ return r*BOARD_SIZE + c; }

  // create board DOM and initial candies
  function createBoard(){
    boardElem = document.querySelector(BOARD_SEL);
    if(!boardElem) {
      console.error("game-board element not found");
      return;
    }
    boardElem.innerHTML = "";
    boardElem.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    boardElem.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 1fr)`;
    tiles = [];
    for(let i=0;i<BOARD_SIZE*BOARD_SIZE;i++){
      const cell = document.createElement("div");
      cell.className = "cell";
      const img = document.createElement("img");
      img.className = "tile";
      img.draggable = false;
      img.dataset.idx = i;
      img.src = randomCandySrc();
      img.addEventListener("click", () => onTileClick(img));
      cell.appendChild(img);
      boardElem.appendChild(cell);
      tiles.push(img);
    }
    // ensure initial board has no immediate automatic matches (optional quick fix: reshuffle until ok)
    removeAllMatchesAndRefillIfAny(true);
  }

  // click/select logic
  function onTileClick(img){
    if(!selected){
      selected = img;
      img.classList.add('selected');
      return;
    }
    if(selected === img){
      selected.classList.remove('selected');
      selected = null;
      return;
    }
    // swap and check
    swapTiles(selected, img);
    const matches = findAllMatches();
    if(matches.size === 0){
      // no match -> swap back after tiny delay for UX
      setTimeout(()=> swapTiles(selected, img), 180);
    } else {
      // we have matches -> process removal chain
      processMatchesChain();
    }
    if(selected) selected.classList.remove('selected');
    selected = null;
  }

  function swapTiles(aImg, bImg){
    const tmp = aImg.src;
    aImg.src = bImg.src;
    bImg.src = tmp;
  }

  // find all matches (returns Set of indices)
  function findAllMatches(){
    const toClear = new Set();

    // rows
    for(let r=0;r<BOARD_SIZE;r++){
      let streak = 1;
      for(let c=0;c<BOARD_SIZE;c++){
        const idx = rcToIndex(r,c);
        const cur = tiles[idx].src || "";
        const next = (c+1<BOARD_SIZE) ? tiles[rcToIndex(r,c+1)].src : null;
        if(cur && next && cur === next){
          streak++;
        } else {
          if(streak >= 3){
            // add previous streak indices
            for(let k=0;k<streak;k++){
              toClear.add(rcToIndex(r, c - k));
            }
          }
          streak = 1;
        }
      }
    }

    // cols
    for(let c=0;c<BOARD_SIZE;c++){
      let streak = 1;
      for(let r=0;r<BOARD_SIZE;r++){
        const idx = rcToIndex(r,c);
        const cur = tiles[idx].src || "";
        const next = (r+1<BOARD_SIZE) ? tiles[rcToIndex(r+1,c)].src : null;
        if(cur && next && cur === next){
          streak++;
        } else {
          if(streak >= 3){
            for(let k=0;k<streak;k++){
              toClear.add(rcToIndex(r - k, c));
            }
          }
          streak = 1;
        }
      }
    }

    return toClear;
  }

  // clear matches (set src = "")
  function clearMatches(indicesSet){
    if(indicesSet.size === 0) return 0;
    let points = 0;
    indicesSet.forEach(idx => {
      const img = tiles[idx];
      if(img && img.src){
        img.src = "";  // mark empty
        points += 10;
      }
    });
    score += points;
    updateScoreUI();
    // optional: give small coin reward
    StorageAPI.addCoins(Math.floor(points/20));
    updateCoinDisplay();
    return points;
  }

  // gravity: collapse columns so candies fall down, returns number of new tiles created
  function collapseColumns(){
    for(let c=0;c<BOARD_SIZE;c++){
      const col = [];
      // collect non-empty from bottom to top
      for(let r=BOARD_SIZE-1;r>=0;r--){
        const idx = rcToIndex(r,c);
        const src = tiles[idx].src;
        if(src && src.length > 0) col.push(src);
      }
      // fill column bottom-up
      let rptr = BOARD_SIZE-1;
      for(let k=0;k<col.length;k++){
        tiles[rcToIndex(rptr,c)].src = col[k];
        rptr--;
      }
      // remaining top cells -> empty
      for(let rr=rptr; rr>=0; rr--){
        tiles[rcToIndex(rr,c)].src = "";
      }
    }
  }

  // refill: fill empty ('') slots with random candies
  function refillBoard(){
    for(let i=0;i<tiles.length;i++){
      if(!tiles[i].src || tiles[i].src === ""){
        tiles[i].src = randomCandySrc();
      }
    }
  }

  // runs clear -> collapse -> refill repeatedly until no more matches
  function processMatchesChain(){
    let totalCleared = 0;
    function step(){
      const matches = findAllMatches();
      if(matches.size === 0){
        // finished
        return;
      }
      const cleared = clearMatches(matches);
      totalCleared += cleared;
      // small animation delay for UX
      setTimeout(()=>{
        collapseColumns();
        refillBoard();
        // next step may create new matches
        setTimeout(step, 220);
      }, 200);
    }
    step();
  }

  // utility: remove any initial matches and refill (used at board create)
  function removeAllMatchesAndRefillIfAny(isInitial=false){
    // loop until no matches
    let safety = 0;
    while(true){
      const matches = findAllMatches();
      if(matches.size === 0) break;
      clearMatches(matches);
      collapseColumns();
      refillBoard();
      safety++;
      if(safety > 10) break;
    }
    // if initial, reset score and coins additions from above
    if(isInitial){
      score = 0; updateScoreUI();
      // remove any coins that were added during initial clear
      // keep it simple: don't change stored coins here
    }
  }

  // UI updates
  function updateScoreUI(){ const s = $("score"); if(s) s.textContent = score; }
  function updateCoinDisplay(){ const c = $("coins"); if(c) c.textContent = StorageAPI.getCoins(); }

  // external controls
  function restartGame(){
    score = 0; updateScoreUI();
    createBoard();
    console.log("Game restarted");
  }
  function shuffleBoard(){
    tiles.forEach(img => img.src = randomCandySrc());
    // after shuffle ensure no instant matches (optional)
    removeAllMatchesAndRefillIfAny();
    console.log("Board shuffled");
  }

  // expose functions globally
  window.initGame = function(){
    try {
      createBoard();
      updateScoreUI();
      updateCoinDisplay();
      console.log("Game initialized");
    } catch(e){
      console.error("initGame error", e);
    }
  };
  window.restartGame = restartGame;
  window.shuffleBoard = shuffleBoard;

  // wire simple UI buttons (if present)
  document.addEventListener("DOMContentLoaded", () => {
    const rb = $("restartBtn"); if(rb) rb.addEventListener("click", restartGame);
    const sb = $("shuffleBtn"); if(sb) sb.addEventListener("click", shuffleBoard);
    const home = $("homeBtn"); if(home) home.addEventListener("click", ()=> window.location.href = "level-map.html");
    // initialize automatically if asked by safe-ui
    // but do NOT auto-init here to avoid double-init: safe-ui calls initGame normally
  });

  // small log
  console.log("Loaded: js/game.js (match+gravity)");
})();

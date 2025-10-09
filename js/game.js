// js/game.js
// Smooth swap + safe UI + level support
(function(){
  'use strict';

  // CONFIG: candy images (folder images/)
  const CANDY_IMAGES = [
    'images/candy1.png','images/candy2.png','images/candy3.png','images/candy4.png',
    'images/candy5.png','images/candy6.png','images/candy7.png','images/candy8.png',
    'images/candy9.png','images/candy10.png'
  ];

  // Levels config (example) — अगर level.js अलग है तो यहाँ sync कर लो
  const LEVELS = [ null,
    { id:1, title:'Beginner', goalScore:100, rewardCoins:50, boardSize:8 },
    { id:2, title:'Explorer', goalScore:300, rewardCoins:120, boardSize:8 },
    { id:3, title:'Challenger', goalScore:700, rewardCoins:250, boardSize:9 }
  ];

  // state
  let state = {
    level: 1,
    score: 0,
    boardSize: 8,
    board: [], // 2D array of indices into CANDY_IMAGES
    selected: null, // {r,c,el}
    running: false
  };

  // helper: safe get element
  const $ = id => document.getElementById(id);

  // safe StorageAPI shim (fir se check) - expect actual storage.js to exist
  if(typeof window.StorageAPI === 'undefined'){
    window.StorageAPI = {
      getCoins(){ return Number(localStorage.getItem('coins')||0); },
      addCoins(n){ const v = Number(localStorage.getItem('coins')||0)+Number(n||0); localStorage.setItem('coins', v); return v; },
      getLevel(){ return Number(localStorage.getItem('level')||1); },
      setLevel(l){ localStorage.setItem('level', Number(l||1)); }
    };
  }

  // update coin display
  function updateCoinDisplay(){
    const el = $('coins');
    if(el) el.textContent = StorageAPI.getCoins();
    const shop = $('shopCoins'); if(shop) shop.textContent = StorageAPI.getCoins();
  }

  // update score UI
  function updateScoreUI(){
    const s = $('score'); if(s) s.textContent = state.score;
  }

  // update level UI
  function updateLevelUI(){
    const cur = $('currentLevel'); if(cur) cur.textContent = state.level;
    const levelInfo = LEVELS[state.level] || LEVELS[1];
    state.boardSize = levelInfo && levelInfo.boardSize ? levelInfo.boardSize : 8;
    // adjust CSS grid columns
    const board = $('game-board');
    if(board){
      board.style.gridTemplateColumns = `repeat(${state.boardSize}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${state.boardSize}, 1fr)`;
    }
  }

  // Random index
  function randIndex(){ return Math.floor(Math.random()*CANDY_IMAGES.length); }

  // Create empty board + fill random candies
  function initBoard() {
    const n = state.boardSize;
    state.board = [];
    for(let r=0;r<n;r++){
      const row = [];
      for(let c=0;c<n;c++){
        row.push(randIndex());
      }
      state.board.push(row);
    }
  }

  // Render board DOM — each .cell contains an img.tile positioned normally.
  function renderBoard(){
    const boardEl = $('game-board');
    if(!boardEl) { console.warn('renderBoard: #game-board missing'); return; }
    boardEl.innerHTML = '';
    const n = state.boardSize;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        const idx = state.board[r][c];
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        // make cell position:relative so we can animate child
        cell.style.position = 'relative';
        const img = document.createElement('img');
        img.className = 'tile';
        img.draggable = false;
        img.src = CANDY_IMAGES[idx];
        img.dataset.idx = idx;
        img.style.transition = 'transform 240ms ease';
        img.style.position = 'absolute';
        img.style.left = '0';
        img.style.top = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        cell.appendChild(img);
        // click handler
        cell.addEventListener('click', onCellClick);
        boardEl.appendChild(cell);
      }
    }
  }

  // check adjacency
  function areAdjacent(a,b){
    if(!a||!b) return false;
    const dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c);
    return (dr===1 && dc===0) || (dr===0 && dc===1);
  }

  // get cell element by r,c
  function getCellElement(r,c){
    return document.querySelector(`#game-board .cell[data-r="${r}"][data-c="${c}"]`);
  }

  // click handler
  function onCellClick(e){
    const cell = e.currentTarget;
    const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
    // if nothing selected -> select
    if(!state.selected){
      selectCell(r,c,cell);
      return;
    }
    // if same cell -> deselect
    if(state.selected.r===r && state.selected.c===c){
      unselectCell();
      return;
    }
    // if adjacent -> swap with animation
    const sel = { r: state.selected.r, c: state.selected.c, el: state.selected.el };
    const dest = { r, c, el: cell };
    if(areAdjacent(sel,dest)){
      unselectCell(); // clear selection UI
      animateSwap(sel.el, dest.el, () => {
        // swap data in board array
        const tmp = state.board[sel.r][sel.c];
        state.board[sel.r][sel.c] = state.board[dest.r][dest.c];
        state.board[dest.r][dest.c] = tmp;
        // update img srcs to match board state (after swap)
        const imgA = sel.el.querySelector('img.tile');
        const imgB = dest.el.querySelector('img.tile');
        if(imgA && imgB){
          const aIdx = state.board[sel.r][sel.c];
          const bIdx = state.board[dest.r][dest.c];
          imgA.src = CANDY_IMAGES[aIdx];
          imgA.dataset.idx = aIdx;
          imgB.src = CANDY_IMAGES[bIdx];
          imgB.dataset.idx = bIdx;
        }
        // placeholder: score change on successful swap (you can replace with match logic)
        addScore(10);
      });
    } else {
      // not adjacent -> change selection to new
      selectCell(r,c,cell);
    }
  }

  function selectCell(r,c,el){
    unselectCell();
    state.selected = { r, c, el };
    el.classList.add('selected-cell');
    // visual highlight
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  }
  function unselectCell(){
    if(state.selected && state.selected.el){
      state.selected.el.classList.remove('selected-cell');
      state.selected.el.style.boxShadow = '';
    }
    state.selected = null;
  }

  // animate swap between two cell elements (move images smoothly)
  function animateSwap(cellA, cellB, cb){
    if(!cellA || !cellB){ if(cb) cb(); return; }
    const imgA = cellA.querySelector('img.tile');
    const imgB = cellB.querySelector('img.tile');
    if(!imgA || !imgB){ if(cb) cb(); return; }

    // compute offset between cells
    const rectA = imgA.getBoundingClientRect();
    const rectB = imgB.getBoundingClientRect();
    const dx = rectB.left - rectA.left;
    const dy = rectB.top - rectA.top;

    // prepare transitions
    imgA.style.transition = 'transform 260ms ease';
    imgB.style.transition = 'transform 260ms ease';
    imgA.style.transform = `translate(${dx}px, ${dy}px)`;
    imgB.style.transform = `translate(${-dx}px, ${-dy}px)`;

    // when done, clear transforms and call cb
    let done = 0;
    function onDone(){
      done++;
      if(done<2) return;
      // cleanup
      imgA.style.transition = '';
      imgB.style.transition = '';
      imgA.style.transform = '';
      imgB.style.transform = '';
      // callback after animation completes
      if(cb) cb();
    }
    const tEndA = ()=>{ imgA.removeEventListener('transitionend', tEndA); onDone(); };
    const tEndB = ()=>{ imgB.removeEventListener('transitionend', tEndB); onDone(); };
    imgA.addEventListener('transitionend', tEndA);
    imgB.addEventListener('transitionend', tEndB);

    // safety fallback: if transitionend doesn't fire (rare), call after timeout
    setTimeout(()=>{ try{ imgA.dispatchEvent(new Event('transitionend')); imgB.dispatchEvent(new Event('transitionend')); }catch(e){} }, 400);
  }

  // add score
  function addScore(n){
    state.score += Number(n||0);
    updateScoreUI();
    // check level completion
    const info = LEVELS[state.level] || LEVELS[1];
    if(state.score >= (info.goalScore || Infinity)){
      state.score = 0;
      updateScoreUI();
      levelCompleted();
    }
  }

  // level completed handler
  function levelCompleted(){
    const current = state.level;
    const next = current + 1;
    const reward = (LEVELS[current] && LEVELS[current].rewardCoins) ? LEVELS[current].rewardCoins : 0;
    if(reward) StorageAPI.addCoins(reward);
    if(LEVELS[next]){
      StorageAPI.setLevel(next);
      state.level = next;
      updateLevelUI();
      showLevelUpModal(next, reward);
    } else {
      showLevelUpModal(current, reward, true);
    }
    updateCoinDisplay();
  }

  function showLevelUpModal(level, coinsReward, last=false){
    const modal = $('levelUpModal'); if(!modal) return;
    const title = $('levelUpTitle'); const text = $('levelUpText');
    if(title) title.textContent = last ? 'All Levels Complete!' : 'Level Up!';
    if(text) text.textContent = last ? `You finished level ${level}. Reward ${coinsReward} coins.` :
                                       `Level ${level-1} complete. Level ${level} unlocked! Reward ${coinsReward} coins.`;
    modal.style.display = 'flex';
  }

  // Public API
  window.initGame = function(){
    try {
      state.level = StorageAPI.getLevel() || 1;
      state.score = 0;
      state.running = true;
      updateLevelUI();
      initBoard();
      renderBoard();
      updateScoreUI();
      updateCoinDisplay();
      console.log('Game initialized at level', state.level);
    } catch(err){
      console.error('initGame error', err);
    }
  };

  window.restartGame = function(){
    state.score = 0;
    initBoard();
    renderBoard();
    updateScoreUI();
    console.log('Game restarted');
  };

  window.shuffleBoard = function(){
    // reshuffle: randomize indices, update images
    for(let r=0;r<state.boardSize;r++){
      for(let c=0;c<state.boardSize;c++){
        state.board[r][c] = randIndex();
      }
    }
    renderBoard();
    console.log('Board shuffled');
  };

  // shop buy handler (called from safe-ui)
  window.buyFromShop = function(item){
    const prices = { bomb:200, shuffle:100, moves:80, rainbow:350 };
    const p = prices[item] || 0;
    const coins = StorageAPI.getCoins();
    if(coins >= p){
      StorageAPI.addCoins(-p);
      updateCoinDisplay();
      if(item==='shuffle') shuffleBoard();
      console.log('Bought', item);
    } else {
      console.warn('Not enough coins', item);
    }
  };

  window.addCoins = function(n){
    StorageAPI.addCoins(Number(n||0));
    updateCoinDisplay();
  };

  // helper: safe init if DOM ready
  document.addEventListener('DOMContentLoaded', ()=> {
    // if someone called initGame earlier, it's fine; else auto-init not required
    console.log('Loaded: js/game.js');
  });

})();

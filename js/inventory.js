// js/inventory.js
// Inventory & Shop logic for Candy Match
// Hindi comments for easy understanding

(function(){
  // ----- Config -----
  const STORAGE_COINS_KEY = 'candy_coins';
  const STORAGE_INV_KEY   = 'candy_inv';
  const DEFAULT_COINS = 250;

  // Price list (same as shop UI)
  const PRICE = {
    bomb: 200,
    shuffle: 100,
    moves: 80,
    rainbow: 350
  };

  // ----- State -----
  let coins = Number(localStorage.getItem(STORAGE_COINS_KEY) || DEFAULT_COINS);
  let inv = JSON.parse(localStorage.getItem(STORAGE_INV_KEY) || JSON.stringify({
    bomb:0, shuffle:0, moves:0, rainbow:0
  }));

  // DOM refs (may exist from index.html)
  const shopModal = document.getElementById('shopModal');
  const shopCoins = document.getElementById('shopCoins');
  const coinsBubble = document.getElementById('coins');
  const openShopBtn = document.getElementById('openShopBtn');
  const shopBtn = document.getElementById('shopBtn');
  const closeShopBtn = document.getElementById('closeShop');
  const buyBombBtn = document.getElementById('buyBomb');
  const buyShuffleBtn = document.getElementById('buyShuffle');
  const buyMovesBtn = document.getElementById('buyMoves');
  const buyRainbowBtn = document.getElementById('buyRainbow');
  const invToolbar = document.getElementById('inv-toolbar');

  // Fallbacks if DOM missing, create minimal UI pieces
  function createFallbackToolbar(){
    if(!invToolbar){
      const t = document.createElement('div');
      t.id = 'inv-toolbar';
      t.style.display = 'flex';
      t.style.gap = '8px';
      t.style.justifyContent = 'center';
      t.style.marginTop = '10px';
      const parent = document.getElementById('game-screen') || document.body;
      parent.appendChild(t);
    }
  }

  // Ensure minimal buttons in toolbar
  function ensureInvToolbarButtons(){
    createFallbackToolbar();
    const toolbar = document.getElementById('inv-toolbar');
    if(!toolbar) return;

    // Clear existing
    toolbar.innerHTML = '';

    // Helper create button
    function createBtn(id, label, handler){
      const b = document.createElement('button');
      b.id = id;
      b.className = 'inv-btn';
      b.innerHTML = label + ` <span class="inv-count">x${inv[id]||0}</span>`;
      b.addEventListener('click', handler);
      return b;
    }

    // Bomb
    toolbar.appendChild(createBtn('useInvBomb', '💣 Bomb', ()=> useInventory('bomb')));
    // Shuffle
    toolbar.appendChild(createBtn('useInvShuffle', '🔀 Shuffle', ()=> useInventory('shuffle')));
    // Extra moves
    toolbar.appendChild(createBtn('useInvMoves', '➕ Moves', ()=> useInventory('moves')));
    // Rainbow (one-time special)
    toolbar.appendChild(createBtn('useInvRainbow', '✨ Rainbow', ()=> useInventory('rainbow')));
  }

  // ----- Persist -----
  function persist(){
    localStorage.setItem(STORAGE_COINS_KEY, String(coins));
    localStorage.setItem(STORAGE_INV_KEY, JSON.stringify(inv));
  }

  // ----- UI updates -----
  function refreshShopUI(){
    if(shopCoins) shopCoins.textContent = coins;
    if(coinsBubble) coinsBubble.textContent = coins;
    // update buy buttons text (show price)
    if(buyBombBtn) buyBombBtn.textContent = `Buy (${PRICE.bomb})`;
    if(buyShuffleBtn) buyShuffleBtn.textContent = `Buy (${PRICE.shuffle})`;
    if(buyMovesBtn) buyMovesBtn.textContent = `Buy (${PRICE.moves})`;
    if(buyRainbowBtn) buyRainbowBtn.textContent = `Buy (${PRICE.rainbow})`;
    // show inventory counts in toolbar
    ensureInvToolbarButtons();
    const invToolbar = document.getElementById('inv-toolbar');
    if(invToolbar){
      // update counts inside labels
      invToolbar.querySelectorAll('button').forEach(btn=>{
        const id = btn.id;
        if(id === 'useInvBomb') btn.innerHTML = `💣 Bomb <span class="inv-count">x${inv.bomb||0}</span>`;
        if(id === 'useInvShuffle') btn.innerHTML = `🔀 Shuffle <span class="inv-count">x${inv.shuffle||0}</span>`;
        if(id === 'useInvMoves') btn.innerHTML = `➕ Moves <span class="inv-count">x${inv.moves||0}</span>`;
        if(id === 'useInvRainbow') btn.innerHTML = `✨ Rainbow <span class="inv-count">x${inv.rainbow||0}</span>`;
      });
    }
  }

  // coin popup (small visual)
  function showCoinPopup(amount, x, y){
    const el = document.createElement('div');
    el.className = 'coin-popup';
    el.textContent = `+${amount}💰`;
    // position near center by default or at provided x,y
    if(typeof x === 'number' && typeof y === 'number'){
      el.style.left = (x) + 'px';
      el.style.top  = (y) + 'px';
      el.style.transform = 'translate(-50%,-50%)';
      el.style.position = 'absolute';
      document.body.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
    setTimeout(()=> el.remove(), 1200);
  }

  // ----- Shop buy logic -----
  function buyItem(id, price){
    if(coins < price){
      alert('कॉइन्स कम हैं — गेम खेलकर जमा करें।');
      return false;
    }
    coins -= price;
    inv[id] = (inv[id] || 0) + 1;
    persist();
    refreshShopUI();
    alert('खरीदारी सफल: ' + id);
    return true;
  }

  // ----- Use inventory -----
  function useInventory(id){
    if((inv[id]||0) <= 0){
      alert('Inventory में ' + id + ' नहीं है।');
      return;
    }
    inv[id]--;
    persist();
    refreshShopUI();

    // apply effect - try to call game functions (if exist)
    if(id === 'bomb'){
      // call a global useBomb function or fallback placeBomb button click
      if(typeof window.useBomb === 'function') { window.useBomb(); }
      else if(typeof window.placeBomb === 'function') { window.placeBomb(); }
      else {
        // try to call game API: place random bomb and detonate
        if(typeof window._game !== 'undefined' && typeof window._game.state !== 'undefined'){
          // set a random tile to bomb (best-effort)
          try{
            const s = window._game.state;
            const valid = s.board.map((t,i)=> t ? i : -1).filter(i=>i>=0);
            if(valid.length>0){
              const idx = valid[Math.floor(Math.random()*valid.length)];
              s.board[idx] = { id: s.nextId++ , src: (s.pool && s.pool.bomb) ? s.pool.bomb : ('images/bomb.png'), power:{type:'bomb'} };
              if(typeof window._game.render === 'function') window._game.render();
              // detonate via resolveChain if exists
              if(typeof window._game.resolveChain === 'function') window._game.resolveChain();
            } else alert('Game board ready नहीं है।');
          }catch(e){ alert('Bomb apply नहीं हो पाया — game API नहीं मिली।'); }
        } else {
          alert('Bomb इस्तेमाल करने के लिए गेम फ़ंक्शन उपलब्ध नहीं।');
        }
      }
    } else if(id === 'shuffle'){
      if(typeof window.shuffleBoard === 'function') window.shuffleBoard();
      else if(typeof window._game !== 'undefined' && typeof window._game.render === 'function'){
        // fallback shuffle
        if(typeof window._game.state !== 'undefined'){
          const s = window._game.state;
          const arr = s.board.slice();
          for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
          s.board = arr;
          window._game.render();
        } else alert('Shuffle नहीं हो पाया।');
      } else alert('Shuffle function उपलब्ध नहीं।');
    } else if(id === 'moves'){
      // add extra moves
      if(typeof window.addMoves === 'function') window.addMoves(5);
      else {
        // try to increment global moves if exposed in _game
        if(window._game && window._game.state){
          window._game.state.moves = (window._game.state.moves || 0) + 5;
          if(typeof window._game.updateHUD === 'function') window._game.updateHUD();
          else {
            const m = document.getElementById('moves');
            if(m) m.textContent = window._game.state.moves;
          }
        } else alert('Moves apply करने के लिए game API नहीं मिली।');
      }
    } else if(id === 'rainbow'){
      // rainbow special - if game supports makeRainbow
      if(typeof window.makeRainbow === 'function') window.makeRainbow();
      else alert('Rainbow effect उपलब्ध नहीं (game side)।');
    }
  }

  // ----- Public buy wrappers used by shop UI buttons -----
  function buyBomb(){ buyItem('bomb', PRICE.bomb); }
  function buyShuffle(){ buyItem('shuffle', PRICE.shuffle); }
  function buyMoves(){ buyItem('moves', PRICE.moves); }
  function buyRainbow(){ buyItem('rainbow', PRICE.rainbow); }

  // ----- Event hookups (connect to DOM buttons if present) -----
  if(buyBombBtn) buyBombBtn.addEventListener('click', buyBomb);
  if(buyShuffleBtn) buyShuffleBtn.addEventListener('click', buyShuffle);
  if(buyMovesBtn) buyMovesBtn.addEventListener('click', buyMoves);
  if(buyRainbowBtn) buyRainbowBtn.addEventListener('click', buyRainbow);

  if(closeShopBtn) closeShopBtn.addEventListener('click', ()=> {
    if(shopModal) { shopModal.style.display = 'none'; shopModal.setAttribute('aria-hidden','true'); }
  });
  if(openShopBtn) openShopBtn.addEventListener('click', ()=> {
    if(shopModal) { shopModal.style.display = 'flex'; shopModal.setAttribute('aria-hidden','false'); refreshShopUI(); }
  });
  if(shopBtn) shopBtn.addEventListener('click', ()=> {
    if(shopModal) { shopModal.style.display = 'flex'; shopModal.setAttribute('aria-hidden','false'); refreshShopUI(); }
  });

  // Restart/shuffle fallback handlers are in index.html hooked to game.js

  // ----- small helper: add coins (called by game when matches happen) -----
  // call window.addCoins(amount, x, y) from game.js when player earns coins
  function addCoins(amount, x, y){
    coins = (coins || 0) + Number(amount || 0);
    persist();
    refreshShopUI();
    // small popup
    try{ showCoinPopup(amount, x, y); }catch(e){}
  }
  // expose addCoins globally
  window.addCoins = addCoins;

  // ----- boot -----
  (function boot(){
    refreshShopUI();
    ensureInvToolbarButtons();
    persist();
    // console debug
    if(window.DEBUG_MODE) console.log('inventory.js loaded', {coins, inv});
  })();

  // Expose some API for game.js or console
  window._inventory = {
    buyItem, buyBomb, buyShuffle, buyMoves, buyRainbow,
    useInventory, addCoins,
    getState: ()=> ({ coins, inv })
  };

})();

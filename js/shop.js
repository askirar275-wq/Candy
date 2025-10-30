// js/shop.js
// Simple shop demo: buy Shuffle (cost 50 coins) and Bomb (cost 100 coins).
// Requires #btn-open-shop, #shop-modal, #shop-close, and placeholders #shop-coins, #shop-items

(function () {
  console.log('Shop ready');

  const btnOpen = document.getElementById('btn-open-shop');
  const modal = document.getElementById('shop-modal');
  const btnClose = document.getElementById('shop-close');
  const coinsDisplay = document.getElementById('shop-coins');
  const shopItemsEl = document.getElementById('shop-items');

  if (!modal) {
    console.warn('Shop: #shop-modal not found - skipping shop init');
    return;
  }

  // default items
  const ITEMS = [
    { id: 'shuffle', name: 'Shuffle Board', cost: 50, desc: 'Randomize board once' },
    { id: 'bomb',    name: 'Bomb (remove one candy)', cost: 100, desc: 'Remove one tile and refill' }
  ];

  function renderShopCoins() {
    const coins = window.CandyGame && window.CandyGame.getState ? window.CandyGame.getState().coins : 0;
    if (coinsDisplay) coinsDisplay.textContent = coins;
  }

  function renderItems() {
    if (!shopItemsEl) return;
    shopItemsEl.innerHTML = '';
    ITEMS.forEach(it => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `
        <div class="shop-left">
          <strong>${it.name}</strong>
          <div class="shop-desc">${it.desc}</div>
        </div>
        <div class="shop-right">
          <div class="shop-cost">₹${it.cost}</div>
          <button data-id="${it.id}" class="shop-buy btn">Buy</button>
        </div>
      `;
      shopItemsEl.appendChild(row);
    });

    // attach buy handlers
    shopItemsEl.querySelectorAll('.shop-buy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        buyItem(id);
      });
    });
  }

  function openShop() {
    renderShopCoins();
    renderItems();
    modal.classList.add('open');
  }
  function closeShop() {
    modal.classList.remove('open');
  }

  function buyItem(id) {
    const item = ITEMS.find(x => x.id === id);
    if (!item) return;
    const gstate = window.CandyGame && window.CandyGame.getState ? window.CandyGame.getState() : null;
    if (!gstate) {
      alert('Game not ready');
      return;
    }
    if (gstate.coins < item.cost) {
      alert('Coins kam hain');
      return;
    }
    // deduct coins (updating global state via simple mutation)
    gstate.coins -= item.cost;
    // reflect in UI: CandyGame doesn't expose setter, but state object is same reference (getState returned copy earlier),
    // so we update by calling restart or via a small API. For simplicity, we'll try to update via DOM and ask game to update its coins if available.
    // If CandyGame exposes a setter later we can call it. For now update shop UI and call some effects.
    if (id === 'shuffle') {
      // call global shuffle if exists
      const shuffleBtn = document.getElementById('btn-shuffle');
      if (shuffleBtn) shuffleBtn.click();
      alert('Board shuffled!');
    } else if (id === 'bomb') {
      // remove a random tile and refill
      // We will attempt to interact with internal state if available.
      try {
        // Remove a random index by setting it to 0 then collapse/refill by calling functions on the game object if exposed
        // Some implementations may not expose; attempt best-effort
        if (window.CandyGame && window.CandyGame.getState) {
          const st = window.CandyGame.getState();
          const total = st.boardArr ? st.boardArr.length : (8 * 6);
          const i = Math.floor(Math.random() * total);
          // attempt to simulate by dispatching a custom event the game might listen (not implemented)
          // fallback: call shuffle as demo
          document.getElementById('btn-shuffle').click();
          alert('Bomb used (demo) — board shuffled as effect.');
        }
      } catch (err) {
        console.error('shop bomb error', err);
      }
    }
    // update UI
    renderShopCoins();
    // also update global coins display in main UI
    const coinsMain = document.getElementById('coins');
    if (coinsMain) coinsMain.textContent = (window.CandyGame && window.CandyGame.getState) ? window.CandyGame.getState().coins : '0';
  }

  // attach open/close
  if (btnOpen) btnOpen.addEventListener('click', openShop);
  if (btnClose) btnClose.addEventListener('click', closeShop);

  // close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeShop();
  });

  // initial
  renderShopCoins();

})();

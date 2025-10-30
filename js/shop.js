// js/shop.js
// Very small demo shop — uses Storage to show coins and let user buy sample item

const Shop = (function(){
  const shopModal = () => document.getElementById('shop-modal');
  const shopCoinsEl = () => document.getElementById('shop-coins');
  const shopItemsEl = () => document.getElementById('shop-items');

  const items = [
    { id: 'bomb', title: 'Bomb (Destroy 1 candy)', price: 100 },
    { id: 'shuffle', title: 'Shuffle Board', price: 200 }
  ];

  function renderShop() {
    const state = Storage.get('candy_state') || { coins:0 };
    if(shopCoinsEl()) shopCoinsEl().textContent = state.coins || 0;
    if(!shopItemsEl()) return;
    shopItemsEl().innerHTML = '';
    items.forEach(it=>{
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `<div>${it.title}</div><div><strong>${it.price}</strong> <button data-id="${it.id}" class="btn buy">Buy</button></div>`;
      shopItemsEl().appendChild(div);
    });
  }

  function open() {
    const m = shopModal();
    if(!m) return;
    m.classList.add('open');
    m.style.display = 'flex';
    m.setAttribute('aria-hidden','false');
    renderShop();
  }
  function close() {
    const m = shopModal();
    if(!m) return;
    m.classList.remove('open');
    m.style.display = 'none';
    m.setAttribute('aria-hidden','true');
  }

  function buy(id) {
    const state = Storage.get('candy_state') || { coins:0 };
    const it = items.find(i=>i.id===id);
    if(!it) return;
    if(state.coins >= it.price){
      state.coins -= it.price;
      Storage.set('candy_state', state);
      SafeUI.toast('Buy successful: '+it.title);
      // apply item effect (demo)
      if(id === 'shuffle') {
        if(window.CandyGame) CandyGame.shuffleBoard();
      } else if(id === 'bomb'){
        if(window.CandyGame) CandyGame.triggerBomb();
      }
      renderShop();
      // update main UI (coins)
      const coinsEl = document.getElementById('coins');
      if(coinsEl) coinsEl.textContent = state.coins;
    } else {
      SafeUI.toast('Not enough coins');
    }
  }

  function init() {
    document.addEventListener('click', (e) => {
      if(e.target && e.target.matches('#btn-open-shop')) open();
      if(e.target && e.target.matches('#shop-close')) close();
      if(e.target && e.target.matches('.buy')) {
        const id = e.target.getAttribute('data-id');
        buy(id);
      }
    });
    SafeUI.log('Shop loaded');
  }

  return { init, open, close, render: renderShop };
})();

document.addEventListener('DOMContentLoaded', Shop.init);

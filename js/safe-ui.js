// js/safe-ui.js
// Handles navigation, shop modal and UI sync
document.addEventListener('DOMContentLoaded', ()=>{
  console.log('✅ Loaded: js/safe-ui.js');

  const pages = {
    home: document.getElementById('home'),
    map: document.getElementById('map'),
    game: document.getElementById('game')
  };

  function showPage(name){
    Object.values(pages).forEach(p=>p?.classList.add('hidden'));
    pages[name]?.classList.remove('hidden');
  }

  // navigation buttons
  document.getElementById('btn-start')?.addEventListener('click', ()=> showPage('map'));
  document.getElementById('btn-map')?.addEventListener('click', ()=> showPage('map'));

  document.querySelectorAll('[data-go]').forEach(btn=>{
    btn.addEventListener('click', ()=> showPage(btn.dataset.go));
  });

  // 🛒 Shop modal
  const modal = document.getElementById('shop-modal');
  const shopCoins = document.getElementById('shop-coins');
  const shopItemsEl = document.getElementById('shop-items');
  const shopClose = document.getElementById('shop-close');

  const shopItems = [
    {id:'shuffle', name:'🔀 Shuffle Board', price:200},
    {id:'bomb', name:'💣 Remove Random Candy', price:150}
  ];

  function renderShop(){
    if(!shopItemsEl) return;
    shopItemsEl.innerHTML = '';
    shopItems.forEach(item=>{
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <div>${item.name}</div>
        <div>${item.price}💰 
        <button class="btn buy" data-id="${item.id}" data-price="${item.price}">Buy</button></div>`;
      shopItemsEl.appendChild(div);
    });

    shopItemsEl.querySelectorAll('.buy').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const price = +btn.dataset.price;
        if(Storage.getCoins() < price){ alert('Not enough coins!'); return; }
        Storage.spendCoins(price);
        shopCoins.textContent = Storage.getCoins();
        window.dispatchEvent(new CustomEvent('shop:buy',{detail:{id,price}}));
      });
    });
  }

  renderShop();

  // open / close shop
  document.getElementById('btn-open-shop')?.addEventListener('click', ()=>{
    modal.classList.remove('hidden');
    shopCoins.textContent = Storage.getCoins();
  });
  shopClose?.addEventListener('click', ()=> modal.classList.add('hidden'));

  // listen to game state
  window.addEventListener('game:state', (e)=>{
    const d = e.detail || {};
    document.getElementById('score').textContent = d.score ?? 0;
    document.getElementById('coins').textContent = d.coins ?? Storage.getCoins();
    document.getElementById('level-num').textContent = d.level ?? 1;
  });

  // expose
  window.UI = {showPage, renderShop};
});

/* ================= SHOP SYSTEM (Safe Version) ================= */

window.addEventListener('load', () => {
  const shopBtn = document.getElementById('openShopBtn');
  const shopModal = document.getElementById('shopModal');
  const closeBtn = document.getElementById('closeShopBtn');
  const coinDisplay = document.getElementById('coins');
  
  // अगर कोई भी element missing है तो gracefully skip
  if (!shopBtn || !coinDisplay) {
    console.warn("Shop elements not found, skipping shop init");
    return;
  }

  // ✅ Shop Open
  shopBtn.onclick = () => {
    if (!shopModal) return;  // null protection
    shopModal.style.display = 'flex';
  };

  // ✅ Shop Close
  if (closeBtn) {
    closeBtn.onclick = () => {
      if (!shopModal) return;
      shopModal.style.display = 'none';
    };
  }

  // ✅ Buy Buttons
  const buyBtns = document.querySelectorAll('.buy-btn');
  buyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const price = parseInt(btn.dataset.price);
      const item = btn.dataset.item;
      let coins = parseInt(localStorage.getItem('coins') || 0);

      if (coins >= price) {
        coins -= price;
        localStorage.setItem('coins', coins);
        if (coinDisplay) coinDisplay.textContent = coins;
        showShopPopup(`✅ खरीदा गया ${item}!`);
      } else {
        showShopPopup('⚠️ Coins कम हैं!');
      }
    });
  });
});

/* ✅ Safe Popup */
function showShopPopup(text) {
  const el = document.createElement('div');
  el.className = 'coin-popup';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
    }

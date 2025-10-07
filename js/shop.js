/* js/shop.js - Updated for coin + inventory sync */

(function() {
  const shopModal = document.getElementById("shopModal");
  const openShopBtn = document.getElementById("shopBtn") || document.getElementById("openShopBtn");
  const closeShop = document.getElementById("closeShop");
  const shopCoinsEl = document.getElementById("shopCoins");

  // Items और उनकी कीमतें
  const ITEMS = {
    bomb: 200,
    shuffle: 100,
    moves: 80,
    rainbow: 350
  };

  function buy(item) {
    if (!window.coins) window.coins = 0;
    const cost = ITEMS[item];
    if (coins < cost) {
      alert("💸 Not enough coins!");
      return;
    }

    coins -= cost;
    if (!window.inv) window.inv = { bomb: 0, shuffle: 0, moves: 0, rainbow: 0 };
    inv[item] = (inv[item] || 0) + 1;

    localStorage.setItem("candy_coins", coins);
    localStorage.setItem("candy_inv", JSON.stringify(inv));

    alert(`✅ Purchased ${item}!`);
    refreshShopUI();
    if (typeof window.refreshInventoryUI === "function") {
      window.refreshInventoryUI();
    }
  }

  // UI Refresh
  window.refreshShopUI = function() {
    if (shopCoinsEl) shopCoinsEl.textContent = coins;
  };

  // Event bindings
  if (openShopBtn) openShopBtn.onclick = () => shopModal.style.display = "flex";
  if (closeShop) closeShop.onclick = () => shopModal.style.display = "none";

  // Buy buttons
  const map = {
    buyBomb: "bomb",
    buyShuffle: "shuffle",
    buyMoves: "moves",
    buyRainbow: "rainbow"
  };
  Object.keys(map).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = () => buy(map[id]);
  });

  refreshShopUI();
})();

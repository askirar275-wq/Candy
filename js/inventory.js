/* js/inventory.js - Inventory toolbar for power-ups */

(function() {
  const invBar = document.createElement("div");
  invBar.id = "inv-toolbar";
  invBar.style.position = "fixed";
  invBar.style.bottom = "12px";
  invBar.style.left = "50%";
  invBar.style.transform = "translateX(-50%)";
  invBar.style.display = "flex";
  invBar.style.gap = "8px";
  invBar.style.zIndex = "2000";
  document.body.appendChild(invBar);

  const ITEMS = {
    bomb: { label: "💣", use: () => alert("💣 Bomb used!") },
    shuffle: { label: "🔀", use: () => { shuffleBoard(); alert("🔀 Board shuffled!"); } },
    moves: { label: "➕", use: () => { moves += 5; updateHUD(); alert("➕ 5 moves added!"); } },
    rainbow: { label: "🌈", use: () => alert("🌈 Rainbow candy used!") }
  };

  function makeBtn(id, label) {
    const wrap = document.createElement("div");
    wrap.style.textAlign = "center";
    const btn = document.createElement("button");
    btn.className = "inv-btn";
    btn.textContent = label;
    const count = document.createElement("div");
    count.className = "inv-count";
    count.textContent = (inv && inv[id]) || 0;
    wrap.append(btn, count);
    btn.onclick = () => useItem(id);
    invBar.appendChild(wrap);
    wrap.dataset.item = id;
  }

  function useItem(item) {
    if (!inv[item] || inv[item] <= 0) {
      alert("❌ You don't have this item!");
      return;
    }
    inv[item] -= 1;
    localStorage.setItem("candy_inv", JSON.stringify(inv));
    refreshInventoryUI();
    ITEMS[item].use();
  }

  window.refreshInventoryUI = function() {
    for (const key in ITEMS) {
      const wrap = invBar.querySelector(`[data-item="${key}"] .inv-count`);
      if (wrap) wrap.textContent = (inv && inv[key]) || 0;
    }
  };

  for (const key in ITEMS) {
    makeBtn(key, ITEMS[key].label);
  }

  refreshInventoryUI();
})();

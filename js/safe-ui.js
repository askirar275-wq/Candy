// ===== SAFE-UI.JS =====
// यह फाइल सभी UI बटनों को सुरक्षित तरीके से हैंडल करेगी

document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 Safe UI script initialized...");

  // helper: safely get element
  const $ = (id) => document.getElementById(id);

  // सुरक्षित रूप से listener जोड़ने का helper
  function safeAdd(id, event, handler) {
    const el = $(id);
    if (!el) {
      console.warn(`⚠️ Element not found: #${id}`);
      return;
    }
    el.addEventListener(event, handler);
  }

  // 🎮 Start button
  safeAdd("startBtn", "click", () => {
    $("#home-screen")?.classList.remove("active");
    $("#game-screen")?.classList.add("active");

    if (typeof initGame === "function") {
      try { initGame(); } 
      catch (err) { console.error("initGame failed:", err); }
    } else console.warn("initGame() missing in game.js");
  });

  // 🏠 Back to Home
  safeAdd("backBtn", "click", () => {
    $("#game-screen")?.classList.remove("active");
    $("#home-screen")?.classList.add("active");
  });

  // 🛒 Open Shop
  safeAdd("shopBtn", "click", () => {
    $("#shopModal").style.display = "flex";
    $("#shopModal").setAttribute("aria-hidden", "false");
  });

  safeAdd("openShopBtn", "click", () => {
    $("#shopModal").style.display = "flex";
    $("#shopModal").setAttribute("aria-hidden", "false");
  });

  // ❌ Close Shop
  safeAdd("closeShop", "click", () => {
    $("#shopModal").style.display = "none";
    $("#shopModal").setAttribute("aria-hidden", "true");
  });

  // 🔁 Restart
  safeAdd("restartBtn", "click", () => {
    if (typeof restartGame === "function") restartGame();
    else console.warn("restartGame() not found");
  });

  // 🔀 Shuffle
  safeAdd("shuffleBtn", "click", () => {
    if (typeof shuffleBoard === "function") shuffleBoard();
    else console.warn("shuffleBoard() not found");
  });

  console.log("✅ Safe-UI loaded completely with all handlers");
});

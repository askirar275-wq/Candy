// js/level-modal.js
// Safe & automatic level complete modal handler

(function () {
  const $ = (id) => document.getElementById(id);

  function handleNextLevel() {
    const modal = $("levelUpModal");
    if (modal) modal.style.display = "none";

    try {
      // Increase level if StorageAPI available
      if (typeof StorageAPI !== "undefined" && StorageAPI.getLevel && StorageAPI.setLevel) {
        const current = StorageAPI.getLevel();
        StorageAPI.setLevel(current + 1);
      }

      // Start next level
      if (typeof window.initGame === "function") {
        window.initGame();
      } else {
        console.warn("⚠️ initGame not found");
      }
    } catch (err) {
      console.error("❌ Error moving to next level:", err);
    }
  }

  function attachHandlers() {
    const modal = $("levelUpModal");
    const btn = $("levelUpClose");

    if (!modal || !btn) {
      // Elements not yet loaded, retry after short delay
      setTimeout(attachHandlers, 200);
      return;
    }

    // Button click → Next Level
    btn.removeEventListener("click", handleNextLevel);
    btn.addEventListener("click", handleNextLevel);

    // Overlay click → Next Level
    modal.addEventListener("click", (e) => {
      if (e.target === modal) handleNextLevel();
    });

    console.log("✅ Level modal handlers attached");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachHandlers);
  } else {
    attachHandlers();
  }
})();

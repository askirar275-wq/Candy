// safe-ui.js
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function addSafe(id, evt, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener(evt, fn, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ Safe UI Loaded");

    addSafe("startBtn", "click", function () {
      console.log("🎮 Starting game...");
      if (typeof initGame === "function") {
        initGame();
      } else {
        window.location.href = "game.html";
      }
    });

    addSafe("shopBtn", "click", function () {
      window.location.href = "shop.html";
    });

    addSafe("settingsBtn", "click", function () {
      window.location.href = "settings.html";
    });

    addSafe("openGear", "click", function () {
      try {
        if (window.eruda) window.eruda.show();
      } catch (e) {
        console.error("Eruda error", e);
      }
    });
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  const screens = {
    home: document.getElementById("home"),
    map: document.getElementById("map"),
    game: document.getElementById("game")
  };

  function show(screen) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[screen].classList.add("active");
  }

  // Home → Map
  document.getElementById("playBtn").addEventListener("click", () => {
    renderLevelMap();
    show("map");
  });

  // Map → Home
  document.getElementById("backHomeBtn").addEventListener("click", () => {
    show("home");
  });

  // Map → Game
  document.getElementById("backMapBtn").addEventListener("click", () => {
    show("map");
  });

  // Restart + Shuffle
  document.getElementById("restartBtn").addEventListener("click", () => {
    initGame(currentLevel);
  });
  document.getElementById("shuffleBtn").addEventListener("click", shuffleBoard);

  // Level Map बनाना
  window.renderLevelMap = function() {
    const levelContainer = document.getElementById("levelButtons");
    levelContainer.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.textContent = "Level " + i;
      btn.className = "btn";
      btn.onclick = () => startLevel(i);
      levelContainer.appendChild(btn);
    }
  };

  window.startLevel = function(level) {
    currentLevel = level;
    show("game");
    initGame(level);
  };
});

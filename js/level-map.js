document.addEventListener("DOMContentLoaded", () => {
  const map = document.getElementById("levelList");
  const mapScreen = document.getElementById("levelMap");
  const home = document.getElementById("homeScreen");
  const game = document.getElementById("gameScreen");
  const backHomeBtn = document.getElementById("backHomeBtn");

  function renderMap() {
    map.innerHTML = "";
    LevelData.forEach((lvl) => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = `Level ${lvl.id} — Goal: ${lvl.goal}`;
      btn.onclick = () => {
        mapScreen.classList.remove("active");
        game.classList.add("active");
        window.startLevel(lvl.id);
      };
      map.appendChild(btn);
    });
  }

  // navigation
  document.getElementById("startGameBtn").onclick = () => {
    home.classList.remove("active");
    mapScreen.classList.add("active");
    renderMap();
  };

  backHomeBtn.onclick = () => {
    mapScreen.classList.remove("active");
    home.classList.add("active");
  };

  document.getElementById("mapBtn").onclick = () => {
    game.classList.remove("active");
    mapScreen.classList.add("active");
    renderMap();
  };

  renderMap();
});

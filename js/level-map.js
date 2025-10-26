const LevelMap = (() => {
  const maxLevel = 10;
  let unlocked = Storage.get("unlocked", [1]);
  const levelsDiv = document.getElementById("levels");

  function render() {
    levelsDiv.innerHTML = "";
    for (let i = 1; i <= maxLevel; i++) {
      const div = document.createElement("div");
      div.className = "level-item";
      div.innerHTML = unlocked.includes(i)
        ? `<button class="btn" data-level="${i}">Level ${i}</button>`
        : `<button class="btn" disabled>🔒 Locked</button>`;
      levelsDiv.appendChild(div);
    }
  }

  document.addEventListener("click", (e) => {
    if (e.target.dataset.level) {
      const level = +e.target.dataset.level;
      Game.startLevel(level);
      showPage("game");
    }
  });

  return { render };
})();

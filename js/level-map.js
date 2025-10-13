console.log("level-map.js loaded");

const mapEl = document.getElementById("map");
const totalLevels = 10;
const currentLevel = StorageAPI.getLevel();

for (let i = 1; i <= totalLevels; i++) {
  const btn = document.createElement("button");
  btn.className = "level-btn";
  btn.textContent = i;
  if (i <= currentLevel) {
    btn.onclick = () => {
      localStorage.setItem("playLevel", i);
      location.href = "game.html";
    };
  } else {
    btn.disabled = true;
  }
  mapEl.appendChild(btn);
}

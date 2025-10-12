// js/level-map.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Level map loaded");

  const levelPath = document.getElementById("levelPath");
  const TOTAL_LEVELS = 10;
  const playerLevel = StorageAPI.getLevel();

  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const section = document.createElement("section");
    section.className = "level-section";
    section.style.backgroundImage = `url('images/bg-level${i}.png')`;

    const btn = document.createElement("button");
    btn.className = "level-btn";
    btn.textContent = `Level ${i}`;

    if (i <= playerLevel) {
      btn.classList.add("unlocked");
      btn.onclick = () => {
        StorageAPI.setLevel(i);
        window.location.href = "index.html";
      };
    } else {
      btn.classList.add("locked");
      btn.disabled = true;
    }

    section.appendChild(btn);
    levelPath.appendChild(section);
  }
});

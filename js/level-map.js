// Level Map System
document.getElementById("startBtn").addEventListener("click", () => {
  showScreen("levelMap");
  renderLevels();
});
document.getElementById("backHome").addEventListener("click", () => showScreen("home"));
document.getElementById("btnBackMap")?.addEventListener("click", () => showScreen("levelMap"));

function renderLevels() {
  const container = document.getElementById("levelList");
  container.innerHTML = "";
  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement("button");
    btn.className = "level-btn";
    btn.textContent = `Level ${i}`;
    btn.onclick = () => {
      Storage.setLevel(i);
      showScreen("gameScreen");
      initGame();
    };
    container.appendChild(btn);
  }
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
    }

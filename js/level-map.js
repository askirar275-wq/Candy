const levelMap = document.getElementById("levelMap");
const backHome = document.getElementById("backHome");

const levels = [1,2,3,4,5];

levelMap.innerHTML = "";
levels.forEach(l => {
  const btn = document.createElement("button");
  btn.textContent = "Level " + l;
  btn.onclick = () => startLevel(l);
  levelMap.appendChild(btn);
});

backHome.onclick = () => showScreen("home-screen");

function startLevel(lvl) {
  StorageAPI.setLevel(lvl);
  showScreen("game-screen");
  initGame();
}

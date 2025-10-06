const startBtn = document.getElementById("startBtn");
const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");
const backBtn = document.getElementById("backBtn");

startBtn.addEventListener("click", () => {
  homeScreen.classList.remove("active");
  gameScreen.classList.add("active");
  startGame();
});

backBtn.addEventListener("click", () => {
  gameScreen.classList.remove("active");
  homeScreen.classList.add("active");
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  const installBtn = document.getElementById("installBtn");
  installBtn.style.display = "inline-block";
  installBtn.addEventListener("click", () => e.prompt());
});

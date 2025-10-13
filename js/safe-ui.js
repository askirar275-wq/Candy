document.addEventListener("DOMContentLoaded", () => {
  const show = id => document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));

  // स्क्रीन स्विच
  document.getElementById("openMap").onclick = () => show("map-screen");
  document.getElementById("backFromMap").onclick = () => show("home-screen");
  document.getElementById("backHome").onclick = () => show("home-screen");

  document.getElementById("restartBtn").onclick = () => restartGame();
  document.getElementById("shuffleBtn").onclick = () => shuffleBoard();
  document.getElementById("levelUpClose").onclick = () => document.getElementById("levelUpModal").style.display = "none";
});

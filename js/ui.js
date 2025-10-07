document.addEventListener("DOMContentLoaded", () => {
  const homeScreen = document.getElementById("home-screen");
  const gameScreen = document.getElementById("game-screen");
  const shopModal = document.getElementById("shopModal");

  document.getElementById("startBtn").addEventListener("click", () => {
    homeScreen.classList.remove("active");
    gameScreen.classList.add("active");
    initGame();
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    gameScreen.classList.remove("active");
    homeScreen.classList.add("active");
  });

  document.getElementById("shopBtn").addEventListener("click", () => {
    shopModal.style.display = "flex";
  });

  document.getElementById("closeShop").addEventListener("click", () => {
    shopModal.style.display = "none";
  });

  console.log("UI loaded successfully.");
});

window.showLevelUpModal = function(level, reward) {
  const modal = document.getElementById("levelUpModal");
  modal.style.display = "flex";
  modal.querySelector(".title").textContent = `Level ${level} Complete!`;
  modal.querySelector(".text").textContent = `Reward: ${reward} coins`;
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#levelUpModal .next-btn").onclick = () => {
    const current = StorageAPI.getLevel();
    StorageAPI.setLevel(current + 1);
    document.getElementById("levelUpModal").style.display = "none";
    window.startLevel(current + 1);
  };

  document.querySelector("#levelUpModal .close-btn").onclick = () => {
    document.getElementById("levelUpModal").style.display = "none";
  };
});

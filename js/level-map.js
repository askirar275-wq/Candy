// ===== Level Map Logic =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ level-map.js loaded");

  const path = document.getElementById("levelPath");
  if (!path) return;

  // 6 candy images (make sure these exist in your images/ folder)
  const candyImgs = [
    "images/candy1.png",
    "images/candy2.png",
    "images/candy3.png",
    "images/candy4.png",
    "images/candy5.png",
    "images/candy6.png"
  ];

  const totalLevels = 18; // जितने levels चाहिए उतने रखो
  const unlocked = localStorage.getItem("candyLevel") || 1;

  path.innerHTML = "";

  for (let i = 1; i <= totalLevels; i++) {
    const node = document.createElement("div");
    node.className = "level-node";
    if (i > unlocked) node.classList.add("locked");

    // candy image cycle (1-6 repeat)
    const img = document.createElement("img");
    img.src = candyImgs[(i - 1) % candyImgs.length];
    node.appendChild(img);

    const label = document.createElement("div");
    label.className = "level-label";
    label.textContent = "Level " + i;
    node.appendChild(label);

    // position nodes in zig-zag pattern
    const y = i * 120;
    const x = i % 2 === 0 ? "60%" : "20%";
    node.style.top = y + "px";
    node.style.left = x;

    // tap to go
    node.addEventListener("click", () => {
      if (i > unlocked) {
        alert("🔒 Level locked! पहले वाले level पूरा करो।");
        return;
      }
      alert("🎮 Level " + i + " start!");
      localStorage.setItem("currentLevel", i);
      window.location.href = "index.html";
    });

    path.appendChild(node);
  }

  // back button
  const back = document.getElementById("backHome");
  if (back) back.addEventListener("click", () => {
    window.location.href = "index.html";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const path = document.getElementById("levelPath");

  // Example 10 levels
  const totalLevels = 10;
  const unlockedLevel = localStorage.getItem("unlockedLevel") || 3;

  let y = 80;
  let x = 50;
  let direction = 1;

  for (let i = 1; i <= totalLevels; i++) {
    const lvl = document.createElement("div");
    lvl.classList.add("level");
    lvl.textContent = i;

    if (i > unlockedLevel) lvl.classList.add("locked");

    lvl.style.position = "absolute";
    lvl.style.left = `${x}%`;
    lvl.style.top = `${y}px`;

    lvl.addEventListener("click", () => {
      if (i <= unlockedLevel) {
        alert(`Starting Level ${i}`);
        // TODO: redirect to game or load level data
      } else {
        alert("Level Locked 🔒");
      }
    });

    path.appendChild(lvl);

    // Draw path line
    if (i > 1) {
      const line = document.createElement("div");
      line.classList.add("path-line");
      line.style.left = `${x}%`;
      line.style.top = `${y - 60}px`;
      line.style.height = "60px";
      path.appendChild(line);
    }

    // Zig-zag pattern
    if (direction === 1) x += 20;
    else x -= 20;
    if (x > 80) direction = -1;
    if (x < 20) direction = 1;
    y += 120;
  }

  // Home button
  document.getElementById("backHome").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});

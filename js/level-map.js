// ===== js/level-map.js =====

function renderLevelMap() {
  const container = document.getElementById("levelPath");
  if (!container) return console.warn("Level map container missing");
  container.innerHTML = "";

  const totalLevels = 20; // कितने level दिखाने हैं
  const userLevel =
    typeof StorageAPI !== "undefined" && StorageAPI.getLevel
      ? StorageAPI.getLevel()
      : 1;

  for (let i = 1; i <= totalLevels; i++) {
    const node = document.createElement("div");
    node.className = "level-node";
    node.textContent = i;
    node.style.width = "60px";
    node.style.height = "60px";
    node.style.borderRadius = "50%";
    node.style.display = "inline-flex";
    node.style.alignItems = "center";
    node.style.justifyContent = "center";
    node.style.margin = "14px";
    node.style.fontWeight = "700";
    node.style.background =
      i <= userLevel
        ? "linear-gradient(135deg,#ff90c2,#ff60a0)"
        : "linear-gradient(135deg,#ccc,#999)";
    node.style.color = "#fff";
    node.style.cursor = i <= userLevel ? "pointer" : "not-allowed";
    node.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
    node.addEventListener("click", () => {
      if (i <= userLevel) {
        console.log("Level selected:", i);
        if (typeof window.selectLevel === "function") {
          window.selectLevel(i);
        } else {
          console.warn("selectLevel() missing");
        }
      }
    });
    container.appendChild(node);
  }
      }

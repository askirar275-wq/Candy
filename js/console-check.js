// 🧩 console-check.js
document.addEventListener("DOMContentLoaded", () => {
  const bgImage = new Image();
  bgImage.src = "images/bg-gradient.png";

  bgImage.onload = () => {
    console.log("%c✅ Background image loaded successfully!", "color:green;font-weight:bold;");
    console.log("Image size:", bgImage.width + "x" + bgImage.height);
  };

  bgImage.onerror = (err) => {
    console.error("%c❌ Background image NOT found!", "color:red;font-weight:bold;");
    console.error("Check your file path → images/bg-gradient.png");
    alert("⚠️ Background image नहीं मिल रही! कृपया images/bg-gradient.png को चेक करें।");
  };
});

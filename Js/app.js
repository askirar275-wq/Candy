import "./auth.js";
import "./posts.js";
import "./stories.js";
import "./profile.js";
import "./reels.js";

window.showPage = p=>{
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  document.getElementById(p).classList.remove("hidden");
};

// js/auth.js
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const msg = document.getElementById("msg");

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  msg.innerText = "⏳ Please wait...";
  msg.style.color = "yellow";

  if (!email || !password) {
    msg.innerText = "Email & password required";
    msg.style.color = "red";
    return;
  }

  try {
    // 🔹 Try login first
    await signInWithEmailAndPassword(auth, email, password);

    msg.innerText = "Login successful ✅";
    msg.style.color = "lightgreen";

    setTimeout(() => {
      window.location.href = "home.html";
    }, 1000);

  } catch (loginError) {
    // 🔹 If user not found → signup
    if (loginError.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        msg.innerText = "Account created & logged in ✅";
        msg.style.color = "lightgreen";

        setTimeout(() => {
          window.location.href = "home.html";
        }, 1000);

      } catch (signupError) {
        msg.innerText = signupError.message;
        msg.style.color = "red";
      }
    } else {
      msg.innerText = loginError.message;
      msg.style.color = "red";
    }
  }
});

/* 🔹 Auto login check */
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("index.html")) {
    window.location.href = "home.html";
  }
});

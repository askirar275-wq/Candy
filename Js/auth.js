import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth } from "./firebase.js";

const msg = document.getElementById("msg");

// 🔐 Email Login / Signup
window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    msg.innerText = "❌ Email & Password required";
    msg.style.color = "orange";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    msg.innerText = "✅ Login successful";
    msg.style.color = "lightgreen";
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      await createUserWithEmailAndPassword(auth, email, password);
      msg.innerText = "✅ Account created & logged in";
      msg.style.color = "lightgreen";
    } else {
      msg.innerText = "❌ " + err.message;
      msg.style.color = "red";
    }
  }
};

// 🔵 Google Login (POPUP ONLY)
window.googleLogin = async function () {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    msg.innerText = "✅ Google login successful";
    msg.style.color = "lightgreen";
  } catch (err) {
    msg.innerText = "❌ " + err.message;
    msg.style.color = "red";
  }
};

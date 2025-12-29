import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// 🔹 Firebase config (tumhara hi use kiya hai)
const firebaseConfig = {
  apiKey: "AIzaSyA7U96MP2BheQ1ilIUqd2UgycPs8KVC-Gc",
  authDomain: "chatapp-d38d3.firebaseapp.com",
  projectId: "chatapp-d38d3",
  storageBucket: "chatapp-d38d3.appspot.com",
  messagingSenderId: "321814992234",
  appId: "1:321814992234:web:d1d8eb9d63fcafc53ec113"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔹 Login / Signup function
window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  msg.style.color = "#ff6b6b";
  msg.innerText = "";

  if (!email || !password) {
    msg.innerText = "Email aur password dono bharo";
    return;
  }

  try {
    // 🔐 try login
    await signInWithEmailAndPassword(auth, email, password);
    msg.style.color = "#22c55e";
    msg.innerText = "Login successful ✅";
    // yahan redirect kar sakte ho
    // location.href = "home.html";
  } catch (err) {
    // 👤 agar user nahi hai to signup
    if (err.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        msg.style.color = "#22c55e";
        msg.innerText = "Signup successful ✅";
      } catch (e) {
        msg.innerText = e.message;
      }
    } else {
      msg.innerText = err.message;
    }
  }
};

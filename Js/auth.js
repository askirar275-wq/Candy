import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔹 Firebase config (tumhara)
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

// 🔹 Auto login (session remember)
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("msg").innerText =
      "Logged in as " + user.email;
    // yahan redirect kar sakte ho
    // location.href = "home.html";
  }
});

// 🔹 Login / Signup function
window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  if (!email || !password) {
    msg.innerText = "Email aur password required";
    return;
  }

  try {
    // 🔑 Login try
    await signInWithEmailAndPassword(auth, email, password);
    msg.innerText = "Login successful";
  } catch (error) {
    // 🆕 Agar user nahi mila to signup
    if (error.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        msg.innerText = "Account created & logged in";
      } catch (e) {
        msg.innerText = e.message;
      }
    } else {
      msg.innerText = error.message;
    }
  }
};

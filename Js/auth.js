// 🔥 Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// 🔥 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA7U96MP2BheQ1ilIUqd2UgycPs8KVC-Gc",
  authDomain: "chatapp-d38d3.firebaseapp.com",
  projectId: "chatapp-d38d3",
  appId: "1:321814992234:web:d1d8eb9d63fcafc53ec113"
};

// 🔥 Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔐 Session persist (login ek hi baar)
setPersistence(auth, browserLocalPersistence);

// 🌍 Expose function to button
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email aur Password daalo");
    return;
  }

  try {
    // 🔹 Try login
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful");
    window.location.href = "home.html";
  } catch (err) {
    // 🔹 Agar user nahi hai → signup
    if (err.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Signup successful");
        window.location.href = "home.html";
      } catch (e) {
        alert(e.message);
      }
    } else {
      alert(err.message);
    }
  }
};

// 🔁 Auto login (jab user already login ho)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Already logged in:", user.email);
  }
});

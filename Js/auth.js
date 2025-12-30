// Js/auth.js
import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔁 AUTH STATE LISTENER (MOST IMPORTANT)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User already logged in:", user.email);
    window.location.href = "home.html"; // ✅ LOGIN KE BAAD
  } else {
    console.log("No user logged in");
  }
});

// EMAIL / PASSWORD LOGIN
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      alert(error.message);
    }
  }
};

// GOOGLE LOGIN
window.googleLogin = async function () {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      username: "",
      createdAt: Date.now()
    });
    window.location.href = "username.html"; // 🆕 first time
  }
};

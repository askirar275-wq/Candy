import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const db = getFirestore();

// Email login / signup
window.login = async function () {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    checkUsername();
  } catch {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.href = "username.html";
  }
};

// Google login
window.googleLogin = async function () {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
  checkUsername();
};

// Username check
async function checkUsername() {
  const user = auth.currentUser;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    window.location.href = "home.html";
  } else {
    window.location.href = "username.html";
  }
}

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔐 Auth protection
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // 🔎 Load user data
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    window.location.href = "username.html";
    return;
  }

  document.getElementById("userName").innerText =
    "@" + snap.data().username;
});

// 🚪 Logout
window.logout = async function () {
  await signOut(auth);
  window.location.href = "index.html";
};

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { app } from "./firebase.js";

const auth = getAuth(app);

// Check user logged in or not
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("userEmail").innerText =
      "Logged in as: " + user.email;
  } else {
    // Agar login nahi hai to wapas login page
    window.location.href = "index.html";
  }
});

// Logout
window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
};

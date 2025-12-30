// js/username.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔒 Auth check – login nahi hai to wapas login page
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Agar username pehle se bana hua hai → home page
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists() && snap.data().username) {
    window.location.href = "home.html";
  }
});

// 🔥 Username save function
window.saveUsername = async function () {
  const usernameInput = document.getElementById("username");
  const msg = document.getElementById("msg");

  const username = usernameInput.value.trim().toLowerCase();

  if (username.length < 3) {
    msg.innerText = "❌ Username minimum 3 letters ka hona chahiye";
    msg.style.color = "red";
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    msg.innerText = "❌ User not logged in";
    msg.style.color = "red";
    return;
  }

  msg.innerText = "Checking username...";
  msg.style.color = "gray";

  try {
    // 🔎 Check username already exists or not
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      msg.innerText = "❌ Username already taken";
      msg.style.color = "red";
      return;
    }

    // ✅ Save username
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: username,
      createdAt: new Date()
    });

    msg.innerText = "✅ Username saved!";
    msg.style.color = "green";

    setTimeout(() => {
      window.location.href = "home.html";
    }, 800);

  } catch (error) {
    console.error(error);
    msg.innerText = "❌ Error saving username";
    msg.style.color = "red";
  }
};

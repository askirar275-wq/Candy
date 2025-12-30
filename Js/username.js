import { auth } from "./firebase.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const db = getFirestore();

window.saveUsername = async function () {
  const name = username.value.trim();
  if (!name) return alert("Username required");

  const user = auth.currentUser;

  await setDoc(doc(db, "users", user.uid), {
    username: name,
    uid: user.uid
  });

  window.location.href = "home.html";
};

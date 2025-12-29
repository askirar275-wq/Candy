import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7U96MP2BheQ1ilIUqd2UgycPs8KVC-Gc",
  authDomain: "chatapp-d38d3.firebaseapp.com",
  projectId: "chatapp-d38d3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Auto login
onAuthStateChanged(auth, (user) => {
  if (user && location.pathname.includes("index")) {
    location.href = "home.html";
  }
});

window.login = async () => {
  const email = emailInput.value;
  const pass = passwordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    location.href = "home.html";
  } catch {
    await createUserWithEmailAndPassword(auth, email, pass);
    location.href = "home.html";
  }
};

window.logout = async () => {
  await signOut(auth);
  location.href = "index.html";
};

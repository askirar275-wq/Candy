// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7U96MP2BheQ1ilIUqd2UgycPs8KVC-Gc",
  authDomain: "chatapp-d38d3.firebaseapp.com",
  projectId: "chatapp-d38d3",
  storageBucket: "chatapp-d38d3.appspot.com",
  messagingSenderId: "321814992234",
  appId: "1:321814992234:web:d1d8eb9d63fcafc53ec113"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

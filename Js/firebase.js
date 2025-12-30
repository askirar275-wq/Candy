import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7U96MP2BheQ1ilIUqd2UgycPs8KVC-Gc",
  authDomain: "chatapp-d38d3.firebaseapp.com",
  projectId: "chatapp-d38d3",
  storageBucket: "chatapp-d38d3.firebasestorage.app",
  messagingSenderId: "321814992234",
  appId: "1:321814992234:web:d1d8eb9d63fcafc53ec113"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

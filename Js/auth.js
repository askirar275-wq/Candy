import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

window.login = async ()=>{
  const e=email.value,p=password.value;
  try{
    await signInWithEmailAndPassword(auth,e,p);
  }catch{
    await createUserWithEmailAndPassword(auth,e,p);
  }
};

window.logout = ()=>signOut(auth);

onAuthStateChanged(auth,u=>{
  if(u){
    loginBox.classList.add("hidden");
    app.classList.remove("hidden");
  }else{
    loginBox.classList.remove("hidden");
    app.classList.add("hidden");
  }
});

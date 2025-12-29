import { db, storage } from "./firebase.js";
import { addDoc, collection, onSnapshot } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

window.addStory = async ()=>{
  const r=ref(storage,"stories/"+Date.now());
  await uploadBytes(r,storyFile.files[0]);
  const url=await getDownloadURL(r);
  await addDoc(collection(db,"stories"),{url});
};

onSnapshot(collection(db,"stories"),snap=>{
  storyList.innerHTML="";
  snap.forEach(d=>{
    storyList.innerHTML+=`<img class="story" src="${d.data().url}">`;
  });
});

import { db, storage } from "./firebase.js";
import { addDoc, collection, onSnapshot } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

window.addPost = async ()=>{
  let img="";
  if(postFile.files[0]){
    const r=ref(storage,"posts/"+Date.now());
    await uploadBytes(r,postFile.files[0]);
    img=await getDownloadURL(r);
  }
  await addDoc(collection(db,"posts"),{
    text:postText.value,img
  });
  postText.value="";
};

onSnapshot(collection(db,"posts"),snap=>{
  feed.innerHTML="";
  snap.forEach(d=>{
    feed.innerHTML+=`
      <div class="post">
        <p>${d.data().text||""}</p>
        ${d.data().img?`<img src="${d.data().img}" width="100%">`:""}
      </div>`;
  });
});

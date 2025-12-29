import { auth, db, storage } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const reelFile = document.getElementById("reelFile");
const uploadBtn = document.getElementById("uploadReelBtn");
const reelsContainer = document.getElementById("reelsContainer");

/* ✅ Upload Reel */
uploadBtn.addEventListener("click", async () => {
  const file = reelFile.files[0];
  if (!file) return alert("Select a video");

  const user = auth.currentUser;
  if (!user) return alert("Login first");

  try {
    const reelRef = ref(
      storage,
      `reels/${user.uid}/${Date.now()}_${file.name}`
    );

    await uploadBytes(reelRef, file);
    const videoURL = await getDownloadURL(reelRef);

    await addDoc(collection(db, "reels"), {
      uid: user.uid,
      video: videoURL,
      createdAt: serverTimestamp()
    });

    alert("Reel uploaded ✅");
    reelFile.value = "";

  } catch (err) {
    alert(err.message);
  }
});

/* ✅ Show Reels */
const q = query(
  collection(db, "reels"),
  orderBy("createdAt", "desc")
);

onSnapshot(q, (snapshot) => {
  reelsContainer.innerHTML = "";

  snapshot.forEach((doc) => {
    const reel = doc.data();

    reelsContainer.innerHTML += `
      <div class="reel">
        <video src="${reel.video}" controls loop></video>
      </div>
    `;
  });
});

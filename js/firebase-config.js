import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your PeerFund Firebase Project Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyChLT0buxHzHEH8jS1bQNEaRezv7oTzZ-I",
  authDomain: "peerfund-69940.firebaseapp.com",
  projectId: "peerfund-69940",
  storageBucket: "peerfund-69940.firebasestorage.app",
  messagingSenderId: "114511100406",
  appId: "1:114511100406:web:9a4d1bc77019a6dafa6fd7",
  measurementId: "G-9NLBGHXHYY"
};

export const ADMIN_EMAIL = "dhananjoyk049@gmail.com";
export const ADMIN_PHONE = "9832420007";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence so cached balances & records load without internet
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Firestore offline persistence note:", err.code);
});

// Register PWA Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

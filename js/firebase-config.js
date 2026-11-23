import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your PeerFund Firebase Project Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCeHyQjY3DQB-ayE8tennAdinFmoVB0n8I",
  authDomain: "peerfund-92066.firebaseapp.com",
  projectId: "peerfund-92066",
  storageBucket: "peerfund-92066.firebasestorage.app",
  messagingSenderId: "1080499326205",
  appId: "1:1080499326205:web:a517e9e21e8c8f044d8294",
  measurementId: "G-K4BMW34C6Y"
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

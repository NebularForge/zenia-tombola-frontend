// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOYIg5jhtHuppTU_ykGEuuBh6fosPJyNw",
  authDomain: "zenia-tombola.firebaseapp.com",
  projectId: "zenia-tombola",
  storageBucket: "zenia-tombola.firebasestorage.app",
  messagingSenderId: "250903902052",
  appId: "1:250903902052:web:9adc8917ccffff353bec71",
  measurementId: "G-B2RLRXCJG4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
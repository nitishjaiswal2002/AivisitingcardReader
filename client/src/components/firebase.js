import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAvt21SyKVmgpivPcvYADUN7n5broO5nTk",
  authDomain: "aiscanner-eb1f8.firebaseapp.com",
  projectId: "aiscanner-eb1f8",
  storageBucket: "aiscanner-eb1f8.firebasestorage.app",
  messagingSenderId: "149279330185",
  appId: "1:149279330185:web:5fb7e368af7a65a6c69b58",
  measurementId: "G-MS8G9VYBRL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

console.log("AUTH OBJECT:", auth); // ✅ ADD KARO — check karne ke liye

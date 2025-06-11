import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAj_BlURdNVYV-7ltvVz6y1Z2aObGDSY2U",
  authDomain: "proofly-ea1a7.firebaseapp.com",
  projectId: "proofly-ea1a7",
  storageBucket: "proofly-ea1a7.firebasestorage.app",
  messagingSenderId: "816529286987",
  appId: "1:816529286987:web:b3df0937dc8c87490d6ace",
  measurementId: "G-150W5XW7PD"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };

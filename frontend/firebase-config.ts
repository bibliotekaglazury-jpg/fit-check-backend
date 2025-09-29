import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDoPA_WaSKW18QGvCnNNvXpL_G_kRtk46U",
  authDomain: "ai-watermark-backend-2024.firebaseapp.com",
  projectId: "ai-watermark-backend-2024",
  storageBucket: "ai-watermark-backend-2024.firebasestorage.app",
  messagingSenderId: "550066139623",
  appId: "1:550066139623:web:fa14b1be84dbe8a39f4d42"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const functions = getFunctions(app);
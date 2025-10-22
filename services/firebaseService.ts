import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Replace this with your own Firebase project configuration.
// You can get this from the Firebase Console:
// Project Settings > General > Your apps > Web app > SDK setup and configuration > Config
const firebaseConfig = {
 // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJ0pycHNrRMOI3xE23HTfXkS60KLrQjb8",
  authDomain: "canvas-473815.firebaseapp.com",
  projectId: "canvas-473815",
  storageBucket: "canvas-473815.firebasestorage.app",
  messagingSenderId: "712522010755",
  appId: "1:712522010755:web:14b99c2d96fa610bc38bb6",
  measurementId: "G-NKBJW0HCEZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

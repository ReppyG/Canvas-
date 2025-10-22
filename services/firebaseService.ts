// services/firebaseService.ts
// Fix for lines 30, 31, 33, 36, 37: Changed imports to use Firebase v8 compatibility modules.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- Firebase Configuration ---
// IMPORTANT: To get this application working, you MUST replace the placeholder
// configuration below with your own Firebase project's configuration.
//
// How to get your Firebase config:
// 1. Go to the Firebase Console: https://console.firebase.google.com/
// 2. Select your project (or create a new one).
// 3. Go to Project Settings (click the gear icon).
// 4. In the "Your apps" card, select the web app for this project.
// 5. Under "SDK setup and configuration", select "Config".
// 6. Copy the entire `firebaseConfig` object and paste it below.
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


// --- Firebase Initialization ---
// This ensures Firebase is initialized only once, preventing errors on hot reloads.
let app;
if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}

const auth = firebase.auth();
const db = firebase.firestore();

export { app, auth, db };
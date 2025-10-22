import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- Firebase Configuration ---
// This configuration now securely loads your credentials from Vercel's Environment Variables.
// Make sure you have set up all the VITE_FIREBASE_* variables in your Vercel project settings.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// --- Firebase Initialization ---
// This ensures Firebase is initialized only once, preventing errors on hot reloads.
let app;
if (!firebase.apps.length) {
  // Check if firebaseConfig has been filled out
  if (!firebaseConfig.apiKey) {
    console.error("Firebase config is missing. Please add your VITE_FIREBASE_* variables to your Vercel environment settings.");
    // You might want to display an error to the user in the UI as well
  } else {
    app = firebase.initializeApp(firebaseConfig);
  }
} else {
  app = firebase.app();
}

const auth = firebase.auth();
const db = firebase.firestore();

export { app, auth, db };

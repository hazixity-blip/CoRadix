// ============================================================
// FIREBASE CONFIG — fill this in with YOUR project's keys
// ============================================================
// Where to find these: Firebase Console → Project Settings (gear icon)
// → scroll to "Your apps" → click the web app (</>) → copy the config object
//
// This file is safe to be public / committed to GitHub. These are
// client-side identifiers, not secrets — real security comes from
// Firestore Security Rules (see firestore.rules file / setup guide).
// ============================================================

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

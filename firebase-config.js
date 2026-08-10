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
  apiKey: "AIzaSyB_LavhWrj9Zw_EXRLzj1sbBkBuqFUmP1U",
  authDomain: "coradix-academy.firebaseapp.com",
  projectId: "coradix-academy",
  storageBucket: "coradix-academy.firebasestorage.app",
  messagingSenderId: "787654248791",
  appId: "1:787654248791:web:0c1038c52688c01c7e1612"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// WallpaperHub - Firebase
// ==========================================

import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
    getAuth
} from
"https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
    getFirestore
} from
"https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";


// ==========================================
// Firebase Configuration
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyBacrGC0hCE5BadCfN_wqlPBvZaits4pSM",
    authDomain: "wallpaperhub-b21be.firebaseapp.com",
    projectId: "wallpaperhub-b21be",
    storageBucket: "wallpaperhub-b21be.firebasestorage.app",
    messagingSenderId: "806872158995",
    appId: "1:806872158995:web:aa189a75225a9863c6c0e6",
    measurementId: "G-X4T2ET2F92"
};


// ==========================================
// Initialize Firebase
// ==========================================

const app = initializeApp(firebaseConfig);


// ==========================================
// Services
// ==========================================

const auth = getAuth(app);

const db = getFirestore(app);


// ==========================================
// Export
// ==========================================

export {
    auth,
    db
};
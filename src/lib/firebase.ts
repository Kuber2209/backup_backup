
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

let app;
let auth;
let db;
let storage;

// This function fetches the config and initializes Firebase
// It's designed to run only once.
const initializeFirebase = async () => {
    if (getApps().length) {
        app = getApp();
    } else {
        const response = await fetch('/api/firebase-config');
        if (!response.ok) {
            throw new Error("Failed to fetch Firebase config.");
        }
        const firebaseConfig: FirebaseOptions = await response.json();
        
        // Ensure that all required config values are present before initializing
        if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
            console.error("Firebase config is missing required fields.");
            // In a real app, you might want to show an error to the user
            // instead of letting the app continue in a broken state.
            return;
        }
        
        app = initializeApp(firebaseConfig);
    }

    auth = getAuth(app);
    // Connect to the default Firestore database, not a named one.
    db = getFirestore(app); 
    storage = getStorage(app);
};


// We export a promise that resolves when initialization is complete.
// Components or services can await this before using firebase services.
const firebaseInitialization = initializeFirebase();

// We also export the services directly. They will be undefined until
// initialization is complete, but this pattern is common.
// The AuthProvider will wait for the promise to resolve.
export { app, auth, db, storage, firebaseInitialization };


import { getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// This function is now a simple getter.
// Initialization is handled in FirebaseClientProvider.
function initializeFirebase() {
    if (getApps().length) {
        app = getApp();
        auth = getAuth(app);
        db = getFirestore(app); 
        storage = getStorage(app);
    } else {
        // This should not happen in the browser, as FirebaseClientProvider handles it.
        // It might happen in a server-side context if not initialized.
        throw new Error("Firebase has not been initialized. Please use FirebaseClientProvider.");
    }
}

// We do not call initializeFirebase() here anymore. It's called inside the provider.
// This prevents the server-side error.

// Export getters that ensure initialization before use.
const getFirebaseApp = () => {
    if (!app) initializeFirebase();
    return app;
};
const getFirebaseAuth = () => {
    if (!auth) initializeFirebase();
    return auth;
};
const getFirebaseDb = () => {
    if (!db) initializeFirebase();
    return db;
};
const getFirebaseStorage = () => {
    if (!storage) initializeFirebase();
    return storage;
};

export { 
    getFirebaseApp as app, 
    getFirebaseAuth as auth, 
    getFirebaseDb as db, 
    getFirebaseStorage as storage
};

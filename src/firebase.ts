import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config or fallback to (default)
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

// Initialize Storage
const storage = getStorage(app);

export { app, db, storage };


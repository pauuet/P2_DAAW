import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyA7MRvUNtrSkeMH3Kh9SPtDVZyvS1N6fZo",
    authDomain: "p2daaw.firebaseapp.com",
    databaseURL: "https://p2daaw-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "p2daaw",
    storageBucket: "p2daaw.firebasestorage.app",
    messagingSenderId: "411771228999",
    appId: "1:411771228999:web:53c753df685cb7fd617262"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

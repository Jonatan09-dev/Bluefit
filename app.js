import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Deine Firebase Konfiguration (mit dem großen U)
const firebaseConfig = {
    apiKey: "AIzaSyBvAvCiCoMU6j9znTnjnv21vgaqFlwgNak",
    authDomain: "bluefit-d671e.firebaseapp.com",
    projectId: "bluefit-d671e",
    storageBucket: "bluefit-d671e.firebasestorage.app",
    messagingSenderId: "972090891640",
    appId: "1:972090891640:web:5036ed05019d4277cefc8d",
    measurementId: "G-5WZ2Q1EPZN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userData = {
    goal: 2500,
    eaten: 0,
    water: 0,
    meals: []
};

// --- AUTH LOGIK ---
window.handleAuth = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if(!email || !pass) return alert("Bitte Daten ausfüllen");

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (regErr) {
            alert("Fehler: " + regErr.message);
        }
    }
};

document.getElementById('login-btn').onclick = window.handleAuth;
document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- DATEN-SYNC & BERECHNUNG ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                userData = docSnap.data();
                updateUI();
            } else {
                // Initiales Setup (Bedarfsrechner)
                const weight = prompt("Dein Gewicht in kg?", "80");
                const height = prompt("Deine Größe in cm?", "180");
                const age = prompt("Dein Alter?", "25");
                
                // Einfache Formel: (10 * kg) + (6.25 * cm) - (5 * alter) + 5
                const calculatedGoal = Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
                
                setDoc(doc(db, "users", user.uid), { 
                    goal: calculatedGoal, 
                    eaten: 0, 
                    water: 0, 
                    meals: [] 
                });
            }
        });
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
    }
});

// --- UI UPDATES ---
function updateUI() {
    const goal = userData.goal || 2500;
    const eaten = userData.eaten || 0;
    const left = goal - eaten;

    document.getElementById('goal-val').innerText = goal;
    document.getElementById('eaten-val').innerText = eaten;
    document.getElementById('display-kcal-offen').innerText = left < 0 ? 0 : left;
    document.getElementById('water-val').innerText = userData.water || 0;

    // Kreis Animation
    const ring = document.getElementById('kcal-ring');
    const progress = Math.min(eaten / goal, 1);
    ring.style.strokeDashoffset = 440 - (progress * 440);

    // Liste
    const list = document.getElementById('food-list');
    list.innerHTML = "";
    (userData.meals || []).slice(-5).reverse().forEach(meal => {
        list.innerHTML += `
            <div class="bg-slate-800/60 p-4 rounded-2xl flex justify-between items-center border border-slate-700 animate-in fade-in duration-500">
                <div class="flex items-center gap-3">
                    <span class="text-lg">🍽️</span>
                    <span class="font-medium">${meal.name}</span>
                </div>
                <span class="text-pink-500 font-bold">${meal.kcal} kcal</span>
            </div>`;
    });
}

// --- AKTIONEN ---
document.getElementById('add-food-btn').onclick = async () => {
    const name = document.getElementById('food-name').value;
    const kcal = parseInt(document.getElementById('food-kcal').value);
    
    if (name && kcal) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
            eaten: (userData.eaten || 0) + kcal,
            meals: arrayUnion({ name, kcal, date: new Date().toISOString() })
        });
        document.getElementById('food-name').value = "";
        document.getElementById('food-kcal').value = "";
    }
};

document.getElementById('add-water-btn').onclick = async () => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, {
        water: (userData.water || 0) + 250
    });
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvAvCiCoMU6j9znTnjnv21vgaqFlwgNak",
    authDomain: "bluefit-d671e.firebaseapp.com",
    projectId: "bluefit-d671e",
    storageBucket: "bluefit-d671e.firebasestorage.app",
    messagingSenderId: "972090891640",
    appId: "1:972090891640:web:5036ed05019d4277cefc8d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userData = {};
const categories = [
    { id: 'breakfast', name: 'Frühstück', emoji: '🍳' },
    { id: 'lunch', name: 'Mittagessen', emoji: '🥪' },
    { id: 'dinner', name: 'Abendessen', emoji: '🥗' },
    { id: 'snack1', name: 'Snack 1', emoji: '🍎' },
    { id: 'snack2', name: 'Snack 2', emoji: '🍫' }
];

// --- LOGIN ---
document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch { await createUserWithEmailAndPassword(auth, email, pass); }
};
document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- APP START & SYNC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                userData = docSnap.data();
                renderAll();
            } else {
                const weight = prompt("Gewicht (kg)?", "80");
                const height = prompt("Größe (cm)?", "180");
                const age = prompt("Alter?", "25");
                const cal = Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
                setDoc(doc(db, "users", user.uid), { goal: cal, eaten: 0, water: 0, waterGoal: 2500, meals: [] });
            }
        });
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
    }
});

// --- UI RENDERING ---
function renderAll() {
    const eaten = userData.meals.reduce((sum, m) => sum + m.kcal, 0);
    document.getElementById('goal-val').innerText = userData.goal;
    document.getElementById('eaten-val').innerText = eaten;
    document.getElementById('display-kcal-offen').innerText = Math.max(0, userData.goal - eaten);
    document.getElementById('kcal-ring').style.strokeDashoffset = 440 - (Math.min(eaten / userData.goal, 1) * 440);

    // Wasser Gläser
    const wContainer = document.getElementById('water-glasses');
    wContainer.innerHTML = "";
    const numGlasses = Math.ceil(userData.waterGoal / 250);
    const fullGlasses = Math.floor(userData.water / 250);
    for(let i=0; i<numGlasses; i++) {
        wContainer.innerHTML += `<span class="glass-icon" style="opacity: ${i < fullGlasses ? '1' : '0.2'}">🥛</span>`;
    }
    document.getElementById('water-current').innerText = userData.water;
    document.getElementById('water-goal').innerText = userData.waterGoal;

    // Mahlzeiten Kategorien
    categories.forEach(cat => {
        const catBox = document.getElementById(`cat-${cat.id}`);
        const catMeals = userData.meals.filter(m => m.category === cat.id);
        const catSum = catMeals.reduce((sum, m) => sum + m.kcal, 0);

        catBox.innerHTML = `
            <details class="bg-slate-800/40 rounded-3xl border border-slate-800 overflow-hidden">
                <summary class="p-5 flex justify-between items-center cursor-pointer">
                    <div class="flex items-center gap-3"><span>${cat.emoji}</span> <span class="font-bold text-sm">${cat.name}</span></div>
                    <span class="text-pink-500 font-bold text-sm">${catSum} kcal</span>
                </summary>
                <div class="p-4 bg-slate-900/20 space-y-3">
                    <div class="space-y-2">${catMeals.map((m, index) => `
                        <div class="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl text-xs">
                            <span>${m.name}</span>
                            <div class="flex items-center gap-3">
                                <span class="font-bold">${m.kcal} kcal</span>
                                <button onclick="window.deleteMeal('${m.id}')" class="text-red-500 font-bold">✕</button>
                            </div>
                        </div>`).join('')}</div>
                    <div class="flex gap-2">
                        <input id="in-${cat.id}-n" type="text" placeholder="Was?" class="flex-1 bg-slate-900 p-2 rounded-xl text-xs border border-slate-700 outline-none text-white">
                        <input id="in-${cat.id}-k" type="number" placeholder="kcal" class="w-16 bg-slate-900 p-2 rounded-xl text-xs border border-slate-700 outline-none text-white">
                        <button onclick="window.addMeal('${cat.id}')" class="bg-pink-600 px-3 rounded-xl font-bold">+</button>
                    </div>
                </div>
            </details>`;
    });
}

// --- AKTIONEN ---
window.addMeal = async (catId) => {
    const n = document.getElementById(`in-${catId}-n`).value;
    const k = parseInt(document.getElementById(`in-${catId}-k`).value);
    if (!n || !k) return;
    const newMeal = { id: Date.now().toString(), name: n, kcal: k, category: catId };
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        meals: [...userData.meals, newMeal]
    });
};

window.deleteMeal = async (mealId) => {
    const newMeals = userData.meals.filter(m => m.id !== mealId);
    await updateDoc(doc(db, "users", auth.currentUser.uid), { meals: newMeals });
};

document.getElementById('add-water').onclick = async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { water: (userData.water || 0) + 250 });
};
document.getElementById('sub-water').onclick = async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { water: Math.max(0, (userData.water || 0) - 250) });
};

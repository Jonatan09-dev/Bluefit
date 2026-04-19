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

let userData = { meals: [], water: 0, goal: 2500, waterGoal: 2500 };
const categories = [
    { id: 'breakfast', name: 'Frühstück', emoji: '🍳' },
    { id: 'lunch', name: 'Mittagessen', emoji: '🥪' },
    { id: 'dinner', name: 'Abendessen', emoji: '🥗' },
    { id: 'snack1', name: 'Snack 1', emoji: '🍎' },
    { id: 'snack2', name: 'Snack 2', emoji: '🍫' }
];

// Login / Logout
document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch { await createUserWithEmailAndPassword(auth, email, pass); }
};
document.getElementById('logout-btn').onclick = () => signOut(auth);

// Daten Synchronisation
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                userData = docSnap.data();
                renderUI();
            } else {
                setDoc(doc(db, "users", user.uid), { goal: 2500, eaten: 0, water: 0, waterGoal: 2500, meals: [] });
            }
        });
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
    }
});

// Suche in Open Food Facts
window.searchFood = async (catId) => {
    const query = document.getElementById(`in-${catId}-n`).value;
    const resDiv = document.getElementById(`res-${catId}`);
    if (query.length < 3) { resDiv.innerHTML = ""; resDiv.classList.add('hidden'); return; }

    try {
        const resp = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&page_size=6&json=1`);
        const data = await resp.json();
        if (data.products && data.products.length > 0) {
            resDiv.classList.remove('hidden');
            resDiv.innerHTML = data.products
                .filter(p => p.nutriments && p.nutriments['energy-kcal_100g'])
                .map(p => `
                <div onclick="window.selectProduct('${catId}', '${(p.product_name || 'Unbekannt').replace(/'/g, "")}', ${p.nutriments['energy-kcal_100g']})" 
                     class="search-item">
                    <div class="flex flex-col">
                        <span class="text-white font-bold text-xs">${p.product_name}</span>
                        <span class="text-[10px] text-slate-400">${p.brands || ''}</span>
                    </div>
                    <span class="text-pink-500 font-bold text-xs">${Math.round(p.nutriments['energy-kcal_100g'])} kcal</span>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
};

window.selectProduct = (catId, name, kcal) => {
    document.getElementById(`in-${catId}-n`).value = name;
    document.getElementById(`in-${catId}-k`).value = Math.round(kcal);
    document.getElementById(`res-${catId}`).innerHTML = "";
    document.getElementById(`res-${catId}`).classList.add('hidden');
};

window.addMeal = async (catId) => {
    const n = document.getElementById(`in-${catId}-n`).value;
    const k = parseInt(document.getElementById(`in-${catId}-k`).value);
    if (!n || isNaN(k)) return;
    const newMeal = { id: Date.now().toString(), name: n, kcal: k, category: catId };
    await updateDoc(doc(db, "users", auth.currentUser.uid), { meals: [...(userData.meals || []), newMeal] });
};

window.deleteMeal = async (id) => {
    const filtered = userData.meals.filter(m => m.id !== id);
    await updateDoc(doc(db, "users", auth.currentUser.uid), { meals: filtered });
};

// Wasser Logik
document.getElementById('add-water').onclick = async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { water: (userData.water || 0) + 250 });
};
document.getElementById('sub-water').onclick = async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { water: Math.max(0, (userData.water || 0) - 250) });
};

function renderUI() {
    const eaten = (userData.meals || []).reduce((s, m) => s + m.kcal, 0);
    document.getElementById('goal-val').innerText = userData.goal;
    document.getElementById('eaten-val').innerText = eaten;
    document.getElementById('display-kcal-offen').innerText = Math.max(0, userData.goal - eaten);
    document.getElementById('kcal-ring').style.strokeDashoffset = 440 - (Math.min(eaten / userData.goal, 1) * 440);

    const wCont = document.getElementById('water-glasses');
    wCont.innerHTML = "";
    const full = Math.floor(userData.water / 250);
    for(let i=0; i<Math.ceil(userData.waterGoal/250); i++) {
        wCont.innerHTML += `<span class="glass-icon" style="opacity: ${i < full ? '1' : '0.1'}">🥛</span>`;
    }
    document.getElementById('water-current').innerText = userData.water;

    categories.forEach(cat => {
        const catBox = document.getElementById(`cat-${cat.id}`);
        const cMeals = (userData.meals || []).filter(m => m.category === cat.id);
        const cSum = cMeals.reduce((s, m) => s + m.kcal, 0);

        catBox.innerHTML = `
            <details class="bg-slate-800/40 rounded-3xl border border-slate-800 mb-3 shadow-lg">
                <summary class="p-5 flex justify-between items-center cursor-pointer">
                    <div class="flex items-center gap-3"><span>${cat.emoji}</span> <span class="font-bold text-sm">${cat.name}</span></div>
                    <span class="text-pink-500 font-bold text-sm">${cSum} kcal</span>
                </summary>
                <div class="p-4 bg-slate-900/20 space-y-4">
                    <div class="space-y-2">${cMeals.map(m => `
                        <div class="flex justify-between items-center bg-slate-800/60 p-3 rounded-xl text-xs border border-slate-700">
                            <span>${m.name}</span>
                            <div class="flex items-center gap-3">
                                <span class="font-bold">${m.kcal} kcal</span>
                                <button onclick="window.deleteMeal('${m.id}')" class="text-red-500 font-bold">✕</button>
                            </div>
                        </div>`).join('')}
                    </div>
                    
                    <div class="relative">
                        <div class="flex gap-2">
                            <input id="in-${cat.id}-n" oninput="window.searchFood('${cat.id}')" type="text" placeholder="Suchen..." class="flex-1 bg-slate-900 p-3 rounded-xl text-xs border border-slate-700 outline-none text-white focus:border-pink-600">
                            <input id="in-${cat.id}-k" type="number" placeholder="kcal" class="w-20 bg-slate-900 p-3 rounded-xl text-xs border border-slate-700 outline-none text-white">
                            <button onclick="window.addMeal('${cat.id}')" class="bg-pink-600 px-4 rounded-xl font-bold">+</button>
                        </div>
                        <div id="res-${cat.id}" class="search-results hidden shadow-2xl"></div>
                    </div>
                </div>
            </details>`;
    });
}

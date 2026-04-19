import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- DEINE FIREBASE KONFIGURATION ---
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

// --- LOGIN & AUTH ---
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.onclick = async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        if (!email || !pass) return;
        try { 
            await signInWithEmailAndPassword(auth, email, pass); 
        } catch (e) { 
            try { await createUserWithEmailAndPassword(auth, email, pass); } catch(err) { alert(err.message); }
        }
    };
}

document.getElementById('logout-btn').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        onSnapshot(doc(db, "users", user.uid), (s) => {
            if (s.exists()) { userData = s.data(); renderUI(); }
            else { setDoc(doc(db, "users", user.uid), { goal: 2150, water: 0, waterGoal: 2500, meals: [] }); }
        });
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
    }
});

// --- OPTIMIERTE DEUTSCHE SUCHE ---
window.searchFood = async (catId) => {
    const query = document.getElementById(`in-${catId}-n`).value;
    const resDiv = document.getElementById(`res-${catId}`);
    
    if (query.length < 3) { 
        resDiv.innerHTML = ""; 
        resDiv.classList.add('hidden'); 
        return; 
    }

    try {
        // Filtert gezielt nach Deutschland (tag_0=germany) und sortiert nach Beliebtheit (unique_scans_n)
        const url = `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${query}&tagtype_0=countries&tag_contains_0=contains&tag_0=germany&action=process&json=1&page_size=12&sort_by=unique_scans_n`;
        
        const resp = await fetch(url);
        const data = await resp.json();
        
        if (data.products && data.products.length > 0) {
            // Nur Produkte behalten, die Kalorien haben und bevorzugt deutsche Namen nutzen
            const filtered = data.products.filter(p => p.nutriments && p.nutriments['energy-kcal_100g']);
            
            if (filtered.length > 0) {
                resDiv.classList.remove('hidden');
                resDiv.innerHTML = filtered.map(p => {
                    const name = p.product_name_de || p.product_name || "Unbekanntes Produkt";
                    const brand = p.brands ? p.brands.split(',')[0] : "Markenlos";
                    const kcal = Math.round(p.nutriments['energy-kcal_100g']);

                    return `
                    <div onclick="window.selectProduct('${catId}', '${name.replace(/'/g, "")}', ${kcal})" 
                         class="search-item">
                        <div class="flex flex-col overflow-hidden">
                            <span class="text-white font-bold text-[11px] truncate">${name}</span>
                            <span class="text-[9px] text-slate-400 truncate">${brand}</span>
                        </div>
                        <span class="text-pink-500 font-bold text-xs ml-2 whitespace-nowrap">${kcal} kcal</span>
                    </div>`;
                }).join('');
            }
        }
    } catch (e) { console.error("Suche fehlgeschlagen", e); }
};

window.selectProduct = (catId, name, kcal) => {
    document.getElementById(`in-${catId}-n`).value = name;
    document.getElementById(`in-${catId}-k`).value = kcal;
    document.getElementById(`res-${catId}`).

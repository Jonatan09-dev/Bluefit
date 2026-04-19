// ... (Firebase Config oben bleibt gleich) ...

window.searchFood = async (catId) => {
    const query = document.getElementById(`in-${catId}-n`).value;
    const resDiv = document.getElementById(`res-${catId}`);
    
    if (query.length < 3) { 
        resDiv.innerHTML = ""; 
        resDiv.classList.add('hidden'); 
        return; 
    }

    try {
        // Wir nutzen die deutsche Subdomain und filtern schärfer
        const url = `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=8&sort_by=unique_scans_n`;
        
        const resp = await fetch(url);
        const data = await resp.json();
        
        if (data.products && data.products.length > 0) {
            resDiv.classList.remove('hidden');
            resDiv.innerHTML = data.products
                .filter(p => p.nutriments && p.nutriments['energy-kcal_100g']) // Nur Produkte mit Kalorien
                .map(p => `
                <div onclick="window.selectProduct('${catId}', '${(p.product_name || 'Unbekannt').replace(/'/g, "")}', ${p.nutriments['energy-kcal_100g']})" 
                     class="search-item">
                    <div class="flex flex-col overflow-hidden">
                        <span class="text-white font-bold text-[11px] truncate">${p.product_name}</span>
                        <span class="text-[9px] text-slate-400 truncate">${p.brands || 'Marke unbekannt'}</span>
                    </div>
                    <span class="text-pink-500 font-bold text-xs ml-2 whitespace-nowrap">${Math.round(p.nutriments['energy-kcal_100g'])} kcal</span>
                </div>
            `).join('');
        } else {
            resDiv.innerHTML = '<div class="p-3 text-xs text-slate-500">Keine deutschen Treffer...</div>';
        }
    } catch (e) { 
        console.error("Suche Fehler:", e); 
    }
};

// ... (Rest der app.js wie bisher) ...

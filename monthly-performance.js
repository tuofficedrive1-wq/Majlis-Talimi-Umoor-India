/**
 * Monthly Performance Module
 */
import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Pehle yahan const db = getFirestore() tha, use hata dein.

export const renderPerformanceTab = (assignedJamiaat, currentUser, db) => {
    const container = document.getElementById('performance-jamia-list');
    
    if (!assignedJamiaat || assignedJamiaat.length === 0) {
        container.innerHTML = `<p class="text-center text-slate-400 p-10">No Jamiaat assigned.</p>`;
        return;
    }

    let html = `<div class="grid grid-cols-1 gap-4">`;
    assignedJamiaat.forEach(jamia => {
        const jamiaId = `${currentUser.uid.slice(0, 5)}_${jamia.replace(/\s+/g, '_')}`;
        html += `
        <div class="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl hover:border-indigo-500 transition-all">
            <div>
                <p class="font-bold text-slate-700">${jamia}</p>
                <span class="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded font-mono font-bold">ID: ${jamiaId}</span>
            </div>
            <button onclick="window.openPerformanceForm('${jamiaId}', '${jamia}')" 
                    class="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg">
                Performance Form <i class="fas fa-chevron-right ml-1"></i>
            </button>
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
};

// Window function as is rahega
window.openPerformanceForm = (id, name) => {
    const monthInput = document.getElementById('report-month');
    const month = monthInput ? monthInput.value : new Date().toISOString().slice(0, 7);
    const url = `academic-monthly-performance.html?jamiaId=${id}&jamiaName=${encodeURIComponent(name)}&month=${month}`;
    window.open(url, '_blank');
};

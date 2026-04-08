/**
 * Monthly Performance Module
 * Dashboard ke 'Monthly Performance' tab ka logic yahan hai.
 */

import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Yahan se 'const db = getFirestore()' hata diya gaya hai taake error na aaye.

/**
 * Monthly Performance tab me Jamiaat ki list dikhane ke liye
 * @param {Array} assignedJamiaat - Inspector ko assign kiye gaye Jamiaat
 * @param {Object} currentUser - Current logged-in user (Inspector)
 * @param {Object} db - Firestore instance jo main dashboard se aayega
 */
export const renderPerformanceTab = (assignedJamiaat, currentUser, db) => {
    const container = document.getElementById('performance-jamia-list');
    const monthInput = document.getElementById('report-month');

    if (!assignedJamiaat || assignedJamiaat.length === 0) {
        container.innerHTML = `<p class="text-center text-slate-400 p-10">Aapko koi Jamia assign nahi kiya gaya hai.</p>`;
        return;
    }

    let html = `<div class="grid grid-cols-1 gap-4">`;

    assignedJamiaat.forEach(jamia => {
        // Unique ID generation logic
        const jamiaId = `${currentUser.uid.slice(0, 5)}_${jamia.replace(/\s+/g, '_')}`;
        
        html += `
        <div class="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl hover:border-indigo-500 hover:shadow-md transition-all group">
            <div>
                <p class="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">${jamia}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded font-mono uppercase font-bold">ID: ${jamiaId}</span>
                </div>
            </div>
            <button onclick="window.openPerformanceForm('${jamiaId}', '${jamia}')" 
                    class="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
                Performance Form <i class="fas fa-chevron-right ml-1"></i>
            </button>
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
};

/**
 * Specific Jamia ka performance form naye window me kholna
 */
window.openPerformanceForm = (id, name) => {
    const monthInput = document.getElementById('report-month');
    const month = monthInput ? monthInput.value : new Date().toISOString().slice(0, 7);
    
    // Dashboard ke parameters ke mutabiq URL
    const url = `academic-monthly-performance.html?jamiaId=${id}&jamiaName=${encodeURIComponent(name)}&month=${month}`;
    window.open(url, '_blank');
};

/**
 * Data save karne ka helper function
 * Is function ko ab 'db' parameter bhi chahiye hoga agar use karna hai
 */
export const savePerformanceData = async (db, jamiaId, month, payload) => {
    const docId = `${jamiaId}_${month}`;
    try {
        await setDoc(doc(db, "monthly_performance", docId), {
            ...payload,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving Monthly Performance:", error);
        return { success: false, error: error.message };
    }
};

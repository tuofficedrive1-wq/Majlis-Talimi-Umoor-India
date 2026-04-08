/**
 * Monthly Performance Module (With Sub-Tabs)
 * Dashboard ke 'Monthly Performance' tab ka logic yahan hai.
 */

import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/**
 * Main function jo tab click par load hota hai
 */
export const renderPerformanceTab = (assignedJamiaat, currentUser, db) => {
    const container = document.getElementById('performance-jamia-list');

    // 1. Sub-Tabs ka Structure banana
    container.innerHTML = `
        <div class="mb-6">
            <div class="flex border-b border-slate-200 gap-4 overflow-x-auto">
                <button class="sub-tab-btn active border-b-2 border-indigo-600 px-4 py-2 text-sm font-bold text-indigo-600 transition-all" data-sub="performance">Performance</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all" data-sub="summary">Summary</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all" data-sub="structure">Structure</button>
            </div>
        </div>
        <div id="sub-tab-content" class="min-h-[200px]">
            </div>
    `;

    // 2. Click event listeners lagana
    const subTabBtns = container.querySelectorAll('.sub-tab-btn');
    subTabBtns.forEach(btn => {
        btn.onclick = () => {
            // UI Update: Active class sambhalna
            subTabBtns.forEach(b => {
                b.classList.remove('active', 'border-b-2', 'border-indigo-600', 'text-indigo-600');
                b.classList.add('text-slate-500');
            });
            btn.classList.add('active', 'border-b-2', 'border-indigo-600', 'text-indigo-600');
            btn.classList.remove('text-slate-500');

            // Content Render karna
            renderSubTabContent(btn.dataset.sub, assignedJamiaat, currentUser, db);
        };
    });

    // Default: Pehla sub-tab (Performance) load karein
    renderSubTabContent('performance', assignedJamiaat, currentUser, db);
};

/**
 * Har sub-tab ka alag content render karne ke liye
 */
const renderSubTabContent = (tabName, assignedJamiaat, currentUser, db) => {
    const contentArea = document.getElementById('sub-tab-content');
    
    if (tabName === 'performance') {
        // --- PERFORMANCE LOGIC ---
        if (!assignedJamiaat || assignedJamiaat.length === 0) {
            contentArea.innerHTML = `<p class="text-center text-slate-400 p-10">Koi Jamia assign nahi hai.</p>`;
            return;
        }

        let html = `<div class="grid grid-cols-1 gap-4">`;
        assignedJamiaat.forEach(jamia => {
            const jamiaId = `${currentUser.uid.slice(0, 5)}_${jamia.replace(/\s+/g, '_')}`;
            html += `
            <div class="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl hover:border-indigo-500 hover:shadow-md transition-all group">
                <div>
                    <p class="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">${jamia}</p>
                    <span class="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded font-mono uppercase font-bold">ID: ${jamiaId}</span>
                </div>
                <button onclick="window.openPerformanceForm('${jamiaId}', '${jamia}')" 
                        class="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
                    Open Form <i class="fas fa-chevron-right ml-1"></i>
                </button>
            </div>`;
        });
        html += `</div>`;
        contentArea.innerHTML = html;

    } else if (tabName === 'summary') {
        // --- SUMMARY LOGIC ---
        contentArea.innerHTML = `
            <div class="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-center">
                <i class="fas fa-chart-line text-indigo-400 text-4xl mb-3"></i>
                <p class="text-indigo-700 font-bold">Summary View</p>
                <p class="text-xs text-indigo-500 mt-1">Is mahine ki reporting ka majmua (overview) yahan nazar aayega.</p>
            </div>`;

    } else if (tabName === 'structure') {
        // --- STRUCTURE LOGIC (English Version with Teacher Profile & Periods) ---
        if (!assignedJamiaat || assignedJamiaat.length === 0) {
            contentArea.innerHTML = `<p class="text-center text-slate-400 p-10">No Jamiaat assigned to your profile.</p>`;
            return;
        }

        contentArea.innerHTML = `
            <div id="structure-accordion" class="space-y-4">
                ${assignedJamiaat.map(jamia => `
                    <div class="border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm" data-jamia="${jamia}">
                        <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 transition-all font-bold text-slate-700">
                            <span class="text-lg">${jamia}</span>
                            <i class="fas fa-chevron-down transition-transform"></i>
                        </button>

                        <div class="jamia-content hidden p-6 border-t border-slate-100 space-y-6">
                            
                            <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                                <h4 class="text-sm font-bold text-indigo-600 uppercase mb-4 flex items-center gap-2">
                                    <i class="fas fa-user-plus"></i> Add New Teacher Profile
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" placeholder="Name Of Teacher" class="t-name p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="text" placeholder="Ajeer Code" class="t-ajeer p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="text" placeholder="Contact No." class="t-contact p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    
                                    <input type="text" placeholder="Level Qualified" class="t-level p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="text" placeholder="Highest Qualification" class="t-high-qual p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="email" placeholder="Mail ID" class="t-mail p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    
                                    <input type="text" placeholder="Experience in Jamiatul Madina" class="t-exp p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="text" placeholder="Subject Specialization" class="t-spec p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="text" placeholder="Total Teaching Period" class="t-total-per p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    
                                    <input type="text" placeholder="Ijara Status" class="t-ijara p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="text" placeholder="Teaching Subject" class="t-subject p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="text" placeholder="Teacher Code (5 Digits)" class="t-login-code p-2.5 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" maxlength="5">
                                </div>
                                <button class="add-t-btn w-full mt-4 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                                    Save Teacher Profile
                                </button>
                            </div>

                            <div class="teacher-list space-y-4">
                                </div>

                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // --- Tab Logic Functions ---
        setupStructureEvents(contentArea, db);
    }
};

/**
 * Specific Jamia ka performance form naye window me kholna
 */
window.openPerformanceForm = (id, name) => {
    const monthInput = document.getElementById('report-month');
    const month = monthInput ? monthInput.value : new Date().toISOString().slice(0, 7);
    const url = `academic-monthly-performance.html?jamiaId=${id}&jamiaName=${encodeURIComponent(name)}&month=${month}`;
    window.open(url, '_blank');
};

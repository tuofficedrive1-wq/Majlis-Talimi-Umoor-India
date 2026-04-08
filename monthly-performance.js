import { 
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const renderPerformanceTab = (assignedJamiaat, currentUser, db) => {
    const container = document.getElementById('performance-jamia-list');
    container.innerHTML = `
        <div class="mb-6">
            <div class="flex border-b border-slate-200 gap-4 overflow-x-auto">
                <button class="sub-tab-btn active border-b-2 border-indigo-600 px-4 py-2 text-sm font-bold text-indigo-600" data-sub="performance">Performance</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500" data-sub="summary">Summary</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500" data-sub="structure">Structure</button>
            </div>
        </div>
        <div id="sub-tab-content"></div>
    `;

    const subTabBtns = container.querySelectorAll('.sub-tab-btn');
    subTabBtns.forEach(btn => {
        btn.onclick = () => {
            subTabBtns.forEach(b => {
                b.classList.remove('active', 'border-b-2', 'border-indigo-600', 'text-indigo-600');
                b.classList.add('text-slate-500');
            });
            btn.classList.add('active', 'border-b-2', 'border-indigo-600', 'text-indigo-600');
            renderSubTabContent(btn.dataset.sub, assignedJamiaat, currentUser, db);
        };
    });

    renderSubTabContent('performance', assignedJamiaat, currentUser, db);
};

const renderSubTabContent = async (tabName, assignedJamiaat, currentUser, db) => {
    const contentArea = document.getElementById('sub-tab-content');
    
    if (tabName === 'structure') {
        contentArea.innerHTML = `
            <div id="structure-accordion" class="space-y-4">
                ${assignedJamiaat.map(jamia => `
                    <div class="border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm" data-jamia="${jamia}">
                        <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">
                            <span>${jamia}</span>
                            <i class="fas fa-chevron-down transition-transform"></i>
                        </button>
                        <div class="jamia-content hidden p-6 border-t border-slate-100">
                            <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 mb-6">
                                <h4 class="text-sm font-bold text-indigo-600 uppercase mb-4">Add New Teacher</h4>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="form-${jamia.replace(/\s+/g, '')}">
                                    <input type="text" placeholder="Name Of Teacher" class="t-name p-2.5 border rounded-xl text-sm">
                                    <input type="text" placeholder="Ajeer Code" class="t-ajeer p-2.5 border rounded-xl text-sm">
                                    <input type="text" placeholder="Teacher Code (5 Digits)" class="t-login-code p-2.5 border rounded-xl text-sm font-bold" maxlength="5">
                                    </div>
                                <button class="add-t-btn w-full mt-4 bg-indigo-600 text-white py-3 rounded-2xl font-bold">Save Teacher</button>
                            </div>
                            <div class="teacher-list space-y-4"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        setupStructureEvents(contentArea, db, currentUser);
    } else {
        contentArea.innerHTML = `<p class="p-10 text-center text-slate-400">${tabName.toUpperCase()} section coming soon...</p>`;
    }
};

// --- YEH HAI WOH FUNCTION JO MISSING THA ---
const setupStructureEvents = (container, db, currentUser) => {
    // Dropdown toggle logic
    container.querySelectorAll('.jamia-toggle').forEach(btn => {
        btn.onclick = () => {
            const content = btn.nextElementSibling;
            const icon = btn.querySelector('i');
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        };
    });

    // Add Teacher logic (Placeholder for your backend)
    container.querySelectorAll('.add-t-btn').forEach(btn => {
        btn.onclick = () => {
            alert("Teacher data captured. Integrating with Firestore...");
            // Yahan aap Firestore save logic add karenge
        };
    });
};

window.openPerformanceForm = (id, name) => {
    const monthInput = document.getElementById('report-month');
    const month = monthInput ? monthInput.value : new Date().toISOString().slice(0, 7);
    const url = `academic-monthly-performance.html?jamiaId=${id}&jamiaName=${encodeURIComponent(name)}&month=${month}`;
    window.open(url, '_blank');
};

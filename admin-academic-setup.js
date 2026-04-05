// admin-academic-setup.js
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function initAcademicYearSetup(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Initial Layout
    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-md border border-indigo-100">
            <h3 class="text-xl font-bold text-indigo-800 mb-6 border-b pb-2">Central Academic Year Setup</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="p-4 bg-indigo-50 rounded-lg">
                    <label class="block text-sm font-bold mb-2">Active Academic Year</label>
                    <input type="text" id="admin-active-year" placeholder="e.g. 2025-2026" class="w-full p-2 border rounded">
                </div>
                <div class="p-4 bg-indigo-50 rounded-lg">
                    <label class="block text-sm font-bold mb-2">Semester Days</label>
                    <div class="flex gap-2">
                        <input type="number" id="admin-sem1-days" placeholder="Sem 1 Total" class="w-1/2 p-2 border rounded">
                        <input type="number" id="admin-sem2-days" placeholder="Sem 2 Total" class="w-1/2 p-2 border rounded">
                    </div>
                </div>
            </div>

            <div id="admin-months-config" class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                </div>

            <button id="save-central-config" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg w-full transition shadow-lg">
                <i class="fas fa-save mr-2"></i> Save & Apply to All Users
            </button>
        </div>
    `;

    const months = [
        { name: "April", idx: 3 }, { name: "May", idx: 4 }, { name: "June", idx: 5 },
        { name: "July", idx: 6 }, { name: "August", idx: 7 }, { name: "September", idx: 8 },
        { name: "October", idx: 9 }, { name: "November", idx: 10 }, { name: "December", idx: 11 },
        { name: "January", idx: 0 }
    ];

    const monthsContainer = document.getElementById('admin-months-config');
    monthsContainer.innerHTML = months.map(m => `
        <div class="p-2 border rounded bg-gray-50">
            <label class="block text-xs font-bold text-gray-500 mb-1">${m.name}</label>
            <input type="number" data-idx="${m.idx}" class="month-days-input w-full p-1 border rounded text-center font-bold">
        </div>
    `).join('');

    // Load Existing Global Settings
    const configRef = doc(db, "settings", "academic_config");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById('admin-active-year').value = data.activeYear || '';
        document.getElementById('admin-sem1-days').value = data.sem1TotalDays || '';
        document.getElementById('admin-sem2-days').value = data.sem2TotalDays || '';
        
        document.querySelectorAll('.month-days-input').forEach(input => {
            const idx = input.dataset.idx;
            input.value = data.academicMonths?.[idx] || '';
        });
    }

    // Save Function
    document.getElementById('save-central-config').onclick = async () => {
        const activeYear = document.getElementById('admin-active-year').value;
        const sem1 = parseInt(document.getElementById('admin-sem1-days').value);
        const sem2 = parseInt(document.getElementById('admin-sem2-days').value);
        
        const academicMonths = {};
        document.querySelectorAll('.month-days-input').forEach(input => {
            academicMonths[input.dataset.idx] = parseInt(input.value) || 0;
        });

        try {
            await setDoc(configRef, {
                activeYear,
                sem1TotalDays: sem1,
                sem2TotalDays: sem2,
                academicMonths,
                lastUpdated: new Date()
            });
            alert("Global Academic Structure Saved! Ab ye sabhi users ke liye apply ho gaya hai.");
        } catch (e) {
            alert("Error: " + e.message);
        }
    };
}
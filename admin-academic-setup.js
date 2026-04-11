// admin-academic-setup.js
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function initAcademicYearSetup(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-md border border-indigo-100">
            <h3 class="text-xl font-bold text-indigo-800 mb-6 border-b pb-2">Central Academic Year Setup</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="p-4 bg-indigo-50 rounded-lg">
                    <label class="block text-sm font-bold mb-2">Active Academic Year</label>
                    <input type="text" id="admin-active-year" placeholder="e.g. 2025-2026" class="w-full p-2 border rounded font-bold">
                </div>
                <div class="p-4 bg-indigo-50 rounded-lg">
                    <label class="block text-sm font-bold mb-2">Semester Total Days (Auto-Calculated)</label>
                    <div class="flex gap-2 text-center">
                        <div class="w-1/2">
                            <span class="text-xs text-gray-500">Sem 1</span>
                            <input type="number" id="admin-sem1-days" readonly class="w-full p-2 border rounded bg-gray-100 font-bold text-indigo-600">
                        </div>
                        <div class="w-1/2">
                            <span class="text-xs text-gray-500">Sem 2</span>
                            <input type="number" id="admin-sem2-days" readonly class="w-full p-2 border rounded bg-gray-100 font-bold text-indigo-600">
                        </div>
                    </div>
                </div>
            </div>

            <h4 class="font-bold text-gray-700 mb-4">Configure Months & Assign Semesters</h4>
            <div id="admin-months-config" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                </div>

            <div class="mt-8 p-6 bg-gray-50 rounded-xl border border-indigo-200">
                <h4 class="font-bold text-indigo-700 mb-4">Manage Classes & Subjects</h4>
                <div id="class-list-container" class="space-y-3 mb-4"></div>
                <button id="add-new-class-btn" class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition">
                    <i class="fas fa-plus"></i> Add Class
                </button>
            </div>

            <button id="save-central-config" class="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg w-full transition shadow-lg">
                <i class="fas fa-save mr-2"></i> Save Global Structure
            </button>
        </div>
    `;

    const months = [
        { name: "April", idx: 3 }, { name: "May", idx: 4 }, { name: "June", idx: 5 },
        { name: "July", idx: 6 }, { name: "August", idx: 7 }, { name: "September", idx: 8 },
        { name: "October", idx: 9 }, { name: "November", idx: 10 }, { name: "December", idx: 11 },
        { name: "January", idx: 0 }, { name: "February", idx: 1 }, { name: "March", idx: 2 }
    ];

    const monthsContainer = document.getElementById('admin-months-config');
    
    // Inject Month Inputs
    monthsContainer.innerHTML = months.map(m => `
        <div class="p-3 border rounded-lg bg-white shadow-sm month-card" data-idx="${m.idx}">
            <label class="block text-sm font-bold text-indigo-900 mb-2">${m.name}</label>
            <div class="space-y-2">
                <input type="number" placeholder="Days" class="month-days-input w-full p-2 border rounded text-sm" value="0">
                <select class="month-sem-select w-full p-2 border rounded text-xs bg-gray-50">
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                </select>
            </div>
        </div>
    `).join('');

    // --- Dynamic Calculation Logic ---
    function calculateTotals() {
        let sem1Sum = 0;
        let sem2Sum = 0;
        document.querySelectorAll('.month-card').forEach(card => {
            const days = parseInt(card.querySelector('.month-days-input').value) || 0;
            const sem = card.querySelector('.month-sem-select').value;
            if (sem === "1") sem1Sum += days;
            else sem2Sum += days;
        });
        document.getElementById('admin-sem1-days').value = sem1Sum;
        document.getElementById('admin-sem2-days').value = sem2Sum;
    }

    // Event listeners for auto-calc
    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('month-days-input') || e.target.classList.contains('month-sem-select')) {
            calculateTotals();
        }
    });

    // --- Class Management ---
    const classContainer = document.getElementById('class-list-container');
    function createClassRow(className = '', subjects = '') {
        const div = document.createElement('div');
        div.className = "flex gap-2 bg-white p-2 rounded border class-row shadow-sm";
        div.innerHTML = `
            <input type="text" placeholder="Class Name" class="class-name-input font-bold border p-2 rounded w-1/3" value="${className}">
            <input type="text" placeholder="Subjects (Comma separated)" class="class-subjects-input border p-2 rounded flex-1" value="${subjects}">
            <button class="remove-class-btn text-red-500 px-3 hover:bg-red-50"><i class="fas fa-trash"></i></button>
        `;
        div.querySelector('.remove-class-btn').onclick = () => div.remove();
        classContainer.appendChild(div);
    }
    document.getElementById('add-new-class-btn').onclick = () => createClassRow();

    // --- Load Existing Data ---
    const configRef = doc(db, "settings", "academic_config");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById('admin-active-year').value = data.activeYear || '';
        
        // Load Months config
        document.querySelectorAll('.month-card').forEach(card => {
            const idx = card.dataset.idx;
            const monthData = data.monthDetails?.[idx] || { days: 0, sem: "1" };
            card.querySelector('.month-days-input').value = monthData.days;
            card.querySelector('.month-sem-select').value = monthData.sem;
        });

        // Load Classes
        if (data.classes) {
            data.classes.forEach(c => createClassRow(c.className, c.subjects.join(', ')));
        }
        calculateTotals();
    }

    // --- Save Data ---
    document.getElementById('save-central-config').onclick = async () => {
        const activeYear = document.getElementById('admin-active-year').value;
        const sem1Total = parseInt(document.getElementById('admin-sem1-days').value);
        const sem2Total = parseInt(document.getElementById('admin-sem2-days').value);
        
        const monthDetails = {};
        document.querySelectorAll('.month-card').forEach(card => {
            monthDetails[card.dataset.idx] = {
                days: parseInt(card.querySelector('.month-days-input').value) || 0,
                sem: card.querySelector('.month-sem-select').value
            };
        });

        const classes = [];
        document.querySelectorAll('.class-row').forEach(row => {
            const name = row.querySelector('.class-name-input').value.trim();
            const subs = row.querySelector('.class-subjects-input').value.split(',').map(s => s.trim()).filter(s => s !== "");
            if (name) classes.push({ className: name, subjects: subs });
        });

        try {
            await setDoc(configRef, {
                activeYear,
                sem1TotalDays: sem1Total,
                sem2TotalDays: sem2Total,
                monthDetails,
                classes,
                lastUpdated: new Date()
            });
            alert("Structure saved! Ab teachers ko wahi classes aur subjects dikhenge jo aapne set kiye hain.");
        } catch (e) {
            alert("Error: " + e.message);
        }
    };
}

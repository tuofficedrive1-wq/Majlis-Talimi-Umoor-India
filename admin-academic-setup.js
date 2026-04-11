// admin-academic-setup.js
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function initAcademicYearSetup(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-md border border-indigo-100 max-w-5xl mx-auto">
            <h3 class="text-xl font-bold text-indigo-800 mb-6 border-b-2 border-indigo-500 pb-2">Academic Central Control</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <label class="block text-sm font-bold mb-1 text-indigo-900">Active Academic Year</label>
                    <input type="text" id="admin-active-year" placeholder="2025-2026" class="w-full p-2 border rounded font-bold text-lg">
                </div>
                <div class="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                    <span class="block text-xs font-bold text-green-700 uppercase">Sem 1 Total Days</span>
                    <span id="admin-sem1-days" class="text-2xl font-black text-green-800">0</span>
                </div>
                <div class="p-4 bg-orange-50 rounded-lg border border-orange-100 text-center">
                    <span class="block text-xs font-bold text-orange-700 uppercase">Sem 2 Total Days</span>
                    <span id="admin-sem2-days" class="text-2xl font-black text-orange-800">0</span>
                </div>
            </div>

            <div class="mb-6 border rounded-lg overflow-hidden">
                <button onclick="document.getElementById('months-body').classList.toggle('hidden')" class="w-full p-4 bg-gray-100 hover:bg-gray-200 flex justify-between items-center font-bold text-gray-700">
                    <span><i class="fas fa-calendar-alt mr-2 text-indigo-600"></i> CONFIGURE MONTHS & WORKING DAYS</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div id="months-body" class="hidden p-4 bg-white grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    </div>
            </div>

            <div class="mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-indigo-900"><i class="fas fa-graduation-cap mr-2"></i> CLASSES & SUBJECTS SETUP</h4>
                    <button id="add-new-class-btn" class="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 font-bold transition">
                        <i class="fas fa-plus mr-1"></i> Add New Class
                    </button>
                </div>
                <div id="class-list-container" class="space-y-3">
                    </div>
            </div>

            <button id="save-central-config" class="mt-10 bg-green-600 hover:bg-green-700 text-white font-black py-4 px-8 rounded-xl w-full transition shadow-xl text-lg tracking-wide uppercase">
                <i class="fas fa-save mr-2"></i> Save Global Structure
            </button>
        </div>

        <style>
            .font-urdu { font-family: 'Noto Nastaliq Urdu', serif; }
            .class-card.active { border-color: #4f46e5; ring: 2px; ring-color: #c7d2fe; }
        </style>
    `;

    const months = [
        { name: "April", idx: 3 }, { name: "May", idx: 4 }, { name: "June", idx: 5 },
        { name: "July", idx: 6 }, { name: "August", idx: 7 }, { name: "September", idx: 8 },
        { name: "October", idx: 9 }, { name: "November", idx: 10 }, { name: "December", idx: 11 },
        { name: "January", idx: 0 }, { name: "February", idx: 1 }, { name: "March", idx: 2 }
    ];

    // Inject Months
    const monthsContainer = document.getElementById('months-body');
    monthsContainer.innerHTML = months.map(m => `
        <div class="p-3 border rounded bg-indigo-50/50 month-card" data-idx="${m.idx}">
            <label class="block text-xs font-bold text-indigo-800 mb-2 uppercase">${m.name}</label>
            <div class="grid grid-cols-2 gap-2">
                <input type="number" placeholder="S1 Days" class="sem1-days w-full p-2 border rounded text-sm text-center bg-white" title="Semester 1 Days">
                <input type="number" placeholder="S2 Days" class="sem2-days w-full p-2 border rounded text-sm text-center bg-white" title="Semester 2 Days">
            </div>
        </div>
    `).join('');

    function calculateTotals() {
        let s1 = 0, s2 = 0;
        document.querySelectorAll('.month-card').forEach(c => {
            s1 += parseInt(c.querySelector('.sem1-days').value) || 0;
            s2 += parseInt(c.querySelector('.sem2-days').value) || 0;
        });
        document.getElementById('admin-sem1-days').innerText = s1;
        document.getElementById('admin-sem2-days').innerText = s2;
    }

    container.addEventListener('input', (e) => {
        if (e.target.matches('.sem1-days, .sem2-days')) calculateTotals();
    });

    // Subject Row
    function createSubjectRow(target, data = { eng: '', urdu: '' }) {
        const div = document.createElement('div');
        div.className = "flex gap-2 items-center bg-gray-50 p-2 rounded border border-dashed mb-2";
        div.innerHTML = `
            <input type="text" placeholder="Subject (English)" class="sub-eng-name p-2 border rounded w-1/2" value="${data.eng}">
            <input type="text" dir="rtl" placeholder="مضمون (اردو)" class="sub-urdu-name p-2 border rounded w-1/2 font-urdu" value="${data.urdu}">
            <button class="remove-sub-btn text-red-500 hover:bg-red-100 p-2 rounded"><i class="fas fa-trash"></i></button>
        `;
        div.querySelector('.remove-sub-btn').onclick = () => div.remove();
        target.appendChild(div);
    }

    // Class Row (Accordion Style)
    function createClassRow(data = { eng: '', urdu: '', subjects: [] }) {
        const classId = 'class-' + Math.random().toString(36).substr(2, 9);
        const div = document.createElement('div');
        div.className = "border rounded-lg bg-white shadow-sm class-block overflow-hidden";
        div.innerHTML = `
            <div class="flex items-center justify-between p-3 bg-white border-b hover:bg-gray-50 cursor-pointer" onclick="document.getElementById('${classId}').classList.toggle('hidden')">
                <div class="flex gap-4 items-center">
                    <i class="fas fa-chevron-right text-xs text-gray-400"></i>
                    <span class="font-bold text-indigo-700 class-label-display">${data.eng || 'New Class'} ${data.urdu ? ' / ' + data.urdu : ''}</span>
                </div>
                <button class="remove-class-btn text-red-400 hover:text-red-600 p-2"><i class="fas fa-trash-alt"></i></button>
            </div>
            
            <div id="${classId}" class="hidden p-5 bg-indigo-50/30">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase">Class Name (English)</label>
                        <input type="text" placeholder="e.g. Class 1" class="class-eng-name w-full p-2 border rounded mt-1 bg-white font-bold" value="${data.eng}">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase">Class Name (Urdu)</label>
                        <input type="text" dir="rtl" placeholder="مثلاً اول" class="class-urdu-name w-full p-2 border rounded mt-1 bg-white font-bold font-urdu" value="${data.urdu}">
                    </div>
                </div>
                
                <div class="bg-white p-4 rounded border">
                    <h5 class="text-sm font-bold text-gray-600 mb-3 border-b pb-1">Manage Subjects</h5>
                    <div class="subs-list"></div>
                    <button class="add-sub-btn mt-3 text-indigo-600 font-bold text-sm hover:underline"><i class="fas fa-plus-circle mr-1"></i> Add Subject</button>
                </div>
            </div>
        `;

        const subsList = div.querySelector('.subs-list');
        div.querySelector('.add-sub-btn').onclick = (e) => { e.stopPropagation(); createSubjectRow(subsList); };
        div.querySelector('.remove-class-btn').onclick = (e) => { e.stopPropagation(); div.remove(); };
        
        // Update label on type
        div.querySelector('.class-eng-name').oninput = (e) => {
            div.querySelector('.class-label-display').innerText = e.target.value + ' / ' + div.querySelector('.class-urdu-name').value;
        };
        div.querySelector('.class-urdu-name').oninput = (e) => {
            div.querySelector('.class-label-display').innerText = div.querySelector('.class-eng-name').value + ' / ' + e.target.value;
        };

        if (data.subjects.length > 0) {
            data.subjects.forEach(s => createSubjectRow(subsList, s));
        } else {
            createSubjectRow(subsList);
        }
        
        document.getElementById('class-list-container').appendChild(div);
    }

    document.getElementById('add-new-class-btn').onclick = () => createClassRow();

    // --- Data Handlers ---
    const configRef = doc(db, "settings", "academic_config");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('admin-active-year').value = d.activeYear || '';
        document.querySelectorAll('.month-card').forEach(card => {
            const idx = card.dataset.idx;
            card.querySelector('.sem1-days').value = d.monthDetails?.[idx]?.sem1 || 0;
            card.querySelector('.sem2-days').value = d.monthDetails?.[idx]?.sem2 || 0;
        });
        if (d.classes) d.classes.forEach(c => createClassRow({ eng: c.classNameEng, urdu: c.classNameUrdu, subjects: c.subjects }));
        calculateTotals();
    }

    document.getElementById('save-central-config').onclick = async () => {
        const monthDetails = {};
        document.querySelectorAll('.month-card').forEach(c => {
            monthDetails[c.dataset.idx] = {
                sem1: parseInt(c.querySelector('.sem1-days').value) || 0,
                sem2: parseInt(c.querySelector('.sem2-days').value) || 0
            };
        });

        const classes = [];
        document.querySelectorAll('.class-block').forEach(b => {
            const cEng = b.querySelector('.class-eng-name').value.trim();
            const cUrdu = b.querySelector('.class-urdu-name').value.trim();
            const subs = Array.from(b.querySelectorAll('.subject-row')).map(sr => ({
                eng: sr.querySelector('.sub-eng-name').value.trim(),
                urdu: sr.querySelector('.sub-urdu-name').value.trim()
            })).filter(s => s.eng || s.urdu);
            if (cEng || cUrdu) classes.push({ classNameEng: cEng, classNameUrdu: cUrdu, subjects: subs });
        });

        try {
            await setDoc(configRef, {
                activeYear: document.getElementById('admin-active-year').value,
                sem1TotalDays: parseInt(document.getElementById('admin-sem1-days').innerText),
                sem2TotalDays: parseInt(document.getElementById('admin-sem2-days').innerText),
                monthDetails, classes, lastUpdated: new Date()
            });
            alert("Configuration Saved!");
        } catch (e) { alert("Error: " + e.message); }
    };
}

// admin-academic-setup.js
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function initAcademicYearSetup(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-gray-50 p-4 rounded-xl shadow-inner border border-gray-200">
            <div class="flex flex-wrap justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border-l-4 border-indigo-600">
                <div>
                    <h3 class="text-lg font-extrabold text-indigo-900 uppercase tracking-tight">Academic Structure Setup</h3>
                    <p class="text-xs text-gray-500">Configure years, semesters, and bilingual classes.</p>
                </div>
                <div class="flex items-center gap-4 mt-2 md:mt-0">
                    <div class="text-right">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase">Active Year</label>
                        <input type="text" id="admin-active-year" placeholder="2025-26" class="p-1 border-b-2 border-indigo-200 focus:border-indigo-500 outline-none font-bold text-center w-24">
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div class="lg:col-span-1 bg-indigo-900 text-white p-4 rounded-xl shadow-lg flex flex-col justify-center">
                    <h4 class="text-xs font-bold opacity-70 mb-3 uppercase tracking-widest text-center">Total Working Days</h4>
                    <div class="flex justify-around items-center">
                        <div class="text-center">
                            <span class="block text-2xl font-black" id="admin-sem1-days">0</span>
                            <span class="text-[10px] opacity-60 uppercase font-bold">Semester 1</span>
                        </div>
                        <div class="h-10 w-px bg-indigo-700"></div>
                        <div class="text-center">
                            <span class="block text-2xl font-black" id="admin-sem2-days">0</span>
                            <span class="text-[10px] opacity-60 uppercase font-bold">Semester 2</span>
                        </div>
                    </div>
                </div>

                <div id="admin-months-config" class="lg:col-span-2 grid grid-cols-3 md:grid-cols-6 gap-2 bg-white p-3 rounded-xl border">
                    </div>
            </div>

            <div class="bg-white p-4 rounded-xl border shadow-sm">
                <div class="flex justify-between items-center mb-4 border-b pb-2">
                    <h4 class="font-bold text-gray-700 uppercase text-sm"><i class="fas fa-school mr-2 text-indigo-500"></i>Classes & Subjects</h4>
                    <button id="add-new-class-btn" class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-1 rounded-md text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">
                        <i class="fas fa-plus mr-1"></i> Add Class
                    </button>
                </div>
                
                <div id="class-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    </div>
            </div>

            <div class="mt-6">
                <button id="save-central-config" class="bg-green-600 hover:bg-green-700 text-white font-black py-3 px-8 rounded-xl w-full transition shadow-lg flex items-center justify-center gap-2">
                    <i class="fas fa-cloud-upload-alt"></i> SAVE GLOBAL CONFIGURATION
                </button>
            </div>
        </div>

        <style>
            .compact-input { @apply p-1 border rounded text-xs w-full text-center focus:ring-1 focus:ring-indigo-400 outline-none; }
            .font-urdu { font-family: 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif; }
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        </style>
    `;

    const months = [
        { name: "Apr", idx: 3 }, { name: "May", idx: 4 }, { name: "Jun", idx: 5 },
        { name: "Jul", idx: 6 }, { name: "Aug", idx: 7 }, { name: "Sep", idx: 8 },
        { name: "Oct", idx: 9 }, { name: "Nov", idx: 10 }, { name: "Dec", idx: 11 },
        { name: "Jan", idx: 0 }, { name: "Feb", idx: 1 }, { name: "Mar", idx: 2 }
    ];

    const monthsContainer = document.getElementById('admin-months-config');
    monthsContainer.innerHTML = months.map(m => `
        <div class="p-2 border rounded-md bg-gray-50 text-center month-card" data-idx="${m.idx}">
            <div class="text-[10px] font-bold text-indigo-900 mb-1 border-b">${m.name}</div>
            <div class="flex flex-col gap-1">
                <input type="number" placeholder="S1" class="sem1-days p-1 border rounded text-[10px] w-full text-center" title="Sem 1 Days">
                <input type="number" placeholder="S2" class="sem2-days p-1 border rounded text-[10px] w-full text-center" title="Sem 2 Days">
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

    const classContainer = document.getElementById('class-list-container');

    function createSubjectRow(listTarget, subData = { eng: '', urdu: '' }) {
        const div = document.createElement('div');
        div.className = "flex gap-1 mb-1 items-center subject-row group";
        div.innerHTML = `
            <input type="text" placeholder="Eng" class="sub-eng-name p-1 border rounded text-[11px] w-1/2" value="${subData.eng}">
            <input type="text" dir="rtl" placeholder="اردو" class="sub-urdu-name p-1 border rounded text-[11px] w-1/2 font-urdu" value="${subData.urdu}">
            <button class="remove-sub-btn text-gray-300 hover:text-red-500 px-1 text-[10px] transition-colors"><i class="fas fa-times"></i></button>
        `;
        div.querySelector('.remove-sub-btn').onclick = () => div.remove();
        listTarget.appendChild(div);
    }

    function createClassRow(classData = { eng: '', urdu: '', subjects: [] }) {
        const div = document.createElement('div');
        div.className = "bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 transition-all class-block flex flex-col h-64";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2 bg-indigo-50 p-2 rounded">
                <div class="flex-1 space-y-1">
                    <input type="text" placeholder="Class (Eng)" class="class-eng-name w-full p-1 border rounded text-xs font-bold" value="${classData.eng}">
                    <input type="text" dir="rtl" placeholder="درجہ (اردو)" class="class-urdu-name w-full p-1 border rounded text-xs font-bold font-urdu" value="${classData.urdu}">
                </div>
                <button class="remove-class-btn text-red-300 hover:text-red-600 ml-2 p-1"><i class="fas fa-trash-alt text-xs"></i></button>
            </div>
            
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-2 subs-list">
                </div>

            <button class="add-sub-btn w-full py-1 border-2 border-dashed border-gray-200 text-gray-400 rounded text-[10px] font-bold hover:border-indigo-300 hover:text-indigo-500 transition-all">
                <i class="fas fa-plus mr-1"></i> ADD SUBJECT
            </button>
        `;

        const subsList = div.querySelector('.subs-list');
        div.querySelector('.add-sub-btn').onclick = () => createSubjectRow(subsList);
        div.querySelector('.remove-class-btn').onclick = () => div.remove();
        
        if (classData.subjects.length > 0) {
            classData.subjects.forEach(s => createSubjectRow(subsList, s));
        } else {
            createSubjectRow(subsList);
        }
        
        classContainer.appendChild(div);
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

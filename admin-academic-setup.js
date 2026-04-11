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
                    <input type="text" id="admin-active-year" placeholder="e.g. 2025-2026" class="w-full p-2 border rounded font-bold text-center">
                </div>
                <div class="p-4 bg-indigo-50 rounded-lg text-center">
                    <label class="block text-sm font-bold mb-2">Semesters Total Days</label>
                    <div class="flex gap-4">
                        <div class="flex-1 bg-white p-2 border rounded">
                            <span class="text-xs text-gray-500 uppercase">Sem 1</span>
                            <div id="admin-sem1-days" class="text-xl font-black text-indigo-600">0</div>
                        </div>
                        <div class="flex-1 bg-white p-2 border rounded">
                            <span class="text-xs text-gray-500 uppercase">Sem 2</span>
                            <div id="admin-sem2-days" class="text-xl font-black text-indigo-600">0</div>
                        </div>
                    </div>
                </div>
            </div>

            <h4 class="font-bold text-gray-700 mb-4 border-l-4 border-indigo-500 pl-2">Configure Months (Split Semesters)</h4>
            <div id="admin-months-config" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8"></div>

            <div class="mt-8 p-6 bg-gray-50 rounded-xl border border-indigo-200">
                <h4 class="font-bold text-indigo-700 mb-4">Manage Classes & Subjects</h4>
                <div id="class-list-container" class="space-y-6 mb-6"></div>
                <button id="add-new-class-btn" class="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-indigo-700 transition">
                    <i class="fas fa-plus mr-1"></i> Add New Class
                </button>
            </div>

            <button id="save-central-config" class="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg w-full transition shadow-lg text-lg">
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
    monthsContainer.innerHTML = months.map(m => `
        <div class="p-3 border rounded-lg bg-white shadow-sm month-card" data-idx="${m.idx}">
            <label class="block text-sm font-bold text-indigo-900 mb-2 border-b">${m.name}</label>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <span class="text-[10px] text-gray-500 font-bold">SEM 1 DAYS</span>
                    <input type="number" class="sem1-days w-full p-1 border rounded text-sm text-center" value="0">
                </div>
                <div>
                    <span class="text-[10px] text-gray-500 font-bold">SEM 2 DAYS</span>
                    <input type="number" class="sem2-days w-full p-1 border rounded text-sm text-center" value="0">
                </div>
            </div>
        </div>
    `).join('');

    function calculateTotals() {
        let sem1Sum = 0, sem2Sum = 0;
        document.querySelectorAll('.month-card').forEach(card => {
            sem1Sum += parseInt(card.querySelector('.sem1-days').value) || 0;
            sem2Sum += parseInt(card.querySelector('.sem2-days').value) || 0;
        });
        document.getElementById('admin-sem1-days').innerText = sem1Sum;
        document.getElementById('admin-sem2-days').innerText = sem2Sum;
    }

    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('sem1-days') || e.target.classList.contains('sem2-days')) {
            calculateTotals();
        }
    });

    const classContainer = document.getElementById('class-list-container');

    function createSubjectRow(parentContainer, subData = { eng: '', urdu: '' }) {
        const div = document.createElement('div');
        div.className = "flex gap-2 mb-2 bg-gray-50 p-2 rounded border border-dashed subject-row";
        div.innerHTML = `
            <input type="text" placeholder="English Name" class="sub-eng-name p-2 border rounded w-1/2 text-sm" value="${subData.eng}">
            <input type="text" dir="rtl" placeholder="Urdu Name" class="sub-urdu-name p-2 border rounded w-1/2 text-sm font-urdu" value="${subData.urdu}">
            <button class="remove-sub-btn text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>
        `;
        div.querySelector('.remove-sub-btn').onclick = () => div.remove();
        parentContainer.appendChild(div);
    }

    function createClassRow(classData = { eng: '', urdu: '', subjects: [] }) {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-lg border-2 border-indigo-50 class-block relative shadow-sm";
        div.innerHTML = `
            <button class="remove-class-btn absolute top-2 right-2 text-red-500 hover:bg-red-50 p-2 rounded-full"><i class="fas fa-trash-alt"></i></button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="text-xs font-bold text-gray-500">CLASS NAME (ENG)</label>
                    <input type="text" placeholder="e.g. Class 1" class="class-eng-name w-full p-2 border rounded font-bold" value="${classData.eng}">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-500">CLASS NAME (URDU)</label>
                    <input type="text" dir="rtl" placeholder="مثلاً اول" class="class-urdu-name w-full p-2 border rounded font-bold" value="${classData.urdu}">
                </div>
            </div>
            <div class="subjects-wrapper ml-4">
                <label class="text-xs font-bold text-indigo-600 block mb-2 underline">SUBJECTS LIST</label>
                <div class="subs-list"></div>
                <button class="add-sub-btn mt-2 text-indigo-600 text-xs font-bold hover:underline"><i class="fas fa-plus-circle"></i> Add Subject</button>
            </div>
        `;

        const subsList = div.querySelector('.subs-list');
        div.querySelector('.add-sub-btn').onclick = () => createSubjectRow(subsList);
        div.querySelector('.remove-class-btn').onclick = () => div.remove();
        
        if (classData.subjects.length > 0) {
            classData.subjects.forEach(s => createSubjectRow(subsList, s));
        } else {
            createSubjectRow(subsList); // Default one row
        }
        
        classContainer.appendChild(div);
    }

    document.getElementById('add-new-class-btn').onclick = () => createClassRow();

    // --- Loading & Saving Logic remains similar but with updated structure ---
    const configRef = doc(db, "settings", "academic_config");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById('admin-active-year').value = data.activeYear || '';
        document.querySelectorAll('.month-card').forEach(card => {
            const idx = card.dataset.idx;
            card.querySelector('.sem1-days').value = data.monthDetails?.[idx]?.sem1 || 0;
            card.querySelector('.sem2-days').value = data.monthDetails?.[idx]?.sem2 || 0;
        });
        if (data.classes) {
            data.classes.forEach(c => createClassRow({ eng: c.classNameEng, urdu: c.classNameUrdu, subjects: c.subjects }));
        }
        calculateTotals();
    }

    document.getElementById('save-central-config').onclick = async () => {
        const activeYear = document.getElementById('admin-active-year').value;
        const monthDetails = {};
        document.querySelectorAll('.month-card').forEach(card => {
            monthDetails[card.dataset.idx] = {
                sem1: parseInt(card.querySelector('.sem1-days').value) || 0,
                sem2: parseInt(card.querySelector('.sem2-days').value) || 0
            };
        });

        const classes = [];
        document.querySelectorAll('.class-block').forEach(block => {
            const classNameEng = block.querySelector('.class-eng-name').value.trim();
            const classNameUrdu = block.querySelector('.class-urdu-name').value.trim();
            const subjects = [];
            block.querySelectorAll('.subject-row').forEach(sRow => {
                const eng = sRow.querySelector('.sub-eng-name').value.trim();
                const urdu = sRow.querySelector('.sub-urdu-name').value.trim();
                if (eng || urdu) subjects.push({ eng, urdu });
            });
            if (classNameEng || classNameUrdu) classes.push({ classNameEng, classNameUrdu, subjects });
        });

        try {
            await setDoc(configRef, {
                activeYear,
                sem1TotalDays: parseInt(document.getElementById('admin-sem1-days').innerText),
                sem2TotalDays: parseInt(document.getElementById('admin-sem2-days').innerText),
                monthDetails,
                classes,
                lastUpdated: new Date()
            });
            alert("Structure saved successfully!");
        } catch (e) { alert("Error: " + e.message); }
    };
}

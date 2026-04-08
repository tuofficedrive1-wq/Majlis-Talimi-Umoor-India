/**
 * Monthly Performance Module - Teacher & Period Management
 */

import { 
    doc, 
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
                        <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 transition-all">
                            <span>${jamia}</span>
                            <i class="fas fa-chevron-down transition-transform"></i>
                        </button>
                        <div class="jamia-content hidden p-6 border-t border-slate-100 space-y-6">
                            <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 mb-6">
                                <h4 class="text-sm font-bold text-indigo-600 uppercase mb-4 flex items-center gap-2">
                                    <i class="fas fa-user-plus"></i> Register New Teacher
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="form-${jamia.replace(/\s+/g, '')}">
                                    <input type="text" id="name-${jamia.replace(/\s+/g, '')}" placeholder="Name Of Teacher" class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="text" id="ajeer-${jamia.replace(/\s+/g, '')}" placeholder="Ajeer Code (Login Code)" class="p-2.5 border rounded-xl text-sm font-bold" maxlength="6">
                                    <input type="text" id="contact-${jamia.replace(/\s+/g, '')}" placeholder="Contact No." class="p-2.5 border rounded-xl text-sm outline-none">

<input type="text" id="level-${jamia.replace(/\s+/g, '')}" placeholder="Level Qualified" class="p-2.5 border rounded-xl text-sm outline-none">
<input type="text" id="h-qual-${jamia.replace(/\s+/g, '')}" placeholder="Highest Qualification" class="p-2.5 border rounded-xl text-sm outline-none">
<input type="email" id="mail-${jamia.replace(/\s+/g, '')}" placeholder="Mail ID" class="p-2.5 border rounded-xl text-sm outline-none">

<input type="text" id="exp-${jamia.replace(/\s+/g, '')}" placeholder="Experience in Jamiatul Madina" class="p-2.5 border rounded-xl text-sm outline-none">
<input type="text" id="spec-${jamia.replace(/\s+/g, '')}" placeholder="Subject Specialization" class="p-2.5 border rounded-xl text-sm outline-none">
<input type="text" id="t-period-${jamia.replace(/\s+/g, '')}" placeholder="Total Teaching Period" class="p-2.5 border rounded-xl text-sm outline-none">

<input type="text" id="ijara-${jamia.replace(/\s+/g, '')}" placeholder="Ijara Status" class="p-2.5 border rounded-xl text-sm outline-none">
                                </div>
                                <button class="save-teacher-btn w-full mt-4 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all" data-jamia-name="${jamia}">Save Teacher</button>
                            </div>
                            <div class="teacher-list-area space-y-4" id="list-${jamia.replace(/\s+/g, '')}"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        setupStructureEvents(contentArea, db, currentUser);
        loadAllTeachers(assignedJamiaat, db, currentUser);
    } else {
        contentArea.innerHTML = `<p class="p-10 text-center text-slate-400">Section: ${tabName.toUpperCase()}</p>`;
    }
};

const setupStructureEvents = (container, db, currentUser) => {
    // Jamia Toggle
    container.querySelectorAll('.jamia-toggle').forEach(btn => {
        btn.onclick = () => {
            const content = btn.nextElementSibling;
            btn.querySelector('i').classList.toggle('rotate-180');
            content.classList.toggle('hidden');
        };
    });

    // Save Teacher Profile
    container.querySelectorAll('.save-teacher-btn').forEach(btn => {
        btn.onclick = async () => {
            const jamiaName = btn.dataset.jamiaName;
            const safeId = jamiaName.replace(/\s+/g, '');
            const name = document.getElementById(`name-${safeId}`).value.trim();
            const ajeer = document.getElementById(`ajeer-${safeId}`).value.trim();
                        const contact = document.getElementById(`contact-${safeId}`).value.trim();
const level = document.getElementById(`level-${safeId}`).value.trim();
const hQual = document.getElementById(`h-qual-${safeId}`).value.trim();
const mail = document.getElementById(`mail-${safeId}`).value.trim();
const exp = document.getElementById(`exp-${safeId}`).value.trim();
const spec = document.getElementById(`spec-${safeId}`).value.trim();
const tPeriod = document.getElementById(`t-period-${safeId}`).value.trim();
const ijara = document.getElementById(`ijara-${safeId}`).value.trim();

            if (!name || !ajeer) return alert("Fill Name and Ajeer Code.");

            btn.disabled = true;
            try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    let academicYears = userSnap.data().academicYears || {};
    const activeYear = "2025-2026"; 
    
    if (!academicYears[activeYear]) academicYears[activeYear] = { karkardagiStructure: [] };
    let structure = academicYears[activeYear].karkardagiStructure;
    let jamiaData = structure.find(j => j.jamiaName === jamiaName);
    
    if (!jamiaData) {
        jamiaData = { jamiaName: jamiaName, teachers: [] };
        structure.push(jamiaData);
    }

    // Aapne jo variables upar banaye hain, unhe yahan map karein
    const newTeacher = {
        id: `t-${Date.now()}`,
        name: name,
        loginCode: ajeer,
        contact: contact,
        levelQualified: level,       // Aapka variable
        highestQualification: hQual, // Aapka variable
        mailId: mail,               // Aapka variable
        experience: exp,            // Aapka variable
        specialization: spec,       // Aapka variable
        teachingPeriod: tPeriod,    // Aapka variable
        ijaraStatus: ijara,         // Aapka variable
        periods: []                 // Khali array periods ke liye
    };

    jamiaData.teachers.push(newTeacher);
    await updateDoc(userRef, { academicYears: academicYears });
    
    alert("Full Teacher Profile Saved!");
    
    // Inputs clear karne ke liye
    document.querySelectorAll(`#form-${safeId} input`).forEach(inp => inp.value = "");
    loadAllTeachers([jamiaName], db, currentUser);

} catch (e) {
    alert("Error saving: " + e.message);
} finally {
    btn.disabled = false;
}
        };
    });
};

const loadAllTeachers = async (jamiaat, db, currentUser) => {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const academicYears = userSnap.data().academicYears || {};
    const structure = academicYears["2025-2026"]?.karkardagiStructure || [];

    jamiaat.forEach(jamia => {
        const safeId = jamia.replace(/\s+/g, '');
        const listDiv = document.getElementById(`list-${safeId}`);
        const jamiaData = structure.find(j => j.jamiaName === jamia);

        if (!jamiaData || !jamiaData.teachers) return listDiv.innerHTML = "";

        listDiv.innerHTML = jamiaData.teachers.map(t => `
            <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 transition-all hover:border-indigo-400">
                <div class="teacher-toggle flex justify-between items-center p-4 cursor-pointer" data-teacher-id="${t.id}" data-jamia-name="${jamia}">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-800">${t.name}</span>
                        <div class="flex gap-2 mt-1">
                            <span class="text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded font-mono font-bold uppercase">CODE: ${t.loginCode}</span>
                            <span class="text-[9px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase">${t.teachingSubject || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button class="edit-t-btn text-indigo-500 hover:text-indigo-700 transition-all" title="Edit Teacher"><i class="fas fa-edit"></i></button>
                        <button class="del-t-btn text-red-500 hover:text-red-700 transition-all" title="Delete Teacher"><i class="fas fa-trash-alt"></i></button>
                        <i class="fas fa-chevron-down text-slate-400 ml-2 transition-transform"></i>
                    </div>
                </div>

                <div class="period-container hidden p-5 bg-white border-t border-slate-100 space-y-4">
                    <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <h5 class="text-xs font-bold text-emerald-600 uppercase mb-3"><i class="fas fa-plus-circle"></i> Add Teaching Period</h5>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input type="text" placeholder="Class" class="p-class p-2 border rounded-lg text-sm outline-none">
                            <input type="text" placeholder="Book Name" class="p-book p-2 border rounded-lg text-sm outline-none">
                            <select class="p-sem p-2 border rounded-lg text-sm bg-white outline-none">
                                <option value="1">Semester 1</option>
                                <option value="2">Semester 2</option>
                            </select>
                            <input type="number" placeholder="Total Pages" class="p-pages p-2 border rounded-lg text-sm outline-none">
                        </div>
                        <button class="save-period-btn w-full mt-3 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all" data-teacher-id="${t.id}" data-jamia-name="${jamia}">Add Period</button>
                    </div>
                    <div class="period-list-table overflow-x-auto">
                        <table class="w-full text-[11px] border-collapse">
                            <thead><tr class="bg-slate-50 text-slate-500 uppercase"><th class="p-2 border">Class</th><th class="p-2 border">Book</th><th class="p-2 border">Sem</th><th class="p-2 border">Total Pages</th><th class="p-2 border">Action</th></tr></thead>
                            <tbody class="text-slate-700">${(t.periods || []).map(p => `<tr class="border-b"><td class="p-2 border">${p.className}</td><td class="p-2 border">${p.bookName}</td><td class="p-2 border text-center">${p.semester}</td><td class="p-2 border text-center font-bold">${p.totalPages}</td><td class="p-2 border text-center"><button class="text-red-400 hover:text-red-600 del-p-btn" data-p-id="${p.id}" data-t-id="${t.id}" data-jamia-name="${jamia}"><i class="fas fa-times"></i></button></td></tr>`).join('')}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `).join('');

        // Attach Dynamic Events
        attachTeacherEvents(listDiv, db, currentUser, jamiaat);
    });
};

const attachTeacherEvents = (container, db, currentUser, jamiaat) => {
    // Dropdown Toggle (Teacher Name par click karne se)
    container.querySelectorAll('.teacher-toggle').forEach(toggle => {
        toggle.onclick = (e) => {
            if (e.target.closest('button')) return; // Edit/Del button click par dropdown na khule
            const content = toggle.nextElementSibling;
            toggle.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
            content.classList.toggle('hidden');
        };
    });

    // Delete Teacher Functionality
    container.querySelectorAll('.del-t-btn').forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Are you sure you want to delete this teacher?")) return;
            const tid = btn.closest('.teacher-toggle').dataset.teacherId;
            const jamiaName = btn.closest('.teacher-toggle').dataset.jamiaName;
            await updateTeacherData(db, currentUser, jamiaName, (teachers) => teachers.filter(t => t.id !== tid));
            loadAllTeachers(jamiaat, db, currentUser);
        };
    });

    // Save Period Functionality
    container.querySelectorAll('.save-period-btn').forEach(btn => {
        btn.onclick = async () => {
            const tid = btn.dataset.teacherId;
            const jamiaName = btn.dataset.jamiaName;
            const parent = btn.closest('.period-container');
            const className = parent.querySelector('.p-class').value;
            const bookName = parent.querySelector('.p-book').value;
            const semester = parent.querySelector('.p-sem').value;
            const totalPages = parent.querySelector('.p-pages').value;

            if (!className || !bookName || !totalPages) return alert("Fill all period details.");

            const newPeriod = { id: `p-${Date.now()}`, className, bookName, semester, totalPages: parseInt(totalPages) };
            await updateTeacherData(db, currentUser, jamiaName, (teachers) => {
                const t = teachers.find(t => t.id === tid);
                if (t) { if (!t.periods) t.periods = []; t.periods.push(newPeriod); }
                return teachers;
            });
            loadAllTeachers(jamiaat, db, currentUser);
        };
    });
};

// Helper to Update Structure in Firestore
async function updateTeacherData(db, currentUser, jamiaName, updateFn) {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    let academicYears = userSnap.data().academicYears || {};
    let structure = academicYears["2025-2026"].karkardagiStructure;
    let jamiaData = structure.find(j => j.jamiaName === jamiaName);
    if (jamiaData) { jamiaData.teachers = updateFn(jamiaData.teachers); await updateDoc(userRef, { academicYears }); }
}

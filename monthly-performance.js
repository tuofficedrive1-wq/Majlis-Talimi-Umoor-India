/**
 * Monthly Performance Module
 * Combined: Performance View, Structure Management (Full Profile), and Periods logic.
 */

import { 
    doc, 
    getDoc,
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Status Style Helper
const getStatusStyles = (status) => {
    if (status === 'Mumtaz') return 'text-emerald-600 font-black';
    if (status === 'Behtar') return 'text-blue-600 font-bold';
    return 'text-red-600 font-bold';
};

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
        <div id="sub-tab-content" class="space-y-6"></div>
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
    
    if (tabName === 'performance') {
        // --- PROFESSIONAL PERFORMANCE TABLE ---
        const reportMonth = document.getElementById('report-month').value;
        contentArea.innerHTML = `
            <div class="overflow-x-auto border border-slate-200 rounded-3xl shadow-sm bg-white">
                <table class="w-full text-left border-collapse min-w-[1000px]">
                    <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase font-black tracking-wider">
                        <tr>
                            <th class="p-4 border-b">Teacher</th>
                            <th class="p-4 border-b">Class</th>
                            <th class="p-4 border-b">Book</th>
                            <th class="p-4 border-b">Last Lesson</th>
                            <th class="p-4 border-b text-center">Pg No.</th>
                            <th class="p-4 border-b text-center">Total Pgs</th>
                            <th class="p-4 border-b text-center">Cumulative</th>
                            <th class="p-4 border-b text-center">Target</th>
                            <th class="p-4 border-b text-center">Monthly</th>
                            <th class="p-4 border-b text-center">Achv %</th>
                            <th class="p-4 border-b text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody id="performance-table-body"></tbody>
                </table>
            </div>
        `;
        loadPerformanceTable(assignedJamiaat, db, currentUser);

    } else if (tabName === 'structure') {
        // --- FULL STRUCTURE MANAGEMENT ---
        contentArea.innerHTML = `
            <div id="structure-accordion" class="space-y-4">
                ${assignedJamiaat.map(jamia => `
                    <div class="border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm" data-jamia="${jamia}">
                        <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">
                            <span>${jamia}</span>
                            <i class="fas fa-chevron-down transition-transform"></i>
                        </button>
                        <div class="jamia-content hidden p-6 border-t border-slate-100 space-y-6">
                            <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                                <h4 class="text-sm font-bold text-indigo-600 uppercase mb-4">Register New Teacher Profile</h4>
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
                                <button class="save-teacher-btn w-full mt-4 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700">Save Teacher Profile</button>
                            </div>
                            <div class="teacher-list-area space-y-4" id="list-${jamia.replace(/\s+/g, '')}"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        setupStructureEvents(contentArea, db, currentUser, assignedJamiaat);
        loadAllTeachers(assignedJamiaat, db, currentUser);
    }
};

const loadPerformanceTable = async (jamiaat, db, currentUser) => {
    const tbody = document.getElementById('performance-table-body');
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (!userSnap.exists()) return;

    const structure = userSnap.data().academicYears?.["2025-2026"]?.karkardagiStructure || [];
    let html = "";

    jamiaat.forEach(jamiaName => {
        const jamiaData = structure.find(j => j.jamiaName === jamiaName);
        if (!jamiaData || !jamiaData.teachers) return;

        html += `<tr class="bg-indigo-50 font-bold"><td colspan="11" class="p-4 border-y border-indigo-100 text-indigo-700">${jamiaName}</td></tr>`;

        jamiaData.teachers.forEach(teacher => {
            const periods = teacher.periods || [];
            periods.forEach((p, idx) => {
                html += `
                    <tr class="border-b border-slate-100">
                        ${idx === 0 ? `<td rowspan="${periods.length}" class="p-4 font-bold text-slate-800 bg-slate-50/50 align-top">${teacher.name}</td>` : ''}
                        <td class="p-4 text-slate-600 font-medium">${p.className}</td>
                        <td class="p-4 text-slate-600 font-medium">${p.bookName}</td>
                        <td class="p-4 text-slate-400 italic text-xs">-</td>
                        <td class="p-4 text-center">0</td>
                        <td class="p-4 text-center font-bold text-slate-400">${p.totalPages}</td>
                        <td class="p-4 text-center font-black text-indigo-600">0</td>
                        <td class="p-4 text-center">0</td>
                        <td class="p-4 text-center"><input type="number" class="w-16 p-1 border rounded text-center" value="0" disabled></td>
                        <td class="p-4 text-center">0%</td>
                        <td class="p-4 text-center uppercase text-[10px]">Pending</td>
                    </tr>`;
            });
        });
    });
    
    tbody.innerHTML = html || '<tr><td colspan="11" class="p-10 text-center text-slate-400">No records found.</td></tr>';
};

const setupStructureEvents = (container, db, currentUser, assignedJamiaat) => {
    // 1. Jamia Accordion Toggle
    container.querySelectorAll('.jamia-toggle').forEach(btn => {
        btn.onclick = () => {
            btn.nextElementSibling.classList.toggle('hidden');
            btn.querySelector('i').classList.toggle('rotate-180');
        };
    });

    // 2. Edit Teacher Button Logic (Fill Form)
    container.querySelectorAll('.edit-t-btn').forEach(btn => {
        btn.onclick = async () => {
            const tid = btn.dataset.tid;
            const jamiaName = btn.dataset.jamia;
            const safeId = jamiaName.replace(/\s+/g, '');
            
            try {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                const structure = userSnap.data().academicYears["2025-2026"].karkardagiStructure;
                const jamiaData = structure.find(j => j.jamiaName === jamiaName);
                const teacher = jamiaData.teachers.find(t => t.id === tid);

                if (teacher) {
                    // Form fields ko purane data se bharna
                    document.getElementById(`name-${safeId}`).value = teacher.name || "";
                    document.getElementById(`ajeer-${safeId}`).value = teacher.loginCode || "";
                    document.getElementById(`contact-${safeId}`).value = teacher.contact || "";
                    document.getElementById(`level-${safeId}`).value = teacher.levelQualified || "";
                    document.getElementById(`h-qual-${safeId}`).value = teacher.highestQualification || "";
                    document.getElementById(`mail-${safeId}`).value = teacher.mailId || "";
                    document.getElementById(`exp-${safeId}`).value = teacher.experience || "";
                    document.getElementById(`spec-${safeId}`).value = teacher.specialization || "";
                    document.getElementById(`t-period-${safeId}`).value = teacher.teachingPeriod || "";
                    document.getElementById(`ijara-${safeId}`).value = teacher.ijaraStatus || "";

                    // Save button ko Update mode mein set karna
                    const saveBtn = container.querySelector(`button[data-jamia-name="${jamiaName}"]`);
                    saveBtn.innerText = "Update Teacher Profile";
                    saveBtn.dataset.editMode = tid; // ID store karna
                    
                    // Form tak scroll karna
                    document.getElementById(`name-${safeId}`).focus();
                }
            } catch (err) { console.error("Edit error:", err); }
        };
    });

    // 3. Save/Update Teacher Button
    container.querySelectorAll('.save-teacher-btn').forEach(btn => {
        btn.onclick = async () => {
            const jamiaName = btn.dataset.jamiaName;
            const safeId = jamiaName.replace(/\s+/g, '');
            const editId = btn.dataset.editMode; // Check if in Edit Mode
            
            // Capture all fields
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

            if (!name || !ajeer) return alert("Name and Ajeer Code are required.");

            btn.disabled = true;
            try {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                let academicYears = userSnap.data().academicYears || {};
                const activeYear = "2025-2026"; 
                if (!academicYears[activeYear]) academicYears[activeYear] = { karkardagiStructure: [] };
                
                let structure = academicYears[activeYear].karkardagiStructure;
                let jamiaData = structure.find(j => j.jamiaName === jamiaName);
                if (!jamiaData) { jamiaData = { jamiaName, teachers: [] }; structure.push(jamiaData); }

                if (editId) {
                    // UPDATE LOGIC: Purane teacher ko dhoond kar data badalna
                    const idx = jamiaData.teachers.findIndex(t => t.id === editId);
                    if (idx > -1) {
                        jamiaData.teachers[idx] = {
                            ...jamiaData.teachers[idx], // Periods aur ID ko wahi rehne dein
                            name, loginCode: ajeer, contact, levelQualified: level,
                            highestQualification: hQual, mailId: mail, experience: exp,
                            specialization: spec, teachingPeriod: tPeriod, ijaraStatus: ijara
                        };
                    }
                    delete btn.dataset.editMode;
                    btn.innerText = "Save Teacher Profile";
                } else {
                    // NEW TEACHER LOGIC
                    const newTeacher = {
                        id: `t-${Date.now()}`, name, loginCode: ajeer, contact, levelQualified: level,
                        highestQualification: hQual, mailId: mail, experience: exp, specialization: spec,
                        teachingPeriod: tPeriod, ijaraStatus: ijara, periods: []
                    };
                    jamiaData.teachers.push(newTeacher);
                }

                await updateDoc(userRef, { academicYears });
                alert(editId ? "Teacher Updated!" : "Teacher Saved!");
                
                // Form clear karein
                document.querySelectorAll(`#form-${safeId} input`).forEach(inp => inp.value = "");
                loadAllTeachers(assignedJamiaat, db, currentUser);
            } catch (e) { alert("Error: " + e.message); }
            btn.disabled = false;
        };
    });
};
const loadAllTeachers = async (jamiaat, db, currentUser) => {
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        const structure = userSnap.data().academicYears?.["2025-2026"]?.karkardagiStructure || [];
        jamiaat.forEach(jamia => {
            const listDiv = document.getElementById(`list-${jamia.replace(/\s+/g, '')}`);
            const jamiaData = structure.find(j => j.jamiaName === jamia);
            if (!listDiv || !jamiaData) return;

           listDiv.innerHTML = jamiaData.teachers.map(t => `
    <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 mb-4">
        <div class="teacher-toggle flex justify-between items-center p-4 cursor-pointer bg-white" data-tid="${t.id}" data-jamia="${jamia}">
            <div class="flex flex-col">
                <span class="font-bold text-slate-800">${t.name}</span>
                <span class="text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded w-fit mt-1">CODE: ${t.loginCode}</span>
            </div>
            
            <div class="flex items-center gap-3">
                <button class="edit-t-btn text-indigo-500 hover:text-indigo-700 p-2" 
                        data-tid="${t.id}" data-jamia="${jamia}" title="Edit Teacher">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="del-t-btn text-red-500 hover:text-red-700 p-2" 
                        data-tid="${t.id}" data-jamia="${jamia}">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <i class="fas fa-chevron-down text-slate-400 transition-transform"></i>
            </div>
        </div>

        <div class="period-container hidden p-5 bg-white border-t border-slate-100 space-y-4">
            <div class="overflow-x-auto">
                <table class="w-full text-[10px] border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-400 uppercase font-black">
                            <th class="p-2 border">Class</th>
                            <th class="p-4 border">Book</th>
                            <th class="p-2 border">Sem</th>
                            <th class="p-2 border">Pages</th>
                            <th class="p-2 border">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(t.periods || []).map(p => `
                            <tr class="border-b">
                                <td class="p-2 border font-medium">${p.className}</td>
                                <td class="p-2 border font-medium">${p.bookName}</td>
                                <td class="p-2 border text-center font-bold text-blue-600">${p.semester}</td>
                                <td class="p-2 border text-center font-black">${p.totalPages}</td>
                                <td class="p-2 border text-center">
                                    <button class="del-period-btn text-red-500" data-pid="${p.id}" data-tid="${t.id}" data-jamia="${jamia}">
                                        <i class="fas fa-times-circle"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>`).join('');
                       
            attachTeacherEvents(listDiv, db, currentUser, jamiaat);
        });
    } catch (e) { console.error(e); }
};

const attachTeacherEvents = (container, db, currentUser, jamiaat) => {
    // 1. Dropdown Toggle logic
    container.querySelectorAll('.teacher-toggle').forEach(toggle => {
        toggle.onclick = (e) => {
            if (e.target.closest('button')) return;
            toggle.nextElementSibling.classList.toggle('hidden');
            toggle.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
        };
    });

    // 2. Delete Teacher logic
    container.querySelectorAll('.del-t-btn').forEach(btn => {
        btn.onclick = async () => {
            const tid = btn.closest('.teacher-toggle').dataset.id;
            const jamiaName = btn.closest('.teacher-toggle').dataset.jamia;
            if (!confirm("Delete this teacher?")) return;
            await updateTeacherData(db, currentUser, jamiaName, (teachers) => teachers.filter(t => t.id !== tid));
            loadAllTeachers(jamiaat, db, currentUser);
        };
    });

    // 3. Add Period logic (Updated)
    container.querySelectorAll('.save-period-btn').forEach(btn => {
        btn.onclick = async () => {
            const panel = btn.closest('.period-container'); // Corrected Class Name
            const tid = btn.dataset.tid; // Corrected ID Fetching
            const jamiaName = btn.dataset.jamia;
            
            const className = panel.querySelector('.p-class').value;
            const bookName = panel.querySelector('.p-book').value;
            const semester = panel.querySelector('.p-sem').value;
            const totalPages = panel.querySelector('.p-pages').value;

            if (!className || !bookName || !totalPages) {
                alert("Meharbani karke saari details bharein.");
                return;
            }

            const newPeriod = { 
                id: `p-${Date.now()}`, 
                className, 
                bookName, 
                semester, 
                totalPages: parseInt(totalPages) 
            };
            
            await updateTeacherData(db, currentUser, jamiaName, (teachers) => {
                const t = teachers.find(teach => teach.id === tid);
                if (t) { 
                    if (!t.periods) t.periods = []; 
                    t.periods.push(newPeriod); 
                }
                return teachers;
                
            });
            
            loadAllTeachers(jamiaat, db, currentUser);
        };
    });
    // Edit Teacher Logic
container.querySelectorAll('.save-period-btn').forEach(btn => {
    btn.onclick = async () => {
        const panel = btn.closest('.period-container'); 
        const tid = btn.dataset.tid; 
        const jamiaName = btn.dataset.jamia;
        
        const className = panel.querySelector('.p-class').value;
        const bookName = panel.querySelector('.p-book').value;
        const semester = panel.querySelector('.p-sem').value;
        const totalPages = panel.querySelector('.p-pages').value;

        if (!className || !bookName || !totalPages) {
            alert("Meharbani karke saari details bharein.");
            return;
        }

        const newPeriod = { 
            id: `p-${Date.now()}`, 
            className, 
            bookName, 
            semester, 
            totalPages: parseInt(totalPages) 
        };
        
        // Firestore mein sirf period push karein
        await updateTeacherData(db, currentUser, jamiaName, (teachers) => {
            const t = teachers.find(teach => teach.id === tid);
            if (t) { 
                if (!t.periods) t.periods = []; 
                t.periods.push(newPeriod); 
            }
            return teachers;
        });
        
        loadAllTeachers(jamiaat, db, currentUser);
    };
});
};

async function updateTeacherData(db, currentUser, jamiaName, updateFn) {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    let academicYears = userSnap.data().academicYears || {};
    let structure = academicYears["2025-2026"].karkardagiStructure;
    let jamiaData = structure.find(j => j.jamiaName === jamiaName);
    if (jamiaData) { jamiaData.teachers = updateFn(jamiaData.teachers); await updateDoc(userRef, { academicYears }); }
}

window.openPerformanceForm = (id, name) => {
    const month = document.getElementById('report-month').value;
    const url = `academic-monthly-performance.html?jamiaId=${id}&jamiaName=${encodeURIComponent(name)}&month=${month}`;
    window.open(url, '_blank');
};

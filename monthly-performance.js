import { 
    doc, 
    getDoc,
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let academicConfig = null;

// Academic Admin ki settings fetch karne ka function
async function getAcademicConfig(db) {
    if (academicConfig) return academicConfig;
    const snap = await getDoc(doc(db, "settings", "academic_calendar")); 
    if (snap.exists()) {
        academicConfig = snap.data();
        return academicConfig;
    }
    return null;
}

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
    
    // monthly-performance.js ke renderSubTabContent mein jahan 'performance' tab ka HTML hai:

if (tabName === 'performance') {
    contentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-4 bg-white p-4 rounded-2xl border shadow-sm gap-4">
            <h3 class="font-bold text-slate-700">Monthly Targets & Performance</h3>
            <div class="flex items-center gap-2">
                <label class="text-xs font-bold text-slate-500">SELECT MONTH:</label>
                <select id="report-month" class="p-2 border rounded-xl text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200">
                    <option value="3">April</option><option value="4">May</option><option value="5">June</option>
                    <option value="6">July</option><option value="7">August</option><option value="8">September</option>
                    <option value="9">October</option><option value="10">November</option><option value="11">December</option>
                    <option value="0">January</option><option value="1">February</option><option value="2">March</option>
                </select>
            </div>
        </div>
        <div class="overflow-x-auto border border-slate-200 rounded-3xl shadow-sm bg-white" id="performance-table-container">
            <table class="w-full text-left border-collapse min-w-[1100px]">
                <thead class="bg-slate-50 text-slate-500 text-[10px] uppercase font-black">
        <tr>
            <th class="p-3 border-b">Teacher / Class / Book</th>
            <th class="p-3 border-b text-center">Total Pgs</th>
            <th class="p-3 border-b text-center">Month Target</th>
            <th class="p-3 border-b text-center">Achieved</th>
            <th class="p-3 border-b text-center">%</th>
            <th class="p-3 border-b text-center">Kaifiyat</th>
            <th class="p-3 border-b text-center">Action</th>
        </tr>
    </thead>
                <tbody id="performance-table-body"></tbody>
            </table>
        </div>
        <div class="mt-6 flex justify-end">
            <button id="save-performance-btn" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition hidden">
                <i class="fas fa-save mr-2"></i> Save Performance Changes
            </button>
        </div>
    `;
    document.getElementById('report-month').onchange = () => loadPerformanceTable(assignedJamiaat, db, currentUser);
    loadPerformanceTable(assignedJamiaat, db, currentUser);
} else if (tabName === 'structure') {
        const config = await getAcademicConfig(db);
        const activeYearByAdmin = config ? config.activeYear : "2026-2027";

        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const academicYearsData = userSnap.data().academicYears || {};
        const allYears = Object.keys(academicYearsData);
        if (!allYears.includes(activeYearByAdmin)) allYears.push(activeYearByAdmin);

        contentArea.innerHTML = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 mb-6 shadow-sm flex justify-between items-center">
                <div>
                    <h4 class="text-sm font-black text-slate-700 uppercase">Academic Year Selection</h4>
                    <p class="text-[10px] text-slate-400 font-bold italic">Saal badal kar purana data dekhein</p>
                </div>
                <select id="structure-year-select" class="p-2 border-2 border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 outline-none">
                    ${allYears.map(yr => `<option value="${yr}" ${yr === activeYearByAdmin ? 'selected' : ''}>${yr}${yr === activeYearByAdmin ? ' (Active)' : ''}</option>`).join('')}
                </select>
            </div>
            <div id="structure-display-area" class="space-y-4"></div>
        `;

        const updateStructureView = (selectedYear) => {
            const displayArea = document.getElementById('structure-display-area');
            if (!displayArea) return;

            displayArea.innerHTML = assignedJamiaat.map(jamia => `
                <div class="border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm mb-4">
                    <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">
                        <span>${jamia}</span><i class="fas fa-chevron-down transition-transform"></i>
                    </button>
                    <div class="jamia-content hidden p-6 border-t border-slate-100 space-y-6">
                        <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                            <h4 class="text-sm font-bold text-indigo-600 uppercase mb-4 flex items-center gap-2"><i class="fas fa-user-plus"></i> Register New Teacher</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="form-${jamia.replace(/\s+/g, '')}">
                                <input type="text" id="name-${jamia.replace(/\s+/g, '')}" placeholder="Name Of Teacher" class="p-2.5 border rounded-xl text-sm">
                                <input type="text" id="ajeer-${jamia.replace(/\s+/g, '')}" placeholder="Ajeer Code" class="p-2.5 border rounded-xl text-sm font-bold" maxlength="6">
                                <input type="text" id="contact-${jamia.replace(/\s+/g, '')}" placeholder="Contact No." class="p-2.5 border rounded-xl text-sm">
                                <input type="text" id="level-${jamia.replace(/\s+/g, '')}" placeholder="Level Qualified" class="p-2.5 border rounded-xl text-sm">
                                <input type="text" id="h-qual-${jamia.replace(/\s+/g, '')}" placeholder="Highest Qualification" class="p-2.5 border rounded-xl text-sm">
                                <input type="email" id="mail-${jamia.replace(/\s+/g, '')}" placeholder="Mail ID" class="p-2.5 border rounded-xl text-sm">
                                <input type="text" id="exp-${jamia.replace(/\s+/g, '')}" placeholder="Experience" class="p-2.5 border rounded-xl text-sm">
                                <input type="text" id="spec-${jamia.replace(/\s+/g, '')}" placeholder="Specialization" class="p-2.5 border rounded-xl text-sm">
                                <input type="text" id="t-period-${jamia.replace(/\s+/g, '')}" placeholder="Total Period" class="p-2.5 border rounded-xl text-sm">
                                <input type="text" id="ijara-${jamia.replace(/\s+/g, '')}" placeholder="Ijara Status" class="p-2.5 border rounded-xl text-sm">
                            </div>
                            <button class="save-teacher-btn w-full mt-4 bg-indigo-600 text-white py-3 rounded-2xl font-bold" data-jamia-name="${jamia}">Save Teacher Profile</button>
                        </div>
                        <div class="teacher-list-area space-y-4" id="list-${jamia.replace(/\s+/g, '')}"></div>
                    </div>
                </div>`).join('');
            
            setupStructureEvents(displayArea, db, currentUser, assignedJamiaat, selectedYear);
            loadAllTeachers(assignedJamiaat, db, currentUser, selectedYear);
        };

        const yearSelect = document.getElementById('structure-year-select');
        yearSelect.onchange = (e) => updateStructureView(e.target.value);
        updateStructureView(yearSelect.value);
    }
};

const setupStructureEvents = (container, db, currentUser, assignedJamiaat, selectedYear) => {
    container.querySelectorAll('.jamia-toggle').forEach(btn => {
        btn.onclick = () => {
            btn.nextElementSibling.classList.toggle('hidden');
            btn.querySelector('i').classList.toggle('rotate-180');
        };
    });

    container.querySelectorAll('.save-teacher-btn').forEach(btn => {
        btn.onclick = async () => {
            const jamiaName = btn.dataset.jamiaName;
            const safeId = jamiaName.replace(/\s+/g, '');
            const editId = btn.dataset.editMode;

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
                
                if (!academicYears[selectedYear]) academicYears[selectedYear] = { karkardagiStructure: [] };
                
                let structure = academicYears[selectedYear].karkardagiStructure;
                let jamiaData = structure.find(j => j.jamiaName === jamiaName);
                if (!jamiaData) { jamiaData = { jamiaName, teachers: [] }; structure.push(jamiaData); }

                if (editId) {
                    const idx = jamiaData.teachers.findIndex(t => t.id === editId);
                    if (idx > -1) {
                        jamiaData.teachers[idx] = {
                            ...jamiaData.teachers[idx],
                            name, loginCode: ajeer, contact, levelQualified: level,
                            highestQualification: hQual, mailId: mail, experience: exp,
                            specialization: spec, teachingPeriod: tPeriod, ijaraStatus: ijara
                        };
                    }
                    delete btn.dataset.editMode;
                    btn.innerText = "Save Teacher Profile";
                } else {
                    jamiaData.teachers.push({
                        id: `t-${Date.now()}`, name, loginCode: ajeer, contact, levelQualified: level,
                        highestQualification: hQual, mailId: mail, experience: exp, specialization: spec,
                        teachingPeriod: tPeriod, ijaraStatus: ijara, periods: []
                    });
                }

                await updateDoc(userRef, { academicYears });
                alert("Teacher Data Saved!");
                document.querySelectorAll(`#form-${safeId} input`).forEach(inp => inp.value = "");
                loadAllTeachers(assignedJamiaat, db, currentUser, selectedYear);
            } catch (e) { alert("Error: " + e.message); }
            btn.disabled = false;
        };
    });
};

const loadAllTeachers = async (jamiaat, db, currentUser, selectedYear) => {
    try {
        const [configSnap, userSnap] = await Promise.all([
            // SAHI PATH: 'academic_admin_config' jo admin file me use hua hai
            getDoc(doc(db, "settings", "academic_admin_config")), 
            getDoc(doc(db, "users", currentUser.uid))
        ]);
        
        // Agar data mil jaye to theek, warna empty array
        const academicConfig = configSnap.exists() ? configSnap.data() : { classes: [] };
        const structure = userSnap.data().academicYears?.[selectedYear]?.karkardagiStructure || [];
        
        jamiaat.forEach(jamia => {
            const safeId = jamia.replace(/\s+/g, '');
            const listDiv = document.getElementById(`list-${safeId}`);
            const jamiaData = structure.find(j => j.jamiaName === jamia);
            if (!listDiv || !jamiaData) return;

            // Class options for the dropdown
            const classOptions = academicConfig.classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

            listDiv.innerHTML = jamiaData.teachers.map(t => `
                <div class="border rounded-2xl bg-slate-50 mb-4 overflow-hidden shadow-sm" id="teacher-card-${t.id}">
                    <div class="teacher-toggle flex justify-between items-center p-4 cursor-pointer bg-white" data-tid="${t.id}" data-jamia="${jamia}">
                        <div class="flex flex-col"><span class="font-bold text-slate-800">${t.name}</span><span class="text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded w-fit mt-1 uppercase">CODE: ${t.loginCode}</span></div>
                        <div class="flex items-center gap-3">
                            <button class="edit-t-btn text-indigo-500" data-tid="${t.id}" data-jamia="${jamia}"><i class="fas fa-edit"></i></button>
                            <button class="del-t-btn text-red-500" data-tid="${t.id}" data-jamia="${jamia}"><i class="fas fa-trash-alt"></i></button>
                            <i class="fas fa-chevron-down text-slate-400"></i>
                        </div>
                    </div>
                    <div class="period-container hidden p-5 bg-white border-t space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 bg-emerald-50/50 p-4 rounded-xl">
                            <select class="p-class p-2 border rounded-lg text-sm"><option value="">Select Class</option>${classOptions}</select>
                            <select class="p-book p-2 border rounded-lg text-sm" disabled><option value="">Select Subject</option></select>
                            <select class="p-sem p-2 border rounded-lg text-sm"><option value="1">Sem 1</option><option value="2">Sem 2</option></select>
                            <input type="number" placeholder="Pages" class="p-pages p-2 border rounded-lg text-sm">
                            <select class="p-syllabus p-2 border rounded-lg text-sm">
                                <option value="Majlis">Majlis</option>
                                <option value="State">State</option>
                                <option value="Approval">Approval</option>
                            </select>
                            <button class="save-period-btn md:col-span-5 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold" data-tid="${t.id}" data-jamia="${jamia}">Add Period</button>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-[10px] border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 text-slate-400 uppercase font-black">
                                        <th class="p-2 border text-left">Class</th><th class="p-2 border text-left">Book</th>
                                        <th class="p-2 border text-center">Sem</th><th class="p-2 border text-center">Pages</th>
                                        <th class="p-2 border text-center">Syllabus</th><th class="p-2 border text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(t.periods || []).map(p => `
                                        <tr class="border-b">
                                            <td class="p-2 border">${p.className}</td><td class="p-2 border">${p.bookName}</td>
                                            <td class="p-2 border text-center">${p.semester}</td><td class="p-2 border text-center font-bold">${p.totalPages}</td>
                                            <td class="p-2 border text-center text-indigo-600 font-bold">${p.syllabus || 'Majlis'}</td>
                                            <td class="p-2 border text-center">
                                                <button class="del-period-btn text-red-500" data-pid="${p.id}" data-tid="${t.id}" data-jamia="${jamia}"><i class="fas fa-times-circle"></i></button>
                                            </td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`).join('');
            
            attachDropdownEvents(listDiv, academicConfig);
            // Yahan hum 'jamiaat' ko pass kar rahe hain taaki ReferenceError na aaye
            attachTeacherEvents(listDiv, db, currentUser, jamiaat, selectedYear);
        });
    } catch (e) { console.error("loadAllTeachers error:", e); }
};

const loadPerformanceTable = async (jamiaat, db, currentUser) => {
    const tbody = document.getElementById('performance-table-body');
    const selectedMonthIdx = document.getElementById('report-month').value; 
    
    // 1. Admin Calendar Fetch (Target nikalne ke liye)
    const configSnap = await getDoc(doc(db, "settings", "academic_calendar"));
    if (!configSnap.exists()) return;
    const config = configSnap.data();

    const sem1Total = config.totals?.s1 || 1; 
    const sem2Total = config.totals?.s2 || 1;
    const monthDays = config.months?.[selectedMonthIdx] || { s1: 0, s2: 0 };

    // 2. User Data Fetch
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const karkardagi = userSnap.data().academicYears?.["2026-2027"]?.karkardagiStructure || [];

    let html = "";
    jamiaat.forEach(jamiaName => {
        const jamiaData = karkardagi.find(j => j.jamiaName === jamiaName);
        if (!jamiaData) return;

        // Jamia Header with Action Buttons
        html += `
            <tr class="bg-slate-100 font-bold" data-jamia="${jamiaName}">
                <td colspan="7" class="p-3 border-y">
                    <div class="flex justify-between items-center">
                        <span class="text-indigo-700">${jamiaName}</span>
                        <div class="flex gap-2">
                            <button onclick="downloadJamiaExcel('${jamiaName}')" class="bg-emerald-600 text-white text-[9px] px-2 py-1 rounded">Excel</button>
                            <button onclick="toggleEdit('${jamiaName}')" class="edit-btn bg-indigo-600 text-white text-[9px] px-2 py-1 rounded">Edit</button>
                        </div>
                    </div>
                </td>
            </tr>`;

        jamiaData.teachers.forEach(teacher => {
            teacher.periods?.forEach(p => {
                // Calculation Logic
                const totalYearDays = (p.semester == "1") ? sem1Total : sem2Total;
                const activeMonthDays = (p.semester == "1") ? monthDays.s1 : monthDays.s2;
                
                // Monthly Target Calculation
                const target = Math.round((p.totalPages / totalYearDays) * activeMonthDays) || 0;
                
                // Achievement & Status Logic (Default 0 for now)
                const achieved = 0; 
                const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;
                
                let status = "Munasib";
                let statusClass = "text-red-600";
                if (percentage >= 90) { status = "Mumtaz"; statusClass = "text-emerald-600"; }
                else if (percentage >= 70) { status = "Behtar"; statusClass = "text-blue-600"; }

                html += `
                    <tr class="border-b text-sm" data-jamia="${jamiaName}">
                        <td class="p-3">
                            <div class="font-bold text-slate-700">${teacher.name}</div>
                            <div class="text-[10px] text-slate-500">${p.className} - ${p.bookName}</div>
                        </td>
                        <td class="p-3 text-center">${p.totalPages}</td>
                        <td class="p-3 text-center font-bold text-indigo-600">${target}</td>
                        <td class="p-3 text-center">
                            <input type="number" value="${achieved}" disabled 
                                   class="achieved-inp w-16 border rounded text-center bg-slate-50"
                                   oninput="updateRowStatus(this, ${target})">
                        </td>
                        <td class="p-3 text-center perc-cell font-bold">${percentage}%</td>
                        <td class="p-3 text-center status-cell font-black ${statusClass}">${status}</td>
                        <td class="p-3 text-center">
                            <button class="text-slate-400"><i class="fas fa-history"></i></button>
                        </td>
                    </tr>`;
            });
        });
    });
    tbody.innerHTML = html;
};

// --- Helpers ---

const attachDropdownEvents = (container, config) => {
    container.querySelectorAll('.p-class').forEach(sel => {
        sel.onchange = () => {
            const bookSel = sel.parentElement.querySelector('.p-book');
            bookSel.innerHTML = `<option value="">Select Subject</option>`;
            const classData = config.classes.find(c => c.name === sel.value);
            if (classData?.subjects) {
                classData.subjects.forEach(sub => bookSel.innerHTML += `<option value="${sub}">${sub}</option>`);
                bookSel.disabled = false;
            } else { bookSel.disabled = true; }
        };
    });
};

const attachTeacherEvents = (container, db, currentUser, jamiaat, selectedYear) => {
    container.querySelectorAll('.teacher-toggle').forEach(toggle => {
        toggle.onclick = (e) => {
            if (e.target.closest('button')) return;
            toggle.nextElementSibling.classList.toggle('hidden');
            toggle.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
        };
    });

        container.querySelectorAll('.save-period-btn').forEach(btn => {
    btn.onclick = async () => {
        const panel = btn.closest('.period-container');
        const data = {
            className: panel.querySelector('.p-class').value,
            bookName: panel.querySelector('.p-book').value,
            semester: panel.querySelector('.p-sem').value,
            totalPages: parseInt(panel.querySelector('.p-pages').value),
            syllabus: panel.querySelector('.p-syllabus').value // Naya field
        };

        if (!data.className || !data.bookName || !data.totalPages) return alert("Fill all details.");

        await updateTeacherData(db, currentUser, btn.dataset.jamia, selectedYear, (teachers) => {
            const t = teachers.find(teach => teach.id === btn.dataset.tid);
            if (t) { 
                if (!t.periods) t.periods = []; 
                t.periods.push({ id: `p-${Date.now()}`, ...data }); 
            }
            return teachers;
        });

        // UI Refresh
        await loadAllTeachers(jamiaat, db, currentUser, selectedYear);
        
        // --- DROPDOWN OPEN RAKHNE KA LOGIC ---
        // Refresh ke baad wahi teacher ka container dhoond kar open karein
        const teacherRow = document.querySelector(`[data-tid="${btn.dataset.tid}"]`);
        if (teacherRow) {
            teacherRow.nextElementSibling.classList.remove('hidden');
            // Jamia ka main container bhi open rahe ye ensure karein
            teacherRow.closest('.jamia-content').classList.remove('hidden');
        }
    };
});

    container.querySelectorAll('.del-period-btn, .del-t-btn').forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Are you sure?")) return;
            const isPeriod = btn.classList.contains('del-period-btn');
            await updateTeacherData(db, currentUser, btn.dataset.jamia, selectedYear, (teachers) => {
                if (isPeriod) {
                    const t = teachers.find(te => te.id === btn.dataset.tid);
                    t.periods = t.periods.filter(p => p.id !== btn.dataset.pid);
                } else { teachers = teachers.filter(t => t.id !== btn.dataset.tid); }
                return teachers;
            });
            loadAllTeachers(jamiaat, db, currentUser, selectedYear);
        };
    });
};

async function updateTeacherData(db, currentUser, jamiaName, selectedYear, updateFn) {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    let academicYears = userSnap.data().academicYears || {};
    let structure = academicYears[selectedYear]?.karkardagiStructure || [];
    let jamiaData = structure.find(j => j.jamiaName === jamiaName);
    if (jamiaData) {
        jamiaData.teachers = updateFn(jamiaData.teachers);
        await updateDoc(userRef, { academicYears });
    }
}
// 1. Toggle Edit Mode (Lock/Unlock)
window.toggleEditMode = (jamiaName) => {
    const header = document.querySelector(`.jamia-performance-header[data-jamia="${jamiaName}"]`);
    const isEditing = header.dataset.editing === "true";
    header.dataset.editing = !isEditing;
    
    const btn = header.querySelector('.toggle-edit-btn');
    btn.textContent = isEditing ? "Edit Pages" : "Lock Pages";
    btn.classList.toggle('bg-slate-800', !isEditing);

    const inputs = document.querySelectorAll(`.performance-row[data-jamia="${jamiaName}"] .achieved-input`);
    inputs.forEach(input => {
        input.disabled = isEditing;
        input.classList.toggle('bg-white', !isEditing);
        input.classList.toggle('bg-slate-50', isEditing);
    });
    
    document.getElementById('save-performance-btn').classList.toggle('hidden', isEditing);
};

// 2. Copy Teacher Form Link
window.copyTeacherLink = (jamiaName) => {
    const monthIdx = document.getElementById('report-month').value;
    const baseUrl = window.location.href.split('inspector.html')[0];
    const params = new URLSearchParams({
        jamiaId: jamiaName,
        userId: currentUser.uid, // Global currentUser variable
        monthIndex: monthIdx,
        activeYear: "2026-2027" // Dynamic karna behtar hai
    });
    const link = `${baseUrl}teacher-form.html?${params.toString()}`;
    
    navigator.clipboard.writeText(link).then(() => {
        alert("Teacher Form Link Copied for " + jamiaName);
    });
};

// 3. Image Download Logic (html2canvas require hoga)
window.downloadJamiaImage = async (jamiaName) => {
    const container = document.getElementById('performance-table-container');
    // Isme hum sirf us Jamia ka data filter karke image banate hain jese karkardagi.html me tha
    alert("Image generation starting for " + jamiaName);
    // html2canvas logic yahan aayega...
};
window.updateRowStatus = (input, target) => {
    const row = input.closest('tr');
    const achieved = parseInt(input.value) || 0;
    const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;
    
    const percCell = row.querySelector('.perc-cell');
    const statusCell = row.querySelector('.status-cell');
    
    percCell.textContent = percentage + "%";
    
    if (percentage >= 90) {
        statusCell.textContent = "Mumtaz";
        statusCell.className = "p-3 text-center status-cell font-black text-emerald-600";
    } else if (percentage >= 70) {
        statusCell.textContent = "Behtar";
        statusCell.className = "p-3 text-center status-cell font-black text-blue-600";
    } else {
        statusCell.textContent = "Munasib";
        statusCell.className = "p-3 text-center status-cell font-black text-red-600";
    }
};

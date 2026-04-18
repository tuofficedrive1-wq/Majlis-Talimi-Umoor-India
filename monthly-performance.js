import { 
    doc, 
    getDoc, 
    updateDoc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global cache settings fetch karne ke liye
let globalAcademicConfig = null;

/**
 * Global setup fetch karne ka function
 */
async function fetchGlobalSetup(db) {
    if (globalAcademicConfig) return globalAcademicConfig;
    try {
        const configRef = doc(db, "settings", "academic_config");
        const snap = await getDoc(configRef);
        if (snap.exists()) {
            globalAcademicConfig = snap.data();
            return globalAcademicConfig;
        }
    } catch (error) {
        console.error("Global setup fetch error:", error);
    }
    return null;
}

/**
 * Main function jo academic-inspector.html se call hoga
 */
export const renderPerformanceTab = async (assignedJamiaat, currentUser, db) => {
    const container = document.getElementById('performance-jamia-list');
    if (!container) return;

    container.innerHTML = `
        <div class="mb-6">
            <div class="flex border-b border-slate-200 gap-4 overflow-x-auto">
                <button class="perf-sub-tab active border-b-2 border-indigo-600 px-4 py-2 text-sm font-bold text-indigo-600" data-sub="performance">Performance</button>
                <button class="perf-sub-tab px-4 py-2 text-sm font-bold text-slate-500" data-sub="summary">Summary</button>
                <button class="perf-sub-tab px-4 py-2 text-sm font-bold text-slate-500" data-sub="structure">Structure</button>
            </div>
        </div>
        <div id="sub-tab-content" class="space-y-6"></div>
    `;

    const subTabBtns = container.querySelectorAll('.perf-sub-tab');
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

    // Default tab load karein
    renderSubTabContent('performance', assignedJamiaat, currentUser, db);
};

/**
 * Sub-tabs ka content render karne ka function
 */
const renderSubTabContent = async (tabName, assignedJamiaat, currentUser, db) => {
    const contentArea = document.getElementById('sub-tab-content');
    const setupData = await fetchGlobalSetup(db);
    const activeSession = setupData?.activeYear || '2026-2027';

    if (tabName === 'performance') {
        const monthsList = [
            { name: "April", idx: 3 }, { name: "May", idx: 4 }, { name: "June", idx: 5 },
            { name: "July", idx: 6 }, { name: "August", idx: 7 }, { name: "September", idx: 8 },
            { name: "October", idx: 9 }, { name: "November", idx: 10 }, { name: "December", idx: 11 },
            { name: "January", idx: 0 }, { name: "February", idx: 1 }, { name: "March", idx: 2 }
        ];

        contentArea.innerHTML = `
            <div class="mb-6 flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <div class="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600"><i class="fas fa-clock"></i></div>
                <div class="flex-1">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Academic Month</label>
                    <select id="perf-month-select" class="w-full md:w-48 bg-transparent font-bold text-emerald-700 outline-none cursor-pointer">
                        ${monthsList.map(m => `<option value="${m.idx}">${m.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="overflow-x-auto border border-slate-200 rounded-3xl shadow-sm bg-white">
                <table class="w-full text-left border-collapse min-w-[1200px]">
                    <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase font-black tracking-wider">
                        <tr>
                            <th class="p-4 border-b">Teacher</th>
                            <th class="p-4 border-b">Class</th>
                            <th class="p-4 border-b">Book</th>
                            <th class="p-4 border-b">Last Lesson</th>
                            <th class="p-4 border-b text-center">Pg No.</th>
                            <th class="p-4 border-b text-center">Month Days</th>
                            <th class="p-4 border-b text-center">Total Pgs</th>
                            <th class="p-4 border-b text-center text-indigo-600">Target</th>
                            <th class="p-4 border-b text-center">Cumulative</th>
                            <th class="p-4 border-b text-center">Monthly</th>
                            <th class="p-4 border-b text-center">Achv %</th>
                            <th class="p-4 border-b text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody id="performance-table-body"></tbody>
                </table>
            </div>
        `;
        document.getElementById('perf-month-select').onchange = () => loadPerformanceTable(assignedJamiaat, currentUser, db);
        loadPerformanceTable(assignedJamiaat, currentUser, db); 

    } else if (tabName === 'structure') {
        contentArea.innerHTML = `
            <div id="structure-accordion" class="space-y-4">
                ${assignedJamiaat.map(jamia => `
                    <div class="border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm" data-jamia="${jamia}">
                        <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 transition-colors">
                            <span>${jamia}</span>
                            <i class="fas fa-chevron-down transition-transform"></i>
                        </button>
                        <div class="jamia-content hidden p-6 border-t border-slate-100 space-y-6">
                            <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                                <h4 class="text-sm font-bold text-indigo-600 uppercase mb-4 flex items-center gap-2">
                                    <i class="fas fa-user-plus"></i> Register New Teacher
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="form-${jamia.replace(/\s+/g, '')}">
                                    <input type="text" id="name-${jamia.replace(/\s+/g, '')}" placeholder="Name Of Teacher" class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="text" id="ajeer-${jamia.replace(/\s+/g, '')}" placeholder="Ajeer Code" class="p-2.5 border rounded-xl text-sm font-bold" maxlength="6">
                                    <input type="text" id="contact-${jamia.replace(/\s+/g, '')}" placeholder="Contact No." class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="text" id="t-period-${jamia.replace(/\s+/g, '')}" placeholder="Total Period" class="p-2.5 border rounded-xl text-sm outline-none">
                                </div>
                                <button class="save-teacher-btn w-full mt-4 bg-indigo-600 text-white py-3 rounded-2xl font-bold shadow-lg" data-jamia-name="${jamia}">Save Teacher Profile</button>
                            </div>
                            <div class="teacher-list-area space-y-4" id="list-${jamia.replace(/\s+/g, '')}"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        setupStructureEvents(contentArea, db, currentUser, assignedJamiaat, activeSession);
        loadAllTeachers(assignedJamiaat, db, currentUser, activeSession);
    }
};

/**
 * Performance table ka data load karne ka function
 */
const loadPerformanceTable = async (jamiaat, currentUser, db) => {
    const tbody = document.getElementById('performance-table-body');
    const setupData = await fetchGlobalSetup(db);
    const monthSelect = document.getElementById('perf-month-select');
    if (!tbody || !setupData || !monthSelect) return;

    const selectedMonthIdx = monthSelect.value;
    const activeYear = setupData.activeYear || "2026-2027";
    
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const structure = userSnap.data()?.academicYears?.[activeYear]?.karkardagiStructure || [];
    
    const isSem2 = [9, 10, 11, 0, 1, 2].includes(parseInt(selectedMonthIdx));
    const semesterTotalDays = isSem2 ? setupData.sem2TotalDays : setupData.sem1TotalDays;
    const currentMonthDays = setupData.monthDetails[selectedMonthIdx]?.[isSem2 ? 'sem2' : 'sem1'] || 0;

    let html = "";
    jamiaat.forEach(jamiaName => {
        const jamiaData = structure.find(j => j.jamiaName === jamiaName);
        if (!jamiaData || !jamiaData.teachers) return;

        html += `<tr class="bg-indigo-50 font-bold"><td colspan="12" class="p-4 border-y border-indigo-100 text-indigo-700">${jamiaName}</td></tr>`;

        jamiaData.teachers.forEach(teacher => {
            const periods = teacher.periods || [];
            periods.forEach((p, idx) => {
                const targetPages = semesterTotalDays > 0 ? Math.round((p.totalPages / semesterTotalDays) * currentMonthDays) : 0;
                html += `
                    <tr class="border-b border-slate-100 text-sm">
                        ${idx === 0 ? `<td rowspan="${periods.length}" class="p-4 font-bold text-slate-800 bg-slate-50/50 align-top">${teacher.name}</td>` : ''}
                        <td class="p-4 text-slate-600 font-medium">${p.className}</td>
                        <td class="p-4 text-slate-600 font-medium">${p.bookName}</td>
                        <td class="p-4 text-slate-400 italic text-xs">-</td>
                        <td class="p-4 text-center">0</td>
                        <td class="p-4 text-center font-bold text-slate-500">${currentMonthDays} Days</td>
                        <td class="p-4 text-center font-bold text-slate-400">${p.totalPages}</td>
                        <td class="p-4 text-center font-black text-indigo-600">${targetPages}</td>
                        <td class="p-4 text-center">0</td>
                        <td class="p-4 text-center"><input type="number" class="w-16 p-1 border rounded text-center text-xs" value="0" disabled></td>
                        <td class="p-4 text-center text-xs">0%</td>
                        <td class="p-4 text-center uppercase text-[10px] font-black">Pending</td>
                    </tr>`;
            });
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="12" class="p-10 text-center text-slate-400">No records found.</td></tr>';
};

/**
 * Structure (Teachers/Classes) setup karne ka events function
 */
const setupStructureEvents = (container, db, currentUser, assignedJamiaat, activeYear) => {
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

            if (!name || !ajeer) return alert("Name and Ajeer Code are required.");

            try {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                let academicYears = userSnap.data().academicYears || {};
                
                if (!academicYears[activeYear]) academicYears[activeYear] = { karkardagiStructure: [] };
                
                let structure = academicYears[activeYear].karkardagiStructure;
                let jamiaData = structure.find(j => j.jamiaName === jamiaName);
                if (!jamiaData) { jamiaData = { jamiaName, teachers: [] }; structure.push(jamiaData); }

                const teacherObj = {
                    id: editId || `t-${Date.now()}`, 
                    name, 
                    loginCode: ajeer,
                    periods: editId ? (jamiaData.teachers.find(t => t.id === editId)?.periods || []) : []
                };

                if (editId) {
                    const idx = jamiaData.teachers.findIndex(t => t.id === editId);
                    if (idx > -1) jamiaData.teachers[idx] = teacherObj;
                } else {
                    jamiaData.teachers.push(teacherObj);
                }

                await updateDoc(userRef, { academicYears });
                alert("Saved!");
                loadAllTeachers(assignedJamiaat, db, currentUser, activeYear);
            } catch (err) { alert("Error: " + err.message); }
        };
    });
};

/**
 * Registered teachers ko load karne ka function
 */
const loadAllTeachers = async (jamiaat, db, currentUser, activeYear) => {
    try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const structure = userSnap.data()?.academicYears?.[activeYear]?.karkardagiStructure || [];
        
        jamiaat.forEach(jamia => {
            const safeId = jamia.replace(/\s+/g, '');
            const listDiv = document.getElementById(`list-${safeId}`);
            const jamiaData = structure.find(j => j.jamiaName === jamia);
            if (!listDiv || !jamiaData) return;

            listDiv.innerHTML = jamiaData.teachers.map(t => `
                <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 mb-4 p-4 flex justify-between items-center">
                    <div>
                        <span class="font-bold text-slate-800">${t.name}</span>
                        <span class="text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded ml-2">CODE: ${t.loginCode}</span>
                    </div>
                    <button class="edit-t-btn text-indigo-500" data-tid="${t.id}" data-jamia="${jamia}"><i class="fas fa-edit"></i></button>
                </div>`).join('');
        });
    } catch (e) { console.error(e); }
};

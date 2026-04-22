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
    
    if (tabName === 'performance') {
        contentArea.innerHTML = `
            <div class="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl border shadow-sm">
                <h3 class="font-bold text-slate-700">Monthly Targets & Performance</h3>
                <select id="report-month" class="p-2 border rounded-xl text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200">
                    <option value="apr">April</option><option value="may">May</option><option value="jun">June</option>
                    <option value="jul">July</option><option value="aug">August</option><option value="sep">September</option>
                    <option value="oct">October</option><option value="nov">November</option><option value="dec">December</option>
                    <option value="jan">January</option><option value="feb">February</option><option value="mar">March</option>
                </select>
            </div>
            <div class="overflow-x-auto border border-slate-200 rounded-3xl shadow-sm bg-white">
                <table class="w-full text-left border-collapse min-w-[1000px]">
                    <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase font-black tracking-wider">
                        <tr>
                            <th class="p-4 border-b">Teacher</th><th class="p-4 border-b">Class</th><th class="p-4 border-b">Book</th>
                            <th class="p-4 border-b text-center">Total Pgs</th><th class="p-4 border-b text-center">Target Pgs</th>
                            <th class="p-4 border-b text-center">Achieved</th><th class="p-4 border-b text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody id="performance-table-body"></tbody>
                </table>
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
    
    // 1. SAHI PATH: 'academic_calendar' use karein
    const configSnap = await getDoc(doc(db, "settings", "academic_calendar"));
    if (!configSnap.exists()) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-10 text-center text-red-500">Calendar Data nahi mila.</td></tr>';
        return;
    }

    const config = configSnap.data();
    const activeYear = config.activeYear;
    // 2. FIELD NAMES: 'totals.s1' aur 'months' use karein jo admin file me hain
    const sem1Total = config.totals?.s1 || 1; 
    const sem2Total = config.totals?.s2 || 1;
    const monthData = config.months?.[selectedMonthIdx] || { s1: 0, s2: 0 };

    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const karkardagi = userSnap.data().academicYears?.[activeYear]?.karkardagiStructure || [];

    let html = "";
    jamiaat.forEach(jamiaName => {
        const jamiaData = karkardagi.find(j => j.jamiaName === jamiaName);
        if (!jamiaData || !jamiaData.teachers) return;

        html += `<tr class="bg-indigo-50 font-bold"><td colspan="7" class="p-4 border-y border-indigo-100 text-indigo-700">${jamiaName}</td></tr>`;

        jamiaData.teachers.forEach(teacher => {
            if (!teacher.periods || teacher.periods.length === 0) return;
            teacher.periods.forEach((p, idx) => {
                // Sahi Target Calculation
               const totalDays = (p.semester == "1") ? sem1Total : sem2Total;
    const monthDays = (p.semester == "1") ? monthData.s1 : monthData.s2;
    const target = Math.round((p.totalPages / totalDays) * monthDays) || 0;
                html += `
                    <tr class="border-b">
                        <td class="p-4 font-bold text-slate-800">${idx === 0 ? teacher.name : ''}</td>
                        <td class="p-4">${p.className}</td>
                        <td class="p-4">${p.bookName}</td>
                        <td class="p-4 text-center">${p.totalPages}</td>
                        <td class="p-4 text-center font-bold text-indigo-600 bg-indigo-50/20">${target}</td>
                        <td class="p-4 text-center">0</td>
                        <td class="p-4 text-center text-xs font-bold text-red-500">Pending</td>
                    </tr>`;
            });
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="7" class="p-10 text-center">Data nahi mila.</td></tr>';
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

import { 
    doc, 
    getDoc,
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let academicConfig = null;

// Academic Admin ki settings fetch karne ka function
// monthly-performance.js ke shuruat mein
async function getAcademicConfig(db) {
    if (academicConfig) return academicConfig;
    // 'academic_admin_config' ko badal kar 'academic_calendar' karein
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
    
    // monthly-performance.js ke andar renderSubTabContent function mein badlav:

if (tabName === 'performance') {
    contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl border shadow-sm">
            <h3 class="font-bold text-slate-700">Monthly Targets & Performance</h3>
            
            <select id="report-month" class="p-2 border rounded-xl text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="apr">April</option>
                <option value="may">May</option>
                <option value="jun">June</option>
                <option value="jul">July</option>
                <option value="aug">August</option>
                <option value="sep">September</option>
                <option value="oct">October</option>
                <option value="nov">November</option>
                <option value="dec">December</option>
                <option value="jan">January</option>
                <option value="feb">February</option>
                <option value="mar">March</option>
            </select>
        </div>

        <div class="overflow-x-auto border border-slate-200 rounded-3xl shadow-sm bg-white">
            <table class="w-full text-left border-collapse min-w-[1000px]">
                <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase font-black tracking-wider">
                    <tr>
                        <th class="p-4 border-b">Teacher</th>
                        <th class="p-4 border-b">Class</th>
                        <th class="p-4 border-b">Book</th>
                        <th class="p-4 border-b text-center">Total Pgs</th>
                        <th class="p-4 border-b text-center">Target Pgs</th> <th class="p-4 border-b text-center">Achieved</th>
                        <th class="p-4 border-b text-center">Status</th>
                    </tr>
                </thead>
                <tbody id="performance-table-body"></tbody>
            </table>
        </div>
    `;

    // Dropdown badalne par table refresh karein
    document.getElementById('report-month').onchange = () => loadPerformanceTable(assignedJamiaat, db, currentUser);
    
    // Pehli baar table load karein
    loadPerformanceTable(assignedJamiaat, db, currentUser);
} else if (tabName === 'structure') {
    // 1. Admin ki settings se 'Active Year' lein
    const calSnap = await getDoc(doc(db, "settings", "academic_calendar"));
    const activeYearByAdmin = calSnap.exists() ? calSnap.data().activeYear : "";

    // 2. User ke document se saare available years nikaalein
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const allYears = Object.keys(userSnap.data().academicYears || {});

    contentArea.innerHTML = `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 mb-6 shadow-sm flex justify-between items-center">
            <div>
                <h4 class="text-sm font-black text-slate-700 uppercase tracking-tight">Academic Year Selection</h4>
                <p class="text-[10px] text-slate-400 font-bold italic">Select a year to view its structure</p>
            </div>
            
            <select id="structure-year-select" class="p-2 border-2 border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 outline-none focus:border-indigo-500 transition-all bg-indigo-50">
                ${allYears.map(yr => `
                    <option value="${yr}" ${yr === activeYearByAdmin ? 'selected' : ''}>
                        ${yr} ${yr === activeYearByAdmin ? '(Active)' : ''}
                    </option>
                `).join('')}
            </select>
        </div>

        <div id="structure-accordion" class="space-y-4">
                ${assignedJamiaat.map(jamia => `
                    <div class="border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm" data-jamia="${jamia}">
                        <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">
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
                                    <input type="text" id="level-${jamia.replace(/\s+/g, '')}" placeholder="Level Qualified" class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="text" id="h-qual-${jamia.replace(/\s+/g, '')}" placeholder="Highest Qualification" class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="email" id="mail-${jamia.replace(/\s+/g, '')}" placeholder="Mail ID" class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="text" id="exp-${jamia.replace(/\s+/g, '')}" placeholder="Experience" class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="text" id="spec-${jamia.replace(/\s+/g, '')}" placeholder="Specialization" class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="text" id="t-period-${jamia.replace(/\s+/g, '')}" placeholder="Total Period" class="p-2.5 border rounded-xl text-sm outline-none">
                                    <input type="text" id="ijara-${jamia.replace(/\s+/g, '')}" placeholder="Ijara Status" class="p-2.5 border rounded-xl text-sm outline-none">
                                </div>
                                <button class="save-teacher-btn w-full mt-4 bg-indigo-600 text-white py-3 rounded-2xl font-bold" data-jamia-name="${jamia}">Save Teacher Profile</button>
                            </div>
                            <div class="teacher-list-area space-y-4" id="list-${jamia.replace(/\s+/g, '')}"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        const updateDisplay = (selectedYear) => {
            // Display area ko saaf karke naya data load karein
            const displayArea = document.getElementById('structure-display-area');
            displayArea.innerHTML = assignedJamiaat.map(jamia => `
                <div class="border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm mb-4">
                    <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">
                        <span>${jamia}</span>
                        <i class="fas fa-chevron-down transition-transform"></i>
                    </button>
                    <div class="jamia-content hidden p-6 border-t border-slate-100" id="content-${jamia.replace(/\s+/g, '')}">
                        <div class="teacher-list-area space-y-4" id="list-${jamia.replace(/\s+/g, '')}"></div>
                    </div>
                </div>
            `).join('');

            // Events aur Data load karein (selectedYear ke saath)
            setupStructureEvents(contentArea, db, currentUser, assignedJamiaat, selectedYear);
            loadAllTeachers(assignedJamiaat, db, currentUser, selectedYear); 
        };

        document.getElementById('structure-year-select').onchange = (e) => {
            updateDisplay(e.target.value);
        };

        // Initial load: Dropdown mein jo pehla/selected saal hai wo load ho
        updateDisplay(document.getElementById('structure-year-select').value);
        }
};

const setupStructureEvents = (container, db, currentUser, assignedJamiaat) => {
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
                const activeYear = "2025-2026";
                if (!academicYears[activeYear]) academicYears[activeYear] = { karkardagiStructure: [] };
                
                let structure = academicYears[activeYear].karkardagiStructure;
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
                    const newTeacher = {
                        id: `t-${Date.now()}`, name, loginCode: ajeer, contact, levelQualified: level,
                        highestQualification: hQual, mailId: mail, experience: exp, specialization: spec,
                        teachingPeriod: tPeriod, ijaraStatus: ijara, periods: []
                    };
                    jamiaData.teachers.push(newTeacher);
                }

                await updateDoc(userRef, { academicYears });
                alert(editId ? "Teacher Updated!" : "Teacher Saved!");
                document.querySelectorAll(`#form-${safeId} input`).forEach(inp => inp.value = "");
                loadAllTeachers(assignedJamiaat, db, currentUser);
            } catch (e) { alert("Error: " + e.message); }
            btn.disabled = false;
        };
    });
};

const loadAllTeachers = async (jamiaat, db, currentUser) => {
    try {
        // Step 1: Academic Config load karein taaki dropdown values mil sakein
        const configSnap = await getDoc(doc(db, "settings", "academic_admin_config"));
        const academicConfig = configSnap.exists() ? configSnap.data() : { classes: [] };

        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        const structure = userSnap.data().academicYears?.["2025-2026"]?.karkardagiStructure || [];
        
        jamiaat.forEach(jamia => {
            const safeId = jamia.replace(/\s+/g, '');
            const listDiv = document.getElementById(`list-${safeId}`);
            const jamiaData = structure.find(j => j.jamiaName === jamia);
            if (!listDiv || !jamiaData) return;

            // Step 2: Class options generate karein
            const classOptions = academicConfig.classes.map(c => 
                `<option value="${c.name}">${c.name}</option>`
            ).join('');

            listDiv.innerHTML = jamiaData.teachers.map(t => `
                <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 mb-4">
                    <div class="teacher-toggle flex justify-between items-center p-4 cursor-pointer bg-white" data-tid="${t.id}" data-jamia="${jamia}">
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-800">${t.name}</span>
                            <span class="text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded w-fit mt-1">CODE: ${t.loginCode}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <button class="edit-t-btn text-indigo-500 hover:text-indigo-700 p-2" data-tid="${t.id}" data-jamia="${jamia}"><i class="fas fa-edit"></i></button>
                            <button class="del-t-btn text-red-500 hover:text-red-700 p-2" data-tid="${t.id}" data-jamia="${jamia}"><i class="fas fa-trash-alt"></i></button>
                            <i class="fas fa-chevron-down text-slate-400 transition-transform"></i>
                        </div>
                    </div>
                    <div class="period-container hidden p-5 bg-white border-t border-slate-100 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 bg-emerald-50/50 p-4 rounded-xl">
                            <select class="p-class p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500">
                                <option value="">Select Class</option>
                                ${classOptions}
                            </select>
                            
                            <select class="p-book p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500" disabled>
                                <option value="">Select Subject</option>
                            </select>

                            <select class="p-sem p-2 border rounded-lg text-sm"><option value="1">Sem 1</option><option value="2">Sem 2</option></select>
                            <input type="number" placeholder="Pages" class="p-pages p-2 border rounded-lg text-sm">
                            <button class="save-period-btn bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold" data-tid="${t.id}" data-jamia="${jamia}">Add Period</button>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="w-full text-[10px] border-collapse">
                                <thead><tr class="bg-slate-50 text-slate-400 uppercase font-black"><th class="p-2 border">Class</th><th class="p-2 border">Book/Subject</th><th class="p-2 border">Sem</th><th class="p-2 border">Pages</th><th class="p-2 border">Action</th></tr></thead>
                                <tbody>
                                    ${(t.periods || []).map(p => `
                                        <tr class="border-b hover:bg-slate-50">
                                            <td class="p-2 border">${p.className}</td>
                                            <td class="p-2 border">${p.bookName}</td>
                                            <td class="p-2 border text-center font-bold text-blue-600">${p.semester}</td>
                                            <td class="p-2 border text-center font-black">${p.totalPages}</td>
                                            <td class="p-2 border text-center">
                                                <button class="del-period-btn text-red-500" data-pid="${p.id}" data-tid="${t.id}" data-jamia="${jamia}"><i class="fas fa-times-circle"></i></button>
                                            </td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`).join('');
            
            // Link Change Event attach karein
            attachDropdownEvents(listDiv, academicConfig);
            attachTeacherEvents(listDiv, db, currentUser, jamiaat);
        });
    } catch (e) { console.error(e); }
};

const attachDropdownEvents = (container, config) => {
    container.querySelectorAll('.teacher-toggle').forEach(toggle => {
        const parent = toggle.nextElementSibling; // period-container
        const classSelect = parent.querySelector('.p-class');
        const bookSelect = parent.querySelector('.p-book');

        classSelect.onchange = () => {
            const selectedClass = classSelect.value;
            bookSelect.innerHTML = `<option value="">Select Subject</option>`;
            
            if (selectedClass) {
                const classData = config.classes.find(c => c.name === selectedClass);
                if (classData && classData.subjects) {
                    classData.subjects.forEach(sub => {
                        bookSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
                    });
                    bookSelect.disabled = false;
                }
            } else {
                bookSelect.disabled = true;
            }
        };
    });
};

const attachTeacherEvents = (container, db, currentUser, jamiaat) => {
    container.querySelectorAll('.teacher-toggle').forEach(toggle => {
        toggle.onclick = (e) => {
            if (e.target.closest('button')) return;
            toggle.nextElementSibling.classList.toggle('hidden');
            toggle.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
        };
    });

    container.querySelectorAll('.edit-t-btn').forEach(btn => {
        btn.onclick = async () => {
            const tid = btn.dataset.tid;
            const jamiaName = btn.dataset.jamia;
            const safeId = jamiaName.replace(/\s+/g, '');
            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            const structure = userSnap.data().academicYears["2025-2026"].karkardagiStructure;
            const teacher = structure.find(j => j.jamiaName === jamiaName).teachers.find(t => t.id === tid);

            if (teacher) {
                document.getElementById(`name-${safeId}`).value = teacher.name;
                document.getElementById(`ajeer-${safeId}`).value = teacher.loginCode;
                document.getElementById(`contact-${safeId}`).value = teacher.contact || "";
                document.getElementById(`level-${safeId}`).value = teacher.levelQualified || "";
                document.getElementById(`h-qual-${safeId}`).value = teacher.highestQualification || "";
                document.getElementById(`mail-${safeId}`).value = teacher.mailId || "";
                document.getElementById(`exp-${safeId}`).value = teacher.experience || "";
                document.getElementById(`spec-${safeId}`).value = teacher.specialization || "";
                document.getElementById(`t-period-${safeId}`).value = teacher.teachingPeriod || "";
                document.getElementById(`ijara-${safeId}`).value = teacher.ijaraStatus || "";

                const saveBtn = document.querySelector(`button[data-jamia-name="${jamiaName}"]`);
                saveBtn.innerText = "Update Teacher Profile";
                saveBtn.dataset.editMode = tid;
                document.getElementById(`name-${safeId}`).focus();
            }
        };
    });

    container.querySelectorAll('.del-t-btn').forEach(btn => {
        btn.onclick = async () => {
            const tid = btn.dataset.tid;
            const jamiaName = btn.dataset.jamia;
            if (!confirm("Delete this teacher?")) return;
            await updateTeacherData(db, currentUser, jamiaName, (teachers) => teachers.filter(t => t.id !== tid));
            loadAllTeachers(jamiaat, db, currentUser);
        };
    });

    container.querySelectorAll('.save-period-btn').forEach(btn => {
        btn.onclick = async () => {
            const panel = btn.closest('.period-container');
            const tid = btn.dataset.tid;
            const jamiaName = btn.dataset.jamia;
            const className = panel.querySelector('.p-class').value;
            const bookName = panel.querySelector('.p-book').value;
            const semester = panel.querySelector('.p-sem').value;
            const totalPages = panel.querySelector('.p-pages').value;

            if (!className || !bookName || !totalPages) return alert("Fill all details.");

            const newPeriod = { id: `p-${Date.now()}`, className, bookName, semester, totalPages: parseInt(totalPages) };
            await updateTeacherData(db, currentUser, jamiaName, (teachers) => {
                const t = teachers.find(teach => teach.id === tid);
                if (t) { if (!t.periods) t.periods = []; t.periods.push(newPeriod); }
                return teachers;
            });
            loadAllTeachers(jamiaat, db, currentUser);
        };
    });

    container.querySelectorAll('.del-period-btn').forEach(btn => {
        btn.onclick = async () => {
            const pid = btn.dataset.pid;
            const tid = btn.dataset.tid;
            const jamiaName = btn.dataset.jamia;
            if (!confirm("Delete this period?")) return;
            await updateTeacherData(db, currentUser, jamiaName, (teachers) => {
                const t = teachers.find(teach => teach.id === tid);
                if (t) t.periods = t.periods.filter(p => p.id !== pid);
                return teachers;
            });
            loadAllTeachers(jamiaat, db, currentUser);
        };
    });
};

async function updateTeacherData(db, currentUser, jamiaName, updateFn) {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    let userData = userSnap.data();
    let academicYears = userData.academicYears || {};
    let structure = academicYears["2025-2026"].karkardagiStructure;
    let jamiaData = structure.find(j => j.jamiaName === jamiaName);
    if (jamiaData) { jamiaData.teachers = updateFn(jamiaData.teachers); await updateDoc(userRef, { academicYears }); }
}

const loadPerformanceTable = async (jamiaat, db, currentUser) => {
    const tbody = document.getElementById('performance-table-body');
    const selectedMonth = document.getElementById('report-month').value;
    
    // Admin configuration se active year uthayein
    const config = await getAcademicConfig(db); 
    if (!config) return;

    const activeYear = config.activeYear; // e.g., "2025-2026"
    
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    // Sirf active saal ka data filter karein
    const karkardagi = userSnap.data().academicYears?.[activeYear]?.karkardagiStructure || [];

    let html = "";
    jamiaat.forEach(jamiaName => {
        const jamiaData = karkardagi.find(j => j.jamiaName === jamiaName);
        if (!jamiaData) return;

        jamiaData.teachers.forEach(teacher => {
            // Check karein ke teacher ke periods hain ya nahi
            if (!teacher.periods || teacher.periods.length === 0) return;

            teacher.periods.forEach((p, idx) => {
                // Target calculate karein
                const semDays = p.semester == "1" ? sem1Total : sem2Total;
                const workingDays = p.semester == "1" ? monthData.s1 : monthData.s2;
                const target = Math.round((p.totalPages / semDays) * workingDays) || 0;

                html += `
                    <tr class="border-b border-slate-100">
                        ${idx === 0 ? `<td rowspan="${teacher.periods.length}" class="p-4 font-bold text-slate-800 bg-slate-50/50">${teacher.name}</td>` : ''}
                        <td class="p-4">${p.className}</td>
                        <td class="p-4">${p.bookName}</td>
                        <td class="p-4 text-center">${p.totalPages}</td>
                        <td class="p-4 text-center font-bold text-indigo-600">${target}</td>
                        <td class="p-4 text-center">0</td>
                        <td class="p-4 text-center uppercase text-[10px] font-bold text-red-500">Pending</td>
                    </tr>
                `;
            });
        });
    });

    tbody.innerHTML = html || '<tr><td colspan="11" class="p-10 text-center">No data found for year ' + activeYear + '</td></tr>';
};

window.openPerformanceForm = (id, name) => {
    const month = document.getElementById('report-month').value;
    const url = `academic-monthly-performance.html?jamiaId=${id}&jamiaName=${encodeURIComponent(name)}&month=${month}`;
    window.open(url, '_blank');
};

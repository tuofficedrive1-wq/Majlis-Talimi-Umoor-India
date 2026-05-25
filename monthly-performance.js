import { 
    doc, 
    getDoc,
    updateDoc,
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let academicConfig = null;
let gDb = null;
let gCurrentUser = null;
const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
let gAssignedJamiaat = [];

// Current month default set rahega
let currentSelectedMonth = monthNames[new Date().getMonth()]; 

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

export const renderPerformanceTab = (assignedJamiaat, currentUser, db) => {
    gDb = db;
    gCurrentUser = currentUser;
    gAssignedJamiaat = assignedJamiaat;

    const injectEditModal = () => {
        if (document.getElementById('edit-period-modal')) return;

        const modalHTML = `
        <div id="edit-period-modal" class="fixed inset-0 bg-black/60 hidden z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-black text-indigo-950 text-lg">Edit Period Details</h3>
                    <button onclick="closePeriodModal()" class="h-8 w-8 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 flex items-center justify-center">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Class</label>
                        <select id="edit-p-class" class="w-full p-3 border rounded-2xl text-sm font-bold bg-slate-50 outline-none"></select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Subject</label>
                        <select id="edit-p-book" class="w-full p-3 border rounded-2xl text-sm font-bold bg-slate-50 outline-none"></select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Semester</label>
                            <select id="edit-p-sem" class="w-full p-3 border rounded-2xl text-sm font-bold bg-slate-50 outline-none">
                                <option value="1">Sem 1</option>
                                <option value="2">Sem 2</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Total Pages</label>
                            <input type="number" id="edit-p-pages" class="w-full p-3 border rounded-2xl text-sm font-bold bg-slate-50 outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Syllabus</label>
                        <select id="edit-p-syllabus" class="w-full p-3 border rounded-2xl text-sm font-bold bg-slate-50 outline-none">
                            <option value="Majlis">Majlis</option>
                            <option value="State">State</option>
                            <option value="Approval">Approval</option>
                        </select>
                    </div>
                    <button id="btn-update-period" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all mt-4">
                        Update Period Data
                    </button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    injectEditModal();
    
    const container = document.getElementById('performance-jamia-list');
    container.innerHTML = `
        <div class="mb-6">
            <div class="flex border-b border-slate-200 gap-4 overflow-x-auto">
                <button class="sub-tab-btn active border-b-2 border-indigo-600 px-4 py-2 text-sm font-bold text-indigo-600" data-sub="performance">Performance</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500" data-sub="summary">Summary</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500" data-sub="structure">Structure</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500" data-sub="profiles">Teacher Profile</button>
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
            btn.classList.remove('text-slate-500');
            
            const targetTab = btn.getAttribute('data-sub');
            renderSubTabContent(targetTab, gAssignedJamiaat, gCurrentUser, gDb);
        };
    });

    renderSubTabContent('performance', assignedJamiaat, currentUser, db);
};

const renderSubTabContent = async (tabName, assignedJamiaat, currentUser, db) => {
    const contentArea = document.getElementById('sub-tab-content');

if (tabName === 'performance') {
        // Agar HTML pehle se nahi bana hai toh hi render karenge (taaki table body destroy na ho)
        if (!document.getElementById('report-jamia')) {
            contentArea.innerHTML = `
                <div class="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm gap-4">
                    <div class="flex flex-col">
                        <h3 class="font-black text-indigo-950 text-lg">Performance Analytics</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Filter by Jamia (Month controlled by Main Dashboard)</p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3">
                        <div class="flex flex-col gap-1">
                            <label class="text-[9px] font-black text-slate-400 ml-2">SELECT JAMIA</label>
                            <select id="report-jamia" class="p-2.5 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200 min-w-[180px]">
                                <option value="all">All Jamiaat (Show All)</option>
                                ${assignedJamiaat.map(j => `<option value="${j}">${j}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div id="performance-table-body"></div>
            `;
        }

        const jamiaSelect = document.getElementById('report-jamia');
        if (jamiaSelect) {
            jamiaSelect.onchange = () => {
                loadPerformanceTable(assignedJamiaat, db, currentUser);
            };
        }
        
        // Pehli baar table load karte waqt main dashboard wala selected month hi use hoga
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

    } else if (tabName === 'profiles') {
        contentArea.innerHTML = `
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 class="font-black text-indigo-950 text-lg mb-4">Teacher Profile Directory</h3>
                <div id="profiles-table-container"></div>
            </div>
        `;
        loadTeacherProfilesTable(assignedJamiaat, db, currentUser); 
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
            getDoc(doc(db, "settings", "academic_admin_config")), 
            getDoc(doc(db, "users", currentUser.uid))
        ]);
        
        const academicConfig = configSnap.exists() ? configSnap.data() : { classes: [] };
        const structure = userSnap.data().academicYears?.[selectedYear]?.karkardagiStructure || [];
        
        jamiaat.forEach(jamia => {
            const safeId = jamia.replace(/\s+/g, '');
            const listDiv = document.getElementById(`list-${safeId}`);
            const jamiaData = structure.find(j => j.jamiaName === jamia);
            if (!listDiv || !jamiaData) return;

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
                                                        <input type="text"
                                   list="class-list-${t.id}"
                                   class="p-class p-2 border rounded-lg text-sm w-full"
                                   placeholder="Type or Select Class">
                            
                            <datalist id="class-list-${t.id}">
                                ${academicConfig.classes.map(c =>
                                    `<option value="${c.name}">`
                                ).join('')}
                            </datalist>
                            <select class="p-book p-2 border rounded-lg text-sm">
                                <option value="">Select Subject</option>
                            </select>
                            
                            <input type="text"
                                   class="custom-book hidden p-2 border rounded-lg text-sm"
                                   placeholder="Enter Custom Subject">
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
                                            <div class="flex justify-center gap-2">
                                                <button class="edit-period-btn text-indigo-500" 
                                                        data-pid="${p.id}" data-tid="${t.id}" data-jamia="${jamia}">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="del-period-btn text-red-500" 
                                                        data-pid="${p.id}" data-tid="${t.id}" data-jamia="${jamia}">
                                                    <i class="fas fa-times-circle"></i>
                                                </button>
                                            </div>
                                        </td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`).join('');
            
            attachDropdownEvents(listDiv, academicConfig);
            attachTeacherEvents(listDiv, db, currentUser, jamiaat, selectedYear);
        });
    } catch (e) { console.error("loadAllTeachers error:", e); }
};

const loadPerformanceTable = async (jamiaat, db, currentUser) => {
    try {
        const [targetSnap, calSnap, userSnap] = await Promise.all([
            getDoc(doc(db, "settings", "monthly_page_targets")),
            getDoc(doc(db, "settings", "academic_calendar")),
            getDoc(doc(db, "users", currentUser.uid))
        ]);

        const monthlyTargets = targetSnap.exists() ? (targetSnap.data().targets || {}) : {};
        const container = document.getElementById('performance-table-body');
        if (!container) return; 

        const jamiaSelectElem = document.getElementById('report-jamia');
        const selectedJamia = jamiaSelectElem ? jamiaSelectElem.value : "all";
        
        const activeYear = calSnap.exists() ? (calSnap.data().activeYear || "2026-2027") : "2026-2027";
        const userData = userSnap.data() || {};
        const academicYears = userData.academicYears || {};

        if(!academicYears[activeYear]){
            console.error("Academic Year Missing:", activeYear);
            container.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">Academic Year Data Missing</div>`;
            return;
        }

        const karkardagi = academicYears[activeYear]?.karkardagiStructure || [];
        const filteredJamiaat = selectedJamia === "all" ? jamiaat : jamiaat.filter(j => j === selectedJamia);
        const targetMonthKey = (currentSelectedMonth || "").toLowerCase().trim();
        
        // Formats check karne ke liye (may aur 2026-05 dono)
        const currentYearMonthPrefix = `${activeYear.split('-')[0]}-${monthNames.indexOf(targetMonthKey) + 1 < 10 ? '0' + (monthNames.indexOf(targetMonthKey) + 1) : monthNames.indexOf(targetMonthKey) + 1}`;

        let html = "";

        for (const jamiaName of filteredJamiaat) {
            const jamiaData = karkardagi.find(j => j.jamiaName === jamiaName);
            if (!jamiaData) continue;

            const safeId = jamiaName.replace(/\s+/g, '');
            const match = jamiaName.match(/\d+/);
            const jamiaDocId = match ? match[0] : "001";
            
            // Public collection se data fetch kiya backup ke liye
            const publicPerfSnap = await getDoc(doc(db, "academic_performance", jamiaDocId));
            let publicMonthData = null;
            if (publicPerfSnap.exists()) {
                publicMonthData = publicPerfSnap.data()[targetMonthKey] || publicPerfSnap.data()[currentYearMonthPrefix] || null;
            }

            html += `
            <div class="bg-white rounded-3xl border border-slate-200 shadow-sm mb-8 overflow-hidden jamia-card" id="card-${safeId}">
                <div class="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 class="font-black text-indigo-950 text-xl">${jamiaName}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monthly Performance Analytics</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="copyTeacherFormLink('${jamiaName}')" class="bg-white border border-slate-200 text-slate-700 text-[11px] px-3 py-2 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm"><i class="fas fa-link mr-1 text-indigo-500"></i> Link</button>
                        <button onclick="downloadJamiaImage('${jamiaName}')" class="bg-white border border-slate-200 text-slate-700 text-[11px] px-3 py-2 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm"><i class="fas fa-image mr-1 text-rose-500"></i> Image</button>
                        <button onclick="downloadJamiaExcel('${jamiaName}')" class="bg-white border border-slate-200 text-slate-700 text-[11px] px-3 py-2 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm"><i class="fas fa-file-excel mr-1 text-emerald-500"></i> Excel</button>
                        <button onclick="toggleEditMode('${jamiaName}')" class="edit-btn-${safeId} bg-indigo-600 text-white text-[11px] px-4 py-2 rounded-xl hover:bg-indigo-700 shadow-md transition font-bold"><i class="fas fa-edit mr-1"></i> Edit</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black">
                            <tr>
                                <th class="p-4 border-b">Teacher</th>
                                <th class="p-4 border-b">Class</th>
                                <th class="p-4 border-b">Subject</th>
                                <th class="p-4 border-b text-center">Total</th>
                                <th class="p-4 border-b text-center text-indigo-600">Target</th>
                                <th class="p-4 border-b text-center">Achieved</th>
                                <th class="p-4 border-b text-center">%</th>
                                <th class="p-4 border-b text-center">Kaifiyat</th>
                            </tr>
                        </thead>
                        <tbody>`;

            jamiaData.teachers.forEach((teacher) => {
                const publicTeacher = publicMonthData?.teachers?.find(t => t.name.toLowerCase() === teacher.name.toLowerCase());

                teacher.periods?.forEach((p, pIdx) => {
                    let target = 0;
                    const subId = `${(p.className || "").trim()}_${(p.bookName || "").trim()}`.replace(/\s+/g, '_');

                    if (monthlyTargets && monthlyTargets[subId] && monthlyTargets[subId][targetMonthKey] !== undefined) {
                        target = parseInt(monthlyTargets[subId][targetMonthKey]) || 0;
                    }
                    
                    let achievedValue = 0;

                    // --- PRIORITY LOGIC: Pehle Inspector ka khud ka saved data users structure se check karenge ---
                    if (p.achieved && p.achieved[currentYearMonthPrefix] !== undefined) {
                        achievedValue = p.achieved[currentYearMonthPrefix];
                    } else if (p.achieved && p.achieved[targetMonthKey] !== undefined) {
                        achievedValue = p.achieved[targetMonthKey];
                    } 
                    // Fallback: Agar users me nahi mila toh public performance collection se uthayenge
                    else if (publicTeacher && publicTeacher.periods_detail) {
                        const matchedPeriodKey = Object.keys(publicTeacher.periods_detail).find(key => {
                            const detail = publicTeacher.periods_detail[key];
                            return detail.class === p.className && detail.subject === p.bookName;
                        });
                        if (matchedPeriodKey) {
                            achievedValue = publicTeacher.periods_detail[matchedPeriodKey].page_to || 0;
                        }
                    }

                    const percentage = target > 0 ? Math.round((achievedValue / target) * 100) : 0;
                    const result = calculateKaifiyatAndStyle(percentage, targetMonthKey, p.semester);

                    html += `
                        <tr class="border-b hover:bg-slate-50/50">
                            <td class="p-4 font-bold text-slate-800">${pIdx === 0 ? teacher.name : ''}</td>
                            <td class="p-4 text-slate-600">${p.className}</td>
                            <td class="p-4 text-slate-600">${p.bookName}</td>
                            <td class="p-4 text-center text-slate-600">${p.totalPages}</td>
                            <td class="p-4 text-center font-bold text-indigo-600 bg-indigo-50/30">${target}</td>
                            <td class="p-4 text-center">
                                <input type="number" value="${achievedValue}" disabled 
                                       data-tid="${teacher.id}" data-pid="${p.id}"
                                       class="achieved-input-${safeId} w-16 p-1.5 border rounded-lg text-center bg-transparent"
                                       oninput="updateRowStatusLive(this, ${target}, '${targetMonthKey}', '${p.semester}')">
                            </td>
                            <td class="p-4 text-center font-black text-slate-700 perc-cell">${percentage}%</td>
                            <td class="p-4 text-center italic status-cell ${result.colorClass}">${result.kaifiyat}</td>
                        </tr>`;
                });
            });
            html += `</tbody></table></div></div>`;
        }
        container.innerHTML = html || '<div class="p-10 text-center text-slate-400">Data nahi mila.</div>';
    } catch (e) {
        console.error("Load Error:", e);
    }
};

function getSemesterMonthNumber(monthId, semester) {
    const s1Map = { "apr": 1, "may": 2, "jun": 3, "jul": 4, "aug": 5 }; 
    const s2Map = { "sep": 1, "oct": 2, "nov": 3, "dec": 4, "jan": 5, "feb": 6, "mar": 7 }; 
    
    if (semester == "1" || semester === 1) return s1Map[monthId] || 0;
    return s2Map[monthId] || 0;
}

const calculateKaifiyatAndStyle = (achievement, monthIdx, semester) => {
    let kaifiyat = "Munasib"; 
    let colorClass = "text-red-600 font-bold";
    
    const monthNumber = getSemesterMonthNumber(monthIdx, semester);
    
    if (monthNumber === 1) { 
        if (achievement >= 70) kaifiyat = "Mumtaz";
        else if (achievement >= 60) kaifiyat = "Behtar";
    } 
    else if (monthNumber === 2) { 
        if (achievement >= 80) kaifiyat = "Mumtaz";
        else if (achievement >= 70) kaifiyat = "Behtar";
    } 
    else if (monthNumber >= 3 && monthNumber < 5) { 
        if (achievement >= 100) kaifiyat = "Mumtaz";
        else if (achievement >= 90) kaifiyat = "Behtar";
    } 
    else if (monthNumber === 5) { 
        if (achievement >= 90) kaifiyat = "Mumtaz";
        else if (achievement >= 80) kaifiyat = "Behtar";
    }

    if (kaifiyat === "Mumtaz") {
        if (achievement > 150) kaifiyat = "Munasib";
        else if (achievement >= 121) kaifiyat = "Behtar";
    }

    if (kaifiyat === "Mumtaz") colorClass = "text-emerald-600 font-black";
    else if (kaifiyat === "Behtar") colorClass = "text-blue-600 font-bold";
    else colorClass = "text-red-600 font-bold";

    return { kaifiyat, colorClass };
};

const attachDropdownEvents = (container, config) => {

    container.querySelectorAll('.p-class').forEach(sel => {

        sel.oninput = () => {

            const wrapper = sel.parentElement;

            const bookSel = wrapper.querySelector('.p-book');

            const customBook = wrapper.querySelector('.custom-book');

            bookSel.innerHTML = `<option value="">Select Subject</option>`;

            const classData = config.classes.find(c => c.name === sel.value);

            if (classData?.subjects) {

                classData.subjects.forEach(sub => {

                    bookSel.innerHTML += `
                        <option value="${sub}">
                            ${sub}
                        </option>
                    `;
                });

                // OTHER OPTION
                bookSel.innerHTML += `
                    <option value="other">Other</option>
                `;

                bookSel.disabled = false;

            } else {

                bookSel.innerHTML += `
                    <option value="other">Other</option>
                `;

                bookSel.disabled = false;
            }

            // Subject change
            bookSel.onchange = () => {

                if (bookSel.value === 'other') {

                    customBook.classList.remove('hidden');

                } else {

                    customBook.classList.add('hidden');
                }
            };
        };
    });
};

const attachTeacherEvents = (container, db, currentUser, jamiaat, selectedYear) => {
    container.querySelectorAll('.teacher-toggle').forEach(toggle => {
        toggle.onclick = (e) => {
            if (e.target.closest('.edit-t-btn') || e.target.closest('.del-t-btn')) return; 
            toggle.nextElementSibling.classList.toggle('hidden');
            toggle.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
        };
    });

    container.querySelectorAll('.edit-t-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const tid = btn.dataset.tid;
            const jamiaName = btn.dataset.jamia;
            const safeId = jamiaName.replace(/\s+/g, '');

            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            const structure = userSnap.data().academicYears?.[selectedYear]?.karkardagiStructure || [];
            const jamiaData = structure.find(j => j.jamiaName === jamiaName);
            const teacher = jamiaData?.teachers.find(t => t.id === tid);

            if (teacher) {
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

                const saveBtn = document.querySelector(`.save-teacher-btn[data-jamia-name="${jamiaName}"]`);
                if (saveBtn) {
                    saveBtn.innerText = "Update Teacher Profile";
                    saveBtn.dataset.editMode = tid;
                    saveBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
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

    container.querySelectorAll('.save-period-btn').forEach(btn => {
        btn.onclick = async () => {
            const tid = btn.dataset.tid;
            const jamiaName = btn.dataset.jamia;
            const card = document.getElementById(`teacher-card-${tid}`);
            
            const className = card.querySelector('.p-class').value;
            let bookName = card.querySelector('.p-book').value;

            if (bookName === 'other') {
                bookName = card.querySelector('.custom-book').value.trim();
            }
            const semester = card.querySelector('.p-sem').value;
            const totalPages = card.querySelector('.p-pages').value;
            const syllabus = card.querySelector('.p-syllabus').value;

            if (!className || !bookName || !totalPages) {
                return alert("Class, Subject aur Total Pages bharna zaroori hai!");
            }

            btn.disabled = true;
            btn.innerText = "Adding...";

            try {
                await updateTeacherData(db, currentUser, jamiaName, selectedYear, (teachers) => {
                    const t = teachers.find(teach => teach.id === tid);
                    if (t) {
                        if (!t.periods) t.periods = [];
                        t.periods.push({
                            id: `p-${Date.now()}`,
                            className, bookName, semester,
                            totalPages: parseInt(totalPages), syllabus
                        });
                    }
                    return teachers;
                });

                alert("Period Successfully Added!");
                const tbody = card.querySelector('tbody');

                    tbody.insertAdjacentHTML('beforeend', `
                    <tr class="border-b">
                        <td class="p-2 border">${className}</td>
                        <td class="p-2 border">${bookName}</td>
                        <td class="p-2 border text-center">${semester}</td>
                        <td class="p-2 border text-center font-bold">${totalPages}</td>
                        <td class="p-2 border text-center text-indigo-600 font-bold">${syllabus}</td>
                        <td class="p-2 border text-center">
                            <div class="flex justify-center gap-2">
                                <button class="text-indigo-500">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="text-red-500">
                                    <i class="fas fa-times-circle"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    `);
                // sirf fields reset hongi, section close nahi hoga
                card.querySelector('.p-book').innerHTML = `<option value="">Select Subject</option>`;
                card.querySelector('.p-book').disabled = true;
                
                card.querySelector('.p-class').value = "";
                card.querySelector('.p-sem').value = "1";
                card.querySelector('.p-pages').value = "";
                card.querySelector('.p-syllabus').value = "Majlis";
            } catch (e) {
                alert("Error adding period: " + e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Add Period";
            }
        };
    });

    window.closePeriodModal = () => document.getElementById('edit-period-modal').classList.add('hidden');

    container.querySelectorAll('.edit-period-btn').forEach(btn => {
        btn.onclick = async () => {
            const { pid, tid, jamia } = btn.dataset;
            
            const [configSnap, userSnap] = await Promise.all([
                getDoc(doc(db, "settings", "academic_admin_config")),
                getDoc(doc(db, "users", currentUser.uid))
            ]);

            if (!configSnap.exists()) return alert("Config not found!");

            const currentConfig = configSnap.data();
            const structure = userSnap.data().academicYears?.[selectedYear]?.karkardagiStructure || [];
            const jamiaData = structure.find(j => j.jamiaName === jamia);
            const teacher = jamiaData?.teachers.find(t => t.id === tid);
            const period = teacher?.periods.find(p => p.id === pid);

            if (!period) return alert("Period not found!");

            const classSelect = document.getElementById('edit-p-class');
            const bookSelect = document.getElementById('edit-p-book');
            const updateBtn = document.getElementById('btn-update-period');

            classSelect.innerHTML = currentConfig.classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            classSelect.value = period.className;

            const loadBooks = (val) => {
                const cls = currentConfig.classes.find(c => c.name === val);
                bookSelect.innerHTML = cls ? cls.subjects.map(s => `<option value="${s}">${s}</option>`).join('') : '';
            };
            loadBooks(period.className);
            bookSelect.value = period.bookName;
            classSelect.onchange = (e) => loadBooks(e.target.value);

            document.getElementById('edit-p-sem').value = period.semester;
            document.getElementById('edit-p-pages').value = period.totalPages;
            document.getElementById('edit-p-syllabus').value = period.syllabus || 'Majlis';

            updateBtn.onclick = async () => {
                updateBtn.disabled = true;
                updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

                const updatedObj = {
                    id: pid,
                    className: classSelect.value,
                    bookName: bookSelect.value,
                    semester: document.getElementById('edit-p-sem').value,
                    totalPages: parseInt(document.getElementById('edit-p-pages').value),
                    syllabus: document.getElementById('edit-p-syllabus').value
                };

                try {
                    await updateTeacherData(db, currentUser, jamia, selectedYear, (teachers) => {
                        const tIndex = teachers.findIndex(teach => teach.id === tid);
                        if (tIndex > -1) {
                            const pIndex = teachers[tIndex].periods.findIndex(p => p.id === pid);
                            if (pIndex > -1) teachers[tIndex].periods[pIndex] = updatedObj;
                        }
                        return teachers;
                    });

                    closePeriodModal();
                    loadAllTeachers(jamiaat || gAssignedJamiaat, db, currentUser, selectedYear); 
                    alert("Data Updated!");
                } catch (err) {
                    alert("Error: " + err.message);
                } finally {
                    updateBtn.disabled = false;
                    updateBtn.innerText = 'Update Period Data';
                }
            };

            document.getElementById('edit-period-modal').classList.remove('hidden');
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

window.updateRowStatusLive = (input, target, monthId, semester) => {
    const row = input.closest('tr');
    const achieved = parseInt(input.value) || 0;
    const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;
    
    const percCell = row.querySelector('.perc-cell');
    const statusCell = row.querySelector('.status-cell');
    
    if (percCell) percCell.textContent = percentage + "%";
    
    if (statusCell) {
        const result = calculateKaifiyatAndStyle(percentage, monthId, semester);
        statusCell.textContent = result.kaifiyat;
        statusCell.className = `p-4 text-center italic status-cell ${result.colorClass}`;
    }
};

window.toggleEditMode = async (jamiaName) => {
    const safeId = jamiaName ? jamiaName.replace(/\s+/g, '') : 'id';
    const inputs = document.querySelectorAll(`.achieved-input-${safeId}`);
    const btn = document.querySelector(`.edit-btn-${safeId}`);

    if (!inputs || inputs.length === 0) return;
    const isLocked = inputs[0].disabled;

    const monthSelect = document.getElementById('report-month');
    const savingMonthId = (monthSelect && monthSelect.value) ? monthSelect.value : (currentSelectedMonth || "apr");

    if (isLocked) {
        inputs.forEach(inp => {
            inp.disabled = false;
            inp.style.backgroundColor = "white";
            inp.style.border = "1px solid #6366f1";
        });
        btn.innerHTML = `<i class="fas fa-save mr-1"></i> Save`;
        btn.style.backgroundColor = "#10b981"; 
    } else {
        btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Saving...`;
        btn.disabled = true;
        
        try {
            const databaseInstance = gDb;
            const userInstance = gCurrentUser;

            if (!databaseInstance || !userInstance) {
                throw new Error("Database ya User session nahi mila. Please page refresh karein.");
            }

            const calSnap = await getDoc(doc(databaseInstance, "settings", "academic_calendar"));
            const activeYear = calSnap.exists() ? calSnap.data().activeYear : "2026-2027";

            const userRef = doc(databaseInstance, "users", userInstance.uid);
            const userSnap = await getDoc(userRef);
            
            let userData = userSnap.exists() ? userSnap.data() : {};
            let academicYears = userData.academicYears || {};
            
            if (!academicYears[activeYear]) {
                academicYears[activeYear] = { karkardagiStructure: [] };
            }
            
            let structure = academicYears[activeYear].karkardagiStructure;
            let jamiaData = structure.find(j => j.jamiaName === jamiaName);

            if (jamiaData) {
                // Jamia ID nikalenge Public Performance document update karne ke liye
                const match = jamiaName.match(/\d+/);
                const jamiaDocId = match ? match[0] : "001";
                const perfDocRef = doc(databaseInstance, "academic_performance", jamiaDocId);
                const perfSnap = await getDoc(perfDocRef);
                let currentPerfData = perfSnap.exists() ? perfSnap.data() : {};

                // Map banayenge Teacher-wise periods detail ko public collection ke liye format karne ke liye
                let teacherUpdatesMap = {};

                inputs.forEach(inp => {
                    const tid = inp.dataset.tid;
                    const pid = inp.dataset.pid;
                    const val = parseInt(inp.value) || 0;

                    const teacher = jamiaData.teachers.find(t => t.id === tid);
                    if (teacher) {
                        const period = teacher.periods.find(p => p.id === pid);
                        if (period) {
                            if (!period.achieved) period.achieved = {};
                            period.achieved[savingMonthId] = val; 
                            
                            if (!period.locked) period.locked = {};
                            period.locked[savingMonthId] = true; 

                            // Public collection ke format mein store karne ke liye temp array
                            if (!teacherUpdatesMap[teacher.name]) {
                                teacherUpdatesMap[teacher.name] = [];
                            }
                            teacherUpdatesMap[teacher.name].push({
                                className: period.className,
                                bookName: period.bookName,
                                page_to: val
                            });
                        }
                    }
                });

                // 1. Inspector Dashboard Structure update kiya (users collection)
                await updateDoc(userRef, { academicYears: academicYears });

                // 2. Public Form Structure update kiya (academic_performance collection)
                let monthSection = currentPerfData[savingMonthId] || { teachers: [] };
                let updatedPublicTeachers = monthSection.teachers || [];

                Object.keys(teacherUpdatesMap).forEach(tName => {
                    let periodsDetailMap = {};
                    teacherUpdatesMap[tName].forEach((pObj, idx) => {
                        periodsDetailMap[`period_${idx + 1}`] = {
                            class: pObj.className,
                            subject: pObj.bookName,
                            page_from: 0,
                            page_to: pObj.page_to
                        };
                    });

                    // Purane data ko remove karke naya modified entry daalenge
                    updatedPublicTeachers = updatedPublicTeachers.filter(t => t.name.toLowerCase() !== tName.toLowerCase());
                    updatedPublicTeachers.push({
                        name: tName,
                        designation: "Teacher",
                        periods_detail: periodsDetailMap
                    });
                });

                currentPerfData[savingMonthId] = {
                    teachers: updatedPublicTeachers,
                    updated_at: new Date().toISOString()
                };

                await setDoc(perfDocRef, currentPerfData, { merge: true });
                
                inputs.forEach(inp => {
                    inp.disabled = true;
                    inp.style.backgroundColor = "transparent";
                    inp.style.border = "1px solid transparent";
                });
                
                btn.innerHTML = `<i class="fas fa-edit mr-1"></i> Edit`;
                btn.style.backgroundColor = "#4f46e5"; 
                btn.disabled = false;
                
                alert(`MashaAllah! ${savingMonthId.toUpperCase()} mahine ka data final save aur lock ho gaya hai.`);
                loadPerformanceTable(gAssignedJamiaat, databaseInstance, userInstance);
            }
        } catch (err) {
            console.error("Save Error:", err);
            alert("Error saving data: " + err.message);
            btn.innerHTML = `<i class="fas fa-save mr-1"></i> Save`;
            btn.style.backgroundColor = "#10b981";
            btn.disabled = false;
        }
    }
};

const getSafeId = (name) => name ? name.replace(/\s+/g, '') : 'id';

window.copyTeacherFormLink = async (jamiaName) => {

    try {

        const monthIdx =
        document.getElementById('report-month').value;

        const baseUrl =
        window.location.origin +
        window.location.pathname.replace(
            'academic-inspector.html',
            ''
        );

        const inspectorId =
        gCurrentUser ? gCurrentUser.uid : 'anonymous';

        // ADMIN ACTIVE YEAR FETCH
        const calSnap = await getDoc(
            doc(gDb, "settings", "academic_calendar")
        );

        let activeYear = "2026-2027";

        if(calSnap.exists()){

            activeYear =
            calSnap.data().activeYear || "2026-2027";

        }

        const url =
`${baseUrl}academic-monthly-performance.html?jamiaName=${encodeURIComponent(jamiaName)}&monthIndex=${monthIdx}&userId=${inspectorId}&activeYear=${activeYear}`;

        navigator.clipboard.writeText(url);

        alert(`
Teacher Form Link Copied

Year:
${activeYear}
        `);

    } catch(error){

        console.error(error);
        alert("Link generate error");

    }

};
window.downloadJamiaImage = (jamiaName) => {
    const safeId = getSafeId(jamiaName);
    const card = document.getElementById(`card-${safeId}`);

    if (!card) return alert("Card element nahi mila!");
    if (typeof html2canvas === 'undefined') return alert("html2canvas library load nahi hui!");

    html2canvas(card, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${jamiaName}_Performance.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
};

window.downloadJamiaExcel = (jamiaName) => {
    const safeId = getSafeId(jamiaName);
    const card = document.getElementById(`card-${safeId}`);
    const table = card ? card.querySelector("table") : null;

    if (!table) return alert("Table nahi mili!");

    let csv = [];
    const rows = table.querySelectorAll("tr");
    
    rows.forEach(row => {
        const cols = row.querySelectorAll("td, th");
        const rowData = Array.from(cols)
            .map(col => `"${col.innerText.trim().replace(/"/g, '""')}"`)
            .join(",");
        csv.push(rowData);
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${jamiaName}_Monthly_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const loadTeacherProfilesTable = async (jamiaat, db, currentUser) => {
    const container = document.getElementById('profiles-table-container');
    if (!container) return;

    const config = await getAcademicConfig(db);
    const selectedYear = config ? config.activeYear : "2026-2027";

    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const structure = userSnap.data().academicYears?.[selectedYear]?.karkardagiStructure || [];

    let html = "";
    jamiaat.forEach(jamia => {
        const jamiaData = structure.find(j => j.jamiaName === jamia);
        if (!jamiaData || jamiaData.teachers.length === 0) return;

        html += `
        <div class="mb-10">
            <div class="flex items-center gap-3 mb-4 bg-indigo-50 p-3 rounded-2xl w-fit">
                <i class="fas fa-university text-indigo-600"></i>
                <h4 class="font-black text-indigo-950 uppercase tracking-wide text-sm">${jamia}</h4>
            </div>
            <div class="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm bg-white">
                <table class="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                        <tr class="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                            <th class="p-4">Name & Code</th>
                            <th class="p-4">Contact & Mail</th>
                            <th class="p-4">Level & Qualification</th>
                            <th class="p-4">Exp & Specialization</th>
                            <th class="p-4 text-center">Periods</th>
                            <th class="p-4">Ijara Status</th>
                        </tr>
                    </thead>
                    <tbody class="text-[11px]">
                        ${jamiaData.teachers.map(t => `
                            <tr class="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                <td class="p-4">
                                    <div class="font-black text-slate-800 text-sm">${t.name}</div>
                                    <div class="text-indigo-600 font-bold mt-1 uppercase">ID: ${t.loginCode}</div>
                                </td>
                                <td class="p-4">
                                    <div class="text-slate-700 font-bold"><i class="fas fa-phone-alt mr-1 text-[9px] text-slate-400"></i> ${t.contact || '-'}</div>
                                    <div class="text-slate-400 mt-1 italic">${t.mailId || '-'}</div>
                                </td>
                                <td class="p-4">
                                    <div class="text-slate-700 font-bold text-xs">${t.levelQualified || '-'}</div>
                                    <div class="text-slate-500 mt-1">${t.highestQualification || '-'}</div>
                                </td>
                                <td class="p-4">
                                    <div class="text-slate-700 font-bold">${t.experience || '-'} Exp</div>
                                    <div class="text-indigo-500 mt-1 font-medium">${t.specialization || '-'}</div>
                                </td>
                                <td class="p-4 text-center">
                                    <span class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-black text-[10px]">
                                        ${t.teachingPeriod || '0'}
                                    </span>
                                </td>
                                <td class="p-4">
                                    <span class="px-2 py-1 rounded-lg font-bold border ${t.ijaraStatus?.toLowerCase().includes('yes') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}">
                                        ${t.ijaraStatus || '-'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    });

    container.innerHTML = html || `
        <div class="p-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <i class="fas fa-user-slash text-4xl text-slate-300 mb-4"></i>
            <p class="text-slate-500 font-bold">Abhi koi teacher register nahi kiya gaya hai.</p>
        </div>
    `;
};

// Yeh function main dashboard call karega jab bhi wahan month change hoga
// Dashboard se connected handler function (Updated with Safety Check)
export const handleDashboardMonthChange = (newMonth, assignedJamiaat, db, currentUser) => {
    currentSelectedMonth = newMonth.toLowerCase().trim();
    console.log("Performance Tab Synced with Dashboard Month:", currentSelectedMonth);
    
    // Global variables ko safe rakhne ke liye backup parameters set kar rahe hain
    if (assignedJamiaat) gAssignedJamiaat = assignedJamiaat;
    if (db) gDb = db;
    if (currentUser) gCurrentUser = currentUser;

    // CRITICAL SAFETY CHECK: Agar user abhi main dashboard par hai aur performance tab khula hi nahi hai,
    // toh table load nahi chalayenge, varna loader hamesha ghumta rahega.
    const tableBody = document.getElementById('performance-table-body');
    if (!tableBody) {
        console.log("Performance table body not found in DOM yet. Skipping table render.");
        return; // Yahan se safe exit kar jayega, code crash nahi hoga
    }
    
    // Agar element mil jata hai (yaani user performance tab par hai), tabhi load chalega
    loadPerformanceTable(gAssignedJamiaat, gDb, gCurrentUser);
};

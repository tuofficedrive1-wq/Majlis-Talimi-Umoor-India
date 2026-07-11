import { 
    doc, 
    getDoc,
    updateDoc,
    setDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let academicConfig = null;
let gDb = null;
let gCurrentUser = null;
const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
let gAssignedJamiaat = [];
// --- Summary Tab Global Data ---
let gAllYearReportsData = [];
let gSummaryActiveYear = null;
let gSummaryKarkardagiStructure = [];

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
        <div class="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-100">
            <div class="flex justify-between items-center mb-5">
                <h3 class="font-black text-indigo-950 text-lg md:text-xl">Edit Period</h3>
                <button onclick="closePeriodModal()" class="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Class</label>
                    <input type="text" id="edit-p-class" list="edit-class-suggestions" autocomplete="off" placeholder="Type or Select Class" class="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl text-xs md:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 transition">
                    <datalist id="edit-class-suggestions"></datalist>
                </div>
                <div>
                    <label class="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Subject / Book</label>
                    <input type="text" id="edit-p-book" list="edit-book-suggestions" autocomplete="off" placeholder="Type or Select Subject" class="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl text-xs md:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 transition">
                    <datalist id="edit-book-suggestions"></datalist>
                </div>
                <div class="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                        <label class="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Semester</label>
                        <select id="edit-p-sem" class="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl text-xs md:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 transition">
                            <option value="1">Sem 1</option>
                            <option value="2">Sem 2</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Total Pages</label>
                        <input type="number" id="edit-p-pages" class="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl text-xs md:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 transition">
                    </div>
                </div>
                <div>
                    <label class="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Syllabus</label>
                    <select id="edit-p-syllabus" class="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl text-xs md:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 transition">
                        <option value="Majlis">Majlis</option>
                        <option value="State">State</option>
                        <option value="Approval">Approval</option>
                    </select>
                </div>
                <button type="button" id="btn-update-period" class="w-full bg-indigo-600 text-white py-3 md:py-3.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all mt-2 text-sm md:text-base">
                    Update Data
                </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

    injectEditModal();
    
    const container = document.getElementById('performance-jamia-list');
    container.innerHTML = `
        <div class="mb-4 md:mb-6">
            <div class="flex border-b border-slate-200 gap-2 md:gap-6 overflow-x-auto no-scrollbar">
                <button class="sub-tab-btn active border-b-2 border-indigo-600 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-indigo-600 whitespace-nowrap transition" data-sub="performance">Performance</button>
                <button class="sub-tab-btn px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-500 whitespace-nowrap hover:text-indigo-500 transition" data-sub="summary">Summary</button>
                <button class="sub-tab-btn px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-500 whitespace-nowrap hover:text-indigo-500 transition" data-sub="structure">Structure</button>
                <button class="sub-tab-btn px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-500 whitespace-nowrap hover:text-indigo-500 transition" data-sub="profiles">Profiles</button>
            </div>
        </div>
        <div id="sub-tab-content" class="space-y-4 md:space-y-6"></div>
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
        if (!document.getElementById('report-jamia')) {
            contentArea.innerHTML = `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 bg-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm gap-3">
                    <div class="flex flex-col">
                        <h3 class="font-black text-indigo-950 text-base md:text-lg">Performance Analytics</h3>
                        <p class="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">Select Jamia (Month synced)</p>
                    </div>
                    <div class="w-full sm:w-auto">
                        <select id="report-jamia" class="w-full sm:w-auto p-2 md:p-2.5 border border-slate-200 rounded-lg md:rounded-xl text-sm md:text-base font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-200 transition">
                            <option value="all">All Jamiaat</option>
                            ${assignedJamiaat.map(j => `<option value="${j}">${j}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div id="performance-table-body" class="space-y-4 md:space-y-6"></div>
            `;
        }

        const jamiaSelect = document.getElementById('report-jamia');
        if (jamiaSelect) {
            jamiaSelect.onchange = () => {
                loadPerformanceTable(assignedJamiaat, db, currentUser);
            };
        }
        
        loadPerformanceTable(assignedJamiaat, db, currentUser);
        
    } else if (tabName === 'summary') {
        contentArea.innerHTML = `
            <div class="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 mb-4 md:mb-6 shadow-sm">
                <div class="flex border-b border-slate-200 gap-4 overflow-x-auto no-scrollbar mb-4 pb-2">
                    <button class="summary-sub-btn active border-b-2 border-indigo-600 px-3 py-2 text-sm font-bold text-indigo-600 whitespace-nowrap transition" data-target="munasib-tab">Monthly Munasib</button>
                    <button class="summary-sub-btn px-3 py-2 text-sm font-bold text-slate-500 hover:text-indigo-500 whitespace-nowrap transition" data-target="history-tab">Semester Munasib History</button>
                    <button class="summary-sub-btn px-3 py-2 text-sm font-bold text-slate-500 hover:text-indigo-500 whitespace-nowrap transition" data-target="profile-tab">Teacher Profile</button>
                </div>

                <div id="munasib-tab" class="summary-content block space-y-4">
                    <div class="flex items-center gap-4 mb-4">
                        <label class="font-bold text-slate-600 text-sm">Select Month:</label>
                        <select id="summary-month-select" class="p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:border-indigo-500">
                             ${monthNames.map((m, i) => `<option value="${i}">${m.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                    <div id="monthly-munasib-container" class="space-y-4">
                        <p class="text-slate-500 text-center py-4">Data load ho raha hai...</p>
                    </div>
                </div>

                <div id="history-tab" class="summary-content hidden space-y-4">
                    <div id="munasib-history-container" class="space-y-4">
                        <p class="text-slate-500 text-center py-4">History data load ho raha hai...</p>
                    </div>
                </div>

                <div id="profile-tab" class="summary-content hidden space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-600 mb-1">Select Jamia:</label>
                            <select id="teacher-profile-jamia" class="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:border-indigo-500">
                                <option value="">Select Jamia</option>
                                ${assignedJamiaat.map(j => `<option value="${j}">${j}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-600 mb-1">Select Teacher:</label>
                            <select id="teacher-profile-teacher" class="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:border-indigo-500">
                                <option value="">Select Teacher</option>
                            </select>
                        </div>
                    </div>
                    <button id="show-teacher-profile-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition shadow-sm active:scale-95">Show Profile</button>
                    <div id="teacher-profile-container" class="mt-6 space-y-4"></div>
                </div>
            </div>
        `;

        // Sub-Tab Switching & Events Logic
        const summaryBtns = contentArea.querySelectorAll('.summary-sub-btn');
        const summaryContents = contentArea.querySelectorAll('.summary-content');
        const monthSelect = document.getElementById('summary-month-select');
        
        // Match default month
        monthSelect.value = monthNames.indexOf(currentSelectedMonth);

        summaryBtns.forEach(btn => {
            btn.onclick = () => {
                summaryBtns.forEach(b => {
                    b.classList.remove('active', 'border-b-2', 'border-indigo-600', 'text-indigo-600');
                    b.classList.add('text-slate-500');
                });
                btn.classList.add('active', 'border-b-2', 'border-indigo-600', 'text-indigo-600');
                btn.classList.remove('text-slate-500');

                summaryContents.forEach(c => c.classList.add('hidden'));
                const targetId = btn.dataset.target;
                document.getElementById(targetId).classList.remove('hidden');
                
                loadAndRenderSummaryTabs(targetId, db, currentUser, assignedJamiaat);
            };
        });

        monthSelect.onchange = () => loadAndRenderSummaryTabs('munasib-tab', db, currentUser, assignedJamiaat);

        // Teacher Profile Setup
        document.getElementById('teacher-profile-jamia').onchange = (e) => {
            const jamia = e.target.value;
            const teacherSelect = document.getElementById('teacher-profile-teacher');
            if(!jamia) { teacherSelect.innerHTML = '<option value="">Select Teacher</option>'; return; }
            
            const jamiaData = gSummaryKarkardagiStructure.find(j => j.jamiaName === jamia);
            if(jamiaData && jamiaData.teachers) {
                teacherSelect.innerHTML = '<option value="all" class="font-bold text-indigo-700">تمام اساتذہ (All Teachers)</option>' + 
                    jamiaData.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            }
        };

        document.getElementById('show-teacher-profile-btn').onclick = () => loadAndRenderSummaryTabs('profile-tab', db, currentUser, assignedJamiaat);

        // Initialize First Tab automatically
        loadAndRenderSummaryTabs('munasib-tab', db, currentUser, assignedJamiaat);
    } else if (tabName === 'structure') {
        const config = await getAcademicConfig(db);
        const activeYearByAdmin = config ? config.activeYear : "2026-2027";

        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const academicYearsData = userSnap.data().academicYears || {};
        const allYears = Object.keys(academicYearsData);
        if (!allYears.includes(activeYearByAdmin)) allYears.push(activeYearByAdmin);

        contentArea.innerHTML = `
            <div class="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 mb-4 md:mb-6 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                    <h4 class="text-xs md:text-sm font-black text-slate-700 uppercase tracking-wide">Academic Year</h4>
                </div>
                <select id="structure-year-select" class="w-full sm:w-auto p-2 md:p-2.5 border-2 border-indigo-100 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-indigo-700 bg-indigo-50 outline-none transition">
                    ${allYears.map(yr => `<option value="${yr}" ${yr === activeYearByAdmin ? 'selected' : ''}>${yr}${yr === activeYearByAdmin ? ' (Active)' : ''}</option>`).join('')}
                </select>
            </div>
            <div id="structure-display-area" class="space-y-3 md:space-y-5"></div>
        `;

        const updateStructureView = (selectedYear) => {
            const displayArea = document.getElementById('structure-display-area');
            if (!displayArea) return;

            displayArea.innerHTML = assignedJamiaat.map(jamia => `
                <div class="border border-slate-200 rounded-xl md:rounded-2xl bg-white overflow-hidden shadow-sm">
                    <button class="jamia-toggle w-full flex justify-between items-center p-3 md:p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 text-sm md:text-base transition">
                        <span>${jamia}</span><i class="fas fa-chevron-down transition-transform"></i>
                    </button>
                    <div class="jamia-content hidden border-t border-slate-100 flex flex-col">
                        
                        <!-- Add New Teacher Form (Flat Design) -->
                        <div class="p-3 md:p-5 bg-indigo-50/30 border-b border-slate-100">
                            <h4 class="text-xs md:text-sm font-bold text-indigo-700 uppercase mb-3 flex items-center gap-1.5"><i class="fas fa-user-plus"></i> Add New Teacher</h4>
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4" id="form-${jamia.replace(/\s+/g, '')}">
                                <input type="text" id="name-${jamia.replace(/\s+/g, '')}" placeholder="Name" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm font-medium outline-none transition">
                                <input type="text" id="ajeer-${jamia.replace(/\s+/g, '')}" placeholder="Ajeer Code" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm font-bold outline-none transition" maxlength="6">
                                <input type="text" id="contact-${jamia.replace(/\s+/g, '')}" placeholder="Contact" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm outline-none transition">
                                <input type="text" id="level-${jamia.replace(/\s+/g, '')}" placeholder="Level" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm outline-none transition">
                                <input type="text" id="h-qual-${jamia.replace(/\s+/g, '')}" placeholder="Highest Qual." class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm outline-none transition">
                                <input type="email" id="mail-${jamia.replace(/\s+/g, '')}" placeholder="Mail ID" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm outline-none transition">
                                <input type="text" id="exp-${jamia.replace(/\s+/g, '')}" placeholder="Experience" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm outline-none transition">
                                <input type="text" id="spec-${jamia.replace(/\s+/g, '')}" placeholder="Specialization" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm outline-none transition">
                                <input type="text" id="t-period-${jamia.replace(/\s+/g, '')}" placeholder="Total Period" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm outline-none transition">
                                <input type="text" id="ijara-${jamia.replace(/\s+/g, '')}" placeholder="Ijara Status" class="p-2 md:p-2.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs md:text-sm outline-none transition">
                            </div>
                            <button class="save-teacher-btn w-full mt-3 md:mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 md:py-3 rounded-lg text-sm md:text-base font-bold transition shadow-sm active:scale-95" data-jamia-name="${jamia}">Save Profile</button>
                        </div>
                        
                        <div class="teacher-list-area p-3 md:p-5 space-y-3 md:space-y-4 bg-white" id="list-${jamia.replace(/\s+/g, '')}"></div>
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
            <div class="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm">
                <h3 class="font-black text-indigo-950 text-base md:text-lg mb-3 md:mb-5">Teacher Directory</h3>
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
                    btn.innerText = "Save Profile";
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

            listDiv.innerHTML = jamiaData.teachers.map(t => {
                const uniqueId = t.id;
                return `
                <div class="border border-slate-200 rounded-xl bg-white mb-3 shadow-sm overflow-hidden" id="teacher-card-${uniqueId}">
                    <!-- Teacher Header -->
                    <div class="teacher-toggle flex justify-between items-center p-3 md:p-4 cursor-pointer hover:bg-slate-50 transition-colors" data-tid="${uniqueId}" data-jamia="${jamia}">
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-800 text-sm md:text-base">${t.name}</span>
                            <span class="text-[9px] md:text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5 md:mt-1">Code: ${t.loginCode}</span>
                        </div>
                        <div class="flex items-center gap-3 md:gap-4">
                            <button class="edit-t-btn text-indigo-500 hover:text-indigo-700 transition md:text-lg" data-tid="${uniqueId}" data-jamia="${jamia}"><i class="fas fa-edit"></i></button>
                            <button class="del-t-btn text-red-500 hover:text-red-700 transition md:text-lg" data-tid="${uniqueId}" data-jamia="${jamia}"><i class="fas fa-trash-alt"></i></button>
                            <i class="fas fa-chevron-down text-slate-400 md:text-lg transition-transform"></i>
                        </div>
                    </div>
                    
                    <!-- Teacher Period Content (FLAT DESIGN) -->
                    <div class="period-container hidden border-t border-slate-100 bg-slate-50/50 flex flex-col">
                        
                        <!-- Period Form: Flat Grid directly inside the container without extra borders -->
                        <div class="p-3 md:p-4 border-b border-slate-100">
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                                <div class="col-span-2 sm:col-span-1 md:col-span-1">
                                    <input type="text" list="classes-${uniqueId}" class="p-class w-full p-2 md:p-2.5 border border-slate-300 focus:border-indigo-400 rounded-lg text-xs md:text-sm bg-white outline-none transition" placeholder="Class">
                                    <datalist id="classes-${uniqueId}">
                                        ${academicConfig.classes.map(c => `<option value="${c.name}"></option>`).join('')}
                                    </datalist>
                                </div>
                                <div class="col-span-2 sm:col-span-1 md:col-span-1">
                                    <input type="text" list="books-${uniqueId}" class="p-book w-full p-2 md:p-2.5 border border-slate-300 focus:border-indigo-400 rounded-lg text-xs md:text-sm bg-white outline-none transition" placeholder="Subject">
                                    <datalist id="books-${uniqueId}"></datalist>
                                </div>
                                <div>
                                    <select class="p-sem w-full p-2 md:p-2.5 border border-slate-300 focus:border-indigo-400 rounded-lg text-xs md:text-sm bg-white outline-none transition"><option value="1">Sem 1</option><option value="2">Sem 2</option></select>
                                </div>
                                <div>
                                    <input type="number" placeholder="Pages" class="p-pages w-full p-2 md:p-2.5 border border-slate-300 focus:border-indigo-400 rounded-lg text-xs md:text-sm bg-white outline-none transition">
                                </div>
                                <div>
                                    <select class="p-syllabus w-full p-2 md:p-2.5 border border-slate-300 focus:border-indigo-400 rounded-lg text-xs md:text-sm bg-white outline-none transition">
                                        <option value="Majlis">Majlis</option><option value="State">State</option><option value="Approval">Approval</option>
                                    </select>
                                </div>
                                <button class="save-period-btn col-span-2 sm:col-span-3 md:col-span-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold shadow-sm active:scale-95 transition" data-tid="${uniqueId}" data-jamia="${jamia}">Add</button>
                            </div>
                        </div>
                        
                        <!-- Compact Table (No extra outer card padding) -->
                        <div class="overflow-x-auto no-scrollbar w-full bg-white">
                            <table class="w-full text-left whitespace-nowrap min-w-max">
                                <thead>
                                    <tr class="bg-slate-100/50 text-slate-500 uppercase font-black border-b border-slate-200 text-[9px] md:text-xs">
                                        <th class="p-2 md:p-3 border-r border-slate-100">Class</th>
                                        <th class="p-2 md:p-3 border-r border-slate-100">Book</th>
                                        <th class="p-2 md:p-3 border-r border-slate-100 text-center">Sem</th>
                                        <th class="p-2 md:p-3 border-r border-slate-100 text-center">Pages</th>
                                        <th class="p-2 md:p-3 border-r border-slate-100 text-center">Syllabus</th>
                                        <th class="p-2 md:p-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="text-[10px] md:text-sm divide-y divide-slate-100 text-slate-700">
                                    ${(t.periods || []).map(p => `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-2 md:p-3 border-r border-slate-100 whitespace-normal min-w-[100px] md:min-w-[150px]">${p.className}</td>
                                            <td class="p-2 md:p-3 border-r border-slate-100 whitespace-normal min-w-[100px] md:min-w-[150px] font-semibold">${p.bookName}</td>
                                            <td class="p-2 md:p-3 border-r border-slate-100 text-center">${p.semester}</td>
                                            <td class="p-2 md:p-3 border-r border-slate-100 text-center font-bold text-indigo-700">${p.totalPages}</td>
                                            <td class="p-2 md:p-3 border-r border-slate-100 text-center text-emerald-600 font-bold">${p.syllabus || 'Majlis'}</td>
                                            <td class="p-2 md:p-3 text-center">
                                                <div class="flex justify-center gap-3">
                                                    <button class="edit-period-btn text-indigo-500 hover:text-indigo-700 transition md:text-lg" 
                                                            data-pid="${p.id}" data-tid="${uniqueId}" data-jamia="${jamia}">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="del-period-btn text-red-500 hover:text-red-700 transition md:text-lg" 
                                                            data-pid="${p.id}" data-tid="${uniqueId}" data-jamia="${jamia}">
                                                        <i class="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                        <!-- Table End -->
                    </div>
                </div>`;
            }).join('');
            
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
            container.innerHTML = `<div class="p-5 text-center text-red-500 font-bold text-sm">Academic Year Data Missing</div>`;
            return;
        }

        const karkardagi = academicYears[activeYear]?.karkardagiStructure || [];
        const filteredJamiaat = selectedJamia === "all" ? jamiaat : jamiaat.filter(j => j === selectedJamia);
        const targetMonthKey = (currentSelectedMonth || "").toLowerCase().trim();
        const currentYearMonthPrefix = `${activeYear.split('-')[0]}-${monthNames.indexOf(targetMonthKey) + 1 < 10 ? '0' + (monthNames.indexOf(targetMonthKey) + 1) : monthNames.indexOf(targetMonthKey) + 1}`;

        let html = "";

        for (const jamiaName of filteredJamiaat) {
            const jamiaData = karkardagi.find(j => j.jamiaName === jamiaName);
            if (!jamiaData) continue;

            const safeId = jamiaName.replace(/\s+/g, '');
            const match = jamiaName.match(/\d+/);
            const jamiaDocId = match ? match[0] : "001";
            
            const publicPerfSnap = await getDoc(doc(db, "academic_performance", jamiaDocId));
            let publicMonthData = null;
            if (publicPerfSnap.exists()) {
                publicMonthData = publicPerfSnap.data()[targetMonthKey] || publicPerfSnap.data()[currentYearMonthPrefix] || null;
            }

            html += `
            <div class="bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm overflow-hidden jamia-card mb-6" id="card-${safeId}">
                <div class="bg-slate-50 p-3 md:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h3 class="font-black text-indigo-950 text-sm md:text-lg">${jamiaName}</h3>
                    </div>
                    <div class="flex flex-wrap gap-1.5 md:gap-2 w-full sm:w-auto">
                        <button onclick="copyTeacherFormLink('${jamiaName}')" class="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 text-[10px] md:text-xs px-2.5 py-2 md:py-2.5 rounded-lg md:rounded-xl hover:bg-slate-50 transition font-bold shadow-sm justify-center flex items-center"><i class="fas fa-link mr-1 text-indigo-500"></i> Link</button>
                        <button onclick="downloadJamiaImage('${jamiaName}')" class="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 text-[10px] md:text-xs px-2.5 py-2 md:py-2.5 rounded-lg md:rounded-xl hover:bg-slate-50 transition font-bold shadow-sm justify-center flex items-center"><i class="fas fa-image mr-1 text-rose-500"></i> Image</button>
                        <button onclick="downloadJamiaExcel('${jamiaName}')" class="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 text-[10px] md:text-xs px-2.5 py-2 md:py-2.5 rounded-lg md:rounded-xl hover:bg-slate-50 transition font-bold shadow-sm justify-center flex items-center"><i class="fas fa-file-excel mr-1 text-emerald-500"></i> Excel</button>
                        <button onclick="toggleEditMode('${jamiaName}')" class="edit-btn-${safeId} flex-1 sm:flex-none bg-indigo-600 text-white text-[10px] md:text-xs px-3.5 py-2 md:py-2.5 rounded-lg md:rounded-xl hover:bg-indigo-700 shadow-sm transition font-bold justify-center flex items-center"><i class="fas fa-edit mr-1"></i> Edit</button>
                    </div>
                </div>
                <div class="overflow-x-auto no-scrollbar">
                    <table class="w-full text-left whitespace-nowrap min-w-max">
                        <thead class="bg-slate-50 text-slate-500 text-[9px] md:text-[11px] uppercase font-black border-b border-slate-200 tracking-wider">
                            <tr>
                                <th class="p-2 md:p-4 border-r border-slate-100">Teacher</th>
                                <th class="p-2 md:p-4 border-r border-slate-100">Class</th>
                                <th class="p-2 md:p-4 border-r border-slate-100">Subject</th>
                                <th class="p-2 md:p-4 border-r border-slate-100 text-center">Total</th>
                                <th class="p-2 md:p-4 border-r border-slate-100 text-center text-indigo-600">Target</th>
                                <th class="p-2 md:p-4 border-r border-slate-100 text-center">Achieved</th>
                                <th class="p-2 md:p-4 border-r border-slate-100 text-center">%</th>
                                <th class="p-2 md:p-4 border-r border-slate-100 text-center">Kaifiyat</th>
                                <th class="p-2 md:p-4 text-center">Action</th> 
                            </tr>
                        </thead>
                        <tbody class="text-xs md:text-sm divide-y divide-slate-100 text-slate-700">`;

            jamiaData.teachers.forEach((teacher) => {
                const publicTeacher = publicMonthData?.teachers?.find(t => t.name.toLowerCase() === teacher.name.toLowerCase());
                const totalPeriodsCount = teacher.periods?.length || 0;

                let totalTeacherTarget = 0;
                let totalTeacherAchieved = 0;
                let firstPeriodSemester = 1;

                teacher.periods?.forEach((p, pIdx) => {
                    let target = 0;
                    const exactSubId = `${(p.className || "").trim()}_${(p.bookName || "").trim()}`.replace(/\s+/g, '_');

                    if (monthlyTargets && monthlyTargets[exactSubId] && monthlyTargets[exactSubId][targetMonthKey] !== undefined) {
                        target = parseInt(monthlyTargets[exactSubId][targetMonthKey]) || 0;
                    } 
                    else if (monthlyTargets) {
                        const userClassNameLower = (p.className || "").trim().toLowerCase();
                        // User ki class me se saare spaces, hyphens aur underscores hata diye
                        const userClassNoSpace = userClassNameLower.replace(/[\s\-_]/g, ''); 
                        const userBookNameFormatted = (p.bookName || "").trim().replace(/\s+/g, '_').toLowerCase();

                        for (const adminKey in monthlyTargets) {
                            const adminKeyLower = adminKey.toLowerCase();
                            const suffix = `_${userBookNameFormatted}`;
                            
                            if (adminKeyLower.endsWith(suffix)) {
                                const adminClassKeyPart = adminKeyLower.substring(0, adminKeyLower.length - suffix.length);
                                // Admin ki class se bhi saare spaces aur extra characters hata diye
                                const adminClassNoSpace = adminClassKeyPart.replace(/[\s\-_]/g, '');
                                
                                // Ab directly spaceless text ka shuruati hissa check karega
                                if (userClassNoSpace.startsWith(adminClassNoSpace)) {
                                    
                                    if (monthlyTargets[adminKey][targetMonthKey] !== undefined) {
                                        target = parseInt(monthlyTargets[adminKey][targetMonthKey]) || 0;
                                        break; 
                                    }
                                }
                            }
                        }
                    }
                                        
                    let achievedValue = 0;
                    if (p.achieved && p.achieved[currentYearMonthPrefix] !== undefined) {
                        achievedValue = p.achieved[currentYearMonthPrefix];
                    } else if (p.achieved && p.achieved[targetMonthKey] !== undefined) {
                        achievedValue = p.achieved[targetMonthKey];
                    } else if (publicTeacher && publicTeacher.periods_detail) {
                        const matchedPeriodKey = Object.keys(publicTeacher.periods_detail).find(key => {
                            const detail = publicTeacher.periods_detail[key];
                            return detail.class === p.className && detail.subject === p.bookName;
                        });
                        if (matchedPeriodKey) {
                            achievedValue = publicTeacher.periods_detail[matchedPeriodKey].page_to || 0;
                        }
                    }

                    totalTeacherTarget += target;
                    totalTeacherAchieved += achievedValue;
                    if (pIdx === 0) firstPeriodSemester = p.semester;

                    const percentage = target > 0 ? Math.round((achievedValue / target) * 100) : 0;
                    const result = calculateKaifiyatAndStyle(percentage, targetMonthKey, p.semester);

                    const teacherRowId = `row-${safeId}-${teacher.id}`;

                    html += `
                        <tr class="hover:bg-slate-50 transition-colors ${teacherRowId}">
                            <td class="p-2 md:p-4 border-r border-slate-100 font-bold text-slate-800 whitespace-normal min-w-[100px] md:min-w-[150px]">${pIdx === 0 ? teacher.name : ''}</td>
                            <td class="p-2 md:p-4 border-r border-slate-100 text-slate-600 whitespace-normal min-w-[100px] md:min-w-[150px]">${p.className}</td>
                            <td class="p-2 md:p-4 border-r border-slate-100 text-slate-600 whitespace-normal min-w-[100px] md:min-w-[150px] font-semibold">${p.bookName}</td>
                            <td class="p-2 md:p-4 border-r border-slate-100 text-center text-slate-600">${p.totalPages}</td>
                            <td class="p-2 md:p-4 border-r border-slate-100 text-center font-black text-indigo-700 bg-indigo-50/50">${target}</td>
                            <td class="p-1 md:p-2 border-r border-slate-100 text-center">
                                <input type="number" value="${achievedValue}" disabled 
                                       data-tid="${teacher.id}" data-pid="${p.id}"
                                       class="achieved-input-${safeId} w-14 md:w-20 p-1.5 md:p-2 border border-transparent rounded-lg text-center bg-transparent mx-auto block text-xs md:text-sm font-bold focus:outline-none transition-colors"
                                       oninput="updateRowStatusLive(this, ${target}, '${targetMonthKey}', '${p.semester}')">
                            </td>
                            <td class="p-2 md:p-4 border-r border-slate-100 text-center font-black text-slate-700 perc-cell text-[10px] md:text-sm">${percentage}%</td>
                            <td class="p-2 md:p-4 border-r border-slate-100 text-center italic status-cell text-[10px] md:text-sm ${result.colorClass}">${result.kaifiyat}</td>
                            
                            ${pIdx === 0 ? `
                            <td class="p-1.5 md:p-3 text-center bg-slate-50/30" rowspan="${totalPeriodsCount + 1}">
                                <div class="flex flex-col gap-1.5 md:gap-2 items-center justify-center">
                                    <button onclick="downloadTeacherReportImage('${teacherRowId}', '${teacher.name}')" class="bg-white border border-slate-200 text-rose-600 text-[9px] md:text-[11px] px-2 md:px-3 py-1.5 md:py-2 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-rose-50 transition-colors font-bold" title="Image Download">
                                        <i class="fas fa-image"></i> Image
                                    </button>
                                    <button onclick="window.resetTeacherMonthReport('${jamiaName}', '${teacher.id}', '${teacher.name}')" class="bg-white border border-red-200 text-red-500 text-[9px] md:text-[11px] px-2 md:px-3 py-1.5 md:py-2 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-red-50 transition-colors font-bold" title="Reset">
                                        <i class="fas fa-sync-alt"></i> Reset
                                    </button>
                                </div>
                            </td>
                            ` : ''}
                        </tr>`;
                });

                if (totalPeriodsCount > 0) {
                    const overallPercentage = totalTeacherTarget > 0 ? Math.round((totalTeacherAchieved / totalTeacherTarget) * 100) : 0;
                    const overallResult = calculateKaifiyatAndStyle(overallPercentage, targetMonthKey, firstPeriodSemester);

                    const teacherRowId = `row-${safeId}-${teacher.id}`; 

                    html += `
                        <tr class="bg-indigo-50 border-b-[3px] border-indigo-200 ${teacherRowId}">
                            <td colspan="4" class="p-2 md:p-4 text-right font-black text-indigo-900 uppercase text-[9px] md:text-[11px] tracking-wider">Summary:</td>
                            <td class="p-2 md:p-4 border-r border-indigo-100 text-center font-black text-indigo-800 bg-indigo-100/50">${totalTeacherTarget}</td>
                            <td class="p-2 md:p-4 border-r border-indigo-100 text-center font-black text-emerald-700 bg-indigo-100/50">${totalTeacherAchieved}</td>
                            <td class="p-2 md:p-4 border-r border-indigo-100 text-center font-black text-slate-800 text-[10px] md:text-sm">${overallPercentage}%</td>
                            <td class="p-2 md:p-4 border-r border-indigo-100 text-center italic status-cell text-[10px] md:text-sm ${overallResult.colorClass}">${overallResult.kaifiyat}</td>
                        </tr>
                    `;
                }
            });
            html += `</tbody></table></div></div>`;
        }
        container.innerHTML = html || '<div class="p-8 text-center text-slate-400 text-sm md:text-base font-medium">Data nahi mila.</div>';
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
    container.querySelectorAll('.p-class').forEach(inputField => {
        const uniqueId = inputField.closest('[id^="teacher-card-"]').id.replace('teacher-card-', '');
        const bookDatalist = document.getElementById(`books-${uniqueId}`);

        const filterBooks = (className) => {
            if (!bookDatalist) return;
            bookDatalist.innerHTML = '';
            const classData = config.classes.find(c => c.name === className);
            if (classData?.subjects) {
                classData.subjects.forEach(sub => {
                    bookDatalist.innerHTML += `<option value="${sub}"></option>`;
                });
            }
        };

        inputField.onchange = (e) => filterBooks(e.target.value);
        inputField.oninput = (e) => filterBooks(e.target.value);
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
                    saveBtn.innerText = "Update Profile";
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
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

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

                alert("Period Added!");
                loadAllTeachers(jamiaat, db, currentUser, selectedYear);
            } catch (e) {
                alert("Error: " + e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Add";
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

        const classInput = document.getElementById('edit-p-class');
        const bookInput = document.getElementById('edit-p-book');
        const classDatalist = document.getElementById('edit-class-suggestions');
        const bookDatalist = document.getElementById('edit-book-suggestions');
        const updateBtn = document.getElementById('btn-update-period');

        if (!classInput || !bookInput || !classDatalist || !bookDatalist) {
            return alert("Modal elements nahi mile. Refresh karein.");
        }

        classDatalist.innerHTML = currentConfig.classes.map(c => `<option value="${c.name}"></option>`).join('');
        classInput.value = period.className;

        const loadModalBooks = (className) => {
            bookDatalist.innerHTML = '';
            const cls = currentConfig.classes.find(c => c.name === className);
            if (cls?.subjects) {
                cls.subjects.forEach(s => {
                    bookDatalist.innerHTML += `<option value="${s}"></option>`;
                });
            }
        };

        loadModalBooks(period.className);
        bookInput.value = period.bookName;

        classInput.oninput = (e) => loadModalBooks(e.target.value);
        classInput.onchange = (e) => loadModalBooks(e.target.value);

        document.getElementById('edit-p-sem').value = period.semester || "1";
        document.getElementById('edit-p-pages').value = period.totalPages || 0;
        document.getElementById('edit-p-syllabus').value = period.syllabus || 'Majlis';

        updateBtn.onclick = async (e) => {
            e.preventDefault(); 
            updateBtn.disabled = true;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            const updatedObj = {
                id: pid,
                className: classInput.value.trim(),
                bookName: bookInput.value.trim(),
                semester: document.getElementById('edit-p-sem').value,
                totalPages: parseInt(document.getElementById('edit-p-pages').value) || 0,
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
                alert("Updated!");
            } catch (err) {
                alert("Error: " + err.message);
            } finally {
                updateBtn.disabled = false;
                updateBtn.innerText = 'Update Data';
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
        statusCell.className = `p-2 md:p-4 border-r border-slate-100 text-center italic status-cell text-[10px] md:text-sm ${result.colorClass}`;
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
            inp.classList.remove('border-transparent');
        });
        btn.innerHTML = `<i class="fas fa-save mr-1"></i> Save`;
        btn.style.backgroundColor = "#10b981"; 
    } else {
        btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Saving`;
        btn.disabled = true;
        
        try {
            const databaseInstance = gDb;
            const userInstance = gCurrentUser;

            if (!databaseInstance || !userInstance) {
                throw new Error("Session nahi mila.");
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
                const match = jamiaName.match(/\d+/);
                const jamiaDocId = match ? match[0] : "001";
                const perfDocRef = doc(databaseInstance, "academic_performance", jamiaDocId);
                const perfSnap = await getDoc(perfDocRef);
                let currentPerfData = perfSnap.exists() ? perfSnap.data() : {};

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

                await updateDoc(userRef, { academicYears: academicYears });

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
                    inp.classList.add('border-transparent');
                });
                
                btn.innerHTML = `<i class="fas fa-edit mr-1"></i> Edit`;
                btn.style.backgroundColor = "#4f46e5"; 
                btn.disabled = false;
                
                alert(`Data Saved for ${savingMonthId.toUpperCase()}`);
                loadPerformanceTable(gAssignedJamiaat, databaseInstance, userInstance);
            }
        } catch (err) {
            console.error("Save Error:", err);
            alert("Error: " + err.message);
            btn.innerHTML = `<i class="fas fa-save mr-1"></i> Save`;
            btn.style.backgroundColor = "#10b981";
            btn.disabled = false;
        }
    }
};

const getSafeId = (name) => name ? name.replace(/\s+/g, '') : 'id';

window.copyTeacherFormLink = async (jamiaName) => {
    try {
        const monthIdx = document.getElementById('report-month').value;
        const baseUrl = window.location.origin + window.location.pathname.replace('academic-inspector.html', '');
        const inspectorId = gCurrentUser ? gCurrentUser.uid : 'anonymous';
        const calSnap = await getDoc(doc(gDb, "settings", "academic_calendar"));
        let activeYear = "2026-2027";
        if(calSnap.exists()){ activeYear = calSnap.data().activeYear || "2026-2027"; }

        const url = `${baseUrl}academic-monthly-performance.html?jamiaName=${encodeURIComponent(jamiaName)}&monthIndex=${monthIdx}&userId=${inspectorId}&activeYear=${activeYear}`;
        navigator.clipboard.writeText(url);
        alert(`Link Copied!\nYear: ${activeYear}`);
    } catch(error){
        console.error(error);
        alert("Link error");
    }
};

window.downloadJamiaImage = (jamiaName) => {
    const safeId = getSafeId(jamiaName);
    const card = document.getElementById(`card-${safeId}`);
    if (!card) return alert("Card nahi mila!");
    if (typeof html2canvas === 'undefined') return alert("Library missing!");

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
        const rowData = Array.from(cols).map(col => `"${col.innerText.trim().replace(/"/g, '""')}"`).join(",");
        csv.push(rowData);
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${jamiaName}_Report.csv`);
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
        <div class="mb-6 md:mb-8">
            <div class="flex items-center gap-2 mb-3 bg-indigo-50 px-3 md:px-4 py-2 rounded-lg w-fit shadow-sm border border-indigo-100">
                <i class="fas fa-university text-indigo-600 text-xs md:text-sm"></i>
                <h4 class="font-black text-indigo-950 uppercase tracking-wide text-xs md:text-sm">${jamia}</h4>
            </div>
            <div class="overflow-x-auto no-scrollbar rounded-xl border border-slate-200 shadow-sm bg-white">
                <table class="w-full text-left whitespace-nowrap min-w-max">
                    <thead>
                        <tr class="bg-slate-50 text-slate-500 text-[9px] md:text-xs uppercase font-black tracking-wider border-b border-slate-200">
                            <th class="p-2 md:p-4 border-r border-slate-100">Name & Code</th>
                            <th class="p-2 md:p-4 border-r border-slate-100">Contact/Mail</th>
                            <th class="p-2 md:p-4 border-r border-slate-100">Qual.</th>
                            <th class="p-2 md:p-4 border-r border-slate-100">Exp.</th>
                            <th class="p-2 md:p-4 border-r border-slate-100 text-center">Periods</th>
                            <th class="p-2 md:p-4 text-center">Ijara</th>
                        </tr>
                    </thead>
                    <tbody class="text-[10px] md:text-sm divide-y divide-slate-100 text-slate-700">
                        ${jamiaData.teachers.map(t => `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="p-2 md:p-4 border-r border-slate-100">
                                    <div class="font-bold text-slate-800 text-xs md:text-base">${t.name}</div>
                                    <div class="text-indigo-600 text-[9px] md:text-xs uppercase mt-0.5 md:mt-1 font-bold tracking-wider">ID: ${t.loginCode}</div>
                                </td>
                                <td class="p-2 md:p-4 border-r border-slate-100">
                                    <div class="text-slate-700 font-medium">${t.contact || '-'}</div>
                                    <div class="text-slate-400 text-[9px] md:text-xs mt-0.5 md:mt-1">${t.mailId || '-'}</div>
                                </td>
                                <td class="p-2 md:p-4 border-r border-slate-100">
                                    <div class="text-slate-700 font-medium">${t.levelQualified || '-'}</div>
                                    <div class="text-slate-500 text-[9px] md:text-xs mt-0.5 md:mt-1">${t.highestQualification || '-'}</div>
                                </td>
                                <td class="p-2 md:p-4 border-r border-slate-100">
                                    <div class="text-slate-700 font-medium">${t.experience || '-'} Exp</div>
                                    <div class="text-indigo-500 text-[9px] md:text-xs mt-0.5 md:mt-1 font-semibold">${t.specialization || '-'}</div>
                                </td>
                                <td class="p-2 md:p-4 border-r border-slate-100 text-center">
                                    <span class="bg-indigo-100 text-indigo-700 px-2.5 py-1 md:px-3 md:py-1.5 rounded-md font-bold">${t.teachingPeriod || '0'}</span>
                                </td>
                                <td class="p-2 md:p-4 text-center">
                                    <span class="px-2 py-1 md:px-3 md:py-1.5 rounded-md font-bold border ${t.ijaraStatus?.toLowerCase().includes('yes') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}">
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
        <div class="p-10 md:p-16 text-center bg-slate-50 rounded-xl md:rounded-2xl border border-dashed border-slate-200">
            <i class="fas fa-user-slash text-3xl md:text-4xl text-slate-300 mb-3 md:mb-4"></i>
            <p class="text-slate-500 font-bold text-sm md:text-base">Koi teacher nahi mila.</p>
        </div>
    `;
};

export const handleDashboardMonthChange = (newMonth, assignedJamiaat, db, currentUser) => {
    currentSelectedMonth = newMonth.toLowerCase().trim();
    if (assignedJamiaat) gAssignedJamiaat = assignedJamiaat;
    if (db) gDb = db;
    if (currentUser) gCurrentUser = currentUser;

    const tableBody = document.getElementById('performance-table-body');
    if (!tableBody) return; 
    
    loadPerformanceTable(gAssignedJamiaat, gDb, gCurrentUser);
};

window.resetTeacherMonthReport = async (jamiaName, teacherId, teacherName) => {
    if (!confirm(`Reset data for ${teacherName}?`)) return;

    try {
        const databaseInstance = gDb;
        const userInstance = gCurrentUser;
        if (!databaseInstance || !userInstance) return alert("Session missing.");

        const monthSelect = document.getElementById('report-month');
        const activeMonthKey = (monthSelect && monthSelect.value) ? monthSelect.value : (currentSelectedMonth || "apr");
        const calSnap = await getDoc(doc(databaseInstance, "settings", "academic_calendar"));
        const activeYear = calSnap.exists() ? calSnap.data().activeYear : "2026-2027";
        const currentYearMonthPrefix = `${activeYear.split('-')[0]}-${monthNames.indexOf(activeMonthKey) + 1 < 10 ? '0' + (monthNames.indexOf(activeMonthKey) + 1) : monthNames.indexOf(activeMonthKey) + 1}`;

        const userRef = doc(databaseInstance, "users", userInstance.uid);
        const userSnap = await getDoc(userRef);
        let userData = userSnap.data() || {};
        let academicYears = userData.academicYears || {};
        let structure = academicYears[activeYear]?.karkardagiStructure || [];
        let jamiaData = structure.find(j => j.jamiaName === jamiaName);

        if (jamiaData) {
            const teacher = jamiaData.teachers.find(t => t.id === teacherId);
            if (teacher && teacher.periods) {
                teacher.periods.forEach(p => {
                    if (p.achieved) { delete p.achieved[activeMonthKey]; delete p.achieved[currentYearMonthPrefix]; }
                    if (p.locked) { delete p.locked[activeMonthKey]; delete p.locked[currentYearMonthPrefix]; }
                });
            }
        }
        await updateDoc(userRef, { academicYears: academicYears });

        const match = jamiaName.match(/\d+/);
        const jamiaDocId = match ? match[0] : "001";
        const perfDocRef = doc(databaseInstance, "academic_performance", jamiaDocId);
        const perfSnap = await getDoc(perfDocRef);

        if (perfSnap.exists()) {
            let currentPerfData = perfSnap.data();
            [activeMonthKey, currentYearMonthPrefix].forEach(mKey => {
                if (currentPerfData[mKey] && currentPerfData[mKey].teachers) {
                    currentPerfData[mKey].teachers = currentPerfData[mKey].teachers.filter(t => t.name.toLowerCase() !== teacherName.toLowerCase());
                }
            });
            await setDoc(perfDocRef, currentPerfData, { merge: true });
        }

        alert("Reset Done!");
        loadPerformanceTable(gAssignedJamiaat, databaseInstance, userInstance);

    } catch (err) {
        console.error("Reset Error:", err);
        alert("Error: " + err.message);
    }
};

window.downloadTeacherReportImage = (rowClass, teacherName) => {
    const rows = document.querySelectorAll(`.${rowClass}`);
    if (rows.length === 0) return alert("Rows nahi mili!");
    if (typeof html2canvas === 'undefined') return alert("Library missing!");

    const tempContainer = document.createElement('div');
    tempContainer.style.padding = "20px";
    tempContainer.style.background = "#ffffff";
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    
    let tableHtml = `<table style="width:100%; border-collapse:collapse; text-align:left; font-family:sans-serif; font-size:12px;">
        <thead style="background:#f8fafc; color:#475569; text-transform:uppercase;">
            <tr>
                <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Teacher</th>
                <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Class</th>
                <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Subject</th>
                <th style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:center;">Total</th>
                <th style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:center;">Target</th>
                <th style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:center;">Achieved</th>
                <th style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:center;">%</th>
                <th style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:center;">Kaifiyat</th>
            </tr>
        </thead>
        <tbody style="color:#334155;">`;

    rows.forEach(row => {
        const clonedRow = row.cloneNode(true);
        const lastCell = clonedRow.querySelector('td[rowspan], td:last-child');
        if (lastCell && lastCell.getAttribute('rowspan')) lastCell.remove(); 
        
        const input = clonedRow.querySelector('input');
        if(input) {
            const parent = input.parentElement;
            parent.innerHTML = `<span style="font-weight:bold; color:#1e293b;">${input.value || 0}</span>`;
        }
        
        tableHtml += `<tr style="border-bottom:1px solid #f1f5f9;">${clonedRow.innerHTML}</tr>`;
    });

    tableHtml += `</tbody></table>`;
    tempContainer.innerHTML = `
        <div style="margin-bottom:15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin:0; color:#0f172a; font-size:18px;">${teacherName} Report</h3>
            <p style="margin:4px 0 0 0; color:#64748b; font-size:10px; font-weight:bold;">DATE: ${new Date().toLocaleDateString()}</p>
        </div>
    ` + tableHtml;

    document.body.appendChild(tempContainer);

    html2canvas(tempContainer, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${teacherName}_Report.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        document.body.removeChild(tempContainer);
    });
};
// ==========================================
// SUMMARY TAB HELPER FUNCTIONS (ENGLISH VERSION)
// ==========================================

const calculateCumulativeTaught = (periodId, semester, currentMonthNum, currentYearNum, allReports) => {
    let cumulative = 0;
    allReports.forEach(report => {
        const rMonth = report.monthNum;
        const rYear = report.year;
        const isSemMatch = semester === '1' ? (rMonth >= 3 && rMonth <= 7) : (rMonth >= 8 || rMonth === 0);
        
        if (isSemMatch) {
            if (rYear < currentYearNum || (rYear === currentYearNum && rMonth <= currentMonthNum)) {
                const entry = report.karkardagiReport?.data?.find(e => e.periodId === periodId);
                if (entry) cumulative += (entry.pagesTaught || 0);
            }
        }
    });
    return cumulative;
};

const loadAndRenderSummaryTabs = async (targetTabId, db, currentUser, assignedJamiaat) => {
    try {
        // Fetch Active Year and Database only once
        if (gAllYearReportsData.length === 0 || !gSummaryActiveYear) {
            const calSnap = await getDoc(doc(db, "settings", "academic_calendar"));
            gSummaryActiveYear = calSnap.exists() ? (calSnap.data().activeYear || "2026-2027") : "2026-2027";
            
            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userSnap.exists()) {
                const academicYears = userSnap.data().academicYears || {};
                gSummaryKarkardagiStructure = academicYears[gSummaryActiveYear]?.karkardagiStructure || [];
            }

            const reportsRef = collection(db, 'monthly_reports');
            const q = query(reportsRef, where('userId', '==', currentUser.uid), where('academicYear', '==', gSummaryActiveYear));
            const snap = await getDocs(q);
            gAllYearReportsData = [];
            snap.forEach(d => gAllYearReportsData.push(d.data()));
        }

        const monthIdx = parseInt(document.getElementById('summary-month-select')?.value || new Date().getMonth());
        const semester = monthIdx >= 3 && monthIdx <= 7 ? "1" : "2";
        const currentYearNum = parseInt(gSummaryActiveYear.split('-')[semester === "1" ? 0 : (monthIdx >= 8 ? 0 : 1)]);

        // 1. MONTHLY MUNASIB REPORT
        if (targetTabId === 'munasib-tab') {
            const container = document.getElementById('monthly-munasib-container');
            const monthReport = gAllYearReportsData.find(r => r.monthNum === monthIdx && r.year === currentYearNum);
            
            if (!monthReport || !monthReport.karkardagiReport?.data) {
                container.innerHTML = `<p class="text-yellow-600 font-bold p-4 bg-yellow-50 rounded-lg text-center">No data available for this month.</p>`;
                return;
            }

            const munasibPeriods = monthReport.karkardagiReport.data.filter(p => p.kaifiyat === 'Munasib' && assignedJamiaat.includes(p.jamiaName));
            if (munasibPeriods.length === 0) {
                container.innerHTML = `<p class="text-emerald-600 font-bold p-4 bg-emerald-50 rounded-lg text-center">Excellent! No 'Munasib' performance this month.</p>`;
                return;
            }

            let html = `<div class="overflow-x-auto border rounded-lg shadow-sm bg-white"><table class="w-full text-sm text-left"><tbody>`;
            const jamiaGroups = {};
            munasibPeriods.forEach(p => {
                if(!jamiaGroups[p.jamiaName]) jamiaGroups[p.jamiaName] = {};
                if(!jamiaGroups[p.jamiaName][p.teacherId]) jamiaGroups[p.jamiaName][p.teacherId] = { name: p.teacherName, periods: [] };
                jamiaGroups[p.jamiaName][p.teacherId].periods.push(p);
            });

            Object.keys(jamiaGroups).sort().forEach(jamia => {
                html += `
                <tr class="bg-indigo-50 border-b-2 border-indigo-200">
                    <td colspan="10" class="p-3 font-bold text-indigo-900 text-lg">${jamia}</td>
                </tr>
                <tr class="bg-red-50 text-red-800 text-xs font-bold border-b border-red-200 uppercase">
                    <td class="p-2 border-r border-red-200">Teacher</td>
                    <td class="p-2 border-r border-red-200">Class</td>
                    <td class="p-2 border-r border-red-200">Book</td>
                    <td class="p-2 border-r border-red-200 text-center">Total</td>
                    <td class="p-2 border-r border-red-200 text-center">Target</td>
                    <td class="p-2 border-r border-red-200 text-center">Achieved</td>
                    <td class="p-2 border-r border-red-200 text-center">%</td>
                    <td class="p-2 text-center">Status</td>
                </tr>`;

                Object.keys(jamiaGroups[jamia]).forEach((tid, idx) => {
                    const teacher = jamiaGroups[jamia][tid];
                    const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                    teacher.periods.forEach((p, pIdx) => {
                        html += `
                        <tr class="${bgClass} border-b border-gray-100 hover:bg-gray-100">
                            ${pIdx === 0 ? `<td rowspan="${teacher.periods.length}" class="p-2 border-r border-gray-200 font-bold text-red-800">${teacher.name}</td>` : ''}
                            <td class="p-2 border-r border-gray-200">${p.className}</td>
                            <td class="p-2 border-r border-gray-200">${p.bookName}</td>
                            <td class="p-2 border-r border-gray-200 font-bold text-center">${p.monthlyTarget || 0}</td>
                            <td class="p-2 border-r border-gray-200 text-center">${p.pagesTaught || 0}</td>
                            <td class="p-2 border-r border-gray-200 font-bold text-blue-700 text-center">${p.achievement}%</td>
                            <td class="p-2 border-r border-gray-200 font-bold text-red-600 text-center">${p.kaifiyat}</td>
                        </tr>`;
                    });
                });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
        }

        // 2. SEMESTER HISTORY
        else if (targetTabId === 'history-tab') {
            const container = document.getElementById('munasib-history-container');
            const semMonths = semester === '1' ? [3, 4, 5, 6, 7] : [8, 9, 10, 11, 0];
            let historyData = {};

            semMonths.forEach(m => {
                let y = currentYearNum;
                if (semester === '2' && m < 8) y = parseInt(gSummaryActiveYear.split('-')[1]); 
                const report = gAllYearReportsData.find(r => r.monthNum === m && r.year === y);
                
                if (report && report.karkardagiReport?.data) {
                    report.karkardagiReport.data.forEach(entry => {
                        if (!assignedJamiaat.includes(entry.jamiaName)) return;
                        if (!historyData[entry.jamiaName]) historyData[entry.jamiaName] = {};
                        if (!historyData[entry.jamiaName][entry.teacherId]) {
                            historyData[entry.jamiaName][entry.teacherId] = { name: entry.teacherName, periods: {} };
                        }
                        if (!historyData[entry.jamiaName][entry.teacherId].periods[entry.periodId]) {
                            historyData[entry.jamiaName][entry.teacherId].periods[entry.periodId] = { class: entry.className, book: entry.bookName, status: {}, mCount: 0 };
                        }
                        const pData = historyData[entry.jamiaName][entry.teacherId].periods[entry.periodId];
                        pData.status[m] = entry.kaifiyat;
                        if (entry.kaifiyat === 'Munasib') pData.mCount++;
                    });
                }
            });

            let html = `<div class="overflow-x-auto border rounded-xl shadow-sm bg-white"><table class="w-full text-sm text-left"><thead class="bg-slate-100 border-b"><tr>
                <th class="p-3">Teacher Name</th>
                <th class="p-3">Book / Class</th>`;
            semMonths.forEach(m => { html += `<th class="p-3 text-indigo-700 text-center">${monthNames[m].toUpperCase()}</th>`; });
            html += `<th class="p-2 text-center text-red-700 font-bold text-xs uppercase">Total Munasib</th></tr></thead><tbody>`;

            let hasData = false;
            Object.keys(historyData).forEach(jamia => {
                let jamiaHasMunasib = false;
                Object.values(historyData[jamia]).forEach(t => { Object.values(t.periods).forEach(p => { if(p.mCount > 0) jamiaHasMunasib = true; }); });
                
                if(jamiaHasMunasib) {
                    hasData = true;
                    html += `<tr class="bg-indigo-50 border-b border-indigo-200"><td colspan="${semMonths.length + 3}" class="p-3 text-lg font-bold text-indigo-900">${jamia}</td></tr>`;
                    Object.values(historyData[jamia]).forEach(t => {
                        const periods = Object.values(t.periods).filter(p => p.mCount > 0);
                        periods.forEach((p, pIdx) => {
                            html += `<tr class="border-b border-gray-100 hover:bg-slate-50">
                                ${pIdx === 0 ? `<td rowspan="${periods.length}" class="p-3 font-bold border-r border-gray-200">${t.name}</td>` : ''}
                                <td class="p-3 border-r border-gray-200 font-medium">${p.book}<br><span class="text-xs text-gray-500">${p.class}</span></td>`;
                            
                            semMonths.forEach(m => {
                                const st = p.status[m];
                                let badge = `<span class="text-gray-300">-</span>`;
                                if(st === 'Munasib') badge = `<span class="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs">Munasib</span>`;
                                else if(st === 'Mumtaz' || st === 'Behtar') badge = `<span class="text-emerald-500"><i class="fas fa-check-circle"></i></span>`;
                                html += `<td class="p-3 border-r border-gray-100 text-center">${badge}</td>`;
                            });
                            html += `<td class="p-3 font-bold bg-red-50 text-red-700 text-center text-lg">${p.mCount}</td></tr>`;
                        });
                    });
                }
            });

            html += `</tbody></table></div>`;
            container.innerHTML = hasData ? html : `<div class="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center"><i class="fas fa-check-circle text-emerald-500 text-3xl mb-2"></i><h5 class="text-xl font-bold text-emerald-800">Excellent!</h5><p class="text-emerald-700 mt-2">No 'Munasib' history for this semester.</p></div>`;
        }

        // 3. TEACHER PROFILE
        else if (targetTabId === 'profile-tab') {
            const jamia = document.getElementById('teacher-profile-jamia').value;
            const teacherId = document.getElementById('teacher-profile-teacher').value;
            const container = document.getElementById('teacher-profile-container');
            
            if (!jamia || !teacherId) { container.innerHTML = `<p class="text-red-500 font-bold">Please select Jamia and Teacher.</p>`; return; }
            
            const jamiaData = gSummaryKarkardagiStructure.find(j => j.jamiaName === jamia);
            let teachersToRender = teacherId === 'all' ? jamiaData.teachers.filter(t => (t.periods || []).some(p => p.semester === semester)) : [jamiaData.teachers.find(t => t.id === teacherId)];

            const semMonths = semester === '1' ? [3, 4, 5, 6, 7] : [8, 9, 10, 11, 0];
            const validMonths = semMonths.filter(m => {
                let y = semester === '1' ? parseInt(gSummaryActiveYear.split('-')[0]) : (m >= 8 ? parseInt(gSummaryActiveYear.split('-')[0]) : parseInt(gSummaryActiveYear.split('-')[1]));
                if (y < currentYearNum) return true;
                if (y === currentYearNum && m <= monthIdx) return true;
                return false;
            });

            let html = ``;
            teachersToRender.forEach(t => {
                const periods = (t.periods || []).filter(p => p.semester === semester);
                if (periods.length === 0) return;

                html += `
                <div class="mb-8 border rounded-xl shadow-sm bg-white overflow-hidden p-4">
                    <h6 class="text-lg font-bold text-indigo-700 mb-3 border-b-2 border-indigo-100 pb-2">Teacher: ${t.name}</h6>
                    <div class="overflow-x-auto no-scrollbar"><table class="w-full text-sm text-left">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-2 border-r border-gray-200">Book / Class</th>
                                <th class="p-2 border-r border-gray-200 text-center">Total Pages</th>
                                <th class="p-2 border-r border-gray-200 text-center">Total Taught</th>
                                <th class="p-2 bg-yellow-100 text-red-700 border-r border-gray-200 text-center">Remaining</th>
                                <th class="p-2 bg-emerald-100 text-emerald-800 border-r border-gray-200 text-center">%</th>`;
                                
                validMonths.forEach(m => { html += `<th colspan="2" class="p-2 border-r border-gray-200 text-indigo-700 text-center uppercase">${monthNames[m]}</th>`; });
                html += `</tr><tr><th colspan="5" class="border-b border-gray-200"></th>`;
                
                validMonths.forEach(() => { html += `<th class="p-2 bg-slate-50 text-blue-600 border-r border-gray-200 text-center">Target</th><th class="p-2 bg-slate-50 text-emerald-600 border-r border-gray-200 text-center">Taught</th>`; });
                html += `</tr></thead><tbody>`;

                periods.forEach(p => {
                    const cumTaught = calculateCumulativeTaught(p.id, semester, monthIdx, currentYearNum, gAllYearReportsData);
                    const rem = p.totalPages - cumTaught;
                    const pct = p.totalPages > 0 ? Math.round((cumTaught/p.totalPages)*100) : 0;

                    html += `<tr class="border-b border-gray-100 hover:bg-slate-50">
                        <td class="p-2 border-r border-gray-200 font-medium">${p.bookName} <span class="text-xs text-gray-500">(${p.className})</span></td>
                        <td class="p-2 font-bold border-r border-gray-200 text-center">${p.totalPages}</td>
                        <td class="p-2 font-bold text-indigo-700 border-r border-gray-200 text-center">${cumTaught}</td>
                        <td class="p-2 font-bold bg-yellow-50 text-red-700 border-r border-gray-200 text-center">${rem}</td>
                        <td class="p-2 font-bold bg-emerald-50 text-emerald-700 border-r border-gray-200 text-center">${pct}%</td>`;

                    validMonths.forEach(m => {
                        let y = semester === '1' ? parseInt(gSummaryActiveYear.split('-')[0]) : (m >= 8 ? parseInt(gSummaryActiveYear.split('-')[0]) : parseInt(gSummaryActiveYear.split('-')[1]));
                        const mReport = gAllYearReportsData.find(r => r.monthNum === m && r.year === y);
                        const entry = mReport?.karkardagiReport?.data?.find(e => e.periodId === p.id);
                        html += `<td class="p-2 border-r border-gray-200 text-center">${entry?.monthlyTarget || 0}</td><td class="p-2 border-r border-gray-200 font-bold text-center">${entry?.pagesTaught || 0}</td>`;
                    });
                    html += `</tr>`;
                });
                html += `</tbody></table></div></div>`;
            });
            container.innerHTML = html;
        }
    } catch (err) {
        console.error("Summary Render Error:", err);
    }
};

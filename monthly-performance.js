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

// NAYE GLOBAL VARIABLES: Dynamic Semester Months ke liye yahan add kiye gaye hain
let gActiveSem1Months = [];
let gActiveSem2Months = [];

// Current month default set rahega
let currentSelectedMonth = monthNames[new Date().getMonth()]; 

// Academic Admin ki settings fetch karne ka function (Naya function jo 0 days walo ko hata dega)
async function getAcademicConfig(db) {
    if (!academicConfig) {
        const [calSnap, configSnap] = await Promise.all([
            getDoc(doc(db, "settings", "academic_calendar")),
            getDoc(doc(db, "settings", "academic_config"))
        ]);
        let calData = calSnap.exists() ? calSnap.data() : {};
        let confData = configSnap.exists() ? configSnap.data() : {};
        academicConfig = { ...confData, ...calData };
    }

    // Dynamic Mahine check karna (Jisme 0 days hain unhe skip karna)
    if (gActiveSem1Months.length === 0 || gActiveSem2Months.length === 0) {
        let s1 = [], s2 = [];
        monthNames.forEach((m, idx) => {
            let sem1Days = 0, sem2Days = 0;
            if (academicConfig.months && academicConfig.months[m]) {
                sem1Days = parseInt(academicConfig.months[m].sem1) || 0;
                sem2Days = parseInt(academicConfig.months[m].sem2) || 0;
            } else if (academicConfig.monthDetails && academicConfig.monthDetails[idx]) {
                sem1Days = parseInt(academicConfig.monthDetails[idx].sem1) || 0;
                sem2Days = parseInt(academicConfig.monthDetails[idx].sem2) || 0;
            }
            if (sem1Days > 0) s1.push(m);
            if (sem2Days > 0) s2.push(m);
        });

        gActiveSem1Months = s1.length > 0 ? s1 : ["apr", "may", "jun", "jul", "aug"];
        gActiveSem2Months = s2.length > 0 ? s2 : ["sep", "oct", "nov", "dec", "jan", "feb", "mar"];
    }

    return academicConfig;
}

// Add this helper near the top of monthly-performance.js
const getActiveShortMonth = () => {
    return currentSelectedMonth;
};
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
    await getAcademicConfig(db); // Settings aur dynamic months load karein
    
    // Sirf wahi mahine nikalen jinme kisi bhi semester ke days > 0 hain
    const activeMonths = [...new Set([...gActiveSem1Months, ...gActiveSem2Months])];
    const orderedActiveMonths = monthNames.filter(m => activeMonths.includes(m));

   // renderSubTabContent function me jahan 'performance' tab ka if condition hai:
    if (tabName === 'performance') {
        if (!document.getElementById('report-jamia')) {
            contentArea.innerHTML = `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 bg-slate-50/50 p-3 md:p-4 rounded-xl border border-slate-100 gap-3">
                    <div class="flex flex-col">
                        <h3 class="font-bold text-slate-800 text-sm md:text-base">Performance Analytics</h3>
                        <p class="text-[10px] md:text-xs text-slate-500 font-medium">Filter by Month & Jamia</p>
                    </div>
                    <div class="w-full sm:w-auto flex flex-col sm:flex-row gap-2 md:gap-3">
                        <select id="performance-month-select" class="w-full sm:w-auto p-2 border border-slate-200 rounded-lg text-xs md:text-sm font-medium bg-white outline-none focus:border-indigo-400 transition cursor-pointer">
                            ${orderedActiveMonths.map(m => `<option value="${m}" ${m === currentSelectedMonth ? 'selected' : ''}>${m.toUpperCase()}</option>`).join('')}
                        </select>
                        <select id="report-jamia" class="w-full sm:w-auto p-2 border border-slate-200 rounded-lg text-xs md:text-sm font-medium bg-white outline-none focus:border-indigo-400 transition cursor-pointer">
                            <option value="all">All Jamiaat</option>
                            ${assignedJamiaat.map(j => `<option value="${j}">${j}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div id="performance-table-body" class="space-y-4 md:space-y-6"></div>
            `;
        }


        const jamiaSelect = document.getElementById('report-jamia');
        const monthSelect = document.getElementById('performance-month-select');

        if (jamiaSelect) {
            jamiaSelect.onchange = () => loadPerformanceTable(assignedJamiaat, db, currentUser);
        }
        
        if (monthSelect) {
            monthSelect.onchange = (e) => {
                currentSelectedMonth = e.target.value.toLowerCase().trim(); 
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
                             ${orderedActiveMonths.map(m => `<option value="${monthNames.indexOf(m)}" ${m === currentSelectedMonth ? 'selected' : ''}>${m.toUpperCase()}</option>`).join('')}
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

        const summaryBtns = contentArea.querySelectorAll('.summary-sub-btn');
        const summaryContents = contentArea.querySelectorAll('.summary-content');
        const monthSelect = document.getElementById('summary-month-select');

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

        document.getElementById('teacher-profile-jamia').onchange = (e) => {
            const jamia = e.target.value;
            const teacherSelect = document.getElementById('teacher-profile-teacher');
            if(!jamia) { teacherSelect.innerHTML = '<option value="">Select Teacher</option>'; return; }
            
            const jamiaData = gSummaryKarkardagiStructure.find(j => j.jamiaName === jamia);
            if(jamiaData && jamiaData.teachers) {
                teacherSelect.innerHTML = '<option value="all" class="font-bold text-indigo-700">(All Teachers)</option>' + 
                    jamiaData.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            }
        };

        document.getElementById('show-teacher-profile-btn').onclick = () => loadAndRenderSummaryTabs('profile-tab', db, currentUser, assignedJamiaat);

        loadAndRenderSummaryTabs('munasib-tab', db, currentUser, assignedJamiaat);
        
    } else if (tabName === 'structure') {
        // (Iska baqi code waisa hi rahega)
        const config = await getAcademicConfig(db);
        const activeYearByAdmin = config ? config.activeYear : "2026-2027";

        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const academicYearsData = userSnap.data().academicYears || {};
        const allYears = Object.keys(academicYearsData);
        if (!allYears.includes(activeYearByAdmin)) allYears.push(activeYearByAdmin);

        contentArea.innerHTML = `
            <div class="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 mb-4 md:mb-6 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div><h4 class="text-xs md:text-sm font-black text-slate-700 uppercase tracking-wide">Academic Year</h4></div>
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
    const container = document.getElementById('performance-table-body');
    if (!container) return; 

    // NAYA: Data aane tak Loader show karein taake UI freeze na ho
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-12 space-y-4">
            <i class="fas fa-circle-notch fa-spin text-4xl text-indigo-500"></i>
            <p class="font-bold text-slate-500 text-sm">Performance Data Load Ho Raha Hai...</p>
        </div>`;

    try {
        const [targetSnap, calSnap, userSnap] = await Promise.all([
            getDoc(doc(db, "settings", "monthly_page_targets")),
            getDoc(doc(db, "settings", "academic_calendar")),
            getDoc(doc(db, "users", currentUser.uid))
        ]);

        const monthlyTargets = targetSnap.exists() ? (targetSnap.data().targets || {}) : {};
        
        const jamiaSelectElem = document.getElementById('report-jamia');
        const selectedJamia = jamiaSelectElem ? jamiaSelectElem.value : "all";
        
        const activeYear = calSnap.exists() ? (calSnap.data().activeYear || "2026-2027") : "2026-2027";
        const userData = userSnap.data() || {};
        const academicYears = userData.academicYears || {};

        if(!academicYears[activeYear]){
            container.innerHTML = `<div class="p-5 text-center text-red-500 font-bold text-sm">Academic Year Data Missing</div>`;
            return;
        }

        const karkardagi = academicYears[activeYear]?.karkardagiStructure || [];
        const filteredJamiaat = selectedJamia === "all" ? jamiaat : jamiaat.filter(j => j === selectedJamia);
        const targetMonthKey = getActiveShortMonth();
        const currentYearMonthPrefix = `${activeYear.split('-')[0]}-${monthNames.indexOf(targetMonthKey) + 1 < 10 ? '0' + (monthNames.indexOf(targetMonthKey) + 1) : monthNames.indexOf(targetMonthKey) + 1}`;

        // NAYA: Sab Jamiaat ka Public data ek hi baar fetch karein (Speed Optimized)
        const publicDataPromises = filteredJamiaat.map(jamiaName => {
            const match = jamiaName.match(/\d+/);
            const jamiaDocId = match ? match[0] : "001";
            return getDoc(doc(db, "academic_performance", jamiaDocId));
        });
        const publicSnaps = await Promise.all(publicDataPromises);

        let html = "";

        for (let i = 0; i < filteredJamiaat.length; i++) {
            const jamiaName = filteredJamiaat[i];
            const jamiaData = karkardagi.find(j => j.jamiaName === jamiaName);
            if (!jamiaData) continue;

            const safeId = jamiaName.replace(/\s+/g, '');
            const publicPerfSnap = publicSnaps[i];
            let publicMonthData = null;
            if (publicPerfSnap.exists()) {
                publicMonthData = publicPerfSnap.data()[targetMonthKey] || publicPerfSnap.data()[currentYearMonthPrefix] || null;
            }

            // DUSRI IMAGE WALA CARD DESIGN (Border top ke sath aur Colorful Buttons)
            html += `
            <div class="bg-white rounded-lg shadow-md overflow-hidden jamia-card mb-6 border-t-4 border-t-blue-500 border-x border-b border-slate-200" id="card-${safeId}">
                <div class="bg-slate-50/50 p-3 md:p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div><h3 class="font-black text-slate-800 text-base md:text-lg tracking-tight uppercase">${jamiaName}</h3></div>
                    
                    <!-- VIBRANT ACTION BUTTONS (Image 2 ki tarah) -->
                    <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button onclick="copyTeacherFormLink('${jamiaName}')" class="flex-1 sm:flex-none bg-emerald-500 text-white text-[10px] md:text-xs px-3 py-1.5 rounded hover:bg-emerald-600 transition font-bold shadow-sm flex items-center justify-center"><i class="fas fa-link mr-1.5"></i> Link</button>
                        <button onclick="downloadJamiaImage('${jamiaName}')" class="flex-1 sm:flex-none bg-red-500 text-white text-[10px] md:text-xs px-3 py-1.5 rounded hover:bg-red-600 transition font-bold shadow-sm flex items-center justify-center"><i class="fas fa-image mr-1.5"></i> Image</button>
                        <button onclick="downloadJamiaExcel('${jamiaName}')" class="flex-1 sm:flex-none bg-blue-600 text-white text-[10px] md:text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition font-bold shadow-sm flex items-center justify-center"><i class="fas fa-file-csv mr-1.5"></i> CSV</button>
                        <button onclick="toggleEditMode('${jamiaName}')" class="edit-btn-${safeId} flex-1 sm:flex-none bg-purple-600 text-white text-[10px] md:text-xs px-3 py-1.5 rounded hover:bg-purple-700 transition font-bold shadow-sm flex items-center justify-center"><i class="fas fa-edit mr-1.5"></i> Edit Pages</button>
                    </div>
                </div>
                
                <div class="overflow-x-auto no-scrollbar bg-white p-2">
                    <table class="w-full text-left whitespace-nowrap min-w-max">
                        <thead class="bg-slate-100/50 text-slate-600 text-[10px] md:text-xs uppercase font-bold border-y border-slate-200">
                            <tr>
                                <th class="px-3 py-3 md:px-4">Teacher</th>
                                <th class="px-3 py-3 md:px-4">Class</th>
                                <th class="px-3 py-3 md:px-4">Book</th>
                                <th class="px-3 py-3 md:px-4 text-center">Total</th>
                                <th class="px-3 py-3 md:px-4 text-center">Target</th>
                                <th class="px-3 py-3 md:px-4 text-center">Achieved</th>
                                <th class="px-3 py-3 md:px-4 text-center">%</th>
                                <th class="px-3 py-3 md:px-4 text-center">Kaifiyat</th>
                                <th class="px-3 py-3 md:px-4 text-center">Action</th> 
                            </tr>
                        </thead>
                        <tbody class="text-xs md:text-sm text-slate-700 divide-y divide-slate-100">`;

            jamiaData.teachers.forEach((teacher) => {
                const publicTeacher = publicMonthData?.teachers?.find(t => t.name.toLowerCase() === teacher.name.toLowerCase());
                const totalPeriodsCount = teacher.periods?.length || 0;

                let totalTeacherTarget = 0;
                let totalTeacherAchieved = 0;
                let firstPeriodSemester = 1;

                teacher.periods?.forEach((p, pIdx) => {
                    // ... (Yahan target aur achieved calculate karne ka purana logic same rahega, usko change nahi karna hai) ...
                    let target = 0;
                    const exactSubId = `${(p.className || "").trim()}_${(p.bookName || "").trim()}`.replace(/\s+/g, '_');

                    if (monthlyTargets && monthlyTargets[exactSubId] && monthlyTargets[exactSubId][targetMonthKey] !== undefined) {
                        target = parseInt(monthlyTargets[exactSubId][targetMonthKey]) || 0;
                    } 
                    else if (monthlyTargets) {
                        const userClassNoSpace = (p.className || "").trim().toLowerCase().replace(/[\s\-_]/g, ''); 
                        const userBookNameFormatted = (p.bookName || "").trim().replace(/\s+/g, '_').toLowerCase();

                        for (const adminKey in monthlyTargets) {
                            const adminKeyLower = adminKey.toLowerCase();
                            const suffix = `_${userBookNameFormatted}`;
                            
                            if (adminKeyLower.endsWith(suffix)) {
                                const adminClassKeyPart = adminKeyLower.substring(0, adminKeyLower.length - suffix.length);
                                const adminClassNoSpace = adminClassKeyPart.replace(/[\s\-_]/g, '');
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

                    // NAYA TABLE ROW DESIGN (No vertical borders, simple bottom border)
                    html += `
                        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 ${teacherRowId}">
                            <td class="px-3 py-2.5 md:px-4 md:py-3 font-medium text-slate-800 whitespace-normal min-w-[120px] md:min-w-[150px]">${pIdx === 0 ? teacher.name : ''}</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 whitespace-normal min-w-[120px] md:min-w-[150px]">${p.className}</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 whitespace-normal min-w-[120px] md:min-w-[150px]">${p.bookName}</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 text-center">${p.totalPages}</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 text-center font-bold text-indigo-500 bg-indigo-50/30 rounded-md">${target}</td>
                            <td class="px-2 py-2 md:px-3 md:py-2 text-center">
                                <input type="number" value="${achievedValue}" disabled 
                                       data-tid="${teacher.id}" data-pid="${p.id}"
                                       class="achieved-input-${safeId} w-12 md:w-16 p-1 md:p-1.5 border border-transparent rounded-md text-center bg-transparent mx-auto block text-xs md:text-sm font-bold focus:ring-1 focus:ring-indigo-300 transition-all outline-none"
                                       oninput="updateRowStatusLive(this, ${target}, '${targetMonthKey}', '${p.semester}')">
                            </td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 text-center font-bold text-slate-600 perc-cell text-[10px] md:text-sm">${percentage}%</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 text-center italic status-cell text-[10px] md:text-sm ${result.colorClass}">${result.kaifiyat}</td>
                            ${pIdx === 0 ? `
                            <td class="px-2 py-2 md:px-3 text-center align-middle" rowspan="${totalPeriodsCount + 1}">
                                <div class="flex flex-col gap-1.5 items-center justify-center">
                                    <button onclick="downloadTeacherReportImage('${teacherRowId}', '${teacher.name}')" class="text-slate-400 hover:text-rose-500 transition text-xs"><i class="fas fa-camera"></i></button>
                                    <button onclick="window.resetTeacherMonthReport('${jamiaName}', '${teacher.id}', '${teacher.name}')" class="text-slate-400 hover:text-red-500 transition text-xs"><i class="fas fa-undo"></i></button>
                                </div>
                            </td>` : ''}
                        </tr>`;
                });

                if (totalPeriodsCount > 0) {
                    const overallPercentage = totalTeacherTarget > 0 ? Math.round((totalTeacherAchieved / totalTeacherTarget) * 100) : 0;
                    const overallResult = calculateKaifiyatAndStyle(overallPercentage, targetMonthKey, firstPeriodSemester);

                    html += `
                        <tr class="bg-indigo-50/50 border-b-2 border-indigo-100/50">
                            <td colspan="4" class="px-3 py-2.5 md:px-4 md:py-3 text-right font-bold text-indigo-800 uppercase text-[9px] md:text-[11px] tracking-wider">Summary:</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 text-center font-bold text-indigo-600">${totalTeacherTarget}</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 text-center font-bold text-emerald-600">${totalTeacherAchieved}</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 text-center font-bold text-slate-700 text-[10px] md:text-sm">${overallPercentage}%</td>
                            <td class="px-3 py-2.5 md:px-4 md:py-3 text-center italic status-cell text-[10px] md:text-sm ${overallResult.colorClass}">${overallResult.kaifiyat}</td>
                        </tr>`;
                }
            });
            html += `</tbody></table></div></div>`;
        }

        container.innerHTML = html || '<div class="p-8 text-center text-slate-400 font-medium">Data nahi mila.</div>';
    } catch (e) {
        console.error("Load Error:", e);
        container.innerHTML = `<div class="p-5 text-center text-red-500 font-bold">Error loading data.</div>`;
    }
};

function getSemesterMonthNumber(monthId, semester) {
    // Ab ye direct Admin Calendar ki list se month ka order nikalega
    if (semester == "1" || semester === 1) {
        return gActiveSem1Months.indexOf(monthId) + 1; 
    } else {
        return gActiveSem2Months.indexOf(monthId) + 1; 
    }
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

    const savingMonthId = getActiveShortMonth();

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
        await getAcademicConfig(db); // Database Calendar Sync
        
        if (gAllYearReportsData.length === 0 || !gSummaryActiveYear) {
            const calSnap = await getDoc(doc(db, "settings", "academic_calendar"));
            gSummaryActiveYear = calSnap.exists() ? (calSnap.data().activeYear || "2026-2027") : "2026-2027";
            
            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userSnap.exists()) {
                const academicYears = userSnap.data().academicYears || {};
                gSummaryKarkardagiStructure = academicYears[gSummaryActiveYear]?.karkardagiStructure || [];
            }
        }

        const targetSnap = await getDoc(doc(db, "settings", "monthly_page_targets"));
        const monthlyTargets = targetSnap.exists() ? (targetSnap.data().targets || {}) : {};

        const monthSelectElem = document.getElementById('summary-month-select');
        const monthIdx = parseInt(monthSelectElem?.value || monthNames.indexOf(currentSelectedMonth));
        const targetMonthKey = monthNames[monthIdx];
        const currentYearMonthPrefix = `${gSummaryActiveYear.split('-')[0]}-${monthIdx + 1 < 10 ? '0' + (monthIdx + 1) : monthIdx + 1}`;
        
        // DYNAMIC SEMESTER & MONTHS LINKED TO YOUR DB
        const semester = gActiveSem1Months.includes(targetMonthKey) ? "1" : "2";
        const allSemMonths = semester === "1" ? gActiveSem1Months : gActiveSem2Months;
        
        // 🎯 NAYA LOGIC: Selected mahine tak hi columns ko limit karna
        const targetIdxInSem = allSemMonths.indexOf(targetMonthKey);
        const semMonths = targetIdxInSem !== -1 ? allSemMonths.slice(0, targetIdxInSem + 1) : allSemMonths;

        const publicDataMap = {};
        const publicDataPromises = assignedJamiaat.map(async (jamiaName) => {
            const match = jamiaName.match(/\d+/);
            const jamiaDocId = match ? match[0] : "001";
            const snap = await getDoc(doc(db, "academic_performance", jamiaDocId));
            if (snap.exists()) publicDataMap[jamiaName] = snap.data();
            else publicDataMap[jamiaName] = {};
        });
        await Promise.all(publicDataPromises);

        const getTargetValue = (period, monthKey) => {
            let target = 0;
            const exactSubId = `${(period.className || "").trim()}_${(period.bookName || "").trim()}`.replace(/\s+/g, '_');
            if (monthlyTargets[exactSubId] && monthlyTargets[exactSubId][monthKey] !== undefined) {
                target = parseInt(monthlyTargets[exactSubId][monthKey]) || 0;
            } else if (monthlyTargets) {
                const userClassNoSpace = (period.className || "").trim().toLowerCase().replace(/[\s\-_]/g, ''); 
                const userBookNameFormatted = (period.bookName || "").trim().replace(/\s+/g, '_').toLowerCase();
                for (const adminKey in monthlyTargets) {
                    const adminKeyLower = adminKey.toLowerCase();
                    const suffix = `_${userBookNameFormatted}`;
                    if (adminKeyLower.endsWith(suffix)) {
                        const adminClassKeyPart = adminKeyLower.substring(0, adminKeyLower.length - suffix.length);
                        const adminClassNoSpace = adminClassKeyPart.replace(/[\s\-_]/g, '');
                        if (userClassNoSpace.startsWith(adminClassNoSpace)) {
                            if (monthlyTargets[adminKey][monthKey] !== undefined) {
                                target = parseInt(monthlyTargets[adminKey][monthKey]) || 0;
                                break; 
                            }
                        }
                    }
                }
            }
            return target;
        };

        const getAchievedValue = (period, monthKey, jamiaName, teacherName) => {
            const prefix = `${gSummaryActiveYear.split('-')[0]}-${monthNames.indexOf(monthKey) + 1 < 10 ? '0' + (monthNames.indexOf(monthKey) + 1) : monthNames.indexOf(monthKey) + 1}`;
            let val = 0;
            
            if (period.achieved && period.achieved[prefix] !== undefined) val = period.achieved[prefix];
            else if (period.achieved && period.achieved[monthKey] !== undefined) val = period.achieved[monthKey];
            else {
                const publicJamia = publicDataMap[jamiaName] || {};
                const publicMonth = publicJamia[monthKey] || publicJamia[prefix];
                if (publicMonth && publicMonth.teachers) {
                    const pTeacher = publicMonth.teachers.find(t => t.name.toLowerCase() === teacherName.toLowerCase());
                    if (pTeacher && pTeacher.periods_detail) {
                        const matched = Object.keys(pTeacher.periods_detail).find(k => {
                            const d = pTeacher.periods_detail[k];
                            return d.class === period.className && d.subject === period.bookName;
                        });
                        if (matched) val = pTeacher.periods_detail[matched].page_to || 0;
                    }
                }
            }
            return val;
        };

        // ----------------------------------------------------
        // TAB 1: MONTHLY MUNASIB REPORT
        // ----------------------------------------------------
        if (targetTabId === 'munasib-tab') {
            const container = document.getElementById('monthly-munasib-container');
            let munasibPeriods = [];

            gSummaryKarkardagiStructure.forEach(jamia => {
                if (!assignedJamiaat.includes(jamia.jamiaName)) return;

                jamia.teachers.forEach(teacher => {
                    (teacher.periods || []).filter(p => p.semester == semester).forEach(p => {
                        const target = getTargetValue(p, targetMonthKey);
                        const achievedValue = getAchievedValue(p, targetMonthKey, jamia.jamiaName, teacher.name);
                        
                        const percentage = target > 0 ? Math.round((achievedValue / target) * 100) : 0;
                        const result = calculateKaifiyatAndStyle(percentage, targetMonthKey, p.semester);

                        if (result.kaifiyat === 'Munasib') {
                            munasibPeriods.push({
                                jamiaName: jamia.jamiaName, teacherName: teacher.name,
                                className: p.className, bookName: p.bookName,
                                monthlyTarget: target, pagesTaught: achievedValue,
                                achievement: percentage, kaifiyat: result.kaifiyat
                            });
                        }
                    });
                });
            });

            if (munasibPeriods.length === 0) {
                container.innerHTML = `<p class="text-emerald-600 font-bold p-4 bg-emerald-50 rounded-lg text-center border border-emerald-100">Excellent! Is mahine koi 'Munasib' (kam) performance nahi hai.</p>`;
                return;
            }

            let html = `<div class="overflow-x-auto border rounded-xl shadow-sm bg-white"><table class="w-full text-sm text-left whitespace-nowrap"><tbody>`;
            const jamiaGroups = {};
            munasibPeriods.forEach(p => {
                if(!jamiaGroups[p.jamiaName]) jamiaGroups[p.jamiaName] = {};
                if(!jamiaGroups[p.jamiaName][p.teacherName]) jamiaGroups[p.jamiaName][p.teacherName] = [];
                jamiaGroups[p.jamiaName][p.teacherName].push(p);
            });

            Object.keys(jamiaGroups).sort().forEach(jamia => {
                html += `<tr class="bg-indigo-50 border-b border-indigo-100"><td colspan="7" class="p-3 font-black text-indigo-900 text-sm tracking-wide uppercase">${jamia}</td></tr>
                         <tr class="bg-red-50 text-red-800 text-[10px] md:text-xs font-black border-b border-red-100 uppercase tracking-wider">
                             <td class="p-2 md:p-3 border-r border-red-100">Teacher</td><td class="p-2 md:p-3 border-r border-red-100">Class</td><td class="p-2 md:p-3 border-r border-red-100">Book</td><td class="p-2 md:p-3 border-r border-red-100 text-center">Target</td><td class="p-2 md:p-3 border-r border-red-100 text-center">Achieved</td><td class="p-2 md:p-3 border-r border-red-100 text-center">%</td><td class="p-2 md:p-3 text-center">Status</td>
                         </tr>`;

                Object.keys(jamiaGroups[jamia]).forEach((teacherName, idx) => {
                    const periods = jamiaGroups[jamia][teacherName];
                    periods.forEach((p, pIdx) => {
                        html += `<tr class="bg-white border-b border-slate-100 hover:bg-slate-50 transition">
                            ${pIdx === 0 ? `<td rowspan="${periods.length}" class="p-2 md:p-3 border-r border-slate-200 font-bold text-slate-800">${teacherName}</td>` : ''}
                            <td class="p-2 md:p-3 border-r border-slate-100 text-slate-600">${p.className}</td>
                            <td class="p-2 md:p-3 border-r border-slate-100 text-slate-700 font-semibold">${p.bookName}</td>
                            <td class="p-2 md:p-3 border-r border-slate-100 font-bold text-center text-indigo-600 bg-indigo-50/30">${p.monthlyTarget}</td>
                            <td class="p-2 md:p-3 border-r border-slate-100 text-center font-bold text-slate-700">${p.pagesTaught}</td>
                            <td class="p-2 md:p-3 border-r border-slate-100 font-black text-red-600 text-center">${p.achievement}%</td>
                            <td class="p-2 md:p-3 font-bold text-red-600 text-center italic">${p.kaifiyat}</td>
                        </tr>`;
                    });
                });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
        } 
        // ----------------------------------------------------
        // TAB 2: ENGLISH TEACHER PROFILE TAB
        // ----------------------------------------------------
        else if (targetTabId === 'profile-tab') {
            const jamiaName = document.getElementById('teacher-profile-jamia').value;
            const teacherId = document.getElementById('teacher-profile-teacher').value;
            const container = document.getElementById('teacher-profile-container');
            
            if (!jamiaName || !teacherId) {
                container.innerHTML = `<div class="p-5 text-center text-slate-500 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">Please select Jamia and Teacher.</div>`;
                return;
            }

            const jamiaData = gSummaryKarkardagiStructure.find(j => j.jamiaName === jamiaName);
            if (!jamiaData || !jamiaData.teachers) {
                container.innerHTML = `<p class="text-red-500">Jamia data not found in structure.</p>`;
                return;
            }

            let teachersToRender = teacherId === 'all' ? jamiaData.teachers : jamiaData.teachers.filter(t => t.id === teacherId);

            if (teachersToRender.length === 0) {
                container.innerHTML = `<p class="text-yellow-700 p-4">Is semester me koi data set nahi hai.</p>`;
                return;
            }

            let html = ``;

            if (teacherId === 'all') {
                html += `
                    <div class="flex flex-col mb-4 bg-teal-50 p-4 rounded-xl border border-teal-100 shadow-sm text-center">
                        <h5 class="text-lg md:text-xl font-black text-teal-900">Jamia: ${jamiaName} &nbsp;|&nbsp; All Teachers Profile (Sem ${semester})</h5>
                    </div>
                `;
            } else {
                html += `
                    <div class="flex flex-col mb-4 bg-teal-50 p-4 rounded-xl border border-teal-100 shadow-sm text-center">
                        <h5 class="text-lg md:text-xl font-black text-teal-900">Teacher: ${teachersToRender[0].name} &nbsp;|&nbsp; Jamia: ${jamiaName} &nbsp;|&nbsp; Sem: ${semester}</h5>
                    </div>
                `;
            }

            teachersToRender.forEach(teacher => {
                const periodsInSemester = (teacher.periods || []).filter(p => p.semester == semester);
                if (periodsInSemester.length === 0) return;

                const containerClass = teacherId === 'all' ? "mb-8 bg-white border border-slate-200 p-4 md:p-5 rounded-xl shadow-sm" : "bg-white border border-slate-200 p-4 md:p-5 rounded-xl shadow-sm";
                const teacherNameHeader = teacherId === 'all' ? `<h6 class="text-base md:text-lg font-bold text-blue-700 mb-3 border-b-2 border-blue-100 pb-2 text-left">Teacher: ${teacher.name}</h6>` : ``;

                html += `
                    <div class="${containerClass}">
                        ${teacherNameHeader}
                        <div class="overflow-x-auto rounded-lg shadow-sm border border-slate-200">
                            <table class="min-w-full text-[10px] md:text-xs bg-white border-collapse text-left">
                                <thead class="bg-slate-100">
                                    <tr>
                                        <th class="border border-slate-200 p-2 md:p-3 min-w-[140px] md:min-w-[180px] text-slate-700 font-bold uppercase tracking-wider">Book / Class</th>
                                        <th class="border border-slate-200 p-2 min-w-[70px] text-slate-700 font-bold uppercase text-center">Total Pages</th>
                                        <th class="border border-slate-200 p-2 min-w-[70px] text-slate-700 font-bold uppercase text-center">Total Taught</th>
                                        <th class="border border-slate-200 p-2 min-w-[70px] bg-yellow-100 text-red-600 font-bold uppercase text-center">Remaining</th>
                                        <th class="border border-slate-200 p-2 min-w-[70px] bg-green-100 text-green-700 font-bold uppercase text-center">Percent</th>
                `;

                // Ab sirf wahi mahine print honge jo select kiye gaye hain
                semMonths.forEach(m => {
                    html += `<th colspan="2" class="border border-slate-200 p-2 font-bold text-indigo-900 uppercase text-center">${m}</th>`;
                });

                html += `</tr><tr class="bg-slate-50">
                         <th class="border border-slate-200"></th>
                         <th class="border border-slate-200"></th>
                         <th class="border border-slate-200"></th>
                         <th class="border border-slate-200 bg-yellow-50"></th>
                         <th class="border border-slate-200 bg-green-50"></th>`;

                semMonths.forEach(() => {
                    html += `<th class="border border-slate-200 p-1.5 md:p-2 text-indigo-600 text-[9px] md:text-xs font-semibold text-center">Target</th>
                             <th class="border border-slate-200 p-1.5 md:p-2 text-emerald-600 text-[9px] md:text-xs font-semibold text-center">Taught</th>`;
                });

                html += `</tr></thead><tbody>`;

                periodsInSemester.forEach(period => {
                    const totalPages = period.totalPages || 0;
                    let cumulativeTaught = 0;
                    let monthDataHtml = ``;

                    semMonths.forEach(m => {
                        const target = getTargetValue(period, m);
                        const achievedValue = getAchievedValue(period, m, jamiaName, teacher.name);

                        cumulativeTaught += achievedValue;
                        monthDataHtml += `
                            <td class="border border-slate-200 p-1.5 md:p-2 text-center text-slate-500 font-medium">${target}</td>
                            <td class="border border-slate-200 p-1.5 md:p-2 text-center font-bold text-slate-800">${achievedValue}</td>
                        `;
                    });

                    const remainingPages = Math.max(0, totalPages - cumulativeTaught);
                    const percent = totalPages > 0 ? Math.round((cumulativeTaught / totalPages) * 100) : 0;

                    html += `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="border border-slate-200 p-1.5 md:p-2 font-bold text-slate-800">
                                ${period.bookName} <br><span class="text-[9px] md:text-[10px] text-slate-500 font-normal block mt-1">${period.className}</span>
                            </td>
                            <td class="border border-slate-200 p-1.5 md:p-2 text-center font-bold text-slate-700">${totalPages}</td>
                            <td class="border border-slate-200 p-1.5 md:p-2 text-center font-black text-blue-700">${cumulativeTaught}</td>
                            <td class="border border-slate-200 p-1.5 md:p-2 text-center font-black text-red-600 bg-yellow-50">${remainingPages}</td>
                            <td class="border border-slate-200 p-1.5 md:p-2 text-center font-black text-emerald-600 bg-green-50">${percent}%</td>
                            ${monthDataHtml}
                        </tr>
                    `;
                });

                html += `</tbody></table></div></div>`;
            });

            if (html === ``) html = `<p class="text-slate-500 text-center p-5">No data found.</p>`;
            container.innerHTML = html;
        }
      // ----------------------------------------------------
        // TAB 3: MUNASIB HISTORY TAB (All Semester Munasib Status)
        // ----------------------------------------------------
        else if (targetTabId === 'history-tab') {
            const container = document.getElementById('munasib-history-container');
            // ... historyData object banne tak ka code (jamia.teachers.forEach) waisa hi rahega ...

            if (Object.keys(historyData).length === 0) {
                container.innerHTML = `<div class="p-10 text-center bg-emerald-50 rounded-xl border border-emerald-200">
                    <i class="fas fa-check-circle text-emerald-500 text-4xl mb-3"></i>
                    <h4 class="font-bold text-emerald-800 text-lg">Excellent!</h4>
                    <p class="text-emerald-600 mt-1">Is semester ke is mahine tak kisi bhi subject me 'Munasib' (kam) performance nahi aayi.</p>
                </div>`;
                return;
            }

            let html = `<div class="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white p-2">
                            <table class="min-w-full text-sm text-left whitespace-nowrap">
                                <thead class="bg-slate-100/50 border-y border-slate-200">
                                    <tr>
                                        <th class="px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-xs">Teacher</th>
                                        <th class="px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-xs">Book / Class</th>`;
            semMonths.forEach(m => {
                html += `<th class="px-4 py-3 font-bold uppercase text-center text-indigo-700 text-xs">${m}</th>`;
            });
            html += `                   <th class="px-4 py-3 font-bold uppercase text-center text-red-600 bg-red-50/50 text-xs">Total Munasib</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-slate-700">`;

            Object.keys(historyData).sort().forEach(jamiaName => {
                // CLEAN JAMIA HEADER ROW
                html += `<tr class="bg-slate-50/80 border-t-2 border-indigo-100"><td colspan="${2 + semMonths.length + 1}" class="px-4 py-3 font-black text-slate-800 text-sm tracking-wide uppercase">${jamiaName}</td></tr>`;
                
                Object.keys(historyData[jamiaName]).sort().forEach((teacherName, tIdx) => {
                    const periods = historyData[jamiaName][teacherName];

                    periods.forEach((p, pIdx) => {
                        html += `<tr class="hover:bg-slate-50/50 transition-colors bg-white">`;
                        if (pIdx === 0) {
                            html += `<td rowspan="${periods.length}" class="px-4 py-3 border-r border-slate-50 font-bold text-slate-800 align-middle whitespace-normal min-w-[140px]">${teacherName}</td>`;
                        }
                        html += `<td class="px-4 py-3 whitespace-normal min-w-[150px]">
                                    <div class="font-bold text-slate-700">${p.bookName}</div>
                                    <div class="text-[10px] text-slate-500 font-medium uppercase mt-0.5">${p.className}</div>
                                 </td>`;

                        semMonths.forEach(m => {
                            const status = p.monthlyStatuses[m];
                            let badgeHtml = `<span class="text-slate-300">-</span>`;
                            if (status === 'Munasib') {
                                // SOFT PINK BADGE (Red text)
                                badgeHtml = `<span class="bg-red-50 text-red-600 font-bold px-2 py-1 rounded-md text-[10px] uppercase border border-red-100 shadow-sm">Munasib</span>`;
                            } else if (status === 'Mumtaz' || status === 'Behtar') {
                                badgeHtml = `<i class="fas fa-check-circle text-emerald-500 text-base"></i>`;
                            }
                            html += `<td class="px-4 py-3 text-center">${badgeHtml}</td>`;
                        });

                        // SOFT BACKGROUND FOR "TOTAL MUNASIB" (Is se aankhon par zor nahi padega)
                        let countClass = '';
                        if (p.munasibCount >= 4) countClass = 'bg-red-100 text-red-700 font-black';
                        else if (p.munasibCount === 3) countClass = 'bg-orange-100 text-orange-700 font-black';
                        else if (p.munasibCount === 2) countClass = 'bg-amber-50 text-amber-600 font-bold';
                        else countClass = 'bg-slate-50 text-slate-600 font-bold';

                        html += `<td class="px-4 py-3 text-center text-sm ${countClass}">${p.munasibCount}</td>
                            </tr>`;
                    });
                });
            });

           html += `</tbody></table></div>`;
            document.getElementById('munasib-history-container').innerHTML = html;
            
        } // <-- YAHAN EK BRACKET AAYEGA (else if block ko close karne ke liye)

    catch (err) { // <-- Aur ye bracket 'try' block ko close kar raha hai
        console.error("Summary Render Error:", err);
    }
};

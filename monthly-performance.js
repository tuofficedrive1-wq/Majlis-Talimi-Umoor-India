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
    // --- Modal ko JS se inject karne ka function ---
const injectEditModal = () => {
    if (document.getElementById('edit-period-modal')) return; // Agar pehle se hai to dubara na dalein

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

// Ise renderPerformanceTab ke andar call karein
injectEditModal();
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

// monthly-performance.js mein performance tab ka header section
if (tabName === 'performance') {
    contentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm gap-4">
            <div class="flex flex-col">
                <h3 class="font-black text-indigo-950 text-lg">Performance Analytics</h3>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Filter by Month & Jamia</p>
            </div>
            
            <div class="flex flex-wrap items-center gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-black text-slate-400 ml-2">SELECT MONTH</label>
                    <select id="report-month" class="p-2.5 border rounded-2xl text-sm font-bold bg-slate-50"></select>
                </div>

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

    // Event Listeners bind karein
    document.getElementById('report-month').onchange = () => loadPerformanceTable(assignedJamiaat, db, currentUser);
    document.getElementById('report-jamia').onchange = () => loadPerformanceTable(assignedJamiaat, db, currentUser);
    
    // Initial Load
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
            // Yahan hum 'jamiaat' ko pass kar rahe hain taaki ReferenceError na aaye
            attachTeacherEvents(listDiv, db, currentUser, jamiaat, selectedYear);
        });
    } catch (e) { console.error("loadAllTeachers error:", e); }
};

const setupMonthDropdown = (calendarData) => {
    const monthSelect = document.getElementById('report-month');
    if (!calendarData || !monthSelect) return;

    const months = [
        { name: "April", id: "3", key: "apr" },
        { name: "May", id: "4", key: "may" },
        { name: "June", id: "5", key: "jun" },
        { name: "July", id: "6", key: "jul" },
        { name: "August", id: "7", key: "aug" },
        { name: "September", id: "8", key: "sep" },
        { name: "October", id: "9", key: "oct" },
        { name: "November", id: "10", key: "nov" },
        { name: "December", id: "11", key: "dec" },
        { name: "January", id: "0", key: "jan" },
        { name: "February", id: "1", key: "feb" },
        { name: "March", id: "2", key: "mar" }
    ];

    // sirf active months (jahan days > 0)
    const activeMonths = months.filter(m => {
        const mData = calendarData.months?.[m.key];
        return mData && ((mData.s1 || 0) + (mData.s2 || 0)) > 0;
    });

    monthSelect.innerHTML = activeMonths.map(m => 
        `<option value="${m.id}">${m.name}</option>`
    ).join('');
};

const loadPerformanceTable = async (jamiaat, db, currentUser) => {

    const targetSnap = await getDoc(doc(db, "settings", "monthly_page_targets"));
    const calSnap = await getDoc(doc(db, "settings", "academic_calendar"));

    const monthlyTargets = targetSnap.exists() ? targetSnap.data().targets : {};
    const calendarData = calSnap.exists() ? calSnap.data() : {};

    setupMonthDropdown(calendarData);

    const container = document.getElementById('performance-table-body');
    const selectedMonthIdx = document.getElementById('report-month').value; 
    const selectedJamia = document.getElementById('report-jamia').value;

    try {

        const activeYear = calSnap.exists() ? calSnap.data().activeYear : "2026-2027";

        const monthIdMap = {
            "3": "apr", "4": "may", "5": "jun", "6": "jul", "7": "aug", "8": "sep",
            "9": "oct", "10": "nov", "11": "dec", "0": "jan", "1": "feb", "2": "mar"
        };

        const selectedMonthId = monthIdMap[selectedMonthIdx];
        // 3. User Data Fetch karein (Hardcoded year ki jagah activeYear use karein)
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const karkardagi = userSnap.data().academicYears?.[activeYear]?.karkardagiStructure || [];

        const filteredJamiaat = selectedJamia === "all" ? jamiaat : jamiaat.filter(j => j === selectedJamia);

        let html = "";
        filteredJamiaat.forEach(jamiaName => {
            const jamiaData = karkardagi.find(j => j.jamiaName === jamiaName);
            if (!jamiaData) return;

            const safeJamiaId = jamiaName.replace(/\s+/g, '');

            html += `
            <div class="bg-white rounded-3xl border border-slate-200 shadow-sm mb-8 overflow-hidden jamia-card" id="card-${safeJamiaId}">
                <div class="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 class="font-black text-indigo-950 text-xl">${jamiaName}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monthly Performance Analytics</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="copyTeacherFormLink('${jamiaName}')" class="bg-white border border-slate-200 text-slate-700 text-[11px] px-3 py-2 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm">
                            <i class="fas fa-link mr-1 text-indigo-500"></i> Link
                        </button>
                        <button onclick="downloadJamiaImage('${jamiaName}')" class="bg-white border border-slate-200 text-slate-700 text-[11px] px-3 py-2 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm">
                            <i class="fas fa-image mr-1 text-rose-500"></i> Image
                        </button>
                        <button onclick="downloadJamiaExcel('${jamiaName}')" class="bg-white border border-slate-200 text-slate-700 text-[11px] px-3 py-2 rounded-xl hover:bg-slate-50 transition font-bold shadow-sm">
                            <i class="fas fa-file-excel mr-1 text-emerald-500"></i> Excel
                        </button>
                        <button onclick="toggleEditMode('${jamiaName}')" class="edit-btn-${safeJamiaId} bg-indigo-600 text-white text-[11px] px-4 py-2 rounded-xl hover:bg-indigo-700 shadow-md transition font-bold">
                            <i class="fas fa-edit mr-1"></i> Edit
                        </button>
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
                teacher.periods?.forEach((p, pIdx) => {
                    
                    // --- TARGET FETCHING LOGIC ---
                        const normalize = (str) => (str || "")
                            .toString()
                            .toLowerCase()
                            .trim();
                        
                        let target = 0;
                        
                        Object.keys(monthlyTargets || {}).forEach(classKey => {
                            if (normalize(classKey) === normalize(p.className)) {
                        
                                const subjects = monthlyTargets[classKey];
                        
                                Object.keys(subjects || {}).forEach(subKey => {
                                    if (normalize(subKey) === normalize(p.bookName)) {
                        
                                        const monthData = subjects[subKey];
                        
                                        if (monthData && monthData[selectedMonthId] !== undefined) {
                                            target = monthData[selectedMonthId];
                                        }
                                    }
                                });
                            }
                        });
                    
                    // Placeholder achieved value (Abhi DB se nahi aa rahi)
                    const achievedValue = 0; 
                    const percentage = target > 0 ? Math.round((achievedValue / target) * 100) : 0;
                    const result = calculateKaifiyatAndStyle(percentage, selectedMonthIdx, p.semester);

                    html += `
                        <tr class="border-b hover:bg-slate-50/50">
                            <td class="p-4 font-bold text-slate-800">
                                ${pIdx === 0 ? teacher.name : ''}
                            </td>
                            
                            <td class="p-4 text-slate-600">
                                ${p.className}
                            </td>
                            
                            <td class="p-4 text-slate-600">
                                ${p.bookName}
                            </td>
                            <td class="p-4 text-center text-slate-600">${p.totalPages}</td>
                            <td class="p-4 text-center font-bold text-indigo-600 bg-indigo-50/30">${target}</td>
                            <td class="p-4 text-center">
                                <input type="number" value="${achievedValue}" disabled 
                                       class="achieved-input-${safeJamiaId} w-16 p-1.5 border rounded-lg text-center bg-transparent">
                            </td>
                            <td class="p-4 text-center font-black text-slate-700">${percentage}%</td>
                            <td class="p-4 text-center italic ${result.colorClass}">${result.kaifiyat}</td>
                        </tr>`;
                });
            });
            html += `</tbody></table></div></div>`;
        });
        container.innerHTML = html || '<div class="p-10 text-center text-slate-400">Data nahi mila.</div>';
    } catch (e) {
        console.error("Load Error:", e);
    }
};

// Mahine ka number semester ke hisab se nikalne ke liye
// Sem 1: Apr(1), May(2), Jun(3), Jul(4), Aug(5)
// Sem 2: Sep(1), Oct(2), Nov(3), Dec(4), Jan(5), Feb/Mar (Extra)
function getSemesterMonthNumber(monthIdx, semester) {
    const s1Map = { "3": 1, "4": 2, "5": 3, "6": 4, "7": 5 }; // Apr-Aug
    const s2Map = { "8": 1, "9": 2, "10": 3, "11": 4, "0": 5, "1": 6, "2": 7 }; // Sep-Mar
    
    if (semester == "1") return s1Map[monthIdx] || 0;
    return s2Map[monthIdx] || 0;
}

// Aapka bataya hua main calculation logic
const calculateKaifiyatAndStyle = (achievement, monthIdx, semester) => {
    let kaifiyat = "Munasib"; 
    let colorClass = "text-red-600"; // color-munasib ki jagah Tailwind class
    
    const monthNumber = getSemesterMonthNumber(monthIdx, semester);
    
    // 1. Mahine ke hisab se base Kaifiyat
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

    // 2. Over-achievement Adjustment
    if (kaifiyat === "Mumtaz") {
        if (achievement > 150) kaifiyat = "Munasib";
        else if (achievement >= 121) kaifiyat = "Behtar";
    }

    // 3. Color mapping
    if (kaifiyat === "Mumtaz") colorClass = "text-emerald-600 font-black";
    else if (kaifiyat === "Behtar") colorClass = "text-blue-600 font-bold";
    else colorClass = "text-red-600 font-bold";

    return { kaifiyat, colorClass };
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
    // 1. Teacher Toggle Logic (Expand/Collapse)
    container.querySelectorAll('.teacher-toggle').forEach(toggle => {
        toggle.onclick = (e) => {
            // Agar click edit ya delete button par hua hai, to toggle na chale
            if (e.target.closest('.edit-t-btn') || e.target.closest('.del-t-btn')) {
                return; 
            }
            toggle.nextElementSibling.classList.toggle('hidden');
            toggle.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
        };
    });

        // Teacher Profile Edit Logic
container.querySelectorAll('.edit-t-btn').forEach(btn => {
    btn.onclick = async (e) => {
        e.stopPropagation();
        
        const tid = btn.dataset.tid;
        const jamiaName = btn.dataset.jamia;
        const safeId = jamiaName.replace(/\s+/g, '');

        // 1. Data fetch karein
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const structure = userSnap.data().academicYears?.[selectedYear]?.karkardagiStructure || [];
        const jamiaData = structure.find(j => j.jamiaName === jamiaName);
        const teacher = jamiaData?.teachers.find(t => t.id === tid);

        if (teacher) {
            // 2. Form Fields fill karein (Pehle check karein ke elements exist karte hain)
            const nameField = document.getElementById(`name-${safeId}`);
            if (nameField) {
                nameField.value = teacher.name;
                document.getElementById(`ajeer-${safeId}`).value = teacher.loginCode;
                document.getElementById(`contact-${safeId}`).value = teacher.contact || "";
                // ... baqi saare fields isi tarah
            }

            // 3. SAVE BUTTON FIX: 
            // Purana tareeka 'container.querySelector' shayad pure page par button nahi dhoond pa raha
            // Is naye tareeke se hum seedha attribute se button pakdenge
            const saveBtn = document.querySelector(`.save-teacher-btn[data-jamia-name="${jamiaName}"]`);
            
            if (saveBtn) {
                saveBtn.innerText = "Update Teacher Profile";
                saveBtn.dataset.editMode = tid; // Edit mode on karein
                saveBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                console.error("Save button nahi mila for jamia:", jamiaName);
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
    // Modal band karne ka helper
window.closePeriodModal = () => document.getElementById('edit-period-modal').classList.add('hidden');

// Edit Period Button Logic
container.querySelectorAll('.edit-period-btn').forEach(btn => {
    btn.onclick = async () => {
        const { pid, tid, jamia } = btn.dataset;
        
        // Data Load karein
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

        // UI Elements
        const classSelect = document.getElementById('edit-p-class');
        const bookSelect = document.getElementById('edit-p-book');
        const updateBtn = document.getElementById('btn-update-period');

        // Dropdowns setup karein
        classSelect.innerHTML = currentConfig.classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        classSelect.value = period.className;

        const loadBooks = (val) => {
            const cls = currentConfig.classes.find(c => c.name === val);
            bookSelect.innerHTML = cls ? cls.subjects.map(s => `<option value="${s}">${s}</option>`).join('') : '';
        };
        loadBooks(period.className);
        bookSelect.value = period.bookName;
        classSelect.onchange = (e) => loadBooks(e.target.value);

        // Fill fields
        document.getElementById('edit-p-sem').value = period.semester;
        document.getElementById('edit-p-pages').value = period.totalPages;
        document.getElementById('edit-p-syllabus').value = period.syllabus || 'Majlis';

        // --- UPDATE BUTTON LOGIC ---
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
                
                // ERROR FIX: jamiaat list ko sahi variable se refresh karein
                // Agar aapke pas global assignedJamiaat nahi hai, toh upar wala 'jamiaat' use karein
                loadAllTeachers(jamiaat || assignedJamiaat, db, currentUser, selectedYear); 
                
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
// 1. Toggle Edit Mode (Lock/Unlock)
// Edit Mode Toggle (Lock/Unlock)
// 1. Edit/Save Toggle Logic
window.toggleEditMode = (jamiaName) => {
    const inputs = document.querySelectorAll(`.achieved-input-${jamiaName}`);
    const btn = document.querySelector(`.edit-btn-${jamiaName}`);
    const isLocked = inputs[0].disabled;

    inputs.forEach(inp => {
        inp.disabled = !isLocked;
        inp.classList.toggle('bg-white', isLocked);
        inp.classList.toggle('border-indigo-200', isLocked);
        inp.classList.toggle('shadow-sm', isLocked);
    });

    if (isLocked) {
        btn.innerHTML = `<i class="fas fa-check-circle mr-1"></i> Done`;
        btn.className = `edit-btn-${jamiaName} bg-emerald-500 text-white text-[11px] px-4 py-2 rounded-xl shadow-lg transition font-bold`;
    } else {
        btn.innerHTML = `<i class="fas fa-edit mr-1"></i> Edit`;
        btn.className = `edit-btn-${jamiaName} bg-indigo-600 text-white text-[11px] px-4 py-2 rounded-xl shadow-md transition font-bold`;
        // Yahan aap database update logic call kar sakte hain
    }
};

// 2. Live Kaifiyat (Mumtaz/Behtar/Munasib)
window.calculateLiveStatus = (input, target) => {
    const row = input.closest('tr');
    const achieved = parseInt(input.value) || 0;
    const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;
    
    const percCell = row.querySelector('.perc-cell');
    const statusCell = row.querySelector('.status-cell');
    
    percCell.textContent = percentage + "%";
    
    if (percentage >= 90) {
        statusCell.textContent = "Mumtaz";
        statusCell.className = "p-4 text-center status-cell font-black text-emerald-600 italic";
    } else if (percentage >= 75) {
        statusCell.textContent = "Behtar";
        statusCell.className = "p-4 text-center status-cell font-black text-blue-600 italic";
    } else {
        statusCell.textContent = "Munasib";
        statusCell.className = "p-4 text-center status-cell font-black text-red-500 italic";
    }
};

// 3. Link Copy Function
window.copyTeacherLink = (jamiaName) => {
    const monthIdx = document.getElementById('report-month').value;
    const baseUrl = window.location.origin + window.location.pathname.replace('inspector.html', '');
    const url = `${baseUrl}teacher-form.html?jamia=${encodeURIComponent(jamiaName)}&month=${monthIdx}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert("Teacher Form Link Copied!");
    });
};

// Live Percentage aur Kaifiyat Calculation
window.calculateLiveStatus = (input, target) => {
    const row = input.closest('tr');
    const achieved = parseInt(input.value) || 0;
    const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;
    
    const percCell = row.querySelector('.perc-cell');
    const statusCell = row.querySelector('.status-cell');
    
    percCell.textContent = percentage + "%";
    
    if (percentage >= 90) {
        statusCell.textContent = "Mumtaz";
        statusCell.className = "p-4 text-center status-cell font-black text-emerald-600 italic";
    } else if (percentage >= 70) {
        statusCell.textContent = "Behtar";
        statusCell.className = "p-4 text-center status-cell font-black text-blue-600 italic";
    } else {
        statusCell.textContent = "Munasib";
        statusCell.className = "p-4 text-center status-cell font-black text-red-500 italic";
    }
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

// monthly-performance.js ke aakhir mein ye functions replace karein

// --- Helper: Safe ID banana (Spaces hatane ke liye) ---
const getSafeId = (name) => name ? name.replace(/\s+/g, '') : 'id';

// --- 1. Link Copy Function ---
window.copyTeacherFormLink = (jamiaName) => {
    const monthIdx = document.getElementById('report-month').value;
    // Base URL nikalne ka sahi tarika
    const baseUrl = window.location.origin + window.location.pathname.replace('academic-inspector.html', '');
    
    // Yahan hum global auth se UID lenge taaki 'currentUser' ki error na aaye
    const auth = firebase.auth().currentUser; 
    const inspectorId = auth ? auth.uid : 'anonymous';

    const url = `${baseUrl}academic-monthly-performance.html?jamiaName=${encodeURIComponent(jamiaName)}&monthIndex=${monthIdx}&inspectorId=${inspectorId}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert(`${jamiaName} ke liye Teacher Form link copy ho gayi hai!`);
    });
};

// --- 2. Edit/Lock Toggle Function ---
window.toggleEditMode = (jamiaName) => {
    const safeId = getSafeId(jamiaName);
    const inputs = document.querySelectorAll(`.achieved-input-${safeId}`);
    const btn = document.querySelector(`.edit-btn-${safeId}`);

    // Error handling: Check karein agar inputs mile ya nahi
    if (!inputs || inputs.length === 0) {
        console.error("Inputs nahi mile for:", safeId);
        return;
    }

    const isLocked = inputs[0].disabled;

    if (isLocked) {
        // Unlock karna
        inputs.forEach(inp => {
            inp.disabled = false;
            inp.style.backgroundColor = "white";
            inp.style.border = "1px solid #6366f1";
        });
        btn.innerHTML = `<i class="fas fa-lock mr-1"></i> Lock`;
        btn.style.backgroundColor = "#1e293b"; // Slate-800
    } else {
        // Lock karna
        inputs.forEach(inp => {
            inp.disabled = true;
            inp.style.backgroundColor = "transparent";
            inp.style.border = "1px solid transparent";
        });
        btn.innerHTML = `<i class="fas fa-edit mr-1"></i> Edit`;
        btn.style.backgroundColor = "#4f46e5"; // Indigo-600
        alert("Data successfully lock kar diya gaya.");
    }
};

// --- 3. Image Download Function ---
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

// --- 4. Excel/CSV Download Function ---
window.downloadJamiaExcel = (jamiaName) => {
    const safeId = getSafeId(jamiaName);
    // Table element ko dhoondne ka sahi tarika
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
// --- In helper functions ko add karein taake error khatam ho jaye ---

function calculateStatusText(percentage) {
    if (percentage >= 90) return "Mumtaz";
    if (percentage >= 70) return "Behtar";
    return "Munasib";
}

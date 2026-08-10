// shoba_qirat_karkardgi.js

import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
let db = null;
let currentUser = null;
let userProfileData = {};

// Admin & Academic State Variables (Bilkul karkardagi.html wale)
let adminAcademicConfig = null;
let activeYear = null;
let allAcademicYearsData = {};
let currentReportPeriod = { monthNum: -1, yearNum: 0, semester: '1' };

const ACADEMIC_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0]; // Apr(3) to Jan(0)

export const initShobaQiratKarkardgi = async (database, user, profileData) => {
    db = database;
    currentUser = user;
    userProfileData = profileData;
    
    // 1. Basic UI Structure banayein
    renderKarkardgiUIStructure();
    setupTabListeners();

    // 2. Admin Settings aur User Data Load Karein
    document.getElementById('k-reporting-table-container').innerHTML = '<p class="text-center text-teal-600"><i class="fas fa-spinner fa-spin"></i> Admin Settings load ho rahi hain...</p>';
    
    await loadAdminSettings();
    await loadUserData();
};

// --- 1. ADMIN SETTINGS LOGIC ---
const loadAdminSettings = async () => {
    try {
        const configRef = doc(db, "settings", "academic_config");
        const snap = await getDoc(configRef);
        if (snap.exists()) {
            adminAcademicConfig = snap.data();
            console.log("✅ Admin Settings Loaded:", adminAcademicConfig);
        } else {
            console.warn("⚠️ Admin Setup nahi mila! Pehle Admin panel se classes aur mahine set karein.");
        }
    } catch (error) {
        console.error("Error loading Admin Settings:", error);
    }
};

// --- 2. USER DATA & YEAR SYNC LOGIC ---
const loadUserData = async () => {
    try {
        allAcademicYearsData = userProfileData.academicYears || {};

        // ADMIN SETTINGS KO PRIORITY DEIN
        if (adminAcademicConfig && adminAcademicConfig.activeYear) {
            activeYear = adminAcademicConfig.activeYear;
            
            // Agar user ke pas ye saal nahi hai, to banayein
            if (!allAcademicYearsData[activeYear]) {
                allAcademicYearsData[activeYear] = {};
            }
            // Admin ke days user ke data me sync karein
            allAcademicYearsData[activeYear].academicMonths = adminAcademicConfig.academicMonths || {};
            allAcademicYearsData[activeYear].sem1TotalDays = adminAcademicConfig.sem1TotalDays || 0;
            allAcademicYearsData[activeYear].sem2TotalDays = adminAcademicConfig.sem2TotalDays || 0;
        }

        // Dropdowns update karein
        populateYearSelector();
        updateMonthDropdown();

        // UI render karein
        renderSetupTab();
        renderReportingTab();
        
    } catch (error) {
        console.error("User Data load karne me masla:", error);
    }
};

// --- 3. ACADEMIC YEAR DROPDOWN ---
const populateYearSelector = () => {
    const yearSelect = document.getElementById('k-active-year-select');
    if (!yearSelect) return;

    const yearNames = Object.keys(allAcademicYearsData).sort().reverse();
    
    if (yearNames.length === 0) {
        yearSelect.innerHTML = `<option value="">Pehle naya saal banayein</option>`;
        activeYear = null;
        return;
    }
    
    yearSelect.innerHTML = yearNames.map(name => `<option value="${name}">${name}</option>`).join('');
    
    // Agar admin ne activeYear set kiya hai to wo select karein, warna list ka pehla
    if (activeYear && yearNames.includes(activeYear)) {
        yearSelect.value = activeYear;
    } else {
        yearSelect.value = yearNames[0];
        activeYear = yearNames[0];
    }

    // Change listener
    yearSelect.addEventListener('change', (e) => {
        activeYear = e.target.value;
        renderSetupTab();
        renderReportingTab();
        // future me: loadMonthlyReportData() bhi yahan call hoga
    });
};

// --- 4. MONTH DROPDOWN & SEMESTER LOGIC ---
const updateMonthDropdown = () => {
    const monthSelect = document.getElementById('k-report-month-select'); 
    if (!adminAcademicConfig || !monthSelect || !activeYear) return;

    const monthsData = [
        { name: "April", idx: 3 }, { name: "May", idx: 4 }, { name: "June", idx: 5 },
        { name: "July", idx: 6 }, { name: "August", idx: 7 }, { name: "September", idx: 8 },
        { name: "October", idx: 9 }, { name: "November", idx: 10 }, { name: "December", idx: 11 },
        { name: "January", idx: 0 }
    ];

    const academicYearParts = activeYear.split('-');
    const academicYearStart = parseInt(academicYearParts[0], 10);
    const academicYearEnd = parseInt(academicYearParts[1], 10);

    // Filter active months (jinme admin ne days set kiye hain)
    const activeMonths = monthsData.filter(m => {
        const config = adminAcademicConfig.monthDetails?.[m.idx];
        return config && ((config.sem1 || 0) > 0 || (config.sem2 || 0) > 0);
    });

    monthSelect.innerHTML = activeMonths.map(m => {
        const config = adminAcademicConfig.monthDetails[m.idx];
        const semester = (config.sem1 || 0) > 0 ? "1" : "2";
        
        let reportingYear = academicYearStart;
        if (m.idx === 0) { reportingYear = academicYearEnd; } // Jan next year me hota hai
        
        const val = `${reportingYear}-${m.idx}`;
        return `<option value="${val}">${m.name} ${reportingYear} (Sem-${semester})</option>`;
    }).join('');
};

// --- 5. UI STRUCTURE RENDER FUNCTION ---
const renderKarkardgiUIStructure = () => {
    const container = document.getElementById('karkardgi-app-container');
    if (!container) return;

    container.innerHTML = `
        <div class="border-b border-gray-200 bg-white rounded-t-lg">
            <nav class="-mb-px flex items-center space-x-4 md:space-x-8 overflow-x-auto p-2 scrollbar-hide">
                <button type="button" class="k-tab-btn active whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm border-teal-500 text-teal-600" data-tab="k-reporting">Monthly Reporting</button>
                <button type="button" class="k-tab-btn whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="k-submit-status">Submit Status</button>
                <button type="button" class="k-tab-btn whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="k-summary">Summary</button>
                <button type="button" class="k-tab-btn whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="k-setup">Setup Structure</button>
            </nav>
        </div>

        <div class="p-4 bg-white rounded-b-lg shadow-sm border border-gray-100 mt-2">
            
            <!-- MONTHLY REPORTING TAB -->
            <div id="k-reporting-content" class="k-tab-content space-y-4">
                <div class="flex flex-col md:flex-row items-center gap-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <label class="text-blue-900 font-bold whitespace-nowrap"><i class="fas fa-calendar-alt mr-2"></i>Select Month:</label>
                    <select id="k-report-month-select" class="w-full md:w-auto p-2 border border-blue-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 font-semibold"></select>
                </div>
                <div id="k-reporting-table-container" class="mt-4">
                    <div class="p-8 border-2 border-dashed border-gray-300 rounded-xl text-center">
                        <i class="fas fa-table text-gray-400 text-4xl mb-3"></i>
                        <p class="text-gray-500">Mahana Karkardgi data yahan load hoga...</p>
                    </div>
                </div>
            </div>

            <!-- SETUP STRUCTURE TAB -->
            <div id="k-setup-content" class="k-tab-content hidden space-y-4">
                 <div class="bg-gray-50 p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                    <div>
                        <h4 class="font-bold text-gray-700">Active Academic Year</h4>
                        <select id="k-active-year-select" class="mt-2 w-full md:w-64 p-2 border border-gray-300 rounded-lg bg-white font-semibold text-teal-700"></select>
                    </div>
                </div>
                <div id="k-setup-accordion-container" class="space-y-3 mt-4">
                    <!-- Setup Accordions will be rendered here -->
                </div>
            </div>

            <!-- SUBMIT STATUS & SUMMARY (Placeholders for now) -->
            <div id="k-submit-status-content" class="k-tab-content hidden space-y-4">
                <h3 class="text-xl font-bold text-slate-800">Teacher Submission Status</h3>
                <p class="text-gray-500">Status UI will be rendered here.</p>
            </div>
            <div id="k-summary-content" class="k-tab-content hidden space-y-4">
                <h3 class="text-xl font-bold text-slate-800">Karkardgi Summary</h3>
                <p class="text-gray-500">Summary UI will be rendered here.</p>
            </div>
        </div>
    `;
};

// --- 6. TAB SWITCHING LOGIC ---
const setupTabListeners = () => {
    const tabButtons = document.querySelectorAll('.k-tab-btn');
    const tabContents = document.querySelectorAll('.k-tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabButtons.forEach(b => {
                b.classList.remove('active', 'border-teal-500', 'text-teal-600');
                b.classList.add('border-transparent', 'text-gray-500');
            });

            const clickedBtn = e.currentTarget;
            clickedBtn.classList.remove('border-transparent', 'text-gray-500');
            clickedBtn.classList.add('active', 'border-teal-500', 'text-teal-600');

            tabContents.forEach(content => content.classList.add('hidden'));
            const targetTab = clickedBtn.getAttribute('data-tab');
            document.getElementById(`${targetTab}-content`).classList.remove('hidden');

            if(targetTab === 'k-setup') renderSetupTab();
            if(targetTab === 'k-reporting') renderReportingTab();
        });
    });
};

let openAccordionIds = new Set();

const captureAccordionState = () => {
    openAccordionIds.clear();
    const container = document.getElementById('k-setup-accordion-container');
    if (!container) return;
    
    container.querySelectorAll('.accordion-button.open').forEach(btn => {
        const jamiaDiv = btn.closest('[data-jamia-name]');
        if (jamiaDiv) openAccordionIds.add(jamiaDiv.dataset.jamiaName);
    });
    container.querySelectorAll('.teacher-accordion-button.open').forEach(btn => {
        const teacherDiv = btn.closest('[data-teacher-id]');
        if (teacherDiv) openAccordionIds.add(teacherDiv.dataset.teacherId);
    });
};

const restoreAccordionState = () => {
    if (openAccordionIds.size === 0) return;
    const container = document.getElementById('k-setup-accordion-container');
    if (!container) return;

    openAccordionIds.forEach(id => {
        const targetDiv = container.querySelector(`[data-jamia-name="${id}"]`) || container.querySelector(`[data-teacher-id="${id}"]`);
        if (targetDiv) {
            const button = targetDiv.querySelector('.accordion-button, .teacher-accordion-button');
            const content = targetDiv.querySelector('.accordion-content');
            if (button && content) {
                button.classList.add('open');
                content.classList.add('open');
            }
        }
    });
};

// --- 7. RENDER SETUP TAB (Updated for Teachers & Periods) ---
const renderSetupTab = () => {
    const container = document.getElementById('k-setup-accordion-container');
    if (!activeYear || !allAcademicYearsData[activeYear]) {
        container.innerHTML = '<p class="text-red-500 font-bold bg-red-50 p-4 rounded-lg">Pehle "Active Year" select karein ya banayein.</p>';
        return;
    }

    const jamiaat = userProfileData.jamiaatList || [];
    const structure = allAcademicYearsData[activeYear].karkardagiStructure || [];

    if (jamiaat.length === 0) {
         container.innerHTML = '<p class="text-yellow-700 bg-yellow-50 p-4 rounded-lg">Aapke profile me koi Jamia add nahi hai. Admin panel se add karwayein.</p>';
         return;
    }

    container.innerHTML = jamiaat.map(jamiaName => {
        let jamiaData = structure.find(j => j.jamiaName === jamiaName) || { teachers: [] };
        
        // Teachers list ko render karna
        let teachersHtml = jamiaData.teachers.map(t => renderTeacherAccordion(jamiaName, t)).join('') || '<p class="text-sm text-gray-500 mt-2 p-3 text-center bg-gray-50 rounded">Abhi is Jamia me koi ustad add nahi hai.</p>';

        return `
        <div class="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden mb-4" data-jamia-name="${jamiaName}">
            <button type="button" class="accordion-button w-full flex justify-between items-center p-4 text-left bg-gray-100 hover:bg-gray-200 transition">
                <h4 class="font-bold text-xl urdu-font text-teal-800">${jamiaName}</h4>
                <i class="fas fa-chevron-down text-gray-500 transition-transform duration-300"></i>
            </button>
            <div class="accordion-content max-h-0 overflow-hidden transition-all duration-300 ease-in-out">
                <div class="p-4 border-t">
                    <!-- Add Teacher Form -->
                    <form class="add-teacher-form mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row gap-3">
                        <input type="text" placeholder="Naye Teacher ka Naam" class="teacher-name-input w-full p-2 border rounded-lg urdu-font" required>
                        <input type="text" placeholder="Code (Optional)" class="teacher-code-input w-full sm:w-32 p-2 border rounded-lg" maxlength="5">
                        <button type="submit" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"><i class="fas fa-plus mr-1"></i> Add</button>
                    </form>
                    
                    <h5 class="text-sm font-bold text-gray-500 uppercase mb-2">Asatiza ki Fihrist</h5>
                    <div class="space-y-3">
                        ${teachersHtml}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Event Delegation (Click aur Submit events container par lagana)
    container.removeEventListener('click', handleSetupClick);
    container.addEventListener('click', handleSetupClick);

    container.removeEventListener('submit', handleSetupSubmit);
    container.addEventListener('submit', handleSetupSubmit);

    // Restore state
    restoreAccordionState();
};

// --- Helper: Render Individual Teacher Accordion ---
const renderTeacherAccordion = (jamiaName, teacher) => {
    const teacherId = teacher.id;
    const periodsHtml = renderPeriodsTable(teacher.periods);
    
    // Class names fetch from Admin Config for dropdown
    let classesOptions = '';
    if (adminAcademicConfig && adminAcademicConfig.classes) {
        classesOptions = adminAcademicConfig.classes.map(c => c.classNameUrdu ? `<option value="${c.classNameUrdu}">` : '').join('');
    }

    return `
    <div class="border rounded-lg bg-gray-50 overflow-hidden shadow-sm" data-teacher-id="${teacherId}">
        <button type="button" class="teacher-accordion-button w-full flex justify-between items-center p-3 text-left bg-gray-200 hover:bg-gray-300 transition">
            <span class="urdu-font font-bold text-gray-800">${teacher.name} <span class="text-xs font-normal text-gray-500 ml-2">(Code: ${teacher.loginCode || 'N/A'})</span></span>
            <div class="flex items-center gap-3">
                <span class="delete-teacher-btn text-red-500 hover:text-red-700 cursor-pointer p-1"><i class="fas fa-trash-alt pointer-events-none"></i></span>
                <i class="fas fa-chevron-down text-gray-500 transition-transform duration-300"></i>
            </div>
        </button>
        <div class="accordion-content max-h-0 overflow-hidden transition-all duration-300 ease-in-out">
            <div class="p-3 border-t bg-white">
                <!-- Add Period Form -->
                <form class="add-period-form mb-4 p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <input type="hidden" class="hidden-jamia-name" value="${jamiaName}">
                    <input type="hidden" class="hidden-teacher-id" value="${teacherId}">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <input type="text" list="classes-list-${teacherId}" class="period-class-input w-full p-2 border rounded-lg urdu-font text-right" placeholder="درجہ لکھیں (مثلاً اول اے)" required>
                            <datalist id="classes-list-${teacherId}">${classesOptions}</datalist>
                        </div>
                        <input type="text" class="period-book-input w-full p-2 border rounded-lg urdu-font text-right" placeholder="کتاب کا نام لکھیں" required>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-green-200 pt-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Semester</label>
                            <select class="period-semester-select w-full p-2 border rounded-lg bg-white" required>
                                <option value="1">Semester 1 (Apr-Aug)</option>
                                <option value="2">Semester 2 (Sep-Jan)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Total Pages (for this Sem)</label>
                            <input type="number" class="period-total-pages-input w-full p-2 border rounded-lg" placeholder="Total Pages" required min="1">
                        </div>
                    </div>
                    <button type="submit" class="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition">Add Period</button>
                </form>
                
                <!-- Periods Table -->
                ${periodsHtml}
            </div>
        </div>
    </div>`;
};

// --- Helper: Render Periods Table ---
const renderPeriodsTable = (periods) => {
    if (!periods || periods.length === 0) return '<p class="text-gray-500 text-sm text-center p-2 border border-dashed rounded">Koi kitab (period) assign nahi ki gayi.</p>';
    
    let table = `
    <div class="overflow-x-auto border rounded-lg">
        <table class="min-w-full text-sm bg-white text-center">
            <thead class="bg-gray-100 border-b">
                <tr><th class="p-2">Class</th><th class="p-2">Book</th><th class="p-2">Sem</th><th class="p-2">Pages</th><th class="p-2">Action</th></tr>
            </thead>
            <tbody>`;
            
    periods.forEach(p => {
        table += `
        <tr class="border-b" data-period-id="${p.id}">
            <td class="p-2 urdu-font text-right">${p.className}</td>
            <td class="p-2 urdu-font text-right">${p.bookName}</td>
            <td class="p-2 text-gray-600">${p.semester}</td>
            <td class="p-2 font-bold">${p.totalPages}</td>
            <td class="p-2">
                <button type="button" class="delete-period-btn text-red-500 hover:text-red-700 p-1"><i class="fas fa-times-circle pointer-events-none"></i></button>
            </td>
        </tr>`;
    });
    table += `</tbody></table></div>`;
    return table;
};

// --- EVENT DELEGATION (Clicks) ---
const handleSetupClick = (e) => {
    // 1. Accordion Toggles
    if (e.target.closest('.accordion-button') || e.target.closest('.teacher-accordion-button')) {
        // Agar delete button par click kiya hai to accordion toggle na ho
        if (e.target.closest('.delete-teacher-btn')) return;

        const button = e.target.closest('.accordion-button') || e.target.closest('.teacher-accordion-button');
        const content = button.nextElementSibling;
        
        button.classList.toggle('open');
        content.classList.toggle('open');
        
        // CSS for max-height animation
        if (content.classList.contains('open')) {
            content.style.maxHeight = content.scrollHeight + 500 + "px"; // 500px extra for dynamic additions
        } else {
            content.style.maxHeight = null;
        }
        return;
    }

    // 2. Delete Teacher
    if (e.target.closest('.delete-teacher-btn')) {
        const jamiaName = e.target.closest('[data-jamia-name]').dataset.jamiaName;
        const teacherId = e.target.closest('[data-teacher-id]').dataset.teacherId;
        if (confirm(`Kya aap is teacher ko delete karna chahte hain?`)) {
            deleteTeacher(jamiaName, teacherId);
        }
        return;
    }

    // 3. Delete Period
    if (e.target.closest('.delete-period-btn')) {
        const jamiaName = e.target.closest('[data-jamia-name]').dataset.jamiaName;
        const teacherId = e.target.closest('[data-teacher-id]').dataset.teacherId;
        const periodId = e.target.closest('[data-period-id]').dataset.periodId;
        if (confirm(`Kya aap is kitab (period) ko delete karna chahte hain?`)) {
            deletePeriod(jamiaName, teacherId, periodId);
        }
        return;
    }
};

// --- EVENT DELEGATION (Submits) ---
const handleSetupSubmit = (e) => {
    e.preventDefault();
    captureAccordionState(); // State save karein taake refresh ke baad tab khula rahe
    
    // 1. Add Teacher Form
    if (e.target.classList.contains('add-teacher-form')) {
        const form = e.target;
        const jamiaName = form.closest('[data-jamia-name]').dataset.jamiaName;
        const name = form.querySelector('.teacher-name-input').value.trim();
        const code = form.querySelector('.teacher-code-input').value.trim();
        
        addTeacher(jamiaName, name, code);
    }
    
    // 2. Add Period Form
    if (e.target.classList.contains('add-period-form')) {
        const form = e.target;
        const jamiaName = form.querySelector('.hidden-jamia-name').value;
        const teacherId = form.querySelector('.hidden-teacher-id').value;
        const className = form.querySelector('.period-class-input').value.trim();
        const bookName = form.querySelector('.period-book-input').value.trim();
        const semester = form.querySelector('.period-semester-select').value;
        const totalPages = parseInt(form.querySelector('.period-total-pages-input').value, 10);
        
        addPeriod(jamiaName, teacherId, className, bookName, semester, totalPages);
    }
};

// --- DATABASE FUNCTIONS ---
const saveStructureToFirebase = async () => {
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            [`academicYears.${activeYear}.karkardagiStructure`]: allAcademicYearsData[activeYear].karkardagiStructure,
            lastUpdated: serverTimestamp()
        });
        renderSetupTab(); // Re-render UI after saving
        // Yahan Notification show kar sakte hain: alert("Saved Successfully!");
    } catch (error) {
        console.error("Error saving structure:", error);
        alert("Save karne me masla aaya. Internet check karein.");
    }
};

const addTeacher = async (jamiaName, name, code) => {
    let structure = allAcademicYearsData[activeYear].karkardagiStructure || [];
    let jamia = structure.find(j => j.jamiaName === jamiaName);
    
    if (!jamia) {
        jamia = { jamiaName: jamiaName, teachers: [] };
        structure.push(jamia);
    }
    if (!jamia.teachers) jamia.teachers = [];
    
    // Generate code logic if empty
    if(!code) code = String(Math.floor(10000 + Math.random() * 90000));
    
    const newTeacher = {
        id: `t-${Date.now()}`,
        name: name,
        loginCode: code,
        periods: []
    };
    
    jamia.teachers.push(newTeacher);
    allAcademicYearsData[activeYear].karkardagiStructure = structure;
    
    openAccordionIds.add(jamiaName);
    openAccordionIds.add(newTeacher.id);
    
    await saveStructureToFirebase();
};

const deleteTeacher = async (jamiaName, teacherId) => {
    captureAccordionState();
    let structure = allAcademicYearsData[activeYear].karkardagiStructure;
    let jamia = structure.find(j => j.jamiaName === jamiaName);
    if (jamia) {
        jamia.teachers = jamia.teachers.filter(t => t.id !== teacherId);
        await saveStructureToFirebase();
    }
};

const addPeriod = async (jamiaName, teacherId, className, bookName, semester, totalPages) => {
    let structure = allAcademicYearsData[activeYear].karkardagiStructure;
    let jamia = structure.find(j => j.jamiaName === jamiaName);
    let teacher = jamia?.teachers.find(t => t.id === teacherId);
    
    if (teacher) {
        if (!teacher.periods) teacher.periods = [];
        teacher.periods.push({
            id: `p-${Date.now()}`,
            className: className,
            bookName: bookName,
            semester: semester,
            totalPages: totalPages
        });
        
        openAccordionIds.add(jamiaName);
        openAccordionIds.add(teacherId);
        await saveStructureToFirebase();
    }
};

const deletePeriod = async (jamiaName, teacherId, periodId) => {
    captureAccordionState();
    let structure = allAcademicYearsData[activeYear].karkardagiStructure;
    let jamia = structure.find(j => j.jamiaName === jamiaName);
    let teacher = jamia?.teachers.find(t => t.id === teacherId);
    
    if (teacher && teacher.periods) {
        teacher.periods = teacher.periods.filter(p => p.id !== periodId);
        await saveStructureToFirebase();
    }
};

// --- GLOBAL STATE FOR REPORTING ---
let currentJamiaFilter = 'all';

// --- HELPER: KAIFIYAT CALCULATION ---
const calculateKaifiyatAndStyle = (achievement) => {
    let kaifiyat = "Munasib";
    let colorClass = "text-red-600 font-bold"; 
    
    // Basic logic (Aap isay admin config ke hisab se mazeed update kar sakte hain)
    if (achievement >= 90) { kaifiyat = "Mumtaz"; colorClass = "text-green-600 font-bold"; }
    else if (achievement >= 80) { kaifiyat = "Behtar"; colorClass = "text-blue-600 font-bold"; }
    
    // Adjustment for over-achievement
    if (achievement > 150) { kaifiyat = "Munasib"; colorClass = "text-red-600 font-bold"; }
    else if (achievement >= 121 && achievement <= 150) { kaifiyat = "Behtar"; colorClass = "text-blue-600 font-bold"; }

    return { kaifiyat, colorClass };
};

// --- 8. RENDER REPORTING TAB ---
const renderReportingTab = () => {
    const container = document.getElementById('k-reporting-content');
    if (!activeYear || !allAcademicYearsData[activeYear]) {
        container.innerHTML = '<p class="text-red-500 font-bold text-center mt-10">Pehle "Active Year" select karein.</p>';
        return;
    }

    const structure = allAcademicYearsData[activeYear].karkardagiStructure || [];
    
    // UI Structure (Top Bar)
    let html = `
        <div class="bg-blue-50 text-blue-800 p-3 rounded-lg text-center font-medium mb-4 border border-blue-100 shadow-sm">
            Aap abhi "${activeYear}" saal ke liye reporting kar rahe hain.
        </div>
        
        <div class="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div class="flex items-center gap-2">
                <label class="text-gray-700 font-medium whitespace-nowrap">Select Month:</label>
                <select id="k-report-month-select-inner" class="p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 outline-none"></select>
            </div>
            
            <div class="flex items-center gap-2">
                <label class="text-gray-700 font-medium whitespace-nowrap">Select Jamia:</label>
                <select id="k-jamia-filter-select" class="p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="all">All Jamiaat</option>
                    ${structure.map(j => `<option value="${j.jamiaName}" ${currentJamiaFilter === j.jamiaName ? 'selected' : ''}>${j.jamiaName}</option>`).join('')}
                </select>
            </div>
        </div>
        
        <p class="text-gray-600 mb-4">Is mahine har kitab me padhaye gaye pages ki tadad enter karein.</p>
        
        <div id="k-reporting-table-wrapper" class="space-y-6">
    `;

    let hasData = false;
    const sortedJamias = [...structure].sort((a, b) => a.jamiaName.localeCompare(b.jamiaName));

    sortedJamias.forEach(jamia => {
        if (currentJamiaFilter !== 'all' && jamia.jamiaName !== currentJamiaFilter) return;
        if (!jamia.teachers || jamia.teachers.length === 0) return;

        let jamiaTableHtml = `
        <div class="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
            <table class="min-w-full text-sm">
                <thead>
                    <tr class="bg-blue-50 border-b-2 border-blue-200" data-jamia-row="${jamia.jamiaName}">
                        <th colspan="12" class="p-3 text-left">
                            <div class="flex justify-between items-center w-full">
                                <span class="urdu-font text-lg font-bold text-gray-800 uppercase">${jamia.jamiaName}</span>
                                <div class="flex gap-2">
                                    <button class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow flex items-center gap-1"><i class="fas fa-link"></i> Link</button>
                                    <button class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow flex items-center gap-1"><i class="fas fa-image"></i> Image</button>
                                    <button class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow flex items-center gap-1"><i class="fas fa-file-csv"></i> CSV</button>
                                    <button class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow flex items-center gap-1"><i class="fas fa-pen"></i> Edit Pages</button>
                                </div>
                            </div>
                        </th>
                    </tr>
                    <tr class="bg-gray-100 text-gray-700 border-b font-semibold text-center">
                        <th class="p-2 border-r text-left">Teacher</th>
                        <th class="p-2 border-r">Class</th>
                        <th class="p-2 border-r">Book</th>
                        <th class="p-2 border-r urdu-font">سبق کی آخری<br>عبارت</th>
                        <th class="p-2 border-r">Page<br>No.</th>
                        <th class="p-2 border-r">Total Pages<br>(Sem)</th>
                        <th class="p-2 border-r">Total<br>Taught</th>
                        <th class="p-2 border-r">Monthly<br>Target</th>
                        <th class="p-2 border-r w-24">Pages Taught</th>
                        <th class="p-2 border-r">Achievement<br>%</th>
                        <th class="p-2 border-r">Kaifiyat<br>(Status)</th>
                        <th class="p-2">Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        jamia.teachers.forEach((teacher, tIndex) => {
            const periods = teacher.periods || [];
            const currentSemester = '1'; 
            const activePeriods = periods.filter(p => p.semester === currentSemester);
            
            if (activePeriods.length === 0) return;
            hasData = true;

            activePeriods.forEach((period, pIndex) => {
                const isFirstPeriod = pIndex === 0;
                
                const totalPages = period.totalPages || 0;
                const totalTaught = 0; 
                const monthlyTarget = 0; 
                const pagesTaughtVal = ''; 
                
                let achievement = 0;
                const { kaifiyat, colorClass } = calculateKaifiyatAndStyle(achievement);
                
                let teacherCell = '';
                let actionCell = '';
                
                if (isFirstPeriod) {
                    teacherCell = `<td rowspan="${activePeriods.length}" class="p-2 border-r border-b align-middle text-center font-bold text-gray-800 uppercase tracking-wide bg-white">${teacher.name}</td>`;
                    
                    actionCell = `
                    <td rowspan="${activePeriods.length}" class="p-2 border-b align-middle text-center bg-white">
                        <div class="flex flex-col gap-2 items-center justify-center">
                            <button class="text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold py-1 px-3 rounded flex items-center gap-1 w-full justify-center shadow-sm">
                                <i class="fas fa-image"></i> Image
                            </button>
                            <button class="text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold py-1 px-3 rounded flex items-center gap-1 w-full justify-center shadow-sm">
                                <i class="fas fa-trash-alt"></i> Reset
                            </button>
                        </div>
                    </td>`;
                }

                jamiaTableHtml += `
                <tr class="reporting-row border-b hover:bg-gray-50 transition-colors bg-white text-center" 
                    data-period-id="${period.id}" 
                    data-jamia="${jamia.jamiaName}" 
                    data-teacher="${teacher.id}">
                    
                    ${teacherCell}
                    
                    <td class="p-2 border-r urdu-font text-gray-700">${period.className}</td>
                    <td class="p-2 border-r urdu-font text-gray-700">${period.bookName}</td>
                    <td class="p-2 border-r urdu-font text-gray-500">-</td>
                    <td class="p-2 border-r text-gray-500">-</td>
                    <td class="p-2 border-r font-medium">${totalPages}</td>
                    <td class="p-2 border-r font-bold text-blue-700 cumulative-cell">${totalTaught}</td>
                    <td class="p-2 border-r font-medium">${monthlyTarget}</td>
                    
                    <td class="p-2 border-r">
                        <input type="number" 
                               class="pages-taught-input w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-center outline-none focus:ring-2 focus:ring-teal-500 transition-all" 
                               value="${pagesTaughtVal}" 
                               min="0"
                               data-target="${monthlyTarget}">
                    </td>
                    
                    <td class="p-2 border-r achievement-cell text-red-500 font-medium">${achievement}%</td>
                    <td class="p-2 border-r kaifiyat-cell ${colorClass}">${kaifiyat}</td>
                    
                    ${actionCell}
                </tr>`;
            });
        });

        jamiaTableHtml += `</tbody></table></div>`;
        if (hasData) {
            html += jamiaTableHtml;
        }
    });

    if (!hasData) {
        html += `<p class="text-yellow-600 bg-yellow-50 p-4 rounded-lg text-center font-medium border border-yellow-200">Is semester ke liye koi data nahi mila. Setup Structure check karein.</p>`;
    }

    html += `
        </div>
        <div class="mt-6 flex justify-end">
            <button id="k-save-report-btn" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-2">
                <i class="fas fa-save"></i> Save Monthly Report
            </button>
        </div>
    `;

    container.innerHTML = html;

    // Filter Listeners
    const jamiaSelect = document.getElementById('k-jamia-filter-select');
    if (jamiaSelect) {
        jamiaSelect.addEventListener('change', (e) => {
            currentJamiaFilter = e.target.value;
            renderReportingTab(); 
        });
    }

    const monthSelectInner = document.getElementById('k-report-month-select-inner');
    const mainMonthSelect = document.getElementById('k-report-month-select'); 
    if (monthSelectInner && mainMonthSelect) {
        monthSelectInner.innerHTML = mainMonthSelect.innerHTML;
    }

    // Input Auto Calculation
    document.querySelectorAll('.pages-taught-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const row = e.target.closest('tr');
            const target = parseInt(e.target.dataset.target, 10) || 0;
            const taught = parseInt(e.target.value, 10) || 0;
            
            const achievementCell = row.querySelector('.achievement-cell');
            const kaifiyatCell = row.querySelector('.kaifiyat-cell');
            
            let achievement = 0;
            if (taught > 0 && target > 0) {
                achievement = Math.round((taught / target) * 100);
            }
            
            const { kaifiyat, colorClass } = calculateKaifiyatAndStyle(achievement);
            
            achievementCell.textContent = `${achievement}%`;
            kaifiyatCell.textContent = kaifiyat;
            
            achievementCell.className = `p-2 border-r achievement-cell font-medium ${colorClass.replace('font-bold', '')}`;
            kaifiyatCell.className = `p-2 border-r kaifiyat-cell ${colorClass}`;
            
            row.classList.add('bg-yellow-50');
        });
    });
};

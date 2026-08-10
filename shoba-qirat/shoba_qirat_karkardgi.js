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
        });
    });
};

// --- 7. RENDER SETUP TAB (Jamiaat & Teachers UI) ---
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
        
        let teachersHtml = jamiaData.teachers.map(t => `
            <div class="p-3 bg-gray-50 border rounded-lg mt-2 flex justify-between items-center hover:shadow-md transition">
                <span class="urdu-font font-bold text-gray-800 text-lg">${t.name}</span>
                <span class="text-xs font-bold bg-teal-100 text-teal-800 px-3 py-1.5 rounded-full border border-teal-200">Code: ${t.loginCode || 'N/A'}</span>
            </div>
        `).join('') || '<p class="text-sm text-gray-400 mt-2 p-2 text-center bg-gray-50 rounded">Abhi is Jamia me koi ustad add nahi hai.</p>';

        return `
        <div class="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden mb-4">
            <div class="bg-gray-100 p-4 border-b flex justify-between items-center">
                <h4 class="font-bold text-xl urdu-font text-teal-800">${jamiaName}</h4>
            </div>
            <div class="p-4">
                <h5 class="text-sm font-bold text-gray-500 uppercase mb-2">Asatiza ki Fihrist</h5>
                ${teachersHtml}
            </div>
        </div>`;
    }).join('');
};

// shoba_qirat_karkardgi.js

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables for this module
let dbInstance = null;
let currentUserObj = null;
let profileData = null;
let activeAcademicYear = null;
let allAcademicYearsData = {};

export const initShobaQiratKarkardgi = async (db, user, userProfileData) => {
    dbInstance = db;
    currentUserObj = user;
    profileData = userProfileData;
    
    // Setup UI Structure (Sub-tabs injection)
    renderKarkardgiUIStructure();
    
    // Attach Event Listeners for Sub-tabs
    setupTabListeners();

    // Load necessary Admin/User Configs
    await loadKarkardgiData();
};

// 1. UI STRUCTURE RENDER FUNCTION
const renderKarkardgiUIStructure = () => {
    const container = document.getElementById('karkardgi-app-container');
    if (!container) return;

    // Yahan hum source 2 wale sub-tabs bana rahe hain
    container.innerHTML = `
        <div class="border-b border-gray-200 bg-white rounded-t-lg">
            <nav class="-mb-px flex items-center space-x-4 md:space-x-8 overflow-x-auto p-2" aria-label="Tabs">
                <button type="button" class="k-tab-btn active whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm border-teal-500 text-teal-600" data-tab="k-reporting">Monthly Reporting</button>
                <button type="button" class="k-tab-btn whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="k-submit-status">Submit Status</button>
                <button type="button" class="k-tab-btn whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="k-summary">Summary</button>
                <button type="button" class="k-tab-btn whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="k-setup">Setup Structure</button>
            </nav>
        </div>

        <div class="p-4 bg-white rounded-b-lg shadow-sm border border-gray-100 mt-2">
            
            <!-- MONTHLY REPORTING TAB -->
            <div id="k-reporting-content" class="k-tab-content space-y-4">
                <div class="flex flex-col md:flex-row items-center gap-4 bg-gray-50 p-3 rounded-lg border">
                    <label class="text-gray-700 font-medium whitespace-nowrap">Select Month:</label>
                    <select id="k-report-month-select" class="w-full md:w-auto p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"></select>
                </div>
                <div id="k-reporting-table-container" class="mt-4">
                    <p class="text-gray-500 text-sm text-center">Data load ho raha hai...</p>
                </div>
                <button id="k-save-report-btn" class="mt-4 w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg transition-colors hidden">Save Monthly Report</button>
            </div>

            <!-- SUBMIT STATUS TAB -->
            <div id="k-submit-status-content" class="k-tab-content hidden space-y-4">
                <h3 class="text-xl font-bold text-slate-800">Teacher Submission Status</h3>
                <div id="k-status-container" class="mt-4">
                    <p class="text-gray-500 text-sm text-center">Data load ho raha hai...</p>
                </div>
            </div>

            <!-- SUMMARY TAB -->
            <div id="k-summary-content" class="k-tab-content hidden space-y-4">
                <h3 class="text-xl font-bold text-slate-800">Karkardgi Summary</h3>
                <div id="k-summary-container" class="mt-4">
                    <p class="text-gray-500 text-sm text-center">Data load ho raha hai...</p>
                </div>
            </div>

            <!-- SETUP STRUCTURE TAB -->
            <div id="k-setup-content" class="k-tab-content hidden space-y-4">
                 <div class="bg-blue-50 p-4 border border-blue-100 rounded-lg flex items-center justify-between">
                    <div>
                        <h4 class="font-bold text-blue-900">Active Academic Year</h4>
                        <select id="k-active-year-select" class="mt-2 w-full md:w-64 p-2 border border-blue-200 rounded-lg bg-white"></select>
                    </div>
                </div>
                <div id="k-setup-accordion-container" class="space-y-3 mt-4">
                    <p class="text-gray-500 text-sm text-center">Jamiaat aur Teachers ki tafseel load ho rahi hai...</p>
                </div>
            </div>

        </div>
    `;
};

// 2. TAB SWITCHING LOGIC
const setupTabListeners = () => {
    const tabButtons = document.querySelectorAll('.k-tab-btn');
    const tabContents = document.querySelectorAll('.k-tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Sab buttons se active styling hatayein
            tabButtons.forEach(b => {
                b.classList.remove('active', 'border-teal-500', 'text-teal-600');
                b.classList.add('border-transparent', 'text-gray-500');
            });

            // Clicked button par active styling lagayein
            const clickedBtn = e.currentTarget;
            clickedBtn.classList.remove('border-transparent', 'text-gray-500');
            clickedBtn.classList.add('active', 'border-teal-500', 'text-teal-600');

            // Contents hide/show karein
            tabContents.forEach(content => content.classList.add('hidden'));
            const targetTab = clickedBtn.getAttribute('data-tab');
            document.getElementById(`${targetTab}-content`).classList.remove('hidden');

            // Tab switch hone par specific render functions call karein
            if(targetTab === 'k-reporting') renderReportingTab();
            if(targetTab === 'k-setup') renderSetupTab();
            // isi tarah baqi tabs ke function call karein...
        });
    });
};

// 3. DATA LOADING FUNCTION
const loadKarkardgiData = async () => {
    try {
        // Admin Config aur Academic years waghera load karne ka logic
        allAcademicYearsData = profileData.academicYears || {};
        
        // Year selector populate karein
        const yearSelect = document.getElementById('k-active-year-select');
        const yearNames = Object.keys(allAcademicYearsData).sort().reverse();
        
        if(yearNames.length > 0) {
            yearSelect.innerHTML = yearNames.map(name => `<option value="${name}">${name}</option>`).join('');
            activeAcademicYear = yearNames[0]; // Default to latest
        } else {
            yearSelect.innerHTML = `<option value="">Pehle naya saal banayein</option>`;
        }

        // Dropdown listeners attach karein
        yearSelect.addEventListener('change', (e) => {
            activeAcademicYear = e.target.value;
            renderSetupTab();
            renderReportingTab();
        });

        // Initialize UI with data
        renderSetupTab();
        renderReportingTab();

    } catch (error) {
        console.error("Data load karne me masla:", error);
    }
};

// 4. RENDER SETUP TAB (Jamiaat & Teachers)
const renderSetupTab = () => {
    const container = document.getElementById('k-setup-accordion-container');
    if (!activeAcademicYear || !allAcademicYearsData[activeAcademicYear]) {
        container.innerHTML = '<p class="text-red-500 text-center">Pehle "Active Year" select karein.</p>';
        return;
    }

    const jamiaat = profileData.jamiaatList || [];
    const structure = allAcademicYearsData[activeAcademicYear].karkardagiStructure || [];

    if (jamiaat.length === 0) {
         container.innerHTML = '<p class="text-yellow-600 text-center">Aapke profile me koi Jamia add nahi hai.</p>';
         return;
    }

    container.innerHTML = jamiaat.map(jamiaName => {
        let jamiaData = structure.find(j => j.jamiaName === jamiaName) || { teachers: [] };
        let teachersHtml = jamiaData.teachers.map(t => `
            <div class="p-2 bg-gray-50 border rounded mt-2 flex justify-between">
                <span class="urdu-font font-bold">${t.name}</span>
                <span class="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded">Code: ${t.loginCode || 'N/A'}</span>
            </div>
        `).join('') || '<p class="text-sm text-gray-400 mt-2">Koi ustad add nahi.</p>';

        return `
        <div class="border rounded-lg bg-white shadow-sm p-4">
            <h4 class="font-bold text-lg urdu-font text-teal-700">${jamiaName}</h4>
            <div class="mt-3">
                ${teachersHtml}
                <!-- Aap yahan Add Teacher ka form insert kar sakte hain -->
            </div>
        </div>`;
    }).join('');
};

// 5. RENDER REPORTING TAB
const renderReportingTab = () => {
    const container = document.getElementById('k-reporting-table-container');
    const saveBtn = document.getElementById('k-save-report-btn');
    
    if (!activeAcademicYear) {
        container.innerHTML = '<p class="text-red-500 text-center">Reporting ke liye saal select karein.</p>';
        saveBtn.classList.add('hidden');
        return;
    }

    // Yahan aap source 2 wali complex table drawing logic likhenge
    container.innerHTML = `
        <div class="p-8 bg-blue-50 rounded-xl text-center border border-blue-100">
            <i class="fas fa-clipboard-list text-3xl text-blue-400 mb-3"></i>
            <h4 class="font-bold text-blue-800">Monthly Reporting UI</h4>
            <p class="text-sm text-blue-600 mt-2">Yahan teachers ki karkardgi enter karne ka table aayega, bilkul wese hi jaise purane dashboard me tha.</p>
        </div>
    `;
    saveBtn.classList.remove('hidden');
};

// 6. SAVE REPORT LOGIC
document.addEventListener('click', (e) => {
    if(e.target && e.target.id === 'k-save-report-btn') {
        saveKarkardgiReport();
    }
});

const saveKarkardgiReport = async () => {
    // Yahan Data save karne ki logic aayegi
    alert("Report save karne ka function trigger ho gaya hai!");
};
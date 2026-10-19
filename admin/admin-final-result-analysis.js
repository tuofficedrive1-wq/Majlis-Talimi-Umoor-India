// ✅ FINAL FIXED: ADMIN RESULT ANALYSIS (WITH STATE FILTER & STATE SUMMARY)

import {
    collection, query, where, getDocs, orderBy, doc, setDoc, getDoc, writeBatch, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 🔹 HELPERS: Status & Colors
const getJamiaKefiyat = (p, level = 'teacher') => {
    let val = parseFloat(String(p).replace('%', ''));
    if (isNaN(val)) return "-";
    
    if (level === 'jamia' || level === 'class') {
        if (val >= 85) return "ممتاز مع شرف";
        if (val >= 76) return "ممتاز";
        if (val >= 61) return "بہتر";
        if (val >= 40) return "مناسب";
        return "کمزور";
    } else {
        if (val >= 90) return "ممتاز";
        if (val >= 70) return "بہتر";
        if (val >= 60) return "مناسب";
        if (val >= 51) return "کمزور";
        return "تشویش ناک";
    }
};

const getKefiyatColor = (p, level = 'teacher') => {
    let val = parseFloat(String(p).replace('%', ''));
    if (level === 'jamia' || level === 'class') {
        if (val >= 85) return "#059669";
        if (val >= 76) return "#2563eb";
        if (val >= 61) return "#d97706";
        if (val >= 40) return "#7c3aed";
        return "#dc2626";
    } else {
        if (val >= 90) return "#059669";
        if (val >= 70) return "#2563eb";
        if (val >= 60) return "#d97706";
        if (val >= 51) return "#7c3aed";
        return "#dc2626";
    }
};

// 🔹 CLEAN URDU TEXT HELPER (Matches result-analysis.js)
const cleanUrduText = (str) => {
    if (!str) return "";
    return String(str)
        .toLowerCase()
        .replace(/[\s_.\-()]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ةۀھ]/g, 'ہ')
        .replace(/[ىئ]/g, 'ی')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/ء/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();
};


// 🔹 STUDENT-WISE FULL DATA HELPERS
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sanitizeId = (s) => String(s).replace(/\//g, '-').replace(/\s+/g, '_');

const parseMarks = (cell) => {
    const s = String(cell ?? '').trim();
    if (s.includes('+')) {
        const parts = s.split('+').map(parseFloat);
        return parts.every(n => !isNaN(n)) ? parts.reduce((a, b) => a + b, 0) : NaN;
    }
    return parseFloat(s);
};

// Students ke data se class summary + subject stats banata hai (pehle wali logic hi hai)
const computeClassSummary = (cls) => {
    const s = { mumtazSharf: 0, mumtaz: 0, jayyidJidda: 0, jayyid: 0, maqbool: 0, majazZimni: 0, nakam: 0, ghaib: 0, total: 0, passed: 0 };
    const subj = {};
    const kKey = cls.summaryKey || (cls.roles && cls.roles.kefiyat);
    (cls.students || []).forEach(st => {
        s.total++;
        let isGhaib = true, hasAnyGhaib = false;
        (cls.keys || []).forEach(num => {
            const sc = cls.subjects[num]; const key = cls.colMap[num];
            if (!sc || !key) return;
            if (!subj[sc.name]) subj[sc.name] = { total: 0, passed: 0 };
            const cellStr = String(st[key] ?? '').trim(); const low = cellStr.toLowerCase();
            const isAbs = cellStr === 'غ' || cellStr === 'غائب' || low === 'a' || low === 'absent';
            const isTextGhaib = isAbs || cellStr === '';
            const isTextNakam = cellStr === 'ناکام' || low === 'fail' || low === 'f';
            if (isAbs) hasAnyGhaib = true;
            if (!isTextGhaib) {
                isGhaib = false; subj[sc.name].total++;
                const m = parseMarks(st[key]);
                if (!isNaN(m) && m >= sc.pass) subj[sc.name].passed++;
                else if (isNaN(m) && !isTextNakam) subj[sc.name].passed++;
            }
        });
        const kef = kKey ? String(st[kKey] ?? '').trim() : ''; const kl = kef.toLowerCase();
        if (kef.includes('غائب') || kef === 'غ' || isGhaib || hasAnyGhaib) s.ghaib++;
        else if (kef.includes('ناکام') || kl === 'f' || kl === 'fail') s.nakam++;
        else {
            s.passed++;
            if (kef.includes('الشرف') || kef === 'A+') s.mumtazSharf++;
            else if (kef.includes('ممتاز') || kef === 'A') s.mumtaz++;
            else if (kef.includes('جید جدا') || kef === 'B+') s.jayyidJidda++;
            else if (kef.includes('جید') || kef === 'B') s.jayyid++;
            else if (kef.includes('ضمنی')) s.majazZimni++;
            else s.maqbool++;
        }
    });
    return { summary: s, subj };
};

// Column ke naam se roll/name/father/kefiyat wagera khud pehchanta hai
const detectRoles = (columns) => {
    const find = (re, not) => { const c = columns.find(c => re.test(c.label) && !(not && not.test(c.label))); return c ? c.key : ''; };
    return {
        roll: find(/رول|roll/i),
        admission: find(/داخل|admission/i),
        name: find(/نام/, /والد|ولدیت|جامع/),
        nameEn: find(/^\s*(student'?s?\s*)?name\s*$/i),
        father: find(/والد|ولدیت/),
        fatherEn: find(/father/i),
        dob: find(/پیدائش|birth|dob/i),
        region: find(/ریجن|region/i),
        total: find(/حاصل|حصل|مجموع|obtained/i),
        maxTotal: find(/کل نمبر|max/i),
        percent: find(/فیصد|percent|%/i),
        kefiyat: find(/کیفیت/),
        grade: find(/گریڈ|grade/i),
        jamiaUr: ''
    };
};

const ROLE_LABELS = { roll: 'Roll No.', admission: 'Dakhila No.', name: 'Naam (Urdu)', nameEn: 'Name (English)', father: 'Walid (Urdu)', fatherEn: 'Father (English)', jamiaUr: 'Jamia ka naam (Urdu)', dob: 'Tareekh Paidaish', region: 'Region', kefiyat: 'Kefiyat', grade: 'Grade', total: 'Hasil Marks', maxTotal: 'Kul Marks', percent: 'Percentage' };

export async function initAdminResultAnalysis(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allUsers = window.allUsersData || [];
    let masterJamiaDict = {};
    
    try {
        const masterSnap = await getDocs(collection(db, 'jamiaat_master'));
        masterSnap.forEach(md => {
            const mData = md.data();
            mData.id = md.id;
            masterJamiaDict[md.id] = mData;
            if (mData.name) masterJamiaDict[mData.name.trim().toLowerCase()] = mData;
        });
    } catch (e) { console.error("Master list load error:", e); }

    const formatRegion = (r) => {
        if (!r) return '';
        let formatted = String(r).trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
        if (formatted === 'Dehli') return 'Delhi'; 
        if (formatted === 'Bengalore') return 'Bangalore';
        return formatted;
    };

    // 🌟 NAYA: State format helper
    const formatState = (s) => {
        if (!s) return '';
        return String(s).trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    };

    let regionSet = new Set();
    let stateSet = new Set();
    
    Object.values(masterJamiaDict).forEach(m => { 
        if(m.region) regionSet.add(formatRegion(m.region)); 
        if(m.state) stateSet.add(formatState(m.state)); 
    });
    
    // Check users for any missing states/regions
    allUsers.forEach(u => {
        if(u.region) regionSet.add(formatRegion(u.region));
        if(u.state) stateSet.add(formatState(u.state));
    });

    const regions = [...regionSet].sort();
    const states = [...stateSet].sort();

    const getJamiaContext = (jamiaName, jamiaId = null) => {
        if (!jamiaName && !jamiaId) return { userName: 'Not Linked', state: 'N/A', region: 'N/A', display: '', english: '' };
        const target = String(jamiaName || '').trim().toLowerCase();
        let mData = null;

        if (jamiaId && masterJamiaDict[jamiaId]) mData = masterJamiaDict[jamiaId];
        else if (masterJamiaDict[target]) mData = masterJamiaDict[target];
        else {
            let foundKey = Object.keys(masterJamiaDict).find(k => k === target || k.replace(/\s+/g, '') === target.replace(/\s+/g, ''));
            if (foundKey) mData = masterJamiaDict[foundKey];
        }

        const linkedUsers = allUsers.filter(u => {
            const list = u.jamiaatList || [];
            return list.some(j => {
                const jId = typeof j === 'object' ? j.id : null;
                const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                const jTarget = String(name || '').trim().toLowerCase();
                return jTarget === target || (mData && jTarget === String(mData.name || '').trim().toLowerCase());
            });
        });

        let foundUser = linkedUsers.find(u => u.role === 'standard' || !u.role);
        if (!foundUser) foundUser = linkedUsers.find(u => u.role !== 'inspector' && u.role !== 'education_office' && u.role !== 'shoba_qirat' && u.role !== 'qirat');

        const finalMasterName = mData ? (mData.name || jamiaName) : jamiaName;
        const finalUrduName = mData ? (mData.urduName || '') : '';
        
        let finalRegion = mData ? (mData.region || '') : '';
        let finalState = mData ? (mData.state || '') : '';
        
        if (!finalRegion && foundUser) finalRegion = foundUser.region || '';
        if (!finalState && foundUser) finalState = foundUser.state || '';

        return {
            userName: foundUser ? (foundUser.name || foundUser.email) : 'Not Linked',
            state: formatState(finalState) || 'N/A',
            region: formatRegion(finalRegion) || 'N/A', 
            display: finalUrduName || finalMasterName,
            english: finalMasterName
        };
    };

    // 🌟 HTML UI RENDER 🌟
    // Note: Grid changed to lg:grid-cols-7 to fit State
    container.innerHTML = `
    <div class="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-lg border">
        <!-- 3 Tabs -->
        <div class="flex border-b mb-6 bg-gray-50 rounded-t-lg overflow-hidden">
            <button id="tab-dashboard" class="flex-1 py-3 font-bold text-gray-600 hover:bg-white transition active-sub-tab">📊 Result Dashboard</button>
            <button id="tab-reports" class="flex-1 py-3 font-bold text-gray-600 hover:bg-white transition">📝 Detailed Reports</button>
            <button id="tab-upload" class="flex-1 py-3 font-bold text-teal-600 hover:bg-white transition">📤 Upload Master Excel</button>
        </div>

        <!-- Filters Section -->
        <div id="filter-section" class="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-4">
                <div>
                    <label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Exam & Year</label>
                    <div class="flex gap-1">
                        <select id="admin-exam-type" class="w-full p-2 border rounded-lg text-sm urdu-font">
                            <option value="سالانہ امتحان">سالانہ امتحان</option>
                            <option value="ششماہی امتحان">ششماہی امتحان</option>
                        </select>
                        <select id="admin-exam-year" class="w-full p-2 border rounded-lg text-sm"></select>
                    </div>
                </div>
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">State</label><select id="admin-state-filter" class="w-full p-2 border rounded-lg text-sm"><option value="all">All States</option>${states.map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Region</label><select id="admin-region-filter" class="w-full p-2 border rounded-lg text-sm"><option value="all">All Regions</option>${regions.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div>
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">User Filter</label><select id="admin-user-filter" class="w-full p-2 border rounded-lg text-sm"><option value="all">All Users</option>${allUsers.filter(u => u.role === 'standard' || !u.role).map(u => `<option value="${u.name || u.email}">${u.name || u.email}</option>`).join('')}</select></div>
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Select Jamia</label><select id="admin-jamia-select" class="w-full p-2 border rounded-lg text-sm urdu-font"><option value="all">All Jamiaat</option></select></div>
                
                <div id="dashboard-filters-div">
                    <label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Dashboard Type</label>
                    <select id="dashboard-result-type" class="w-full p-2 border rounded-lg text-sm font-bold">
                        <option value="state-wise">🗺️ State Summary</option>
                        <option value="region-wise">🌍 Region Summary</option>
                        <option value="user-wise">👨‍💼 User Summary</option>
                        <option value="submission-status">📋 Submission Status</option>
                    </select>
                </div>
                
                <div id="reports-layout-filter-div" class="hidden">
                    <label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Report Layout</label>
                    <select id="admin-layout" class="w-full p-2 border rounded-lg text-sm">
                        <option value="jamia">Jamia Wise</option>
                        <option value="class">Class Wise</option>
                        <option value="teacher">Asatiza Wise</option>
                        <option value="wazahat">Kamzor Result (Wazahat)</option>
                        <option value="ibtidaiya">Ibtidaiya (Student Wise)</option>
                    </select>
                </div>
            </div>

            <div class="flex gap-3">
                <button id="admin-show-btn" class="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition">Show Analysis</button>
                <button id="admin-export-btn" class="hidden flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg transition">📥 Excel</button>
            </div>
        </div>

        <div id="stats-summary" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"></div>
        <div id="admin-loader" class="hidden text-center py-12"><div class="loader mx-auto"></div><p>Loading Data...</p></div>
        
        <div id="dashboard-view" class="space-y-6"></div>
        <div id="reports-view" class="hidden overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
             <table class="w-full text-center border-collapse" id="final-analysis-table-to-export">
                <thead><tr id="admin-head" class="bg-gray-800 text-white urdu-font text-[14px]"></tr></thead>
                <tbody id="admin-body" class="divide-y divide-gray-100 text-gray-700"></tbody>
                <tfoot id="admin-foot" class="bg-gray-800 text-white font-bold"></tfoot>
            </table>
        </div>

        <!-- 🚀 UPLOAD MASTER EXCEL VIEW (Direct DB) -->
        <div id="upload-view" class="hidden space-y-6">
            <div class="bg-white p-6 rounded-2xl border border-teal-100 shadow-sm">
                <h3 class="text-xl font-bold text-slate-800 border-b pb-3 mb-4"><i class="fas fa-file-excel text-teal-600 mr-2"></i> Master Excel Upload (Direct to DB)</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Imtihan (Upload Type)</label>
                        <select id="upload-exam-type" class="w-full p-2 border rounded-lg urdu-font bg-gray-50">
                            <option value="سالانہ امتحان">سالانہ امتحان</option>
                            <option value="ششماہی امتحان">ششماہی امتحان</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Saal (Upload Year)</label>
                        <select id="upload-exam-year" class="w-full p-2 border rounded-lg bg-gray-50"></select>
                    </div>
                </div>
                
                <div class="mb-6">
                    <label class="block text-sm font-bold text-gray-700 mb-1">Upload Master Excel File</label>
                    <input type="file" id="result-excel-file" accept=".xlsx, .xls" class="w-full p-2 border border-teal-300 rounded-lg bg-teal-50 cursor-pointer focus:outline-none">
                    <button id="btn-load-saved" class="mt-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold py-2 px-4 rounded-lg text-sm border border-indigo-200 transition">✏️ Saved Student Data Edit karein (upar select kiya hua Exam & Year)</button>
                    <p class="text-xs text-gray-500 mt-2">نوٹ: ایکسل کا ڈیٹا جوں کا توں ڈیٹا بیس میں محفوظ ہو جائے گا جس سے اساتذہ کے فارم میں مضامین خود آ جائیں گے۔</p>
                </div>

                <div id="preview-container" class="hidden mt-6 p-6 border-2 border-indigo-200 bg-indigo-50 rounded-2xl shadow-sm">
                    <h4 class="text-xl font-bold text-indigo-800 mb-4"><i class="fas fa-table mr-2"></i> <span id="editor-title">Student Data (ضرورت ہو تو ایڈٹ کریں)</span></h4>
                    <div id="preview-content" class="space-y-4 mb-6 max-h-[34rem] overflow-y-auto pr-2 custom-scrollbar"></div>
                    
                    <div class="flex flex-col sm:flex-row gap-4 mt-6">
                        <button id="btn-cancel-preview" class="w-full sm:w-1/3 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl shadow-sm transition flex justify-center items-center gap-2">
                            <i class="fas fa-times"></i> Cancel & Re-upload
                        </button>
                        <button id="btn-confirm-upload" class="w-full sm:w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition text-lg flex items-center justify-center gap-2">
                            <i class="fas fa-cloud-upload-alt"></i> Confirm & Upload to Database
                        </button>
                    </div>
                </div>

                <div class="mt-8 border-t border-gray-200 pt-6">
                    <h4 class="text-lg font-bold text-red-700 mb-3"><i class="fas fa-trash-alt mr-2"></i> Delete Old Uploaded Data</h4>
                    <div class="flex flex-col md:flex-row gap-4">
                        <select id="delete-jamia-select" class="w-full md:w-1/2 p-2 border rounded-lg urdu-font bg-gray-50">
                            <option value="all">All Jamiaat (Poora Result Delete)</option>
                        </select>
                        <button id="btn-delete-result" class="w-full md:w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition shadow">
                            🗑 Delete Result
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">نوٹ: جو سال اور امتحان آپ نے اوپر سیلیکٹ کیا ہوگا، اسی کا رزلٹ ڈیلیٹ ہوگا۔</p>
                </div>

                <div id="upload-logs" class="hidden"></div>
            </div>
        </div>
    </div>`;

    const elements = {
        btnDashboard: document.getElementById("tab-dashboard"),
        btnReports: document.getElementById("tab-reports"),
        btnUpload: document.getElementById("tab-upload"),
        dashboardView: document.getElementById("dashboard-view"),
        reportsView: document.getElementById("reports-view"),
        uploadView: document.getElementById("upload-view"),
        filterSection: document.getElementById("filter-section"),
        exportBtn: document.getElementById("admin-export-btn"),
        stateFilter: document.getElementById("admin-state-filter"),
        regionFilter: document.getElementById("admin-region-filter"),
        userFilter: document.getElementById("admin-user-filter"),
        jamiaSelect: document.getElementById("admin-jamia-select"),
        dashboardFilters: document.getElementById("dashboard-filters-div"), 
        reportsLayoutFilter: document.getElementById("reports-layout-filter-div"),
        statsContainer: document.getElementById("stats-summary")
    };

    const switchTab = (activeBtn, activeView) => {
        [elements.btnDashboard, elements.btnReports, elements.btnUpload].forEach(btn => {
            if (btn) btn.classList.remove("active-sub-tab", "text-teal-600", "text-gray-600");
        });
        
        if (activeBtn) {
            activeBtn.classList.add("active-sub-tab");
            if (activeBtn === elements.btnUpload) activeBtn.classList.add("text-teal-600");
            else activeBtn.classList.add("text-gray-600");
        }

        [elements.dashboardView, elements.reportsView, elements.uploadView].forEach(v => {
            if (v) v.classList.add("hidden");
        });
        
        if (activeView) activeView.classList.remove("hidden");

        if (activeView === elements.uploadView) {
            if (elements.filterSection) elements.filterSection.classList.add("hidden");
            if (elements.statsContainer) elements.statsContainer.classList.add("hidden");
            if (elements.exportBtn) elements.exportBtn.classList.add("hidden");
        } else {
            if (elements.filterSection) elements.filterSection.classList.remove("hidden");

            if (activeView === elements.dashboardView) {
                if (elements.dashboardFilters) elements.dashboardFilters.classList.remove("hidden");
                if (elements.reportsLayoutFilter) elements.reportsLayoutFilter.classList.add("hidden");
                if (elements.statsContainer) elements.statsContainer.classList.remove("hidden");
                if (elements.exportBtn) elements.exportBtn.classList.add("hidden");
            } else if (activeView === elements.reportsView) {
                if (elements.dashboardFilters) elements.dashboardFilters.classList.add("hidden");
                if (elements.reportsLayoutFilter) elements.reportsLayoutFilter.classList.remove("hidden");
                if (elements.statsContainer) elements.statsContainer.classList.add("hidden");
                
                const tbody = document.getElementById("admin-body");
                if (tbody && tbody.innerHTML.trim() !== "") {
                    if (elements.exportBtn) elements.exportBtn.classList.remove("hidden");
                }
            }
        }
    };

    if (elements.btnDashboard) elements.btnDashboard.onclick = () => switchTab(elements.btnDashboard, elements.dashboardView);
    if (elements.btnReports) elements.btnReports.onclick = () => switchTab(elements.btnReports, elements.reportsView);
    if (elements.btnUpload) elements.btnUpload.onclick = () => switchTab(elements.btnUpload, elements.uploadView);

    const adminExamYearSelect = document.getElementById('admin-exam-year');
    const uploadExamYearSelect = document.getElementById('upload-exam-year');
    
    const now = new Date();
    const startYear = (now.getMonth() >= 3) ? now.getFullYear() : now.getFullYear() - 1;
    const currentAcademicYear = `${startYear}-${(startYear + 1).toString().slice(-2)}`; 
    let availableYears = new Set([currentAcademicYear]);
    
    allUsers.forEach(u => {
        if (u.academicYears) {
            Object.keys(u.academicYears).forEach(year => {
                const parts = year.split('-');
                availableYears.add(parts.length === 2 && parts[1].length === 4 ? `${parts[0]}-${parts[1].slice(-2)}` : year);
            });
        }
    });
    
    const sortedYears = Array.from(availableYears).sort().reverse();
    
    [adminExamYearSelect, uploadExamYearSelect].forEach(select => {
        if (select) {
            sortedYears.forEach(yearVal => {
                const option = document.createElement('option');
                option.value = yearVal; option.textContent = yearVal;
                if (yearVal === currentAcademicYear) option.selected = true;
                select.appendChild(option);
            });
        }
    });

    const updateJamiaList = () => {
        const selState = elements.stateFilter ? elements.stateFilter.value : 'all';
        const selUser = elements.userFilter.value;
        const selReg = elements.regionFilter.value;
        const delJamiaSelect = document.getElementById('delete-jamia-select');
        
        if(elements.jamiaSelect) elements.jamiaSelect.innerHTML = '<option value="all">All Jamiaat</option>';
        if(delJamiaSelect) delJamiaSelect.innerHTML = '<option value="all">All Jamiaat (Poora Result Delete)</option>';

        let filteredUsers = allUsers;
        
        // Fix: Added toUpperCase() logic correctly for Region match
        if (selReg !== "all") filteredUsers = filteredUsers.filter(u => String(u.region || '').trim().toUpperCase() === selReg.toUpperCase());
        if (selUser !== "all") filteredUsers = filteredUsers.filter(u => (u.name || u.email) === selUser);

        let jamiaSet = new Set();
        filteredUsers.forEach(u => {
            (u.jamiaatList || []).forEach(j => {
                const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                if (name) {
                    let jNameStr = String(name).trim();
                    let mData = masterJamiaDict[jNameStr.toLowerCase()];
                    if (!mData) {
                        let foundKey = Object.keys(masterJamiaDict).find(k => k === jNameStr.toLowerCase() || k.replace(/\s+/g, '') === jNameStr.toLowerCase().replace(/\s+/g, ''));
                        if (foundKey) mData = masterJamiaDict[foundKey];
                    }
                    
                    let jState = mData ? formatState(mData.state) : (u.state ? formatState(u.state) : '');
                    
                    // State Filter Check
                    if (selState === "all" || jState === selState) {
                        jamiaSet.add(jNameStr);
                    }
                }
            });
        });

        [...jamiaSet].sort().forEach(j => {
            if(elements.jamiaSelect) elements.jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
            if(delJamiaSelect) delJamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });
    };

    // Events for Cascading Dropdowns
    if (elements.stateFilter) {
        elements.stateFilter.onchange = () => {
            elements.regionFilter.value = 'all';
            elements.userFilter.value = 'all';
            updateJamiaList();
        };
    }

    if (elements.regionFilter) {
        elements.regionFilter.onchange = () => {
            elements.userFilter.innerHTML = '<option value="all">All Users</option>';
            allUsers.filter(u => u.role === 'standard' || !u.role).forEach(u => {
                const n = u.name || u.email;
                elements.userFilter.innerHTML += `<option value="${n}">${n}</option>`;
            });
            updateJamiaList();
        };
    }
    if (elements.userFilter) elements.userFilter.onchange = updateJamiaList;
    updateJamiaList(); 

    const showBtn = document.getElementById("admin-show-btn");
    if (showBtn) {
        showBtn.onclick = async () => {
            const examType = document.getElementById("admin-exam-type").value;
            const examYear = document.getElementById("admin-exam-year").value;
            
            const selState = elements.stateFilter ? elements.stateFilter.value : 'all';
            const selRegion = elements.regionFilter.value;
            const selUser = elements.userFilter.value;
            const selJamia = elements.jamiaSelect.value.toLowerCase();
            const layout = document.getElementById("admin-layout").value;
            const loader = document.getElementById("admin-loader");
            
            loader.classList.remove("hidden");
            
            try {
                let snapshot;
                if (layout === 'ibtidaiya') {
                    const ibtidaiyaExam = examType === "ششماہی امتحان" ? "Shashmahi" : "Salana";
                    const q = query(collection(db, "ibtidaiya_exams"), where("examType", "==", ibtidaiyaExam));
                    snapshot = await getDocs(q);
                } else {
                    const colName = (layout === 'teacher' || layout === 'wazahat') ? "asatiza_wise_results" : "class_wise_results";
                    const q = query(collection(db, colName), where("examType", "==", examType), where("examYear", "==", examYear), orderBy("timestamp", "desc"));
                    snapshot = await getDocs(q);
                }
                
                let latestDataMap = new Map();
                snapshot.forEach(doc => {
                    const d = doc.data();
                    d.id = doc.id;
                    let rawJamia = layout === 'ibtidaiya' ? (d.jamiaName || "") : (d.jamia || "");
                    const currentJamia = typeof rawJamia === 'object' ? (rawJamia.name || rawJamia.jamiaName || "") : String(rawJamia);
                    const context = getJamiaContext(currentJamia, d.jamiaId);

                    if (layout === 'ibtidaiya') d.jamiaName = context.display;
                    else d.jamia = context.display;

                    // Filtering Logic Check (State added)
                    if ((selState === "all" || context.state === selState) &&
                        (selRegion === "all" || context.region === selRegion) && 
                        (selUser === "all" || context.userName === selUser) && 
                        (selJamia === "all" || context.english.toLowerCase().includes(selJamia) || context.display.toLowerCase().includes(selJamia) || currentJamia.toLowerCase().includes(selJamia))) {
                        
                        if (layout === 'ibtidaiya') {
                            latestDataMap.set(d.id, { ...d, ...context });
                        } else if (layout === 'teacher' || layout === 'wazahat') {
                            if (!Array.isArray(d.data) || d.data.length === 0) return;
                            let uniqueKey = (currentJamia || d.jamia || d.id).trim().toLowerCase();

                            if (!latestDataMap.has(uniqueKey)) {
                                d.keyDocMap = {};
                                if (d.wazahat_map) {
                                    for (let k in d.wazahat_map) d.keyDocMap[k] = d.id;
                                }
                                latestDataMap.set(uniqueKey, { ...d, ...context, docId: d.id, originalJamia: currentJamia });
                            } else {
                                const target = latestDataMap.get(uniqueKey);
                                if (!target.keyDocMap) target.keyDocMap = {};
                                if (d.wazahat_map) {
                                    if (!target.wazahat_map) target.wazahat_map = {};
                                    for (let k in d.wazahat_map) {
                                        if (!target.wazahat_map[k]) {
                                            target.wazahat_map[k] = d.wazahat_map[k];
                                            target.keyDocMap[k] = d.id;
                                        }
                                    }
                                }
                                if (d.wazahat_date_map) {
                                    target.wazahat_date_map = { ...d.wazahat_date_map, ...(target.wazahat_date_map || {}) };
                                }
                                if (d.zimmedar_comments) {
                                    target.zimmedar_comments = { ...d.zimmedar_comments, ...(target.zimmedar_comments || {}) };
                                }
                                if (d.wazahat && !target.wazahat) {
                                    target.wazahat = d.wazahat;
                                    target.keyDocMap['_legacy_'] = d.id;
                                }
                            }
                        } else {
                            let uniqueKey = `${d.jamia}_${d.darjah || d.class}`.toLowerCase();
                            if (!latestDataMap.has(uniqueKey)) latestDataMap.set(uniqueKey, { ...d, ...context });
                        }
                    }
                });

                const dataList = Array.from(latestDataMap.values());
                const activeTab = elements.btnDashboard.classList.contains("active-sub-tab") ? 'dashboard' : 'reports';

                if (activeTab === 'dashboard') {
                    renderDashboard(dataList, document.getElementById("dashboard-result-type").value, allUsers);
                    if (elements.exportBtn) elements.exportBtn.classList.add("hidden");
                } else {
                    renderDetailedReports(dataList, layout);
                    if (elements.exportBtn) elements.exportBtn.classList.remove("hidden");
                }
            } catch (e) { alert("Data load error: " + e.message); }
            
            loader.classList.add("hidden");
        };
    }

    if (elements.exportBtn) {
        elements.exportBtn.onclick = () => {
            const table = document.getElementById("final-analysis-table-to-export");
            const wb = XLSX.utils.table_to_book(table);
            XLSX.writeFile(wb, `Result_Report_${new Date().toLocaleDateString()}.xlsx`);
        };
    }

    function renderDashboard(data, type, users) {
        const view = elements.dashboardView;
        view.innerHTML = "";
        const num = (v) => parseInt(v) || 0;

        if (type === 'state-wise' || type === 'region-wise' || type === 'user-wise') {
            let stats = {};
            const keyField = type === 'state-wise' ? 'state' : (type === 'region-wise' ? 'region' : 'userName');
            
            // 1. Data Jama Karein
            data.forEach(d => {
                const key = d[keyField] || 'Unknown';
                if (!stats[key]) stats[key] = { h: 0, p: 0 };
                const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
                const p = num(d.mumtazSharf) + num(d.mumtaz) + num(d.jayyidJidda) + num(d.jayyid) + num(d.maqbool) + num(d.majazZimni);
                stats[key].h += h; 
                stats[key].p += p;
            });

            // 2. Array banayein aur Percentage nikaalein
            let statsArray = Object.keys(stats).map(k => {
                let s = stats[k];
                let per = s.h ? (s.p / s.h) * 100 : 0;
                return { name: k, h: s.h, p: s.p, per: per };
            });

            // 3. Percentage ke hisaab se SORT (Rank) karein (Highest % sabse upar)
            statsArray.sort((a, b) => b.per - a.per);

            // Column Header dynamically set karein
            let colTitle = type === 'state-wise' ? 'State' : (type === 'region-wise' ? 'Region' : 'User');

            // 4. Rows generate karein with Sr. No
            let rows = statsArray.map((item, index) => {
                let rank = index + 1;
                // Top 3 ke liye thoda special design/icon
                let rankBadge = rank === 1 ? '🥇 1' : (rank === 2 ? '🥈 2' : (rank === 3 ? '🥉 3' : rank));

                return `<tr class="border-b hover:bg-gray-50">
                    <td class="p-2 border font-bold text-gray-700 bg-gray-100">${rankBadge}</td>
                    <td class="p-2 border font-bold text-left urdu-font text-indigo-700">${item.name}</td>
                    <td class="p-2 border text-blue-600 font-bold">${item.h}</td>
                    <td class="p-2 border text-green-600 font-bold">${item.p}</td>
                    <td class="p-2 border font-bold ${item.per >= 50 ? 'text-green-700' : 'text-red-500'}">${item.per.toFixed(1)}%</td>
                </tr>`;
            }).join('');

            // 5. Table me Sr. No. column add karke render karein
            view.innerHTML = `
            <div class="bg-white p-5 rounded-xl border shadow-sm max-w-3xl mx-auto overflow-hidden">
                <h4 class="text-center font-bold text-indigo-800 mb-4 text-lg border-b pb-2">
                    <i class="fas fa-chart-bar mr-2"></i> ${colTitle} Wise Performance Ranking
                </h4>
                <table class="w-full text-sm text-center">
                    <thead class="bg-gray-800 text-white">
                        <tr>
                            <th class="p-2 border border-gray-700 w-16">Sr.</th>
                            <th class="p-2 border border-gray-700 text-left pl-3">${colTitle} Name</th>
                            <th class="p-2 border border-gray-700">Hazir</th>
                            <th class="p-2 border border-gray-700">Pass</th>
                            <th class="p-2 border border-gray-700">%</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        } else {
            // Yahan se purana Submission Status wala code same rahega...
            let submissionHtml = users.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(u => {
                const userJamiaat = u.jamiaatList || [];
                if (userJamiaat.length === 0) return "";
                const jamiaRows = userJamiaat.map(j => {
                    const jName = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                    const isSub = data.some(d => {
                        const rawDjamia = d.jamia || d.jamiaName || "";
                        const dJamia = typeof rawDjamia === 'object' ? (rawDjamia.name || rawDjamia.jamiaName || "") : String(rawDjamia);
                        return dJamia.trim().toLowerCase() === String(jName).trim().toLowerCase();
                    });
                    return `<div class="flex justify-between p-2 border-b text-xs"><span class="urdu-font">${jName}</span>${isSub ? '<span class="text-green-600">✅ Received</span>' : '<span class="text-red-500">❌ Missing</span>'}</div>`;
                }).join('');
                return `<div class="bg-white p-4 rounded-lg border shadow-sm"><h5 class="font-bold text-indigo-700 border-b pb-2 mb-2 text-sm">${u.name || u.email}</h5>${jamiaRows}</div>`;
            }).join('');
            view.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${submissionHtml}</div>`;
        }
    }

    function renderDetailedReports(data, layout) {
        const thead = document.getElementById("admin-head");
        const tbody = document.getElementById("admin-body");
        const tfoot = document.getElementById("admin-foot");
        tbody.innerHTML = ""; tfoot.innerHTML = "";
        document.querySelectorAll('.summary-bar-wazahat').forEach(el => el.remove());
        const num = (v) => parseInt(v) || 0;

        if (layout === 'ibtidaiya') {
            thead.innerHTML = `<tr class="bg-indigo-900 text-white text-[13px] font-bold urdu-font"><th class="p-2 border border-indigo-700">Sr.</th><th class="p-2 border border-indigo-700">Region</th><th class="p-2 border border-indigo-700">تعلیمی ذمہ دار</th><th class="p-2 border border-indigo-700">جامعہ</th><th class="p-2 border border-indigo-700">داخلہ</th><th class="p-2 border border-indigo-700 min-w-[120px]">طالب علم کا نام</th><th class="p-2 border border-indigo-700 min-w-[120px]">ولدیت</th><th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">تجوید</th><th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">ورک بک</th><th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">اردو</th><th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">ہم نصابی</th><th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">املا</th><th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">Eng(W)</th><th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">Eng(O)</th><th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">ریاضی</th><th class="p-2 border border-indigo-700 bg-gray-800">کل</th><th class="p-2 border border-indigo-700 bg-blue-900">حاصل</th><th class="p-2 border border-indigo-700 bg-green-900">%</th><th class="p-2 border border-indigo-700">کیفیت</th></tr>`;
            let sr = 1;
            data.forEach(d => {
                (d.students || []).forEach(stu => {
                    const getM = (val) => val === 'A' ? '<span class="text-red-500 font-bold">A</span>' : (val || '-');
                    tbody.innerHTML += `<tr class="text-center hover:bg-gray-50 border-b"><td class="p-2 border">${sr++}</td><td class="p-2 border font-bold text-gray-700">${d.region || '-'}</td><td class="p-2 border urdu-font text-blue-700">${d.userName || '-'}</td><td class="p-2 border urdu-font font-bold text-indigo-700">${d.jamiaName || '-'}</td><td class="p-2 border text-gray-600">${stu.dakhila || '-'}</td><td class="p-2 border urdu-font font-bold text-right">${stu.name || '-'}</td><td class="p-2 border urdu-font text-right">${stu.fatherName || '-'}</td><td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.tajweed)}</td><td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.workbook)}</td><td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.urdu)}</td><td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.ham_nisabi)}</td><td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.imla)}</td><td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.eng_written)}</td><td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.eng_oral)}</td><td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.riyazi)}</td><td class="p-2 border font-bold text-gray-500 bg-gray-100">500</td><td class="p-2 border font-bold text-blue-700 bg-blue-50">${stu.obtained || 0}</td><td class="p-2 border font-bold text-green-700 bg-green-50">${stu.percent || '0%'}</td><td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(stu.percent, 'jamia')}">${stu.status || '-'}</td></tr>`;
                });
            });
            if (sr === 1) tbody.innerHTML = `<tr><td colspan="19" class="p-10 text-center text-red-500 font-bold urdu-font text-lg">کوئی ریکارڈ نہیں ملا</td></tr>`;
        }
        else if (layout === 'jamia') {
            thead.innerHTML = `<th class="p-2 border">Sr.</th><th class="p-2 border">Region</th><th class="p-2 border">تعلیمی ذمہ دار</th><th class="p-2 border">جامعہ</th><th class="p-2 border">کل طلباء</th><th class="p-2 border bg-blue-50 text-blue-800">حاضر</th><th class="p-2 border bg-gray-100 text-gray-700">غیر حاضر</th><th class="p-2 border bg-green-50 text-green-700">کامیاب</th><th class="p-2 border bg-red-50 text-red-700">ناکام</th><th class="p-2 border">%</th><th class="p-2 border">کیفیت</th>`;
            let jamiaStats = {}; let grandTotalStudents = 0; let grandTotalHazir = 0; let grandTotalGhaib = 0; let grandTotalPass = 0; let grandTotalNakam = 0;
            data.forEach(d => {
                if (!jamiaStats[d.jamia]) jamiaStats[d.jamia] = { t: 0, h: 0, g: 0, p: 0, n: 0, region: d.region || '-', user: d.userName || '-' };
                const t = num(d.total); 
                const g = num(d.ghaib);
                const n = num(d.nakam);
                const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
                const p = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                
                jamiaStats[d.jamia].t += t; 
                jamiaStats[d.jamia].h += h; 
                jamiaStats[d.jamia].g += g; 
                jamiaStats[d.jamia].p += p; 
                jamiaStats[d.jamia].n += n;
                
                grandTotalStudents += t; 
                grandTotalHazir += h; 
                grandTotalGhaib += g; 
                grandTotalPass += p; 
                grandTotalNakam += n;
            });
            Object.entries(jamiaStats).map(([name, s]) => ({ name, s, per: s.h ? (s.p / s.h) * 100 : 0 })).sort((a, b) => b.per - a.per).forEach((item, i) => {
                tbody.innerHTML += `<tr>
                    <td class="p-2 border">${i + 1}</td>
                    <td class="p-2 border font-bold">${item.s.region}</td>
                    <td class="p-2 border urdu-font">${item.s.user}</td>
                    <td class="p-2 border urdu-font font-bold">${item.name}</td>
                    <td class="p-2 border font-bold text-indigo-700">${item.s.t}</td>
                    <td class="p-2 border font-bold text-blue-700 bg-blue-50/50">${item.s.h}</td>
                    <td class="p-2 border font-bold text-gray-500 bg-gray-50/50">${item.s.g}</td>
                    <td class="p-2 border text-green-700 font-bold bg-green-50/50">${item.s.p}</td>
                    <td class="p-2 border text-red-600 font-bold bg-red-50/50">${item.s.n}</td>
                    <td class="p-2 border font-bold">${item.per.toFixed(1)}%</td>
                    <td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(item.per, 'jamia')}">${getJamiaKefiyat(item.per, 'jamia')}</td>
                </tr>`;
            });
            const grandPer = grandTotalHazir ? (grandTotalPass / grandTotalHazir) * 100 : 0;
            tfoot.innerHTML = `<tr class="bg-gray-800 text-white font-bold text-center">
                <td colspan="4" class="p-3 border text-right urdu-font text-lg pr-5">کل میزان (Total):</td>
                <td class="p-3 border text-indigo-300 text-lg">${grandTotalStudents}</td>
                <td class="p-3 border text-blue-300 text-lg">${grandTotalHazir}</td>
                <td class="p-3 border text-gray-400 text-lg">${grandTotalGhaib}</td>
                <td class="p-3 border text-green-400 text-lg">${grandTotalPass}</td>
                <td class="p-3 border text-red-400 text-lg">${grandTotalNakam}</td>
                <td class="p-3 border text-lg">${grandPer.toFixed(1)}%</td>
                <td class="p-3 border urdu-font text-lg" style="color:${getKefiyatColor(grandPer, 'jamia')}">${getJamiaKefiyat(grandPer, 'jamia')}</td>
            </tr>`;
        } 
        else if (layout === 'class') {
            thead.innerHTML = `<th class="p-2 border">Sr.</th><th class="p-2 border">Region</th><th class="p-2 border">تعلیمی ذمہ دار</th><th class="p-2 border">جامعہ</th><th class="p-2 border">درجہ</th><th class="p-2 border">کل طلباء</th><th class="p-2 border bg-blue-50 text-blue-800">حاضر</th><th class="p-2 border bg-gray-100 text-gray-700">غیر حاضر</th><th class="p-2 border bg-green-50 text-green-700">کامیاب</th><th class="p-2 border bg-red-50 text-red-700">ناکام</th><th class="p-2 border">%</th><th class="p-2 border">کیفیت</th>`;
            data.forEach((d, i) => {
                const t = num(d.total);
                const g = num(d.ghaib);
                const n = num(d.nakam);
                const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
                const p = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                const per = h ? (p / h) * 100 : 0;
                
                tbody.innerHTML += `<tr>
                    <td class="p-2 border">${i + 1}</td>
                    <td class="p-2 border font-bold">${d.region || '-'}</td>
                    <td class="p-2 border urdu-font">${d.userName || '-'}</td>
                    <td class="p-2 border urdu-font">${d.jamia}</td>
                    <td class="p-2 border urdu-font font-bold">${d.darjah || d.class}</td>
                    <td class="p-2 border text-indigo-700 font-bold">${t}</td>
                    <td class="p-2 border font-bold text-blue-700 bg-blue-50/50">${h}</td>
                    <td class="p-2 border font-bold text-gray-500 bg-gray-50/50">${g}</td>
                    <td class="p-2 border font-bold text-green-700 bg-green-50/50">${p}</td>
                    <td class="p-2 border font-bold text-red-600 bg-red-50/50">${n}</td>
                    <td class="p-2 border font-bold">${per.toFixed(1)}%</td>
                    <td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(per, 'class')}">${getJamiaKefiyat(per, 'class')}</td>
                </tr>`;
            });
        }
       else if (layout === 'wazahat') {
            let totalPending = 0; 
            let totalSubmitted = 0; 
            let totalCommentAdded = 0;
            let totalCommentPending = 0;
            let wazahatItems = [];
            let userStats = {}; // User-wise summary ke liye

            data.forEach((d) => {
                const userName = d.userName || "Unknown";
                (d.data || []).forEach((tEntry) => {
                    const teacherName = (tEntry.teacher || "-").trim();
                    (tEntry.periods || []).forEach((p) => {
                        let percVal = parseFloat(String(p.percentage || 0).replace('%', ''));

                        if (percVal < 70) {
                            const rawSubject = (p.subject || '-').trim();
                            const darjah = (p.class || p.darjah || '-').trim();
                            
                            // Unique keys
                            const teacherSubjectClassKey = (teacherName + "_" + rawSubject + "_" + darjah).replace(/[\.\s]/g, '_');
                            const subjectClassKey = (rawSubject + "_" + darjah).replace(/[\.\s]/g, '_');
                            const subjectKey = subjectClassKey;

                            let finalWazahatText = "";
                            let keyToDelete = teacherSubjectClassKey;
                            let isLegacy = false;
                            let wazahatDate = "";

                            const normSubj = cleanUrduText(rawSubject);
                            const normTeacher = cleanUrduText(teacherName);
                            const normDarjah = cleanUrduText(darjah);

                            // --- BULLETPROOF SMART SEARCH (Exact match with result-analysis.js) ---
                            if (d.wazahat_map && typeof d.wazahat_map === 'object') {
                                // 1. Sab se pehle: Specific Teacher + Subject + Class key
                                if (d.wazahat_map[teacherSubjectClassKey]) {
                                    finalWazahatText = d.wazahat_map[teacherSubjectClassKey];
                                    keyToDelete = teacherSubjectClassKey;
                                }
                                // 2. Doosra: Specific Subject + Class key
                                else if (d.wazahat_map[subjectClassKey]) {
                                    finalWazahatText = d.wazahat_map[subjectClassKey];
                                    keyToDelete = subjectClassKey;
                                }
                                // 3. Teesra: Fuzzy match jisme teacher aur class dono match karein
                                else {
                                    for (let key in d.wazahat_map) {
                                        const val = d.wazahat_map[key];
                                        if (!val) continue;
                                        const normKey = cleanUrduText(key);

                                        const subjMatch = (normKey === normSubj) || 
                                                          (normSubj.length >= 3 && normKey.includes(normSubj)) || 
                                                          (normKey.length >= 3 && normSubj.includes(normKey));

                                        if (subjMatch) {
                                            const matchesTeacher = normTeacher && normKey.includes(normTeacher);
                                            const matchesDarjah = normDarjah && normKey.includes(normDarjah);

                                            if (matchesTeacher && matchesDarjah) {
                                                finalWazahatText = val;
                                                keyToDelete = key;
                                                break;
                                            } else if (matchesDarjah) {
                                                finalWazahatText = val;
                                                keyToDelete = key;
                                                break;
                                            } else if (matchesTeacher) {
                                                finalWazahatText = val;
                                                keyToDelete = key;
                                                break;
                                            }
                                        }
                                    }

                                    // 4. Sirf agar is Jamia me is subject ka akela weak case ho to hi generic subject fallback allow karein
                                    if (!finalWazahatText) {
                                        let sameSubjCount = 0;
                                        (d.data || []).forEach(otherT => {
                                            (otherT.periods || []).forEach(otherP => {
                                                let oPerc = parseFloat(String(otherP.percentage || 0).replace('%', ''));
                                                if (oPerc < 70 && (otherP.subject || '').trim() === rawSubject) {
                                                    sameSubjCount++;
                                                }
                                            });
                                        });

                                        if (sameSubjCount <= 1) {
                                            if (d.wazahat_map[rawSubject]) {
                                                finalWazahatText = d.wazahat_map[rawSubject];
                                                keyToDelete = rawSubject;
                                            } else if (d.wazahat_map[rawSubject.replace(/\./g, '_')]) {
                                                finalWazahatText = d.wazahat_map[rawSubject.replace(/\./g, '_')];
                                                keyToDelete = rawSubject.replace(/\./g, '_');
                                            }
                                        }
                                    }
                                }
                            }

                            if (d.wazahat_date_map) {
                                wazahatDate = d.wazahat_date_map[keyToDelete] || d.wazahat_date_map[teacherSubjectClassKey] || d.wazahat_date_map[subjectClassKey] || "";
                            }

                            if (!finalWazahatText && d.wazahat) {
                                let totalWeakCount = 0;
                                (d.data || []).forEach(otherT => {
                                    (otherT.periods || []).forEach(otherP => {
                                        let oPerc = parseFloat(String(otherP.percentage || 0).replace('%', ''));
                                        if (oPerc < 70) totalWeakCount++;
                                    });
                                });
                                if (totalWeakCount === 1) {
                                    finalWazahatText = d.wazahat;
                                    isLegacy = true;
                                }
                            }

                            const hasWazahat = Boolean(finalWazahatText && finalWazahatText.trim().length > 2);
                            const docToDeleteFrom = (d.keyDocMap && d.keyDocMap[keyToDelete]) ? d.keyDocMap[keyToDelete] : (d.docId || d.id);

                            let zimmedarComment = "";
                            if (d.zimmedar_comments) {
                                zimmedarComment = d.zimmedar_comments[subjectKey] || d.zimmedar_comments[rawSubject] || d.zimmedar_comments[keyToDelete] || "";
                            }
                            const hasComment = Boolean(zimmedarComment && zimmedarComment.trim().length > 1);

                            if (!userStats[userName]) {
                                userStats[userName] = { 
                                    name: userName, 
                                    total: 0, 
                                    submitted: 0, 
                                    pending: 0,
                                    commentAdded: 0,
                                    commentPending: 0
                                };
                            }
                            userStats[userName].total++;

                            if (hasWazahat) {
                                totalSubmitted++;
                                userStats[userName].submitted++;
                            } else {
                                totalPending++;
                                userStats[userName].pending++;
                            }

                            if (hasComment) {
                                totalCommentAdded++;
                                userStats[userName].commentAdded++;
                            } else {
                                totalCommentPending++;
                                userStats[userName].commentPending++;
                            }

                            wazahatItems.push({
                                jamia: d.jamia,
                                originalJamia: d.originalJamia || d.jamia,
                                region: d.region || "-",
                                state: d.state || "-",
                                userName: userName,
                                teacher: teacherName,
                                subject: rawSubject,
                                darjah: darjah,
                                total: num(p.total),
                                passed: num(p.passed),
                                failed: Math.max(0, num(p.total) - num(p.passed)),
                                percVal: percVal,
                                kaifiyat: getJamiaKefiyat(percVal, 'teacher'),
                                kaifiyatColor: getKefiyatColor(percVal, 'teacher'),
                                hasWazahat: hasWazahat,
                                wazahatText: finalWazahatText,
                                wazahatDate: wazahatDate,
                                keyToDelete: keyToDelete,
                                subjectKey: subjectKey,
                                isLegacy: isLegacy,
                                docId: docToDeleteFrom,
                                zimmedarComment: zimmedarComment,
                                hasComment: hasComment
                            });
                        }
                    });
                });
            });

            const totalCases = totalPending + totalSubmitted;
            const completionRate = totalCases > 0 ? (totalSubmitted / totalCases) * 100 : 0;
            const commentCompletionRate = totalCases > 0 ? (totalCommentAdded / totalCases) * 100 : 0;

            // 1. User Summary Ranking Array
            let userStatsArray = Object.keys(userStats).map(uName => {
                let st = userStats[uName];
                let percent = st.total > 0 ? (st.submitted / st.total) * 100 : 0;
                let commentPercent = st.total > 0 ? (st.commentAdded / st.total) * 100 : 0;
                return { 
                    name: uName, 
                    total: st.total, 
                    submitted: st.submitted, 
                    pending: st.pending, 
                    percent: percent,
                    commentAdded: st.commentAdded,
                    commentPending: st.commentPending,
                    commentPercent: commentPercent
                };
            });
            userStatsArray.sort((a, b) => b.percent - a.percent);

            // 2. Build User Ranking Cards (All cards displayed together without scrollbar)
            let userCardsHtml = "";
            userStatsArray.forEach((user, index) => {
                let rank = index + 1;
                let rankBadge = rank === 1 ? 'bg-amber-500 text-white' : (rank === 2 ? 'bg-slate-400 text-white' : (rank === 3 ? 'bg-amber-700 text-white' : 'bg-indigo-600 text-white'));
                let medalIcon = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `#${rank}`));

                userCardsHtml += `
                <div class="user-filter-card bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 text-sm relative overflow-hidden transition-all hover:shadow-md hover:border-indigo-300 cursor-pointer" data-username="${user.name}" title="${user.name}">
                    <div class="absolute top-0 right-0 ${rankBadge} text-[11px] font-black px-2.5 py-0.5 rounded-bl-lg shadow-2xs font-sans">
                        ${medalIcon}
                    </div>
                    
                    <div class="font-bold text-indigo-950 urdu-font border-b border-slate-100 pb-1.5 mb-2.5 pr-8 text-base truncate" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${user.name}</div>
                    
                    <!-- Wazahat Stats -->
                    <div class="mb-2">
                        <div class="flex justify-between items-center text-[11px] mb-1">
                            <span class="urdu-font font-bold text-slate-700" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">وضاحت (Teacher):</span>
                            <span class="font-sans font-bold text-emerald-700">${user.submitted}/${user.total} (${user.percent.toFixed(0)}%)</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                            <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full" style="width: ${user.percent}%"></div>
                        </div>
                    </div>

                    <!-- Zimmedar Comment Stats -->
                    <div class="pt-1.5 border-t border-slate-100">
                        <div class="flex justify-between items-center text-[11px] mb-1">
                            <span class="urdu-font font-bold text-indigo-900" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">تبصرہ (Zimmedar):</span>
                            <span class="font-sans font-bold ${user.commentAdded === user.total ? 'text-emerald-700' : (user.commentAdded > 0 ? 'text-indigo-700' : 'text-rose-600')}">${user.commentAdded}/${user.total} (${user.commentPercent.toFixed(0)}%)</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                            <div class="bg-gradient-to-r from-indigo-500 to-blue-500 h-1.5 rounded-full" style="width: ${user.commentPercent}%"></div>
                        </div>
                    </div>

                    <!-- Mini Summary Chips -->
                    <div class="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-center font-sans">
                        <div class="bg-rose-50 text-rose-700 py-1 px-1 rounded font-bold border border-rose-100">
                            Wazahat Baqi: ${user.pending}
                        </div>
                        <div class="bg-amber-50 text-amber-800 py-1 px-1 rounded font-bold border border-amber-100">
                            Comment Baqi: ${user.commentPending}
                        </div>
                    </div>
                </div>`;
            });

            // 3. Modern Summary Bar HTML (With Nastaleeq Urdu Font & Comment Stats)
            const summaryBarHtml = `
            <div class="summary-bar-wazahat mb-6 space-y-4">
                <!-- Top Executive Banner -->
                <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-700 flex flex-col lg:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 class="text-2xl font-bold tracking-wide flex items-center gap-2 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                            <i class="fas fa-clipboard-check text-amber-400 text-2xl"></i>
                            <span>کمزور نتائج اور وضاحت جائزہ</span>
                            <span class="text-xs font-sans font-normal opacity-75">(Wazahat Followup Dashboard)</span>
                        </h3>
                        <p class="text-sm text-slate-300 mt-1 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                            تمام تعلیمی ذمہ داران اور جامعات کے اساتذہ کی موصولہ وضاحتوں اور تبصروں کا تفصیلی جائزہ
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-2.5">
                        <div class="bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-center min-w-[90px] shadow-xs">
                            <span class="block text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">Kul Kamzor</span>
                            <span class="text-xl font-black text-amber-400 font-sans">${totalCases}</span>
                        </div>
                        <div class="bg-emerald-950/70 border border-emerald-700/60 rounded-xl px-3.5 py-2 text-center min-w-[90px] shadow-xs">
                            <span class="block text-[10px] text-emerald-300 font-sans font-bold uppercase tracking-wider">Wazahat Aagayi</span>
                            <span class="text-xl font-black text-emerald-400 font-sans">${totalSubmitted}</span>
                        </div>
                        <div class="bg-rose-950/70 border border-rose-700/60 rounded-xl px-3.5 py-2 text-center min-w-[90px] shadow-xs">
                            <span class="block text-[10px] text-rose-300 font-sans font-bold uppercase tracking-wider">Wazahat Baqi</span>
                            <span class="text-xl font-black text-rose-400 font-sans">${totalPending}</span>
                        </div>
                        <div class="bg-teal-950/70 border border-teal-700/60 rounded-xl px-3.5 py-2 text-center min-w-[90px] shadow-xs">
                            <span class="block text-[10px] text-teal-300 font-sans font-bold uppercase tracking-wider">Comment Aagaye</span>
                            <span class="text-xl font-black text-teal-400 font-sans">${totalCommentAdded}</span>
                        </div>
                        <div class="bg-amber-950/70 border border-amber-700/60 rounded-xl px-3.5 py-2 text-center min-w-[90px] shadow-xs">
                            <span class="block text-[10px] text-amber-300 font-sans font-bold uppercase tracking-wider">Comment Baqi</span>
                            <span class="text-xl font-black text-amber-400 font-sans">${totalCommentPending}</span>
                        </div>
                        <div class="bg-indigo-950/80 border border-indigo-700/60 rounded-xl px-3.5 py-2 text-center min-w-[90px] shadow-xs">
                            <span class="block text-[10px] text-indigo-300 font-sans font-bold uppercase tracking-wider">Wazahat %</span>
                            <span class="text-xl font-black text-indigo-300 font-sans">${completionRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <!-- Instant Filter & Live Search Toolbar -->
                <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                    <div class="relative w-full md:w-96">
                        <i class="fas fa-search absolute left-3 top-3 text-slate-400 text-sm"></i>
                        <input type="text" id="wazahat-live-search" placeholder="تلاش کریں (جامعہ، استاد، مضمون، ذمہ دار)..." class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 urdu-font text-right bg-slate-50/50" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                    </div>
                    <div class="flex items-center gap-2 w-full md:w-auto justify-end">
                        <span class="text-xs font-bold text-slate-600 font-sans whitespace-nowrap"><i class="fas fa-filter text-indigo-500 mr-1"></i> Filter:</span>
                        <select id="wazahat-status-filter" class="p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                            <option value="all">تمام ریکارڈز (${totalCases})</option>
                            <option value="submitted">✅ صرف موصولہ وضاحت (${totalSubmitted})</option>
                            <option value="pending">⏳ صرف منتظر وضاحت (${totalPending})</option>
                            <option value="comment-added">💬 صرف تبصرہ شدہ (${totalCommentAdded})</option>
                            <option value="comment-pending">📝 بغیر تبصرہ / کمنٹ باقی (${totalCommentPending})</option>
                        </select>
                        <button id="wazahat-reset-filter-btn" class="p-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg font-bold transition font-sans border border-indigo-200" title="Reset Filters">
                            <i class="fas fa-redo-alt mr-1"></i> Reset
                        </button>
                    </div>
                </div>

                <!-- User-wise Summary / Ranking Section (Full grid without scrollbar for easy screenshot) -->
                ${userStatsArray.length > 0 ? `
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div class="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                        <h4 class="text-slate-800 font-bold text-base flex items-center gap-2 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                            <i class="fas fa-users-cog text-amber-500 text-lg"></i>
                            <span>تعلیمی ذمہ داران کی کارکردگی اور وضاحت جائزہ</span>
                        </h4>
                        <span class="text-xs font-bold text-slate-500 font-sans bg-slate-200/80 px-2.5 py-1 rounded-full">${userStatsArray.length} Users</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 p-1">
                        ${userCardsHtml}
                    </div>
                </div>` : ''}
            </div>`;

            const tableContainer = document.getElementById("reports-view");
            document.querySelectorAll('.summary-bar-wazahat').forEach(el => el.remove());
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'summary-bar-wazahat';
            summaryDiv.innerHTML = summaryBarHtml;
            tableContainer.parentNode.insertBefore(summaryDiv, tableContainer);

            // Table Head Definition (10 Columns, Without Action Column)
            thead.innerHTML = `
                <tr class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white text-[13px] font-bold urdu-font border-b border-slate-700 select-none" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                    <th class="p-3 border border-slate-700 text-center w-12 font-sans">#</th>
                    <th class="p-3 border border-slate-700 text-center min-w-[100px] font-sans">Region / State</th>
                    <th class="p-3 border border-slate-700 text-center min-w-[120px] urdu-font">تعلیمی ذمہ دار</th>
                    <th class="p-3 border border-slate-700 text-right min-w-[160px] urdu-font">جامعہ</th>
                    <th class="p-3 border border-slate-700 text-center min-w-[120px] urdu-font">استاد</th>
                    <th class="p-3 border border-slate-700 text-center min-w-[140px] urdu-font">مضمون / درجہ</th>
                    <th class="p-3 border border-slate-700 text-center w-20 font-sans">فیصد</th>
                    <th class="p-3 border border-slate-700 text-center w-24 urdu-font">کیفیت</th>
                    <th class="p-3 border border-slate-700 text-right min-w-[260px] bg-slate-900/60 urdu-font">وضاحت (Explanation)</th>
                    <th class="p-3 border border-slate-700 text-right min-w-[200px] bg-indigo-950/40 urdu-font">تعلیمی ذمہ دار کا تبصرہ</th>
                </tr>`;

            // Function to render rows dynamically based on filters
            const renderFilteredRows = () => {
                const searchVal = (document.getElementById('wazahat-live-search')?.value || '').toLowerCase().trim();
                const statusVal = document.getElementById('wazahat-status-filter')?.value || 'all';

                let filtered = wazahatItems.filter(item => {
                    if (statusVal === 'submitted' && !item.hasWazahat) return false;
                    if (statusVal === 'pending' && item.hasWazahat) return false;
                    if (statusVal === 'comment-added' && !item.hasComment) return false;
                    if (statusVal === 'comment-pending' && item.hasComment) return false;
                    if (searchVal) {
                        const hay = `${item.jamia} ${item.originalJamia} ${item.teacher} ${item.subject} ${item.darjah} ${item.userName} ${item.region} ${item.state} ${item.wazahatText} ${item.zimmedarComment}`.toLowerCase();
                        if (!hay.includes(searchVal)) return false;
                    }
                    return true;
                });

                if (filtered.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="10" class="p-16 text-center text-slate-500 font-bold bg-white text-base urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                        <i class="fas fa-search text-3xl mb-2 text-slate-300 block"></i>
                        کوئی ریکارڈ نہیں ملا۔
                    </td></tr>`;
                    tfoot.innerHTML = "";
                    return;
                }

                tbody.innerHTML = filtered.map((item, idx) => {
                    let formattedDate = "";
                    if (item.wazahatDate) {
                        try {
                            const dObj = new Date(item.wazahatDate);
                            formattedDate = `<div class="text-[10px] text-emerald-700 font-sans mt-1 text-left flex items-center gap-1 justify-start" dir="ltr"><i class="far fa-clock"></i> ${dObj.toLocaleDateString('en-GB')} ${dObj.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</div>`;
                        } catch(e) {}
                    }

                    const safeDocId = item.docId;

                    const wazahatCell = item.hasWazahat ? `
                        <div class="flex flex-col gap-1.5 text-right">
                            <div class="bg-emerald-50/90 border border-emerald-300/80 text-emerald-950 p-2.5 rounded-lg shadow-2xs text-xs leading-relaxed urdu-font" style="direction:rtl; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 1.05rem;">
                                <div class="whitespace-pre-wrap">${item.wazahatText}</div>
                                ${formattedDate}
                            </div>
                            <button onclick="adminDeleteWazahat('${safeDocId}', '${item.keyToDelete}', ${item.isLegacy})" class="self-end text-[11px] bg-white hover:bg-rose-600 text-rose-600 hover:text-white px-2.5 py-1 rounded-md border border-rose-200 transition-colors shadow-2xs font-sans font-bold flex items-center gap-1 mt-0.5">
                                <i class="fas fa-trash-alt text-[10px]"></i> Reset
                            </button>
                        </div>` : `
                        <div class="flex flex-col items-center justify-center py-2">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                                <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                منتظر (Pending...)
                            </span>
                        </div>`;

                    // Only show comment text; no button to add comment
                    const zimmedarCell = item.hasComment ? `
                        <div class="bg-indigo-50/90 border border-indigo-200 text-indigo-950 p-2.5 rounded-lg text-xs urdu-font leading-relaxed shadow-2xs text-right whitespace-pre-wrap" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 1.05rem;">
                            ${item.zimmedarComment}
                        </div>` : `
                        <div class="text-center py-2">
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                                تبصرہ باقی ہے
                            </span>
                        </div>`;

                    return `
                        <tr class="hover:bg-indigo-50/40 border-b border-slate-200 text-center transition-colors ${item.hasWazahat ? 'bg-white' : 'bg-rose-50/15'}">
                            <td class="p-3 border border-slate-200 font-bold font-sans text-slate-700 bg-slate-50/60 text-xs">${idx + 1}</td>
                            <td class="p-2.5 border border-slate-200 text-center font-sans text-xs">
                                <div class="font-bold text-slate-800">${item.region}</div>
                                <div class="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mt-0.5 inline-block font-semibold">${item.state}</div>
                            </td>
                            <td class="p-3 border border-slate-200 urdu-font font-bold text-indigo-950 text-base" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.userName}</td>
                            <td class="p-3 border border-slate-200 urdu-font font-bold text-slate-900 text-right text-base leading-snug" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.jamia}</td>
                            <td class="p-3 border border-slate-200 urdu-font font-bold text-blue-900 text-base" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.teacher}</td>
                            <td class="p-2.5 border border-slate-200 text-center">
                                <div class="font-bold urdu-font text-slate-900 text-base" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.subject}</div>
                                <div class="text-[12px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded inline-block mt-0.5 border border-rose-100 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.darjah}</div>
                            </td>
                            <td class="p-3 border border-slate-200 text-center font-black font-sans text-sm text-rose-700 bg-rose-50/30">${item.percVal.toFixed(1)}%</td>
                            <td class="p-3 border border-slate-200 text-center">
                                <span class="px-3 py-1 rounded-full text-xs font-bold urdu-font inline-block shadow-2xs" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; background-color: ${item.kaifiyatColor}18; color: ${item.kaifiyatColor}; border: 1px solid ${item.kaifiyatColor}40;">
                                    ${item.kaifiyat}
                                </span>
                            </td>
                            <td class="p-3 border border-slate-200 min-w-[260px] text-right">${wazahatCell}</td>
                            <td class="p-3 border border-slate-200 min-w-[200px] text-right">${zimmedarCell}</td>
                        </tr>`;
                }).join('');

                const filteredSub = filtered.filter(f => f.hasWazahat).length;
                const filteredPen = filtered.length - filteredSub;
                const filteredRate = filtered.length > 0 ? (filteredSub / filtered.length) * 100 : 0;

                const filteredCom = filtered.filter(f => f.hasComment).length;
                const filteredComPen = filtered.length - filteredCom;
                const filteredComRate = filtered.length > 0 ? (filteredCom / filtered.length) * 100 : 0;

                tfoot.innerHTML = `
                    <tr class="bg-slate-900 text-white font-bold text-center text-sm urdu-font border-t-2 border-slate-700">
                        <td colspan="6" class="p-3 text-right pr-4 font-sans font-bold">TOTAL SUMMARY:</td>
                        <td class="p-3 font-sans text-amber-400 font-black text-base">${filtered.length}</td>
                        <td class="p-3 text-center">-</td>
                        <td class="p-3 text-emerald-300 font-sans font-bold text-right text-xs">
                            <div>Wazahat Aagayi: ${filteredSub} (${filteredRate.toFixed(1)}%)</div>
                            <div class="text-rose-300 font-normal">Pending: ${filteredPen}</div>
                        </td>
                        <td class="p-3 text-indigo-300 font-sans font-bold text-right text-xs">
                            <div>Comments: ${filteredCom} (${filteredComRate.toFixed(1)}%)</div>
                            <div class="text-amber-300 font-normal">Pending: ${filteredComPen}</div>
                        </td>
                    </tr>`;
            };

            renderFilteredRows();

            // Setup Event Handlers for Toolbar & User Filter Cards
            const searchInput = document.getElementById('wazahat-live-search');
            const statusFilter = document.getElementById('wazahat-status-filter');
            const resetBtn = document.getElementById('wazahat-reset-filter-btn');

            if (searchInput) searchInput.oninput = renderFilteredRows;
            if (statusFilter) statusFilter.onchange = renderFilteredRows;
            if (resetBtn) {
                resetBtn.onclick = () => {
                    if (searchInput) searchInput.value = '';
                    if (statusFilter) statusFilter.value = 'all';
                    renderFilteredRows();
                };
            }

            document.querySelectorAll('.user-filter-card').forEach(card => {
                card.onclick = () => {
                    const uName = card.dataset.username;
                    if (searchInput) {
                        searchInput.value = uName;
                        renderFilteredRows();
                        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                };
            });
        }
        else {
            thead.innerHTML = `<th class="p-2 border">Sr.</th><th class="p-2 border">Region</th><th class="p-2 border">تعلیمی ذمہ دار</th><th class="p-2 border">جامعہ</th><th class="p-2 border">استاد</th><th class="p-2 border">درجہ</th><th class="p-2 border">مضمون</th><th class="p-2 border">کل</th><th class="p-2 border">کامیاب</th><th class="p-2 border">%</th><th class="p-2 border">کیفیت</th><th class="p-2 border bg-emerald-900 text-white">مجموعی %</th><th class="p-2 border bg-emerald-900 text-white">مجموعی کیفیت</th>`;
            let srNo = 1;
            data.forEach(d => {
                (d.data || []).forEach(tEntry => {
                    const ps = tEntry.periods || []; const rSpan = ps.length || 1;
                    let tT = 0, tP = 0; ps.forEach(p => { tT += num(p.total); tP += num(p.passed); });
                    const tPer = tT ? (tP / tT) * 100 : 0;
                    ps.forEach((p, idx) => {
                        const sPer = num(p.total) ? (num(p.passed) / num(p.total)) * 100 : 0;
                        tbody.innerHTML += `<tr class="text-center border-b">${idx === 0 ? `<td class="p-2 border font-bold" rowspan="${rSpan}">${srNo++}</td><td class="p-2 border font-bold" rowspan="${rSpan}">${d.region || '-'}</td><td class="p-2 border urdu-font" rowspan="${rSpan}">${d.userName || '-'}</td><td class="p-2 border urdu-font" rowspan="${rSpan}">${d.jamia}</td><td class="p-2 border font-bold text-blue-700" rowspan="${rSpan}">${tEntry.teacher}</td>` : ''}<td class="p-2 border font-bold text-red-600 urdu-font">${p.class || '-'}</td><td class="p-2 border text-right urdu-font">${p.subject || '-'}</td><td class="p-2 border">${num(p.total)}</td><td class="p-2 border">${num(p.passed)}</td><td class="p-2 border font-bold">${sPer.toFixed(1)}%</td><td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(sPer, 'teacher')}">${getJamiaKefiyat(sPer, 'teacher')}</td>${idx === 0 ? `<td class="p-2 border bg-emerald-50 font-bold" rowspan="${rSpan}">${tPer.toFixed(1)}%</td><td class="p-2 border bg-emerald-50 urdu-font font-bold" style="color:${getKefiyatColor(tPer, 'teacher')}" rowspan="${rSpan}">${getJamiaKefiyat(tPer, 'teacher')}</td>` : ''}</tr>`;
                    });
                });
            });
        }
    }

    // ==========================================
    // 🚀 EXCEL DIRECT UPLOAD LOGIC
    // ==========================================
    let pendingUploadData = null; 

    if (!window.adminResultAnalysisInitialized) {
        window.adminResultAnalysisInitialized = true;

        // =====================================================
        // 📝 STUDENT DATA EDITOR + SAVE (full data, jaisa ka taisa)
        // =====================================================
        const getOwnerId = (jamiaName) => {
            const ctx = getJamiaContext(jamiaName);
            return (window.allUsersData || []).find(u => (u.name || u.email) === ctx.userName)?.id || "admin";
        };

        const saveAllResultData = async (p) => {
            const { examType, examYear } = p;
            for (const j of p.jamiaat) {
                const context = getJamiaContext(j.name);
                const ownerUserId = getOwnerId(j.name);
                const origOwner = getOwnerId(j.origName);

                // Existing excel_subjects_data preserve/merge karne ke liye load karein
                let existingClasses = {};
                if (p.mode === 'edit') {
                    try {
                        const exSnap = await getDoc(doc(db, "excel_subjects_data", sanitizeId(`${j.origName || j.name}_${examYear}_${examType}`)));
                        if (exSnap.exists()) {
                            existingClasses = exSnap.data().classes || {};
                        }
                    } catch(e) {
                        console.warn("Could not load existing excel_subjects_data:", e);
                    }
                }

                let order = 0;
                for (const c of j.classes) {
                    const oldClassId = sanitizeId(`${origOwner}_${j.origName}_${examYear}_${examType}_${c.origName}`);
                    const newClassId = sanitizeId(`${ownerUserId}_${j.name}_${examYear}_${examType}_${c.name}`);
                    const oldStudId = sanitizeId(`${j.origName}_${examYear}_${examType}_${c.origName}`);
                    const newStudId = sanitizeId(`${j.name}_${examYear}_${examType}_${c.name}`);

                    if (c.deleted) {
                        delete existingClasses[c.name];
                        if (c.origName) delete existingClasses[c.origName];
                        await deleteDoc(doc(db, "class_wise_results", oldClassId));
                        await deleteDoc(doc(db, "student_results", oldStudId));
                        continue;
                    }

                    if (oldClassId !== newClassId) {
                        await deleteDoc(doc(db, "class_wise_results", oldClassId));
                        await deleteDoc(doc(db, "student_results", oldStudId));
                    }

                    // Hamesha class ka subject summary compute karein taake excel_subjects_data se classes gayab na hon
                    const { summary, subj } = computeClassSummary(c);
                    existingClasses[c.name] = subj;

                    // 🌟 SMART SAVE LOGIC 🌟
                    // Agar mode edit hai, aur is class me (ya iske jamia ke naam me) koi tabdeeli nahi hui, to student_results aur class_wise_results ko dobara Firebase par save na karein
                    if (p.mode === 'edit' && !c.isEdited && !j.isEdited) {
                        continue;
                    }

                    await setDoc(doc(db, "class_wise_results", newClassId), {
                        uid: ownerUserId, userId: ownerUserId, userName: context.userName, region: context.region,
                        jamia: j.name, examType, examYear, darjah: c.name, ...summary, timestamp: Date.now()
                    });
                    await setDoc(doc(db, "student_results", newStudId), {
                        jamia: j.name, examType, examYear, darjah: c.name, order: order++,
                        userId: ownerUserId, pdfHeader: p.pdfHeader || {}, course: c.course || '', summaryKey: c.summaryKey || '', columns: c.columns, roles: c.roles, subjects: c.subjects,
                        keys: c.keys, colMap: c.colMap, students: c.students, studentCount: c.students.length,
                        timestamp: Date.now()
                    });
                }
                if (j.origName !== j.name) {
                    await deleteDoc(doc(db, "excel_subjects_data", sanitizeId(`${j.origName}_${examYear}_${examType}`)));
                }
                if (Object.keys(existingClasses).length > 0) {
                    await setDoc(doc(db, "excel_subjects_data", sanitizeId(`${j.name}_${examYear}_${examType}`)), {
                        jamia: j.name, examType, examYear, classes: existingClasses, timestamp: Date.now()
                    });
                }
            }
        };

        // 🌟 NAYA: Real-time Auto Recalculation Logic
const autoRecalculate = (pData) => {
    if (!pData || !pData.jamiaat) return;

    let allStudents = [];

    // Hissa 1: Total, Percentage, Grade, aur Kefiyat calculate karna
    pData.jamiaat.forEach((j, ji) => {
        j.classes.forEach((c, ci) => {
            if (c.deleted) return;

            // Excel wale rank columns ko naam se detect karna
            const getColKey = (regex) => {
                const col = c.columns.find(col => regex.test(col.label));
                return col ? col.key : null;
            };
            
            const rankKeys = {
                rankA: getColKey(/ہند جامعات/),
                rankB: getColKey(/ہند درجات/),
                rankC: getColKey(/اپنے جامعہ/),
                rankD: getColKey(/اپنے درجہ/)
            };

            c.students.forEach((st, r) => {
                let totalObtained = 0;
                let classTotalMax = 0;
                let isGhaib = false;
                let isFail = false;

                // Har mazmoon (subject) ke number check karna (Fail/Ghaib)
                c.keys.forEach(subNum => {
                    let colKey = c.colMap[subNum];
                    let subInfo = c.subjects[subNum];
                    if (!colKey || !subInfo) return;

                    classTotalMax += (subInfo.max || 100);
                    let marksStr = String(st[colKey] || '').trim().toLowerCase();
                    let passMarks = subInfo.pass || 40;

                    if (marksStr === 'غ' || marksStr === 'absent' || marksStr === 'a') {
                        isGhaib = true;
                    } else if (marksStr === 'ناکام' || marksStr === 'f' || marksStr === 'fail') {
                        isFail = true;
                    } else {
                        let numVal = parseFloat(marksStr);
                        if (!isNaN(numVal)) {
                            totalObtained += numVal;
                            if (numVal < passMarks) isFail = true;
                        }
                    }
                });

                // Percentage nikalna
                let percent = classTotalMax > 0 ? (totalObtained / classTotalMax) * 100 : 0;
                let kefiyat = "";
                let grade = "";

                // Grade aur Kefiyat ka Excel jaisa Logic
                if (isGhaib) {
                    kefiyat = "غیر حاضر"; grade = "G";
                } else if (isFail) {
                    kefiyat = "ناکام"; grade = "F";
                } else {
                    if (percent >= 85) { kefiyat = "ممتاز مع الشرف"; grade = "A+"; }
                    else if (percent >= 70) { kefiyat = "ممتاز"; grade = "A"; }
                    else if (percent >= 60) { kefiyat = "جيد جدا"; grade = "B"; }
                    else if (percent >= 50) { kefiyat = "جيد"; grade = "C"; }
                    else { kefiyat = "مقبول"; grade = "D"; }
                }

                // Data update karna
                if (c.roles.total) st[c.roles.total] = totalObtained;
                if (c.roles.percent) st[c.roles.percent] = percent.toFixed(1) + '%';
                if (c.roles.kefiyat) st[c.roles.kefiyat] = kefiyat;
                if (c.roles.grade) st[c.roles.grade] = grade;

                // Rank array ke liye data jama karna
                allStudents.push({
                    stObj: st, jamia: j.name, darjah: c.name, score: totalObtained, isValid: !isGhaib && !isFail,
                    ji, ci, r, rankKeys, roles: c.roles
                });
            });
        });
    });

    // Hissa 2: Dense Rank (Excel ke UNIQUE + FILTER jaisa Logic)
    const getDenseRank = (list, myScore) => {
        let uniqueHigherScores = new Set();
        list.forEach(s => {
            if (s.isValid && s.score > myScore) uniqueHigherScores.add(s.score);
        });
        return uniqueHigherScores.size + 1;
    };

    // Hissa 3: Rank apply karna aur Live UI update karna
    allStudents.forEach(s => {
        let rA = "", rB = "", rC = "", rD = "";
        
        if (s.isValid) {
            // A: All India Rank
            rA = getDenseRank(allStudents, s.score);
            // B: All India Darjah Rank
            rB = getDenseRank(allStudents.filter(x => x.darjah === s.darjah), s.score);
            // C: Apne Jamia me Rank
            rC = getDenseRank(allStudents.filter(x => x.jamia === s.jamia), s.score);
            // D: Apne Jamia aur Apne Darjah me Rank
            rD = getDenseRank(allStudents.filter(x => x.jamia === s.jamia && x.darjah === s.darjah), s.score);
        } else {
             // Agar Ghaib ya Fail hai to rank khali aayegi
             rA = "-"; rB = "-"; rC = "-"; rD = "-";
        }

        if (s.rankKeys.rankA) s.stObj[s.rankKeys.rankA] = rA;
        if (s.rankKeys.rankB) s.stObj[s.rankKeys.rankB] = rB;
        if (s.rankKeys.rankC) s.stObj[s.rankKeys.rankC] = rC;
        if (s.rankKeys.rankD) s.stObj[s.rankKeys.rankD] = rD;

        // JS Inputs ko dynamically update karna bina type kiye huye cursor hataye
        const updateField = (colKey, val) => {
            if (!colKey) return;
            let inp = document.querySelector(`input[data-edit="cell"][data-ji="${s.ji}"][data-ci="${s.ci}"][data-r="${s.r}"][data-k="${colKey}"]`);
            if (inp && inp.value !== String(val)) inp.value = val;
        };

        updateField(s.roles.total, s.stObj[s.roles.total]);
        updateField(s.roles.percent, s.stObj[s.roles.percent]);
        updateField(s.roles.kefiyat, s.stObj[s.roles.kefiyat]);
        updateField(s.roles.grade, s.stObj[s.roles.grade]);
        updateField(s.rankKeys.rankA, rA);
        updateField(s.rankKeys.rankB, rB);
        updateField(s.rankKeys.rankC, rC);
        updateField(s.rankKeys.rankD, rD);
    });
};

        const coerceCell = (v) => {
            const t = String(v).trim();
            return (t !== '' && /^-?\d+(\.\d+)?$/.test(t)) ? Number(t) : v;
        };

        const renderClassTable = (ji, ci) => {
            const holder = document.getElementById(`tbl-${ji}-${ci}`);
            const c = pendingUploadData?.jamiaat[ji]?.classes[ci];
            if (!holder || !c) return;
            const head = c.columns.map(col => `<th class="p-2 border bg-gray-800 text-white text-xs urdu-font whitespace-nowrap ${col.isSubj ? 'bg-teal-700' : ''}">${esc(col.label)}</th>`).join('');
            const rows = c.students.map((st, r) => `<tr>
                <td class="p-1 border text-xs text-gray-400">${r + 1}</td>
                ${c.columns.map(col => `<td class="p-0 border"><input data-edit="cell" data-ji="${ji}" data-ci="${ci}" data-r="${r}" data-k="${col.key}" value="${esc(st[col.key])}" class="urdu-font text-center text-sm p-1 w-full min-w-[64px] ${col.key === c.roles.name || col.key === c.roles.father ? 'min-w-[130px]' : ''} bg-transparent focus:bg-yellow-50 outline-none"></td>`).join('')}
                <td class="p-1 border"><button data-act="del-row" data-ji="${ji}" data-ci="${ci}" data-r="${r}" class="text-red-500 hover:text-red-700 text-xs" title="Student delete">✖</button></td></tr>`).join('');
            holder.innerHTML = `<table class="border-collapse text-center w-max min-w-full"><thead><tr><th class="p-2 border bg-gray-800 text-white text-xs">#</th>${head}<th class="p-2 border bg-gray-800"></th></tr></thead><tbody>${rows}</tbody></table>
                <button data-act="add-row" data-ji="${ji}" data-ci="${ci}" class="mt-2 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">➕ Student add karein</button>`;
            holder.dataset.rendered = '1';
        };

        const renderEditor = () => {
            const p = pendingUploadData; if (!p) return;
            const firstCls = p.jamiaat[0]?.classes[0];
            const roleCols = firstCls ? firstCls.columns.filter(c => !c.isSubj) : [];
            const mapping = firstCls ? `<div class="bg-white border border-indigo-200 rounded-xl p-4 mb-4">
                <p class="font-bold text-indigo-800 text-sm mb-1">🔗 Column Mapping (report card aur table isi se banega)</p>
                <p class="text-xs text-gray-500 mb-3">Agar koi column galat pehchana gaya ho to yahan se theek kar dein.</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    ${Object.keys(ROLE_LABELS).map(role => `<div><label class="block text-[11px] font-bold text-gray-600 mb-1">${ROLE_LABELS[role]}</label>
                        <select data-role="${role}" class="w-full p-1.5 border rounded text-sm urdu-font"><option value="">— nahi hai —</option>
                        ${roleCols.map(c => `<option value="${c.key}" ${firstCls.roles[role] === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>`).join('')}
                </div></div>` : '';
            const body = p.jamiaat.map((j, ji) => `
                <div class="bg-gray-50 p-4 rounded-xl border mb-4">
                    <div class="flex items-center gap-2 mb-3">
                        <label class="text-xs font-bold text-gray-500">Jamia:</label>
                        <input data-edit="jamia" data-ji="${ji}" value="${esc(j.name)}" class="flex-1 p-2 border rounded-lg urdu-font font-bold text-indigo-900 text-lg">
                    </div>
                    ${j.classes.map((c, ci) => c.deleted ? '' : `
                    <details data-ji="${ji}" data-ci="${ci}" class="bg-white border rounded-lg mb-2 shadow-sm">
                        <summary class="p-3 cursor-pointer flex flex-wrap items-center gap-2">
                            <span class="text-xs font-bold text-gray-500">Class:</span>
                            <input data-edit="class" data-ji="${ji}" data-ci="${ci}" value="${esc(c.name)}" class="p-1 border rounded urdu-font font-bold text-indigo-700 w-48">
                            <span class="text-xs text-gray-500">(${c.students.length} students)</span>
                            <input data-edit="course" data-ji="${ji}" data-ci="${ci}" value="${esc(c.course || '')}" placeholder="PDF me upar-left course (jaise: حفظ وناظرہ کورس)" class="p-1 border rounded urdu-font text-sm w-64">
                            <button data-act="del-class" data-ji="${ji}" data-ci="${ci}" class="ml-auto text-xs text-red-600 border border-red-200 rounded px-2 py-1 hover:bg-red-50">🗑 Class hatayein</button>
                        </summary>
                        <div class="p-2 overflow-x-auto" id="tbl-${ji}-${ci}"><p class="text-xs text-gray-400 p-2">Table kholne ke liye click karein…</p></div>
                    </details>`).join('')}
                </div>`).join('');
            const ph = p.pdfHeader || {};
            const pdfBox = `<div class="bg-white border border-teal-200 rounded-xl p-4 mb-4">
                <p class="font-bold text-teal-800 text-sm mb-2">🖨️ PDF ka Header (result ke upar ye likha aayega)</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><label class="block text-[11px] font-bold text-gray-600 mb-1">Title (jaise: نتیجہ ششماہی امتحان 1446ھ/2026ء)</label><input data-pdfh="title" value="${esc(ph.title)}" class="w-full p-1.5 border rounded urdu-font"></div>
                    <div><label class="block text-[11px] font-bold text-gray-600 mb-1">Shoba</label><input data-pdfh="shoba" value="${esc(ph.shoba)}" class="w-full p-1.5 border rounded urdu-font"></div>
                    <div><label class="block text-[11px] font-bold text-gray-600 mb-1">Idara ka naam</label><input data-pdfh="idara" value="${esc(ph.idara)}" class="w-full p-1.5 border rounded urdu-font"></div>
                </div></div>`;
            const hidden = (p.pdfHeader && p.pdfHeader.hidden) || [];
            const colBox = firstCls ? `<div class="bg-white border border-teal-200 rounded-xl p-4 mb-4">
                <p class="font-bold text-teal-800 text-sm mb-1">📑 Class Result PDF me kaun se columns dikhayein</p>
                <p class="text-xs text-gray-500 mb-2">Jin par tick hoga wo PDF table me aayenge (marks wale columns hamesha aayenge). Report card me Urdu aur English dono naam khud aayenge.</p>
                <div class="flex flex-wrap gap-x-4 gap-y-1">${roleCols.map(c => `<label class="text-xs urdu-font flex items-center gap-1"><input type="checkbox" data-pdfcol="${c.key}" ${hidden.includes(c.key) ? '' : 'checked'}> ${esc(c.label)}</label>`).join('')}</div></div>` : '';
            document.getElementById('preview-content').innerHTML = pdfBox + colBox + mapping + body;
        };

        const openEditor = () => {
            const p = pendingUploadData;
            document.getElementById('editor-title').textContent = p.mode === 'edit'
                ? `Saved Data Edit — ${p.examType} ${p.examYear}` : 'Student Data (ضرورت ہو تو ایڈٹ کریں، پھر Upload کریں)';
            const btn = document.getElementById('btn-confirm-upload');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = p.mode === 'edit'
                    ? '<i class="fas fa-save"></i> Save Changes'
                    : '<i class="fas fa-cloud-upload-alt"></i> Confirm & Upload to Database';
            }
            renderEditor();
            document.getElementById('preview-container').classList.remove('hidden');
        };

        // Lazy table render
        document.addEventListener('toggle', (e) => {
            const d = e.target;
            if (d && d.tagName === 'DETAILS' && d.open && d.dataset.ji !== undefined) {
                const holder = document.getElementById(`tbl-${d.dataset.ji}-${d.dataset.ci}`);
                if (holder && !holder.dataset.rendered) renderClassTable(+d.dataset.ji, +d.dataset.ci);
            }
        }, true);

        document.addEventListener('input', (e) => {
            const t = e.target; if (!t || !t.dataset || !pendingUploadData) return;
            if (t.dataset.pdfh) { pendingUploadData.pdfHeader = pendingUploadData.pdfHeader || {}; pendingUploadData.pdfHeader[t.dataset.pdfh] = t.value; return; }
            if (!t.dataset.edit) return;
            const j = pendingUploadData.jamiaat[+t.dataset.ji];
            
            if (t.dataset.edit === 'course') {
                j.classes[+t.dataset.ci].course = t.value;
                j.classes[+t.dataset.ci].isEdited = true;
            }
            else if (t.dataset.edit === 'jamia') {
                j.name = t.value.trim();
                j.isEdited = true; // 🌟 SMART SAVE: Jamia ka naam badla
                j.classes.forEach(c => { const jk = c.roles && c.roles.jamia; if (jk) c.students.forEach(st => { st[jk] = j.name; }); });
                document.querySelectorAll(`input[data-edit="cell"][data-ji="${t.dataset.ji}"]`).forEach(inp => { if (inp.dataset.k === (j.classes[+inp.dataset.ci]?.roles?.jamia)) inp.value = j.name; });
            }
            else if (t.dataset.edit === 'class') {
                j.classes[+t.dataset.ci].name = t.value.trim();
                j.classes[+t.dataset.ci].isEdited = true; // 🌟 SMART SAVE: Class ka naam badla
            }
            else if (t.dataset.edit === 'cell') {
                j.classes[+t.dataset.ci].students[+t.dataset.r][t.dataset.k] = t.value;
                j.classes[+t.dataset.ci].isEdited = true; // 🌟 SMART SAVE: Number badla
                
                // YAHAN FUNCTION CALL KAREIN TAAKE AUTO CALCULATION HO:
                autoRecalculate(pendingUploadData);
            }
        });
   
// 🌟 NAYA: Excel se 1 ya kayi Students ek saath Copy-Paste karne ka Logic
        document.addEventListener('paste', (e) => {
            const t = e.target;
            if (!t || !t.dataset || t.dataset.edit !== 'cell' || !pendingUploadData) return;

            const clipText = (e.clipboardData || window.clipboardData)?.getData('text');
            if (!clipText) return;

            // Agar sirf ek single word/number hai (bina Tab ya Enter ke), toh normal paste hone dein
            if (!clipText.includes('\t') && !clipText.includes('\n')) return;

            e.preventDefault(); // Sara data ek hi box mein jane se rokein

            const ji = +t.dataset.ji;
            const ci = +t.dataset.ci;
            const startR = +t.dataset.r;
            const startKey = t.dataset.k;
            const c = pendingUploadData.jamiaat[ji]?.classes[ci];
            if (!c) return;

            // Excel ki lines ko alag karein (aakhri khali line hata kar)
            const rows = clipText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
            if (rows.length > 0 && rows[rows.length - 1].trim() === '') rows.pop();
            if (rows.length === 0) return;

            const startColPos = c.columns.findIndex(col => col.key === startKey);
            if (startColPos === -1) return;
            const startExcelIdx = parseInt(startKey.replace('c', ''), 10);

            // Excel ke original column index ka map banayein
            const colByExcelIdx = {};
            let maxExcelIdx = 0;
            c.columns.forEach(col => {
                const idx = parseInt(col.key.replace('c', ''), 10);
                if (!isNaN(idx)) {
                    colByExcelIdx[idx] = col.key;
                    if (idx > maxExcelIdx) maxExcelIdx = idx;
                }
            });

            const sampleSt = c.students[0] || {};

            rows.forEach((rowStr, rOffset) => {
                const cells = rowStr.split('\t');
                const targetR = startR + rOffset;

                // Agar niche rows kam hain toh naye students ke liye rows khud banayein
                while (c.students.length <= targetR) {
                    const newSt = {};
                    c.columns.forEach(col => newSt[col.key] = '');
                    ['jamia', 'jamiaUr', 'region', 'maxTotal'].forEach(rKey => {
                        const colKey = c.roles && c.roles[rKey];
                        if (colKey && sampleSt[colKey] !== undefined) newSt[colKey] = sampleSt[colKey];
                    });
                    c.students.push(newSt);
                }

                const st = c.students[targetR];

                // Check karein ki user ne Excel se poori line (Col A se) copy ki hai ya kuch chune huye columns
                const isFullExcelRow = cells.length >= maxExcelIdx;
                const effExcelStart = isFullExcelRow ? 0 : startExcelIdx;
                const effColPosStart = isFullExcelRow ? 0 : startColPos;

                // Check karein ki beech mein khali subject columns (Master Excel wale) hain ya nahi
                let skippedIdxs = [];
                if (!isNaN(effExcelStart)) {
                    for (let i = 0; i < cells.length; i++) {
                        const exIdx = effExcelStart + i;
                        if (exIdx <= maxExcelIdx && !colByExcelIdx[exIdx]) skippedIdxs.push(i);
                    }
                }
                const useMasterExcelMap = isFullExcelRow || 
                    (effColPosStart + cells.length > c.columns.length) ||
                    (skippedIdxs.length > 0 && skippedIdxs.every(i => cells[i].trim() === '' || cells[i].trim() === c.name));

                // Har cell ka data sahi column mein daalein
                cells.forEach((val, cOffset) => {
                    const cleanVal = val.trim();
                    if (useMasterExcelMap && !isNaN(effExcelStart)) {
                        const targetKey = colByExcelIdx[effExcelStart + cOffset];
                        if (targetKey) st[targetKey] = cleanVal;
                    } else {
                        const targetCol = c.columns[effColPosStart + cOffset];
                        if (targetCol) st[targetCol.key] = cleanVal;
                    }
                });
            });

            c.isEdited = true;
            renderClassTable(ji, ci);

            // Summary header mein students ki nayi ginti update karein
            const detailsEl = document.querySelector(`details[data-ji="${ji}"][data-ci="${ci}"] summary span:nth-of-type(2)`);
            if (detailsEl) detailsEl.textContent = `(${c.students.length} students)`;

            // Total, Percentage, Kefiyat, Grade aur Rank turant auto-calculate karein
            if (typeof autoRecalculate === 'function') {
                autoRecalculate(pendingUploadData);
            }
        });
        
        document.addEventListener('change', (e) => {
            const t = e.target; if (!t || !t.dataset || !pendingUploadData) return;
            if (t.dataset.pdfcol) {
                const ph = pendingUploadData.pdfHeader = pendingUploadData.pdfHeader || {}; ph.hidden = (ph.hidden || []).filter(k => k !== t.dataset.pdfcol);
                if (!t.checked) ph.hidden.push(t.dataset.pdfcol);
                return;
            }
            if (!t.dataset.role) return;
            pendingUploadData.jamiaat.forEach(j => j.classes.forEach(c => { c.roles[t.dataset.role] = t.value; if (t.dataset.role === 'kefiyat' && t.value) c.summaryKey = t.value; }));
        });

        document.addEventListener('click', (e) => {
            const inSummary = e.target.closest('summary');
            if (inSummary && e.target.closest('input, button')) e.preventDefault();
            const b = e.target.closest('[data-act]');
            if (!b || !pendingUploadData) return;
            const ji = +b.dataset.ji, ci = +b.dataset.ci;
            const c = pendingUploadData.jamiaat[ji].classes[ci];
            if (b.dataset.act === 'del-row') {
                if (!confirm('Is student ko hatayein?')) return;
                c.students.splice(+b.dataset.r, 1); renderClassTable(ji, ci);
            } else if (b.dataset.act === 'add-row') {
                const st = {};
                const sample = c.students[0] || {};
                c.columns.forEach(col => st[col.key] = '');
                // Jamia, Region aur Max Total pehle student se auto-fill karein
                ['jamia', 'jamiaUr', 'region', 'maxTotal'].forEach(rKey => {
                    const colKey = c.roles && c.roles[rKey];
                    if (colKey && sample[colKey] !== undefined) st[colKey] = sample[colKey];
                });
                c.students.push(st);
                c.isEdited = true;
                renderClassTable(ji, ci);
                // Nayi row ke pehle cell par cursor focus karein taake seedha Ctrl+V kar sakein
                const lastR = c.students.length - 1;
                const firstInp = document.querySelector(`input[data-edit="cell"][data-ji="${ji}"][data-ci="${ci}"][data-r="${lastR}"]`);
                if (firstInp) firstInp.focus();
            } else if (b.dataset.act === 'del-class') {
                if (!confirm(`"${c.name}" poori class hata dein? (Save par database se bhi delete hogi)`)) return;
                c.deleted = true; renderEditor();
            }
        });

        document.addEventListener('click', async (e) => {
            if (!e.target.closest('#btn-load-saved')) return;
            const examType = document.getElementById('upload-exam-type').value;
            const examYear = document.getElementById('upload-exam-year').value;
            try {
                const snap = await getDocs(query(collection(db, 'student_results'), where('examType', '==', examType), where('examYear', '==', examYear)));
                if (snap.empty) { alert('Is Exam & Year ka koi saved student data nahi mila. Pehle Excel upload karein.'); return; }
                const grouped = {};
                snap.docs.map(d => d.data()).sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(d => {
                    if (!grouped[d.jamia]) grouped[d.jamia] = { name: d.jamia, origName: d.jamia, classes: [] };
                    grouped[d.jamia].classes.push({
                        name: d.darjah, origName: d.darjah, subjects: d.subjects || {}, keys: d.keys || [], colMap: d.colMap || {},
                        roles: d.roles || {}, columns: d.columns || [], students: d.students || [], summaryKey: d.summaryKey || '', course: d.course || ''
                    });
                });
                const firstDoc = snap.docs.map(d => d.data())[0] || {};
                pendingUploadData = { mode: 'edit', examType, examYear, jamiaat: Object.values(grouped), pdfHeader: firstDoc.pdfHeader || { title: `نتیجہ ${examType} ${examYear}`, shoba: 'شعبۃ الامتحان والتسجیل', idara: 'جامعات المدینہ للبنین دعوت اسلامی ہند' } };
                document.getElementById('upload-logs')?.classList.add('hidden');
                openEditor();
            } catch (err) { alert('Load error: ' + err.message); }
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'result-excel-file') {
                const file = e.target.files[0];
                if (!file) return;
                
                document.getElementById('upload-logs')?.classList.add('hidden');
                document.getElementById('preview-container')?.classList.add('hidden');

                const reader = new FileReader();
                reader.onload = (evt) => {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});

                    const mapSheetName = workbook.SheetNames.find(n => /^sub/i.test(n.trim())) || workbook.SheetNames[1];
                    const mapData = XLSX.utils.sheet_to_json(workbook.Sheets[mapSheetName], {header: 1});
                    let classSubjectMap = {};
                    let colNumberMap = {};
                    let headerRowIdx = -1;

                    for (let i = 0; i < Math.min(10, mapData.length); i++) {
                        if (mapData[i] && mapData[i].includes('درجہ')) { headerRowIdx = i; break; }
                    }

                    if (headerRowIdx !== -1) {
                        let headers = mapData[headerRowIdx];
                        for(let c=0; c<headers.length; c++) {
                            let val = String(headers[c]).trim();
                            if(!isNaN(parseInt(val)) && parseInt(val) > 0) colNumberMap[parseInt(val)] = c;
                        }

                        let i = headerRowIdx + 1;
                        while (i < mapData.length) {
                            let className = mapData[i] ? mapData[i][headers.indexOf('درجہ')] : null;
                            if (className && className !== "ٹوٹل نمبر" && className !== "پاسنگ نمبر" && className !== "درجہ") {
                                let currentClass = String(className).trim();
                                classSubjectMap[currentClass] = { subjects: {}, keys: [] };
                                
                                let subRow = mapData[i] || [];
                                let passRow = mapData[i+2] || []; 
                                let totRow = mapData[i+1] || [];
                                
                                Object.keys(colNumberMap).forEach(mapNum => {
                                    let colIdx = colNumberMap[mapNum];
                                    let subName = subRow[colIdx];
                                    if (subName && String(subName).trim() !== '') {
                                        classSubjectMap[currentClass].subjects[mapNum] = {
                                            name: String(subName).trim(),
                                            pass: parseFloat(passRow[colIdx]) || 40,
                                            max: parseFloat(totRow[colIdx]) || 0
                                        };
                                        classSubjectMap[currentClass].keys.push(parseInt(mapNum));
                                    }
                                });
                                i += 3;
                            } else { i++; }
                        }
                    }

                    const resSheetName = workbook.SheetNames.find(n => /result/i.test(n)) || workbook.SheetNames[0];
                    const rawResultData = XLSX.utils.sheet_to_json(workbook.Sheets[resSheetName], { header: 1 });
                    const fmtResultData = XLSX.utils.sheet_to_json(workbook.Sheets[resSheetName], { header: 1, raw: false });
                    
                    let resHdrIdx = -1, resColMap = {}, jamiaColIdx = -1, classColIdx = -1, kefiyatColIdx = -1;

                    for (let i = 0; i < Math.min(25, rawResultData.length); i++) {
                        let row = rawResultData[i];
                        if(!row) continue;
                        for (let c = 0; c < row.length; c++) {
                            let cell = String(row[c]).trim();
                            
                            if (/^(10|[1-9])$/.test(cell)) { resColMap[parseInt(cell)] = c; }
                            
                            if (jamiaColIdx === -1 && (cell === 'Jamia_tul_Madina' || cell === 'جامعۃ المدینہ' || cell === 'جامعہ')) jamiaColIdx = c;
                            if (cell === 'Class' || cell.includes('درجہ')) classColIdx = c;
                            if (cell.includes('کیفیت') || cell.includes('نتیجہ') || cell.includes('گریڈ')) kefiyatColIdx = c; 
                        }
                        if (jamiaColIdx !== -1 && classColIdx !== -1 && Object.keys(resColMap).length > 0) {
                            resHdrIdx = i; break;
                        }
                    }
                    
                    // Agar Class (English) aur درجہ (Urdu) dono hon to wo column lein jis ki values Subj sheet se match karein
                    if (resHdrIdx !== -1) {
                        const cands = [];
                        (rawResultData[resHdrIdx] || []).forEach((cell, c) => { const t = String(cell).trim(); if (t === 'Class' || t.includes('درجہ')) cands.push(c); });
                        let best = -1, bestN = -1;
                        cands.forEach(c => { let n = 0; for (let r = resHdrIdx + 1; r < Math.min(rawResultData.length, resHdrIdx + 60); r++) { if (classSubjectMap[String((rawResultData[r] || [])[c] ?? '').trim()]) n++; } if (n > bestN) { bestN = n; best = c; } });
                        if (best !== -1 && bestN > 0) classColIdx = best;
                    }

                    if (kefiyatColIdx === -1 && rawResultData.length > 15) {
                        for(let col = 4; col <= 8; col++) {
                            let testCell = String(rawResultData[15][col] || ''); 
                            if (testCell.includes('ممتاز') || testCell.includes('جید') || testCell.includes('مقبول') || testCell.includes('ناکام')) {
                                kefiyatColIdx = col; break;
                            }
                        }
                    }

                    if (resHdrIdx === -1 || jamiaColIdx === -1 || classColIdx === -1) {
                        alert("Result sheet mein headers (1-10 numbers, Jamia, Class) nahi mile."); return;
                    }

                    const buildCols = () => {
                        const hdr = rawResultData[resHdrIdx] || [];
                        const subjCols = new Set(Object.values(resColMap));
                        let maxLen = 0;
                        rawResultData.forEach(r => { if (r && r.length > maxLen) maxLen = r.length; });
                        const cols = [];
                        for (let c = 0; c < maxLen; c++) {
                            if (c === classColIdx) continue;
                            let label = '';
                            const labelRows = [resHdrIdx, resHdrIdx - 1, resHdrIdx - 2, resHdrIdx + 1, resHdrIdx + 2];
                            for (const ri of labelRows) {
                                if (label) break;
                                const r = rawResultData[ri]; if (!r) continue;
                                if (ri > resHdrIdx && classSubjectMap[String(r[classColIdx] ?? '').trim()]) continue; // data row hai
                                const t = String(r[c] ?? '').trim();
                                if (t && !/^(10|[1-9])$/.test(t)) label = t;
                            }
                            cols.push({ key: 'c' + c, idx: c, label, isSubj: subjCols.has(c) });
                        }
                        return cols.filter(c => !/^\s*class\s*$/i.test(c.label) && !/^\s*درجہ\s*$/.test(c.label));
                    };
                    const globalCols = buildCols();
                    const colRoles = detectRoles(globalCols.filter(c => !c.isSubj));
                    const summaryKey = kefiyatColIdx !== -1 ? 'c' + kefiyatColIdx : (colRoles.kefiyat || '');
                    if (!colRoles.kefiyat && kefiyatColIdx !== -1) colRoles.kefiyat = 'c' + kefiyatColIdx;
                    colRoles.jamia = 'c' + jamiaColIdx;
                    {
                        const sample = rawResultData.slice(resHdrIdx + 1, resHdrIdx + 20).filter(r => r);
                        const jUr = globalCols.find(c => !c.isSubj && c.idx !== jamiaColIdx && !/رینک|rank/i.test(c.label) && sample.some(r => /جامع/.test(String(r[c.idx] ?? ''))));
                        if (jUr) { colRoles.jamiaUr = jUr.key; if (!jUr.label) jUr.label = 'جامعہ (اردو)'; }
                    }
                    if (!colRoles.name) {
                        const cand = globalCols.find(c => !c.isSubj && c.key !== colRoles.roll && c.key !== colRoles.father && c.key !== colRoles.kefiyat
                            && rawResultData.slice(resHdrIdx + 1, resHdrIdx + 6).some(r => r && isNaN(parseFloat(r[c.idx])) && String(r[c.idx] ?? '').trim() !== ''));
                        if (cand) colRoles.name = cand.key;
                    }

                    const jamiaMap = {};
                    for (let i = resHdrIdx + 1; i < rawResultData.length; i++) {
                        const row = rawResultData[i];
                        if (!row || row.length === 0) continue;
                        const jamiaName = String(row[jamiaColIdx] || '').trim();
                        const cName = String(row[classColIdx] || '').trim();
                        if (!jamiaName || !cName || jamiaName === 'undefined') continue;
                        const config = classSubjectMap[cName];
                        if (!config) continue;
                        if (!jamiaMap[jamiaName]) jamiaMap[jamiaName] = { name: jamiaName, origName: jamiaName, classes: {} };
                        const jm = jamiaMap[jamiaName];
                        if (!jm.classes[cName]) {
                            const colMap = {};
                            config.keys.forEach(n => { if (resColMap[n] !== undefined) colMap[n] = 'c' + resColMap[n]; });
                            jm.classes[cName] = { name: cName, origName: cName, subjects: config.subjects, keys: config.keys, colMap, roles: { ...colRoles }, summaryKey, course: '', students: [] };
                        }
                        const st = {};
                        globalCols.forEach(c => {
                            let v = row[c.idx];
                            if (!c.isSubj) { const f = (fmtResultData[i] || [])[c.idx]; if (f !== undefined && f !== null) v = f; }
                            st[c.key] = (v === undefined || v === null) ? '' : v;
                        });
                        jm.classes[cName].students.push(st);
                    }

                    // Har class ke columns: subject columns sirf us class ke mazameen ke, baqi jin me label ya data ho
                    const jamiaat = Object.values(jamiaMap).map(jm => {
                        const classes = Object.values(jm.classes).map(cl => {
                            const subjKeyToNum = {}; Object.keys(cl.colMap).forEach(n => subjKeyToNum[cl.colMap[n]] = n);
                            cl.columns = globalCols.filter(c => {
                                if (c.isSubj) return subjKeyToNum[c.key] !== undefined;
                                return c.label || cl.students.some(s => String(s[c.key] ?? '').trim() !== '');
                            }).map(c => ({ key: c.key, label: c.isSubj ? cl.subjects[subjKeyToNum[c.key]].name : (c.label || ('Col ' + (c.idx + 1))), isSubj: c.isSubj, num: c.isSubj ? Number(subjKeyToNum[c.key]) : null }));
                            return cl;
                        });
                        return { name: jm.name, origName: jm.origName, classes };
                    });

                    if (jamiaat.length === 0) { alert("Koi student record nahi mila. Class ke naam Subj sheet se match hone chahiye."); return; }

                    const examType = document.getElementById('upload-exam-type').value;
                    const examYear = document.getElementById('upload-exam-year').value;
                    pendingUploadData = { mode: 'upload', examType, examYear, jamiaat, pdfHeader: { title: `نتیجہ ${examType} ${examYear}`, shoba: 'شعبۃ الامتحان والتسجیل', idara: 'جامعات المدینہ للبنین دعوت اسلامی ہند', hidden: [colRoles.nameEn, colRoles.fatherEn, colRoles.jamiaUr ? colRoles.jamia : ''].filter(Boolean) } };
                    openEditor();
                }; 
                reader.readAsArrayBuffer(file); 
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('#btn-cancel-preview')) {
                document.getElementById('preview-container').classList.add('hidden');
                const fileInput = document.getElementById('result-excel-file');
                if(fileInput) fileInput.value = ''; 
                pendingUploadData = null;
            }
        });

        document.addEventListener('click', async (e) => {
            if (e.target.closest('#btn-confirm-upload')) {
                const confirmBtn = e.target.closest('#btn-confirm-upload');
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Uploading...';
                confirmBtn.disabled = true;

                try {
                    await saveAllResultData(pendingUploadData);


                    document.getElementById('preview-container').classList.add('hidden');
                    const logs = document.getElementById('upload-logs');
                    if (logs) {
                        logs.classList.remove('hidden');
                        logs.className = "mt-6 p-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-center shadow-sm";
                        logs.innerHTML = `<div class="animate-bounce mb-4"><i class="fas fa-check-circle text-emerald-500 text-6xl"></i></div>
                            <h4 class="text-3xl font-bold text-emerald-800 urdu-font mb-2">الحمدللہ!</h4>
                            <p class="text-emerald-700 font-bold text-lg mb-6">تمام ڈیٹا کامیابی سے محفوظ ہو گیا ہے۔</p>
                            <button id="jump-to-reports" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition mx-auto flex items-center justify-center gap-2">
                                <i class="fas fa-table"></i> Detailed Reports دیکھیں
                            </button>`;
                    }
                } catch (error) {
                    confirmBtn.innerHTML = '<i class="fas fa-times"></i> Error - dobara try karein'; confirmBtn.disabled = false;
                    alert("Error: " + error.message);
                }
            }
            
            if (e.target.closest('#jump-to-reports')) {
                document.getElementById('tab-reports')?.click();
                document.getElementById('admin-show-btn')?.click();
            }

            if (e.target.closest('#btn-delete-result')) {
                const delJamia = document.getElementById('delete-jamia-select')?.value;
                const delYear = document.getElementById('upload-exam-year')?.value;
                const delType = document.getElementById('upload-exam-type')?.value;
                const logs = document.getElementById('upload-logs');

                if (!delYear || !delType) {
                    alert("Exam Type اور Year سیلیکٹ ہونا ضروری ہے۔");
                    return;
                }

                const confirmMsg = delJamia === 'all' 
                    ? `WARNING: کیا آپ واقعی ${delYear} (${delType}) کا **تمام جامعات** کا ڈیٹا ہمیشہ کے لیے ڈیلیٹ کرنا چاہتے ہیں؟`
                    : `WARNING: کیا آپ واقعی ${delJamia} کا ${delYear} (${delType}) کا ڈیٹا ہمیشہ کے لیے ڈیلیٹ کرنا چاہتے ہیں؟`;

                if (!confirm(confirmMsg)) return;

                if (logs) {
                    logs.classList.remove('hidden');
                    logs.className = "mt-6 p-6 rounded-2xl border-2 border-red-200 bg-red-50 text-center shadow-sm";
                    logs.innerHTML = `<i class="fas fa-spinner fa-spin text-red-500 text-3xl mb-3"></i><br><span class="text-red-700 font-bold text-lg">ڈیٹا ڈیلیٹ ہو رہا ہے...</span>`;
                }

                try {
                    const deleteDataFromColl = async (collName) => {
                        let q = delJamia === 'all' 
                            ? query(collection(db, collName), where("examYear", "==", delYear), where("examType", "==", delType))
                            : query(collection(db, collName), where("jamia", "==", delJamia), where("examYear", "==", delYear), where("examType", "==", delType));
                        
                        const snap = await getDocs(q);
                        let count = 0;
                        let batch = writeBatch(db);
                        for (let i = 0; i < snap.docs.length; i++) {
                            batch.delete(snap.docs[i].ref);
                            count++;
                            if (count % 400 === 0) {
                                await batch.commit();
                                batch = writeBatch(db);
                            }
                        }
                        if (count % 400 !== 0 && count > 0) {
                            await batch.commit();
                        }
                        return count;
                    };

                    const asatizaCount = await deleteDataFromColl("asatiza_wise_results");
                    const classCount = await deleteDataFromColl("class_wise_results");
                    await deleteDataFromColl("excel_subjects_data"); 
                    await deleteDataFromColl("student_results");

                    if(logs) {
                        logs.innerHTML = `
                            <div class="mb-4"><i class="fas fa-check-circle text-green-500 text-5xl"></i></div>
                            <h4 class="text-2xl font-bold text-green-800 urdu-font mb-2">ڈیلیٹ مکمل!</h4>
                            <p class="text-green-700 font-bold">منتخب کیا گیا رزلٹ کامیابی سے ڈیلیٹ کر دیا گیا ہے۔</p>
                            <p class="text-sm text-gray-500 mt-2">(${classCount} کلاسز اور ${asatizaCount} اساتذہ کا ریکارڈ حذف ہوا)</p>
                        `;
                    }
                } catch(err) {
                    if(logs) logs.innerHTML = `<span class="text-red-600 font-bold">❌ Error: ${err.message}</span>`;
                }
            }
        });
        // 🌟 GLOBAL ACTION HELPERS FOR ADMIN WAZAHAT & FOLLOWUP
        window.adminSendWazahatLink = (docId, teacherName, subject, percentage, kefiyat, darjah, jamia) => {
            const repoName = "Majlis-Talimi-Umoor-India";
            const baseUrl = `https://tuofficedrive1-wq.github.io/${repoName}/teacher-wazahat.html`;
            const params = `id=${docId}&teacher=${encodeURIComponent(teacherName)}&subject=${encodeURIComponent(subject)}&perc=${encodeURIComponent(percentage)}&kef=${encodeURIComponent(kefiyat)}&class=${encodeURIComponent(darjah)}`;
            const fullLink = `${baseUrl}?${params}`;
            
            const message = `*نوٹس برائے کمزور رزلٹ وضاحت (Official Notification)*\n\n` +
                            `جامعہ: *${jamia}*\n` +
                            `محترم ${teacherName} صاحب،\n` +
                            `آپ کے درجہ *${darjah}* کے مضمون *(${subject})* کا رزلٹ کمزور پایا گیا ہے۔\n\n` +
                            `*تفصیلات:*\n` +
                            `فیصد: *${percentage}*\n` +
                            `کیفیت: *${kefiyat}*\n\n` +
                            `براہِ کرم اس لنک پر کلک کر کے اپنی وضاحت لازمی جمع فرمائیں:\n${fullLink}\n\n` +
                            `شکریہ۔\nمجلس تعلیمی امور دعوت اسلامی ہند`;
            
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        };

        window.adminAddZimmedarComment = async (docId, subjectKey) => {
            const comment = prompt("تعلیمی ذمہ دار کا تبصرہ درج کریں:");
            if (comment === null) return;
            try {
                const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
                const docRef = doc(db, "asatiza_wise_results", docId);
                await updateDoc(docRef, {
                    [`zimmedar_comments.${subjectKey}`]: comment
                });
                alert("تبصرہ کامیابی سے محفوظ ہو گیا!");
                const showBtn = document.getElementById('admin-show-btn');
                if (showBtn) showBtn.click();
            } catch (err) {
                alert("Galti: " + err.message);
            }
        };

        window.adminDeleteWazahat = async (docId, keyToDelete, isLegacy) => {
            if (!confirm('کیا آپ واقعی اس وضاحت کو ڈیلیٹ کر کے فارم کو دوبارہ ری سیٹ (Reset) کرنا چاہتے ہیں؟')) return;
            try {
                const { updateDoc, doc, deleteField } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
                const docRef = doc(db, "asatiza_wise_results", docId);
                const updatePath = {};
                if (isLegacy) {
                    updatePath['wazahat'] = deleteField();
                } else {
                    updatePath[`wazahat_map.${keyToDelete}`] = deleteField();
                    updatePath[`wazahat_date_map.${keyToDelete}`] = deleteField();
                    updatePath[`zimmedar_comments.${keyToDelete}`] = deleteField();
                }
                await updateDoc(docRef, updatePath);
                alert("وضاحت ڈیلیٹ ہو گئی اور فارم ری سیٹ ہو گیا!");
                const showBtn = document.getElementById('admin-show-btn');
                if (showBtn) showBtn.click();
            } catch (err) {
                alert("Galti: " + err.message);
            }
        };

        // 🌟 Event delegation for backwards compatibility
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.wazahat-delete-btn');
            if (!btn) return;
            const docId = btn.dataset.docid;
            const subjKey = btn.dataset.subjkey;
            const isLegacy = btn.dataset.islegacy === "true";
            if (window.adminDeleteWazahat && docId && subjKey) {
                await window.adminDeleteWazahat(docId, subjKey, isLegacy);
            }
        });
    }
}

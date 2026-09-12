// ✅ FINAL FIXED: ADMIN RESULT ANALYSIS

import {
    collection, query, where, getDocs, orderBy, doc, setDoc, writeBatch, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 🔹 HELPERS: Status & Colors
const getJamiaKefiyat = (p, level = 'teacher') => {
    let val = parseFloat(String(p).replace('%', ''));
    if (isNaN(val)) return "-";
    
    // Jamia aur Class Wise ke liye 85% wala logic
    if (level === 'jamia' || level === 'class') {
        if (val >= 85) return "ممتاز مع شرف";
        if (val >= 76) return "ممتاز";
        if (val >= 61) return "بہتر";
        if (val >= 40) return "مناسب";
        return "کمزور";
    } 
    // Asatiza Wise ke liye strict logic
    else {
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
        if (val >= 85) return "#059669"; // Green
        if (val >= 76) return "#2563eb"; // Blue
        if (val >= 61) return "#d97706"; // Orange
        if (val >= 40) return "#7c3aed"; // Purple
        return "#dc2626";                // Red
    } else {
        if (val >= 90) return "#059669";
        if (val >= 70) return "#2563eb";
        if (val >= 60) return "#d97706";
        if (val >= 51) return "#7c3aed";
        return "#dc2626";
    }
};

export async function initAdminResultAnalysis(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allUsers = window.allUsersData || [];
    
    // 🌟 NAYA LOGIC: Master Jamiaat Load Karein
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

    let regionSet = new Set(allUsers.map(u => u.region).filter(r => r));
    Object.values(masterJamiaDict).forEach(m => { if(m.region) regionSet.add(m.region); });
    const regions = [...regionSet].sort();

    // 🌟 SMART CONTEXT FINDER (Master List + Fuzzy Match)
    const getJamiaContext = (jamiaName, jamiaId = null) => {
        if (!jamiaName && !jamiaId) return { userName: 'Not Linked', region: 'N/A', display: '', english: '' };
        
        const target = String(jamiaName || '').trim().toLowerCase();

        let mData = null;
        if (jamiaId && masterJamiaDict[jamiaId]) {
            mData = masterJamiaDict[jamiaId];
        } else if (masterJamiaDict[target]) {
            mData = masterJamiaDict[target];
        } else {
            // Fuzzy match agar spelling thodi aage peeche ho
            let foundKey = Object.keys(masterJamiaDict).find(k => k === target || k.replace(/\s+/g, '') === target.replace(/\s+/g, ''));
            if (foundKey) mData = masterJamiaDict[foundKey];
        }

        // User Check Karein
        const foundUser = allUsers.find(u => {
            const list = u.jamiaatList || [];
            const hasJamia = list.some(j => {
                const jId = typeof j === 'object' ? j.id : null;
                const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                if (jamiaId && jId === jamiaId) return true;
                if (mData && jId === mData.id) return true;
                const jTarget = String(name || '').trim().toLowerCase();
                return jTarget === target || (mData && jTarget === String(mData.name || '').trim().toLowerCase());
            });
            // Inspector ke ilawa baqi sabko Zimmedar maanein (Not Linked fix)
            return hasJamia && (u.role !== 'inspector' && u.role !== 'education_office');
        });

        const finalMasterName = mData ? (mData.name || jamiaName) : jamiaName;
        const finalUrduName = mData ? (mData.urduName || '') : '';
        let finalRegion = mData ? (mData.region || '') : '';
        if (!finalRegion && foundUser) finalRegion = foundUser.region || '';

        return {
            userName: foundUser ? (foundUser.name || foundUser.email) : 'Not Linked',
            region: finalRegion || 'N/A',
            display: finalUrduName || finalMasterName, // Urdu ko priority dega table ke liye
            english: finalMasterName
        };
    };

    container.innerHTML = `
    <div class="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-lg border">
        <!-- 3 Tabs -->
        <div class="flex border-b mb-6 bg-gray-50 rounded-t-lg overflow-hidden">
            <button id="tab-dashboard" class="flex-1 py-3 font-bold text-gray-600 hover:bg-white transition active-sub-tab">📊 Result Dashboard</button>
            <button id="tab-reports" class="flex-1 py-3 font-bold text-gray-600 hover:bg-white transition">📝 Detailed Reports</button>
            <button id="tab-upload" class="flex-1 py-3 font-bold text-teal-600 hover:bg-white transition">📤 Upload Excel Result</button>
        </div>

        <!-- Dashboard/Reports Filters (Purana Code) -->
        <div id="filter-section" class="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
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
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Region</label><select id="admin-region-filter" class="w-full p-2 border rounded-lg text-sm"><option value="all">All Regions</option>${regions.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div>
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">User Filter</label><select id="admin-user-filter" class="w-full p-2 border rounded-lg text-sm"><option value="all">All Users</option>${allUsers.map(u => `<option value="${u.name || u.email}">${u.name || u.email}</option>`).join('')}</select></div>
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Select Jamia</label><select id="admin-jamia-select" class="w-full p-2 border rounded-lg text-sm urdu-font"><option value="all">All Jamiaat</option></select></div>
                <div id="dashboard-filters-div"><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Dashboard Type</label><select id="dashboard-result-type" class="w-full p-2 border rounded-lg text-sm font-bold"><option value="region-wise">🌍 Region Summary</option><option value="user-wise">👨‍💼 User Summary</option><option value="submission-status">📋 Submission Status</option></select></div>
                <div id="reports-layout-filter-div" class="hidden"><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Report Layout</label><select id="admin-layout" class="w-full p-2 border rounded-lg text-sm"><option value="jamia">Jamia Wise</option><option value="class">Class Wise</option><option value="teacher">Asatiza Wise</option><option value="wazahat">Kamzor Result (Wazahat)</option><option value="ibtidaiya">Ibtidaiya (Student Wise)</option></select></div>
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

        <!-- 🚀 NAYA UPLOAD EXCEL VIEW -->
        <div id="upload-view" class="hidden space-y-6">
            <div class="bg-white p-6 rounded-2xl border border-teal-100 shadow-sm">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Jamia Name</label>
                        <select id="upload-jamia-name" class="w-full p-2 border rounded-lg urdu-font bg-gray-50"></select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Upload Excel File</label>
                        <input type="file" id="result-excel-file" accept=".xlsx, .xls" class="w-full p-1.5 border rounded-lg bg-gray-50 cursor-pointer">
                    </div>
                    <div class="flex items-end gap-2">
                        <button id="btn-delete-result" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg w-full transition">🗑 Delete Old Result</button>
                    </div>
                </div>

                <div id="subject-passing-marks-container" class="hidden p-4 bg-teal-50 border border-teal-200 rounded-xl mb-6">
                    <h4 class="font-bold text-teal-800 mb-3 border-b border-teal-200 pb-2"><i class="fas fa-sliders-h mr-2"></i> Sheet 2 se mile gaye Subjects (Passing Marks set karein)</h4>
                    <div id="dynamic-subjects-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>
                    <button id="btn-process-upload" class="mt-6 w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow-lg transition">🚀 Process, Calculate & Save Data</button>
                </div>

                <div id="upload-logs" class="hidden p-4 rounded-lg font-mono text-sm"></div>
            </div>
        </div>
    </div>`;

    // Internal State Management - Elements Fix
  const elements = {
        btnDashboard: document.getElementById("tab-dashboard"),
        btnReports: document.getElementById("tab-reports"),
        btnUpload: document.getElementById("tab-upload"), // Naya
        dashboardView: document.getElementById("dashboard-view"),
        reportsView: document.getElementById("reports-view"),
        uploadView: document.getElementById("upload-view"), // Naya
        filterSection: document.getElementById("filter-section"), // Naya ID diya
        // Baqi wahi hain...
        exportBtn: document.getElementById("admin-export-btn"),
        regionFilter: document.getElementById("admin-region-filter"),
        userFilter: document.getElementById("admin-user-filter"),
        jamiaSelect: document.getElementById("admin-jamia-select")
    };

    // Tab Switching Logic update karein
    const switchTab = (activeBtn, activeView) => {
        [elements.btnDashboard, elements.btnReports, elements.btnUpload].forEach(btn => btn.classList.remove("active-sub-tab", "text-teal-600"));
        activeBtn.classList.add("active-sub-tab", activeBtn === elements.btnUpload ? "text-teal-600" : "text-gray-600");

        [elements.dashboardView, elements.reportsView, elements.uploadView].forEach(v => v.classList.add("hidden"));
        activeView.classList.remove("hidden");

        if (activeView === elements.uploadView) {
            elements.filterSection.classList.add("hidden");
            // Upload ke liye Jamia Dropdown bharein
            const uploadJamiaSelect = document.getElementById("upload-jamia-name");
            uploadJamiaSelect.innerHTML = elements.jamiaSelect.innerHTML; // Copy options
        } else {
            elements.filterSection.classList.remove("hidden");
        }
    };

    elements.btnDashboard.onclick = () => switchTab(elements.btnDashboard, elements.dashboardView);
    elements.btnReports.onclick = () => switchTab(elements.btnReports, elements.reportsView);
    elements.btnUpload.onclick = () => switchTab(elements.btnUpload, elements.uploadView);
// --- NAYA CODE: Admin Exam Year Auto-Populate ---
    const adminExamYearSelect = document.getElementById('admin-exam-year');
    if (adminExamYearSelect) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); 
        const startYear = (currentMonth >= 3) ? currentYear : currentYear - 1;
        const currentAcademicYear = `${startYear}-${(startYear + 1).toString().slice(-2)}`; 

        let availableYears = new Set();
        
        // Sabhi users ke data se saal nikalenge
        if (allUsers && allUsers.length > 0) {
            allUsers.forEach(u => {
                if (u.academicYears) {
                    Object.keys(u.academicYears).forEach(year => {
                        const parts = year.split('-');
                        if (parts.length === 2 && parts[1].length === 4) {
                            availableYears.add(`${parts[0]}-${parts[1].slice(-2)}`);
                        } else {
                            availableYears.add(year);
                        }
                    });
                }
            });
        }
        
        availableYears.add(currentAcademicYear);
        const sortedYears = Array.from(availableYears).sort().reverse();

        adminExamYearSelect.innerHTML = '';
        sortedYears.forEach(yearVal => {
            const option = document.createElement('option');
            option.value = yearVal;
            option.textContent = yearVal;
            if (yearVal === currentAcademicYear) option.selected = true;
            adminExamYearSelect.appendChild(option);
        });
    }
    // --------------------------------------------------------
    const updateJamiaList = () => {
        const selUser = elements.userFilter.value;
        const selReg = elements.regionFilter.value;
        elements.jamiaSelect.innerHTML = '<option value="all">All Jamiaat</option>';

        let filteredUsers = allUsers;
        if (selReg !== "all") filteredUsers = filteredUsers.filter(u => u.region === selReg);
        if (selUser !== "all") filteredUsers = filteredUsers.filter(u => (u.name || u.email) === selUser);

        let jamiaSet = new Set();
            filteredUsers.forEach(u => {
                (u.jamiaatList || []).forEach(j => {
                    const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                    if (name) jamiaSet.add(String(name).trim()); // 🟢 SAFE GUARD
                });
            });

        [...jamiaSet].sort().forEach(j => {
            elements.jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });
    };

    // 🎮 TAB SWITCHING
    elements.btnDashboard.onclick = () => {
        elements.btnDashboard.classList.add("active-sub-tab"); elements.btnReports.classList.remove("active-sub-tab");
        elements.dashboardView.classList.remove("hidden"); elements.reportsView.classList.add("hidden");
        elements.dashboardFilters.classList.remove("hidden");
        elements.reportsLayoutFilter.classList.add("hidden");
        elements.exportBtn.classList.add("hidden");
        elements.statsContainer.classList.remove("hidden");
    };

    elements.btnReports.onclick = () => {
        elements.btnReports.classList.add("active-sub-tab"); elements.btnDashboard.classList.remove("active-sub-tab");
        elements.reportsView.classList.remove("hidden"); elements.dashboardView.classList.add("hidden");
        elements.dashboardFilters.classList.add("hidden");
        elements.reportsLayoutFilter.classList.remove("hidden");
        elements.statsContainer.classList.add("hidden");
       const hasData = document.getElementById("admin-body").innerHTML !== "";
        if (hasData) {
            elements.exportBtn.classList.remove("hidden");
        }
    };

    // 🔄 Region-User-Jamia Sync
    elements.regionFilter.onchange = () => {
        const selReg = elements.regionFilter.value;
        elements.userFilter.innerHTML = '<option value="all">All Users</option>';
            // Sirf standard users ko dropdown mein shamil karein
            const standardOnly = allUsers.filter(u => u.role === 'standard' || !u.role);
            standardOnly.forEach(u => {
                const n = u.name || u.email;
                elements.userFilter.innerHTML += `<option value="${n}">${n}</option>`;
            });
        updateJamiaList();
    };

    elements.userFilter.onchange = updateJamiaList;

    // 📊 Show Analysis Logic
   document.getElementById("admin-show-btn").onclick = async () => {
    const examType = document.getElementById("admin-exam-type").value;
    const examYear = document.getElementById("admin-exam-year").value;
    const selRegion = elements.regionFilter.value;
    const selUser = elements.userFilter.value;
    const selJamia = elements.jamiaSelect.value.toLowerCase();
    const layout = document.getElementById("admin-layout").value;

    const loader = document.getElementById("admin-loader");
    loader.classList.remove("hidden");
    
    try {
        let snapshot;
        
        // 🟢 NAYI LOGIC: Ibtidaiya aur Baqi forms ki alag alag query
        if (layout === 'ibtidaiya') {
            const ibtidaiyaExam = examType === "ششماہی امتحان" ? "Shashmahi" : "Salana";
            const cleanYear = examYear.replace(/[^a-zA-Z0-9]/g, ''); // Jaise "202526"
            
            // Ibtidaiya exams fetch karein
            const q = query(collection(db, "ibtidaiya_exams"), where("examType", "==", ibtidaiyaExam));
            snapshot = await getDocs(q);
        } else {
            const colName = (layout === 'teacher' || layout === 'wazahat') ? "asatiza_wise_results" : "class_wise_results";
            const q = query(collection(db, colName), where("examType", "==", examType), where("examYear", "==", examYear), orderBy("timestamp", "desc"));
            snapshot = await getDocs(q);
        }
        
       // Latest Data Map: Duplicacy khatam karne ke liye
        let latestDataMap = new Map();

        snapshot.forEach(doc => {
            const d = doc.data();
            d.id = doc.id;
            
            let rawJamia = layout === 'ibtidaiya' ? (d.jamiaName || "") : (d.jamia || "");
            const currentJamia = typeof rawJamia === 'object' ? (rawJamia.name || rawJamia.jamiaName || "") : String(rawJamia);
            
            // 🌟 Master List se Sahi Naam, Region aur Zimmedar Nikalein
            const context = getJamiaContext(currentJamia, d.jamiaId);

            // Record update kar dein taake table mein Master List wala naam aaye (Urdu ya Corrected English)
            if (layout === 'ibtidaiya') {
                d.jamiaName = context.display;
            } else {
                d.jamia = context.display;
            }

            // Filtering Logic (English naam se ya display naam se filter)
            const matchRegion = (selRegion === "all" || context.region === selRegion);
            const matchUser = (selUser === "all" || context.userName === selUser);
            const matchJamia = (selJamia === "all" || context.english.toLowerCase().includes(selJamia) || context.display.toLowerCase().includes(selJamia) || currentJamia.toLowerCase().includes(selJamia));

            if (matchRegion && matchUser && matchJamia) {
                if (layout === 'ibtidaiya') {
                    latestDataMap.set(d.id, { ...d, ...context });
                } else {
                    let uniqueKey = (layout === 'teacher' || layout === 'wazahat') 
                        ? `${d.jamia}_${d.teacher}`.toLowerCase() 
                        : `${d.jamia}_${d.darjah || d.class}`.toLowerCase();

                    if (!latestDataMap.has(uniqueKey)) {
                        latestDataMap.set(uniqueKey, { ...d, ...context });
                    }
                }
            }
        });

        const dataList = Array.from(latestDataMap.values());
        const activeTab = elements.btnDashboard.classList.contains("active-sub-tab") ? 'dashboard' : 'reports';

        if (activeTab === 'dashboard') {
            renderDashboard(dataList, document.getElementById("dashboard-result-type").value, allUsers);
            elements.exportBtn.classList.add("hidden"); // Dashboard par hide rakhein
        } else {
            renderDetailedReports(dataList, layout);
            elements.exportBtn.classList.remove("hidden"); // Reports par show kar dein
        }
    } catch (e) { 
        console.error("Fetch Error:", e); 
        alert("Data load nahi ho saka: " + e.message);
    }
    loader.classList.add("hidden");

    // Excel Export
    elements.exportBtn.onclick = () => {
        const table = document.getElementById("final-analysis-table-to-export");
        const wb = XLSX.utils.table_to_book(table);
        XLSX.writeFile(wb, `Result_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    function renderDashboard(data, type, users) {
        elements.dashboardView.innerHTML = "";
        const num = (v) => parseInt(v) || 0;
        if (type === 'region-wise' || type === 'user-wise') {
            let stats = {};
            const keyField = type === 'region-wise' ? 'region' : 'userName';
            data.forEach(d => {
                const key = d[keyField] || 'Unknown';
                if (!stats[key]) stats[key] = { h: 0, p: 0 };
                const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
                const p = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                stats[key].h += h; stats[key].p += p;
            });
            let rows = Object.entries(stats).map(([k, s]) => {
                const per = s.h ? (s.p/s.h)*100 : 0;
                return `<tr><td class="p-2 border font-bold text-right">${k}</td><td class="p-2 border">${s.h}</td><td class="p-2 border text-green-600 font-bold">${s.p}</td><td class="p-2 border font-bold">${per.toFixed(1)}%</td></tr>`;
            }).join('');
            elements.dashboardView.innerHTML = `<div class="bg-white p-5 rounded-xl border shadow-sm max-w-2xl mx-auto overflow-hidden"><table class="w-full text-sm text-center"><thead class="bg-gray-100"><tr><th class="p-2 border">Category</th><th class="p-2 border">Hazir</th><th class="p-2 border">Pass</th><th class="p-2 border">%</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        } else {
            let submissionHtml = users.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(u => {
                const userJamiaat = u.jamiaatList || [];
                if (userJamiaat.length === 0) return "";
                const jamiaRows = userJamiaat.map(j => {
                    const jName = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                    // Check dono logic ke hisab se (Ibtidaiya & Others)
                    const isSub = data.some(d => {
                    const rawDjamia = d.jamia || d.jamiaName || "";
                    // 🟢 SAFE GUARD
                    const dJamia = typeof rawDjamia === 'object' ? (rawDjamia.name || rawDjamia.jamiaName || "") : String(rawDjamia);
                    return dJamia.trim().toLowerCase() === String(jName).trim().toLowerCase();
                });
                    return `<div class="flex justify-between p-2 border-b text-xs"><span class="urdu-font">${jName}</span>${isSub ? '<span class="text-green-600">✅ Received</span>' : '<span class="text-red-500">❌ Missing</span>'}</div>`;
                }).join('');
                return `<div class="bg-white p-4 rounded-lg border shadow-sm"><h5 class="font-bold text-indigo-700 border-b pb-2 mb-2 text-sm">${u.name || u.email}</h5>${jamiaRows}</div>`;
            }).join('');
            elements.dashboardView.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${submissionHtml}</div>`;
        }
    }

    function renderDetailedReports(data, layout) {
        const thead = document.getElementById("admin-head");
        const tbody = document.getElementById("admin-body");
        const tfoot = document.getElementById("admin-foot");
        
        // UI Reset
        tbody.innerHTML = ""; 
        tfoot.innerHTML = "";
        const num = (v) => parseInt(v) || 0;

        if (layout === 'ibtidaiya') {
            // 🟢 NAYA IBTIDAIYA LAYOUT
            thead.innerHTML = `
                <tr class="bg-indigo-900 text-white text-[13px] font-bold urdu-font">
                    <th class="p-2 border border-indigo-700">Sr.</th>
                    <th class="p-2 border border-indigo-700">Region</th>
                    <th class="p-2 border border-indigo-700">تعلیمی ذمہ دار</th>
                    <th class="p-2 border border-indigo-700">جامعہ</th>
                    <th class="p-2 border border-indigo-700">داخلہ</th>
                    <th class="p-2 border border-indigo-700 min-w-[120px]">طالب علم کا نام</th>
                    <th class="p-2 border border-indigo-700 min-w-[120px]">ولدیت</th>
                    <th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">تجوید</th>
                    <th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">ورک بک</th>
                    <th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">اردو</th>
                    <th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">ہم نصابی</th>
                    <th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">املا</th>
                    <th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">Eng(W)</th>
                    <th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">Eng(O)</th>
                    <th class="p-2 border border-indigo-700 bg-indigo-800 text-[11px]">ریاضی</th>
                    <th class="p-2 border border-indigo-700 bg-gray-800">کل</th>
                    <th class="p-2 border border-indigo-700 bg-blue-900">حاصل</th>
                    <th class="p-2 border border-indigo-700 bg-green-900">%</th>
                    <th class="p-2 border border-indigo-700">کیفیت</th>
                </tr>
            `;

            let sr = 1;
            data.forEach(d => {
                const students = d.students || [];
                
                students.forEach(stu => {
                    const getM = (val) => val === 'A' ? '<span class="text-red-500 font-bold">A</span>' : (val || '-');

                    tbody.innerHTML += `
                        <tr class="text-center hover:bg-gray-50 border-b">
                            <td class="p-2 border">${sr++}</td>
                            <td class="p-2 border font-bold text-gray-700">${d.region || '-'}</td>
                            <td class="p-2 border urdu-font text-blue-700">${d.userName || '-'}</td>
                            <td class="p-2 border urdu-font font-bold text-indigo-700">${d.jamiaName || '-'}</td>
                            <td class="p-2 border text-gray-600">${stu.dakhila || '-'}</td>
                            <td class="p-2 border urdu-font font-bold text-right">${stu.name || '-'}</td>
                            <td class="p-2 border urdu-font text-right">${stu.fatherName || '-'}</td>
                            
                            <td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.tajweed)}</td>
                            <td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.workbook)}</td>
                            <td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.urdu)}</td>
                            <td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.ham_nisabi)}</td>
                            <td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.imla)}</td>
                            <td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.eng_written)}</td>
                            <td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.eng_oral)}</td>
                            <td class="p-2 border text-[13px] bg-indigo-50/30">${getM(stu.marks?.riyazi)}</td>
                            
                            <td class="p-2 border font-bold text-gray-500 bg-gray-100">500</td>
                            <td class="p-2 border font-bold text-blue-700 bg-blue-50">${stu.obtained || 0}</td>
                            <td class="p-2 border font-bold text-green-700 bg-green-50">${stu.percent || '0%'}</td>
                            <td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(stu.percent, 'jamia')}">${stu.status || '-'}</td>
                        </tr>
                    `;
                });
            });

            if (sr === 1) {
                tbody.innerHTML = `<tr><td colspan="19" class="p-10 text-center text-red-500 font-bold urdu-font text-lg">کوئی ریکارڈ نہیں ملا</td></tr>`;
            }
        }
        else if (layout === 'jamia') {
        // ✅ JAMIA WISE: Region aur User ke saath
        thead.innerHTML = `
            <th class="p-2 border">Sr.</th>
            <th class="p-2 border">Region</th>
            <th class="p-2 border">تعلیمی ذمہ دار</th>
            <th class="p-2 border">جامعہ</th>
            <th class="p-2 border">حاضر</th>
            <th class="p-2 border">کامیاب</th>
            <th class="p-2 border">%</th>
            <th class="p-2 border">کیفیت</th>`;
        
        let jamiaStats = {};
        
        // 🟢 NAYA LOGIC: Grand Total calculate karne ke liye variables
        let grandTotalHazir = 0;
        let grandTotalPass = 0;

        data.forEach(d => {
            if (!jamiaStats[d.jamia]) {
                jamiaStats[d.jamia] = { h: 0, p: 0, region: d.region || '-', user: d.userName || '-' };
            }
            const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
            const p = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
            
            jamiaStats[d.jamia].h += h; 
            jamiaStats[d.jamia].p += p;

            // Har jamia ka Hazir aur Pass grand total mein jodein
            grandTotalHazir += h;
            grandTotalPass += p;
        });

        // 🟢 Rank ke hisab se sort karna (Zyada percentage wala upar)
        let sortedJamia = Object.entries(jamiaStats).map(([name, s]) => {
            const per = s.h ? (s.p / s.h) * 100 : 0;
            return { name, s, per };
        });

        sortedJamia.sort((a, b) => b.per - a.per);

        sortedJamia.forEach((item, i) => {
            const { name, s, per } = item;
            tbody.innerHTML += `<tr>
                <td class="p-2 border">${i + 1}</td>
                <td class="p-2 border font-bold">${s.region}</td>
                <td class="p-2 border urdu-font">${s.user}</td>
                <td class="p-2 border urdu-font font-bold">${name}</td>
                <td class="p-2 border">${s.h}</td>
                <td class="p-2 border text-green-700 font-bold">${s.p}</td>
                <td class="p-2 border font-bold">${per.toFixed(1)}%</td>
                <td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(per, 'jamia')}">${getJamiaKefiyat(per, 'jamia')}</td>
            </tr>`;
        });

        // 🟢 NAYA LOGIC: Table ke niche (tfoot mein) Total dikhana
        const grandPer = grandTotalHazir ? (grandTotalPass / grandTotalHazir) * 100 : 0;
        tfoot.innerHTML = `
            <tr class="bg-gray-800 text-white font-bold text-center">
                <td colspan="4" class="p-3 border text-right urdu-font text-lg pr-5">کل میزان (Total):</td>
                <td class="p-3 border text-lg">${grandTotalHazir}</td>
                <td class="p-3 border text-green-400 text-lg">${grandTotalPass}</td>
                <td class="p-3 border text-lg">${grandPer.toFixed(1)}%</td>
                <td class="p-3 border urdu-font text-lg" style="color:${getKefiyatColor(grandPer, 'jamia')}">${getJamiaKefiyat(grandPer, 'jamia')}</td>
            </tr>
        `;
    } 
    else if (layout === 'class') {
        // ✅ CLASS WISE: Region aur User ke saath
        thead.innerHTML = `
            <th class="p-2 border">Sr.</th>
            <th class="p-2 border">Region</th>
            <th class="p-2 border">تعلیمی ذمہ دار</th>
            <th class="p-2 border">جامعہ</th>
            <th class="p-2 border">درجہ</th>
            <th class="p-2 border">حاضر</th>
            <th class="p-2 border">کامیاب</th>
            <th class="p-2 border">%</th>
            <th class="p-2 border">کیفیت</th>`;
        
        data.forEach((d, i) => {
            const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
            const p = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
            const per = h ? (p / h) * 100 : 0;
            
            tbody.innerHTML += `<tr>
                <td class="p-2 border">${i + 1}</td>
                <td class="p-2 border font-bold">${d.region || '-'}</td>
                <td class="p-2 border urdu-font">${d.userName || '-'}</td>
                <td class="p-2 border urdu-font">${d.jamia}</td>
                <td class="p-2 border urdu-font font-bold">${d.darjah || d.class}</td>
                <td class="p-2 border">${h}</td>
                <td class="p-2 border">${p}</td>
                <td class="p-2 border font-bold">${per.toFixed(1)}%</td>
                <td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(per, 'class')}">${getJamiaKefiyat(per, 'class')}</td>
            </tr>`;
        });
    }
else if (layout === 'wazahat') {
    let totalPending = 0;
    let totalSubmitted = 0;
    let wazahatRows = "";
    let latestMap = new Map();

    data.forEach((d) => {
        const records = d.data || [];
        records.forEach((tEntry) => {
            (tEntry.periods || []).forEach((p) => {
                const sPer = num(p.total) ? (num(p.passed) / num(p.total)) * 100 : 0;
                if (sPer < 70) {
                    const subjectKey = (p.subject || "").replace(/\./g, '_');
                    const uniqueId = `${d.jamia}_${tEntry.teacher}_${subjectKey}`.toLowerCase();
                    if (!latestMap.has(uniqueId)) {
                        const hasWazahat = (d.wazahat_map && d.wazahat_map[subjectKey]);
                        if (hasWazahat) totalSubmitted++; else totalPending++;

                        const tComment = hasWazahat 
                            ? `<div class="text-sm urdu-font text-gray-900">${d.wazahat_map[subjectKey]}</div>` 
                            : '<span class="text-red-500 font-bold italic">Pending...</span>';
                        
                        const zComment = (d.zimmedar_comments && d.zimmedar_comments[subjectKey]) 
                            ? `<div class="text-sm urdu-font text-indigo-900">${d.zimmedar_comments[subjectKey]}</div>` 
                            : '<span class="text-gray-400 italic text-xs">Nahi likha</span>';

                        wazahatRows += `
                        <tr class="border-b hover:bg-gray-50 text-center">
                            <td class="p-2 border urdu-font font-bold text-gray-800">${d.jamia}</td>
                            <td class="p-2 border urdu-font font-bold text-blue-800">${tEntry.teacher || "-"}</td>
                            <td class="p-2 border">
                                <div class="font-bold urdu-font text-[13px]">${p.subject || '-'}</div>
                                <div class="text-[10px] font-bold text-red-600">${p.class || '-'}</div>
                            </td>
                            <td class="p-2 border font-bold text-red-600">${sPer.toFixed(1)}%</td>
                            <td class="p-2 border urdu-font font-bold text-xs" style="color:${getKefiyatColor(sPer, 'teacher')}">${getJamiaKefiyat(sPer, 'teacher')}</td>
                            <td class="p-3 border bg-red-50/30 min-w-[200px] text-right">${tComment}</td>
                            <td class="p-3 border bg-blue-50/30 min-w-[200px] text-right">${zComment}</td>
                        </tr>`;
                        latestMap.set(uniqueId, true);
                    }
                }
            });
        });
    });

    // ✅ STEP 1: Pehle table ke bahar Top Summary Bar banayein (Rounded Corners ke liye)
    const summaryHeader = `
        <div class="bg-[#1e293b] text-white p-3 rounded-t-2xl text-center font-bold text-sm border-b border-slate-700">
            Kul Kamzor Results: <span class="text-yellow-400 mx-1">${totalPending + totalSubmitted}</span> | 
            Wazahat Aa Gayi: <span class="text-green-400 mx-1">${totalSubmitted}</span> | 
            Baqi (Pending): <span class="text-red-400 mx-1">${totalPending}</span>
        </div>
    `;

    // ✅ STEP 2: Table ke headers ko set karein
    thead.innerHTML = `
        <tr class="bg-slate-900 text-white text-[13px] font-bold urdu-font">
            <th class="p-3 border border-slate-700">جامعہ</th>
            <th class="p-3 border border-slate-700">استاد</th>
            <th class="p-3 border border-slate-700">مضمون/درجہ</th>
            <th class="p-3 border border-slate-700 w-16">فیصد</th>
            <th class="p-3 border border-slate-700 w-24">کیفیت</th>
            <th class="p-3 border border-slate-700 bg-red-900/40">وضاحت (Teacher)</th>
            <th class="p-3 border border-slate-700 bg-blue-900/40">تبصرہ (Zimmedar)</th>
        </tr>
    `;

    // ✅ STEP 3: Table container mein summary bar ko insert karein
    const tableContainer = document.getElementById("reports-view");
    // Purani summary hatane ke liye check karein
    const existingSummary = tableContainer.querySelector('.summary-bar-wazahat');
    if (existingSummary) existingSummary.remove();

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'summary-bar-wazahat';
    summaryDiv.innerHTML = summaryHeader;
    tableContainer.prepend(summaryDiv); // Table ke bilkul upar rounded bar lagayega

    tbody.innerHTML = wazahatRows || `<tr><td colspan="7" class="p-20 text-center text-red-500 font-bold bg-white text-xl">Mashallah! Koi kamzor result nahi mila.</td></tr>`;
}
    else {
        thead.innerHTML = `
            <th class="p-2 border">Sr.</th>
            <th class="p-2 border">Region</th>
            <th class="p-2 border">تعلیمی ذمہ دار</th>
            <th class="p-2 border">جامعہ</th>
            <th class="p-2 border">استاد</th>
            <th class="p-2 border">درجہ</th>
            <th class="p-2 border">مضمون</th>
            <th class="p-2 border">کل</th>
            <th class="p-2 border">کامیاب</th>
            <th class="p-2 border">%</th>
            <th class="p-2 border">کیفیت</th>
            <th class="p-2 border bg-emerald-900 text-white">مجموعی %</th>
            <th class="p-2 border bg-emerald-900 text-white">مجموعی کیفیت</th>`;

        let srNo = 1;
        data.forEach(d => {
            const region = d.region || '-';
            const userName = d.userName || '-';

            (d.data || []).forEach(tEntry => {
                const ps = tEntry.periods || []; 
                const rSpan = ps.length || 1;
                let tT = 0, tP = 0; 
                ps.forEach(p => { tT += num(p.total); tP += num(p.passed); });
                const tPer = tT ? (tP / tT) * 100 : 0;

                ps.forEach((p, idx) => {
                    const sPer = num(p.total) ? (num(p.passed) / num(p.total)) * 100 : 0;
                    tbody.innerHTML += `
                    <tr class="text-center border-b">
                        ${idx === 0 ? `
                            <td class="p-2 border font-bold" rowspan="${rSpan}">${srNo++}</td>
                            <td class="p-2 border font-bold" rowspan="${rSpan}">${region}</td>
                            <td class="p-2 border urdu-font" rowspan="${rSpan}">${userName}</td>
                            <td class="p-2 border urdu-font" rowspan="${rSpan}">${d.jamia}</td>
                            <td class="p-2 border font-bold text-blue-700" rowspan="${rSpan}">${tEntry.teacher}</td>
                        ` : ''}
                        <td class="p-2 border font-bold text-red-600 urdu-font">${p.class || '-'}</td>
                        <td class="p-2 border text-right urdu-font">${p.subject || '-'}</td>
                        <td class="p-2 border">${num(p.total)}</td>
                        <td class="p-2 border">${num(p.passed)}</td>
                        <td class="p-2 border font-bold">${sPer.toFixed(1)}%</td>
                        <td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(sPer, 'teacher')}">${getJamiaKefiyat(sPer, 'teacher')}</td>
                        ${idx === 0 ? `
                            <td class="p-2 border bg-emerald-50 font-bold" rowspan="${rSpan}">${tPer.toFixed(1)}%</td>
                            <td class="p-2 border bg-emerald-50 urdu-font font-bold" style="color:${getKefiyatColor(tPer, 'teacher')}" rowspan="${rSpan}">${getJamiaKefiyat(tPer, 'teacher')}</td>
                        ` : ''}
                    </tr>`;
                });
            });
        });
    }

    // ✅ Excel Button permanently fixed here
    const exportBtn = document.getElementById("admin-export-btn");
    if (exportBtn) exportBtn.classList.remove("hidden");
}
        }
    // ==========================================
// 🚀 EXCEL UPLOAD & AUTO-CALCULATION LOGIC
// ==========================================
let uploadedWorkbook = null;
let classSubjectMap = {}; // Sheet 2 mapping
let uniqueSubjects = new Set(); // For passing marks UI

// 1. File Select Hote hi Sheet 2 Padhna (Delegation se Error Fix)
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'result-excel-file') {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            uploadedWorkbook = XLSX.read(data, {type: 'array'});

            // Sheet 2 Padhna (Index 1)
            const mapSheet = uploadedWorkbook.Sheets[uploadedWorkbook.SheetNames[1]];
            const mapData = XLSX.utils.sheet_to_json(mapSheet, {header: 1});

            classSubjectMap = {};
            uniqueSubjects.clear();

            mapData.forEach((row, idx) => {
                if(idx === 0) return; // Heading skip
                const className = row[9]; // Column J (10th column)
                if (className) {
                    classSubjectMap[className.trim()] = [];
                    for(let i = 0; i <= 8; i++) {
                        if(row[i] && typeof row[i] === 'string' && row[i].trim() !== '') {
                            classSubjectMap[className.trim()].push(row[i].trim());
                            uniqueSubjects.add(row[i].trim());
                        }
                    }
                }
            });

            // UI Generate karein
            let html = '';
            uniqueSubjects.forEach(sub => {
                html += `
                    <div class="bg-white p-2 border rounded flex justify-between items-center shadow-sm">
                        <span class="urdu-font font-bold text-gray-700">${sub}</span>
                        <input type="number" id="pass_mark_${sub}" value="33" class="w-16 p-1 border rounded text-center font-bold text-red-600">
                    </div>`;
            });

            const grid = document.getElementById('dynamic-subjects-grid');
            const container = document.getElementById('subject-passing-marks-container');
            if (grid && container) {
                grid.innerHTML = html;
                container.classList.remove('hidden');
            }
        };
        reader.readAsArrayBuffer(file);
    }
});

// Ustad ka naam dhondne wala helper
const getTeacherName = (jamiaName, className, subject) => {
    const usersList = window.allUsersData || [];
    for (let u of usersList) {
        if (!u.academicYears) continue;
        let years = Object.keys(u.academicYears).sort().reverse();
        if (years.length === 0) continue;
        let struct = u.academicYears[years[0]].karkardagiStructure || [];
        let jData = struct.find(j => j.jamiaName === jamiaName);
        
        if (jData && jData.teachers) {
            for (let t of jData.teachers) {
                if (t.periods) {
                    for (let p of t.periods) {
                        if (p.className === className && p.bookName === subject) return t.name;
                    }
                }
            }
        }
    }
    return "Na-Maloom";
};

// 2. Process & Delete Button Logic (Delegation se Event Attach)
document.addEventListener('click', async (e) => {
    
    // --- A. Process Upload Button ---
    if (e.target.closest('#btn-process-upload')) {
        const jamiaName = document.getElementById('upload-jamia-name')?.value;
        const examType = document.getElementById('admin-exam-type')?.value;
        const examYear = document.getElementById('admin-exam-year')?.value;
        const logs = document.getElementById('upload-logs');

        if (!uploadedWorkbook || jamiaName === 'all') {
            alert("Jamia aur Excel file select karna zaroori hai!");
            return;
        }

        if (logs) {
            logs.classList.remove('hidden');
            logs.innerHTML = `<span class="text-blue-600">⏳ Processing started for ${jamiaName}...</span><br>`;
        }

        const passingMarks = {};
        uniqueSubjects.forEach(sub => {
            const markInput = document.getElementById(`pass_mark_${sub}`);
            passingMarks[sub] = parseFloat(markInput?.value) || 33;
        });

        const resultSheet = uploadedWorkbook.Sheets[uploadedWorkbook.SheetNames[0]];
        const resultData = XLSX.utils.sheet_to_json(resultSheet, { range: 3 });

        let classWiseData = {};
        let asatizaWiseData = {};
        let studentReportCards = [];

        // Safe Context Retrieval
        let contextUserName = "Admin";
        let contextRegion = "N/A";
        // Agar function available hai to call karo
        if (typeof window.getJamiaContext === 'function') {
            const context = window.getJamiaContext(jamiaName);
            contextUserName = context.userName;
            contextRegion = context.region;
        }
        
        const ownerUserId = (window.allUsersData || []).find(u => (u.name || u.email) === contextUserName)?.id || "admin";

        resultData.forEach(row => {
            const className = row['Class'] || row['کلاس'];
            const kaifiyat = row['کیفیت'] ? row['کیفیت'].trim() : '';
            if (!className) return;

            const cName = className.trim();
            const allowedSubjects = classSubjectMap[cName] || [];

            // A. CLASS-WISE CALCULATION
            if (!classWiseData[cName]) classWiseData[cName] = { mumtazSharf: 0, mumtaz: 0, jayyidJidda: 0, jayyid: 0, maqbool: 0, majazZimni: 0, nakam: 0, ghaib: 0, total: 0, passed: 0 };
            
            if (kaifiyat) {
                classWiseData[cName].total++;
                if (kaifiyat.includes('ممتاز مع شرف')) { classWiseData[cName].mumtazSharf++; classWiseData[cName].passed++; }
                else if (kaifiyat.includes('ممتاز')) { classWiseData[cName].mumtaz++; classWiseData[cName].passed++; }
                else if (kaifiyat.includes('جید جدا')) { classWiseData[cName].jayyidJidda++; classWiseData[cName].passed++; }
                else if (kaifiyat.includes('جید')) { classWiseData[cName].jayyid++; classWiseData[cName].passed++; }
                else if (kaifiyat.includes('مقبول')) { classWiseData[cName].maqbool++; classWiseData[cName].passed++; }
                else if (kaifiyat.includes('مجاز ضمنی')) { classWiseData[cName].majazZimni++; }
                else if (kaifiyat.includes('ناکام')) { classWiseData[cName].nakam++; }
                else if (kaifiyat.includes('غ') || kaifiyat.includes('غیر حاضر')) { classWiseData[cName].ghaib++; classWiseData[cName].total--; }
            }

            // B. ASATIZA-WISE CALCULATION
            let stdMarksList = [];
            allowedSubjects.forEach(sub => {
                const marksRaw = row[sub];
                let markVal = (marksRaw === 'غ' || marksRaw === undefined) ? 'غ' : marksRaw;
                stdMarksList.push({ subject: sub, marks: markVal });

                if (markVal !== 'غ' && markVal !== undefined) {
                    let marks = typeof markVal === 'string' && markVal.includes('+') ? parseFloat(markVal.split('+')[0]) + parseFloat(markVal.split('+')[1]) : parseFloat(markVal);
                    
                    const tName = getTeacherName(jamiaName, cName, sub);
                    if (tName !== "Na-Maloom") {
                        if (!asatizaWiseData[tName]) asatizaWiseData[tName] = {};
                        if (!asatizaWiseData[tName][sub]) asatizaWiseData[tName][sub] = { class: cName, subject: sub, total: 0, passed: 0 };
                        
                        asatizaWiseData[tName][sub].total++;
                        if (marks >= passingMarks[sub]) asatizaWiseData[tName][sub].passed++;
                    }
                }
            });

            // Report Card Push
            studentReportCards.push({
                rollNo: row['رول نمبر'] || '-',
                dakhlaNo: row['داخلہ نمبر'] || '-',
                name: row['نام'] || '-',
                fatherName: row['والد کا نام'] || '-',
                darjah: cName,
                jamiaRank: row['جامعہ میں رینک'] || '-',
                totalMarks: row['کل نمبر'] || '-',
                obtainedMarks: row['حاصل نمبر'] || '-',
                percentage: row['فیصد'] || '-',
                grade: row['گریڈ'] || '-',
                kaifiyat: kaifiyat,
                marksDetails: stdMarksList
            });
        });

        // 3. BATCH UPLOAD TO FIREBASE
        try {
            const batch = writeBatch(db);

            const rcId = `${jamiaName}_${examYear}_${examType}`.replace(/\//g, '-').replace(/\s+/g, '_');
            batch.set(doc(db, "student_report_cards", rcId), {
                jamia: jamiaName, examYear: examYear, examType: examType,
                students: studentReportCards, timestamp: Date.now()
            });

            for (const cName in classWiseData) {
                const customId = `${ownerUserId}_${jamiaName}_${examYear}_${examType}_${cName}`.replace(/\//g, '-').replace(/\s+/g, '_');
                batch.set(doc(db, "class_wise_results", customId), {
                    uid: ownerUserId, userId: ownerUserId, userName: contextUserName, region: contextRegion,
                    jamia: jamiaName, examType: examType, examYear: examYear, darjah: cName,
                    ...classWiseData[cName], timestamp: Date.now()
                });
            }

            const tDataArr = [];
            for (const tName in asatizaWiseData) {
                const periods = [];
                for (const subjKey in asatizaWiseData[tName]) {
                    const sData = asatizaWiseData[tName][subjKey];
                    let perc = sData.total > 0 ? ((sData.passed / sData.total) * 100).toFixed(1) : 0;
                    periods.push({
                        class: sData.class, subject: sData.subject, total: sData.total, passed: sData.passed,
                        percentage: `${perc}%`, kaifiyat: getJamiaKefiyat(`${perc}%`, 'teacher')
                    });
                }
                tDataArr.push({ teacher: tName, periods: periods });
            }
            if (tDataArr.length > 0) {
                const asatizaId = `${jamiaName}_${examYear}_${examType}_asatiza`.replace(/\//g, '-').replace(/\s+/g, '_');
                batch.set(doc(db, "asatiza_wise_results", asatizaId), {
                    jamia: jamiaName, examType: examType, examYear: examYear, data: tDataArr, timestamp: Date.now()
                });
            }

            await batch.commit();
            if(logs) logs.innerHTML += `<span class="text-green-600 font-bold">✅ Data successfully Processed aur Database mein Save ho gaya hai!</span>`;
            
        } catch (error) {
            if(logs) logs.innerHTML += `<span class="text-red-600 font-bold">❌ Error: ${error.message}</span>`;
        }
    }

    // --- B. Delete Result Button ---
    if (e.target.closest('#btn-delete-result')) {
        const jamiaName = document.getElementById('upload-jamia-name')?.value;
        const examType = document.getElementById('admin-exam-type')?.value;
        const examYear = document.getElementById('admin-exam-year')?.value;
        const logs = document.getElementById('upload-logs');

        if (!jamiaName || jamiaName === 'all') {
            alert("Jamia select karein jiska data delete karna hai.");
            return;
        }

        if (!confirm(`WARNING: Kya aap ${jamiaName} ka ${examYear} ka data Hamesha ke liye Delete karna chahte hain?`)) return;

        if (logs) {
            logs.classList.remove('hidden');
            logs.innerHTML = `<span class="text-red-600">🗑 Deleting data...</span><br>`;
        }

        try {
            const batch = writeBatch(db);

            const rcId = `${jamiaName}_${examYear}_${examType}`.replace(/\//g, '-').replace(/\s+/g, '_');
            batch.delete(doc(db, "student_report_cards", rcId));

            const asatizaId = `${jamiaName}_${examYear}_${examType}_asatiza`.replace(/\//g, '-').replace(/\s+/g, '_');
            batch.delete(doc(db, "asatiza_wise_results", asatizaId));

            const classQuery = query(collection(db, "class_wise_results"), where("jamia", "==", jamiaName), where("examType", "==", examType), where("examYear", "==", examYear));
            const classSnap = await getDocs(classQuery);
            classSnap.forEach(d => batch.delete(d.ref));

            await batch.commit();
            if(logs) logs.innerHTML += `<span class="text-green-600 font-bold">✅ Data successfully delete ho gaya hai!</span>`;
        } catch(error) {
            if(logs) logs.innerHTML += `<span class="text-red-600 font-bold">❌ Error: ${error.message}</span>`;
        }
    }
});
}



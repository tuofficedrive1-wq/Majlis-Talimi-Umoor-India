// ✅ FINAL FIXED: ADMIN RESULT ANALYSIS (EXACT ZIMMEDAR NAME & NUMBER MAPPING)

import {
    collection, query, where, getDocs, orderBy, doc, setDoc, writeBatch, deleteDoc
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

    let regionSet = new Set(allUsers.map(u => u.region).filter(r => r));
    Object.values(masterJamiaDict).forEach(m => { if(m.region) regionSet.add(m.region); });
    const regions = [...regionSet].sort();

    // 🌟 ZIMMEDAR PRIORITY FIX: Yahan standard user ko hamesha pehli priority di jayegi
    const getJamiaContext = (jamiaName, jamiaId = null) => {
        if (!jamiaName && !jamiaId) return { userName: 'Not Linked', region: 'N/A', display: '', english: '' };
        const target = String(jamiaName || '').trim().toLowerCase();
        let mData = null;

        if (jamiaId && masterJamiaDict[jamiaId]) mData = masterJamiaDict[jamiaId];
        else if (masterJamiaDict[target]) mData = masterJamiaDict[target];
        else {
            let foundKey = Object.keys(masterJamiaDict).find(k => k === target || k.replace(/\s+/g, '') === target.replace(/\s+/g, ''));
            if (foundKey) mData = masterJamiaDict[foundKey];
        }

        // Un sabhi users ko filter karein jin ki list me yeh Jamia hai
        const linkedUsers = allUsers.filter(u => {
            const list = u.jamiaatList || [];
            return list.some(j => {
                const jId = typeof j === 'object' ? j.id : null;
                const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                const jTarget = String(name || '').trim().toLowerCase();
                return jTarget === target || (mData && jTarget === String(mData.name || '').trim().toLowerCase());
            });
        });

        // 1. Sabse pehle 'standard' role (Asal Zimmedar) ko dhoondo
        let foundUser = linkedUsers.find(u => u.role === 'standard' || !u.role);
        
        // 2. Agar standard nahi mila, tab ja ke baqi ko check karega (par inspector, office, ya qirat wale ko ignore karega)
        if (!foundUser) {
            foundUser = linkedUsers.find(u => u.role !== 'inspector' && u.role !== 'education_office' && u.role !== 'shoba_qirat' && u.role !== 'qirat');
        }

        const finalMasterName = mData ? (mData.name || jamiaName) : jamiaName;
        const finalUrduName = mData ? (mData.urduName || '') : '';
        let finalRegion = mData ? (mData.region || '') : '';
        if (!finalRegion && foundUser) finalRegion = foundUser.region || '';

        return {
            userName: foundUser ? (foundUser.name || foundUser.email) : 'Not Linked',
            region: finalRegion || 'N/A',
            display: finalUrduName || finalMasterName,
            english: finalMasterName
        };
    };

    // 🌟 HTML UI RENDER 🌟
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
                <!-- 🌟 FIX: Yahan bhi sirf Standard user filter me aayenge -->
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">User Filter</label><select id="admin-user-filter" class="w-full p-2 border rounded-lg text-sm"><option value="all">All Users</option>${allUsers.filter(u => u.role === 'standard' || !u.role).map(u => `<option value="${u.name || u.email}">${u.name || u.email}</option>`).join('')}</select></div>
                <div><label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Select Jamia</label><select id="admin-jamia-select" class="w-full p-2 border rounded-lg text-sm urdu-font"><option value="all">All Jamiaat</option></select></div>
                
                <div id="dashboard-filters-div">
                    <label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Dashboard Type</label>
                    <select id="dashboard-result-type" class="w-full p-2 border rounded-lg text-sm font-bold">
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
                    <p class="text-xs text-gray-500 mt-2">نوٹ: ایکسل کا ڈیٹا جوں کا توں ڈیٹا بیس میں محفوظ ہو جائے گا جس سے اساتذہ کے فارم میں مضامین خود آ جائیں گے۔</p>
                </div>

                <!-- 🟢 PREVIEW CONTAINER -->
                <div id="preview-container" class="hidden mt-6 p-6 border-2 border-indigo-200 bg-indigo-50 rounded-2xl shadow-sm">
                    <h4 class="text-xl font-bold text-indigo-800 mb-4"><i class="fas fa-search mr-2"></i> Data Preview (ڈیٹا کا جائزہ لیں)</h4>
                    <div id="preview-content" class="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar"></div>
                    
                    <div class="flex flex-col sm:flex-row gap-4 mt-6">
                        <button id="btn-cancel-preview" class="w-full sm:w-1/3 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl shadow-sm transition flex justify-center items-center gap-2">
                            <i class="fas fa-times"></i> Cancel & Re-upload
                        </button>
                        <button id="btn-confirm-upload" class="w-full sm:w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition text-lg flex items-center justify-center gap-2">
                            <i class="fas fa-cloud-upload-alt"></i> Confirm & Upload to Database
                        </button>
                    </div>
                </div>

                <!-- 🗑️ DELETE DATA SECTION -->
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

    // 🌟 SAFE ELEMENTS FINDER 🌟
    const elements = {
        btnDashboard: document.getElementById("tab-dashboard"),
        btnReports: document.getElementById("tab-reports"),
        btnUpload: document.getElementById("tab-upload"),
        dashboardView: document.getElementById("dashboard-view"),
        reportsView: document.getElementById("reports-view"),
        uploadView: document.getElementById("upload-view"),
        filterSection: document.getElementById("filter-section"),
        exportBtn: document.getElementById("admin-export-btn"),
        regionFilter: document.getElementById("admin-region-filter"),
        userFilter: document.getElementById("admin-user-filter"),
        jamiaSelect: document.getElementById("admin-jamia-select"),
        dashboardFilters: document.getElementById("dashboard-filters-div"), 
        reportsLayoutFilter: document.getElementById("reports-layout-filter-div"),
        statsContainer: document.getElementById("stats-summary")
    };

    // 🌟 ERROR-FREE TAB SWITCHING 🌟
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

    // Auto-Populate Exam Year
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

    // Update Jamia Dropdown
    const updateJamiaList = () => {
        const selUser = elements.userFilter.value;
        const selReg = elements.regionFilter.value;
        const delJamiaSelect = document.getElementById('delete-jamia-select');
        
        if(elements.jamiaSelect) elements.jamiaSelect.innerHTML = '<option value="all">All Jamiaat</option>';
        if(delJamiaSelect) delJamiaSelect.innerHTML = '<option value="all">All Jamiaat (Poora Result Delete)</option>';

        let filteredUsers = allUsers;
        if (selReg !== "all") filteredUsers = filteredUsers.filter(u => u.region === selReg);
        if (selUser !== "all") filteredUsers = filteredUsers.filter(u => (u.name || u.email) === selUser);

        let jamiaSet = new Set();
        filteredUsers.forEach(u => {
            (u.jamiaatList || []).forEach(j => {
                const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                if (name) jamiaSet.add(String(name).trim()); 
            });
        });

        [...jamiaSet].sort().forEach(j => {
            if(elements.jamiaSelect) elements.jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
            if(delJamiaSelect) delJamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });
    };

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

    // Show Analysis Button
    const showBtn = document.getElementById("admin-show-btn");
    if (showBtn) {
        showBtn.onclick = async () => {
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

                    if ((selRegion === "all" || context.region === selRegion) && 
                        (selUser === "all" || context.userName === selUser) && 
                        (selJamia === "all" || context.english.toLowerCase().includes(selJamia) || context.display.toLowerCase().includes(selJamia) || currentJamia.toLowerCase().includes(selJamia))) {
                        
                        if (layout === 'ibtidaiya') {
                            latestDataMap.set(d.id, { ...d, ...context });
                        } else {
                            let uniqueKey = (layout === 'teacher' || layout === 'wazahat') 
                                ? `${d.jamia}_${d.teacher}`.toLowerCase() : `${d.jamia}_${d.darjah || d.class}`.toLowerCase();
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

        if (type === 'region-wise' || type === 'user-wise') {
            let stats = {};
            const keyField = type === 'region-wise' ? 'region' : 'userName';
            data.forEach(d => {
                const key = d[keyField] || 'Unknown';
                if (!stats[key]) stats[key] = { h: 0, p: 0 };
                const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
                const p = num(d.mumtazSharf) + num(d.mumtaz) + num(d.jayyidJidda) + num(d.jayyid) + num(d.maqbool) + num(d.majazZimni);
                stats[key].h += h; stats[key].p += p;
            });
            let rows = Object.entries(stats).map(([k, s]) => {
                const per = s.h ? (s.p/s.h)*100 : 0;
                return `<tr><td class="p-2 border font-bold text-right">${k}</td><td class="p-2 border">${s.h}</td><td class="p-2 border text-green-600 font-bold">${s.p}</td><td class="p-2 border font-bold">${per.toFixed(1)}%</td></tr>`;
            }).join('');
            view.innerHTML = `<div class="bg-white p-5 rounded-xl border shadow-sm max-w-2xl mx-auto overflow-hidden"><table class="w-full text-sm text-center"><thead class="bg-gray-100"><tr><th class="p-2 border">Category</th><th class="p-2 border">Hazir</th><th class="p-2 border">Pass</th><th class="p-2 border">%</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        } else {
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
            thead.innerHTML = `<th class="p-2 border">Sr.</th><th class="p-2 border">Region</th><th class="p-2 border">تعلیمی ذمہ دار</th><th class="p-2 border">جامعہ</th><th class="p-2 border">کل طلباء</th><th class="p-2 border">حاضر</th><th class="p-2 border">کامیاب</th><th class="p-2 border">%</th><th class="p-2 border">کیفیت</th>`;
            let jamiaStats = {}; let grandTotalStudents = 0; let grandTotalHazir = 0; let grandTotalPass = 0;
            data.forEach(d => {
                if (!jamiaStats[d.jamia]) jamiaStats[d.jamia] = { t: 0, h: 0, p: 0, region: d.region || '-', user: d.userName || '-' };
                const t = num(d.total); 
                const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
                const p = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                jamiaStats[d.jamia].t += t; jamiaStats[d.jamia].h += h; jamiaStats[d.jamia].p += p;
                grandTotalStudents += t; grandTotalHazir += h; grandTotalPass += p;
            });
            Object.entries(jamiaStats).map(([name, s]) => ({ name, s, per: s.h ? (s.p / s.h) * 100 : 0 })).sort((a, b) => b.per - a.per).forEach((item, i) => {
                tbody.innerHTML += `<tr><td class="p-2 border">${i + 1}</td><td class="p-2 border font-bold">${item.s.region}</td><td class="p-2 border urdu-font">${item.s.user}</td><td class="p-2 border urdu-font font-bold">${item.name}</td><td class="p-2 border font-bold text-indigo-700">${item.s.t}</td><td class="p-2 border">${item.s.h}</td><td class="p-2 border text-green-700 font-bold">${item.s.p}</td><td class="p-2 border font-bold">${item.per.toFixed(1)}%</td><td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(item.per, 'jamia')}">${getJamiaKefiyat(item.per, 'jamia')}</td></tr>`;
            });
            const grandPer = grandTotalHazir ? (grandTotalPass / grandTotalHazir) * 100 : 0;
            tfoot.innerHTML = `<tr class="bg-gray-800 text-white font-bold text-center"><td colspan="4" class="p-3 border text-right urdu-font text-lg pr-5">کل میزان (Total):</td><td class="p-3 border text-indigo-300 text-lg">${grandTotalStudents}</td><td class="p-3 border text-lg">${grandTotalHazir}</td><td class="p-3 border text-green-400 text-lg">${grandTotalPass}</td><td class="p-3 border text-lg">${grandPer.toFixed(1)}%</td><td class="p-3 border urdu-font text-lg" style="color:${getKefiyatColor(grandPer, 'jamia')}">${getJamiaKefiyat(grandPer, 'jamia')}</td></tr>`;
        } 
        else if (layout === 'class') {
            thead.innerHTML = `<th class="p-2 border">Sr.</th><th class="p-2 border">Region</th><th class="p-2 border">تعلیمی ذمہ دار</th><th class="p-2 border">جامعہ</th><th class="p-2 border">درجہ</th><th class="p-2 border">کل طلباء</th><th class="p-2 border">حاضر</th><th class="p-2 border">کامیاب</th><th class="p-2 border">%</th><th class="p-2 border">کیفیت</th>`;
            data.forEach((d, i) => {
                const t = num(d.total);
                const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
                const p = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                const per = h ? (p / h) * 100 : 0;
                tbody.innerHTML += `<tr><td class="p-2 border">${i + 1}</td><td class="p-2 border font-bold">${d.region || '-'}</td><td class="p-2 border urdu-font">${d.userName || '-'}</td><td class="p-2 border urdu-font">${d.jamia}</td><td class="p-2 border urdu-font font-bold">${d.darjah || d.class}</td><td class="p-2 border text-indigo-700 font-bold">${t}</td><td class="p-2 border">${h}</td><td class="p-2 border">${p}</td><td class="p-2 border font-bold">${per.toFixed(1)}%</td><td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(per, 'class')}">${getJamiaKefiyat(per, 'class')}</td></tr>`;
            });
        }
        else if (layout === 'wazahat') {
            let totalPending = 0; let totalSubmitted = 0; let wazahatRows = ""; let latestMap = new Map();
            data.forEach((d) => {
                (d.data || []).forEach((tEntry) => {
                    (tEntry.periods || []).forEach((p) => {
                        const sPer = num(p.total) ? (num(p.passed) / num(p.total)) * 100 : 0;
                        if (sPer < 70) {
                            const subjectKey = (p.subject || "").replace(/\./g, '_');
                            const uniqueId = `${d.jamia}_${tEntry.teacher}_${subjectKey}`.toLowerCase();
                            if (!latestMap.has(uniqueId)) {
                                const hasWazahat = (d.wazahat_map && d.wazahat_map[subjectKey]);
                                if (hasWazahat) totalSubmitted++; else totalPending++;
                                const tComment = hasWazahat ? `<div class="text-sm urdu-font text-gray-900">${d.wazahat_map[subjectKey]}</div>` : '<span class="text-red-500 font-bold italic">Pending...</span>';
                                const zComment = (d.zimmedar_comments && d.zimmedar_comments[subjectKey]) ? `<div class="text-sm urdu-font text-indigo-900">${d.zimmedar_comments[subjectKey]}</div>` : '<span class="text-gray-400 italic text-xs">Nahi likha</span>';
                                wazahatRows += `<tr class="border-b hover:bg-gray-50 text-center"><td class="p-2 border urdu-font font-bold text-gray-800">${d.jamia}</td><td class="p-2 border urdu-font font-bold text-blue-800">${tEntry.teacher || "-"}</td><td class="p-2 border"><div class="font-bold urdu-font text-[13px]">${p.subject || '-'}</div><div class="text-[10px] font-bold text-red-600">${p.class || '-'}</div></td><td class="p-2 border font-bold text-red-600">${sPer.toFixed(1)}%</td><td class="p-2 border urdu-font font-bold text-xs" style="color:${getKefiyatColor(sPer, 'teacher')}">${getJamiaKefiyat(sPer, 'teacher')}</td><td class="p-3 border bg-red-50/30 min-w-[200px] text-right">${tComment}</td><td class="p-3 border bg-blue-50/30 min-w-[200px] text-right">${zComment}</td></tr>`;
                                latestMap.set(uniqueId, true);
                            }
                        }
                    });
                });
            });
            const summaryHeader = `<div class="bg-[#1e293b] text-white p-3 rounded-t-2xl text-center font-bold text-sm border-b border-slate-700">Kul Kamzor Results: <span class="text-yellow-400 mx-1">${totalPending + totalSubmitted}</span> | Wazahat Aa Gayi: <span class="text-green-400 mx-1">${totalSubmitted}</span> | Baqi (Pending): <span class="text-red-400 mx-1">${totalPending}</span></div>`;
            thead.innerHTML = `<tr class="bg-slate-900 text-white text-[13px] font-bold urdu-font"><th class="p-3 border border-slate-700">جامعہ</th><th class="p-3 border border-slate-700">استاد</th><th class="p-3 border border-slate-700">مضمون/درجہ</th><th class="p-3 border border-slate-700 w-16">فیصد</th><th class="p-3 border border-slate-700 w-24">کیفیت</th><th class="p-3 border border-slate-700 bg-red-900/40">وضاحت (Teacher)</th><th class="p-3 border border-slate-700 bg-blue-900/40">تبصرہ (Zimmedar)</th></tr>`;
            const tableContainer = document.getElementById("reports-view");
            const existingSummary = tableContainer.querySelector('.summary-bar-wazahat');
            if (existingSummary) existingSummary.remove();
            const summaryDiv = document.createElement('div'); summaryDiv.className = 'summary-bar-wazahat'; summaryDiv.innerHTML = summaryHeader;
            tableContainer.prepend(summaryDiv);
            tbody.innerHTML = wazahatRows || `<tr><td colspan="7" class="p-20 text-center text-red-500 font-bold bg-white text-xl">Mashallah! Koi kamzor result nahi mila.</td></tr>`;
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

        // 🌟 FILE SELECTION EVENT 🌟
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

                    // 1. Map Sheet (Find Classes & Subjects)
                    const mapSheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'subj') || workbook.SheetNames[1];
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
                                
                                Object.keys(colNumberMap).forEach(mapNum => {
                                    let colIdx = colNumberMap[mapNum];
                                    let subName = subRow[colIdx];
                                    if (subName && String(subName).trim() !== '') {
                                        classSubjectMap[currentClass].subjects[mapNum] = {
                                            name: String(subName).trim(),
                                            pass: parseFloat(passRow[colIdx]) || 40
                                        };
                                        classSubjectMap[currentClass].keys.push(parseInt(mapNum));
                                    }
                                });
                                i += 3;
                            } else { i++; }
                        }
                    }

                    // 2. Result Sheet Data Collection
                    const resSheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'result') || workbook.SheetNames[0];
                    const rawResultData = XLSX.utils.sheet_to_json(workbook.Sheets[resSheetName], { header: 1 });
                    
                    let resHdrIdx = -1, resColMap = {}, jamiaColIdx = -1, classColIdx = -1, kefiyatColIdx = -1;

                    for (let i = 0; i < Math.min(25, rawResultData.length); i++) {
                        let row = rawResultData[i];
                        if(!row) continue;
                        for (let c = 0; c < row.length; c++) {
                            let cell = String(row[c]).trim();
                            
                            if (/^(10|[1-9])$/.test(cell)) { resColMap[parseInt(cell)] = c; }
                            
                            if (cell === 'Jamia_tul_Madina' || cell.includes('جامعۃ المدینہ') || cell === 'جامعہ') jamiaColIdx = c;
                            if (cell === 'Class' || cell.includes('درجہ')) classColIdx = c;
                            if (cell.includes('کیفیت') || cell.includes('نتیجہ') || cell.includes('گریڈ')) kefiyatColIdx = c; 
                        }
                        if (jamiaColIdx !== -1 && classColIdx !== -1 && Object.keys(resColMap).length > 0) {
                            resHdrIdx = i; break;
                        }
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

                    let multiJamiaClassData = {};
                    let multiJamiaSubjectData = {}; 

                    for (let i = resHdrIdx + 1; i < rawResultData.length; i++) {
                        let row = rawResultData[i];
                        if (!row || row.length === 0) continue; 
                        
                        let jamiaName = String(row[jamiaColIdx] || '').trim();
                        let cName = String(row[classColIdx] || '').trim();
                        let kefiyatVal = kefiyatColIdx !== -1 ? String(row[kefiyatColIdx] || '').trim() : '';
                        
                        if (!jamiaName || !cName || jamiaName === 'undefined') continue;
                        let config = classSubjectMap[cName];
                        if (!config) continue; 

                        if (!multiJamiaClassData[jamiaName]) multiJamiaClassData[jamiaName] = {};
                        if (!multiJamiaSubjectData[jamiaName]) multiJamiaSubjectData[jamiaName] = {};
                        
                        if (!multiJamiaClassData[jamiaName][cName]) {
                            multiJamiaClassData[jamiaName][cName] = { mumtazSharf: 0, mumtaz: 0, jayyidJidda: 0, jayyid: 0, maqbool: 0, majazZimni: 0, nakam: 0, ghaib: 0, total: 0, passed: 0 };
                        }
                        if (!multiJamiaSubjectData[jamiaName][cName]) {
                            multiJamiaSubjectData[jamiaName][cName] = {};
                        }

                        multiJamiaClassData[jamiaName][cName].total++;

                        let isGhaib = true; 
                        let isNakam = false;
                        
                        config.keys.forEach(mapNum => {
                            let resColIdx = resColMap[mapNum];
                            if (resColIdx === undefined) return;
                            
                            let subjConfig = config.subjects[mapNum];
                            let passMarks = subjConfig.pass;
                            let subName = subjConfig.name; 

                            if (!multiJamiaSubjectData[jamiaName][cName][subName]) {
                                multiJamiaSubjectData[jamiaName][cName][subName] = { total: 0, passed: 0 };
                            }

                            let markCell = row[resColIdx];
                            let cellStr = String(markCell || '').trim();
                            let cellLower = cellStr.toLowerCase();
                            
                            let isTextGhaib = cellStr === 'غ' || cellStr === 'غائب' || cellLower === 'a' || cellLower === 'absent' || cellStr === '';
                            let isTextNakam = cellStr === 'ناکام' || cellLower === 'fail' || cellLower === 'f';
                            
                            if (!isTextGhaib) {
                                isGhaib = false; 
                                multiJamiaSubjectData[jamiaName][cName][subName].total++;
                                
                                let marks = cellStr.includes('+') ? (parseFloat(cellStr.split('+')[0]) + parseFloat(cellStr.split('+')[1])) : parseFloat(markCell);
                                
                                if (!isNaN(marks) && marks >= passMarks) {
                                    multiJamiaSubjectData[jamiaName][cName][subName].passed++;
                                } else if (isNaN(marks) && !isTextNakam) {
                                    multiJamiaSubjectData[jamiaName][cName][subName].passed++;
                                }
                            }
                        });
                        
                        if (kefiyatVal.includes('غائب') || kefiyatVal === 'غ' || isGhaib) { 
                            multiJamiaClassData[jamiaName][cName].ghaib++; 
                        } else {
                            let kefLower = kefiyatVal.toLowerCase();
                            if (kefiyatVal.includes('ناکام') || kefLower === 'f' || kefLower === 'fail') {
                                multiJamiaClassData[jamiaName][cName].nakam++;
                            } else {
                                multiJamiaClassData[jamiaName][cName].passed++;
                                if (kefiyatVal.includes('الشرف') || kefiyatVal === 'A+') multiJamiaClassData[jamiaName][cName].mumtazSharf++;
                                else if (kefiyatVal.includes('ممتاز') || kefiyatVal === 'A') multiJamiaClassData[jamiaName][cName].mumtaz++;
                                else if (kefiyatVal.includes('جید جدا') || kefiyatVal === 'B+') multiJamiaClassData[jamiaName][cName].jayyidJidda++;
                                else if (kefiyatVal.includes('جید') || kefiyatVal === 'B') multiJamiaClassData[jamiaName][cName].jayyid++;
                                else if (kefiyatVal.includes('ضمنی')) multiJamiaClassData[jamiaName][cName].majazZimni++;
                                else multiJamiaClassData[jamiaName][cName].maqbool++;
                            }
                        }
                    } 

                    const examType = document.getElementById('upload-exam-type').value;
                    const examYear = document.getElementById('upload-exam-year').value;
                    pendingUploadData = { examType, examYear, multiJamiaClassData, multiJamiaSubjectData };

                    // 🌟 PREVIEW GENERATION 🌟
                    let previewHtml = '';
                    Object.keys(multiJamiaSubjectData).forEach(jamiaName => {
                        let cData = multiJamiaSubjectData[jamiaName];
                        let classesHtml = '';
                        Object.keys(cData).forEach(cName => {
                            let subsHtml = Object.keys(cData[cName]).map(sub => 
                                `<span class="inline-block bg-teal-50 text-teal-800 border border-teal-200 px-2 py-1 rounded text-[11px] m-1 shadow-sm">${sub} (${cData[cName][sub].passed}/${cData[cName][sub].total})</span>`
                            ).join('');
                            let enrolled = multiJamiaClassData[jamiaName][cName].total;
                            classesHtml += `<div class="p-3 bg-white border rounded-lg mb-2 shadow-sm"><strong class="urdu-font text-indigo-700">${cName} (کل: ${enrolled})</strong><div class="mt-1 flex flex-wrap">${subsHtml}</div></div>`;
                        });

                        previewHtml += `<div class="bg-gray-50 p-4 rounded-xl border mb-4">
                            <h5 class="font-bold text-xl text-indigo-900 urdu-font mb-2">${jamiaName}</h5>
                            ${classesHtml}
                        </div>`;
                    });

                    document.getElementById('preview-content').innerHTML = previewHtml;
                    document.getElementById('preview-container').classList.remove('hidden');
                }; 
                reader.readAsArrayBuffer(file); 
            }
        });

        // 🌟 CANCEL BUTTON 🌟
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btn-cancel-preview')) {
                document.getElementById('preview-container').classList.add('hidden');
                const fileInput = document.getElementById('result-excel-file');
                if(fileInput) fileInput.value = ''; 
                pendingUploadData = null;
            }
        });

        // 🌟 CONFIRM & UPLOAD BUTTON 🌟
        document.addEventListener('click', async (e) => {
            if (e.target.closest('#btn-confirm-upload')) {
                const confirmBtn = e.target.closest('#btn-confirm-upload');
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Uploading...';
                confirmBtn.disabled = true;

                try {
                    const { examType, examYear, multiJamiaClassData, multiJamiaSubjectData } = pendingUploadData;

                    for (const jamiaName of Object.keys(multiJamiaClassData)) {
                        const context = getJamiaContext(jamiaName);
                        const ownerUserId = (window.allUsersData || []).find(u => (u.name || u.email) === context.userName)?.id || "admin";

                        // 1. Save Class Wise Data
                        const cDataObj = multiJamiaClassData[jamiaName];
                        for (const cName in cDataObj) {
                            const customId = `${ownerUserId}_${jamiaName}_${examYear}_${examType}_${cName}`.replace(/\//g, '-').replace(/\s+/g, '_');
                            await setDoc(doc(db, "class_wise_results", customId), {
                                uid: ownerUserId, userId: ownerUserId, userName: context.userName, region: context.region,
                                jamia: jamiaName, examType: examType, examYear: examYear, darjah: cName,
                                ...cDataObj[cName], timestamp: Date.now()
                            });
                        }

                        // 2. Save EXCEL SUBJECT DATA
                        const subDataObj = multiJamiaSubjectData[jamiaName];
                        const subjId = `${jamiaName}_${examYear}_${examType}`.replace(/\//g, '-').replace(/\s+/g, '_');
                        await setDoc(doc(db, "excel_subjects_data", subjId), {
                            jamia: jamiaName, examType: examType, examYear: examYear, classes: subDataObj, timestamp: Date.now()
                        });
                    }

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
                    confirmBtn.innerHTML = '<i class="fas fa-times"></i> Error';
                    alert("Error: " + error.message);
                }
            }
            
            if (e.target.closest('#jump-to-reports')) {
                document.getElementById('tab-reports')?.click();
                document.getElementById('admin-show-btn')?.click();
            }

            // 🌟 DELETE UPLOADED DATA LOGIC 🌟
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
    }
}

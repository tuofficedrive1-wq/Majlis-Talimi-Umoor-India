// ✅ FINAL FIXED: ADMIN RESULT ANALYSIS

import {
    collection, query, where, getDocs, orderBy
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
    const regions = [...new Set(allUsers.map(u => u.region).filter(r => r))].sort();

    const getJamiaContext = (jamiaName) => {
    if (!jamiaName || allUsers.length === 0) return { userName: 'Not Linked', region: 'N/A' };
    const target = jamiaName.trim().toLowerCase();

    // 🛑 FIX: Filter users by those who have this jamia AND are standard users
    const foundUser = allUsers.find(u => {
        const list = u.jamiaatList || [];
        const hasJamia = list.some(j => {
            const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
            return (name || '').trim().toLowerCase() === target;
        });
        // Zimmedar ko priority dein (Role check)
        return hasJamia && (u.role === 'standard' || !u.role);
    });

    return {
        userName: foundUser ? (foundUser.name || foundUser.email) : 'Not Linked',
        region: foundUser ? (foundUser.region || 'N/A') : 'N/A'
    };
};

    container.innerHTML = `
    <div class="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-lg border">
        <div class="flex border-b mb-6 bg-gray-50 rounded-t-lg overflow-hidden">
            <button id="tab-dashboard" class="flex-1 py-3 font-bold text-gray-600 hover:bg-white transition active-sub-tab">📊 Result Dashboard</button>
            <button id="tab-reports" class="flex-1 py-3 font-bold text-gray-600 hover:bg-white transition">📝 Detailed Reports</button>
        </div>

        <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                <div>
                    <label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Exam & Year</label>
                    <div class="flex gap-1">
                        <select id="admin-exam-type" class="w-full p-2 border rounded-lg text-sm urdu-font">
                            <option value="ششماہی امتحان">ششماہی امتحان</option>
                            <option value="سالانہ امتحان">سالانہ امتحان</option>
                        </select>
                        <select id="admin-exam-year" class="w-full p-2 border rounded-lg text-sm">
                            <option value="2024-25">24-25</option>
                            <option value="2025-26" selected>25-26</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Region</label>
                    <select id="admin-region-filter" class="w-full p-2 border rounded-lg text-sm">
                        <option value="all">All Regions</option>
                        ${regions.map(r => `<option value="${r}">${r}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">User Filter</label>
                    <select id="admin-user-filter" class="w-full p-2 border rounded-lg text-sm">
                        <option value="all">All Users</option>
                        ${allUsers.map(u => `<option value="${u.name || u.email}">${u.name || u.email}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-indigo-600 mb-1 uppercase">Select Jamia</label>
                    <select id="admin-jamia-select" class="w-full p-2 border rounded-lg text-sm urdu-font">
                        <option value="all">All Jamiaat</option>
                    </select>
                </div>

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
                        <option value="wazahat">Kamzor Result (Wazahat)</option> </select>
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
    </div>`;

    // Internal State Management - Elements Fix
    const elements = {
        btnDashboard: document.getElementById("tab-dashboard"),
        btnReports: document.getElementById("tab-reports"),
        dashboardView: document.getElementById("dashboard-view"),
        reportsView: document.getElementById("reports-view"),
        dashboardFilters: document.getElementById("dashboard-filters-div"),
        reportsLayoutFilter: document.getElementById("reports-layout-filter-div"),
        statsContainer: document.getElementById("stats-summary"),
        exportBtn: document.getElementById("admin-export-btn"),
        regionFilter: document.getElementById("admin-region-filter"),
        userFilter: document.getElementById("admin-user-filter"),
        jamiaSelect: document.getElementById("admin-jamia-select")
    };

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
                if (name) jamiaSet.add(name.trim());
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
        elements.statsContainer.classList.remove("hidden");
    };

    elements.btnReports.onclick = () => {
        elements.btnReports.classList.add("active-sub-tab"); elements.btnDashboard.classList.remove("active-sub-tab");
        elements.reportsView.classList.remove("hidden"); elements.dashboardView.classList.add("hidden");
        elements.dashboardFilters.classList.add("hidden");
        elements.reportsLayoutFilter.classList.remove("hidden");
        elements.statsContainer.classList.add("hidden");
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
        // Layout ke mutabiq sahi collection select karein
        const colName = (layout === 'teacher' || layout === 'wazahat') ? "asatiza_wise_results" : "class_wise_results";
        const q = query(collection(db, colName), where("examType", "==", examType), where("examYear", "==", examYear), orderBy("timestamp", "desc"));
        
        const snapshot = await getDocs(q);
        
        // Latest Data Map: Duplicacy khatam karne ke liye
        let latestDataMap = new Map();

        snapshot.forEach(doc => {
            const d = doc.data();
            d.id = doc.id;
            const context = getJamiaContext(d.jamia);

            // Filtering Logic (Manual definition to avoid ReferenceError)
            const matchRegion = (selRegion === "all" || context.region === selRegion);
            const matchUser = (selUser === "all" || context.userName === selUser);
            const matchJamia = (selJamia === "all" || d.jamia.toLowerCase().includes(selJamia));

            if (matchRegion && matchUser && matchJamia) {
                // Unique Key: Jamia + Class + Teacher taake naya record purane ko overwrite kare
                let uniqueKey = (layout === 'teacher' || layout === 'wazahat') 
                    ? `${d.jamia}_${d.teacher}`.toLowerCase() 
                    : `${d.jamia}_${d.darjah || d.class}`.toLowerCase();

                if (!latestDataMap.has(uniqueKey)) {
                    latestDataMap.set(uniqueKey, { ...d, ...context });
                }
            }
        });

        const dataList = Array.from(latestDataMap.values());
        const activeTab = elements.btnDashboard.classList.contains("active-sub-tab") ? 'dashboard' : 'reports';

        if (activeTab === 'dashboard') {
            renderDashboard(dataList, document.getElementById("dashboard-result-type").value, allUsers);
        } else {
            renderDetailedReports(dataList, layout);
        }
    } catch (e) { 
        console.error("Fetch Error:", e); 
        alert("Data load nahi ho saka: " + e.message);
    }
    loader.classList.add("hidden");
};

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
                    const isSub = data.some(d => d.jamia.trim().toLowerCase() === jName.trim().toLowerCase());
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

    if (layout === 'jamia') {
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
        data.forEach(d => {
            if (!jamiaStats[d.jamia]) {
                jamiaStats[d.jamia] = { h: 0, p: 0, region: d.region || '-', user: d.userName || '-' };
            }
            const h = Math.max(0, (num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib)) - num(d.ghaib));
            const p = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
            jamiaStats[d.jamia].h += h; 
            jamiaStats[d.jamia].p += p;
        });

        Object.entries(jamiaStats).forEach(([name, s], i) => {
            const per = s.h ? (s.p / s.h) * 100 : 0;
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

                        const teacherComment = hasWazahat 
                            ? `<div class="text-lg font-bold leading-snug urdu-font text-gray-900">${d.wazahat_map[subjectKey]}</div>` 
                            : '<span class="text-red-600 font-black italic animate-pulse">Pending...</span>';
                        
                        const zimmedarComment = (d.zimmedar_comments && d.zimmedar_comments[subjectKey]) 
                            ? `<div class="text-lg font-bold leading-snug urdu-font text-indigo-900">${d.zimmedar_comments[subjectKey]}</div>` 
                            : '<span class="text-gray-400 italic">Nahi likha</span>';

                        const rowHtml = `
                        <tr class="hover:bg-red-50 border-b text-center align-middle">
                            <td class="p-2 border font-bold urdu-font text-indigo-950 text-sm">${d.jamia}</td>
                            <td class="p-2 border font-bold urdu-font text-blue-800 text-sm">${tEntry.teacher || "-"}</td>
                            <td class="p-2 border">
                                <div class="font-bold urdu-font text-sm text-black">${p.subject || '-'}</div>
                                <div class="text-[12px] font-black text-red-700 mt-1 border-t border-red-100 pt-0.5">${p.class || '-'}</div>
                            </td>
                            <td class="p-2 border font-black text-red-600 w-12 text-sm">${sPer.toFixed(1)}%</td>
                            <td class="p-2 border font-bold urdu-font w-16 text-xs" style="color:${getKefiyatColor(sPer, 'teacher')}">${getJamiaKefiyat(sPer, 'teacher')}</td>
                            <td class="p-4 border bg-red-50 text-center min-w-[250px]">${teacherComment}</td>
                            <td class="p-4 border bg-blue-50 text-center min-w-[250px]">${zimmedarComment}</td>
                        </tr>`;
                        
                        latestMap.set(uniqueId, true);
                        wazahatRows += rowHtml;
                    }
                }
            });
        });
    });

    // ✅ FIXED HEADER: Dono rows ko ek hi innerHTML assignment mein rakha gaya hai
    thead.innerHTML = `
        <tr class="bg-[#1e293b] text-white">
            <th colspan="7" class="p-4 text-center text-lg font-bold tracking-wide border-b border-slate-700">
                <span class="opacity-80">Kul Kamzor Results:</span> <span class="text-yellow-400 mx-2">${totalPending + totalSubmitted}</span> 
                <span class="mx-3 text-slate-500">|</span>
                <span class="opacity-80">Wazahat Aa Gayi:</span> <span class="text-green-400 mx-2">${totalSubmitted}</span> 
                <span class="mx-3 text-slate-500">|</span>
                <span class="opacity-80">Baqi (Pending):</span> <span class="text-red-400 mx-2">${totalPending}</span>
            </th>
        </tr>
        <tr class="bg-slate-900 text-white text-[13px] font-bold urdu-font">
            <th class="p-3 border border-slate-700">جامعہ</th>
            <th class="p-3 border border-slate-700">استاد</th>
            <th class="p-3 border border-slate-700">مضمون/درجہ</th>
            <th class="p-3 border border-slate-700">فیصد</th>
            <th class="p-3 border border-slate-700">کیفیت</th>
            <th class="p-3 border border-slate-700 bg-red-900/30">وضاحت (Teacher)</th>
            <th class="p-3 border border-slate-700 bg-blue-900/30">تبصرہ (Zimmedar)</th>
        </tr>
    `;

    tbody.innerHTML = wazahatRows || `<tr><td colspan="7" class="p-20 text-center text-red-500 font-bold bg-white text-xl">Mashallah! Koi kamzor result nahi mila.</td></tr>`;
}
    else {
        // ✅ ASATIZA WISE: Region aur User ke saath
        thead.innerHTML = `
            <th class="p-2 border">Sr.</th>
            <th class="p-2 border">Region</th>
            <th class="p-2 border">تعلیمی ذمہ دار</th>
            <th class="p-2 border">جامعہ</th>
            <th class="p-2 border">استاد</th>
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
                        <td class="p-2 border text-right urdu-font">${p.subject || '-'}</td>
                        <td class="p-2 border">${num(p.total)}</td>
                        <td class="p-2 border">${num(p.passed)}</td>
                        <td class="p-2 border font-bold">${sPer.toFixed(1)}%</td>
                        <td class="p-2 border urdu-font font-bold" style="color:${getKefiyatColor(sPer, 'teacher')}">${getJamiaKefiyat(sPer, 'teacher')}</td>
                        ${idx === 0 ? `
                            <td class="p-2 border bg-emerald-50 font-bold" rowspan="${rSpan}">${tPer.toFixed(1)}%</td>
                            <td class="p-2 border bg-emerald-50 urdu-font font-bold" 
                                style="color:${getKefiyatColor(tPer, 'teacher')}" rowspan="${rSpan}">
                                ${getJamiaKefiyat(tPer, 'teacher')}
                            </td>
                        ` : ''}
                    </tr>`;
                });
            });
        });
    }
        }
}

// ✅ UPDATED ADMIN FINAL ANALYSIS WITH DYNAMIC DASHBOARD & USER FILTERS

import {
    collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 🔹 HELPERS: Status & Colors
const getJamiaKefiyat = (p) => {
    let val = parseFloat(String(p).replace('%', ''));
    if (isNaN(val)) return "-";
    if (val >= 85) return "ممتاز مع شرف";
    if (val >= 76) return "ممتاز";
    if (val >= 61) return "بہتر";
    if (val >= 40) return "مناسب";
    return "کمزور";
};

const getKefiyatColor = (p) => {
    let val = parseFloat(String(p).replace('%', ''));
    if (val >= 85) return "#059669";
    if (val >= 70) return "#2563eb";
    if (val >= 60) return "#d97706";
    if (val >= 40) return "#7c3aed";
    return "#dc2626";
};

// 🚀 MAIN EXPORT FUNCTION
export async function initAdminResultAnalysis(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allUsers = window.allUsersData || [];
    const regions = [...new Set(allUsers.map(u => u.region).filter(r => r))].sort();

    // 🔍 Lookup: Jamia se User aur Region nikalna
    const getJamiaContext = (jamiaName) => {
        if (!jamiaName || allUsers.length === 0) return { userName: 'Not Linked', region: 'N/A' };
        const target = jamiaName.trim().toLowerCase();
        const foundUser = allUsers.find(u => {
            const list = u.jamiaatList || [];
            return list.some(j => {
                const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                return (name || '').trim().toLowerCase() === target;
            });
        });
        return {
            userName: foundUser ? (foundUser.name || foundUser.email) : 'Not Linked',
            region: foundUser ? (foundUser.region || 'N/A') : 'N/A'
        };
    };

    // 🏗️ UI STRUCTURE
    container.innerHTML = `
    <div class="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-lg border">
        <div class="flex border-b mb-6 bg-gray-50 rounded-t-lg overflow-hidden">
            <button id="tab-dashboard" class="flex-1 py-3 font-bold text-gray-600 hover:bg-white transition active-sub-tab">📊 Result Dashboard</button>
            <button id="tab-reports" class="flex-1 py-3 font-bold text-gray-600 hover:bg-white transition">📝 Detailed Reports</button>
        </div>

        <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Exam Type</label>
                    <select id="admin-exam-type" class="w-full p-2.5 border rounded-lg urdu-font">
                        <option value="ششماہی امتحان">ششماہی امتحان</option>
                        <option value="سالانہ امتحان">سالانہ امتحان</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Year</label>
                    <select id="admin-exam-year" class="w-full p-2.5 border rounded-lg">
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26" selected>2025-26</option>
                    </select>
                </div>

                <div id="dashboard-filters-div">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Result Type</label>
                    <select id="dashboard-result-type" class="w-full p-2.5 border rounded-lg font-bold">
                        <option value="region-wise">🌍 Region Wise Summary</option>
                        <option value="user-wise">👨‍💼 User Wise Summary</option>
                        <option value="submission-status">📋 Submission Status</option>
                    </select>
                </div>

                <div id="reports-user-filter-div" class="hidden">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Talimi Zimmedar</label>
                    <select id="admin-user-filter" class="w-full p-2.5 border rounded-lg">
                        <option value="all">All Users</option>
                        ${allUsers.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(u => `<option value="${u.name || u.email}">${u.name || u.email}</option>`).join('')}
                    </select>
                </div>
                <div id="reports-layout-filter-div" class="hidden">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Layout</label>
                    <select id="admin-layout" class="w-full p-2.5 border rounded-lg">
                        <option value="jamia">Jamia Wise</option>
                        <option value="class">Class Wise</option>
                        <option value="teacher">Asatiza Wise</option>
                    </select>
                </div>
            </div>
            <button id="admin-show-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl w-full font-bold shadow-lg transition">
                Show Analysis
            </button>
        </div>

        <div id="admin-loader" class="hidden text-center py-12"><div class="loader mx-auto"></div><p>Loading Data...</p></div>

        <div id="dashboard-view" class="space-y-6"></div>
        <div id="reports-view" class="hidden overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
             <table class="w-full text-center border-collapse" id="final-analysis-table-to-export">
                <thead><tr id="admin-head" class="bg-gray-800 text-white urdu-font text-[14px]"></tr></thead>
                <tbody id="admin-body" class="divide-y divide-gray-100 text-gray-700"></tbody>
                <tfoot id="admin-foot" class="bg-gray-800 text-white font-bold"></tfoot>
            </table>
        </div>
    </div>

    <style>
        .active-sub-tab { border-bottom: 4px solid #4f46e5; color: #4f46e5 !important; background: white; }
    </style>`;

    const btnDashboard = document.getElementById("tab-dashboard");
    const btnReports = document.getElementById("tab-reports");
    const dashboardView = document.getElementById("dashboard-view");
    const reportsView = document.getElementById("reports-view");
    const dashboardFilters = document.getElementById("dashboard-filters-div");
    const reportsUserFilter = document.getElementById("reports-user-filter-div");
    const reportsLayoutFilter = document.getElementById("reports-layout-filter-div");

    // 🎮 TAB SWITCHING
    btnDashboard.onclick = () => {
        btnDashboard.classList.add("active-sub-tab"); btnReports.classList.remove("active-sub-tab");
        dashboardView.classList.remove("hidden"); reportsView.classList.add("hidden");
        dashboardFilters.classList.remove("hidden");
        reportsUserFilter.classList.add("hidden"); reportsLayoutFilter.classList.add("hidden");
    };

    btnReports.onclick = () => {
        btnReports.classList.add("active-sub-tab"); btnDashboard.classList.remove("active-sub-tab");
        reportsView.classList.remove("hidden"); dashboardView.classList.add("hidden");
        dashboardFilters.classList.add("hidden");
        reportsUserFilter.classList.remove("hidden"); reportsLayoutFilter.classList.remove("hidden");
    };

    // 📊 SHOW ANALYSIS
    document.getElementById("admin-show-btn").onclick = async () => {
        const examType = document.getElementById("admin-exam-type").value;
        const examYear = document.getElementById("admin-exam-year").value;
        const resType = document.getElementById("dashboard-result-type").value;
        const selUser = document.getElementById("admin-user-filter").value;
        const layout = document.getElementById("admin-layout").value;
        
        const loader = document.getElementById("admin-loader");
        loader.classList.remove("hidden");

        try {
            const colName = (btnReports.classList.contains("active-sub-tab") && layout === 'teacher') ? "asatiza_wise_results" : "class_wise_results";
            const q = query(collection(db, colName), where("examType", "==", examType), where("examYear", "==", examYear));
            const snapshot = await getDocs(q);
            
            let dataList = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                const context = getJamiaContext(d.jamia);
                // Filter for Detailed Reports Tab
                if (btnReports.classList.contains("active-sub-tab")) {
                    if (selUser === "all" || context.userName === selUser) dataList.push({ ...d, ...context });
                } else {
                    dataList.push({ ...d, ...context });
                }
            });

            if (btnDashboard.classList.contains("active-sub-tab")) {
                renderDashboard(dataList, resType, allUsers);
            } else {
                renderDetailedReports(dataList, layout);
            }
        } catch (e) { alert(e.message); }
        loader.classList.add("hidden");
    };

    function renderDashboard(data, type, users) {
        dashboardView.innerHTML = "";
        const num = (v) => parseInt(v) || 0;

        if (type === 'region-wise' || type === 'user-wise') {
            let stats = {};
            const keyField = type === 'region-wise' ? 'region' : 'userName';
            
            data.forEach(d => {
                const key = d[keyField] || 'Unknown';
                if (!stats[key]) stats[key] = { kul: 0, pass: 0, hazir: 0 };
                const kul = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                const pass = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                const hazir = Math.max(0, kul - num(d.ghaib));
                stats[key].kul += kul; stats[key].pass += pass; stats[key].hazir += hazir;
            });

            let rows = "";
            let totals = { h: 0, p: 0 };
            for (let k in stats) {
                const s = stats[k]; const per = s.hazir ? (s.pass/s.hazir)*100 : 0;
                totals.h += s.hazir; totals.p += s.pass;
                rows += `<tr><td class="p-2 border font-bold text-right">${k}</td><td class="p-2 border">${s.hazir}</td><td class="p-2 border text-green-600 font-bold">${s.pass}</td><td class="p-2 border font-bold">${per.toFixed(1)}%</td></tr>`;
            }
            const grandPer = totals.h ? (totals.p/totals.h)*100 : 0;

            dashboardView.innerHTML = `
                <div class="bg-white p-5 rounded-xl border shadow-sm max-w-2xl mx-auto">
                    <h4 class="font-bold text-gray-700 mb-4 border-b pb-2 text-center uppercase">${type.replace('-',' ')}</h4>
                    <table class="w-full text-sm text-center">
                        <thead class="bg-gray-100"><tr><th class="p-2 border">${type === 'region-wise' ? 'Region' : 'Zimmedar'}</th><th class="p-2 border">Hazir</th><th class="p-2 border">Pass</th><th class="p-2 border">%</th></tr></thead>
                        <tbody>${rows}</tbody>
                        <tfoot class="bg-gray-800 text-white font-bold">
                            <tr><td class="p-2 border text-right">GRAND TOTAL</td><td class="p-2 border">${totals.h}</td><td class="p-2 border">${totals.p}</td><td class="p-2 border">${grandPer.toFixed(1)}%</td></tr>
                        </tfoot>
                    </table>
                </div>`;
        } else {
            // Submission Status Logic
            let submissionHtml = users.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(u => {
                const userJamiaat = u.jamiaatList || [];
                if (userJamiaat.length === 0) return "";
                const jamiaRows = userJamiaat.map(j => {
                    const jName = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                    const isSub = data.some(d => d.jamia.trim().toLowerCase() === jName.trim().toLowerCase());
                    return `<div class="flex justify-between p-2 border-b text-sm"><span class="urdu-font">${jName}</span>${isSub ? '<span class="text-green-600 font-bold">✅ Received</span>' : '<span class="text-red-500 font-bold">❌ Missing</span>'}</div>`;
                }).join('');
                return `<div class="bg-white p-4 rounded-lg border shadow-sm"><h5 class="font-bold text-indigo-700 border-b pb-2 mb-2">${u.name || u.email}</h5>${jamiaRows}</div>`;
            }).join('');
            dashboardView.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${submissionHtml}</div>`;
        }
    }

    function renderDetailedReports(data, layout) {
        const thead = document.getElementById("admin-head");
        const tbody = document.getElementById("admin-body");
        const tfoot = document.getElementById("admin-foot");
        tbody.innerHTML = ""; tfoot.innerHTML = "";
        const num = (v) => parseInt(v) || 0;
        let totals = { hazir: 0, pass: 0 };

        if (layout === 'jamia') {
            thead.innerHTML = `<th class="p-3 border">Region</th><th class="p-3 border">User</th><th class="p-3 border text-right">جامعہ</th><th class="p-3 border">حاضر</th><th class="p-3 border">کامیاب</th><th class="p-3 border">فیصد</th><th class="p-3 border">کیفیت</th>`;
            let stats = {};
            data.forEach(d => {
                const kul = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                const pass = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                const hazir = Math.max(0, kul - num(d.ghaib));
                if (!stats[d.jamia]) stats[d.jamia] = { h:0, p:0, r:d.region, u:d.userName };
                stats[d.jamia].h += hazir; stats[d.jamia].p += pass;
            });
            for (let j in stats) {
                const s = stats[j]; const per = s.h ? (s.p/s.h)*100 : 0;
                totals.hazir += s.h; totals.pass += s.p;
                tbody.innerHTML += `<tr class="hover:bg-blue-50 transition"><td class="p-2 border text-xs text-gray-500">${s.r}</td><td class="p-2 border text-xs text-gray-500">${s.u}</td><td class="p-2 border font-bold text-right urdu-font">${j}</td><td class="p-2 border">${s.h}</td><td class="p-2 border text-green-600 font-bold">${s.p}</td><td class="p-2 border font-bold">${per.toFixed(2)}%</td><td class="p-2 border urdu-font" style="color:${getKefiyatColor(per)}">${getJamiaKefiyat(per)}</td></tr>`;
            }
            const gPer = totals.hazir ? (totals.pass/totals.hazir)*100 : 0;
            tfoot.innerHTML = `<tr><td colspan="3" class="p-3 text-right">TOTAL</td><td class="p-3">${totals.hazir}</td><td class="p-3">${totals.pass}</td><td class="p-3">${gPer.toFixed(2)}%</td><td class="p-3 urdu-font">${getJamiaKefiyat(gPer)}</td></tr>`;
        } 
        else if (layout === 'class') {
            thead.innerHTML = `<th class="p-2 border">Region</th><th class="p-2 border">User</th><th class="p-2 border text-right">جامعہ</th><th class="p-2 border text-right">درجہ</th><th class="p-2 border">حاضر</th><th class="p-2 border text-emerald-500">کامیاب</th><th class="p-2 border">فیصد</th>`;
            data.forEach(d => {
                const kul = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                const pass = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                const hazir = kul - num(d.ghaib); const per = hazir ? (pass/hazir)*100 : 0;
                totals.hazir += hazir; totals.pass += pass;
                tbody.innerHTML += `<tr class="text-sm border-b hover:bg-gray-50"><td class="p-2 border text-gray-500">${d.region}</td><td class="p-2 border text-gray-500">${d.userName}</td><td class="p-2 border urdu-font text-right">${d.jamia}</td><td class="p-2 border urdu-font text-right">${d.darjah}</td><td class="p-2 border">${hazir}</td><td class="p-2 border text-emerald-600 font-bold">${pass}</td><td class="p-2 border font-bold">${per.toFixed(1)}%</td></tr>`;
            });
            const gPer = totals.hazir ? (totals.pass/totals.hazir)*100 : 0;
            tfoot.innerHTML = `<tr><td colspan="4" class="p-2 text-right">TOTAL</td><td class="p-2 border">${totals.hazir}</td><td class="p-2 border">${totals.pass}</td><td class="p-2 border">${gPer.toFixed(1)}%</td></tr>`;
        }
        else {
            thead.innerHTML = `<th class="p-2 border">Region</th><th class="p-2 border">User</th><th class="p-2 border text-center">جامعہ</th><th class="p-2 border text-center">استاد</th><th class="p-2 border text-right">مضمون</th><th class="p-2 border text-center">درجہ</th><th class="p-2 border">کل</th><th class="p-2 border text-emerald-400">کامیاب</th><th class="p-2 border">فیصد</th><th class="p-2 border">کیفیت</th><th class="p-2 border bg-emerald-900">مجموعی</th>`;
            data.forEach(d => {
                (d.data || []).forEach(tEntry => {
                    const ps = tEntry.periods || []; const rSpan = ps.length || 1;
                    let tT = 0, tP = 0; ps.forEach(p => { tT += num(p.total); tP += num(p.passed); });
                    const tPer = tT ? (tP/tT)*100 : 0;
                    ps.forEach((p, idx) => {
                        const sPer = num(p.total) ? (num(p.passed)/num(p.total))*100 : 0;
                        tbody.innerHTML += `<tr class="hover:bg-gray-50 text-center text-[15px] border-b">
                            ${idx === 0 ? `<td class="p-2 border text-gray-500" rowspan="${rSpan}">${d.region}</td><td class="p-2 border text-gray-500" rowspan="${rSpan}">${d.userName}</td><td class="p-2 border font-bold text-center font-sans text-gray-800" rowspan="${rSpan}">${d.jamia}</td><td class="p-2 border font-bold text-center font-sans text-blue-700" rowspan="${rSpan}">${tEntry.teacher}</td>` : ''}
                            <td class="p-2 border text-right urdu-font">${p.subject || '-'}</td><td class="p-2 border text-center urdu-font">${p.class || p['class'] || '-'}</td><td class="p-2 border">${num(p.total)}</td><td class="p-2 border text-emerald-600">${num(p.passed)}</td><td class="p-2 border">${sPer.toFixed(1)}%</td><td class="p-2 border urdu-font" style="color:${getKefiyatColor(sPer)}">${getJamiaKefiyat(sPer)}</td>
                            ${idx === 0 ? `<td class="p-2 border bg-emerald-50 font-bold" rowspan="${rSpan}"><div style="color:${getKefiyatColor(tPer)}">${tPer.toFixed(1)}%</div><div class="text-[12px] urdu-font" style="color:${getKefiyatColor(tPer)}">${getJamiaKefiyat(tPer)}</div></td>` : ''}</tr>`;
                    });
                });
            });
        }
    }
}

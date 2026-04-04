// ✅ RE-ORGANIZED ADMIN FINAL ANALYSIS WITH SUB-TABS & DASHBOARD SUMMARY

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

    // 🏗️ UI STRUCTURE (With Sub-Tabs)
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
                <div id="filter-region-div">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Region</label>
                    <select id="admin-region-filter" class="w-full p-2.5 border rounded-lg">
                        <option value="all">All Regions</option>
                        ${regions.map(r => `<option value="${r}">${r}</option>`).join('')}
                    </select>
                </div>
                <div id="filter-layout-div" class="hidden">
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

    // 🎮 TAB SWITCHING LOGIC
    const btnDashboard = document.getElementById("tab-dashboard");
    const btnReports = document.getElementById("tab-reports");
    const dashboardView = document.getElementById("dashboard-view");
    const reportsView = document.getElementById("reports-view");
    const filterLayoutDiv = document.getElementById("filter-layout-div");

    btnDashboard.onclick = () => {
        btnDashboard.classList.add("active-sub-tab");
        btnReports.classList.remove("active-sub-tab");
        dashboardView.classList.remove("hidden");
        reportsView.classList.add("hidden");
        filterLayoutDiv.classList.add("hidden");
    };

    btnReports.onclick = () => {
        btnReports.classList.add("active-sub-tab");
        btnDashboard.classList.remove("active-sub-tab");
        reportsView.classList.remove("hidden");
        dashboardView.classList.add("hidden");
        filterLayoutDiv.classList.remove("hidden");
    };

    // 📊 SHOW ANALYSIS EXECUTION
    document.getElementById("admin-show-btn").onclick = async () => {
        const examType = document.getElementById("admin-exam-type").value;
        const examYear = document.getElementById("admin-exam-year").value;
        const selRegion = document.getElementById("admin-region-filter").value;
        const layout = document.getElementById("admin-layout").value;
        
        const loader = document.getElementById("admin-loader");
        loader.classList.remove("hidden");

        try {
            // Fetch Class Wise results as base for summary
            const q = query(collection(db, "class_wise_results"), where("examType", "==", examType), where("examYear", "==", examYear));
            const snapshot = await getDocs(q);
            
            let dataList = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                const context = getJamiaContext(d.jamia);
                if (selRegion === "all" || context.region === selRegion) {
                    dataList.push({ ...d, ...context });
                }
            });

            if (btnDashboard.classList.contains("active-sub-tab")) {
                renderDashboardSummary(dataList, selRegion, allUsers);
            } else {
                // If on reports tab, handle teacher wise fetch if selected
                if (layout === 'teacher') {
                   const tQ = query(collection(db, "asatiza_wise_results"), where("examType", "==", examType), where("examYear", "==", examYear));
                   const tSnap = await getDocs(tQ);
                   let tList = [];
                   tSnap.forEach(doc => {
                       const d = doc.data();
                       const ctx = getJamiaContext(d.jamia);
                       if (selRegion === "all" || ctx.region === selRegion) tList.push({...d, ...ctx});
                   });
                   renderDetailedReports(tList, 'teacher');
                } else {
                   renderDetailedReports(dataList, layout);
                }
            }
        } catch (e) { alert(e.message); }
        loader.classList.add("hidden");
    };

    // 📈 FUNCTION: DASHBOARD SUMMARY
    function renderDashboardSummary(data, selRegion, users) {
        dashboardView.innerHTML = "";
        
        // 1. Region Wise Summary
        let regionStats = {};
        data.forEach(d => {
            if (!regionStats[d.region]) regionStats[d.region] = { kul: 0, pass: 0, hazir: 0 };
            const kul = (parseInt(d.mumtazSharf)||0) + (parseInt(d.mumtaz)||0) + (parseInt(d.jayyidJidda)||0) + (parseInt(d.jayyid)||0) + (parseInt(d.maqbool)||0) + (parseInt(d.majazZimni)||0) + (parseInt(d.nakam)||0) + (parseInt(d.ghaib)||0);
            const pass = (parseInt(d.mumtazSharf)||0) + (parseInt(d.mumtaz)||0) + (parseInt(d.jayyidJidda)||0) + (parseInt(d.jayyid)||0) + (parseInt(d.maqbool)||0);
            const hazir = Math.max(0, kul - (parseInt(d.ghaib)||0));
            regionStats[d.region].kul += kul;
            regionStats[d.region].pass += pass;
            regionStats[d.region].hazir += hazir;
        });

        // 2. Submission Tracking (Kaun baqi hai)
        let submissionHtml = "";
        const filteredUsers = selRegion === "all" ? users : users.filter(u => u.region === selRegion);
        
        filteredUsers.sort((a,b) => (a.name||'').localeCompare(b.name||'')).forEach(u => {
            const userJamiaat = u.jamiaatList || [];
            if (userJamiaat.length === 0) return;

            let jamiaRows = "";
            userJamiaat.forEach(j => {
                const jName = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                const isSubmitted = data.some(d => d.jamia.trim().toLowerCase() === jName.trim().toLowerCase());
                jamiaRows += `
                    <div class="flex justify-between p-2 border-b text-sm">
                        <span class="urdu-font">${jName}</span>
                        ${isSubmitted ? '<span class="text-green-600 font-bold">✅ Received</span>' : '<span class="text-red-500 font-bold">❌ Missing</span>'}
                    </div>`;
            });

            submissionHtml += `
                <div class="bg-white p-4 rounded-lg border shadow-sm">
                    <h5 class="font-bold text-indigo-700 border-b pb-2 mb-2">${u.name || u.email}</h5>
                    ${jamiaRows}
                </div>`;
        });

        dashboardView.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-5 rounded-xl border">
                    <h4 class="font-bold text-gray-700 mb-4 border-b pb-2">🌍 Region Wise Summary</h4>
                    <table class="w-full text-sm">
                        <thead class="bg-gray-100"><tr><th class="p-2 border">Region</th><th class="p-2 border">Hazir</th><th class="p-2 border">Pass</th><th class="p-2 border">%</th></tr></thead>
                        <tbody>
                            ${Object.keys(regionStats).map(r => {
                                const s = regionStats[r];
                                const per = s.hazir ? (s.pass/s.hazir)*100 : 0;
                                return `<tr><td class="p-2 border font-bold">${r}</td><td class="p-2 border">${s.hazir}</td><td class="p-2 border">${s.pass}</td><td class="p-2 border font-bold text-teal-600">${per.toFixed(1)}%</td></tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="bg-white p-5 rounded-xl border">
                    <h4 class="font-bold text-gray-700 mb-4 border-b pb-2">📋 Submission Status (Jamiaat List)</h4>
                    <div class="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2">${submissionHtml}</div>
                </div>
            </div>`;
    }

    // 📝 FUNCTION: DETAILED REPORTS (Jamia/Class/Teacher)
    function renderDetailedReports(data, layout) {
        const thead = document.getElementById("admin-head");
        const tbody = document.getElementById("admin-body");
        const tfoot = document.getElementById("admin-foot");
        tbody.innerHTML = ""; tfoot.innerHTML = "";
        
        let totals = { kul:0, hazir:0, pass:0, nakam:0 };
        const num = (v) => parseInt(v) || 0;

        if (layout === 'jamia') {
            thead.innerHTML = `<th class="p-3 border">Region</th><th class="p-3 border">User</th><th class="p-3 border text-right">جامعہ</th><th class="p-3 border">حاضر</th><th class="p-3 border">کامیاب</th><th class="p-3 border">فیصد</th><th class="p-3 border">کیفیت</th>`;
            let stats = {};
            data.forEach(d => {
                const kul = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                const pass = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                const hazir = Math.max(0, kul - num(d.ghaib));
                if (!stats[d.jamia]) stats[d.jamia] = { hazir:0, pass:0, region:d.region, user:d.userName };
                stats[d.jamia].hazir += hazir; stats[d.jamia].pass += pass;
            });
            for (let j in stats) {
                const s = stats[j]; const per = s.hazir ? (s.pass/s.hazir)*100 : 0;
                totals.hazir += s.hazir; totals.pass += s.pass;
                tbody.innerHTML += `<tr class="hover:bg-blue-50 transition"><td class="p-2 border text-xs text-gray-500">${s.region}</td><td class="p-2 border text-xs text-gray-500">${s.user}</td><td class="p-2 border font-bold text-right urdu-font">${j}</td><td class="p-2 border">${s.hazir}</td><td class="p-2 border text-green-600 font-bold">${s.pass}</td><td class="p-2 border font-bold">${per.toFixed(2)}%</td><td class="p-2 border urdu-font" style="color:${getKefiyatColor(per)}">${getJamiaKefiyat(per)}</td></tr>`;
            }
            const gPer = totals.hazir ? (totals.pass/totals.hazir)*100 : 0;
            tfoot.innerHTML = `<tr><td colspan="3" class="p-3 text-right">TOTAL</td><td class="p-3">${totals.hazir}</td><td class="p-3">${totals.pass}</td><td class="p-3">${gPer.toFixed(2)}%</td><td class="p-3 urdu-font">${getJamiaKefiyat(gPer)}</td></tr>`;
        } 
        else if (layout === 'class') {
            thead.innerHTML = `<th class="p-2 border">Region</th><th class="p-2 border">User</th><th class="p-2 border text-right">جامعہ</th><th class="p-2 border text-right">درجہ</th><th class="p-2 border">تعداد</th><th class="p-2 border text-emerald-500">کامیاب</th><th class="p-2 border text-red-500">ناکام</th><th class="p-2 border">فیصد</th>`;
            data.forEach(d => {
                const kul = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                const pass = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                const hazir = kul - num(d.ghaib); const per = hazir ? (pass/hazir)*100 : 0;
                totals.hazir += hazir; totals.pass += pass;
                tbody.innerHTML += `<tr class="text-sm border-b hover:bg-gray-50"><td class="p-2 border text-gray-500">${d.region}</td><td class="p-2 border text-gray-500">${d.userName}</td><td class="p-2 border urdu-font text-right">${d.jamia}</td><td class="p-2 border urdu-font text-right">${d.darjah}</td><td class="p-2 border">${hazir}</td><td class="p-2 border text-emerald-600">${pass}</td><td class="p-2 border text-red-500">${hazir-pass}</td><td class="p-2 border font-bold">${per.toFixed(1)}%</td></tr>`;
            });
        }
        else {
            // Asatiza Wise logic (previously built)
            thead.innerHTML = `<th class="p-2 border">Region</th><th class="p-2 border">User</th><th class="p-2 border text-center">جامعہ</th><th class="p-2 border text-center">استاد</th><th class="p-2 border text-right">مضمون</th><th class="p-2 border text-center">درجہ</th><th class="p-2 border">کل</th><th class="p-2 border text-emerald-400">کامیاب</th><th class="p-2 border">فیصد</th><th class="p-2 border">کیfیت</th><th class="p-2 border bg-emerald-900">مجموعی</th>`;
            data.forEach(d => {
                (d.data || []).forEach(tEntry => {
                    const ps = tEntry.periods || []; const rSpan = ps.length || 1;
                    let tT = 0, tP = 0; ps.forEach(p => { tT += num(p.total); tP += num(p.passed); });
                    const tPer = tT ? (tP/tT)*100 : 0;
                    ps.forEach((p, idx) => {
                        const sPer = num(p.total) ? (num(p.passed)/num(p.total))*100 : 0;
                        tbody.innerHTML += `<tr class="hover:bg-gray-50 text-center text-[15px] border-b">
                            ${idx === 0 ? `<td class="p-2 border text-gray-500 rowspan="${rSpan}">${d.region}</td><td class="p-2 border text-gray-500" rowspan="${rSpan}">${d.userName}</td><td class="p-2 border font-bold text-center font-sans text-gray-800" rowspan="${rSpan}">${d.jamia}</td><td class="p-2 border font-bold text-center font-sans text-blue-700" rowspan="${rSpan}">${tEntry.teacher}</td>` : ''}
                            <td class="p-2 border text-right urdu-font">${p.subject || '-'}</td><td class="p-2 border text-center urdu-font">${p.class || p['class'] || '-'}</td><td class="p-2 border">${num(p.total)}</td><td class="p-2 border text-emerald-600">${num(p.passed)}</td><td class="p-2 border">${sPer.toFixed(1)}%</td><td class="p-2 border urdu-font" style="color:${getKefiyatColor(sPer)}">${getJamiaKefiyat(sPer)}</td>
                            ${idx === 0 ? `<td class="p-2 border bg-emerald-50 font-bold" rowspan="${rSpan}"><div style="color:${getKefiyatColor(tPer)}">${tPer.toFixed(1)}%</div><div class="text-[12px] urdu-font" style="color:${getKefiyatColor(tPer)}">${getJamiaKefiyat(tPer)}</div></td>` : ''}</tr>`;
                    });
                });
            });
        }
    }
}

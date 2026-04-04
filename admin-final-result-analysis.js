// ✅ UPDATED ADMIN RESULT ANALYSIS (With Region & User Filters/Columns)

import {
    collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 🔹 KEFIYAT LOGIC
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

// 🚀 MAIN FUNCTION
export async function initAdminResultAnalysis(db, containerId) {

    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Get unique regions and users from global allUsersData (if available)
    const allUsers = window.allUsersData || [];
    const regions = [...new Set(allUsers.map(u => u.region).filter(r => r))].sort();
    const users = allUsers.map(u => ({ id: u.id, name: u.name || u.email })).sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = `
    <div class="max-w-7xl mx-auto bg-white p-4 rounded-xl shadow border">
        <div class="bg-indigo-50 p-4 rounded border mb-4">
            <h4 class="font-bold text-indigo-700 mb-3 urdu-font text-right">فائنل رزلٹ اینالائسس (ایڈمن)</h4>

            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <select id="admin-exam-type" class="p-2 border rounded urdu-font">
                    <option value="ششماہی امتحان">ششماہی امتحان</option>
                    <option value="سالانہ امتحان">سالانہ امتحان</option>
                </select>

                <select id="admin-exam-year" class="p-2 border rounded">
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26" selected>2025-26</option>
                </select>

                <select id="admin-region-filter" class="p-2 border rounded">
                    <option value="all">All Regions</option>
                    ${regions.map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>

                <select id="admin-user-filter" class="p-2 border rounded">
                    <option value="all">All Users</option>
                    ${users.map(u => `<option value="${u.name}">${u.name}</option>`).join('')}
                </select>

                <select id="admin-layout" class="p-2 border rounded">
                    <option value="jamia">Jamia Wise</option>
                    <option value="class">Class Wise</option>
                    <option value="teacher">Asatiza Wise</option>
                </select>
            </div>

            <button id="admin-show-btn" class="mt-3 bg-indigo-600 text-white px-4 py-2 rounded w-full font-bold">
                Show Analysis
            </button>
        </div>

        <div id="admin-loader" class="hidden text-center py-6"><div class="loader mx-auto"></div> Loading data...</div>

        <div id="admin-report" class="hidden overflow-x-auto">
            <table class="w-full text-center border text-sm" id="admin-table">
                <thead id="admin-head" class="bg-gray-800 text-white"></thead>
                <tbody id="admin-body" class="divide-y"></tbody>
            </table>
        </div>
    </div>`;

    document.getElementById("admin-show-btn").onclick = async () => {
        const examType = document.getElementById("admin-exam-type").value;
        const examYear = document.getElementById("admin-exam-year").value;
        const layout = document.getElementById("admin-layout").value;
        const selectedRegion = document.getElementById("admin-region-filter").value;
        const selectedUser = document.getElementById("admin-user-filter").value;

        const loader = document.getElementById("admin-loader");
        const report = document.getElementById("admin-report");
        const thead = document.getElementById("admin-head");
        const tbody = document.getElementById("admin-body");

        loader.classList.remove("hidden");
        report.classList.add("hidden");

        try {
            const collectionName = (layout === 'teacher') ? "asatiza_wise_results" : "class_wise_results";

            const q = query(
                collection(db, collectionName),
                where("examType", "==", examType),
                where("examYear", "==", examYear),
                orderBy("timestamp", "desc")
            );

            const snapshot = await getDocs(q);
            let latestDataMap = new Map();

            snapshot.forEach(docSnap => {
                const d = docSnap.data();

                // 🔹 Data Filtering (Region & User)
                if (selectedRegion !== "all" && d.region !== selectedRegion) return;
                if (selectedUser !== "all" && (d.userName || d.user) !== selectedUser) return;

                let key = layout === 'teacher'
                    ? `${d.jamia}_${d.teacher}_${d.subject}_${d.darjah}`
                    : `${d.jamia}_${d.darjah}`;

                if (!latestDataMap.has(key)) {
                    latestDataMap.set(key, d);
                }
            });

            const num = (v) => parseInt(v) || 0;
            let rowsHtml = "";

            // 🔥 JAMIA WISE
            if (layout === 'jamia') {
                thead.innerHTML = `
                <tr>
                    <th class="p-2 border">#</th>
                    <th class="p-2 border">Region</th>
                    <th class="p-2 border">User</th>
                    <th class="p-2 border">Jamia</th>
                    <th class="p-2 border">Total</th>
                    <th class="p-2 border">Present</th>
                    <th class="p-2 border">Pass</th>
                    <th class="p-2 border">%</th>
                    <th class="p-2 border">Status</th>
                </tr>`;

                let stats = {};
                latestDataMap.forEach(d => {
                    const total = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                    const passed = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);

                    if (!stats[d.jamia]) {
                        stats[d.jamia] = { total: 0, passed: 0, ghaib: 0, region: d.region || '-', user: d.userName || d.user || '-' };
                    }
                    stats[d.jamia].total += total;
                    stats[d.jamia].passed += passed;
                    stats[d.jamia].ghaib += num(d.ghaib);
                });

                let i = 1;
                for (let j in stats) {
                    const s = stats[j];
                    const present = Math.max(0, s.total - s.ghaib);
                    const percent = present ? (s.passed / present) * 100 : 0;
                    rowsHtml += `
                    <tr>
                        <td class="p-2 border">${i++}</td>
                        <td class="p-2 border">${s.region}</td>
                        <td class="p-2 border">${s.user}</td>
                        <td class="p-2 border font-bold urdu-font">${j}</td>
                        <td class="p-2 border">${s.total}</td>
                        <td class="p-2 border">${present}</td>
                        <td class="p-2 border">${s.passed}</td>
                        <td class="p-2 border font-bold">${percent.toFixed(2)}%</td>
                        <td class="p-2 border font-bold" style="color:${getKefiyatColor(percent)}">${getJamiaKefiyat(percent)}</td>
                    </tr>`;
                }
            }

            // 🔥 CLASS WISE
            else if (layout === 'class') {
                thead.innerHTML = `
                <tr>
                    <th class="p-2 border">Region</th>
                    <th class="p-2 border">User</th>
                    <th class="p-2 border">Jamia</th>
                    <th class="p-2 border">Class</th>
                    <th class="p-2 border">Total</th>
                    <th class="p-2 border">Pass</th>
                    <th class="p-2 border">%</th>
                </tr>`;

                latestDataMap.forEach(d => {
                    const total = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                    const passed = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                    const percent = total ? (passed / total) * 100 : 0;

                    rowsHtml += `
                    <tr>
                        <td class="p-2 border">${d.region || '-'}</td>
                        <td class="p-2 border">${d.userName || d.user || '-'}</td>
                        <td class="p-2 border urdu-font">${d.jamia}</td>
                        <td class="p-2 border urdu-font">${d.darjah}</td>
                        <td class="p-2 border">${total}</td>
                        <td class="p-2 border">${passed}</td>
                        <td class="p-2 border font-bold">${percent.toFixed(1)}%</td>
                    </tr>`;
                });
            }

            // 🔥 ASATIZA WISE
            else {
                thead.innerHTML = `
                <tr>
                    <th class="p-2 border">Region</th>
                    <th class="p-2 border">User</th>
                    <th class="p-2 border">Jamia</th>
                    <th class="p-2 border">Teacher</th>
                    <th class="p-2 border">Total</th>
                    <th class="p-2 border">Pass</th>
                    <th class="p-2 border">%</th>
                </tr>`;

                latestDataMap.forEach(d => {
                    if (!d.data) return;
                    const region = d.region || '-';
                    const user = d.userName || d.user || '-';

                    d.data.forEach(t => {
                        let total = 0, pass = 0;
                        (t.periods || []).forEach(p => {
                            total += num(p.total);
                            pass += num(p.passed);
                        });
                        let per = total ? (pass / total) * 100 : 0;
                        rowsHtml += `
                        <tr>
                            <td class="p-2 border">${region}</td>
                            <td class="p-2 border">${user}</td>
                            <td class="p-2 border urdu-font">${d.jamia}</td>
                            <td class="p-2 border urdu-font">${t.teacher}</td>
                            <td class="p-2 border">${total}</td>
                            <td class="p-2 border">${pass}</td>
                            <td class="p-2 border font-bold">${per.toFixed(1)}%</td>
                        </tr>`;
                    });
                });
            }

            tbody.innerHTML = rowsHtml || `<tr><td colspan="9" class="p-4">No Data Found for selected filters</td></tr>`;
            loader.classList.add("hidden");
            report.classList.remove("hidden");

        } catch (err) {
            console.error(err);
            loader.classList.add("hidden");
            alert("Error: " + err.message);
        }
    };
}

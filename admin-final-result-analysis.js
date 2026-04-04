// ✅ FULL ADMIN RESULT ANALYSIS (EXACT SAME AS USER VERSION - ALL USERS DATA)

import {
    collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 🔹 KEFIYAT LOGIC (same)
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

    container.innerHTML = `
    <div class="max-w-7xl mx-auto bg-white p-4 rounded-xl shadow border">

        <div class="bg-indigo-50 p-4 rounded border mb-4">
            <h4 class="font-bold text-indigo-700 mb-3">Admin Result Analysis</h4>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select id="admin-exam-type" class="p-2 border rounded">
                    <option value="ششماہی امتحان">ششماہی امتحان</option>
                    <option value="سالانہ امتحان">سالانہ امتحان</option>
                </select>

                <select id="admin-exam-year" class="p-2 border rounded">
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26" selected>2025-26</option>
                </select>

                <select id="admin-layout" class="p-2 border rounded">
                    <option value="jamia">Jamia Wise</option>
                    <option value="class">Class Wise</option>
                    <option value="teacher">Asatiza Wise</option>
                </select>
            </div>

            <button id="admin-show-btn" class="mt-3 bg-indigo-600 text-white px-4 py-2 rounded w-full">
                Show Analysis
            </button>
        </div>

        <div id="admin-loader" class="hidden text-center py-6">Loading...</div>

        <div id="admin-report" class="hidden">
            <table class="w-full text-center border" id="admin-table">
                <thead id="admin-head"></thead>
                <tbody id="admin-body"></tbody>
            </table>
        </div>

    </div>`;

    document.getElementById("admin-show-btn").onclick = async () => {

        const examType = document.getElementById("admin-exam-type").value;
        const examYear = document.getElementById("admin-exam-year").value;
        const layout = document.getElementById("admin-layout").value;

        const loader = document.getElementById("admin-loader");
        const report = document.getElementById("admin-report");
        const thead = document.getElementById("admin-head");
        const tbody = document.getElementById("admin-body");

        loader.classList.remove("hidden");
        report.classList.add("hidden");
        tbody.innerHTML = "";

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
                    <th>#</th>
                    <th>Jamia</th>
                    <th>Total</th>
                    <th>Present</th>
                    <th>Pass</th>
                    <th>Zimni</th>
                    <th>Nakam</th>
                    <th>%</th>
                    <th>Status</th>
                </tr>`;

                let stats = {};

                latestDataMap.forEach(d => {

                    const total =
                        num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+
                        num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+
                        num(d.nakam)+num(d.ghaib);

                    const passed =
                        num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+
                        num(d.jayyid)+num(d.maqbool);

                    if (!stats[d.jamia]) {
                        stats[d.jamia] = { total: 0, passed: 0, ghaib: 0, nakam: 0, zimni: 0 };
                    }

                    stats[d.jamia].total += total;
                    stats[d.jamia].passed += passed;
                    stats[d.jamia].ghaib += num(d.ghaib);
                    stats[d.jamia].nakam += num(d.nakam);
                    stats[d.jamia].zimni += num(d.majazZimni);
                });

                let i = 1;

                for (let j in stats) {

                    const s = stats[j];
                    const present = Math.max(0, s.total - s.ghaib);
                    const percent = present ? (s.passed / present) * 100 : 0;

                    rowsHtml += `
                    <tr>
                        <td>${i++}</td>
                        <td>${j}</td>
                        <td>${s.total}</td>
                        <td>${present}</td>
                        <td>${s.passed}</td>
                        <td>${s.zimni}</td>
                        <td>${s.nakam}</td>
                        <td>${percent.toFixed(2)}%</td>
                        <td style="color:${getKefiyatColor(percent)}">
                            ${getJamiaKefiyat(percent)}
                        </td>
                    </tr>`;
                }
            }

            // 🔥 CLASS WISE
            else if (layout === 'class') {

                thead.innerHTML = `
                <tr>
                    <th>Jamia</th>
                    <th>Class</th>
                    <th>Total</th>
                    <th>Pass</th>
                    <th>%</th>
                </tr>`;

                latestDataMap.forEach(d => {

                    const total =
                        num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+
                        num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+
                        num(d.nakam)+num(d.ghaib);

                    const passed =
                        num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+
                        num(d.jayyid)+num(d.maqbool);

                    const percent = total ? (passed / total) * 100 : 0;

                    rowsHtml += `
                    <tr>
                        <td>${d.jamia}</td>
                        <td>${d.darjah}</td>
                        <td>${total}</td>
                        <td>${passed}</td>
                        <td>${percent.toFixed(1)}%</td>
                    </tr>`;
                });
            }

            // 🔥 ASATIZA WISE
            else {

                thead.innerHTML = `
                <tr>
                    <th>Jamia</th>
                    <th>Teacher</th>
                    <th>Total</th>
                    <th>Pass</th>
                    <th>%</th>
                </tr>`;

                latestDataMap.forEach(d => {

                    if (!d.data) return;

                    d.data.forEach(t => {

                        let total = 0;
                        let pass = 0;

                        (t.periods || []).forEach(p => {
                            total += num(p.total);
                            pass += num(p.passed);
                        });

                        let per = total ? (pass / total) * 100 : 0;

                        rowsHtml += `
                        <tr>
                            <td>${d.jamia}</td>
                            <td>${t.teacher}</td>
                            <td>${total}</td>
                            <td>${pass}</td>
                            <td>${per.toFixed(1)}%</td>
                        </tr>`;
                    });
                });
            }

            tbody.innerHTML = rowsHtml || `<tr><td colspan="5">No Data</td></tr>`;

            loader.classList.add("hidden");
            report.classList.remove("hidden");

        } catch (err) {
            console.error(err);
            loader.classList.add("hidden");
            alert("Error: " + err.message);
        }
    };
}

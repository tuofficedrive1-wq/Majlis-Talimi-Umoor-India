// ✅ UPDATED ADMIN FINAL RESULT ANALYSIS (MATCHING RESULT-ANALYSIS UI + LOGIC)

import {
    collection,
    query,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 🔥 Kefiyat Logic (same as result-analysis)
const getJamiaKefiyat = (p) => {
    let val = parseFloat(p);
    if (val >= 85) return "Mumtaz Sharf";
    if (val >= 76) return "Mumtaz";
    if (val >= 61) return "Behtar";
    if (val >= 40) return "Munasib";
    return "Kamzor";
};

const getKefiyatColor = (p) => {
    if (p >= 85) return "text-green-700";
    if (p >= 70) return "text-blue-600";
    if (p >= 60) return "text-yellow-600";
    if (p >= 40) return "text-purple-600";
    return "text-red-600";
};


// 🚀 MAIN

document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("btn-generate-final-analysis");
    const container = document.getElementById("final-analysis-container");

    if (!btn || !container) return;

    btn.addEventListener("click", async () => {

        const db = window.db;

        const type = document.getElementById("final-analysis-type-select").value;
        const region = document.getElementById("final-filter-region").value;
        const user = document.getElementById("final-filter-user").value;
        const jamia = document.getElementById("final-filter-jamia").value;

        if (!db) return alert("DB not loaded");

        container.innerHTML = `
        <div class="bg-white p-4 rounded shadow border">
            <h2 class="text-lg font-bold text-indigo-700 mb-3">Final Result Analysis</h2>
            <div id="table-area">Loading...</div>
        </div>`;

        try {

            const collectionName = (type === "asatiza-wise")
                ? "asatiza_wise_results"
                : "class_wise_results";

            const q = query(collection(db, collectionName), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);

            // 🔥 IMPORTANT: Latest Data System
            let latestDataMap = new Map();

            snapshot.forEach(doc => {
                const d = doc.data();

                if (region !== "all" && d.region !== region) return;
                if (user !== "all" && (d.userName || d.userId) !== user) return;
                if (jamia !== "all" && d.jamia !== jamia) return;

                let key;

                if (type === "asatiza-wise") {
                    key = `${d.jamia}_${d.teacher}_${d.subject}_${d.darjah}`;
                } else {
                    key = `${d.jamia}_${d.darjah}`;
                }

                if (!latestDataMap.has(key)) {
                    latestDataMap.set(key, d);
                }
            });

            const finalData = Array.from(latestDataMap.values());

            if (type === "jamia-wise") renderJamiaWise(finalData);
            else if (type === "class-wise") renderClassWise(finalData);
            else if (type === "asatiza-wise") renderAsatizaWise(finalData);

        } catch (err) {
            console.error(err);
            document.getElementById("table-area").innerHTML = "Error loading";
        }

    });
});


// ===================== JAMIA WISE =====================

function renderJamiaWise(data) {

    let stats = {};

    data.forEach(d => {

        const total =
            (d.mumtazSharf||0)+(d.mumtaz||0)+(d.jayyidJidda||0)+
            (d.jayyid||0)+(d.maqbool||0)+(d.majazZimni||0)+
            (d.nakam||0)+(d.ghaib||0);

        const passed =
            (d.mumtazSharf||0)+(d.mumtaz||0)+(d.jayyidJidda||0)+
            (d.jayyid||0)+(d.maqbool||0);

        if (!stats[d.jamia]) {
            stats[d.jamia] = { total: 0, passed: 0, ghaib: 0, nakam: 0, zimni: 0 };
        }

        stats[d.jamia].total += total;
        stats[d.jamia].passed += passed;
        stats[d.jamia].ghaib += (d.ghaib || 0);
        stats[d.jamia].nakam += (d.nakam || 0);
        stats[d.jamia].zimni += (d.majazZimni || 0);
    });

    let html = `
    <table class="w-full border-collapse text-sm bg-white shadow">
    <thead class="bg-indigo-100">
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
    </tr>
    </thead><tbody>`;

    let i = 1;

    for (let j in stats) {

        const s = stats[j];

        const present = s.total - s.ghaib;
        const percent = present ? (s.passed / present) * 100 : 0;

        html += `
        <tr class="text-center">
            <td>${i++}</td>
            <td class="font-bold">${j}</td>
            <td>${s.total}</td>
            <td>${present}</td>
            <td class="text-green-700 font-bold">${s.passed}</td>
            <td class="text-purple-600">${s.zimni}</td>
            <td class="text-red-600">${s.nakam}</td>
            <td class="font-bold">${percent.toFixed(2)}%</td>
            <td class="${getKefiyatColor(percent)} font-bold">
                ${getJamiaKefiyat(percent)}
            </td>
        </tr>`;
    }

    html += "</tbody></table>";

    document.getElementById("table-area").innerHTML = html;
}


// ===================== CLASS WISE =====================

function renderClassWise(data) {

    let html = `
    <table class="w-full border text-sm">
    <tr>
        <th>Jamia</th>
        <th>Class</th>
        <th>Total</th>
        <th>Pass</th>
        <th>%</th>
    </tr>`;

    data.forEach(d => {

        const total =
            (d.mumtazSharf||0)+(d.mumtaz||0)+(d.jayyidJidda||0)+
            (d.jayyid||0)+(d.maqbool||0)+(d.majazZimni||0)+
            (d.nakam||0)+(d.ghaib||0);

        const passed =
            (d.mumtazSharf||0)+(d.mumtaz||0)+(d.jayyidJidda||0)+
            (d.jayyid||0)+(d.maqbool||0);

        const percent = total ? (passed / total) * 100 : 0;

        html += `
        <tr>
            <td>${d.jamia || "-"}</td>
            <td>${d.darjah || "-"}</td>
            <td>${total}</td>
            <td>${passed}</td>
            <td>${percent.toFixed(1)}%</td>
        </tr>`;
    });

    html += `</table>`;

    document.getElementById("table-area").innerHTML = html;
}


// ===================== ASATIZA =====================

function renderAsatizaWise(data) {

    let html = `
    <table class="w-full border text-sm">
    <tr>
        <th>Jamia</th>
        <th>Teacher</th>
        <th>Total</th>
        <th>Pass</th>
        <th>%</th>
    </tr>`;

    data.forEach(d => {

        if (!d.data) return;

        d.data.forEach(t => {

            let total = 0;
            let pass = 0;

            (t.periods || []).forEach(p => {
                total += parseInt(p.total) || 0;
                pass += parseInt(p.passed) || 0;
            });

            let per = total ? (pass / total) * 100 : 0;

            html += `
            <tr>
                <td>${d.jamia}</td>
                <td>${t.teacher}</td>
                <td>${total}</td>
                <td>${pass}</td>
                <td>${per.toFixed(1)}%</td>
            </tr>`;
        });

    });

    html += `</table>`;

    document.getElementById("table-area").innerHTML = html;
}

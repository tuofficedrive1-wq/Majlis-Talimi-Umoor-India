import {
    collection,
    query,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-generate-final-analysis");
    const container = document.getElementById("final-analysis-container");

    if (!btn || !container) return;

    // Page load hote hi filters ko data se bharne ke liye function call
    // Hum "class_wise_results" ko base maan kar filters bhar rahe hain
    initFilters();

    btn.addEventListener("click", async () => {
        const db = window.db;
        const type = document.getElementById("final-analysis-type-select").value;
        const region = document.getElementById("final-filter-region").value;
        const user = document.getElementById("final-filter-user").value;
        const jamia = document.getElementById("final-filter-jamia").value;
        const year = document.getElementById("final-filter-year")?.value || "all";
        const examType = document.getElementById("final-filter-exam-type")?.value || "all";

        if (!db) { alert("DB load nahi hua"); return; }
        if (!type) { alert("Report type select karein"); return; }

        container.innerHTML = "Loading...";

        try {
            const collectionName = (type === "asatiza-wise") ? "asatiza_wise_results" : "class_wise_results";
            const q = query(collection(db, collectionName), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);

            let data = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                // Matching Filters
                if (region !== "all" && d.region !== region) return;
                if (user !== "all" && (d.userName || d.userId) !== user) return;
                if (jamia !== "all" && d.jamia !== jamia) return;
                if (year !== "all" && d.year !== year) return;
                if (examType !== "all" && d.examType !== examType) return;

                data.push(d);
            });

            if (type === "jamia-wise") renderJamiaWise(data);
            else if (type === "class-wise") renderClassWise(data);
            else if (type === "asatiza-wise") renderAsatizaWise(data);
            else if (type === "ibtidaiya") await renderIbtidaiya(db, jamia);

        } catch (err) {
            console.error(err);
            container.innerHTML = "Error loading data";
        }
    });
});

/* =========================
   🔍 AUTO-POPULATE FILTERS
========================= */
async function initFilters() {
    const db = window.db;
    if (!db) return;

    try {
        // Class wise results se unique values nikalna
        const snapshot = await getDocs(collection(db, "class_wise_results"));
        
        let regions = new Set();
        let users = new Set();
        let jamiaat = new Set();

        snapshot.forEach(doc => {
            const d = doc.data();
            if (d.region) regions.add(d.region);
            if (d.userName || d.userId) users.add(d.userName || d.userId);
            if (d.jamia) jamiaat.add(d.jamia);
        });

        updateDropdown("final-filter-region", regions, "All Regions");
        updateDropdown("final-filter-user", users, "All Users");
        updateDropdown("final-filter-jamia", jamiaat, "All Jamiaat");

    } catch (err) {
        console.error("Filter populate error:", err);
    }
}

function updateDropdown(id, set, defaultText) {
    const select = document.getElementById(id);
    if (!select) return;
    
    let html = `<option value="all">${defaultText}</option>`;
    Array.from(set).sort().forEach(val => {
        html += `<option value="${val}">${val}</option>`;
    });
    select.innerHTML = html;
}

/* =========================
   📊 JAMIA WISE TABLE
========================= */
function renderJamiaWise(data) {
    let stats = {};

    data.forEach(d => {
        if (!stats[d.jamia]) {
            stats[d.jamia] = { 
                region: d.region || "-", 
                user: d.userName || d.userId || "-",
                totalStudents: 0, present: 0, passed: 0, zimni: 0, nakam: 0 
            };
        }
        const s = stats[d.jamia];
        s.totalStudents += (d.totalStudents || 0);
        s.present += (d.totalStudents || 0) - (d.ghaib || 0);
        s.passed += (d.mumtazSharf||0)+(d.mumtaz||0)+(d.jayyidJidda||0)+(d.jayyid||0)+(d.maqbool||0);
        s.zimni += (d.majazZimni || 0);
        s.nakam += (d.nakam || 0);
    });

    let html = `
    <table class="w-full border-collapse border text-[12px] text-center bg-white shadow-sm">
        <thead class="bg-indigo-50">
            <tr>
                <th class="border p-2">#</th>
                <th class="border p-2 text-right">Jamia Ka Naam</th>
                <th class="border p-2">Region</th>
                <th class="border p-2">User</th>
                <th class="border p-2">Kul Talaba</th>
                <th class="border p-2">Hazir</th>
                <th class="border p-2 text-green-700">Kamyab</th>
                <th class="border p-2 text-purple-700">Zimni</th>
                <th class="border p-2 text-red-600">Nakam</th>
                <th class="border p-2">Faisad (%)</th>
                <th class="border p-2">Kaifiyat</th>
            </tr>
        </thead>
        <tbody>`;

    let count = 1;
    for (let j in stats) {
        let s = stats[j];
        let percent = s.present ? (s.passed / s.present) * 100 : 0;
        
        let kaifiyat = "Kamzor"; let color = "text-red-500";
        if (percent >= 80) { kaifiyat = "Mumtaz Sharf"; color = "text-green-700 font-bold"; }
        else if (percent >= 70) { kaifiyat = "Behtar"; color = "text-blue-600"; }
        else if (percent >= 50) { kaifiyat = "Munasib"; color = "text-purple-600"; }

        html += `
            <tr class="hover:bg-gray-50">
                <td class="border p-2">${count++}</td>
                <td class="border p-2 text-right font-bold">${j}</td>
                <td class="border p-2">${s.region}</td>
                <td class="border p-2 text-xs">${s.user}</td>
                <td class="border p-2 font-bold">${s.totalStudents}</td>
                <td class="border p-2 text-blue-700">${s.present}</td>
                <td class="border p-2 text-green-700 font-bold">${s.passed}</td>
                <td class="border p-2 text-purple-600">${s.zimni}</td>
                <td class="border p-2 text-red-600">${s.nakam}</td>
                <td class="border p-2 font-bold bg-yellow-50">${percent.toFixed(2)}%</td>
                <td class="border p-2 ${color} text-[11px]">${kaifiyat}</td>
            </tr>`;
    }
    html += `</tbody></table>`;
    document.getElementById("final-analysis-container").innerHTML = html;
}
/* =========================
   🔹 CLASS WISE
========================= */
function renderClassWise(data = []) {

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
            (d.mumtazSharf || 0) + (d.mumtaz || 0) + (d.jayyidJidda || 0) +
            (d.jayyid || 0) + (d.maqbool || 0) + (d.majazZimni || 0) +
            (d.nakam || 0) + (d.ghaib || 0);

        const passed =
            (d.mumtazSharf || 0) + (d.mumtaz || 0) + (d.jayyidJidda || 0) +
            (d.jayyid || 0) + (d.maqbool || 0);

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
    document.getElementById("final-analysis-container").innerHTML = html;
}


/* =========================
   🔹 ASATIZA WISE
========================= */
function renderAsatizaWise(data = []) {

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
                <td>${d.jamia || "-"}</td>
                <td>${t.teacher || "-"}</td>
                <td>${total}</td>
                <td>${pass}</td>
                <td>${per.toFixed(1)}%</td>
            </tr>`;
        });

    });

    html += `</table>`;
    document.getElementById("final-analysis-container").innerHTML = html;
}


/* =========================
   🔹 IBTIDAIYA
========================= */
async function renderIbtidaiya(db, jamiaFilter) {

    const container = document.getElementById("final-analysis-container");

    const snapshot = await getDocs(collection(db, "ibtidaiya_exams"));

    let allStudents = [];

    snapshot.forEach(doc => {
        const d = doc.data();

        if (jamiaFilter !== "all" && d.jamiaName !== jamiaFilter) return;

        if (Array.isArray(d.students)) {
            d.students.forEach(s => {
                allStudents.push({
                    jamia: d.jamiaName,
                    ...s
                });
            });
        }
    });

    let stats = {};

    allStudents.forEach(s => {

        const percent = parseFloat(s.percent) || 0;

        if (!stats[s.jamia]) {
            stats[s.jamia] = { students: 0, percent: 0 };
        }

        stats[s.jamia].students += 1;
        stats[s.jamia].percent += percent;
    });

    let html = `
    <table class="w-full border text-sm">
        <tr>
            <th>Jamia</th>
            <th>Students</th>
            <th>Avg %</th>
        </tr>`;

    for (let j in stats) {
        let s = stats[j];
        let avg = s.students ? (s.percent / s.students) : 0;

        html += `
        <tr>
            <td>${j}</td>
            <td>${s.students}</td>
            <td>${avg.toFixed(1)}%</td>
        </tr>`;
    }

    html += `</table>`;

    container.innerHTML = html;
}

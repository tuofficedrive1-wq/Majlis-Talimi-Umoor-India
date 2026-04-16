// Filename: result-analysis.js
import {
    collection, query, where, getDocs, orderBy, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// 1. Grading Logic (Split: Jamia/Class vs Teacher)
// Humne naam wapas getJamiaKefiyat rakha hai taake ReferenceError khatam ho jaye
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

export async function initResultAnalysis(db, user, containerId, userProfileData) {
    if (!db || !user) return;
    window.db = db; // Global reference confirm karein

    const container = document.getElementById(containerId);
    if (!container) return;

    // --- 1. FULL RECORD DELETE ---
    window.deleteEntry = async (docId, collectionName) => {
        if (!confirm("Kya aap waqai is poore record ko delete karna chahte hain?")) return;
        
        try {
            // Firestore se direct import aur execution
            const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const docRef = doc(window.db, collectionName, docId);
            
            await deleteDoc(docRef);
            alert("Record delete ho gaya.");

            // Force Refresh: Table ko saaf karke dobara fetch karein
            if (window.fetchResultData) {
                document.getElementById('ra-table-body').innerHTML = ''; // Pehle list clear karein
                await window.fetchResultData(); 
            }
        } catch (err) {
            alert("Galti: " + err.message);
        }
    };

    // --- 2. SINGLE SUBJECT DELETE (Row Delete) ---
    window.deleteSubjectRow = async (docId, teacherIdx, periodIdx) => {
        if (!confirm("Kya aap sirf is subject/row ko delete karna chahte hain?")) return;

        try {
            const { updateDoc, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const docRef = doc(window.db, "asatiza_wise_results", docId);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                let currentData = [...snap.data().data]; // Create a copy
                
                // Specific subject nikalna
                if (currentData[teacherIdx] && currentData[teacherIdx].periods) {
                    currentData[teacherIdx].periods.splice(periodIdx, 1);
                    
                    // Agar periods khatam ho gaye to teacher ko hi hata dein
                    if (currentData[teacherIdx].periods.length === 0) {
                        currentData.splice(teacherIdx, 1);
                    }
                    
                    // Firestore Update
                    await updateDoc(docRef, { data: currentData });
                    alert("Subject delete ho gaya.");

                    // UI Update
                    if (window.fetchResultData) {
                        await window.fetchResultData();
                    }
                }
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    // --- Container HTML aur fetchResultData logic yahan se shuru hoga ---

    container.innerHTML = `
      <div class="max-w-7xl mx-auto bg-white p-2 md:p-5 rounded-xl shadow-lg border border-gray-200 space-y-5 w-full">
        <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 no-print">
            <h4 class="text-sm font-bold text-indigo-700 uppercase mb-3 border-b border-indigo-200 pb-1">Result Analysis Filters</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Exam Type</label>
                    <select id="ra-exam-type" class="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="ششماہی امتحان">ششماہی امتحان</option>
                        <option value="سالانہ امتحان">سالانہ امتحان</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Taleemi Saal</label>
                    <select id="ra-exam-year" class="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26" selected>2025-26</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Select Jamia</label>
                    <select id="ra-jamia-filter" class="w-full p-2 border rounded text-sm urdu-font outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Tamam Jamiaat (All)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Analysis Level</label>
                    <select id="ra-layout-level" class="w-full p-2 border rounded text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="jamia">Jamia Wise Summary</option>
                        <option value="class">Class Wise Summary</option>
                        <option value="teacher">Asatiza Wise Summary</option>
                        <option value="wazahat">Kamzor Result (Wazahat)</option>
                    </select>
                </div>
            </div>
            <button id="ra-show-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition transform active:scale-95">
                <i class="fas fa-chart-bar mr-2"></i> Result Analysis Show Karein
            </button>
        </div>

        <div id="ra-loader" class="hidden text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p class="mt-2 text-indigo-600 font-semibold">Data analyze ho raha hai...</p>
        </div>

        <div id="ra-report-area" class="hidden mt-6 bg-white rounded-lg border border-gray-200 w-full overflow-hidden shadow-sm">
            <div class="bg-indigo-700 text-white p-5 flex justify-between items-center border-b-4 border-indigo-900">
                <div class="w-24"></div> 
                <div class="text-center flex-1">
                    <h2 id="ra-report-title" class="text-4xl font-bold urdu-font">نتیجہ امتحان</h2>
                    <p id="ra-report-subtitle" class="text-lg opacity-90 mt-2 font-sans text-center"></p>
                </div>
                <div class="flex gap-2 no-print" data-html2canvas-ignore="true">
                    <button id="ra-download-excel" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow font-bold text-sm">
                        <i class="fas fa-file-excel mr-1"></i> Excel
                    </button>
                    <button id="ra-download-image" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded shadow font-bold text-sm">
                        <i class="fas fa-image mr-1"></i> Image
                    </button>
                </div>
            </div>
            <div class="w-full overflow-x-auto">
                <table id="ra-data-table" class="w-full min-w-full text-center text-[15px] border-collapse" dir="rtl">
                    <thead id="ra-table-head" class="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-300 text-base"></thead>
                    <tbody id="ra-table-body" class="divide-y divide-gray-200 urdu-font bg-white"></tbody>
                    <tfoot id="ra-table-foot" class="bg-gray-800 text-white font-bold urdu-font"></tfoot>
                </table>
            </div>
        </div>
      </div>
    `;

    const jamiaSelect = document.getElementById('ra-jamia-filter');
    const userJamiaat = userProfileData.jamiaatList || [];
    userJamiaat.forEach(j => { 
        const opt = document.createElement('option');
        opt.value = j; opt.textContent = j; jamiaSelect.appendChild(opt);
    });

            window.fetchResultData = async () => {
        const examType = document.getElementById('ra-exam-type').value;
        const examYear = document.getElementById('ra-exam-year').value;
        const jamiaFilter = document.getElementById('ra-jamia-filter').value;
        const layoutLevel = document.getElementById('ra-layout-level').value;
        
        const loader = document.getElementById('ra-loader');
        const reportArea = document.getElementById('ra-report-area');
        const thead = document.getElementById('ra-table-head');
        const tbody = document.getElementById('ra-table-body');
        const tfoot = document.getElementById('ra-table-foot');
        const subtitle = document.getElementById('ra-report-subtitle');

        loader.classList.remove('hidden');
        reportArea.classList.add('hidden');
        tbody.innerHTML = '';
        tfoot.innerHTML = '';

        try {
            const collectionName = (layoutLevel === 'class' || layoutLevel === 'jamia') ? "class_wise_results" : "asatiza_wise_results"; 
            const colRef = collection(db, collectionName); 
            
            let q = query(colRef, 
                where("examType", "==", examType), 
                where("examYear", "==", examYear),
                orderBy("timestamp", "desc")
            );

            const snapshot = await getDocs(q);
            let latestDataMap = new Map();

            snapshot.forEach(docSnap => {
                const d = docSnap.data();
                d.docId = docSnap.id;

                if (userJamiaat.includes(d.jamia) && (!jamiaFilter || d.jamia === jamiaFilter)) {
                    if (!d.uid || d.uid === user.uid) { 
                        let uniqueKey = layoutLevel === 'teacher' 
                            ? `${d.jamia}_${d.teacher}_${d.subject}_${d.darjah}` 
                            : `${d.jamia}_${d.darjah}`;

                        if (!latestDataMap.has(uniqueKey)) {
                            latestDataMap.set(uniqueKey, d);
                        }
                    }
                }
            });

            let rowsHtml = "";
            let totals = { kul: 0, hazir: 0, passed: 0, zimni: 0, nakam: 0 };

            if (layoutLevel === 'jamia') {
                thead.innerHTML = `
                    <tr class="bg-gray-200">
                        <th class="border p-3">#</th><th class="border p-3">جامعہ کا نام</th>
                        <th class="border p-3">کل طلبہ</th><th class="border p-3 text-blue-700">حاضر</th>
                        <th class="border p-3 text-green-700">کامیاب</th><th class="border p-3 text-purple-700">ضمنی</th>
                        <th class="border p-3 text-red-600">ناکام</th><th class="border p-3">فیصد</th><th class="border p-3">کیفیت</th>
                    </tr>`;

                let jamiaStats = {};
                latestDataMap.forEach((d) => {
                    const total = (parseInt(d.mumtazSharf)||0) + (parseInt(d.mumtaz)||0) + (parseInt(d.jayyidJidda)||0) + (parseInt(d.jayyid)||0) + (parseInt(d.maqbool)||0) + (parseInt(d.majazZimni)||0) + (parseInt(d.nakam)||0) + (parseInt(d.ghaib)||0);
                    const passed = (parseInt(d.mumtazSharf)||0) + (parseInt(d.mumtaz)||0) + (parseInt(d.jayyidJidda)||0) + (parseInt(d.jayyid)||0) + (parseInt(d.maqbool)||0);
                    const nakam = parseInt(d.nakam) || 0;
                    const zimni = parseInt(d.majazZimni) || 0;
                    const ghaib = parseInt(d.ghaib) || 0;

                    if (!jamiaStats[d.jamia]) {
                        jamiaStats[d.jamia] = { total: 0, passed: 0, nakam: 0, ghaib: 0, majazZimni: 0 };
                    }
                    jamiaStats[d.jamia].total += total;
                    jamiaStats[d.jamia].passed += passed;
                    jamiaStats[d.jamia].nakam += nakam;
                    jamiaStats[d.jamia].ghaib += ghaib;
                    jamiaStats[d.jamia].majazZimni += zimni;
                });

                let idx = 1;
                for (let jName in jamiaStats) {
                    const s = jamiaStats[jName];
                    const hazir = s.total - s.ghaib;
                    const percNum = hazir > 0 ? (s.passed / hazir) * 100 : 0;
                    
                    totals.kul += s.total; totals.hazir += hazir; totals.passed += s.passed; totals.zimni += s.majazZimni; totals.nakam += s.nakam;

                    rowsHtml += `
                        <tr class="hover:bg-gray-50 border-b">
                            <td class="border p-3">${idx++}</td>
                            <td class="border p-3 font-bold text-right">${jName}</td>
                            <td class="border p-3 font-bold">${s.total}</td>
                            <td class="border p-3 text-blue-700">${hazir}</td>
                            <td class="border p-3 text-green-700">${s.passed}</td>
                            <td class="border p-3 text-purple-700">${s.majazZimni}</td>
                            <td class="border p-3 text-red-600">${s.nakam}</td>
                            <td class="border p-3 bg-teal-50 font-black text-teal-800">${percNum.toFixed(2)}%</td>
                            <td class="border p-3 font-bold" style="color:${getKefiyatColor(percNum, 'jamia')}">
                                ${getJamiaKefiyat(percNum, 'jamia')} 
                            </td>
                        </tr>`;
                }
                const overallPerc = totals.hazir > 0 ? (totals.passed / totals.hazir) * 100 : 0;
                tfoot.innerHTML = `<tr><td colspan="2" class="p-3 text-right">TOTAL SUMMARY</td><td>${totals.kul}</td><td>${totals.hazir}</td><td>${totals.passed}</td><td>${totals.zimni}</td><td>${totals.nakam}</td><td>${overallPerc.toFixed(2)}%</td><td>${getJamiaKefiyat(overallPerc)}</td></tr>`;

            } else if (layoutLevel === 'class') {
                thead.innerHTML = `
                    <tr class="bg-gray-200 text-sm">
                        <th class="border p-3">جامعہ</th><th class="border p-3">درجہ</th>
                        <th class="border p-3">ممتاز مع الشرف</th><th class="border p-3">ممتاز</th>
                        <th class="border p-3">جید جدا</th><th class="border p-3">جید</th>
                        <th class="border p-3">مقبول</th><th class="border p-3">ضمنی</th>
                        <th class="border p-3 text-red-600">ناکام</th><th class="border p-3">غیرحاضر</th>
                        <th class="border p-3">کل تعداد</th><th class="border p-3 text-blue-700">کل حاضر</th>
                        <th class="border p-3 text-green-700">کامیاب</th><th class="border p-3 text-red-600">ناکام</th>
                        <th class="border p-3">فیصد</th><th class="border p-3 no-print text-red-600">حذف</th>
                    </tr>`;
                latestDataMap.forEach((d) => {
                    const total = (parseInt(d.mumtazSharf)||0) + (parseInt(d.mumtaz)||0) + (parseInt(d.jayyidJidda)||0) + (parseInt(d.jayyid)||0) + (parseInt(d.maqbool)||0) + (parseInt(d.majazZimni)||0) + (parseInt(d.nakam)||0) + (parseInt(d.ghaib)||0);
                    const ghaib = parseInt(d.ghaib) || 0;
                    const hazir = total - ghaib;
                    const passed = (parseInt(d.mumtazSharf)||0) + (parseInt(d.mumtaz)||0) + (parseInt(d.jayyidJidda)||0) + (parseInt(d.jayyid)||0) + (parseInt(d.maqbool)||0);
                    const failed = (parseInt(d.nakam)||0) + (parseInt(d.majazZimni)||0);
                    const percent = hazir > 0 ? (passed / hazir) * 100 : 0;

                    totals.kul += total; totals.hazir += hazir; totals.passed += passed; totals.nakam += failed;

                    rowsHtml += `
                                <tr class="hover:bg-gray-50 border-b text-center">
                                    <td class="border p-3 font-bold text-right">${d.jamia}</td>
                                    <td class="border p-3">${d.darjah || '-'}</td>
                                    <td class="border p-3">${d.mumtazSharf || 0}</td>
                                    <td class="border p-3">${d.mumtaz || 0}</td>
                                    <td class="border p-3">${d.jayyidJidda || 0}</td>
                                    <td class="border p-3">${d.jayyid || 0}</td>
                                    <td class="border p-3">${d.maqbool || 0}</td>
                                    <td class="border p-3">${d.majazZimni || 0}</td>
                                    <td class="border p-3 text-red-600">${d.nakam || 0}</td>
                                    <td class="border p-3">${d.ghaib || 0}</td>
                                    <td class="border p-3 font-bold">${total}</td>
                                    <td class="border p-3 text-blue-700 font-bold">${hazir}</td>
                                    <td class="border p-3 text-green-700 font-bold">${passed}</td>
                                    <td class="border p-3 text-red-600 font-bold">${failed}</td>
                                    <td class="border p-3 bg-teal-50 font-bold text-teal-700">${percent.toFixed(2)}%</td>
                                    <td class="border p-3 font-bold" style="color:${getKefiyatColor(percent, 'class')}">
                                        ${getJamiaKefiyat(percent, 'class')}
                                    </td>
                                    <td class="border p-3 no-print">
                                        <button onclick="editEntry('${d.docId}')" class="text-blue-600 mr-2"><i class="fas fa-edit"></i></button>
                                        <button onclick="deleteEntry('${d.docId}', 'class_wise_results')" class="text-red-600"><i class="fas fa-trash-alt"></i></button>
                                    </td>
                                </tr>`;
                });
                const overallPerc = totals.hazir > 0 ? (totals.passed / totals.hazir) * 100 : 0;
                    tfoot.innerHTML = `
                        <tr>
                            <td colspan="10" class="p-3 text-right">TOTAL SUMMARY</td>
                            <td>${totals.kul}</td>
                            <td>${totals.hazir}</td>
                            <td>${totals.passed}</td>
                            <td>${totals.nakam}</td>
                            <td>${overallPerc.toFixed(2)}%</td>
                            <td class="font-bold" style="color:${getKefiyatColor(overallPerc, 'class')}">
                                ${getJamiaKefiyat(overallPerc, 'class')}
                            </td>
                            <td class="no-print">-</td>
                        </tr>`;
            } else if (layoutLevel === 'teacher') {
    thead.innerHTML = `
        <tr class="bg-gray-200">
            <th class="border p-3">جامعہ</th><th class="border p-3">استاد</th>
            <th class="border p-3">مضمون</th><th class="border p-3">درجہ</th>
            <th class="border p-3">کل</th><th class="border p-3 text-green-700">کامیاب</th>
            <th class="border p-3 text-red-600">ناکام</th><th class="border p-3">فیصد</th>
            <th class="border p-3">کیفیت</th><th class="border p-3 bg-teal-100">مجموعی</th>
            <th class="border p-3 no-print text-red-600">حذف</th>
        </tr>`;

    latestDataMap.forEach((d) => {
        if (d.data && Array.isArray(d.data)) {
            d.data.forEach((tEntry, tIdx) => {
                const periods = tEntry.periods || [];
                const pCount = periods.length || 1;
                let tT = 0, tP = 0;
                
                periods.forEach(p => { 
                    tT += parseInt(p.total) || 0; 
                    tP += parseInt(p.passed) || 0; 
                });
                
                const tPer = tT > 0 ? (tP / tT) * 100 : 0;
                const tCol = getKefiyatColor(tPer);

                totals.kul += tT; 
                totals.passed += tP;

                periods.forEach((p, pIdx) => {
                    const f = (parseInt(p.total) - parseInt(p.passed)) || 0;
                    
                    rowsHtml += `
                        <tr class="hover:bg-gray-50 border-b text-center">
                            ${pIdx === 0 ? `<td class="border p-3 font-bold align-middle text-right" rowspan="${pCount}">${d.jamia}</td>` : ''}
                            ${pIdx === 0 ? `<td class="border p-3 font-bold align-middle text-blue-700" rowspan="${pCount}">${tEntry.teacher || "-"}</td>` : ''}
                            <td class="border p-3 text-right">${p.subject || '-'}</td>
                            <td class="border p-3">${p.class || p['class'] || '-'}</td>
                            <td class="border p-3">${p.total || '0'}</td>
                            <td class="border p-3 text-green-700">${p.passed || '0'}</td>
                            <td class="border p-3 text-red-600">${f}</td>
                            <td class="border p-3 font-bold">${p.percentage || '0%'}</td>
                            <td class="border p-3">${p.kaifiyat || '-'}</td>
                            ${pIdx === 0 ? `
                                <td class="border p-3 bg-teal-50 align-middle font-bold" rowspan="${pCount}">
                                    <div style="color:${tCol}">${tPer.toFixed(1)}%</div>
                                    <div class="text-[11px]" style="color:${tCol}">${getJamiaKefiyat(tPer)}</div>
                                </td>` : ''}
                            <td class="border p-3 align-middle no-print">
                                <button onclick="deleteSubjectRow('${d.docId}', ${tIdx}, ${pIdx})" class="text-orange-600 hover:text-orange-800 p-1" title="Sirf ye subject delete karein">
                                    <i class="fas fa-minus-circle"></i>
                                </button>
                                
                                ${pIdx === 0 ? `
                                <button onclick="deleteEntry('${d.docId}', 'asatiza_wise_results')" class="text-red-600 hover:text-red-800 p-1 ml-1" title="Pura record delete karein">
                                    <i class="fas fa-trash-alt"></i>
                                </button>` : ''}
                            </td>
                        </tr>`;
                });
            });
        }
    });
    const overallPerc = totals.kul > 0 ? (totals.passed / totals.kul) * 100 : 0;
    tfoot.innerHTML = `<tr><td colspan="4" class="p-3 text-right">TOTAL SUMMARY</td><td>${totals.kul}</td><td>${totals.passed}</td><td>${totals.kul - totals.passed}</td><td>${overallPerc.toFixed(2)}%</td><td>${getJamiaKefiyat(overallPerc)}</td><td colspan="2">-</td></tr>`;
}
                       else if (layoutLevel === 'wazahat') {
    let totalPending = 0;
    let totalSubmitted = 0;
    let wazahatRows = "";

    latestDataMap.forEach((d) => {
        if (d.data && Array.isArray(d.data)) {
            d.data.forEach((tEntry) => {
                const periods = tEntry.periods || [];
                periods.forEach((p) => {
                    let percVal = parseFloat(String(p.percentage || 0).replace('%', ''));
                    
                    // Filter: Sirf 70% se kam wale (Weak Results)
                    if (percVal < 70) {
                        // Firebase mein '.' allowed nahi hota key mein, isliye replace kiya gaya hai
                        const subjectKeyForDisplay = (p.subject || '-').replace(/\./g, '_');
                        const hasWazahat = (d.wazahat_map && d.wazahat_map[subjectKeyForDisplay]);
                        const specificWazahat = hasWazahat 
                                                ? d.wazahat_map[subjectKeyForDisplay] 
                                                : '<span class="text-red-500 font-bold">Pending...</span>';

                        // Counters update karein
                        if (hasWazahat) totalSubmitted++; else totalPending++;

                        wazahatRows += `
                            <tr class="hover:bg-red-50 border-b border-red-100 text-center">
                                <td class="border p-3 font-bold text-right">${d.jamia}</td>
                                <td class="border p-3 text-blue-700 font-bold">${tEntry.teacher || "-"}</td>
                                <td class="border p-3 text-right">${p.subject || '-'} (${p.class || '-'})</td>
                                <td class="border p-3 text-red-600 font-bold">${percVal.toFixed(1)}%</td>
                                <td class="border p-3 font-bold" style="color:${getKefiyatColor(percVal, 'teacher')}">
                                    ${getJamiaKefiyat(percVal, 'teacher')}
                                </td>
                                <td class="border p-3 text-sm italic text-gray-700 ${hasWazahat ? 'bg-green-50' : 'bg-yellow-50'}">
                                    ${specificWazahat} 
                                </td>
                                <td class="border p-3 no-print">
                                    <button onclick="sendWazahatLink('${d.docId}', '${tEntry.teacher}', '${p.subject}', '${percVal.toFixed(1)}', '${getJamiaKefiyat(percVal, 'teacher')}')" 
                                            class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">
                                        <i class="fab fa-whatsapp"></i> Link
                                    </button>
                                </td>
                            </tr>`;
                    }
                });
            });
        }
    });

    // Table Header with Counters
    thead.innerHTML = `
        <tr class="bg-gray-800 text-white">
            <th colspan="7" class="p-2 text-center text-sm">
                Kul Kamzor Results: <span class="text-yellow-400">${totalPending + totalSubmitted}</span> | 
                Wazahat Aa Gayi: <span class="text-green-400">${totalSubmitted}</span> | 
                Baqi (Pending): <span class="text-red-400">${totalPending}</span>
            </th>
        </tr>
        <tr class="bg-red-50 text-red-900">
            <th class="border p-3">جامعہ</th>
            <th class="border p-3">استاد</th>
            <th class="border p-3">مضمون / درجہ</th>
            <th class="border p-3">فیصد</th>
            <th class="border p-3">کیفیت</th>
            <th class="border p-3">وضاحت (Explanation)</th>
            <th class="border p-3 no-print">ایکشن</th>
        </tr>`;

    rowsHtml = wazahatRows;
}

            tbody.innerHTML = rowsHtml || `<tr><td colspan="15" class="py-10 text-red-500 font-bold bg-white text-center">کوئی ریکارڈ نہیں ملا۔</td></tr>`;
            subtitle.textContent = `${examType} | سال: ${examYear}`;
            loader.classList.add('hidden');
            reportArea.classList.remove('hidden');

           document.getElementById('ra-download-excel').onclick = () => {
    // Check karein ke XLSX library load hui hai ya nahi
    if (window.XLSX) {
        const table = document.getElementById('ra-data-table');
        const wb = XLSX.utils.table_to_book(table, { sheet: "Analysis" });
        XLSX.writeFile(wb, `Result_${layoutLevel}_${examYear}.xlsx`);
    } else {
        alert("Excel library (SheetJS) load nahi hui. Internet connection check karein.");
    }
};

            document.getElementById('ra-download-image').onclick = async () => {
                if(window.html2canvas) {
                    const canvas = await window.html2canvas(document.getElementById('ra-report-area'), { scale: 2, useCORS: true });
                    const link = document.createElement("a");
                    link.download = `Result_${layoutLevel}_${examYear}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                } else { alert("Download library load nahi hui."); }
            };

        } catch (err) {
            console.error(err); loader.classList.add('hidden'); alert("Masla aaya: " + err.message);
        }
    };

    document.getElementById('ra-show-btn').onclick = () => window.fetchResultData();
}
window.sendWazahatLink = (docId, teacherName, subject, percentage, kefiyat) => {
    // 1. Aapki repository ka sahi naam yahan set kar diya hai
    const repoName = "Majlis-Talimi-Umoor-India";
    
    // 2. Base URL ko repository name ke saath joda gaya hai
    const baseUrl = `https://tuofficedrive1-wq.github.io/${repoName}/teacher-wazahat.html`;
    
    // 3. Parameters taiyar karein
    const params = `id=${docId}&teacher=${encodeURIComponent(teacherName)}&subject=${encodeURIComponent(subject)}&perc=${encodeURIComponent(percentage)}&kef=${encodeURIComponent(kefiyat)}`;
    
    // 4. Full Link
    const fullLink = `${baseUrl}?${params}`;
    
    // WhatsApp Message
    const message = `*نوٹس برائے وضاحت (Official Notification)*\n\n` +
                    `محترم ${teacherName} صاحب،\n` +
                    `آپ کے مضمون *(${subject})* کا رزلٹ کمزور پایا گیا ہے۔\n\n` +
                    `*تفصیلات:*\n` +
                    `فیصد: *${percentage}*\n` +
                    `کیفیت: *${kefiyat}*\n\n` +
                    `براہِ کرم اس لنک پر کلک کرکے اپنی وضاحت جمع کرائیں:\n${fullLink}\n\n` +
                    `شکریہ۔`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
};



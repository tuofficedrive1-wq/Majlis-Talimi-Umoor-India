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
            <button id="ra-top3-poster-btn" class="bg-gradient-to-r from-teal-500 to-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md">
        <i class="fas fa-trophy mr-1"></i> Download Top 3 Poster
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
                    <button id="ra-download-excel" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow font-bold text-sm transition">
                        <i class="fas fa-file-excel mr-1"></i> Excel
                    </button>
                    <button id="ra-download-image" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded shadow font-bold text-sm transition">
                        <i class="fas fa-image mr-1"></i> Image
                    </button>
                    <button id="ra-download-pdf" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow font-bold text-sm transition">
                        <i class="fas fa-file-pdf mr-1"></i> PDF
                    </button>
                </div>
            </div>
            <div id="ra-wazahat-summary-bar"></div>
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
// --- NAYA CODE: Exam Year Auto-Populate for Analysis ---
    const raExamYearSelect = document.getElementById('ra-exam-year');
    if (raExamYearSelect) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); 
        const startYear = (currentMonth >= 3) ? currentYear : currentYear - 1;
        const endYear = startYear + 1;
        const currentAcademicYear = `${startYear}-${endYear.toString().slice(-2)}`; 

        let availableYears = new Set();
        if (userProfileData && userProfileData.academicYears) {
            Object.keys(userProfileData.academicYears).forEach(year => {
                const parts = year.split('-');
                if (parts.length === 2 && parts[1].length === 4) {
                    availableYears.add(`${parts[0]}-${parts[1].slice(-2)}`);
                } else {
                    availableYears.add(year);
                }
            });
        }
        
        availableYears.add(currentAcademicYear);
        const sortedYears = Array.from(availableYears).sort().reverse();

        raExamYearSelect.innerHTML = '';
        sortedYears.forEach(yearVal => {
            const option = document.createElement('option');
            option.value = yearVal;
            option.textContent = yearVal;
            if (yearVal === currentAcademicYear) option.selected = true;
            raExamYearSelect.appendChild(option);
        });
    }
    
    const jamiaSelect = document.getElementById('ra-jamia-filter');
    const userJamiaat = userProfileData.jamiaatList || [];
    let userJamiaatNames = []; // Nayi list jisme sirf naam honge
    
    userJamiaat.forEach(j => { 
        // Agar j object hai to uska naam nikalo, warna string ko waise hi rakho
        const jName = typeof j === 'object' ? (j.name || j.jamiaName) : j;
        if(jName) {
            userJamiaatNames.push(jName);
            const opt = document.createElement('option');
            opt.value = jName; 
            opt.textContent = jName; 
            jamiaSelect.appendChild(opt);
        }
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

        const summaryBarContainer = document.getElementById('ra-wazahat-summary-bar');
        if (summaryBarContainer) summaryBarContainer.innerHTML = '';
        const dataTable = document.getElementById('ra-data-table');
        if (dataTable) dataTable.setAttribute('dir', layoutLevel === 'wazahat' ? 'ltr' : 'rtl');

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

                if (!userJamiaatNames.includes(d.jamia)) return;
                if (jamiaFilter && d.jamia !== jamiaFilter) return;
                if (d.uid && d.uid !== user.uid) return;

                let uniqueKey;
                if (layoutLevel === 'teacher' || layoutLevel === 'wazahat') {
                    // asatiza_wise_results: khali docs skip, har jamia ka sabse naya bhara hua doc
                    if (!Array.isArray(d.data) || d.data.length === 0) return;
                    uniqueKey = d.jamia;
                } else {
                    uniqueKey = `${d.jamia}_${d.darjah}`;
                }

                if (!latestDataMap.has(uniqueKey)) {
                    d.keyDocMap = {};
                    if (d.wazahat_map) {
                        for (let k in d.wazahat_map) d.keyDocMap[k] = d.docId;
                    }
                    latestDataMap.set(uniqueKey, d);
                } else {
                    // Agar usi Jamia ka koi doosra document bhi maujood ho, to uski wazahat_map aur comments ko merge kar lein
                    const target = latestDataMap.get(uniqueKey);
                    if (!target.keyDocMap) target.keyDocMap = {};

                    if (d.wazahat_map) {
                        if (!target.wazahat_map) target.wazahat_map = {};
                        for (let k in d.wazahat_map) {
                            if (!target.wazahat_map[k]) {
                                target.wazahat_map[k] = d.wazahat_map[k];
                                target.keyDocMap[k] = d.docId;
                            }
                        }
                    }
                    if (d.wazahat_date_map) {
                        target.wazahat_date_map = { ...d.wazahat_date_map, ...(target.wazahat_date_map || {}) };
                    }
                    if (d.zimmedar_comments) {
                        target.zimmedar_comments = { ...d.zimmedar_comments, ...(target.zimmedar_comments || {}) };
                    }
                    if (d.wazahat && !target.wazahat) {
                        target.wazahat = d.wazahat;
                        target.keyDocMap['_legacy_'] = d.docId;
                    }
                }
            });

            // Multiple documents se aane wali wazahats ko latest document me sync kar dein taake Firestore me bhi data update rahe
            if (layoutLevel === 'wazahat' || layoutLevel === 'teacher') {
                for (let [jKey, docData] of latestDataMap.entries()) {
                    if (docData.keyDocMap && Object.values(docData.keyDocMap).some(id => id !== docData.docId)) {
                        try {
                            const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
                            await updateDoc(doc(window.db, "asatiza_wise_results", docData.docId), {
                                wazahat_map: docData.wazahat_map || {},
                                wazahat_date_map: docData.wazahat_date_map || {},
                                wazahat_status: "Submitted"
                            });
                        } catch(e) { console.warn("Wazahat sync warning:", e); }
                    }
                }
            }

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
                    // Jamia stats ko sort karke top 3 nikalna
                    let sortedJamia = Object.keys(jamiaStats).map(name => {
                        const s = jamiaStats[name];
                        const hazir = s.total - s.ghaib;
                        return {
                            name: name,
                            perc: hazir > 0 ? (s.passed / hazir) * 100 : 0
                        };
                    }).sort((a, b) => b.perc - a.perc).slice(0, 3);
                    
                    // Agar 3 jamia hain to button dikhayein
                    const top3Btn = document.getElementById('ra-top3-poster-btn');
                    if (sortedJamia.length > 0) {
                        top3Btn.classList.remove('hidden');
                        top3Btn.onclick = () => generateTop3Poster(sortedJamia, examYear, examType);
                    }
            
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
                // Table head mein 'Action' column ko thoda bada kiya gaya hai
                thead.innerHTML = `
                    <tr class="bg-gray-200">
                        <th class="border p-3">جامعہ</th><th class="border p-3">استاد</th>
                        <th class="border p-3">مضمون</th><th class="border p-3">درجہ</th>
                        <th class="border p-3">کل</th><th class="border p-3 text-green-700">کامیاب</th>
                        <th class="border p-3 text-red-600">ناکام</th><th class="border p-3">فیصد</th>
                        <th class="border p-3">کیفیت</th><th class="border p-3 bg-teal-100">مجموعی</th>
                        <th class="border p-3 no-print w-32">ایکشن</th>
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
                            const majmooiKefiyat = getJamiaKefiyat(tPer); // Majmooi Kefiyat check karne ke liye

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
                                                <div class="text-[11px]" style="color:${tCol}">${majmooiKefiyat}</div>
                                            </td>` : ''}
                                            
                                        <td class="border p-3 align-middle no-print">
                                            <div class="flex flex-col gap-1.5 items-center justify-center">
                                                <!-- Row / Subject Delete Button -->
                                                <button onclick="deleteSubjectRow('${d.docId}', ${tIdx}, ${pIdx})" class="bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 border border-orange-200 w-full py-1 px-2 rounded text-[11px] font-bold shadow-sm flex items-center justify-center gap-1 transition-colors" title="Sirf ye subject delete karein">
                                                    <i class="fas fa-eraser"></i> مضمون حذف
                                                </button>
                                                
                                                ${pIdx === 0 ? `
                                                <!-- Full Record / Teacher Delete Button -->
                                                <button onclick="deleteEntry('${d.docId}', 'asatiza_wise_results')" class="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 w-full py-1 px-2 rounded text-[11px] font-bold shadow-sm flex items-center justify-center gap-1 transition-colors" title="Pura record delete karein">
                                                    <i class="fas fa-trash-alt"></i> مکمل حذف
                                                </button>` : ''}

                                                ${pIdx === 0 && majmooiKefiyat.includes('ممتاز') ? `
                                                <!-- Appreciation Letter Button (Sirf Mumtaz walo ke liye) -->
                                                <button onclick="generateAppreciationLetter('${tEntry.teacher || '-'}', '${d.jamia}', '${examType}', '${examYear}')" class="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800 border border-yellow-300 w-full py-1 px-2 rounded text-[11px] font-bold shadow-sm flex items-center justify-center gap-1 mt-1 transition-colors" title="Appreciation Letter Download Karein">
                                                    <i class="fas fa-award"></i> تعریفی سند
                                                </button>` : ''}
                                            </div>
                                        </td>
                                    </tr>`;
                            });
                        });
                    }
                });
                const overallPerc = totals.kul > 0 ? (totals.passed / totals.kul) * 100 : 0;
                tfoot.innerHTML = `<tr><td colspan="4" class="p-3 text-right">TOTAL SUMMARY</td><td>${totals.kul}</td><td>${totals.passed}</td><td>${totals.kul - totals.passed}</td><td>${overallPerc.toFixed(2)}%</td><td>${getJamiaKefiyat(overallPerc)}</td><td colspan="2">-</td></tr>`;
            }
    // --- Baki ka purana code upar wese hi rahega ---

else if (layoutLevel === 'wazahat') {
    let totalPending = 0;
    let totalSubmitted = 0;
    let totalCommentAdded = 0;
    let totalCommentPending = 0;
    let wazahatItems = [];

    latestDataMap.forEach((d) => {
        if (d.data && Array.isArray(d.data)) {
            d.data.forEach((tEntry) => {
                const periods = tEntry.periods || [];
                periods.forEach((p) => {
                    let percVal = parseFloat(String(p.percentage || 0).replace('%', ''));
                    
                    if (percVal < 70) {
                        const teacherName = (tEntry.teacher || '-').trim();
                        const rawSubject = (p.subject || '-').trim();
                        const darjah = (p.class || p.darjah || '-').trim();
                        
                        // Unique keys
                        const teacherSubjectClassKey = (teacherName + "_" + rawSubject + "_" + darjah).replace(/[\.\s]/g, '_');
                        const subjectClassKey = (rawSubject + "_" + darjah).replace(/[\.\s]/g, '_');
                        const subjectKey = subjectClassKey;
                        
                        let finalWazahatText = "";
                        let keyToDelete = teacherSubjectClassKey; 
                        let isLegacy = false;
                        let wazahatDate = "";
                        
                        // Helper: Faltu spaces, symbols aur Urdu variations ko normalize karne ke liye
                        const cleanUrduText = (str) => {
                            if (!str) return "";
                            return String(str)
                                .toLowerCase()
                                .replace(/[\s_.\-()]/g, '')
                                .replace(/[أإآ]/g, 'ا')
                                .replace(/[ةۀھ]/g, 'ہ')
                                .replace(/[ىئ]/g, 'ی')
                                .replace(/[\u064B-\u065F\u0670]/g, '')
                                .replace(/ء/g, '')
                                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                                .trim();
                        };

                        const normSubj = cleanUrduText(rawSubject);
                        const normTeacher = cleanUrduText(teacherName);
                        const normDarjah = cleanUrduText(darjah);

                        // --- BULLETPROOF SMART SEARCH START ---
                        if (d.wazahat_map && typeof d.wazahat_map === 'object') {
                            // 1. Sab se pehle: Specific Teacher + Subject + Class key
                            if (d.wazahat_map[teacherSubjectClassKey]) {
                                finalWazahatText = d.wazahat_map[teacherSubjectClassKey];
                                keyToDelete = teacherSubjectClassKey;
                            }
                            // 2. Doosra: Specific Subject + Class key
                            else if (d.wazahat_map[subjectClassKey]) {
                                finalWazahatText = d.wazahat_map[subjectClassKey];
                                keyToDelete = subjectClassKey;
                            }
                            // 3. Teesra: Fuzzy match jisme teacher aur class dono match karein
                            else {
                                for (let key in d.wazahat_map) {
                                    const val = d.wazahat_map[key];
                                    if (!val) continue;
                                    const normKey = cleanUrduText(key);

                                    const subjMatch = (normKey === normSubj) || 
                                                      (normSubj.length >= 3 && normKey.includes(normSubj)) || 
                                                      (normKey.length >= 3 && normSubj.includes(normKey));

                                    if (subjMatch) {
                                        const matchesTeacher = normTeacher && normKey.includes(normTeacher);
                                        const matchesDarjah = normDarjah && normKey.includes(normDarjah);

                                        if (matchesTeacher && matchesDarjah) {
                                            finalWazahatText = val;
                                            keyToDelete = key;
                                            break;
                                        } else if (matchesDarjah) {
                                            finalWazahatText = val;
                                            keyToDelete = key;
                                            break;
                                        } else if (matchesTeacher) {
                                            finalWazahatText = val;
                                            keyToDelete = key;
                                            break;
                                        }
                                    }
                                }

                                // 4. Agar abhi bhi na mila ho, aur Jamia me is subject ka sirf aik hi weak case ho to hi generic key allow karein
                                if (!finalWazahatText) {
                                    let sameSubjCount = 0;
                                    (d.data || []).forEach(otherT => {
                                        (otherT.periods || []).forEach(otherP => {
                                            let oPerc = parseFloat(String(otherP.percentage || 0).replace('%', ''));
                                            if (oPerc < 70 && (otherP.subject || '').trim() === rawSubject) {
                                                sameSubjCount++;
                                            }
                                        });
                                    });

                                    if (sameSubjCount <= 1) {
                                        if (d.wazahat_map[rawSubject]) {
                                            finalWazahatText = d.wazahat_map[rawSubject];
                                            keyToDelete = rawSubject;
                                        } else if (d.wazahat_map[rawSubject.replace(/\./g, '_')]) {
                                            finalWazahatText = d.wazahat_map[rawSubject.replace(/\./g, '_')];
                                            keyToDelete = rawSubject.replace(/\./g, '_');
                                        }
                                    }
                                }
                            }
                        }

                        if (d.wazahat_date_map) {
                            wazahatDate = d.wazahat_date_map[keyToDelete] || d.wazahat_date_map[teacherSubjectClassKey] || d.wazahat_date_map[subjectClassKey] || "";
                        }
                        
                        // Purana single field 'wazahat' check karein (sirf agar Jamia me kul 1 hi weak entry ho)
                        if (!finalWazahatText && d.wazahat) {
                            let totalWeakCount = 0;
                            (d.data || []).forEach(otherT => {
                                (otherT.periods || []).forEach(otherP => {
                                    let oPerc = parseFloat(String(otherP.percentage || 0).replace('%', ''));
                                    if (oPerc < 70) totalWeakCount++;
                                });
                            });
                            if (totalWeakCount === 1) {
                                finalWazahatText = d.wazahat;
                                isLegacy = true;
                            }
                        }
                        // --- BULLETPROOF SMART SEARCH END ---

                        const hasWazahat = Boolean(finalWazahatText && finalWazahatText.trim().length > 2);
                        const docToDeleteFrom = (d.keyDocMap && d.keyDocMap[keyToDelete]) ? d.keyDocMap[keyToDelete] : d.docId;
                        
                        let zimmedarComment = "";
                        if (d.zimmedar_comments) {
                            zimmedarComment = d.zimmedar_comments[subjectKey] || d.zimmedar_comments[rawSubject] || d.zimmedar_comments[keyToDelete] || "";
                        }
                        const hasComment = Boolean(zimmedarComment && zimmedarComment.trim().length > 1);

                        if (hasWazahat) totalSubmitted++; else totalPending++;
                        if (hasComment) totalCommentAdded++; else totalCommentPending++;

                        wazahatItems.push({
                            jamia: d.jamia,
                            teacher: teacherName,
                            subject: rawSubject,
                            darjah: darjah,
                            percVal: percVal,
                            kaifiyat: getJamiaKefiyat(percVal, 'teacher'),
                            kaifiyatColor: getKefiyatColor(percVal, 'teacher'),
                            hasWazahat: hasWazahat,
                            wazahatText: finalWazahatText,
                            wazahatDate: wazahatDate,
                            keyToDelete: keyToDelete,
                            subjectKey: subjectKey,
                            isLegacy: isLegacy,
                            docId: docToDeleteFrom,
                            zimmedarComment: zimmedarComment,
                            hasComment: hasComment
                        });
                    }
                });
            });
        }
    });

    const totalCases = totalPending + totalSubmitted;
    const completionRate = totalCases > 0 ? (totalSubmitted / totalCases) * 100 : 0;

    // 🌟 Executive Summary Bar & Toolbar HTML (Admin Style)
    const summaryBarHtml = `
    <div class="summary-bar-wazahat p-3 space-y-3">
        <!-- Top Executive Banner -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-700 flex flex-col lg:flex-row items-center justify-between gap-3">
            <div>
                <h3 class="text-xl font-bold tracking-wide flex items-center gap-2 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                    <i class="fas fa-clipboard-check text-amber-400 text-xl"></i>
                    <span>کمزور نتائج اور وضاحت جائزہ</span>
                    <span class="text-xs font-sans font-normal opacity-75">(Wazahat Followup Dashboard)</span>
                </h3>
                <p class="text-xs text-slate-300 mt-0.5 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                    اساتذہ کی موصولہ وضاحتوں اور تعلیمی تبصروں کا تفصیلی جائزہ
                </p>
            </div>
            <div class="flex flex-wrap items-center justify-center gap-2">
                <div class="bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-1.5 text-center min-w-[85px] shadow-xs">
                    <span class="block text-[9px] text-slate-400 font-sans font-bold uppercase tracking-wider">Kul Kamzor</span>
                    <span class="text-lg font-black text-amber-400 font-sans">${totalCases}</span>
                </div>
                <div class="bg-emerald-950/70 border border-emerald-700/60 rounded-lg px-3 py-1.5 text-center min-w-[85px] shadow-xs">
                    <span class="block text-[9px] text-emerald-300 font-sans font-bold uppercase tracking-wider">Wazahat Aagayi</span>
                    <span class="text-lg font-black text-emerald-400 font-sans">${totalSubmitted}</span>
                </div>
                <div class="bg-rose-950/70 border border-rose-700/60 rounded-lg px-3 py-1.5 text-center min-w-[85px] shadow-xs">
                    <span class="block text-[9px] text-rose-300 font-sans font-bold uppercase tracking-wider">Wazahat Baqi</span>
                    <span class="text-lg font-black text-rose-400 font-sans">${totalPending}</span>
                </div>
                <div class="bg-teal-950/70 border border-teal-700/60 rounded-lg px-3 py-1.5 text-center min-w-[95px] shadow-xs">
                    <span class="block text-[9px] text-teal-300 font-sans font-bold uppercase tracking-wider">Comment Add Kar Diye</span>
                    <span class="text-lg font-black text-teal-400 font-sans">${totalCommentAdded}</span>
                </div>
                <div class="bg-amber-950/70 border border-amber-700/60 rounded-lg px-3 py-1.5 text-center min-w-[85px] shadow-xs">
                    <span class="block text-[9px] text-amber-300 font-sans font-bold uppercase tracking-wider">Comment Baqi</span>
                    <span class="text-lg font-black text-amber-400 font-sans">${totalCommentPending}</span>
                </div>
                <div class="bg-indigo-950/80 border border-indigo-700/60 rounded-lg px-3 py-1.5 text-center min-w-[85px] shadow-xs">
                    <span class="block text-[9px] text-indigo-300 font-sans font-bold uppercase tracking-wider">Wazahat %</span>
                    <span class="text-lg font-black text-indigo-300 font-sans">${completionRate.toFixed(1)}%</span>
                </div>
            </div>
        </div>

        <!-- Instant Filter & Live Search Toolbar -->
        <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 no-print">
            <div class="relative w-full md:w-96">
                <i class="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                <input type="text" id="wazahat-live-search" placeholder="تلاش کریں (جامعہ، استاد، مضمون، وغیرہ)..." class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 urdu-font text-right bg-slate-50/50" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
            </div>
            <div class="flex items-center gap-2 w-full md:w-auto justify-end">
                <span class="text-xs font-bold text-slate-600 font-sans whitespace-nowrap"><i class="fas fa-filter text-indigo-500 mr-1"></i> Filter:</span>
                <select id="wazahat-status-filter" class="p-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                    <option value="all">تمام ریکارڈز (${totalCases})</option>
                    <option value="submitted">✅ صرف موصولہ وضاحت (${totalSubmitted})</option>
                    <option value="pending">⏳ صرف منتظر وضاحت (${totalPending})</option>
                    <option value="comment-added">💬 صرف تبصرہ شامل شدہ (${totalCommentAdded})</option>
                    <option value="comment-pending">📝 بغیر تبصرہ / کمنٹ باقی (${totalCommentPending})</option>
                </select>
                <button id="wazahat-reset-filter-btn" class="p-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg font-bold transition font-sans border border-indigo-200" title="Reset Filters">
                    <i class="fas fa-redo-alt mr-1"></i> Reset
                </button>
            </div>
        </div>
    </div>`;

    const summaryBarContainer = document.getElementById('ra-wazahat-summary-bar');
    if (summaryBarContainer) summaryBarContainer.innerHTML = summaryBarHtml;

    // 🌟 Compact Table Header (Admin Style)
    thead.innerHTML = `
        <tr class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white text-[12px] font-bold urdu-font border-b border-slate-700 select-none" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
            <th class="py-2.5 px-2 border border-slate-700 text-center w-10 font-sans">#</th>
            <th class="py-2.5 px-3 border border-slate-700 text-right min-w-[140px] urdu-font">جامعہ</th>
            <th class="py-2.5 px-2 border border-slate-700 text-center min-w-[110px] urdu-font">استاد</th>
            <th class="py-2.5 px-2 border border-slate-700 text-center min-w-[120px] urdu-font">مضمون / درجہ</th>
            <th class="py-2.5 px-2 border border-slate-700 text-center w-16 font-sans">فیصد</th>
            <th class="py-2.5 px-2 border border-slate-700 text-center w-20 urdu-font">کیفیت</th>
            <th class="py-2.5 px-3 border border-slate-700 text-right min-w-[270px] bg-slate-900/60 urdu-font">وضاحت (Explanation)</th>
            <th class="py-2.5 px-3 border border-slate-700 text-right min-w-[190px] bg-indigo-950/40 urdu-font">تعلیمی ذمہ دار کا تبصرہ</th>
            <th class="py-2.5 px-2 border border-slate-700 text-center w-20 no-print urdu-font">ایکشن</th>
        </tr>`;

    const renderFilteredRows = () => {
        const searchVal = (document.getElementById('wazahat-live-search')?.value || '').toLowerCase().trim();
        const statusVal = document.getElementById('wazahat-status-filter')?.value || 'all';

        let filtered = wazahatItems.filter(item => {
            if (statusVal === 'submitted' && !item.hasWazahat) return false;
            if (statusVal === 'pending' && item.hasWazahat) return false;
            if (statusVal === 'comment-added' && !item.hasComment) return false;
            if (statusVal === 'comment-pending' && item.hasComment) return false;
            if (searchVal) {
                const hay = `${item.jamia} ${item.teacher} ${item.subject} ${item.darjah} ${item.wazahatText} ${item.zimmedarComment}`.toLowerCase();
                if (!hay.includes(searchVal)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="p-12 text-center text-slate-500 font-bold bg-white text-base urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                <i class="fas fa-search text-2xl mb-2 text-slate-300 block"></i>
                کوئی ریکارڈ نہیں ملا۔
            </td></tr>`;
            tfoot.innerHTML = "";
            return;
        }

        tbody.innerHTML = filtered.map((item, idx) => {
            let formattedDate = "";
            if (item.wazahatDate) {
                try {
                    const dObj = new Date(item.wazahatDate);
                    formattedDate = `<div class="text-[9.5px] text-emerald-700 font-sans mt-0.5 text-left flex items-center gap-1 justify-start" dir="ltr"><i class="far fa-clock"></i> ${dObj.toLocaleDateString('en-GB')} ${dObj.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</div>`;
                } catch(e) {}
            }

            const safeDocId = item.docId;

            const wazahatCell = item.hasWazahat ? `
                <div class="flex flex-col gap-1 text-right">
                    <div class="bg-emerald-50/90 border border-emerald-300/80 text-emerald-950 p-2 rounded-md shadow-2xs text-xs leading-relaxed urdu-font" style="direction:rtl; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 0.95rem;">
                        <div class="whitespace-pre-wrap">${item.wazahatText}</div>
                        ${formattedDate}
                    </div>
                    <button onclick="deleteWazahat('${safeDocId}', '${item.keyToDelete}', ${item.isLegacy})" class="self-end text-[10px] bg-white hover:bg-rose-600 text-rose-600 hover:text-white px-2 py-0.5 rounded border border-rose-200 transition-colors shadow-2xs font-sans font-bold flex items-center gap-1 mt-0.5 no-print">
                        <i class="fas fa-trash-alt text-[9px]"></i> Reset
                    </button>
                </div>` : `
                <div class="flex flex-col items-center justify-center py-1">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                        <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                        منتظر (Pending...)
                    </span>
                </div>`;

            const zimmedarCell = item.hasComment ? `
                <div class="flex flex-col gap-1 text-right">
                    <div class="bg-indigo-50/90 border border-indigo-200 text-indigo-950 p-2 rounded-md text-xs urdu-font leading-relaxed shadow-2xs text-right whitespace-pre-wrap" style="direction:rtl; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 0.95rem;">
                        ${item.zimmedarComment}
                    </div>
                    <button onclick="addZimmedarComment('${safeDocId}', '${item.subjectKey}')" class="self-end text-[9px] text-indigo-600 hover:text-indigo-800 font-sans font-bold no-print mt-0.5 flex items-center gap-1">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>` : `
                <div class="flex flex-col items-center justify-center py-1">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">
                        تبصرہ باقی ہے
                    </span>
                    <button onclick="addZimmedarComment('${safeDocId}', '${item.subjectKey}')" class="mt-1 text-[10px] bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white px-2 py-0.5 rounded border border-indigo-200 font-sans font-bold no-print transition-colors">
                        <i class="fas fa-plus mr-1"></i> Add Comment
                    </button>
                </div>`;

            const actionCell = `
                <button onclick="sendWazahatLink('${safeDocId}', '${item.teacher}', '${item.subject}', '${item.percVal.toFixed(1)}', '${item.kaifiyat}', '${item.darjah}')" 
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 mx-auto shadow-sm transition-colors whitespace-nowrap" title="WhatsApp Notice Bhejein">
                    <i class="fab fa-whatsapp text-sm"></i> لنک
                </button>`;

            return `
                <tr class="hover:bg-indigo-50/40 border-b border-slate-200 text-center transition-colors ${item.hasWazahat ? 'bg-white' : 'bg-rose-50/15'}">
                    <td class="py-2 px-1 border border-slate-200 font-bold font-sans text-slate-700 bg-slate-50/60 text-xs">${idx + 1}</td>
                    <td class="py-2 px-2.5 border border-slate-200 urdu-font font-bold text-slate-900 text-right text-sm leading-snug" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.jamia}</td>
                    <td class="py-2 px-2 border border-slate-200 urdu-font font-bold text-blue-900 text-sm" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.teacher}</td>
                    <td class="py-2 px-2 border border-slate-200 text-center">
                        <div class="font-bold urdu-font text-slate-900 text-sm" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.subject}</div>
                        <div class="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded inline-block mt-0.5 border border-rose-100 urdu-font" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif;">${item.darjah}</div>
                    </td>
                    <td class="py-2 px-1 border border-slate-200 text-center font-black font-sans text-xs text-rose-700 bg-rose-50/30">${item.percVal.toFixed(1)}%</td>
                    <td class="py-2 px-1 border border-slate-200 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold urdu-font inline-block shadow-2xs" style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; background-color: ${item.kaifiyatColor}18; color: ${item.kaifiyatColor}; border: 1px solid ${item.kaifiyatColor}40;">
                            ${item.kaifiyat}
                        </span>
                    </td>
                    <td class="py-2 px-2 border border-slate-200 min-w-[270px] text-right">${wazahatCell}</td>
                    <td class="py-2 px-2 border border-slate-200 min-w-[190px] text-right">${zimmedarCell}</td>
                    <td class="py-2 px-1 border border-slate-200 text-center no-print">${actionCell}</td>
                </tr>`;
        }).join('');

        const filteredSub = filtered.filter(f => f.hasWazahat).length;
        const filteredPen = filtered.length - filteredSub;
        const filteredRate = filtered.length > 0 ? (filteredSub / filtered.length) * 100 : 0;

        const filteredCom = filtered.filter(f => f.hasComment).length;
        const filteredComPen = filtered.length - filteredCom;
        const filteredComRate = filtered.length > 0 ? (filteredCom / filtered.length) * 100 : 0;

        tfoot.innerHTML = `
            <tr class="bg-slate-900 text-white font-bold text-center text-xs urdu-font border-t-2 border-slate-700">
                <td colspan="4" class="p-2.5 text-right pr-4 font-sans font-bold">TOTAL SUMMARY:</td>
                <td class="p-2.5 font-sans text-amber-400 font-black text-sm">${filtered.length}</td>
                <td class="p-2.5 text-center">-</td>
                <td class="p-2.5 text-emerald-300 font-sans font-bold text-right text-xs">
                    <div>Wazahat Aagayi: ${filteredSub} (${filteredRate.toFixed(1)}%)</div>
                    <div class="text-rose-300 font-normal">Pending: ${filteredPen}</div>
                </td>
                <td class="p-2.5 text-indigo-300 font-sans font-bold text-right text-xs">
                    <div>Comments Add: ${filteredCom} (${filteredComRate.toFixed(1)}%)</div>
                    <div class="text-amber-300 font-normal">Pending: ${filteredComPen}</div>
                </td>
                <td class="p-2.5 text-center no-print">-</td>
            </tr>`;
    };

    renderFilteredRows();

    // Setup Event Handlers for Toolbar
    const searchInput = document.getElementById('wazahat-live-search');
    const statusFilter = document.getElementById('wazahat-status-filter');
    const resetBtn = document.getElementById('wazahat-reset-filter-btn');

    if (searchInput) searchInput.oninput = renderFilteredRows;
    if (statusFilter) statusFilter.onchange = renderFilteredRows;
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = 'all';
            renderFilteredRows();
        };
    }
}

            if (layoutLevel !== 'wazahat') {
                tbody.innerHTML = rowsHtml || `<tr><td colspan="15" class="py-10 text-red-500 font-bold bg-white text-center">کوئی ریکارڈ نہیں ملا۔</td></tr>`;
            }
            subtitle.textContent = `${examType} | سال: ${examYear}`;
            loader.classList.add('hidden');
            reportArea.classList.remove('hidden');

            // 📥 1. EXCEL EXPORT
            document.getElementById('ra-download-excel').onclick = () => {
                if (window.XLSX) {
                    const table = document.getElementById('ra-data-table');
                    const wb = XLSX.utils.table_to_book(table, { sheet: "Analysis" });
                    XLSX.writeFile(wb, `Result_${layoutLevel}_${examYear}.xlsx`);
                } else {
                    alert("Excel library (SheetJS) load nahi hui. Internet connection check karein.");
                }
            };

            // 🖼️ 2. IMAGE EXPORT (Clean high-res without cuts)
            document.getElementById('ra-download-image').onclick = async () => {
                if (window.html2canvas) {
                    const btn = document.getElementById('ra-download-image');
                    const originalText = btn.innerHTML;
                    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Image...`;
                    btn.disabled = true;

                    try {
                        const reportArea = document.getElementById('ra-report-area');
                        const prevOverflow = reportArea.style.overflow;
                        reportArea.style.overflow = 'visible';
                        const tableWrapper = reportArea.querySelector('.overflow-x-auto');
                        const prevWrapperOverflow = tableWrapper ? tableWrapper.style.overflow : '';
                        if (tableWrapper) tableWrapper.style.overflow = 'visible';

                        const canvas = await window.html2canvas(reportArea, { 
                            scale: 2.2, 
                            useCORS: true,
                            backgroundColor: '#ffffff',
                            windowWidth: Math.max(document.documentElement.clientWidth, reportArea.scrollWidth + 100),
                            ignoreElements: (el) => el.classList && (el.classList.contains('no-print') || el.hasAttribute('data-html2canvas-ignore'))
                        });

                        reportArea.style.overflow = prevOverflow;
                        if (tableWrapper) tableWrapper.style.overflow = prevWrapperOverflow;

                        const link = document.createElement("a");
                        link.download = `Result_${layoutLevel}_${examYear}.png`;
                        link.href = canvas.toDataURL("image/png");
                        link.click();
                    } catch (e) {
                        alert("Image download error: " + e.message);
                    } finally {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                    }
                } else { 
                    alert("Download library load nahi hui."); 
                }
            };

            // 📄 3. PDF EXPORT (Page-by-Page Table Slicing, Repeated Header on Every Page, Zero Row Cuts, Compact Design)
            document.getElementById('ra-download-pdf').onclick = async () => {
                const btn = document.getElementById('ra-download-pdf');
                const originalText = btn.innerHTML;
                btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> PDF Ban Raha Hai...`;
                btn.disabled = true;

                try {
                    let jsPDFClass = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
                    if (!jsPDFClass) {
                        await new Promise((resolve, reject) => {
                            const s = document.createElement('script');
                            s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                            s.onload = resolve;
                            s.onerror = reject;
                            document.head.appendChild(s);
                        });
                        jsPDFClass = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
                    }

                    if (!jsPDFClass || !window.html2canvas) {
                        alert("PDF library load nahi ho saki. Internet connection check karein.");
                        return;
                    }

                    const pdf = new jsPDFClass({
                        orientation: 'landscape',
                        unit: 'mm',
                        format: 'a4'
                    });

                    if (layoutLevel === 'wazahat') {
                        // 🌟 Dedicated Compact Multi-Page Generator for Wazahat Layout
                        const searchVal = (document.getElementById('wazahat-live-search')?.value || '').toLowerCase().trim();
                        const statusVal = document.getElementById('wazahat-status-filter')?.value || 'all';

                        let itemsForPdf = wazahatItems.filter(item => {
                            if (statusVal === 'submitted' && !item.hasWazahat) return false;
                            if (statusVal === 'pending' && item.hasWazahat) return false;
                            if (statusVal === 'comment-added' && !item.hasComment) return false;
                            if (statusVal === 'comment-pending' && item.hasComment) return false;
                            if (searchVal) {
                                const hay = `${item.jamia} ${item.teacher} ${item.subject} ${item.darjah} ${item.wazahatText} ${item.zimmedarComment}`.toLowerCase();
                                if (!hay.includes(searchVal)) return false;
                            }
                            return true;
                        });

                        const buildPdfRow = (item, sr) => {
                            let formattedDate = "";
                            if (item.wazahatDate) {
                                try {
                                    const dObj = new Date(item.wazahatDate);
                                    formattedDate = `${dObj.toLocaleDateString('en-GB')} ${dObj.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}`;
                                } catch(e) {}
                            }

                            const wazahatHtml = item.hasWazahat ? `
                                <div style="background-color: #f0fdf4; border: 1px solid #86efac; color: #064e3b; padding: 4px 6px; border-radius: 4px; font-size: 11px; line-height: 1.35; direction: rtl; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; white-space: pre-wrap;">
                                    ${item.wazahatText}
                                    ${formattedDate ? `<div style="font-size: 8.5px; color: #047857; font-family: sans-serif; margin-top: 2px; direction: ltr; text-align: left;">🕒 ${formattedDate}</div>` : ''}
                                </div>` : `
                                <div style="text-align: center; padding: 2px;">
                                    <span style="display: inline-block; padding: 1px 6px; border-radius: 9999px; font-size: 9.5px; font-weight: bold; color: #b91c1c; background-color: #fff1f2; border: 1px solid #fecdd3; font-family: 'Jameel Noori Nastaleeq', serif;">منتظر (Pending...)</span>
                                </div>`;

                            const commentHtml = item.hasComment ? `
                                <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; color: #1e1b4b; padding: 4px 6px; border-radius: 4px; font-size: 11px; line-height: 1.35; direction: rtl; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; white-space: pre-wrap;">
                                    ${item.zimmedarComment}
                                </div>` : `
                                <div style="text-align: center; padding: 2px;">
                                    <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9.5px; font-weight: bold; color: #64748b; background-color: #f1f5f9; border: 1px solid #e2e8f0; font-family: 'Jameel Noori Nastaleeq', serif;">تبصرہ باقی ہے</span>
                                </div>`;

                            return `
                                <tr style="border-bottom: 1px solid #cbd5e1; background-color: ${sr % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                                    <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center; font-family: sans-serif; font-weight: bold; font-size: 11px; background-color: #f1f5f9; color: #334155; width: 35px;">${sr}</td>
                                    <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 13px; font-weight: bold; color: #0f172a; width: 140px;">${item.jamia}</td>
                                    <td style="border: 1px solid #cbd5e1; padding: 4px 4px; text-align: center; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 12px; font-weight: bold; color: #1e3a8a; width: 120px;">${item.teacher}</td>
                                    <td style="border: 1px solid #cbd5e1; padding: 4px 4px; text-align: center; width: 120px;">
                                        <div style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 12px; font-weight: bold; color: #0f172a;">${item.subject}</div>
                                        <div style="display: inline-block; padding: 0.5px 5px; border-radius: 3px; background: #fff1f2; color: #be123c; border: 1px solid #ffe4e6; font-size: 10px; font-weight: bold; font-family: 'Jameel Noori Nastaleeq', serif;">${item.darjah}</div>
                                    </td>
                                    <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center; font-family: sans-serif; font-weight: 800; font-size: 12px; color: #b91c1c; background-color: #fff1f2; width: 55px;">${item.percVal.toFixed(1)}%</td>
                                    <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center; width: 75px;">
                                        <span style="display: inline-block; padding: 1.5px 6px; border-radius: 9999px; font-size: 10px; font-weight: bold; font-family: 'Jameel Noori Nastaleeq', serif; background-color: ${item.kaifiyatColor}18; color: ${item.kaifiyatColor}; border: 1px solid ${item.kaifiyatColor}40;">
                                            ${item.kaifiyat}
                                        </span>
                                    </td>
                                    <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; vertical-align: middle; width: 320px;">${wazahatHtml}</td>
                                    <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; vertical-align: middle; width: 235px;">${commentHtml}</td>
                                </tr>`;
                        };

                        // 1. Measure exact row heights in a hidden container to eliminate cut rows completely
                        const tempMeasure = document.createElement('div');
                        tempMeasure.style.position = 'absolute';
                        tempMeasure.style.left = '-9999px';
                        tempMeasure.style.top = '0';
                        tempMeasure.style.width = '1100px';
                        tempMeasure.innerHTML = `<table style="width:100%; border-collapse:collapse;"><tbody>${itemsForPdf.map((item, idx) => buildPdfRow(item, idx + 1)).join('')}</tbody></table>`;
                        document.body.appendChild(tempMeasure);

                        const measuredRows = Array.from(tempMeasure.querySelectorAll('tr'));
                        const heights = measuredRows.map(tr => tr.offsetHeight);
                        document.body.removeChild(tempMeasure);

                        // 2. Group rows into pages based on available page height
                        const pages = [];
                        let curPage = [];
                        let curHeight = 0;

                        itemsForPdf.forEach((item, idx) => {
                            const h = heights[idx] || 55;
                            const limit = (pages.length === 0) ? 550 : 615;

                            if (curHeight + h > limit && curPage.length > 0) {
                                pages.push(curPage);
                                curPage = [];
                                curHeight = 0;
                            }
                            curPage.push({ item, sr: idx + 1 });
                            curHeight += h;
                        });
                        if (curPage.length > 0) pages.push(curPage);

                        const totalPages = pages.length || 1;
                        const subCount = itemsForPdf.filter(x => x.hasWazahat).length;
                        const penCount = itemsForPdf.filter(x => !x.hasWazahat).length;
                        const comCount = itemsForPdf.filter(x => x.hasComment).length;

                        // 3. Render each page with repeated header, thead, rows, and page numbers
                        for (let pIdx = 0; pIdx < totalPages; pIdx++) {
                            const tempPage = document.createElement('div');
                            tempPage.style.position = 'absolute';
                            tempPage.style.left = '-9999px';
                            tempPage.style.top = '0';
                            tempPage.style.width = '1100px';
                            tempPage.style.minHeight = '745px';
                            tempPage.style.backgroundColor = '#ffffff';
                            tempPage.style.padding = '12px 14px';
                            tempPage.style.boxSizing = 'border-box';
                            tempPage.style.display = 'flex';
                            tempPage.style.flexDirection = 'column';
                            tempPage.style.justifyContent = 'space-between';

                            const pageHeaderHtml = (pIdx === 0) ? `
                                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%); color: white; padding: 10px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <div>
                                        <h2 style="margin: 0; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 22px; font-weight: bold; color: #f8fafc; line-height: 1.3;">
                                            مجلس تعلیمی امور انڈیا - کمزور نتائج اور وضاحت جائزہ
                                        </h2>
                                        <p style="margin: 2px 0 0; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 13px; color: #cbd5e1;">
                                            ${examType} | تعلیمی سال: ${examYear}
                                        </p>
                                    </div>
                                    <div style="display: flex; gap: 8px;">
                                        <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 5px; text-align: center;">
                                            <span style="font-size: 8.5px; color: #94a3b8; display: block; font-family: sans-serif; font-weight: bold;">TOTAL</span>
                                            <span style="font-size: 13px; font-weight: 900; color: #fbbf24; font-family: sans-serif;">${totalCases}</span>
                                        </div>
                                        <div style="background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); padding: 3px 8px; border-radius: 5px; text-align: center;">
                                            <span style="font-size: 8.5px; color: #6ee7b7; display: block; font-family: sans-serif; font-weight: bold;">WAZAHAT AAGAYI</span>
                                            <span style="font-size: 13px; font-weight: 900; color: #34d399; font-family: sans-serif;">${totalSubmitted} (${completionRate.toFixed(0)}%)</span>
                                        </div>
                                        <div style="background: rgba(244,63,94,0.12); border: 1px solid rgba(244,63,94,0.25); padding: 3px 8px; border-radius: 5px; text-align: center;">
                                            <span style="font-size: 8.5px; color: #fda4af; display: block; font-family: sans-serif; font-weight: bold;">WAZAHAT BAQI</span>
                                            <span style="font-size: 13px; font-weight: 900; color: #fb7185; font-family: sans-serif;">${totalPending}</span>
                                        </div>
                                        <div style="background: rgba(20,184,166,0.12); border: 1px solid rgba(20,184,166,0.25); padding: 3px 8px; border-radius: 5px; text-align: center;">
                                            <span style="font-size: 8.5px; color: #5eead4; display: block; font-family: sans-serif; font-weight: bold;">COMMENTS ADD</span>
                                            <span style="font-size: 13px; font-weight: 900; color: #2dd4bf; font-family: sans-serif;">${totalCommentAdded}</span>
                                        </div>
                                    </div>
                                </div>` : `
                                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: white; padding: 7px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <div style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 17px; font-weight: bold; color: #f8fafc;">
                                        مجلس تعلیمی امور انڈیا - کمزور نتائج اور وضاحت جائزہ (${examType} | تعلیمی سال: ${examYear})
                                    </div>
                                    <div style="font-family: sans-serif; font-size: 10px; color: #94a3b8; font-weight: bold;">
                                        Page ${pIdx + 1} of ${totalPages}
                                    </div>
                                </div>`;

                            const theadHtml = `
                                <thead style="background: #1e293b; color: white;">
                                    <tr style="font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 12.5px; font-weight: bold;">
                                        <th style="border: 1px solid #334155; padding: 5px 2px; text-align: center; width: 35px; font-family: sans-serif;">#</th>
                                        <th style="border: 1px solid #334155; padding: 5px 6px; text-align: right; width: 140px;">جامعہ</th>
                                        <th style="border: 1px solid #334155; padding: 5px 4px; text-align: center; width: 120px;">استاد</th>
                                        <th style="border: 1px solid #334155; padding: 5px 4px; text-align: center; width: 120px;">مضمون / درجہ</th>
                                        <th style="border: 1px solid #334155; padding: 5px 2px; text-align: center; width: 55px; font-family: sans-serif;">فیصد</th>
                                        <th style="border: 1px solid #334155; padding: 5px 2px; text-align: center; width: 75px;">کیفیت</th>
                                        <th style="border: 1px solid #334155; padding: 5px 6px; text-align: right; width: 320px;">وضاحت (Explanation)</th>
                                        <th style="border: 1px solid #334155; padding: 5px 6px; text-align: right; width: 235px;">تعلیمی ذمہ دار کا تبصرہ</th>
                                    </tr>
                                </thead>`;

                            const isLastPage = (pIdx === totalPages - 1);
                            const tfootHtml = isLastPage ? `
                                <tfoot style="background: #0f172a; color: white; font-weight: bold; text-align: center;">
                                    <tr style="font-size: 11.5px;">
                                        <td colspan="4" style="border: 1px solid #334155; padding: 5px 8px; text-align: right; font-family: sans-serif;">TOTAL SUMMARY:</td>
                                        <td style="border: 1px solid #334155; padding: 5px 2px; font-family: sans-serif; color: #fbbf24; font-size: 12px;">${itemsForPdf.length}</td>
                                        <td style="border: 1px solid #334155; padding: 5px 2px;">-</td>
                                        <td style="border: 1px solid #334155; padding: 5px 6px; text-align: right; font-size: 10.5px; color: #6ee7b7; font-family: sans-serif;">
                                            Wazahat Aagayi: ${subCount} | Pending: ${penCount}
                                        </td>
                                        <td style="border: 1px solid #334155; padding: 5px 6px; text-align: right; font-size: 10.5px; color: #5eead4; font-family: sans-serif;">
                                            Comments Add: ${comCount} | Pending: ${itemsForPdf.length - comCount}
                                        </td>
                                    </tr>
                                </tfoot>` : '';

                            tempPage.innerHTML = `
                                <div>
                                    ${pageHeaderHtml}
                                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                        ${theadHtml}
                                        <tbody>
                                            ${(pages[pIdx] || []).map(pItem => buildPdfRow(pItem.item, pItem.sr)).join('')}
                                        </tbody>
                                        ${tfootHtml}
                                    </table>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 4px 0; font-size: 9.5px; color: #64748b; font-family: sans-serif; border-top: 1px solid #e2e8f0; margin-top: 6px;">
                                    <div>Majlis-e-Talimi Umoor India - Official Wazahat Followup Report</div>
                                    <div>Page ${pIdx + 1} of ${totalPages}</div>
                                </div>`;

                            document.body.appendChild(tempPage);
                            const canvas = await window.html2canvas(tempPage, { 
                                scale: 2, 
                                useCORS: true, 
                                backgroundColor: '#ffffff',
                                logging: false
                            });
                            document.body.removeChild(tempPage);

                            if (pIdx > 0) pdf.addPage('a4', 'landscape');
                            const imgData = canvas.toDataURL('image/jpeg', 0.98);
                            pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
                        }
                    } else {
                        // 🌟 Generic Clean Page-by-Page Generator for other layouts (jamia, class, teacher)
                        const allRows = Array.from(document.querySelectorAll('#ra-table-body tr'));
                        const theadHtml = document.getElementById('ra-table-head').innerHTML;
                        const tfootHtml = document.getElementById('ra-table-foot').innerHTML;
                        const rowsPerPage = 16;
                        const totalPages = Math.ceil(allRows.length / rowsPerPage) || 1;

                        for (let pIdx = 0; pIdx < totalPages; pIdx++) {
                            const tempPage = document.createElement('div');
                            tempPage.style.position = 'absolute';
                            tempPage.style.left = '-9999px';
                            tempPage.style.top = '0';
                            tempPage.style.width = '1100px';
                            tempPage.style.minHeight = '745px';
                            tempPage.style.backgroundColor = '#ffffff';
                            tempPage.style.padding = '14px';
                            tempPage.style.boxSizing = 'border-box';
                            tempPage.style.display = 'flex';
                            tempPage.style.flexDirection = 'column';
                            tempPage.style.justifyContent = 'space-between';

                            const rowsSlice = allRows.slice(pIdx * rowsPerPage, (pIdx + 1) * rowsPerPage);
                            const rowsSliceHtml = rowsSlice.map(r => r.outerHTML).join('');
                            const isLastPage = (pIdx === totalPages - 1);

                            tempPage.innerHTML = `
                                <div>
                                    <div style="background: linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%); color: white; padding: 10px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <h2 style="margin: 0; font-family: 'Jameel Noori Nastaleeq', 'Poppins', serif; font-size: 22px; font-weight: bold;">
                                            نتیجہ امتحان - ${document.getElementById('ra-report-subtitle')?.innerText || ''}
                                        </h2>
                                        <span style="font-family: sans-serif; font-size: 11px; opacity: 0.85;">Page ${pIdx + 1} of ${totalPages}</span>
                                    </div>
                                    <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12px;" dir="rtl">
                                        <thead>${theadHtml}</thead>
                                        <tbody class="divide-y divide-gray-200 urdu-font">${rowsSliceHtml}</tbody>
                                        ${isLastPage && tfootHtml ? `<tfoot>${tfootHtml}</tfoot>` : ''}
                                    </table>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 6px 4px 0; font-size: 10px; color: #64748b; font-family: sans-serif; border-top: 1px solid #e2e8f0;">
                                    <div>Majlis-e-Talimi Umoor India</div>
                                    <div>Page ${pIdx + 1} of ${totalPages}</div>
                                </div>`;

                            document.body.appendChild(tempPage);
                            const canvas = await window.html2canvas(tempPage, { 
                                scale: 2, 
                                useCORS: true, 
                                backgroundColor: '#ffffff',
                                logging: false
                            });
                            document.body.removeChild(tempPage);

                            if (pIdx > 0) pdf.addPage('a4', 'landscape');
                            const imgData = canvas.toDataURL('image/jpeg', 0.98);
                            pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
                        }
                    }

                    pdf.save(`Result_${layoutLevel}_${examYear}.pdf`);
                } catch (err) {
                    console.error("PDF generation error:", err);
                    alert("PDF download me masla aaya: " + err.message);
                } finally {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            };

        } catch (err) {
            console.error(err); loader.classList.add('hidden'); alert("Masla aaya: " + err.message);
        }
    };

    document.getElementById('ra-show-btn').onclick = () => window.fetchResultData();
}
// Function mein 'darjah' parameter add kiya gaya hai
// Function mein 'darjah' ka izafa kiya gaya hai
window.sendWazahatLink = (docId, teacherName, subject, percentage, kefiyat, darjah) => {
    const repoName = "Majlis-Talimi-Umoor-India";
    const baseUrl = `https://tuofficedrive1-wq.github.io/${repoName}/teacher-wazahat.html`;
    
    // Yahan params mein &class= joda gaya hai
    const params = `id=${docId}&teacher=${encodeURIComponent(teacherName)}&subject=${encodeURIComponent(subject)}&perc=${encodeURIComponent(percentage)}&kef=${encodeURIComponent(kefiyat)}&class=${encodeURIComponent(darjah)}`;
    
    const fullLink = `${baseUrl}?${params}`;
    
    const message = `*نوٹس برائے وضاحت (Official Notification)*\n\n` +
                    `محترم ${teacherName} صاحب،\n` +
                    `آپ کے درجہ *${darjah}* کے مضمون *(${subject})* کا رزلٹ کمزور پایا گیا ہے۔\n\n` +
                    `*تفصیلات:*\n` +
                    `فیصد: *${percentage}*\n` +
                    `کیفیت: *${kefiyat}*\n\n` +
                    `براہِ کرم اس لنک پر کلک کرکے اپنی وضاحت جمع کرائیں:\n${fullLink}\n\n` +
                    `شکریہ۔`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
};
window.addZimmedarComment = async (docId, subjectKey) => {
    const comment = prompt("Talimi Zimmedar ka comment yahan likhein:");
    if (comment === null) return; // Cancel handle

    try {
        const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const docRef = doc(window.db, "asatiza_wise_results", docId);
        
        // Dynamic key for nested object: zimmedar_comments.subject_name
        const updatePath = {};
        updatePath[`zimmedar_comments.${subjectKey}`] = comment;

        await updateDoc(docRef, updatePath);
        alert("Comment save ho gaya!");
        
        // Refresh Table
        if (window.fetchResultData) await window.fetchResultData();
    } catch (err) {
        alert("Galti: " + err.message);
    }
};
window.generateTop3Poster = async (topData, year, exam) => {
    // State Name Popup (Sirf ek baar)
    const stateName = prompt("Apni State ka naam likhein (e.g., J&K, Bihar):");
    if (!stateName) {
        alert("State ka naam zaroori hai!");
        return;
    }

    const posterDiv = document.createElement('div');
    posterDiv.style.position = 'fixed';
    posterDiv.style.top = '-5000px';
    posterDiv.style.width = '700px'; 
    posterDiv.style.height = '1000px';
    document.body.appendChild(posterDiv);

    posterDiv.innerHTML = `
        <div id="final-poster" style="width:100%; height:100%; background: #ffffff; padding: 40px; color: #064e3b; font-family: 'Segoe UI', Arial, sans-serif; text-align: center; box-sizing: border-box; display: flex; flex-direction: column; position: relative; overflow: hidden;">
            
            <div style="position:absolute; top:-60px; left:-60px; width:250px; height:250px; background:#f0f4f2; border-radius:50%; z-index:0;"></div>
            <div style="position:absolute; bottom:-60px; right:-60px; width:250px; height:250px; background:#fffdf5; border-radius:50%; z-index:0;"></div>

            <div style="position:relative; z-index:1; margin-top: 20px;">
                <div style="color: #fbbf24; font-size: 28px; letter-spacing: 5px;">⭐⭐⭐</div>
                <h2 style="font-size: 48px; margin: 10px 0 5px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">ANNUAL EXAM</h2>
                <p style="font-size: 32px; font-weight: bold; margin: 0; color: #064e3b; border-bottom: 3px solid #fbbf24; display: inline-block; padding: 0 20px;">${year}</p>
                
                <div style="margin-top: 30px;">
                    <p style="font-size: 18px; text-transform: uppercase; letter-spacing: 4px; color: #888; margin-bottom: 5px;">Proudly Announcing</p>
                    <h1 style="font-size: 110px; line-height: 0.9; margin: 0; font-weight: 900; color: #064e3b;">TOP 3</h1>
                    <p style="font-size: 22px; font-style: italic; color: #064e3b; margin-top: 15px; font-weight: 600;">Ilm ka Safar, Kamyabi ki Manzil</p>
                </div>
            </div>

            <div style="display: flex; justify-content: center; align-items: flex-end; gap: 15px; margin-top: 40px; flex: 1; position:relative; z-index:1;">
                
                <div style="width: 190px; text-align: center;">
                    <div style="background: white; border: 1px solid #eee; border-radius: 25px; padding: 25px 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); position: relative;">
                        <div style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); width: 70px; height: 70px; background: #BDC3C7; border: 6px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">2</div>
                        <p style="font-size: 13px; color: #999; margin-top: 30px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Jamia-tul-Madina</p>
                        <h3 style="font-size: 22px; font-weight: 900; margin: 8px 0; color: #064e3b; height: 30px; overflow: hidden;">${topData[1]?.name || 'N/A'}</h3>
                        <div style="width: 40px; height: 2px; background: #f0f0f0; margin: 15px auto;"></div>
                        <p style="font-size: 11px; color: #aaa; margin: 0; letter-spacing: 1px;">PERCENTAGE</p>
                        <p style="font-size: 26px; font-weight: 900; color: #064e3b; margin-top: 5px;">${topData[1]?.perc.toFixed(2)}%</p>
                    </div>
                    <div style="height: 35px; background: #95a5a6; border-radius: 0 0 15px 15px; margin: 0 12px; opacity: 0.8;"></div>
                </div>

                <div style="width: 230px; text-align: center; z-index: 2;">
                    <div style="background: white; border: 2px solid #fbbf24; border-radius: 30px; padding: 35px 10px; box-shadow: 0 15px 40px rgba(0,0,0,0.1); position: relative;">
                        <div style="position: absolute; top: -45px; left: 50%; transform: translateX(-50%); width: 90px; height: 90px; background: #fbbf24; border: 8px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; box-shadow: 0 8px 20px rgba(251,191,36,0.3);">1</div>
                        <p style="font-size: 14px; color: #999; margin-top: 40px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Jamia-tul-Madina</p>
                        <h3 style="font-size: 26px; font-weight: 900; margin: 8px 0; color: #064e3b; height: 35px; overflow: hidden;">${topData[0]?.name || 'N/A'}</h3>
                        <div style="width: 50px; height: 3px; background: #fbbf24; margin: 15px auto;"></div>
                        <p style="font-size: 12px; color: #aaa; margin: 0; letter-spacing: 1px;">PERCENTAGE</p>
                        <p style="font-size: 32px; font-weight: 900; color: #064e3b; margin-top: 5px;">${topData[0]?.perc.toFixed(2)}%</p>
                        <div style="margin-top: 15px; font-size: 24px;">🏆</div>
                    </div>
                    <div style="height: 55px; background: #d4af37; border-radius: 0 0 20px 20px; margin: 0 8px;"></div>
                </div>

                <div style="width: 190px; text-align: center;">
                    <div style="background: white; border: 1px solid #eee; border-radius: 25px; padding: 25px 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); position: relative;">
                        <div style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); width: 70px; height: 70px; background: #E67E22; border: 6px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; box-shadow: 0 4px 12px rgba(230,126,34,0.2);">3</div>
                        <p style="font-size: 13px; color: #999; margin-top: 30px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Jamia-tul-Madina</p>
                        <h3 style="font-size: 22px; font-weight: 900; margin: 8px 0; color: #064e3b; height: 30px; overflow: hidden;">${topData[2]?.name || 'N/A'}</h3>
                        <div style="width: 40px; height: 2px; background: #f0f0f0; margin: 15px auto;"></div>
                        <p style="font-size: 11px; color: #aaa; margin: 0; letter-spacing: 1px;">PERCENTAGE</p>
                        <p style="font-size: 26px; font-weight: 900; color: #064e3b; margin-top: 5px;">${topData[2]?.perc.toFixed(2)}%</p>
                    </div>
                    <div style="height: 25px; background: #d35400; border-radius: 0 0 15px 15px; margin: 0 12px; opacity: 0.8;"></div>
                </div>
            </div>

            <div style="position:relative; z-index:1; margin-bottom: 30px;">
                <h2 style="font-size: 38px; font-weight: 900; margin: 0; color: #064e3b; letter-spacing: 2px; text-transform: uppercase;">Majlis Talimi Umoor</h2>
                <p style="font-size: 22px; font-weight: bold; color: #fbbf24; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">${stateName} STATE</p>
            </div>

        </div>
    `;

    // Download Logic
    if(window.html2canvas) {
        const canvas = await html2canvas(posterDiv.querySelector('#final-poster'), { 
            scale: 4, // More Quality
            useCORS: true 
        });
        const link = document.createElement("a");
        link.download = `Top3_Madina_${stateName}_${year}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        document.body.removeChild(posterDiv);
    }
};

// --- APPRECIATION LETTER FUNCTION ---
window.generateAppreciationLetter = async (teacherName, jamiaName, examType, examYear) => {
    // State Name Popup
    const stateName = prompt("Apni State ka naam likhein (e.g., Rajasthan, Bihar):", "Rajasthan");
    if (!stateName) return;

    const letterDiv = document.createElement('div');
    letterDiv.style.position = 'fixed';
    letterDiv.style.top = '-9999px';
    letterDiv.style.width = '800px'; 
    letterDiv.style.height = '1130px'; 
    document.body.appendChild(letterDiv);

    // Date Format: DD Month YYYY
    const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Exam English Name aur Year
    let engExamType = examType.includes("سالانہ") ? "ANNUAL RESULT" : "HALF-YEARLY RESULT";
    let shortYear = examYear.split('-')[0] || examYear;

    letterDiv.innerHTML = `
        <div id="final-letter" style="width: 100%; height: 100%; background-color: #ffffff; position: relative; overflow: hidden; font-family: 'Segoe UI', Arial, sans-serif; box-sizing: border-box; padding: 60px;">
            
            <!-- Border and Corner Designs -->
            <div style="position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px; border: 2px solid #c29d5b; z-index: 1;"></div>
            
            <!-- Top Left Corner -->
            <div style="position: absolute; top: 0; left: 0; width: 220px; height: 220px; background: #0b1a30; transform: rotate(45deg) translate(-110px, -110px); z-index: 2;"></div>
            <div style="position: absolute; top: 15px; left: 30px; width: 150px; height: 8px; background: #c29d5b; transform: rotate(-45deg); z-index: 3;"></div>

            <!-- Bottom Right Corner -->
            <div style="position: absolute; bottom: 0; right: 0; width: 260px; height: 260px; background: #0b1a30; transform: rotate(45deg) translate(130px, 130px); z-index: 2;"></div>
            <div style="position: absolute; bottom: 40px; right: 10px; width: 200px; height: 8px; background: #c29d5b; transform: rotate(-45deg); z-index: 3;"></div>
            
            <!-- Bottom Left Decorative Lines -->
            <div style="position: absolute; bottom: 40px; left: 40px; width: 80px; height: 80px; border-bottom: 2px solid #c29d5b; border-left: 2px solid #c29d5b; z-index: 2;"></div>
            
            <!-- Top Right Decorative Lines -->
            <div style="position: absolute; top: 40px; right: 40px; width: 80px; height: 80px; border-top: 2px solid #c29d5b; border-right: 2px solid #c29d5b; z-index: 2;"></div>

            <!-- Content -->
            <div style="position: relative; z-index: 10; text-align: center; margin-top: 50px; padding: 0 40px;">
                
                <!-- Trophy Icon -->
                <div style="font-size: 85px; color: #c29d5b; margin-bottom: 20px;">
                    <i class="fas fa-trophy"></i>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0b1a30; font-size: 46px; font-weight: 900; letter-spacing: 2px; margin: 0; margin-bottom: 10px;">APPRECIATION LETTER</h1>
                
                <!-- Subtitle (Exam Type & Year) -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 40px;">
                    <div style="height: 2px; width: 50px; background-color: #c29d5b;"></div>
                    <h3 style="color: #c29d5b; font-size: 22px; font-weight: bold; margin: 0; letter-spacing: 1.5px;">${engExamType} ${shortYear}</h3>
                    <div style="height: 2px; width: 50px; background-color: #c29d5b;"></div>
                </div>

                <!-- Teacher Details -->
                <p style="color: #333; font-size: 20px; margin-bottom: 5px; font-weight: 600;">Mohtaram</p>
                <h2 style="color: #0b1a30; font-size: 38px; font-weight: 800; margin: 0 0 10px 0;">${teacherName}</h2>
                <p style="color: #444; font-size: 20px; margin-bottom: 45px; font-weight: 500;">Jamia: ${jamiaName}</p>

                <!-- Letter Body (Matching Image Text) -->
                <div style="text-align: left; line-height: 1.8; color: #222; font-size: 20px;">
                    <p style="font-weight: 600; margin-bottom: 20px;">Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh</p>
                    
                    <p style="margin-bottom: 20px;">
                        Hamein yeh baat khushi aur musarrat ke saath pesh karte hue fakhr mehsoos ho raha hai ke aap ne ${engExamType} ${examYear} mein apni behtareen mehnat, lagan aur zimmedari ka muzahira karte hue <strong style="color: #c29d5b;">"Mumtaz Kefiyat"</strong> hasil ki hai.
                    </p>
                    
                    <p style="margin-bottom: 35px;">
                        Aap ki musalsal koshishon aur taleemi khidmaat ne jamia ki karkardagi ko behtar banane mein aham kirdar ada kiya hai. Is qabil-e-tareef kamyabi par hum aap ko dili mubarakbad pesh karte hain aur aap ke liye mazeed taraqqi aur kamyabi ki dua karte hain.
                    </p>
                    
                    <!-- Dua Section -->
                    <div style="display: flex; gap: 15px; align-items: flex-start; padding-left: 10px;">
                        <i class="fas fa-praying-hands" style="color: #c29d5b; font-size: 28px; margin-top: 5px;"></i>
                        <p style="margin: 0; font-weight: 500;">
                            Allah Ta'ala aap ki khidmaat ko qubool farmaye aur mazeed barkat ata farmaye. Aameen.
                        </p>
                    </div>
                </div>

                <!-- Footer Signatures -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 80px; text-align: left;">
                    
                    <!-- Date Section -->
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <i class="far fa-calendar-alt" style="font-size: 35px; color: #0b1a30;"></i>
                        <div>
                            <div style="font-size: 16px; font-weight: bold; color: #555;">Date:</div>
                            <div style="font-size: 18px; font-weight: bold; color: #0b1a30;">${currentDate}</div>
                        </div>
                    </div>
                    
                    <!-- Department Section -->
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-book-open" style="font-size: 40px; color: #0b1a30;"></i>
                        <div>
                            <div style="font-size: 20px; font-weight: 900; color: #0b1a30; letter-spacing: 1px;">MAJLIS TALIMI UMOOR</div>
                            <div style="font-size: 16px; font-weight: bold; color: #c29d5b; letter-spacing: 2px;">${stateName.toUpperCase()} STATE</div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    // Download Image via html2canvas
    if(window.html2canvas) {
        try {
            const canvas = await html2canvas(letterDiv.querySelector('#final-letter'), { 
                scale: 3, // Quality increase karne ke liye
                useCORS: true 
            });
            const link = document.createElement("a");
            link.download = `Appreciation_Letter_${teacherName.replace(/\\s+/g, '_')}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (e) {
            alert("Image generate karne mein masla hua: " + e.message);
        } finally {
            document.body.removeChild(letterDiv); // Hidden div ko wapas delete kar dein
        }
    } else {
        alert("html2canvas library load nahi hui hai.");
        document.body.removeChild(letterDiv);
    }
};

// 🌟 NAYA: Wazahat Delete/Reset karne ka function
window.deleteWazahat = async (docId, keyToDelete, isLegacy) => {
    if (!confirm('Kya aap waqai is wazahat ko delete kar ke form ko wapas reset karna chahte hain?')) return;

    try {
        // Firestore se deleteField import karein
        const { updateDoc, doc, deleteField } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const docRef = doc(window.db, "asatiza_wise_results", docId);
        
        const updatePath = {};
        
        if (isLegacy) {
            // Agar purane system ki wazahat hai
            updatePath[`wazahat`] = deleteField();
        } else {
            // Naye map system ki wazahat (sirf specific subject ki wazahat udayega)
            updatePath[`wazahat_map.${keyToDelete}`] = deleteField();
            updatePath[`wazahat_date_map.${keyToDelete}`] = deleteField();
            updatePath[`zimmedar_comments.${keyToDelete}`] = deleteField();
        }

        await updateDoc(docRef, updatePath);
        alert("Wazahat delete ho gayi aur form reset ho gaya!");
        
        // Table ko automatically refresh karein
        if (window.fetchResultData) await window.fetchResultData();
    } catch (err) {
        alert("Galti: " + err.message);
    }
};

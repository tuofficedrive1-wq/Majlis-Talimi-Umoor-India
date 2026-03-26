// Filename: result-analysis.js
import {
    collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const getResultGrade = (p) => {
    let val = parseFloat(p);
    if (isNaN(val)) return "-";
    if (val >= 80) return "ممتاز";
    if (val >= 60) return "بہتر";
    if (val >= 40) return "مناسب";
    return "کمزور";
};

export async function initResultAnalysis(db, user, containerId, userProfileData) {
    // Check if db is valid
    if (!db) {
        console.error("Firestore 'db' instance is missing in initResultAnalysis");
        return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // --- HTML STRUCTURE ---
    container.innerHTML = `
      <div class="bg-white p-2 md:p-5 rounded-xl shadow-lg border border-gray-200 space-y-5 w-full">
        <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 no-print">
            <h4 class="text-sm font-bold text-indigo-700 uppercase mb-3 border-b border-indigo-200 pb-1">Result Analysis Filters</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Exam Type</label>
                    <select id="ra-exam-type" class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="ششماہی امتحان">ششماہی امتحان</option>
                        <option value="سالانہ امتحان">سالانہ امتحان</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Taleemi Saal</label>
                    <select id="ra-exam-year" class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26" selected>2025-26</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Select Jamia</label>
                    <select id="ra-jamia-filter" class="w-full p-2 border rounded text-sm urdu-font focus:ring-2 focus:ring-indigo-500">
                        <option value="">Tamam Jamiaat (All)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Analysis Level</label>
                    <select id="ra-layout-level" class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700">
                        <option value="class">Class Wise Summary</option>
                        <option value="teacher">Asatiza Wise Summary</option>
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
            <div class="bg-indigo-700 text-white p-4 text-center border-b-4 border-indigo-900">
                <h2 id="ra-report-title" class="text-2xl font-bold urdu-font">نتیجہ امتحان (Result Summary)</h2>
                <p id="ra-report-subtitle" class="text-sm opacity-90 mt-1 font-sans text-center"></p>
            </div>
            <div class="w-full overflow-x-auto">
                <table class="w-full min-w-full text-center text-sm border-collapse" dir="rtl">
                    <thead id="ra-table-head" class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300"></thead>
                    <tbody id="ra-table-body" class="divide-y divide-gray-200 urdu-font bg-white"></tbody>
                </table>
            </div>
        </div>
      </div>
    `;

    // Jamia populate
    const jamiaSelect = document.getElementById('ra-jamia-filter');
    const jamiaat = userProfileData.jamiaatList || [];
    jamiaat.forEach(j => { 
        const opt = document.createElement('option');
        opt.value = j; opt.textContent = j; jamiaSelect.appendChild(opt);
    });

    // --- FETCH FUNCTION INSIDE INIT TO CAPTURE DB ---
    const fetchResultData = async () => {
        const examType = document.getElementById('ra-exam-type').value;
        const examYear = document.getElementById('ra-exam-year').value;
        const jamiaFilter = document.getElementById('ra-jamia-filter').value;
        const layoutLevel = document.getElementById('ra-layout-level').value;
        
        const loader = document.getElementById('ra-loader');
        const reportArea = document.getElementById('ra-report-area');
        const thead = document.getElementById('ra-table-head');
        const tbody = document.getElementById('ra-table-body');
        const subtitle = document.getElementById('ra-report-subtitle');

        loader.classList.remove('hidden');
        reportArea.classList.add('hidden');
        tbody.innerHTML = '';

        try {
            const collectionName = layoutLevel === 'class' ? "class_wise_results" : "asatiza_wise_results"; 
            
            // Explicitly use the db passed to initResultAnalysis
            const colRef = collection(db, collectionName); 
            
            let q;
            if (jamiaFilter) {
                q = query(colRef, where("jamia", "==", jamiaFilter), where("examType", "==", examType), where("examYear", "==", examYear));
            } else {
                q = query(colRef, where("examType", "==", examType), where("examYear", "==", examYear));
            }

            const snap = await getDocs(q);
            let rowData = [];

            snap.forEach(doc => {
                const d = doc.data();
                if (layoutLevel === 'class') {
                    rowData.push({
                        jamia: d.jamia || '-', label: d.darjah || '-', total: d.total || '0',
                        pass: d.passed || '0', fail: d.nakam || '0', perc: d.percent || '0%',
                        grade: d.kaifiyat || getResultGrade(d.percent)
                    });
                } else {
                    if (d.data && Array.isArray(d.data)) {
                        d.data.forEach(tEntry => {
                            const tName = tEntry.teacher || "-";
                            if (tEntry.periods && Array.isArray(tEntry.periods)) {
                                tEntry.periods.forEach(p => {
                                    rowData.push({
                                        jamia: d.jamia || '-', label: `${tName} (${p.class || '-'})`,
                                        total: p.total || '0', pass: p.passed || '0',
                                        fail: (parseInt(p.total) - parseInt(p.passed)) || '0',
                                        perc: p.percentage || '0%', grade: p.kaifiyat || getResultGrade(p.percentage)
                                    });
                                });
                            }
                        });
                    }
                }
            });

            if (rowData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="py-10 text-red-500 font-bold bg-white text-center">کوئی ریکارڈ نہیں ملا۔</td></tr>`;
            } else {
                subtitle.textContent = `${examType} | سال: ${examYear}`;
                thead.innerHTML = `
                    <tr>
                        <th class="px-4 py-3 border-l">#</th>
                        <th class="px-4 py-3 border-l">جامعہ</th>
                        <th class="px-4 py-3 border-l">${layoutLevel === 'class' ? 'درجہ' : 'استاذ (درجہ)'}</th>
                        <th class="px-4 py-3 border-l">کل طلبہ</th>
                        <th class="px-4 py-3 border-l text-green-700">کامیاب</th>
                        <th class="px-4 py-3 border-l text-red-700">ناکام</th>
                        <th class="px-4 py-3 border-l">فیصد (%)</th>
                        <th class="px-4 py-3">کیفیت</th>
                    </tr>
                `;

                rowData.forEach((row, index) => {
                    tbody.innerHTML += `
                        <tr class="hover:bg-indigo-50 border-b">
                            <td class="px-4 py-3 border-l">${index + 1}</td>
                            <td class="px-4 py-3 border-l urdu-font text-right">${row.jamia}</td>
                            <td class="px-4 py-3 border-l urdu-font text-right">${row.label}</td>
                            <td class="px-4 py-3 border-l font-sans">${row.total}</td>
                            <td class="px-4 py-3 border-l font-sans text-green-700 font-bold">${row.pass}</td>
                            <td class="px-4 py-3 border-l font-sans text-red-700">${row.fail}</td>
                            <td class="px-4 py-3 border-l font-sans font-bold">${row.perc}</td>
                            <td class="px-4 py-3 font-bold urdu-font">${row.grade}</td>
                        </tr>
                    `;
                });
            }
            loader.classList.add('hidden');
            reportArea.classList.remove('hidden');
        } catch (err) {
            console.error("Fetch Error:", err);
            loader.classList.add('hidden');
            alert("ڈیٹا لوڈ کرنے میں مسئلہ پیش آیا۔");
        }
    };

    document.getElementById('ra-show-btn').onclick = fetchResultData;
}

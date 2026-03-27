// Filename: result-analysis.js
import {
    collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Jamia/Ustad Wise Kefiyat Logic
const getJamiaKefiyat = (p) => {
    let val = parseFloat(String(p).replace('%', ''));
    if (isNaN(val)) return "-";
    if (val >= 85) return "ممتاز مع شرف";
    if (val >= 76) return "ممتاز";
    if (val >= 61) return "بہتر";
    if (val >= 40) return "مناسب";
    return "کمزور";
};

// Kefiyat color logic
const getKefiyatColor = (p) => {
    let val = parseFloat(String(p).replace('%', ''));
    if (val >= 85) return "#059669";
    if (val >= 70) return "#2563eb";
    if (val >= 60) return "#d97706";
    if (val >= 40) return "#7c3aed";
    return "#dc2626";
};

export async function initResultAnalysis(db, user, containerId, userProfileData) {
    if (!db || !user) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    // result-analysis.js ke andar initResultAnalysis function mein ye badlav karein:

container.innerHTML = `
  <div class="max-w-7xl mx-auto space-y-5 w-full">
    
    <div class="bg-indigo-50 p-4 md:p-6 rounded-xl border border-indigo-200 no-print shadow-sm">
        <h4 class="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-200 pb-1 flex items-center">
            <i class="fas fa-filter mr-2"></i> Result Analysis Filters
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Exam Type</label>
                <select id="ra-exam-type" class="w-full p-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="ششماہی امتحان">ششماہی امتحان</option>
                    <option value="سالانہ امتحان">سالانہ امتحان</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Taleemi Saal</label>
                <select id="ra-exam-year" class="w-full p-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26" selected>2025-26</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Select Jamia</label>
                <select id="ra-jamia-filter" class="w-full p-2 border border-indigo-200 rounded-lg text-sm urdu-font focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Tamam Jamiaat (All)</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Analysis Level</label>
                <select id="ra-layout-level" class="w-full p-2 border border-indigo-300 rounded-lg text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="jamia">Jamia Wise Summary</option>
                    <option value="class">Class Wise Summary</option>
                    <option value="teacher">Asatiza Wise Summary</option>
                </select>
            </div>
        </div>
        <button id="ra-show-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center">
            <i class="fas fa-chart-line mr-2"></i> Result Analysis Show Karein
        </button>
    </div>

    <div id="ra-loader" class="hidden text-center py-12">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
        <p class="mt-3 text-indigo-600 font-semibold">Data analyze ho raha hai...</p>
    </div>

    <div id="ra-report-area" class="hidden mt-6 bg-white rounded-xl border border-gray-200 w-full overflow-hidden shadow-md">
        <div class="bg-indigo-800 text-white p-5 text-center border-b-4 border-indigo-900">
            <h2 id="ra-report-title" class="text-3xl font-bold urdu-font">نتیجہ امتحان (Result Summary)</h2>
            <p id="ra-report-subtitle" class="text-sm opacity-90 mt-2 font-sans tracking-wide"></p>
        </div>
        <div class="w-full overflow-x-auto">
            <table class="w-full min-w-full text-center text-xs border-collapse" dir="rtl">
                <thead id="ra-table-head" class="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-300"></thead>
                <tbody id="ra-table-body" class="divide-y divide-gray-200 urdu-font bg-white"></tbody>
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
            const collectionName = (layoutLevel === 'class' || layoutLevel === 'jamia') ? "class_wise_results" : "asatiza_wise_results"; 
            const colRef = collection(db, collectionName); 
            
            let q = query(colRef, 
                where("examType", "==", examType), 
                where("examYear", "==", examYear),
                orderBy("timestamp", "desc")
            );
            
            const snap = await getDocs(q);
            let latestDataMap = new Map();

            snap.forEach(doc => {
                const d = doc.data();
                if (userJamiaat.includes(d.jamia) && (!jamiaFilter || d.jamia === jamiaFilter)) {
                    const uniqueKey = layoutLevel === 'teacher' ? d.jamia : `${d.jamia}_${d.darjah}`;
                    if (!latestDataMap.has(uniqueKey)) {
                        latestDataMap.set(uniqueKey, d);
                    }
                }
            });

            if (layoutLevel === 'jamia') {
                thead.innerHTML = `
                    <tr class="bg-gray-200">
                        <th class="border p-2">#</th>
                        <th class="border p-2">جامعہ کا نام</th>
                        <th class="border p-2">کل طلبہ</th>
                        <th class="border p-2 text-blue-700">حاضر طلبہ</th>
                        <th class="border p-2 text-green-700">کامیاب</th>
                        <th class="border p-2 text-purple-700">ضمنی</th>
                        <th class="border p-2 text-red-600">ناکام</th>
                        <th class="border p-2">فیصد</th>
                        <th class="border p-2">کیفیت</th>
                    </tr>`;

                let jamiaStats = {};
                latestDataMap.forEach((d) => {
                    if (!jamiaStats[d.jamia]) {
                        jamiaStats[d.jamia] = { total: 0, passed: 0, nakam: 0, ghaib: 0, majazZimni: 0 };
                    }
                    jamiaStats[d.jamia].total += parseInt(d.total) || 0;
                    jamiaStats[d.jamia].passed += parseInt(d.passed) || 0;
                    jamiaStats[d.jamia].nakam += parseInt(d.nakam) || 0;
                    jamiaStats[d.jamia].ghaib += parseInt(d.ghaib) || 0;
                    jamiaStats[d.jamia].majazZimni += parseInt(d.majazZimni) || 0;
                });

                let idx = 1;
                for (let jName in jamiaStats) {
                    const s = jamiaStats[jName];
                    const hazir = s.total - s.ghaib;
                    // Calculation: % sirf Kamyab students par aur Hazir ki buniyad par
                    const percNum = hazir > 0 ? (s.passed / hazir) * 100 : 0;
                    const color = getKefiyatColor(percNum);
                    
                    tbody.innerHTML += `
                        <tr class="hover:bg-gray-50 border-b text-sm">
                            <td class="border p-2">${idx++}</td>
                            <td class="border p-2 font-bold text-right">${jName}</td>
                            <td class="border p-2 font-bold">${s.total}</td>
                            <td class="border p-2 text-blue-700 font-bold">${hazir}</td>
                            <td class="border p-2 text-green-700 font-bold">${s.passed}</td>
                            <td class="border p-2 text-purple-700 font-bold">${s.majazZimni}</td>
                            <td class="border p-2 text-red-600 font-bold">${s.nakam}</td>
                            <td class="border p-2 bg-teal-50 font-black text-teal-800">${percNum.toFixed(2)}%</td>
                            <td class="border p-2 font-bold" style="color:${color}">${getJamiaKefiyat(percNum)}</td>
                        </tr>`;
                }
            } else if (layoutLevel === 'class') {
                // Class wise detail implementation
                thead.innerHTML = `
                    <tr class="bg-gray-200">
                        <th class="border p-2">جامعہ</th><th class="border p-2">درجہ</th>
                        <th class="border p-2">ممتاز مع الشرف</th><th class="border p-2">ممتاز</th>
                        <th class="border p-2">جید جدا</th><th class="border p-2">جید</th>
                        <th class="border p-2">مقبول</th><th class="border p-2">مجاز ضمنی</th>
                        <th class="border p-2 text-red-600">ناکام</th><th class="border p-2 text-gray-500">غیر حاضر</th>
                        <th class="border p-2">کل</th><th class="border p-2 text-green-700">کامیاب</th><th class="border p-2">فیصد</th>
                    </tr>`;

                latestDataMap.forEach((d) => {
                    tbody.innerHTML += `
                        <tr class="hover:bg-gray-50 border-b text-sm">
                            <td class="border p-2 font-bold">${d.jamia}</td>
                            <td class="border p-2">${d.darjah || '-'}</td>
                            <td class="border p-2">${d.mumtazSharf || '0'}</td>
                            <td class="border p-2">${d.mumtaz || '0'}</td>
                            <td class="border p-2">${d.jayyidJidda || '0'}</td>
                            <td class="border p-2">${d.jayyid || '0'}</td>
                            <td class="border p-2">${d.maqbool || '0'}</td>
                            <td class="border p-2">${d.majazZimni || '0'}</td>
                            <td class="border p-2 text-red-600 font-bold">${d.nakam || '0'}</td>
                            <td class="border p-2 text-gray-500">${d.ghaib || '0'}</td>
                            <td class="border p-2 font-bold">${d.total || '0'}</td>
                            <td class="border p-2 text-green-700 font-bold">${d.passed || '0'}</td>
                            <td class="border p-2 bg-teal-50 font-bold text-teal-700">${d.percent || '0%'}</td>
                        </tr>`;
                });
            } else {
                // Teacher wise detail implementation
                thead.innerHTML = `
                    <tr class="bg-gray-200">
                        <th class="border p-2">جامعہ</th><th class="border p-2">استاد کا نام</th>
                        <th class="border p-2">مضمون (درجہ)</th><th class="border p-2">کل طلبہ</th>
                        <th class="border p-2 text-green-700">کامیاب</th><th class="border p-2 text-red-600">ناکام</th>
                        <th class="border p-2">فیصد</th><th class="border p-2">کیفیت</th>
                        <th class="border p-2 bg-teal-100">کیفیت (استاد)</th>
                    </tr>`;

                latestDataMap.forEach((d) => {
                    if (d.data && Array.isArray(d.data)) {
                        d.data.forEach((tEntry) => {
                            const tName = tEntry.teacher || "-";
                            const periodsCount = tEntry.periods?.length || 1;
                            
                            let teacherTotal = 0;
                            let teacherPassed = 0;
                            tEntry.periods?.forEach(p => {
                                teacherTotal += parseInt(p.total) || 0;
                                teacherPassed += parseInt(p.passed) || 0;
                            });
                            const teacherPerc = teacherTotal > 0 ? (teacherPassed / teacherTotal) * 100 : 0;
                            const teacherColor = getKefiyatColor(teacherPerc);

                            tEntry.periods?.forEach((p, pIdx) => {
                                const fail = (parseInt(p.total) - parseInt(p.passed)) || 0;
                                tbody.innerHTML += `
                                    <tr class="hover:bg-gray-50 border-b text-sm">
                                        ${pIdx === 0 ? `<td class="border p-2 font-bold align-middle" rowspan="${periodsCount}">${d.jamia}</td>` : ''}
                                        ${pIdx === 0 ? `<td class="border p-2 font-bold align-middle text-blue-700" rowspan="${periodsCount}">${tName}</td>` : ''}
                                        <td class="border p-2 text-right">${p.subject || '-'} (${p.class || '-'})</td>
                                        <td class="border p-2">${p.total || '0'}</td>
                                        <td class="border p-2 text-green-700 font-bold">${p.passed || '0'}</td>
                                        <td class="border p-2 text-red-600">${fail}</td>
                                        <td class="border p-2 font-bold">${p.percentage || '0%'}</td>
                                        <td class="border p-2">${p.kaifiyat || '-'}</td>
                                        ${pIdx === 0 ? `
                                            <td class="border p-2 bg-teal-50 align-middle font-bold" rowspan="${periodsCount}">
                                                <div style="font-size: 14px; color:${teacherColor}">${teacherPerc.toFixed(1)}%</div>
                                                <div style="font-size: 10px; color:${teacherColor}">${getJamiaKefiyat(teacherPerc)}</div>
                                            </td>` : ''}
                                    </tr>`;
                            });
                        });
                    }
                });
            }

            if (tbody.innerHTML === '') {
                tbody.innerHTML = `<tr><td colspan="15" class="py-10 text-red-500 font-bold bg-white text-center">کوئی ریکارڈ نہیں ملا۔</td></tr>`;
            }

            subtitle.textContent = `${examType} | سال: ${examYear}`;
            loader.classList.add('hidden');
            reportArea.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            loader.classList.add('hidden');
            alert("ڈیٹا لوڈ کرنے میں مسئلہ پیش آیا۔");
        }
    };

    document.getElementById('ra-show-btn').onclick = fetchResultData;
}

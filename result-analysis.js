// Filename: result-analysis.js

import {
    collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Helper: Grade Logic for Exam Results
const getResultGrade = (p) => {
    if (!p && p !== 0) return "-";
    if (p >= 80) return "ممتاز";
    if (p >= 60) return "بہتر";
    if (p >= 40) return "مناسب";
    return "کمزور";
};

// Main Function
export async function initResultAnalysis(db, user, containerId, userProfileData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // --- HTML STRUCTURE (Filters) ---
    container.innerHTML = `
      <div class="bg-white p-5 rounded-xl shadow-lg border border-gray-200 space-y-5">
        
        <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 no-print">
            <h4 class="text-sm font-bold text-indigo-700 uppercase mb-3 border-b border-indigo-200 pb-1">Result Analysis Filters</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Imtihan ka Qism (Exam Type)</label>
                    <select id="ra-exam-type" class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="ششماہی امتحان">ششماہی امتحان (Half Yearly)</option>
                        <option value="سالانہ امتحان">سالانہ امتحان (Annual)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Taleemi Saal (Year)</label>
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
            </div>

            <button id="ra-show-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition transform active:scale-95">
                <i class="fas fa-chart-bar mr-2"></i> Result Analysis Show Karein
            </button>
        </div>

        <div id="ra-loader" class="hidden text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p class="mt-2 text-indigo-600 font-semibold">Result data analyze ho raha hai...</p>
        </div>

        <div id="ra-report-area" class="hidden mt-6 bg-white rounded-lg border border-gray-200">
            <div class="bg-indigo-700 text-white p-4 text-center rounded-t-lg">
                <h2 id="ra-report-title" class="text-2xl font-bold urdu-font">نتیجہ امتحان (Result Summary)</h2>
                <p id="ra-report-subtitle" class="text-sm opacity-90 mt-1"></p>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full text-center text-sm border-collapse" dir="rtl">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th class="px-4 py-3 border-l border-slate-200">#</th>
                            <th class="px-4 py-3 border-l border-slate-200">جامعہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">درجہ (Class)</th>
                            <th class="px-4 py-3 border-l border-slate-200">کل طلبہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">شریک</th>
                            <th class="px-4 py-3 border-l border-slate-200 text-green-700">کامیاب</th>
                            <th class="px-4 py-3 border-l border-slate-200 text-red-700">ناکام</th>
                            <th class="px-4 py-3 border-l border-slate-200">فیصد (%)</th>
                            <th class="px-4 py-3">کیفیت</th>
                        </tr>
                    </thead>
                    <tbody id="ra-table-body" class="divide-y divide-gray-200 urdu-font"></tbody>
                </table>
            </div>
        </div>
      </div>
    `;

    // Populate Jamia Dropdown (Using your existing logic pattern)
    const jamiaSelect = document.getElementById('ra-jamia-filter');
    const jamiaat = userProfileData.jamiaatList || [];
    jamiaat.forEach(j => {
        jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
    });

    // Button Click Event
    document.getElementById('ra-show-btn').addEventListener('click', () => fetchResultData(db, user));
}

async function fetchResultData(db, user) {
    const examType = document.getElementById('ra-exam-type').value;
    const examYear = document.getElementById('ra-exam-year').value;
    const jamiaFilter = document.getElementById('ra-jamia-filter').value;
    
    const loader = document.getElementById('ra-loader');
    const reportArea = document.getElementById('ra-report-area');
    const tbody = document.getElementById('ra-table-body');
    const subtitle = document.getElementById('ra-report-subtitle');

    loader.classList.remove('hidden');
    reportArea.classList.add('hidden');
    tbody.innerHTML = '';

    try {
        const qRef = collection(db, 'class_wise_results');
        const q = query(
            qRef, 
            where("adminUid", "==", user.uid),
            where("examType", "==", examType),
            where("examYear", "==", examYear)
        );

        const snap = await getDocs(q);
        let results = [];
        snap.forEach(doc => results.push(doc.data()));

        if (jamiaFilter) {
            results = results.filter(r => r.jamiaName === jamiaFilter);
        }

        if (results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="py-10 text-red-500 font-bold">Is selection ke liye koi data nahi mila.</td></tr>`;
        } else {
            subtitle.textContent = `${examType} | Taleemi Saal: ${examYear}`;
            
            results.sort((a,b) => a.jamiaName.localeCompare(b.jamiaName));

            results.forEach((res, index) => {
                const total = parseInt(res.totalStudents || 0);
                const appeared = parseInt(res.appearedStudents || 0);
                const pass = parseInt(res.passStudents || 0);
                const fail = appeared - pass;
                const perc = appeared > 0 ? ((pass / appeared) * 100).toFixed(1) : 0;
                const grade = getResultGrade(parseFloat(perc));

                let colorClass = "text-gray-700";
                if (grade === "ممتاز") colorClass = "text-emerald-700 font-bold";
                else if (grade === "بہتر") colorClass = "text-blue-600 font-bold";
                else if (grade === "کمزور") colorClass = "text-red-600 font-bold";

                tbody.innerHTML += `
                    <tr class="hover:bg-indigo-50">
                        <td class="px-4 py-3 border-l">${index + 1}</td>
                        <td class="px-4 py-3 border-l">${res.jamiaName}</td>
                        <td class="px-4 py-3 border-l">${res.className}</td>
                        <td class="px-4 py-3 border-l font-sans">${total}</td>
                        <td class="px-4 py-3 border-l font-sans">${appeared}</td>
                        <td class="px-4 py-3 border-l font-sans text-green-700 font-bold">${pass}</td>
                        <td class="px-4 py-3 border-l font-sans text-red-700">${fail}</td>
                        <td class="px-4 py-3 border-l font-sans ${colorClass}">${perc}%</td>
                        <td class="px-4 py-3 ${colorClass}">${grade}</td>
                    </tr>
                `;
            });
        }

        loader.classList.add('hidden');
        reportArea.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        loader.classList.add('hidden');
        alert("Result load karne mein error aaya.");
    }
}
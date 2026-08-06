// Filename: inspection-summary.js
import { 
    getDocs, 
    collection, 
    query 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
 
// Helper: Score ke hisab se Kaifiyat (Grade) nikalne ke liye
const getGradeDetails = (percText) => {
    if (!percText) return { text: "-", class: "text-slate-400" };
    const num = parseFloat(percText.replace('%', '')) || 0;
    if (num >= 76) return { text: "Mumtaz", class: "text-emerald-600 font-bold bg-emerald-50 border-emerald-200" };
    if (num >= 61) return { text: "Behtar", class: "text-blue-600 font-bold bg-blue-50 border-blue-200" };
    if (num >= 40) return { text: "Munasib", class: "text-amber-600 font-bold bg-amber-50 border-amber-200" };
    return { text: "Kamzor", class: "text-red-600 font-bold bg-red-50 border-red-200" };
};
 
export async function renderInspectionSummary(assignedJamiaat, db) {
    const container = document.getElementById('summary-container');
    if (!container) return;

    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // --- HTML UI FILTER STRUCTURE ---
    container.innerHTML = `
      <div class="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 space-y-5">
        
        <!-- Filters Section -->
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 no-print">
            <h4 class="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-1 tracking-wider">Report Filters</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">From Month</label>
                    <input type="month" id="js-month-start" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">To Month</label>
                    <input type="month" id="js-month-end" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Jamia</label>
                    <select id="js-jamia-filter" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="">Tamam Jamiaat (All)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Kaifiyat (Grade)</label>
                    <select id="js-grade-filter" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="">Tamam Kaifiyat (All)</option>
                        <option value="Mumtaz">Mumtaz (Excellent)</option>
                        <option value="Behtar">Behtar (Very Good)</option>
                        <option value="Munasib">Munasib (Good)</option>
                        <option value="Kamzor">Kamzor (Weak)</option>
                    </select>
                </div>
                <div class="flex items-end">
                    <button id="js-show-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow transition active:scale-95 flex justify-center items-center gap-2">
                        <i class="fas fa-search"></i> Report Show Karein
                    </button>
                </div>
            </div>
        </div>

        <!-- Loader -->
        <div id="js-loader" class="hidden text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            <p class="mt-2 text-indigo-600 font-semibold text-sm">Data load ho raha hai...</p>
        </div>

        <!-- REPORT TABLE AREA -->
        <div id="js-report-area" class="hidden mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="bg-indigo-700 text-white p-4 text-center border-b-4 border-indigo-900">
                <h2 id="js-report-main-title" class="text-xl md:text-2xl font-bold tracking-wide">Inspection Report</h2>
                <p id="js-report-sub-title" class="text-xs md:text-sm text-indigo-200 mt-1"></p>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full text-center text-sm border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-xs uppercase tracking-wider">
                            <th class="p-3 border-r border-slate-200">#</th>
                            <th class="p-3 border-r border-slate-200">Mahina</th>
                            <th class="p-3 border-r border-slate-200 text-left">Jamia Name</th>
                            <th class="p-3 border-r border-slate-200">Darjah (Class)</th>
                            <th class="p-3 border-r border-slate-200 text-left">Kitab (Subject)</th>
                            <th class="p-3 border-r border-slate-200">Kaifiyat</th>
                            <th class="p-3 border-r border-slate-200">Score (%)</th>
                            <th class="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody id="js-table-body" class="text-slate-800 divide-y divide-slate-200">
                    </tbody>
                </table>
            </div>

            <div class="bg-slate-50 p-3 flex justify-end border-t border-slate-200 no-print">
                <button id="js-download-img" class="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-5 rounded-lg shadow transition">
                    <i class="fas fa-download"></i> Image Download
                </button>
            </div>
        </div>

      </div>
    `;

    // Dropdown me Jamiaat ke naam add karein
    const jamiaSelect = document.getElementById('js-jamia-filter');
    if (assignedJamiaat && Array.isArray(assignedJamiaat)) {
        assignedJamiaat.forEach(j => {
            jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });
    }

    // Event Listeners for buttons
    document.getElementById('js-show-btn').addEventListener('click', () => fetchAndRenderReport(db, assignedJamiaat));
    document.getElementById('js-download-img').addEventListener('click', downloadReportImage);
}

// --- DATA MATCHING & FETCHING LOGIC ---
async function fetchAndRenderReport(db, assignedJamiaat) {
    const startMonth = document.getElementById('js-month-start').value;
    const endMonth = document.getElementById('js-month-end').value;
    const jamiaFilter = document.getElementById('js-jamia-filter').value;
    const gradeFilter = document.getElementById('js-grade-filter').value;

    const loader = document.getElementById('js-loader');
    const reportArea = document.getElementById('js-report-area');
    const tbody = document.getElementById('js-table-body');
    const mainTitle = document.getElementById('js-report-main-title');
    const subTitle = document.getElementById('js-report-sub-title');

    if (!startMonth || !endMonth) return alert("Start aur End month select karein.");
    if (startMonth > endMonth) return alert("Shuru ka mahina baad ka nahi ho sakta.");

    loader.classList.remove('hidden');
    reportArea.classList.add('hidden');
    tbody.innerHTML = '';

    mainTitle.textContent = jamiaFilter ? jamiaFilter : "Tamam Jamiaat Ki Inspection Report";
    subTitle.textContent = `Duration: ${startMonth} se ${endMonth}`;

    try {
        // "academic_inspections" collection se data read karna
        const qSnap = await getDocs(query(collection(db, "academic_inspections")));
        let rows = [];

        qSnap.forEach(docSnap => {
            const data = docSnap.data();

            // Match 1: Check Jamia Name Assignment
            if (!assignedJamiaat.includes(data.jamiaName)) return;

            // Match 2: Filter by specific Selected Jamia
            if (jamiaFilter && data.jamiaName !== jamiaFilter) return;

            // Match 3: Filter by Month Key (YYYY-MM)
            const docMonth = data.month; 
            if (!docMonth || docMonth < startMonth || docMonth > endMonth) return;

            // Form document ke andar se Class aur Subject/Book ka Array nikalna
            if (data.classes && Array.isArray(data.classes)) {
                data.classes.forEach(cls => {
                    if (cls.subjects && Array.isArray(cls.subjects)) {
                        cls.subjects.forEach(sub => {
                            const scoreText = sub.subjectScore || "0%";
                            const gradeInfo = getGradeDetails(scoreText);

                            // Match 4: Filter by Kaifiyat (Grade)
                            if (gradeFilter && gradeInfo.text !== gradeFilter) return;

                            rows.push({
                                month: docMonth,
                                jamiaName: data.jamiaName,
                                className: cls.className || "-",
                                subjectName: sub.subjectName || "-",
                                score: scoreText,
                                grade: gradeInfo
                            });
                        });
                    }
                });
            }
        });

        // Data Sorting (Month wise and Jamia wise)
        rows.sort((a, b) => a.month.localeCompare(b.month) || a.jamiaName.localeCompare(b.jamiaName));

        // Table Render Logic
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-slate-400 font-bold bg-slate-50 text-center">Is duration/filter me koi record nahi mila.</td></tr>`;
        } else {
            rows.forEach((row, index) => {
                const [year, m] = row.month.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthStr = `${monthNames[parseInt(m) - 1]} ${year}`;

                tbody.innerHTML += `
                    <tr class="hover:bg-indigo-50/40 transition-colors odd:bg-white even:bg-slate-50">
                        <td class="p-3 border-r border-slate-200 text-slate-500 font-medium">${index + 1}</td>
                        <td class="p-3 border-r border-slate-200 font-bold text-slate-600 text-xs">${monthStr}</td>
                        <td class="p-3 border-r border-slate-200 text-left font-bold text-slate-800">${row.jamiaName}</td>
                        <td class="p-3 border-r border-slate-200 font-medium text-indigo-700">${row.className}</td>
                        <td class="p-3 border-r border-slate-200 text-left font-semibold text-slate-700">${row.subjectName}</td>
                        <td class="p-3 border-r border-slate-200">
                            <span class="px-2.5 py-1 rounded-md text-xs border ${row.grade.class}">${row.grade.text}</span>
                        </td>
                        <td class="p-3 border-r border-slate-200 font-black text-indigo-600">${row.score}</td>
                        <td class="p-3 text-center no-print">
                            <button onclick="window.open('academic-inspection-form.html?jamia=${encodeURIComponent(row.jamiaName)}&month=${row.month}', '_blank')" 
                                    class="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition">
                                View
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        loader.classList.add('hidden');
        reportArea.classList.remove('hidden');

    } catch (err) {
        console.error("Data matching error:", err);
        loader.classList.add('hidden');
        alert("Data load nahi ho pa raha: " + err.message);
    }
}

// Image Download Feature
async function downloadReportImage() {
    const loader = document.getElementById('js-loader');
    loader.classList.remove('hidden');
    
    setTimeout(async () => {
        try {
            const tableElement = document.querySelector('#js-report-area table');
            if (!tableElement) return;

            const tempDiv = document.createElement('div');
            tempDiv.style.width = '1100px'; 
            tempDiv.style.padding = '25px';
            tempDiv.style.backgroundColor = '#ffffff';
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px'; 

            const mainTitle = document.getElementById('js-report-main-title').textContent;
            const subTitle = document.getElementById('js-report-sub-title').textContent;

            tempDiv.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="font-size: 26px; font-weight: 800; color: #4338ca; margin: 0; text-transform: uppercase;">${mainTitle}</h1>
                    <p style="font-size: 14px; color: #64748b; margin-top: 6px; font-weight: 500;">${subTitle}</p>
                </div>
            `;

            const clonedTable = tableElement.cloneNode(true);
            clonedTable.style.width = '100%';
            clonedTable.style.borderCollapse = 'collapse';
            
            clonedTable.querySelectorAll('tr').forEach(tr => {
                if(tr.lastElementChild) {
                    tr.removeChild(tr.lastElementChild);
                }
            });

            clonedTable.querySelectorAll('th').forEach(th => {
                th.style.backgroundColor = '#f8fafc';
                th.style.color = '#334155';
                th.style.border = '1px solid #cbd5e1';
                th.style.padding = '10px';
                th.style.fontSize = '12px';
            });

            clonedTable.querySelectorAll('td').forEach(td => {
                td.style.border = '1px solid #e2e8f0';
                td.style.padding = '10px';
                td.style.fontSize = '13px';
            });

            tempDiv.appendChild(clonedTable);
            document.body.appendChild(tempDiv);

            const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

            const link = document.createElement('a');
            link.download = `Inspection_Summary_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            document.body.removeChild(tempDiv);
        } catch (err) {
            console.error(err);
            alert("Image download failed.");
        } finally {
            loader.classList.add('hidden');
        }
    }, 100);
}

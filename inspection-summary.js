// Filename: inspection-summary.js

import { 
    getDocs, 
    collection, 
    query 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Helper: Score ke hisaab se grade aur color nikalna
const getScoreDetails = (score) => {
    const s = parseFloat(score) || 0;
    if (s >= 80) return { text: "Behtareen", class: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (s >= 60) return { text: "Behtar", class: "text-blue-700 bg-blue-50 border-blue-200" };
    if (s >= 40) return { text: "Munasib", class: "text-amber-700 bg-amber-50 border-amber-200" };
    return { text: "Kamzor", class: "text-red-700 bg-red-50 border-red-200" };
};

export async function renderInspectionSummary(assignedJamiaat, db) {
    const container = document.getElementById('summary-container');
    if (!container) return;

    // Default Date (Current Month)
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // --- HTML STRUCTURE INJECT KAREIN ---
    container.innerHTML = `
      <div class="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 space-y-5">
        
        <!-- Filters Section -->
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 no-print">
            <h4 class="text-sm font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-1">Report Ke Filters</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Shuru Ka Mahina (From)</label>
                    <input type="month" id="insp-month-start" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Aakhiri Mahina (To)</label>
                    <input type="month" id="insp-month-end" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500" value="${currentMonth}">
                </div>
                 <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Jamia Select Karein</label>
                    <select id="insp-jamia-filter" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="">Tamam Jamiaat (All)</option>
                    </select>
                </div>
            </div>

            <button id="insp-show-btn" class="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition transform active:scale-95 flex justify-center items-center gap-2">
                <i class="fas fa-search"></i> Report Dekhein
            </button>
        </div>

        <!-- Loader -->
        <div id="insp-loader" class="hidden text-center py-10">
            <div class="inline-block border-4 border-slate-200 border-t-indigo-600 rounded-full w-10 h-10 animate-spin"></div>
            <p class="mt-3 text-indigo-600 font-semibold text-sm">Data load ho raha hai...</p>
        </div>

        <!-- Report Area -->
        <div id="insp-report-area" class="hidden mt-4 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div id="insp-report-header-bg" class="bg-indigo-700 text-white p-4 text-center border-b-4 border-indigo-900">
                <h2 id="insp-report-main-title" class="text-xl md:text-2xl font-bold tracking-wide">Inspection Report</h2>
                <p id="insp-report-sub-title" class="text-xs md:text-sm text-indigo-200 mt-1"></p>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full text-center text-sm border-collapse" id="insp-main-table">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th class="px-4 py-3 border-l border-slate-200">#</th>
                            <th class="px-4 py-3 border-l border-slate-200">Mahina</th>
                            <th class="px-4 py-3 border-l border-slate-200 text-left">Jamia Ka Naam</th>
                            <th class="px-4 py-3 border-l border-slate-200">Classes Check Kiye</th>
                            <th class="px-4 py-3 border-l border-slate-200">Kaifiyat</th>
                            <th class="px-4 py-3 border-l border-slate-200">Score (%)</th>
                            <th class="px-4 py-3 no-print">Action</th>
                        </tr>
                    </thead>
                    <tbody id="insp-table-body" class="text-slate-700 divide-y divide-slate-100">
                    </tbody>
                </table>
            </div>

            <div class="bg-slate-50 p-3 flex justify-end border-t border-slate-200 no-print">
                <button id="insp-download-img" class="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-5 rounded-lg shadow transition">
                    <i class="fas fa-download"></i> Image Download
                </button>
            </div>
        </div>

      </div>
    `;

    // --- JAMIA DROPDOWN BHARNA ---
    const jamiaSelect = document.getElementById('insp-jamia-filter');
    assignedJamiaat.forEach(jamia => {
        jamiaSelect.innerHTML += `<option value="${jamia}">${jamia}</option>`;
    });

    // --- BUTTON EVENTS ---
    document.getElementById('insp-show-btn').addEventListener('click', () => fetchAndRenderReport(db, assignedJamiaat));
    document.getElementById('insp-download-img').addEventListener('click', downloadReportImage);
}

// --- DATA FETCH AUR RENDER LOGIC ---
async function fetchAndRenderReport(db, assignedJamiaat) {
    const startMonth = document.getElementById('insp-month-start').value;
    const endMonth = document.getElementById('insp-month-end').value;
    const jamiaFilter = document.getElementById('insp-jamia-filter').value;
    
    const loader = document.getElementById('insp-loader');
    const reportArea = document.getElementById('insp-report-area');
    const tbody = document.getElementById('insp-table-body');
    const mainTitle = document.getElementById('insp-report-main-title');
    const subTitle = document.getElementById('insp-report-sub-title');

    if (!startMonth || !endMonth) {
        alert("Shuru aur Aakhiri mahina select karna zaroori hai."); 
        return; 
    }
    if (startMonth > endMonth) {
        alert("Shuru ka mahina, aakhiri mahine se bada nahi ho sakta."); 
        return; 
    }

    loader.classList.remove('hidden');
    reportArea.classList.add('hidden');
    tbody.innerHTML = '';

    // Heading Set Karna
    mainTitle.textContent = jamiaFilter ? jamiaFilter : "Tamam Jamiaat Ki Inspection Report";
    subTitle.textContent = `Duration: ${startMonth} se ${endMonth}`;

    try {
        const q = query(collection(db, "academic_inspections"));
        const querySnapshot = await getDocs(q);
        
        let rows = [];

        querySnapshot.forEach((doc) => {
            const report = doc.data();
            
            // Sirf wahi jamiaat jo assign hain
            if (!assignedJamiaat.includes(report.jamiaName)) return;
            // Agar specific jamia filter kiya hai
            if (jamiaFilter && report.jamiaName !== jamiaFilter) return;

            // Date Check (Agar date maujood hai)
            if (report.inspectionDate) {
                const dateObj = report.inspectionDate.toDate();
                const repMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                
                // Mahine ki range check karna
                if (repMonth >= startMonth && repMonth <= endMonth) {
                    rows.push({
                        ...report,
                        monthSort: repMonth,
                        displayDate: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    });
                }
            }
        });

        // Sorting (Pehle Mahina, Phir Jamia ka naam)
        rows.sort((a, b) => {
            if (a.monthSort !== b.monthSort) return a.monthSort.localeCompare(b.monthSort);
            return a.jamiaName.localeCompare(b.jamiaName);
        });

        // Table Render Karna
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-slate-500 font-bold bg-slate-50 text-center">Is mahine/filter ke mutabiq koi inspection record nahi mila.</td></tr>`;
        } else {
            rows.forEach((row, index) => {
                const scoreValue = parseFloat(row.overallPercentage) || 0;
                const scoreUi = getScoreDetails(scoreValue);

                tbody.innerHTML += `
                    <tr class="hover:bg-indigo-50/30 transition-colors odd:bg-white even:bg-slate-50">
                        <td class="px-4 py-3 border-l border-slate-200 text-slate-500 font-semibold">${index + 1}</td>
                        <td class="px-4 py-3 border-l border-slate-200 text-sm font-bold text-slate-600">${row.displayDate}</td>
                        <td class="px-4 py-3 border-l border-slate-200 text-left font-bold text-slate-800">${row.jamiaName}</td>
                        <td class="px-4 py-3 border-l border-slate-200 font-medium text-slate-600">${row.totalClasses || 0}</td>
                        <td class="px-4 py-3 border-l border-slate-200">
                            <span class="px-2.5 py-1 rounded-md text-xs font-bold border ${scoreUi.class}">${scoreUi.text}</span>
                        </td>
                        <td class="px-4 py-3 border-l border-slate-200 font-black text-indigo-600 text-base">${scoreValue}%</td>
                        <td class="px-4 py-3 text-center no-print">
                            <button onclick="window.open('academic-inspection-form.html?jamia=${encodeURIComponent(row.jamiaName)}', '_blank')" 
                                    class="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                View <i class="fas fa-external-link-alt ml-1"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        loader.classList.add('hidden');
        reportArea.classList.remove('hidden');

    } catch (error) {
        console.error("Summary error:", error);
        loader.classList.add('hidden');
        alert("Data load karne mein masla aaya. Internet connection check karein.");
    }
}

// --- IMAGE DOWNLOAD LOGIC ---
async function downloadReportImage() {
    const loader = document.getElementById('insp-loader');
    loader.classList.remove('hidden');
    
    // Thoda delay taake loader dikh sake
    setTimeout(async () => {
        try {
            const tableElement = document.querySelector('#insp-report-area table');
            if (!tableElement) return;

            // Naya temporary div banayenge HD quality ke liye (1000px wide)
            const tempDiv = document.createElement('div');
            tempDiv.style.width = '1000px'; 
            tempDiv.style.padding = '30px';
            tempDiv.style.backgroundColor = '#ffffff';
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px'; 
            tempDiv.style.top = '0';
            tempDiv.style.fontFamily = "'Poppins', sans-serif"; // Roman english friendly font

            // Header Add Karna
            const mainTitle = document.getElementById('insp-report-main-title').textContent;
            const subTitle = document.getElementById('insp-report-sub-title').textContent;

            tempDiv.innerHTML = `
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="font-size: 28px; font-weight: 800; color: #3730a3; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${mainTitle}</h1>
                    <p style="font-size: 16px; color: #64748b; margin-top: 8px; font-weight: 500;">${subTitle}</p>
                </div>
            `;

            // Table Clone aur Styling
            const clonedTable = tableElement.cloneNode(true);
            clonedTable.style.width = '100%';
            clonedTable.style.borderCollapse = 'collapse';
            
            // Action column (Aakhiri column) ko delete karna (kyunki button print nahi karna)
            clonedTable.querySelectorAll('tr').forEach(tr => {
                if (tr.children.length > 0) tr.removeChild(tr.lastElementChild);
            });

            // Inline CSS lagana image ke liye
            clonedTable.querySelectorAll('th').forEach(th => {
                th.style.backgroundColor = '#f8fafc';
                th.style.color = '#334155';
                th.style.border = '1px solid #cbd5e1';
                th.style.padding = '12px';
                th.style.fontSize = '14px';
                th.style.textTransform = 'uppercase';
            });

            clonedTable.querySelectorAll('td').forEach(td => {
                td.style.border = '1px solid #e2e8f0';
                td.style.padding = '12px';
                td.style.fontSize = '14px';
            });

            tempDiv.appendChild(clonedTable);
            
            // Footer
            const footer = document.createElement('div');
            footer.innerHTML = `<p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 25px; font-weight: bold;">Generated via Academic Inspector App</p>`;
            tempDiv.appendChild(footer);

            document.body.appendChild(tempDiv);

            // html2canvas ka istemal
            const canvas = await html2canvas(tempDiv, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            // Image Download
            const link = document.createElement('a');
            link.download = `Inspection_Report_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Cleanup
            document.body.removeChild(tempDiv);

        } catch (err) {
            console.error(err);
            alert("Image download karne mein error aaya.");
        } finally {
            loader.classList.add('hidden');
        }
    }, 100);
}

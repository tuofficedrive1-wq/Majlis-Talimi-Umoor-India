// Filename: jaiza-summary.js

import {
    collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Helper: Grade Logic
const getGrade = (p) => {
    if (!p && p !== 0) return "-";
    if (p >= 80) return "ممتاز";
    if (p >= 60) return "بہتر";
    if (p >= 40) return "مناسب";
    return "کمزور";
};

// Main Function
export async function initJaizaSummary(db, user, containerId, userProfileData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Default Date (Current Month)
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // --- HTML STRUCTURE ---
    container.innerHTML = `
      <div class="bg-white p-5 rounded-xl shadow-lg border border-gray-200 space-y-5">
        
        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 no-print">
            <h4 class="text-sm font-bold text-gray-500 uppercase mb-3 border-b pb-1">Report Filters</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">From Month</label>
                    <input type="month" id="js-month-start" class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-teal-500" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">To Month</label>
                    <input type="month" id="js-month-end" class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-teal-500" value="${currentMonth}">
                </div>
                 <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Select Jamia</label>
                    <select id="js-jamia-filter" class="w-full p-2 border rounded text-sm urdu-font focus:ring-2 focus:ring-teal-500">
                        <option value="">Tamam Jamiaat (All)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Select Class (Optional)</label>
                    <select id="js-class-filter" class="w-full p-2 border rounded text-sm urdu-font bg-gray-100 cursor-not-allowed" disabled>
                        <option value="">Tamam Classes</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Select Teacher (Optional)</label>
                    <select id="js-teacher-filter" class="w-full p-2 border rounded text-sm urdu-font bg-gray-100 cursor-not-allowed" disabled>
                        <option value="">Tamam Asatiza</option>
                    </select>
                </div>
            </div>

            <button id="js-show-btn" class="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition transform active:scale-95">
                <i class="fas fa-search mr-2"></i> Report Show Karein
            </button>
        </div>

        <div id="js-loader" class="hidden text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
            <p class="mt-2 text-teal-600 font-semibold">Data load ho raha hai...</p>
        </div>

        <div id="js-report-area" class="hidden mt-6 overflow-hidden bg-white rounded-lg">
            
            <div id="js-report-header-bg" class="bg-teal-700 text-white p-4 text-center rounded-t-lg border-b-4 border-teal-900">
                <h2 id="js-report-main-title" class="text-2xl font-bold urdu-font">جائزہ رپورٹ</h2>
                <p id="js-report-sub-title" class="text-sm text-teal-100 mt-1 opacity-90"></p>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full text-center text-sm border-collapse" dir="rtl">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-base">
                            <th class="px-4 py-3 border-l border-slate-200">#</th>
                            <th class="px-4 py-3 border-l border-slate-200">ماہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">جامعہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">استاذ</th>
                            <th class="px-4 py-3 border-l border-slate-200">درجہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">کتاب</th>
                            
                            <th class="px-4 py-3 border-l border-slate-200 w-24">کیفیت</th> <th class="px-4 py-3 w-24">فیصد (%)</th> </tr>
                    </thead>
                    <tbody id="js-table-body" class="text-gray-800 urdu-font divide-y divide-gray-200">
                        </tbody>
                </table>
            </div>

            <div class="bg-gray-50 p-3 flex justify-end border-t no-print">
                <button id="js-download-img" class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded shadow">
                    <i class="fas fa-download"></i> Download Image
                </button>
            </div>
        </div>
      </div>
    `;

    // --- LOGIC: POPULATE JAMIA DROPDOWN ---
    const jamiaSelect = document.getElementById('js-jamia-filter');
    const classSelect = document.getElementById('js-class-filter');
    const teacherSelect = document.getElementById('js-teacher-filter');

    if (userProfileData && userProfileData.jamiaatList) {
        userProfileData.jamiaatList.forEach(j => {
            jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });
    }

    // --- LOGIC: DYNAMIC FILTERS (UPDATED & ROBUST) ---
    jamiaSelect.addEventListener('change', (e) => {
        const selectedJamia = e.target.value;

        // Reset Dropdowns
        classSelect.innerHTML = '<option value="">Tamam Classes</option>';
        teacherSelect.innerHTML = '<option value="">Tamam Asatiza</option>';
        
        if (!selectedJamia) {
            classSelect.disabled = true;
            teacherSelect.disabled = true;
            classSelect.classList.add('bg-gray-100', 'cursor-not-allowed');
            teacherSelect.classList.add('bg-gray-100', 'cursor-not-allowed');
            return;
        }

        classSelect.disabled = false;
        teacherSelect.disabled = false;
        classSelect.classList.remove('bg-gray-100', 'cursor-not-allowed');
        teacherSelect.classList.remove('bg-gray-100', 'cursor-not-allowed');

        // --- DATA FINDING LOGIC (Robust) ---
        let structureData = [];
        if (userProfileData.academicStructure && Array.isArray(userProfileData.academicStructure) && userProfileData.academicStructure.length > 0) {
            structureData = userProfileData.academicStructure;
        } else if (userProfileData.structure && Array.isArray(userProfileData.structure)) {
            structureData = userProfileData.structure; 
        }

        const jamiaData = structureData.find(j => j.jamiaName === selectedJamia);
            
        if (jamiaData) {
            // --- POPULATE TEACHERS ---
            const teachersList = jamiaData.teachers || jamiaData.asatiza || [];
            
            if (Array.isArray(teachersList)) {
                const uniqueTeachers = new Set();

                teachersList.forEach(t => {
                    let tName = "";
                    if (typeof t === 'object') {
                        tName = t.name || t.teacherName || t.ustad || "";
                    } else {
                        tName = t;
                    }
                    if (tName) uniqueTeachers.add(tName.trim());
                });

                uniqueTeachers.forEach(name => {
                    teacherSelect.innerHTML += `<option value="${name}">${name}</option>`;
                });
            }

            // --- POPULATE CLASSES ---
            if (jamiaData.classes) {
                Object.keys(jamiaData.classes).forEach(cls => {
                    classSelect.innerHTML += `<option value="${cls}">${cls}</option>`;
                });
            }
        }
    });

    // --- CLICK EVENTS ---
    document.getElementById('js-show-btn').addEventListener('click', () => fetchAndRenderReport(db, user));
    
    document.getElementById('js-download-img').addEventListener('click', () => {
        const area = document.getElementById('js-report-area');
        const btns = document.querySelectorAll('.no-print');
        
        btns.forEach(b => b.style.display = 'none'); 
        
        html2canvas(area, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Jaiza_Report_${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
            btns.forEach(b => b.style.display = ''); 
        });
    });
}

// --- MAIN FETCH & RENDER LOGIC ---
async function fetchAndRenderReport(db, user) {
    const startMonth = document.getElementById('js-month-start').value;
    const endMonth = document.getElementById('js-month-end').value;
    const jamiaFilter = document.getElementById('js-jamia-filter').value;
    const classFilter = document.getElementById('js-class-filter').value;
    const teacherFilter = document.getElementById('js-teacher-filter').value;
    
    const loader = document.getElementById('js-loader');
    const reportArea = document.getElementById('js-report-area');
    const tbody = document.getElementById('js-table-body');
    const mainTitle = document.getElementById('js-report-main-title');
    const subTitle = document.getElementById('js-report-sub-title');

    if (!startMonth || !endMonth) { alert("Start aur End month select karein."); return; }
    if (startMonth > endMonth) { alert("Shuru ka mahina baad ka nahi ho sakta."); return; }

    loader.classList.remove('hidden');
    reportArea.classList.add('hidden');
    tbody.innerHTML = '';

    // --- DYNAMIC HEADER TEXT ---
    let headerText = "جائزہ رپورٹ";
    let subText = `Duration: ${startMonth} to ${endMonth}`;

    if (jamiaFilter) {
        headerText = jamiaFilter;
        let details = [];
        if (classFilter) details.push(`Class: ${classFilter}`);
        if (teacherFilter) details.push(`Teacher: ${teacherFilter}`);
        if (details.length > 0) subText += ` | ${details.join(' | ')}`;
    } else {
        headerText = "تمام جامعات کی رپورٹ";
    }

    mainTitle.textContent = headerText;
    subTitle.textContent = subText;

    try {
        const qRef = collection(db, 'jaiza_forms');
        const q = query(qRef, where("createdBy", "==", user.uid));
        
        const snapshot = await getDocs(q);
        let allDocs = snapshot.docs.map(d => d.data());

        // --- FILTERING ---
        let filteredDocs = allDocs.filter(d => {
            return d.monthKey >= startMonth && d.monthKey <= endMonth;
        });

        if (jamiaFilter) {
            filteredDocs = filteredDocs.filter(d => d.jamiaId === jamiaFilter);
        }
        if (classFilter) {
            filteredDocs = filteredDocs.filter(d => d.className === classFilter);
        }

        // --- FLATTENING ---
        let rows = [];

        filteredDocs.forEach(doc => {
            if (doc.books && Array.isArray(doc.books)) {
                doc.books.forEach(book => {
                    
                    if (teacherFilter) {
                        const tName = book.teacherName || "";
                        if (tName !== teacherFilter) return;
                    }

                    rows.push({
                        month: doc.monthKey,
                        jamia: doc.jamiaId,
                        teacher: book.teacherName || "-",
                        className: doc.className || "-",
                        book: book.bookName || "-",
                        percent: book.percentage, 
                        grade: getGrade(book.percentage)
                    });
                });
            }
        });

        // --- SORTING ---
        rows.sort((a, b) => {
            if (a.month !== b.month) return a.month.localeCompare(b.month);
            if (a.jamia !== b.jamia) return a.jamia.localeCompare(b.jamia);
            if (a.className !== b.className) return a.className.localeCompare(b.className);
            return a.teacher.localeCompare(b.teacher);
        });

        // --- RENDERING ---
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-red-500 font-bold bg-red-50">Is filter ke mutabiq koi record nahi mila.</td></tr>`;
        } else {
            rows.forEach((row, index) => {
                const pVal = row.percent !== null && row.percent !== undefined ? row.percent.toFixed(1) + "%" : "-";
                
                const dateObj = new Date(row.month + "-01");
                const monthStr = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });

                let gradeColor = "text-gray-700";
                if(row.grade === "ممتاز") gradeColor = "text-green-700 font-bold";
                if(row.grade === "کمزور") gradeColor = "text-red-600 font-bold";

                tbody.innerHTML += `
                    <tr class="hover:bg-teal-50 transition-colors odd:bg-white even:bg-slate-50">
                        <td class="px-4 py-3 border-l border-slate-200">${index + 1}</td>
                        <td class="px-4 py-3 border-l border-slate-200 font-bold text-gray-600 font-sans text-xs">${monthStr}</td>
                        <td class="px-4 py-3 border-l border-slate-200">${row.jamia}</td>
                        <td class="px-4 py-3 border-l border-slate-200">${row.teacher}</td>
                        <td class="px-4 py-3 border-l border-slate-200">${row.className}</td>
                        <td class="px-4 py-3 border-l border-slate-200 text-teal-800">${row.book}</td>
                        
                        <td class="px-4 py-3 border-l border-slate-200 ${gradeColor}">${row.grade}</td> <td class="px-4 py-3 font-bold font-sans ${row.percent < 40 ? 'text-red-600' : 'text-gray-800'}">${pVal}</td> </tr>
                `;
            });
        }

        loader.classList.add('hidden');
        reportArea.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        loader.classList.add('hidden');
        alert("Error: Data load karne mein masla hua.");
    }
}

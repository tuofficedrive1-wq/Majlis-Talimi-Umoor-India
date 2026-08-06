import { 
    getDocs, 
    collection, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
 
// Helper: Grade Logic
const getGrade = (p) => {
    if (!p && p !== 0) return "-";
    if (p >= 80) return "Mumtaz";
    if (p >= 60) return "Behtar";
    if (p >= 40) return "Munasib";
    return "Kamzor";
};

// Helper: Academic Year Calculation
const getAcademicYear = (dateString) => {
    if (!dateString) return null;
    const [yStr, mStr] = dateString.split("-");
    const yearNum = parseInt(yStr);
    const monthNum = parseInt(mStr) - 1; // 0-11
    return monthNum >= 3 ? `${yearNum}-${yearNum + 1}` : `${yearNum - 1}-${yearNum}`;
};

export async function renderInspectionSummary(assignedJamiaat, db) {
    const container = document.getElementById('summary-container');
    if (!container) return;

    const auth = getAuth();
    const user = auth.currentUser;
    const userProfileData = window.currentUserData || {}; // HTML file se cached data

    // Default Date (Current Month)
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // --- HTML STRUCTURE ---
    container.innerHTML = `
      <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-5">
        
        <!-- Filters Section -->
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 no-print">
            <h4 class="text-sm font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-1">Report Filters</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">From Month</label>
                    <input type="month" id="js-month-start" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">To Month</label>
                    <input type="month" id="js-month-end" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500" value="${currentMonth}">
                </div>
                 <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Jamia</label>
                    <select id="js-jamia-filter" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500">
                        <option value="">Tamam Jamiaat (All)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <!-- Class Multi-Select -->
                <div class="relative group">
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Class (Multiple)</label>
                    <button type="button" id="js-class-dropdown-btn" class="w-full p-2 border border-slate-300 rounded text-sm text-left bg-slate-100 text-slate-500 flex justify-between items-center cursor-not-allowed" disabled>
                        <span class="truncate">Tamam Classes</span>
                        <i class="fas fa-chevron-down text-xs ml-2"></i>
                    </button>
                    <div id="js-class-dropdown-content" class="hidden absolute top-full left-0 right-0 z-50 bg-white border border-slate-300 rounded shadow-xl mt-1 max-h-60 overflow-y-auto p-1">
                    </div>
                </div>

                <!-- Teacher Select -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Teacher (Optional)</label>
                    <select id="js-teacher-filter" class="w-full p-2 border border-slate-300 rounded text-sm bg-slate-100 cursor-not-allowed" disabled>
                        <option value="">Tamam Asatiza</option>
                    </select>
                </div>

                <!-- Kaifiyat Multi-Select -->
                <div class="relative group">
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Kaifiyat (Multiple)</label>
                    <button type="button" id="js-grade-dropdown-btn" class="w-full p-2 border border-slate-300 rounded text-sm text-left bg-white text-slate-700 flex justify-between items-center focus:ring-2 focus:ring-teal-500">
                        <span class="truncate">Tamam (All)</span>
                        <i class="fas fa-chevron-down text-xs ml-2"></i>
                    </button>
                    <div id="js-grade-dropdown-content" class="hidden absolute top-full left-0 right-0 z-50 bg-white border border-slate-300 rounded shadow-xl mt-1 max-h-60 overflow-y-auto p-1">
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-slate-100">
                            <input type="checkbox" value="Mumtaz" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded">
                            <span class="text-sm text-emerald-700 font-bold">Mumtaz (Excellent)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-slate-100">
                            <input type="checkbox" value="Behtar" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded">
                            <span class="text-sm text-blue-600 font-bold">Behtar (Very Good)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-slate-100">
                            <input type="checkbox" value="Munasib" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded">
                            <span class="text-sm text-amber-600 font-bold">Munasib (Good)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-slate-100">
                            <input type="checkbox" value="Kamzor" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded">
                            <span class="text-sm text-red-600 font-bold">Kamzor (Weak)</span>
                        </label>
                    </div>
                </div>
            </div>

            <button id="js-show-btn" class="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition transform active:scale-95 flex justify-center items-center">
                <i class="fas fa-search mr-2"></i> Report Show Karein
            </button>
        </div>

        <!-- Loader -->
        <div id="js-loader" class="hidden text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
            <p class="mt-2 text-teal-600 font-semibold">Data load ho raha hai...</p>
        </div>

        <!-- REPORT AREA -->
        <div id="js-report-area" class="hidden mt-4 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div id="js-report-header-bg" class="bg-teal-700 text-white p-4 text-center border-b-4 border-teal-900">
                <h2 id="js-report-main-title" class="text-xl md:text-2xl font-bold tracking-wide">Jaiza Report</h2>
                <p id="js-report-sub-title" class="text-xs md:text-sm text-teal-100 mt-1 opacity-90"></p>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full text-center text-sm border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th class="px-4 py-3 border-r border-slate-200">#</th>
                            <th class="px-4 py-3 border-r border-slate-200">Mahina</th>
                            <th class="px-4 py-3 border-r border-slate-200 text-left">Jamia</th>
                            <th class="px-4 py-3 border-r border-slate-200 text-left">Ustad</th>
                            <th class="px-4 py-3 border-r border-slate-200">Darjah</th>
                            <th class="px-4 py-3 border-r border-slate-200 text-left">Kitab</th>
                            <th class="px-4 py-3 border-r border-slate-200">Kaifiyat</th>
                            <th class="px-4 py-3">Fisad (%)</th>
                        </tr>
                    </thead>
                    <tbody id="js-table-body" class="text-slate-800 divide-y divide-slate-200">
                    </tbody>
                </table>
            </div>

            <div class="bg-slate-50 p-3 flex justify-end border-t border-slate-200 no-print">
                <button id="js-download-img" class="flex items-center gap-2 bg-teal-800 hover:bg-teal-900 text-white font-bold py-2 px-5 rounded shadow transition">
                    <i class="fas fa-download"></i> Image Download
                </button>
            </div>
        </div>

      </div>
    `;

    // --- DOM REFERENCES ---
    const jamiaSelect = document.getElementById('js-jamia-filter');
    const classDropdownBtn = document.getElementById('js-class-dropdown-btn');
    const classDropdownContent = document.getElementById('js-class-dropdown-content');
    const gradeDropdownBtn = document.getElementById('js-grade-dropdown-btn');
    const gradeDropdownContent = document.getElementById('js-grade-dropdown-content');
    const teacherSelect = document.getElementById('js-teacher-filter');
    const startMonthInput = document.getElementById('js-month-start');

    // --- 1. POPULATE JAMIA DROPDOWN ---
    assignedJamiaat.forEach(j => {
        jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
    });

    // --- 2. DROPDOWN TOGGLE LOGIC ---
    const setupCompactDropdown = (btn, content, checkboxClass, defaultText) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!btn.disabled) {
                if(content !== classDropdownContent) classDropdownContent.classList.add('hidden');
                if(content !== gradeDropdownContent) gradeDropdownContent.classList.add('hidden');
                content.classList.toggle('hidden');
            }
        });

        const updateText = () => {
            const checkedBoxes = content.querySelectorAll(`.${checkboxClass}:checked`);
            const span = btn.querySelector('span');
            if (checkedBoxes.length === 0) {
                span.textContent = defaultText;
                span.classList.remove('font-bold', 'text-teal-700');
            } else if (checkedBoxes.length === 1) {
                span.textContent = checkedBoxes[0].value;
                span.classList.add('font-bold', 'text-teal-700');
            } else {
                span.textContent = `${checkedBoxes.length} Selected`;
                span.classList.add('font-bold', 'text-teal-700');
            }
        };

        content.querySelectorAll(`.${checkboxClass}`).forEach(cb => {
            cb.addEventListener('change', updateText);
        });
        return updateText;
    };

    const updateClassText = setupCompactDropdown(classDropdownBtn, classDropdownContent, 'js-class-checkbox', 'Tamam Classes');
    const updateGradeText = setupCompactDropdown(gradeDropdownBtn, gradeDropdownContent, 'js-grade-checkbox', 'Tamam (All)');

    document.addEventListener('click', (e) => {
        if (!classDropdownBtn.contains(e.target) && !classDropdownContent.contains(e.target)) {
            classDropdownContent.classList.add('hidden');
        }
        if (!gradeDropdownBtn.contains(e.target) && !gradeDropdownContent.contains(e.target)) {
            gradeDropdownContent.classList.add('hidden');
        }
    });

    // --- 3. DYNAMIC FILTERS LOGIC (Classes & Teachers based on Jamia) ---
    const updateDropdowns = () => {
        const selectedJamia = jamiaSelect.value.trim();
        const currentStartMonth = startMonthInput.value;
        
        classDropdownContent.innerHTML = ''; 
        const span = classDropdownBtn.querySelector('span');
        span.textContent = "Tamam Classes";
        span.classList.remove('font-bold', 'text-teal-700');
        
        teacherSelect.innerHTML = '<option value="">Tamam Asatiza</option>';
        
        if (!selectedJamia) {
            classDropdownBtn.disabled = true;
            classDropdownBtn.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
            classDropdownBtn.classList.remove('bg-white', 'text-slate-700');
            
            teacherSelect.disabled = true;
            teacherSelect.classList.add('bg-slate-100', 'cursor-not-allowed');
            return;
        }

        classDropdownBtn.disabled = false;
        classDropdownBtn.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
        classDropdownBtn.classList.add('bg-white', 'text-slate-700');
        teacherSelect.disabled = false;
        teacherSelect.classList.remove('bg-slate-100', 'cursor-not-allowed');

        const academicYear = getAcademicYear(currentStartMonth);
        let jamiaData = null;

        if (userProfileData.academicYears && userProfileData.academicYears[academicYear]) {
            const struct = userProfileData.academicYears[academicYear].karkardagiStructure || [];
            jamiaData = struct.find(j => j.jamiaName.trim() === selectedJamia);
        }

        if (jamiaData) {
            const uniqueClasses = new Set();
            const uniqueTeachers = new Set();
            const teachersList = jamiaData.teachers || jamiaData.asatiza || [];
            
            teachersList.forEach(t => {
                const tName = t.name || t.teacherName || t.ustad;
                if (tName) uniqueTeachers.add(tName.trim());
                if (Array.isArray(t.periods)) {
                    t.periods.forEach(p => {
                        const cName = p.className || p.class || p.darja;
                        if (cName) uniqueClasses.add(cName.trim());
                    });
                }
            });

            if (jamiaData.classes && typeof jamiaData.classes === 'object') {
                Object.keys(jamiaData.classes).forEach(c => uniqueClasses.add(c));
            }

            Array.from(uniqueClasses).sort().forEach(cls => {
                const label = document.createElement('label');
                label.className = "flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-slate-100";
                label.innerHTML = `
                    <input type="checkbox" value="${cls}" class="js-class-checkbox form-checkbox h-4 w-4 text-teal-600 rounded">
                    <span class="text-sm text-slate-700 select-none">${cls}</span>
                `;
                label.querySelector('input').addEventListener('change', updateClassText);
                classDropdownContent.appendChild(label);
            });

            Array.from(uniqueTeachers).sort().forEach(tea => {
                teacherSelect.innerHTML += `<option value="${tea}">${tea}</option>`;
            });
        }
    };

    jamiaSelect.addEventListener('change', updateDropdowns);
    startMonthInput.addEventListener('change', updateDropdowns);

    // --- 4. BUTTON CLICK EVENTS ---
    document.getElementById('js-show-btn').addEventListener('click', () => fetchAndRenderReport(db, user, assignedJamiaat));
    document.getElementById('js-download-img').addEventListener('click', downloadReportImage);
}

// --- MAIN FETCH & RENDER LOGIC ---
async function fetchAndRenderReport(db, user, assignedJamiaat) {
    const startMonth = document.getElementById('js-month-start').value;
    const endMonth = document.getElementById('js-month-end').value;
    const jamiaFilter = document.getElementById('js-jamia-filter').value;
    
    const classDropdownContent = document.getElementById('js-class-dropdown-content');
    const checkedClassBoxes = classDropdownContent.querySelectorAll('.js-class-checkbox:checked');
    const selectedClasses = Array.from(checkedClassBoxes).map(cb => cb.value);

    const gradeDropdownContent = document.getElementById('js-grade-dropdown-content');
    const checkedGradeBoxes = gradeDropdownContent.querySelectorAll('.js-grade-checkbox:checked');
    const selectedGrades = Array.from(checkedGradeBoxes).map(cb => cb.value);

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

    // Header Text
    let headerText = "Jaiza Report";
    let subText = `Duration: ${startMonth} to ${endMonth}`;

    if (jamiaFilter) {
        headerText = jamiaFilter;
        let details = [];
        if (selectedClasses.length > 0) details.push(`Classes: ${selectedClasses.join(', ')}`);
        if (teacherFilter) details.push(`Teacher: ${teacherFilter}`);
        if (selectedGrades.length > 0) details.push(`Kaifiyat: ${selectedGrades.join(', ')}`);
        if (details.length > 0) subText += ` | ${details.join(' | ')}`;
    } else {
        headerText = "Tamam Jamiaat Ki Report";
    }

    mainTitle.textContent = headerText;
    subTitle.textContent = subText;

    try {
        const qRef = collection(db, 'jaiza_forms');
        
        // Agar currentUser hai tou uski banai hui form layein, warna inspector ki assigned lists se layein
        let q;
        if (user && user.uid) {
            q = query(qRef, where("createdBy", "==", user.uid));
        } else {
            q = query(qRef); 
        }
        
        const snapshot = await getDocs(q);
        let allDocs = snapshot.docs.map(d => d.data());

        // Filtering by Month
        let filteredDocs = allDocs.filter(d => d.monthKey >= startMonth && d.monthKey <= endMonth);

        // Security / Assignment Filter
        filteredDocs = filteredDocs.filter(d => assignedJamiaat.includes(d.jamiaId));

        if (jamiaFilter) {
            filteredDocs = filteredDocs.filter(d => d.jamiaId === jamiaFilter);
        }
        if (selectedClasses.length > 0) {
            filteredDocs = filteredDocs.filter(d => selectedClasses.includes(d.className));
        }

        // Flattening Data (Har Book ke hisab se row)
        let rows = [];

        filteredDocs.forEach(doc => {
            if (doc.books && Array.isArray(doc.books)) {
                doc.books.forEach(book => {
                    if (teacherFilter) {
                        const tName = book.teacherName || "";
                        if (tName !== teacherFilter) return;
                    }
                    // Yahan wohi getGrade helper use kiya gaya hai jo top par hai
                    const currentGrade = book.percentage >= 80 ? "Mumtaz" : (book.percentage >= 60 ? "Behtar" : (book.percentage >= 40 ? "Munasib" : "Kamzor"));
                    
                    if (selectedGrades.length > 0) {
                        if (!selectedGrades.includes(currentGrade)) return; 
                    }

                    rows.push({
                        month: doc.monthKey,
                        jamia: doc.jamiaId,
                        teacher: book.teacherName || "-",
                        className: doc.className || "-",
                        book: book.bookName || "-",
                        percent: book.percentage, 
                        grade: currentGrade
                    });
                });
            }
        });

        // Sorting
        rows.sort((a, b) => {
            if (a.month !== b.month) return a.month.localeCompare(b.month);
            if (a.jamia !== b.jamia) return a.jamia.localeCompare(b.jamia);
            if (a.className !== b.className) return a.className.localeCompare(b.className);
            return a.teacher.localeCompare(b.teacher);
        });

        // Rendering Main Report Table
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-red-500 font-bold bg-red-50 text-center">Is filter ke mutabiq koi record nahi mila.</td></tr>`;
        } else {
            rows.forEach((row, index) => {
                const pVal = row.percent !== null && row.percent !== undefined ? row.percent.toFixed(1) + "%" : "-";
                const dateObj = new Date(row.month + "-01");
                const monthStr = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });

                let rowColorClass = "text-slate-700"; 
                if (row.grade === "Mumtaz") rowColorClass = "text-emerald-600 font-bold";
                else if (row.grade === "Behtar") rowColorClass = "text-blue-600 font-bold";
                else if (row.grade === "Munasib") rowColorClass = "text-amber-600 font-bold";
                else if (row.grade === "Kamzor") rowColorClass = "text-red-600 font-bold";

                tbody.innerHTML += `
                    <tr class="hover:bg-teal-50/50 transition-colors odd:bg-white even:bg-slate-50">
                        <td class="px-4 py-3 border-r border-slate-200 text-slate-500">${index + 1}</td>
                        <td class="px-4 py-3 border-r border-slate-200 font-bold text-slate-600 text-xs">${monthStr}</td>
                        <td class="px-4 py-3 border-r border-slate-200 text-left font-bold">${row.jamia}</td>
                        <td class="px-4 py-3 border-r border-slate-200 text-left font-medium">${row.teacher}</td>
                        <td class="px-4 py-3 border-r border-slate-200">${row.className}</td>
                        <td class="px-4 py-3 border-r border-slate-200 text-left text-teal-700 font-semibold">${row.book}</td>
                        <td class="px-4 py-3 border-r border-slate-200 ${rowColorClass}">${row.grade}</td>
                        <td class="px-4 py-3 ${rowColorClass}">${pVal}</td>
                    </tr>
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

// --- IMAGE DOWNLOAD LOGIC ---
async function downloadReportImage() {
    const loader = document.getElementById('js-loader');
    loader.classList.remove('hidden');
    
    setTimeout(async () => {
        try {
            const tableElement = document.querySelector('#js-report-area table');
            if (!tableElement) return;

            const tempDiv = document.createElement('div');
            tempDiv.style.width = '1200px'; 
            tempDiv.style.padding = '30px';
            tempDiv.style.backgroundColor = '#ffffff';
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px'; 
            tempDiv.style.top = '0';
            tempDiv.style.fontFamily = "'Poppins', sans-serif";

            const mainTitle = document.getElementById('js-report-main-title').textContent;
            const subTitle = document.getElementById('js-report-sub-title').textContent;

            tempDiv.innerHTML = `
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="font-size: 28px; font-weight: 800; color: #0f766e; margin: 0; text-transform: uppercase;">${mainTitle}</h1>
                    <p style="font-size: 16px; color: #64748b; margin-top: 8px; font-weight: 500;">${subTitle}</p>
                </div>
            `;

            const clonedTable = tableElement.cloneNode(true);
            clonedTable.style.width = '100%';
            clonedTable.style.borderCollapse = 'collapse';
            
            clonedTable.querySelectorAll('th').forEach(th => {
                th.style.backgroundColor = '#f1f5f9';
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
            
            const footer = document.createElement('div');
            footer.innerHTML = `<p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 25px; font-weight: bold;">Generated via Academic Inspector App</p>`;
            tempDiv.appendChild(footer);

            document.body.appendChild(tempDiv);

            // Using html2canvas (must be in your HTML head)
            const canvas = await html2canvas(tempDiv, {
                scale: 2, 
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const link = document.createElement('a');
            link.download = `Jaiza_Report_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            document.body.removeChild(tempDiv);

        } catch (err) {
            console.error(err);
            alert("Image download karne mein error aaya.");
        } finally {
            loader.classList.add('hidden');
        }
    }, 100);
}

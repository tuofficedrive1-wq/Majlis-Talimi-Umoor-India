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
    
// Helper: Academic Year Calculation
const getAcademicYear = (dateString) => {
    if (!dateString) return null;
    const [yStr, mStr] = dateString.split("-");
    const yearNum = parseInt(yStr);
    const monthNum = parseInt(mStr) - 1; 
    return monthNum >= 3 ? `${yearNum}-${yearNum + 1}` : `${yearNum - 1}-${yearNum}`;
};

export async function renderInspectionSummary(assignedJamiaat, db) {
    const container = document.getElementById('summary-container');
    if (!container) return;

    // User data cache se uthana taake teachers/classes load ho sakein
    const userProfileData = window.currentUserData || {}; 

    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // --- HTML UI FILTER STRUCTURE (Same as jaiza-summary.js) ---
    container.innerHTML = `
      <div class="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 space-y-5">
        
        <!-- Filters Section -->
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 no-print">
            <h4 class="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-1 tracking-wider">Report Filters</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">From Month</label>
                    <input type="month" id="insp-month-start" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">To Month</label>
                    <input type="month" id="insp-month-end" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Jamia</label>
                    <select id="insp-jamia-filter" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="">Tamam Jamiaat (All)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <!-- Class Multi-Select -->
                <div class="relative group">
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Class (Multiple)</label>
                    <button type="button" id="insp-class-dropdown-btn" class="w-full p-2 border border-slate-300 rounded-lg text-sm text-left bg-slate-100 text-slate-500 flex justify-between items-center cursor-not-allowed" disabled>
                        <span class="truncate">Tamam Classes</span>
                        <i class="fas fa-chevron-down text-xs ml-2"></i>
                    </button>
                    <div id="insp-class-dropdown-content" class="hidden absolute top-full left-0 right-0 z-50 bg-white border border-slate-300 rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto p-1">
                    </div>
                </div>

                <!-- Teacher Select -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Teacher (Optional)</label>
                    <select id="insp-teacher-filter" class="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-100 cursor-not-allowed" disabled>
                        <option value="">Tamam Asatiza</option>
                    </select>
                </div>

                <!-- Kaifiyat Multi-Select -->
                <div class="relative group">
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Select Kaifiyat (Multiple)</label>
                    <button type="button" id="insp-grade-dropdown-btn" class="w-full p-2 border border-slate-300 rounded-lg text-sm text-left bg-white text-slate-700 flex justify-between items-center focus:ring-2 focus:ring-indigo-500">
                        <span class="truncate">Tamam (All)</span>
                        <i class="fas fa-chevron-down text-xs ml-2"></i>
                    </button>
                    <div id="insp-grade-dropdown-content" class="hidden absolute top-full left-0 right-0 z-50 bg-white border border-slate-300 rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto p-1">
                        <label class="flex items-center space-x-3 p-2 hover:bg-indigo-50 cursor-pointer rounded-lg transition border-b border-slate-100">
                            <input type="checkbox" value="Mumtaz" class="insp-grade-checkbox form-checkbox h-4 w-4 text-indigo-600 rounded">
                            <span class="text-sm text-emerald-700 font-bold">Mumtaz (Excellent)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-indigo-50 cursor-pointer rounded-lg transition border-b border-slate-100">
                            <input type="checkbox" value="Behtar" class="insp-grade-checkbox form-checkbox h-4 w-4 text-indigo-600 rounded">
                            <span class="text-sm text-blue-600 font-bold">Behtar (Very Good)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-indigo-50 cursor-pointer rounded-lg transition border-b border-slate-100">
                            <input type="checkbox" value="Munasib" class="insp-grade-checkbox form-checkbox h-4 w-4 text-indigo-600 rounded">
                            <span class="text-sm text-amber-600 font-bold">Munasib (Good)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-indigo-50 cursor-pointer rounded-lg transition border-b border-slate-100">
                            <input type="checkbox" value="Kamzor" class="insp-grade-checkbox form-checkbox h-4 w-4 text-indigo-600 rounded">
                            <span class="text-sm text-red-600 font-bold">Kamzor (Weak)</span>
                        </label>
                    </div>
                </div>
            </div>

            <button id="insp-show-btn" class="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition active:scale-95 flex justify-center items-center gap-2">
                <i class="fas fa-search"></i> Report Show Karein
            </button>
        </div>

        <!-- Loader -->
        <div id="insp-loader" class="hidden text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            <p class="mt-2 text-indigo-600 font-semibold text-sm">Data load ho raha hai...</p>
        </div>

        <!-- REPORT TABLE AREA -->
        <div id="insp-report-area" class="hidden mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="bg-indigo-700 text-white p-4 text-center border-b-4 border-indigo-900">
                <h2 id="insp-report-main-title" class="text-xl md:text-2xl font-bold tracking-wide">Inspection Report</h2>
                <p id="insp-report-sub-title" class="text-xs md:text-sm text-indigo-200 mt-1"></p>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full text-center text-sm border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-xs uppercase tracking-wider">
                            <th class="p-3 border-r border-slate-200">#</th>
                            <th class="p-3 border-r border-slate-200">Mahina</th>
                            <th class="p-3 border-r border-slate-200 text-left">Jamia Name</th>
                            <th class="p-3 border-r border-slate-200 text-left">Ustad</th>
                            <th class="p-3 border-r border-slate-200">Darjah</th>
                            <th class="p-3 border-r border-slate-200 text-left">Kitab</th>
                            <th class="p-3 border-r border-slate-200">Kaifiyat</th>
                            <th class="p-3 border-r border-slate-200">Score (%)</th>
                            <th class="p-3 no-print">Action</th>
                        </tr>
                    </thead>
                    <tbody id="insp-table-body" class="text-slate-800 divide-y divide-slate-200">
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

    // --- DOM REFERENCES ---
    const jamiaSelect = document.getElementById('insp-jamia-filter');
    const classDropdownBtn = document.getElementById('insp-class-dropdown-btn');
    const classDropdownContent = document.getElementById('insp-class-dropdown-content');
    const gradeDropdownBtn = document.getElementById('insp-grade-dropdown-btn');
    const gradeDropdownContent = document.getElementById('insp-grade-dropdown-content');
    const teacherSelect = document.getElementById('insp-teacher-filter');
    const startMonthInput = document.getElementById('insp-month-start');

    // 1. Populate Jamia Dropdown
    if (assignedJamiaat && Array.isArray(assignedJamiaat)) {
        assignedJamiaat.forEach(j => {
            jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });
    }

    // 2. Dropdown Toggle Logic (Multi-select)
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
                span.classList.remove('font-bold', 'text-indigo-700');
            } else if (checkedBoxes.length === 1) {
                span.textContent = checkedBoxes[0].value;
                span.classList.add('font-bold', 'text-indigo-700');
            } else {
                span.textContent = `${checkedBoxes.length} Selected`;
                span.classList.add('font-bold', 'text-indigo-700');
            }
        };

        content.querySelectorAll(`.${checkboxClass}`).forEach(cb => {
            cb.addEventListener('change', updateText);
        });
        return updateText;
    };

    const updateClassText = setupCompactDropdown(classDropdownBtn, classDropdownContent, 'insp-class-checkbox', 'Tamam Classes');
    setupCompactDropdown(gradeDropdownBtn, gradeDropdownContent, 'insp-grade-checkbox', 'Tamam (All)');

    document.addEventListener('click', (e) => {
        if (!classDropdownBtn.contains(e.target) && !classDropdownContent.contains(e.target)) {
            classDropdownContent.classList.add('hidden');
        }
        if (!gradeDropdownBtn.contains(e.target) && !gradeDropdownContent.contains(e.target)) {
            gradeDropdownContent.classList.add('hidden');
        }
    });

    // 3. Dynamic Filters Logic (Classes & Teachers based on selected Jamia)
    const updateDropdowns = () => {
        const selectedJamia = jamiaSelect.value.trim();
        const currentStartMonth = startMonthInput.value;
        
        classDropdownContent.innerHTML = ''; 
        const span = classDropdownBtn.querySelector('span');
        span.textContent = "Tamam Classes";
        span.classList.remove('font-bold', 'text-indigo-700');
        
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

            Array.from(uniqueClasses).sort().forEach(cls => {
                const label = document.createElement('label');
                label.className = "flex items-center space-x-3 p-2 hover:bg-indigo-50 cursor-pointer rounded-lg transition border-b border-slate-100";
                label.innerHTML = `
                    <input type="checkbox" value="${cls}" class="insp-class-checkbox form-checkbox h-4 w-4 text-indigo-600 rounded">
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

    // Event Listeners for action buttons
    document.getElementById('insp-show-btn').addEventListener('click', () => fetchAndRenderReport(db, assignedJamiaat, userProfileData));
    document.getElementById('insp-download-img').addEventListener('click', downloadReportImage);
}

// --- DATA MATCHING & FETCHING LOGIC ---
async function fetchAndRenderReport(db, assignedJamiaat, userProfileData) {
    const startMonth = document.getElementById('insp-month-start').value;
    const endMonth = document.getElementById('insp-month-end').value;
    const jamiaFilter = document.getElementById('insp-jamia-filter').value;
    
    // Get checked classes
    const classDropdownContent = document.getElementById('insp-class-dropdown-content');
    const checkedClassBoxes = classDropdownContent.querySelectorAll('.insp-class-checkbox:checked');
    const selectedClasses = Array.from(checkedClassBoxes).map(cb => cb.value);

    // Get checked grades (Kaifiyat)
    const gradeDropdownContent = document.getElementById('insp-grade-dropdown-content');
    const checkedGradeBoxes = gradeDropdownContent.querySelectorAll('.insp-grade-checkbox:checked');
    const selectedGrades = Array.from(checkedGradeBoxes).map(cb => cb.value);

    const teacherFilter = document.getElementById('insp-teacher-filter').value;

    const loader = document.getElementById('insp-loader');
    const reportArea = document.getElementById('insp-report-area');
    const tbody = document.getElementById('insp-table-body');
    const mainTitle = document.getElementById('insp-report-main-title');
    const subTitle = document.getElementById('insp-report-sub-title');

    if (!startMonth || !endMonth) return alert("Start aur End month select karein.");
    if (startMonth > endMonth) return alert("Shuru ka mahina baad ka nahi ho sakta.");

    loader.classList.remove('hidden');
    reportArea.classList.add('hidden');
    tbody.innerHTML = '';

    // Dynamic Title Logic
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
        const qSnap = await getDocs(query(collection(db, "academic_inspections")));
        let rows = [];

        // Current user ki Jamiaat struct fetch karna mapping ke liye (Teacher ID to Teacher Name mapping)
        const academicYear = getAcademicYear(startMonth);
        let allTeachersMapping = {}; 
        if (userProfileData && userProfileData.academicYears && userProfileData.academicYears[academicYear]) {
            const structure = userProfileData.academicYears[academicYear].karkardagiStructure || [];
            structure.forEach(j => {
                if(j.teachers) {
                    j.teachers.forEach(t => {
                        allTeachersMapping[t.id] = t.name || t.teacherName;
                    });
                }
            });
        }

        qSnap.forEach(docSnap => {
            const data = docSnap.data();

            if (!assignedJamiaat.includes(data.jamiaName)) return;
            if (jamiaFilter && data.jamiaName !== jamiaFilter) return;
            const docMonth = data.month; 
            if (!docMonth || docMonth < startMonth || docMonth > endMonth) return;

            if (data.classes && Array.isArray(data.classes)) {
                data.classes.forEach(cls => {
                    // Filter by Multiple Classes
                    if (selectedClasses.length > 0 && !selectedClasses.includes(cls.className)) return;

                    if (cls.subjects && Array.isArray(cls.subjects)) {
                        cls.subjects.forEach(sub => {
                            // Extract teacher name using ID mapping, fallback to ID if not found
                            let tName = allTeachersMapping[sub.teacherId] || sub.teacherId || "-";

                            // Filter by Single Teacher
                            if (teacherFilter && tName !== teacherFilter) return;

                            const scoreText = sub.subjectScore || "0%";
                            const gradeInfo = getGradeDetails(scoreText);

                            // Filter by Multiple Grades
                            if (selectedGrades.length > 0 && !selectedGrades.includes(gradeInfo.text)) return;

                            rows.push({
                                month: docMonth,
                                jamiaName: data.jamiaName,
                                teacherName: tName,
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

        // Data Sorting
        rows.sort((a, b) => a.month.localeCompare(b.month) || a.jamiaName.localeCompare(b.jamiaName) || a.className.localeCompare(b.className));

        // Table Render
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-slate-400 font-bold bg-slate-50 text-center">Is duration/filter me koi record nahi mila.</td></tr>`;
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
                        <td class="p-3 border-r border-slate-200 text-left font-medium text-slate-700">${row.teacherName}</td>
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
    const loader = document.getElementById('insp-loader');
    loader.classList.remove('hidden');
    
    setTimeout(async () => {
        try {
            const tableElement = document.querySelector('#insp-report-area table');
            if (!tableElement) return;

            const tempDiv = document.createElement('div');
            tempDiv.style.width = '1200px'; 
            tempDiv.style.padding = '25px';
            tempDiv.style.backgroundColor = '#ffffff';
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px'; 

            const mainTitle = document.getElementById('insp-report-main-title').textContent;
            const subTitle = document.getElementById('insp-report-sub-title').textContent;

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

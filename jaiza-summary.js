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

// Helper: Academic Year Calculation
const getAcademicYear = (dateString) => {
    if (!dateString) return null;
    const [yStr, mStr] = dateString.split("-");
    const yearNum = parseInt(yStr);
    const monthNum = parseInt(mStr) - 1; // 0-11
    return monthNum >= 3 ? `${yearNum}-${yearNum + 1}` : `${yearNum - 1}-${yearNum}`;
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

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div class="relative group">
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Select Class (Multiple)</label>
                    <button type="button" id="js-class-dropdown-btn" class="w-full p-2 border border-gray-300 rounded text-sm text-left bg-gray-100 text-gray-500 flex justify-between items-center cursor-not-allowed" disabled>
                        <span class="truncate urdu-font">Tamam Classes</span>
                        <i class="fas fa-chevron-down text-xs ml-2"></i>
                    </button>
                    <div id="js-class-dropdown-content" class="hidden absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded shadow-xl mt-1 max-h-60 overflow-y-auto p-1">
                        </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Select Teacher (Optional)</label>
                    <select id="js-teacher-filter" class="w-full p-2 border rounded text-sm urdu-font bg-gray-100 cursor-not-allowed" disabled>
                        <option value="">Tamam Asatiza</option>
                    </select>
                </div>

                <div class="relative group">
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Select Kaifiyat (Multiple)</label>
                    <button type="button" id="js-grade-dropdown-btn" class="w-full p-2 border border-gray-300 rounded text-sm text-left bg-white text-gray-700 flex justify-between items-center focus:ring-2 focus:ring-teal-500">
                        <span class="truncate urdu-font">Tamam (All)</span>
                        <i class="fas fa-chevron-down text-xs ml-2"></i>
                    </button>
                    <div id="js-grade-dropdown-content" class="hidden absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded shadow-xl mt-1 max-h-60 overflow-y-auto p-1">
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="ممتاز" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded border-gray-300">
                            <span class="text-sm text-gray-700 urdu-font">ممتاز (Excellent)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="بہتر" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded border-gray-300">
                            <span class="text-sm text-gray-700 urdu-font">بہتر (Very Good)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="مناسب" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded border-gray-300">
                            <span class="text-sm text-gray-700 urdu-font">مناسب (Good)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="کمزور" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded border-gray-300">
                            <span class="text-sm text-gray-700 urdu-font">کمزور (Weak)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="-" class="js-grade-checkbox form-checkbox h-4 w-4 text-teal-600 rounded border-gray-300">
                            <span class="text-sm text-gray-700 urdu-font">- (No Grade)</span>
                        </label>
                    </div>
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

        <div id="js-report-area" class="hidden mt-6 bg-white rounded-lg">
            
            <div id="js-report-header-bg" class="bg-teal-700 text-white p-4 text-center rounded-t-lg border-b-4 border-teal-900">
                <h2 id="js-report-main-title" class="text-2xl font-bold urdu-font">جائزہ رپورٹ</h2>
                <p id="js-report-sub-title" class="text-sm text-teal-100 mt-1 opacity-90"></p>
            </div>

            <div id="js-table-wrapper" class="overflow-x-auto">
                <table class="min-w-full text-center text-sm border-collapse" dir="rtl">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-base">
                            <th class="px-4 py-3 border-l border-slate-200">#</th>
                            <th class="px-4 py-3 border-l border-slate-200">ماہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">جامعہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">استاذ</th>
                            <th class="px-4 py-3 border-l border-slate-200">درجہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">کتاب</th>
                            <th class="px-4 py-3 border-l border-slate-200 w-24">کیفیت</th>
                            <th class="px-4 py-3 w-24">فیصد (%)</th>
                        </tr>
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

    // --- DOM REFERENCES ---
    const jamiaSelect = document.getElementById('js-jamia-filter');
    const classDropdownBtn = document.getElementById('js-class-dropdown-btn');
    const classDropdownContent = document.getElementById('js-class-dropdown-content');
    const gradeDropdownBtn = document.getElementById('js-grade-dropdown-btn');
    const gradeDropdownContent = document.getElementById('js-grade-dropdown-content');
    const teacherSelect = document.getElementById('js-teacher-filter');
    const startMonthInput = document.getElementById('js-month-start');


    // --- 1. POPULATE JAMIA DROPDOWN ---
    const jamiaSet = new Set();
    if (userProfileData.academicYears) {
        Object.keys(userProfileData.academicYears).forEach(yr => {
            const struct = userProfileData.academicYears[yr]?.karkardagiStructure;
            if (Array.isArray(struct)) {
                struct.forEach(j => {
                    if (j.jamiaName) jamiaSet.add(j.jamiaName.trim());
                });
            }
        });
    }
    if (userProfileData.jamiaatList && Array.isArray(userProfileData.jamiaatList)) {
        userProfileData.jamiaatList.forEach(j => jamiaSet.add(j.trim()));
    }
    Array.from(jamiaSet).sort().forEach(j => {
        jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
    });


    // --- 2. DROPDOWN TOGGLE LOGIC (Compact) ---
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


    // --- 3. DYNAMIC FILTERS LOGIC ---
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
            classDropdownBtn.classList.add('bg-gray-100', 'text-gray-500', 'cursor-not-allowed');
            classDropdownBtn.classList.remove('bg-white', 'text-gray-700');
            
            teacherSelect.disabled = true;
            teacherSelect.classList.add('bg-gray-100', 'cursor-not-allowed');
            return;
        }

        classDropdownBtn.disabled = false;
        classDropdownBtn.classList.remove('bg-gray-100', 'text-gray-500', 'cursor-not-allowed');
        classDropdownBtn.classList.add('bg-white', 'text-gray-700');

        teacherSelect.disabled = false;
        teacherSelect.classList.remove('bg-gray-100', 'cursor-not-allowed');

        const academicYear = getAcademicYear(currentStartMonth);
        let jamiaData = null;

        if (userProfileData.academicYears && userProfileData.academicYears[academicYear]) {
            const struct = userProfileData.academicYears[academicYear].karkardagiStructure || [];
            jamiaData = struct.find(j => j.jamiaName.trim() === selectedJamia);
        }

        if (!jamiaData && userProfileData.academicStructure && Array.isArray(userProfileData.academicStructure)) {
            jamiaData = userProfileData.academicStructure.find(j => j.jamiaName.trim() === selectedJamia);
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
                label.className = "flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100 last:border-0";
                label.innerHTML = `
                    <input type="checkbox" value="${cls}" class="js-class-checkbox form-checkbox h-4 w-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300">
                    <span class="text-sm text-gray-700 urdu-font select-none">${cls}</span>
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
    document.getElementById('js-show-btn').addEventListener('click', () => fetchAndRenderReport(db, user));
    
    // *** UPDATED DOWNLOAD LOGIC FOR MOBILE FIX ***
    document.getElementById('js-download-img').addEventListener('click', () => {
        const area = document.getElementById('js-report-area');
        const btns = document.querySelectorAll('.no-print');
        
        // 1. Buttons chupayein
        btns.forEach(b => b.style.display = 'none'); 
        
        // 2. Original styles save karein
        const originalWidth = area.style.width;
        const originalOverflow = area.style.overflow;
        
        // 3. Force Desktop Width (Mobile fix)
        // Ye container ko zabardasti chouda kar dega taake text wrap na ho
        area.style.width = "1200px"; 
        area.style.overflow = "visible"; 
        
        // 4. Capture with Desktop viewport settings
        html2canvas(area, { 
            scale: 2, 
            backgroundColor: "#ffffff",
            windowWidth: 1400, // Pretend browser is 1400px wide
            width: 1200 // Capture 1200px of content
        }).then(canvas => {
            // 5. Download Trigger
            const link = document.createElement('a');
            link.download = `Jaiza_Report_${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
            
            // 6. Restore Mobile Styles
            area.style.width = originalWidth;
            area.style.overflow = originalOverflow;
            btns.forEach(b => b.style.display = ''); 
        });
    });
}

// --- MAIN FETCH & RENDER LOGIC ---
async function fetchAndRenderReport(db, user) {
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
    let headerText = "جائزہ رپورٹ";
    let subText = `Duration: ${startMonth} to ${endMonth}`;

    if (jamiaFilter) {
        headerText = jamiaFilter;
        let details = [];
        if (selectedClasses.length > 0) details.push(`Classes: ${selectedClasses.join(', ')}`);
        if (teacherFilter) details.push(`Teacher: ${teacherFilter}`);
        if (selectedGrades.length > 0) details.push(`Kaifiyat: ${selectedGrades.join(', ')}`);
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

        // Filtering
        let filteredDocs = allDocs.filter(d => d.monthKey >= startMonth && d.monthKey <= endMonth);

        if (jamiaFilter) {
            filteredDocs = filteredDocs.filter(d => d.jamiaId === jamiaFilter);
        }
        if (selectedClasses.length > 0) {
            filteredDocs = filteredDocs.filter(d => selectedClasses.includes(d.className));
        }

        // Flattening
        let rows = [];

        filteredDocs.forEach(doc => {
            if (doc.books && Array.isArray(doc.books)) {
                doc.books.forEach(book => {
                    
                    if (teacherFilter) {
                        const tName = book.teacherName || "";
                        if (tName !== teacherFilter) return;
                    }

                    const currentGrade = getGrade(book.percentage);
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

        // Rendering
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
                        <td class="px-4 py-3 border-l border-slate-200 ${gradeColor}">${row.grade}</td>
                        <td class="px-4 py-3 font-bold font-sans ${row.percent < 40 ? 'text-red-600' : 'text-gray-800'}">${pVal}</td>
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

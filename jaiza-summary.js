// Filename: jaiza-summary.js

import {
    collection, query, where, getDocs, addDoc
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
                            <input type="checkbox" value="ممتاز" class="js-grade-checkbox form-checkbox h-4 w-4 text-emerald-600 rounded border-gray-300">
                            <span class="text-sm text-emerald-700 font-bold urdu-font">ممتاز (Excellent)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="بہتر" class="js-grade-checkbox form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300">
                            <span class="text-sm text-blue-600 font-bold urdu-font">بہتر (Very Good)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="مناسب" class="js-grade-checkbox form-checkbox h-4 w-4 text-amber-600 rounded border-gray-300">
                            <span class="text-sm text-amber-600 font-bold urdu-font">مناسب (Good)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="کمزور" class="js-grade-checkbox form-checkbox h-4 w-4 text-red-600 rounded border-gray-300">
                            <span class="text-sm text-red-600 font-bold urdu-font">کمزور (Weak)</span>
                        </label>
                        <label class="flex items-center space-x-3 p-2 hover:bg-teal-50 cursor-pointer rounded transition border-b border-gray-100">
                            <input type="checkbox" value="-" class="js-grade-checkbox form-checkbox h-4 w-4 text-gray-600 rounded border-gray-300">
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

        <!-- TABS SECTION (Hidden by default) -->
        <div id="js-tabs-container" class="hidden flex space-x-2 border-b mt-6" dir="rtl">
            <button id="tab-report" class="py-2 px-5 border-b-2 border-teal-600 text-teal-600 font-bold urdu-font text-lg focus:outline-none">جائزہ رپورٹ</button>
            <button id="tab-wazahat" class="py-2 px-5 text-gray-500 font-bold hover:text-teal-600 urdu-font text-lg border-b-2 border-transparent focus:outline-none transition-colors">کمزوری پر وضاحت</button>
        </div>

        <!-- REPORT AREA (Tab 1) -->
        <div id="js-report-area" class="hidden mt-4 bg-white rounded-lg">
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

        <!-- WAZAHAT AREA (Tab 2) -->
        <div id="js-wazahat-area" class="hidden mt-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="bg-amber-600 text-white p-4 text-center rounded-t-lg border-b-4 border-amber-800">
                <h2 class="text-2xl font-bold urdu-font">کمزوری پر وضاحت طلب اساتذہ</h2>
                <p class="text-sm text-amber-100 mt-1">صرف مناسب اور کمزور کیفیت والے ریکارڈز</p>
            </div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full text-center text-sm border-collapse" dir="rtl">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-base">
                            <th class="px-4 py-3 border-l border-slate-200 w-12">#</th>
                            <th class="px-4 py-3 border-l border-slate-200">جامعہ</th>
                            <th class="px-4 py-3 border-l border-slate-200">استاذ کا نام</th>
                            <th class="px-4 py-3 border-l border-slate-200">کمزور / مناسب مضامین کی تفصیل</th>
                            <th class="px-4 py-3 w-32">وضاحت فارم لنک</th>
                        </tr>
                    </thead>
                    <tbody id="js-wazahat-tbody" class="text-gray-800 urdu-font divide-y divide-gray-200">
                        </tbody>
                </table>
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

    // TABS REFERENCES
    const tabReport = document.getElementById('tab-report');
    const tabWazahat = document.getElementById('tab-wazahat');
    const areaReport = document.getElementById('js-report-area');
    const areaWazahat = document.getElementById('js-wazahat-area');

    // --- TABS LOGIC ---
    tabReport.addEventListener('click', () => {
        tabReport.classList.add('border-teal-600', 'text-teal-600');
        tabReport.classList.remove('border-transparent', 'text-gray-500');
        tabWazahat.classList.add('border-transparent', 'text-gray-500');
        tabWazahat.classList.remove('border-teal-600', 'text-teal-600');
        
        areaReport.classList.remove('hidden');
        areaWazahat.classList.add('hidden');
    });

    tabWazahat.addEventListener('click', () => {
        tabWazahat.classList.add('border-teal-600', 'text-teal-600');
        tabWazahat.classList.remove('border-transparent', 'text-gray-500');
        tabReport.classList.add('border-transparent', 'text-gray-500');
        tabReport.classList.remove('border-teal-600', 'text-teal-600');
        
        areaWazahat.classList.remove('hidden');
        areaReport.classList.add('hidden');
    });

    // --- COPY LINK DELEGATION LOGIC ---
    // --- COPY LINK & WHATSAPP DELEGATION LOGIC (NEW SHORT LINK SYSTEM) ---
    document.getElementById('js-wazahat-area').addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('.js-copy-link-btn');
        const waBtn = e.target.closest('.js-wa-btn');
        const btn = copyBtn || waBtn;

        if (btn) {
            const tr = btn.closest('tr');
            let sid = tr.getAttribute('data-sid'); // Agar link pehle ban chuka hai
            const payloadStr = decodeURIComponent(btn.getAttribute('data-payload'));
            const payloadData = JSON.parse(payloadStr);

            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Wait...';
            btn.disabled = true;

            try {
                // Agar ID nahi bani to Firebase me data save kar ke nayi ID banayein
                if (!sid) {
                    const docRef = await addDoc(collection(db, 'jaiza_short_links'), payloadData);
                    sid = docRef.id;
                    tr.setAttribute('data-sid', sid); // Isi row me save kar liya
                }

                // YAHAN APNA ASLI GITHUB WALA LINK LAGAYEIN
                const baseUrl = `https://tuofficedrive1-wq.github.io/Majlis-Talimi-Umoor-India/teacher-wazahat.html`;
                const shortLink = `${baseUrl}?mode=jaiza&sid=${sid}`;

                if (copyBtn) {
                    await navigator.clipboard.writeText(shortLink);
                    btn.innerHTML = '<i class="fas fa-check mr-1"></i> Copied!';
                    btn.classList.replace('bg-teal-600', 'bg-emerald-600');
                    setTimeout(() => {
                        btn.innerHTML = originalHtml;
                        btn.classList.replace('bg-emerald-600', 'bg-teal-600');
                        btn.disabled = false;
                    }, 2000);
                } else if (waBtn) {
                    let waMessage = `*نوٹس برائے ماہانہ جائزہ (Official Notification)*\n\n`;
                    waMessage += `محترم *${payloadData.teacher}* صاحب،\n`;
                    waMessage += `آپ کی جامعہ *${payloadData.jamia}* میں درج ذیل مضامین کی ماہانہ کارکردگی (*${payloadData.month}*) کمزور یا مناسب پائی گئی ہے:\n\n`;
                    payloadData.data.forEach(sub => {
                        waMessage += `▪️ درجہ: *${sub.class}* | مضمون: *${sub.book}* | فیصد: *${sub.percent.toFixed(1)}%* (${sub.grade})\n`;
                    });
                    waMessage += `\nبراہِ کرم اس لنک پر کلک کریں، اپنا 'اجیر کوڈ' (Ajeer Code) درج کریں اور وضاحت جمع کرائیں:\n`;
                    waMessage += `${shortLink}\n\nشکریہ۔`;

                    window.open(`https://wa.me/?text=${encodeURIComponent(waMessage)}`, '_blank');
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert("Link generate karne mein error aaya.");
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    });

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
    // Purani line dhoondhein aur is se replace karein:
document.getElementById('js-show-btn').addEventListener('click', () => fetchAndRenderReport(db, user, userProfileData));
    
    // *** DOWNLOAD LOGIC: Fixed Width Container ***
    document.getElementById('js-download-img').addEventListener('click', async () => {
        const loader = document.getElementById('js-loader');
        loader.classList.remove('hidden'); 

        try {
            const tableElement = document.querySelector('#js-report-area table');
            if (!tableElement) {
                alert("Table nahi mili. Pehle report show karein.");
                loader.classList.add('hidden');
                return;
            }

            // 1. Create Temporary Container (1200px Wide)
            const tempDiv = document.createElement('div');
            tempDiv.style.width = '1200px'; 
            tempDiv.style.padding = '25px';
            tempDiv.style.backgroundColor = '#ffffff';
            tempDiv.style.direction = 'rtl';
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px'; 
            tempDiv.style.top = '0';
            tempDiv.style.fontFamily = "'Jameel Noori Nastaleeq', 'Poppins', sans-serif";

            // 2. Add Header
            const mainTitle = document.getElementById('js-report-main-title').textContent;
            const subTitle = document.getElementById('js-report-sub-title').textContent;

            const headerHtml = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="font-family: 'Jameel Noori Nastaleeq', sans-serif; font-size: 32px; font-weight: bold; color: #0f766e; margin: 0;">${mainTitle}</h1>
                    <p style="font-family: sans-serif; font-size: 18px; color: #555; margin-top: 5px;">${subTitle}</p>
                </div>
            `;

            // 3. Clone Table & Style it for Image
            const clonedTable = tableElement.cloneNode(true);
            clonedTable.style.width = '100%';
            clonedTable.style.borderCollapse = 'collapse';
            
            // Explicit styling for cells
            clonedTable.querySelectorAll('th').forEach(th => {
                th.style.backgroundColor = '#f1f5f9';
                th.style.color = '#334155';
                th.style.border = '1px solid #cbd5e1';
                th.style.padding = '12px';
                th.style.fontSize = '16px';
                th.style.fontFamily = "'Jameel Noori Nastaleeq', sans-serif";
            });

            clonedTable.querySelectorAll('td').forEach(td => {
                td.style.border = '1px solid #e2e8f0';
                td.style.padding = '10px';
                td.style.fontSize = '15px';
                td.style.textAlign = 'center';
                
                // Color Transfer Logic
                if (td.classList.contains('text-red-600')) td.style.color = '#dc2626'; // Kamzor
                if (td.classList.contains('text-emerald-700')) td.style.color = '#047857'; // Mumtaz
                if (td.classList.contains('text-blue-600')) td.style.color = '#2563eb'; // Behtar
                if (td.classList.contains('text-amber-600')) td.style.color = '#d97706'; // Munasib
                
                if (td.classList.contains('urdu-font')) td.style.fontFamily = "'Jameel Noori Nastaleeq', sans-serif";
            });

            // 4. Assemble
            tempDiv.innerHTML = headerHtml;
            tempDiv.appendChild(clonedTable);
            
            const footer = document.createElement('div');
            footer.innerHTML = `<p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px; font-family: sans-serif;">Generated via Monthly Reporting App</p>`;
            tempDiv.appendChild(footer);

            document.body.appendChild(tempDiv);

            // 5. Capture Image
            const canvas = await html2canvas(tempDiv, {
                scale: 2, 
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            // 6. Download
            const link = document.createElement('a');
            link.download = `Jaiza_Report_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // 7. Cleanup
            document.body.removeChild(tempDiv);

        } catch (err) {
            console.error(err);
            alert("Image download karne mein error aaya.");
        } finally {
            loader.classList.add('hidden');
        }
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
    const tabsContainer = document.getElementById('js-tabs-container');
    const reportArea = document.getElementById('js-report-area');
    const wazahatArea = document.getElementById('js-wazahat-area');
    const tbody = document.getElementById('js-table-body');
    const wazahatTbody = document.getElementById('js-wazahat-tbody');
    const mainTitle = document.getElementById('js-report-main-title');
    const subTitle = document.getElementById('js-report-sub-title');

    // Reset Tabs visually to defaults
    document.getElementById('tab-report').click(); 

    if (!startMonth || !endMonth) { alert("Start aur End month select karein."); return; }
    if (startMonth > endMonth) { alert("Shuru ka mahina baad ka nahi ho sakta."); return; }

    loader.classList.remove('hidden');
    tabsContainer.classList.add('hidden');
    reportArea.classList.add('hidden');
    wazahatArea.classList.add('hidden');
    tbody.innerHTML = '';
    wazahatTbody.innerHTML = '';

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

        // Rendering Main Report Table
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-red-500 font-bold bg-red-50">Is filter ke mutabiq koi record nahi mila.</td></tr>`;
        } else {
            rows.forEach((row, index) => {
                const pVal = row.percent !== null && row.percent !== undefined ? row.percent.toFixed(1) + "%" : "-";
                
                const dateObj = new Date(row.month + "-01");
                const monthStr = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });

                // --- COLORED LOGIC ---
                let rowColorClass = "text-gray-700"; // Default
                
                if (row.grade === "ممتاز") {
                    rowColorClass = "text-emerald-700 font-bold"; // Green
                } else if (row.grade === "بہتر") {
                    rowColorClass = "text-blue-600 font-bold"; // Blue
                } else if (row.grade === "مناسب") {
                    rowColorClass = "text-amber-600 font-bold"; // Orange
                } else if (row.grade === "کمزور") {
                    rowColorClass = "text-red-600 font-bold"; // Red
                }

                tbody.innerHTML += `
                    <tr class="hover:bg-teal-50 transition-colors odd:bg-white even:bg-slate-50">
                        <td class="px-4 py-3 border-l border-slate-200">${index + 1}</td>
                        <td class="px-4 py-3 border-l border-slate-200 font-bold text-gray-600 font-sans text-xs">${monthStr}</td>
                        <td class="px-4 py-3 border-l border-slate-200">${row.jamia}</td>
                        <td class="px-4 py-3 border-l border-slate-200">${row.teacher}</td>
                        <td class="px-4 py-3 border-l border-slate-200">${row.className}</td>
                        <td class="px-4 py-3 border-l border-slate-200 text-teal-800">${row.book}</td>
                        
                        <td class="px-4 py-3 border-l border-slate-200 ${rowColorClass}">${row.grade}</td>
                        <td class="px-4 py-3 font-sans ${rowColorClass}">${pVal}</td>
                    </tr>
                `;
            });
        }

        // --- WAZAHAT DATA GROUPING & RENDERING (Tab 2) ---
        // --- WAZAHAT DATA GROUPING & RENDERING (Tab 2) ---
        const wazahatData = {};
        
        rows.forEach(r => {
            if (r.grade === "مناسب" || r.grade === "کمزور") {
                const key = `${r.jamia}_${r.teacher}`;
                if (!wazahatData[key]) {
                    wazahatData[key] = { jamia: r.jamia, teacher: r.teacher, month: r.month, subjects: [], rawData: [] };
                }
                const gradeColor = r.grade === 'کمزور' ? 'text-red-600' : 'text-amber-600';
                wazahatData[key].subjects.push(`
                    <span class="inline-block bg-white text-xs border border-gray-200 px-2 py-1 rounded m-1 shadow-sm">
                        ${r.className} : ${r.book} (<span class="font-sans font-bold">${r.percent.toFixed(1)}%</span> - <span class="font-bold ${gradeColor}">${r.grade}</span>)
                    </span>
                `);
                // Naya code yahan add kiya hai data pass karne ke liye
                wazahatData[key].rawData.push({ class: r.className, book: r.book, percent: r.percent, grade: r.grade });
            }
        });

       const wazahatKeys = Object.keys(wazahatData);
        if (wazahatKeys.length === 0) {
            wazahatTbody.innerHTML = `<tr><td colspan="6" class="py-6 text-emerald-600 font-bold bg-emerald-50">الحمدللہ! کوئی مناسب یا کمزور کارکردگی نہیں ملی۔</td></tr>`;
        } else {
            wazahatKeys.forEach((key, index) => {
                const item = wazahatData[key];
                const subList = item.subjects.join('');
                // --- ASLI AJEER CODE DHOONDHNA ---
                let expectedCode = "";
                if (userProfileData && userProfileData.academicYears) {
                    Object.values(userProfileData.academicYears).forEach(yearData => {
                        if (yearData.karkardagiStructure) {
                            const jData = yearData.karkardagiStructure.find(j => j.jamiaName === item.jamia);
                            if (jData && jData.teachers) {
                                const tData = jData.teachers.find(t => t.name === item.teacher);
                                if (tData && tData.loginCode) expectedCode = String(tData.loginCode);
                            }
                        }
                    });
                }
                // ---------------------------------

                const wKey = `${item.jamia}_${item.teacher}_${item.month}`;
                let wazahatColumnHtml = `<span class="text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-bold border border-red-200">انتظار میں...</span>`; 
                
                if (submittedWazahats[wKey]) {
                    const wData = submittedWazahats[wKey];
                    const dateStr = new Date(wData.timestamp).toLocaleDateString('en-GB'); 
                    wazahatColumnHtml = `
                        <div class="text-right">
                            <p class="text-sm text-gray-800 leading-snug mb-2 line-clamp-3" title="${wData.wazahat}">${wData.wazahat}</p>
                            <span class="text-[10px] text-gray-500 font-sans font-bold bg-gray-100 px-1.5 py-0.5 rounded border">${dateStr}</span>
                        </div>
                    `;
                }

                // PAYLOAD ME expectedCode ADD KIYA GAYA HAI
                const payload = { jamia: item.jamia, teacher: item.teacher, month: item.month, data: item.rawData, expectedCode: expectedCode };
                const encodedPayload = encodeURIComponent(JSON.stringify(payload));

                wazahatTbody.innerHTML += `
                    <tr class="hover:bg-amber-50 transition-colors odd:bg-white even:bg-slate-50" data-sid="">
                        <td class="px-4 py-3 border-l border-slate-200 font-sans">${index + 1}</td>
                        <td class="px-4 py-3 border-l border-slate-200 text-teal-800 font-bold">${item.jamia}</td>
                        <td class="px-4 py-3 border-l border-slate-200 text-gray-800 font-bold text-base">${item.teacher}</td>
                        <td class="px-4 py-3 border-l border-slate-200 text-right leading-relaxed">${subList}</td>
                        <td class="px-4 py-3 text-center space-y-2">
                            <!-- WhatsApp Button -->
                            <button data-payload="${encodedPayload}" class="js-wa-btn bg-green-500 hover:bg-green-600 text-white font-sans text-xs font-bold py-2 px-3 rounded shadow transition w-full flex items-center justify-center">
                                <i class="fab fa-whatsapp text-base mr-2"></i> WhatsApp
                            </button>
                            
                            <!-- Copy Link Button -->
                            <button data-payload="${encodedPayload}" class="js-copy-link-btn bg-teal-600 hover:bg-teal-700 text-white font-sans text-xs font-bold py-2 px-3 rounded shadow transition w-full flex items-center justify-center">
                                <i class="fas fa-link mr-2"></i> Copy Link
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        // Show UI Elements
        loader.classList.add('hidden');
        tabsContainer.classList.remove('hidden');
        reportArea.classList.remove('hidden'); 

    } catch (err) {
        console.error(err);
        loader.classList.add('hidden');
        alert("Error: Data load karne mein masla hua.");
    }
}

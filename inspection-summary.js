// Filename: inspection-summary.js
import { 
    getDocs, 
    collection, 
    query,
    addDoc 
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

    const userProfileData = window.currentUserData || {}; 
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // --- COMPACT HTML UI FILTER & TABS STRUCTURE ---
    container.innerHTML = `
      <div class="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        
        <!-- Compact Filters Section -->
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 no-print">
            <h4 class="text-[11px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1 tracking-wider">Report Filters</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                    <label class="block text-[10px] font-semibold text-slate-700 mb-1">From Month</label>
                    <input type="month" id="insp-month-start" class="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-slate-700 mb-1">To Month</label>
                    <input type="month" id="insp-month-end" class="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value="${currentMonth}">
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-slate-700 mb-1">Select Jamia</label>
                    <select id="insp-jamia-filter" class="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none">
                        <option value="">Tamam Jamiaat (All)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="relative group">
                    <label class="block text-[10px] font-semibold text-slate-700 mb-1">Select Class (Multiple)</label>
                    <button type="button" id="insp-class-dropdown-btn" class="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-left bg-slate-100 text-slate-500 flex justify-between items-center cursor-not-allowed" disabled>
                        <span class="truncate">Tamam Classes</span>
                        <i class="fas fa-chevron-down text-[10px] ml-2"></i>
                    </button>
                    <div id="insp-class-dropdown-content" class="hidden absolute top-full left-0 right-0 z-50 bg-white border border-slate-300 rounded shadow-lg mt-1 max-h-48 overflow-y-auto p-1"></div>
                </div>

                <div>
                    <label class="block text-[10px] font-semibold text-slate-700 mb-1">Select Teacher (Optional)</label>
                    <select id="insp-teacher-filter" class="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-slate-100 cursor-not-allowed outline-none" disabled>
                        <option value="">Tamam Asatiza</option>
                    </select>
                </div>

                <div class="relative group">
                    <label class="block text-[10px] font-semibold text-slate-700 mb-1">Select Kaifiyat (Multiple)</label>
                    <button type="button" id="insp-grade-dropdown-btn" class="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-left bg-white text-slate-700 flex justify-between items-center focus:ring-1 focus:ring-indigo-500 outline-none">
                        <span class="truncate">Tamam (All)</span>
                        <i class="fas fa-chevron-down text-[10px] ml-2"></i>
                    </button>
                    <div id="insp-grade-dropdown-content" class="hidden absolute top-full left-0 right-0 z-50 bg-white border border-slate-300 rounded shadow-lg mt-1 max-h-48 overflow-y-auto p-1">
                        <label class="flex items-center space-x-2 p-1.5 hover:bg-indigo-50 cursor-pointer rounded transition border-b border-slate-100">
                            <input type="checkbox" value="Mumtaz" class="insp-grade-checkbox form-checkbox h-3.5 w-3.5 text-indigo-600 rounded">
                            <span class="text-xs text-emerald-700 font-bold">Mumtaz (Excellent)</span>
                        </label>
                        <label class="flex items-center space-x-2 p-1.5 hover:bg-indigo-50 cursor-pointer rounded transition border-b border-slate-100">
                            <input type="checkbox" value="Behtar" class="insp-grade-checkbox form-checkbox h-3.5 w-3.5 text-indigo-600 rounded">
                            <span class="text-xs text-blue-600 font-bold">Behtar (Very Good)</span>
                        </label>
                        <label class="flex items-center space-x-2 p-1.5 hover:bg-indigo-50 cursor-pointer rounded transition border-b border-slate-100">
                            <input type="checkbox" value="Munasib" class="insp-grade-checkbox form-checkbox h-3.5 w-3.5 text-indigo-600 rounded">
                            <span class="text-xs text-amber-600 font-bold">Munasib (Good)</span>
                        </label>
                        <label class="flex items-center space-x-2 p-1.5 hover:bg-indigo-50 cursor-pointer rounded transition border-b border-slate-100">
                            <input type="checkbox" value="Kamzor" class="insp-grade-checkbox form-checkbox h-3.5 w-3.5 text-indigo-600 rounded">
                            <span class="text-xs text-red-600 font-bold">Kamzor (Weak)</span>
                        </label>
                    </div>
                </div>
            </div>

            <button id="insp-show-btn" class="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow-sm transition active:scale-95 flex justify-center items-center gap-2 text-sm">
                <i class="fas fa-search"></i> Report Show Karein
            </button>
        </div>

        <div id="insp-loader" class="hidden text-center py-6">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
            <p class="mt-1 text-indigo-600 font-semibold text-xs">Data load ho raha hai...</p>
        </div>

        <!-- TABS SECTION -->
        <div id="insp-tabs-container" class="hidden flex space-x-1 border-b border-slate-200 mt-2">
            <button id="tab-report" class="py-1.5 px-4 border-b-2 border-indigo-600 text-indigo-600 font-bold text-xs focus:outline-none transition-colors">Jaiza Report</button>
            <button id="tab-wazahat" class="py-1.5 px-4 text-slate-500 font-bold hover:text-indigo-600 text-xs border-b-2 border-transparent focus:outline-none transition-colors">Kamzori Par Wazahat</button>
        </div>

        <!-- TAB 1: JAIZA REPORT AREA -->
        <div id="insp-report-area" class="hidden mt-3 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div class="bg-indigo-600 text-white p-2.5 text-center border-b-[3px] border-indigo-800">
                <h2 id="insp-report-main-title" class="text-base md:text-lg font-bold tracking-wide">Inspection Report</h2>
                <p id="insp-report-sub-title" class="text-[10px] md:text-xs text-indigo-100 mt-0.5"></p>
            </div>

            <div class="overflow-x-auto">
                <!-- Action column hata diya gaya hai, compact padding (px-2 py-2) -->
                <table class="min-w-full text-center text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wide">
                            <th class="px-2 py-2 border-r border-slate-200">#</th>
                            <th class="px-2 py-2 border-r border-slate-200">Mahina</th>
                            <th class="px-2 py-2 border-r border-slate-200 text-left">Jamia Name</th>
                            <th class="px-2 py-2 border-r border-slate-200 text-left">Ustad</th>
                            <th class="px-2 py-2 border-r border-slate-200">Darjah</th>
                            <th class="px-2 py-2 border-r border-slate-200 text-left">Kitab</th>
                            <th class="px-2 py-2 border-r border-slate-200">Kaifiyat</th>
                            <th class="px-2 py-2">Score (%)</th>
                        </tr>
                    </thead>
                    <tbody id="insp-table-body" class="text-slate-700 divide-y divide-slate-100">
                    </tbody>
                </table>
            </div>
        </div>

        <!-- TAB 2: WAZAHAT AREA -->
        <div id="insp-wazahat-area" class="hidden mt-3 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div class="bg-amber-500 text-white p-2.5 text-center border-b-[3px] border-amber-700">
                <h2 class="text-base md:text-lg font-bold tracking-wide">Kamzori Par Wazahat Talab Asatiza</h2>
                <p class="text-[10px] md:text-xs text-amber-50 mt-0.5">Sirf Munasib aur Kamzor kaifiyat wale records</p>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full text-center text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wide">
                            <th class="px-2 py-2 border-r border-slate-200 w-8">#</th>
                            <th class="px-2 py-2 border-r border-slate-200 w-24">Jamia</th>
                            <th class="px-2 py-2 border-r border-slate-200 w-32">Ustad Ka Naam</th>
                            <th class="px-2 py-2 border-r border-slate-200">Kamzor / Munasib Mazameen Ki Tafseel</th>
                            <th class="px-2 py-2 border-r border-slate-200 w-24">Status</th>
                            <th class="px-2 py-2 w-28">Action / Link</th>
                        </tr>
                    </thead>
                    <tbody id="insp-wazahat-body" class="text-slate-700 divide-y divide-slate-100">
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    `;

    // --- TABS LOGIC ---
    const tabReport = document.getElementById('tab-report');
    const tabWazahat = document.getElementById('tab-wazahat');
    const areaReport = document.getElementById('insp-report-area');
    const areaWazahat = document.getElementById('insp-wazahat-area');

    tabReport.addEventListener('click', () => {
        tabReport.classList.add('border-indigo-600', 'text-indigo-600');
        tabReport.classList.remove('border-transparent', 'text-slate-500');
        tabWazahat.classList.add('border-transparent', 'text-slate-500');
        tabWazahat.classList.remove('border-indigo-600', 'text-indigo-600');
        areaReport.classList.remove('hidden');
        areaWazahat.classList.add('hidden');
    });

    tabWazahat.addEventListener('click', () => {
        tabWazahat.classList.add('border-indigo-600', 'text-indigo-600');
        tabWazahat.classList.remove('border-transparent', 'text-slate-500');
        tabReport.classList.add('border-transparent', 'text-slate-500');
        tabReport.classList.remove('border-indigo-600', 'text-indigo-600');
        areaWazahat.classList.remove('hidden');
        areaReport.classList.add('hidden');
    });

    // --- DOM REFERENCES ---
    const jamiaSelect = document.getElementById('insp-jamia-filter');
    const classDropdownBtn = document.getElementById('insp-class-dropdown-btn');
    const classDropdownContent = document.getElementById('insp-class-dropdown-content');
    const gradeDropdownBtn = document.getElementById('insp-grade-dropdown-btn');
    const gradeDropdownContent = document.getElementById('insp-grade-dropdown-content');
    const teacherSelect = document.getElementById('insp-teacher-filter');
    const startMonthInput = document.getElementById('insp-month-start');

    // Populate Jamia Dropdown
    if (assignedJamiaat && Array.isArray(assignedJamiaat)) {
        assignedJamiaat.forEach(j => { jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`; });
    }

    // Dropdown Toggle Logic
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

        content.querySelectorAll(`.${checkboxClass}`).forEach(cb => cb.addEventListener('change', updateText));
        return updateText;
    };

    const updateClassText = setupCompactDropdown(classDropdownBtn, classDropdownContent, 'insp-class-checkbox', 'Tamam Classes');
    setupCompactDropdown(gradeDropdownBtn, gradeDropdownContent, 'insp-grade-checkbox', 'Tamam (All)');

    document.addEventListener('click', (e) => {
        if (!classDropdownBtn.contains(e.target) && !classDropdownContent.contains(e.target)) classDropdownContent.classList.add('hidden');
        if (!gradeDropdownBtn.contains(e.target) && !gradeDropdownContent.contains(e.target)) gradeDropdownContent.classList.add('hidden');
    });

    // Dynamic Filters Logic
    const updateDropdowns = () => {
        const selectedJamia = jamiaSelect.value.trim();
        const currentStartMonth = startMonthInput.value;
        
        classDropdownContent.innerHTML = ''; 
        const span = classDropdownBtn.querySelector('span');
        span.textContent = "Tamam Classes";
        span.classList.remove('font-bold', 'text-indigo-700');
        teacherSelect.innerHTML = '<option value="">Tamam Asatiza</option>';
        
        if (!selectedJamia) {
            classDropdownBtn.disabled = true; classDropdownBtn.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed'); classDropdownBtn.classList.remove('bg-white', 'text-slate-700');
            teacherSelect.disabled = true; teacherSelect.classList.add('bg-slate-100', 'cursor-not-allowed');
            return;
        }

        classDropdownBtn.disabled = false; classDropdownBtn.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed'); classDropdownBtn.classList.add('bg-white', 'text-slate-700');
        teacherSelect.disabled = false; teacherSelect.classList.remove('bg-slate-100', 'cursor-not-allowed');

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
                if (Array.isArray(t.periods)) { t.periods.forEach(p => { if (p.className) uniqueClasses.add(p.className.trim()); }); }
            });

            Array.from(uniqueClasses).sort().forEach(cls => {
                classDropdownContent.innerHTML += `
                    <label class="flex items-center space-x-2 p-1.5 hover:bg-indigo-50 cursor-pointer rounded-lg transition border-b border-slate-100">
                        <input type="checkbox" value="${cls}" class="insp-class-checkbox form-checkbox h-3.5 w-3.5 text-indigo-600 rounded">
                        <span class="text-[11px] text-slate-700 select-none">${cls}</span>
                    </label>`;
            });
            document.querySelectorAll('.insp-class-checkbox').forEach(cb => cb.addEventListener('change', updateClassText));
            Array.from(uniqueTeachers).sort().forEach(tea => { teacherSelect.innerHTML += `<option value="${tea}">${tea}</option>`; });
        }
    };

    jamiaSelect.addEventListener('change', updateDropdowns);
    startMonthInput.addEventListener('change', updateDropdowns);
    document.getElementById('insp-show-btn').addEventListener('click', () => fetchAndRenderReport(db, assignedJamiaat, userProfileData));
    
    // WhatsApp/Copy Link Delegation on Wazahat Area
    document.getElementById('insp-wazahat-area').addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('.js-copy-btn');
        const waBtn = e.target.closest('.js-wa-btn');
        const btn = copyBtn || waBtn;

        if (btn) {
            const tr = btn.closest('tr');
            let sid = tr.getAttribute('data-sid'); 
            const payloadStr = decodeURIComponent(btn.getAttribute('data-payload'));
            const payloadData = JSON.parse(payloadStr);

            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
                if (!sid) {
                    const docRef = await addDoc(collection(db, 'jaiza_short_links'), payloadData);
                    sid = docRef.id;
                    tr.setAttribute('data-sid', sid); 
                }

                const baseUrl = `https://tuofficedrive1-wq.github.io/Majlis-Talimi-Umoor-India/teacher-wazahat.html`;
                const shortLink = `${baseUrl}?mode=inspection&sid=${sid}`;

                if (copyBtn) {
                    await navigator.clipboard.writeText(shortLink);
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    btn.classList.replace('bg-indigo-600', 'bg-emerald-600');
                    setTimeout(() => {
                        btn.innerHTML = originalHtml;
                        btn.classList.replace('bg-emerald-600', 'bg-indigo-600');
                        btn.disabled = false;
                    }, 2000);
                } else if (waBtn) {
                    let waMessage = `*Notice: Academic Inspection (Kamzori)*\n\n`;
                    waMessage += `Muhtaram *${payloadData.teacher}* sahab,\n`;
                    waMessage += `Aapki Jamia *${payloadData.jamia}* me (${payloadData.month}) ki inspection karkardagi weak aayi hai:\n\n`;
                    payloadData.data.forEach(sub => {
                        waMessage += `▪️ Darjah: ${sub.class} | Kitab: ${sub.book} | Score: ${sub.percent} (${sub.grade})\n`;
                    });
                    waMessage += `\nBaraye meharbani is link par click kar ke wazahat (explanation) darj karein:\n${shortLink}\n\nShukriya.`;

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
}

// --- MAIN FETCH & RENDER LOGIC ---
async function fetchAndRenderReport(db, assignedJamiaat, userProfileData) {
    const startMonth = document.getElementById('insp-month-start').value;
    const endMonth = document.getElementById('insp-month-end').value;
    const jamiaFilter = document.getElementById('insp-jamia-filter').value;
    
    const classBoxes = document.querySelectorAll('.insp-class-checkbox:checked');
    const selectedClasses = Array.from(classBoxes).map(cb => cb.value);
    const gradeBoxes = document.querySelectorAll('.insp-grade-checkbox:checked');
    const selectedGrades = Array.from(gradeBoxes).map(cb => cb.value);
    const teacherFilter = document.getElementById('insp-teacher-filter').value;

    const loader = document.getElementById('insp-loader');
    const reportArea = document.getElementById('insp-report-area');
    const wazahatArea = document.getElementById('insp-wazahat-area');
    const tabsContainer = document.getElementById('insp-tabs-container');
    const tbody = document.getElementById('insp-table-body');
    const wazahatBody = document.getElementById('insp-wazahat-body');
    
    document.getElementById('tab-report').click(); // Reset to Tab 1

    if (!startMonth || !endMonth) return alert("Start aur End month select karein.");
    if (startMonth > endMonth) return alert("Shuru ka mahina baad ka nahi ho sakta.");

    loader.classList.remove('hidden');
    reportArea.classList.add('hidden');
    wazahatArea.classList.add('hidden');
    tabsContainer.classList.add('hidden');
    tbody.innerHTML = '';
    wazahatBody.innerHTML = '';

    document.getElementById('insp-report-main-title').textContent = jamiaFilter ? jamiaFilter : "Tamam Jamiaat Ki Report";
    document.getElementById('insp-report-sub-title').textContent = `Duration: ${startMonth} to ${endMonth}`;

    try {
        const qSnap = await getDocs(query(collection(db, "academic_inspections")));
        let rows = [];

        const academicYear = getAcademicYear(startMonth);
        let allTeachersMapping = {}; 
        if (userProfileData && userProfileData.academicYears && userProfileData.academicYears[academicYear]) {
            const structure = userProfileData.academicYears[academicYear].karkardagiStructure || [];
            structure.forEach(j => {
                if(j.teachers) { j.teachers.forEach(t => { allTeachersMapping[t.id] = t.name || t.teacherName; }); }
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
                    if (selectedClasses.length > 0 && !selectedClasses.includes(cls.className)) return;
                    if (cls.subjects && Array.isArray(cls.subjects)) {
                        cls.subjects.forEach(sub => {
                            let tName = allTeachersMapping[sub.teacherId] || sub.teacherId || "-";
                            if (teacherFilter && tName !== teacherFilter) return;

                            const scoreText = sub.subjectScore || "0%";
                            const gradeInfo = getGradeDetails(scoreText);

                            if (selectedGrades.length > 0 && !selectedGrades.includes(gradeInfo.text)) return;

                            rows.push({
                                month: docMonth, jamiaName: data.jamiaName, teacherName: tName,
                                className: cls.className || "-", subjectName: sub.subjectName || "-",
                                score: scoreText, grade: gradeInfo
                            });
                        });
                    }
                });
            }
        });

        rows.sort((a, b) => a.month.localeCompare(b.month) || a.jamiaName.localeCompare(b.jamiaName) || a.className.localeCompare(b.className));

        // 1. Render Main Report Tab (Without Action Column)
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-slate-400 font-bold bg-slate-50 text-center text-xs">Is duration/filter me koi record nahi mila.</td></tr>`;
        } else {
            rows.forEach((row, index) => {
                const [year, m] = row.month.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                
                tbody.innerHTML += `
                    <tr class="hover:bg-indigo-50/40 transition-colors odd:bg-white even:bg-slate-50/50 text-[11px]">
                        <td class="px-2 py-2 border-r border-slate-200 text-slate-500">${index + 1}</td>
                        <td class="px-2 py-2 border-r border-slate-200 font-bold text-slate-600">${monthNames[parseInt(m) - 1]} ${year}</td>
                        <td class="px-2 py-2 border-r border-slate-200 text-left font-bold text-slate-800">${row.jamiaName}</td>
                        <td class="px-2 py-2 border-r border-slate-200 text-left font-medium text-slate-700">${row.teacherName}</td>
                        <td class="px-2 py-2 border-r border-slate-200 font-medium text-indigo-700">${row.className}</td>
                        <td class="px-2 py-2 border-r border-slate-200 text-left font-semibold text-slate-700">${row.subjectName}</td>
                        <td class="px-2 py-2 border-r border-slate-200">
                            <span class="px-2 py-0.5 rounded border ${row.grade.class}">${row.grade.text}</span>
                        </td>
                        <td class="px-2 py-2 font-black text-indigo-600">${row.score}</td>
                    </tr>
                `;
            });
        }

        // 2. Render Wazahat Tab (Grouped by Jamia & Teacher)
        const wazahatData = {};
        rows.forEach(r => {
            if (r.grade.text === "Munasib" || r.grade.text === "Kamzor") {
                const key = `${r.jamiaName}_${r.teacherName}_${r.month}`;
                if (!wazahatData[key]) {
                    wazahatData[key] = { jamia: r.jamiaName, teacher: r.teacherName, month: r.month, subjects: [], rawData: [] };
                }
                const gradeColor = r.grade.text === 'Kamzor' ? 'text-red-600' : 'text-amber-600';
                wazahatData[key].subjects.push(`
                    <span class="inline-block bg-white text-[10px] border border-slate-200 px-1.5 py-0.5 rounded m-0.5 shadow-sm">
                        ${r.className} : ${r.subjectName} (<span class="font-bold">${r.score}</span> - <span class="font-bold ${gradeColor}">${r.grade.text}</span>)
                    </span>
                `);
                wazahatData[key].rawData.push({ class: r.className, book: r.subjectName, percent: r.score, grade: r.grade.text });
            }
        });

        const wKeys = Object.keys(wazahatData);
        if (wKeys.length === 0) {
            wazahatBody.innerHTML = `<tr><td colspan="6" class="py-6 text-emerald-600 font-bold bg-emerald-50 text-xs">Alhamdulillah! Koi munasib ya kamzor karkardagi nahi mili.</td></tr>`;
        } else {
            wKeys.forEach((key, index) => {
                const item = wazahatData[key];
                const subList = item.subjects.join('');
                const payload = { jamia: item.jamia, teacher: item.teacher, month: item.month, data: item.rawData };
                const encodedPayload = encodeURIComponent(JSON.stringify(payload));

                wazahatBody.innerHTML += `
                    <tr class="hover:bg-amber-50/50 transition-colors odd:bg-white even:bg-slate-50/50 text-[11px]" data-sid="">
                        <td class="px-2 py-2 border-r border-slate-200">${index + 1}</td>
                        <td class="px-2 py-2 border-r border-slate-200 text-indigo-700 font-bold">${item.jamia}</td>
                        <td class="px-2 py-2 border-r border-slate-200 font-bold">${item.teacher}</td>
                        <td class="px-2 py-2 border-r border-slate-200 text-left leading-relaxed">${subList}</td>
                        <td class="px-2 py-2 border-r border-slate-200">
                            <span class="text-red-500 bg-red-50 px-2 py-0.5 rounded font-bold border border-red-200">Intezar mein...</span>
                        </td>
                        <td class="px-2 py-2">
                            <div class="flex flex-col gap-1.5 justify-center items-center">
                                <button data-payload="${encodedPayload}" class="js-wa-btn bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1 px-2 rounded transition w-full max-w-[80px] flex items-center justify-center gap-1 text-[10px]">
                                    <i class="fab fa-whatsapp"></i> WA
                                </button>
                                <button data-payload="${encodedPayload}" class="js-copy-btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded transition w-full max-w-[80px] flex items-center justify-center gap-1 text-[10px]">
                                    <i class="fas fa-link"></i> Link
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        loader.classList.add('hidden');
        tabsContainer.classList.remove('hidden');
        reportArea.classList.remove('hidden');

    } catch (err) {
        console.error("Data matching error:", err);
        loader.classList.add('hidden');
        alert("Data load nahi ho pa raha: " + err.message);
    }
}

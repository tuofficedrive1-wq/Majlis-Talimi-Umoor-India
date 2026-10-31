import { 
    collection, 
    addDoc, 
    setDoc,
    doc,
    getDocs, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const LOCK_RULES_COL = 'karkardagi_lock_rules';
const UNLOCK_REQ_COL = 'karkardagi_unlock_requests';
const URDU_MONTHS = ['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];

let cachedRegions = [];
let cachedStates = [];
let cachedJamias = [];
let cachedTeachers = [];
let rulesCache = [];
let requestsCache = [];
let isInitialized = false;

// Notification helper
function showToast(msg, isError = false) {
    const notif = document.getElementById('notification');
    if (notif) {
        notif.textContent = msg;
        notif.className = `fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-[100] transition-transform transform ${isError ? 'bg-red-600' : 'bg-emerald-600'}`;
        notif.classList.remove('hidden', 'translate-x-full');
        setTimeout(() => notif.classList.add('translate-x-full'), 3500);
    } else {
        alert(msg);
    }
}

function ymd(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addDays(d, n) {
    const res = new Date(d);
    res.setDate(res.getDate() + n);
    return res;
}

function fmtDateUrdu(s) {
    if (!s) return '-';
    const parts = s.split('-');
    if (parts.length !== 3) return s;
    const y = parts[0], m = parseInt(parts[1], 10) - 1, d = parseInt(parts[2], 10);
    return `${d} ${URDU_MONTHS[m] || parts[1]}، ${y}`;
}

export async function initKarkardagiLockSettings(db) {
    const root = document.getElementById('karkardagi-lock-root');
    if (!root) return;

    if (!isInitialized) {
        renderBaseLayout(root);
        attachEventListeners(db);
        isInitialized = true;
    }

    await loadMasterData(db);
    await loadRules(db);
    await loadTeacherRequests(db);
}

function renderBaseLayout(root) {
    root.innerHTML = `
        <div class="space-y-6" dir="rtl">
            <!-- Header & Action Row -->
            <div class="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 class="text-2xl font-black flex items-center gap-3">
                        <i class="fas fa-unlock-alt text-amber-400"></i>
                        ماہانہ کارکردگی — ایڈمن لاک و ان لاک کنٹرول
                    </h2>
                    <p class="text-slate-300 text-sm mt-1">
                        یہاں سے آپ ماہ کے آخر اور 1 تاریخ کے عمومی لاک کی تاریخوں میں توسیع کر سکتے ہیں۔ تمام بھارت، مخصوص ریجن، ریاست، جامعہ یا استاد کے لیے ان لاک رول سیٹ کریں۔
                    </p>
                </div>
                <div class="flex items-center gap-3 flex-wrap">
                    <button id="btn-refresh-lock-rules" type="button" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow transition flex items-center gap-2">
                        <i class="fas fa-sync-alt"></i> ریفریش
                    </button>
                    <button id="btn-open-create-rule" type="button" class="bg-amber-500 hover:bg-amber-600 text-slate-900 px-5 py-2.5 rounded-xl font-black text-sm shadow-lg transition flex items-center gap-2">
                        <i class="fas fa-plus-circle"></i> نیا ان لاک رول شامل کریں
                    </button>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">فعال رولز (Active Rules)</div>
                        <div id="stat-active-rules" class="text-2xl font-black text-teal-700 mt-1">0</div>
                    </div>
                    <div class="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center text-xl font-bold">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                </div>

                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">تمام بھارت (All India Event)</div>
                        <div id="stat-all-india" class="text-sm font-bold text-slate-700 mt-1">کوئی فعال نہیں</div>
                    </div>
                    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold">
                        <i class="fas fa-globe-asia"></i>
                    </div>
                </div>

                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">جامعات / خطہ رولز</div>
                        <div id="stat-jamia-rules" class="text-2xl font-black text-indigo-700 mt-1">0</div>
                    </div>
                    <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold">
                        <i class="fas fa-mosque"></i>
                    </div>
                </div>

                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">اساتذہ کی زیرِ غور درخواستیں</div>
                        <div id="stat-pending-reqs" class="text-2xl font-black text-amber-600 mt-1">0</div>
                    </div>
                    <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl font-bold">
                        <i class="fas fa-user-clock"></i>
                    </div>
                </div>
            </div>

            <!-- Quick All-India Instant Unlock Banner -->
            <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-2xl shadow-sm">
                <div class="flex items-start justify-between flex-wrap gap-4">
                    <div class="flex-1 min-w-[280px]">
                        <h3 class="text-lg font-black text-amber-900 flex items-center gap-2">
                            <i class="fas fa-bolt text-amber-600"></i>
                            فوری ہنگامی / عمومی ان لاک (Instant All-India Unlock)
                        </h3>
                        <p class="text-sm text-amber-800 mt-1">
                            اگر کسی مرکزی اجلاس، سالانہ امتحان، یا دفتری ہدایت پر پورے ملک کے تمام اساتذہ کے لیے رپورٹ کھولی جانی ہو، تو یہاں سے ایک کلک میں سبھی کا لاک اوپن کریں۔
                        </p>
                    </div>
                    <div class="flex items-center gap-3 flex-wrap">
                        <div>
                            <label class="block text-xs font-bold text-amber-900 mb-1">ماہ منتخب کریں</label>
                            <select id="quick-month-select" class="p-2 border border-amber-300 rounded-lg text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-amber-500">
                                ${URDU_MONTHS.map((m, idx) => `<option value="${idx}" ${idx === new Date().getMonth() ? 'selected' : ''}>${m} ${new Date().getFullYear()}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-amber-900 mb-1">کب تک کھلی رہے؟</label>
                            <input type="date" id="quick-to-date" value="${ymd(addDays(new Date(), 5))}" class="p-2 border border-amber-300 rounded-lg text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-amber-500">
                        </div>
                        <div class="self-end">
                            <button id="btn-quick-unlock-all" type="button" class="bg-amber-600 hover:bg-amber-700 text-white font-black px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2">
                                <i class="fas fa-check-circle"></i> تمام بھارت پر لاگو کریں
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation (Rules vs Requests) -->
            <div class="border-b border-slate-200 flex gap-4">
                <button type="button" id="tab-btn-rules" class="py-3 px-4 font-black text-sm border-b-2 border-teal-600 text-teal-700 flex items-center gap-2">
                    <i class="fas fa-list-check"></i> ایڈمن ان لاک رولز (Lock Overrides)
                </button>
                <button type="button" id="tab-btn-reqs" class="py-3 px-4 font-bold text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2">
                    <i class="fas fa-inbox"></i> اساتذہ کی موصولہ درخواستیں (Unlock Requests)
                    <span id="tab-badge-reqs" class="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-black hidden">0</span>
                </button>
            </div>

            <!-- TAB 1: Rules Table -->
            <div id="section-rules-view" class="space-y-4">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50">
                        <div class="font-black text-slate-800 flex items-center gap-2">
                            <i class="fas fa-sliders-h text-teal-600"></i>
                            موجودہ سیٹ شدہ ان لاک رولز کی فہرست
                        </div>
                        <div class="flex items-center gap-2">
                            <select id="filter-rule-scope" class="p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold">
                                <option value="all">تمام اسکوپ (All Scopes)</option>
                                <option value="all_india">تمام بھارت (All India)</option>
                                <option value="region">ریجن (Region)</option>
                                <option value="state">ریاست (State)</option>
                                <option value="jamia">جامعہ (Jamia)</option>
                                <option value="teacher">استاد (Teacher)</option>
                            </select>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-right text-sm">
                            <thead class="bg-slate-800 text-white text-xs uppercase tracking-wider">
                                <tr>
                                    <th class="p-3 w-12 text-center">#</th>
                                    <th class="p-3">دائرہ اختیار (Scope)</th>
                                    <th class="p-3">ہدف (Target / نام)</th>
                                    <th class="p-3">ماہانہ رپورٹ</th>
                                    <th class="p-3">کھلنے و بند ہونے کی تاریخ</th>
                                    <th class="p-3">وجہ / نوٹ (Reason)</th>
                                    <th class="p-3 text-center">حالت (Status)</th>
                                    <th class="p-3 text-center w-28">ایکشن</th>
                                </tr>
                            </thead>
                            <tbody id="rules-tbody" class="divide-y divide-slate-100">
                                <tr>
                                    <td colspan="8" class="p-8 text-center text-slate-400 font-bold">
                                        <i class="fas fa-spinner fa-spin mr-2"></i> رولز لوڈ ہو رہے ہیں...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB 2: Teacher Requests View -->
            <div id="section-reqs-view" class="hidden space-y-4">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50">
                        <div class="font-black text-slate-800 flex items-center gap-2">
                            <i class="fas fa-inbox text-amber-600"></i>
                            اساتذہ کی رپورٹ ان لاک کرنے کی درخواستیں
                        </div>
                        <div class="text-xs text-slate-500">
                            (یہاں سے ایڈمن کسی بھی استاد کی موصولہ درخواست کو منظور یا مسترد کر سکتا ہے)
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-right text-sm">
                            <thead class="bg-slate-800 text-white text-xs uppercase tracking-wider">
                                <tr>
                                    <th class="p-3 w-12 text-center">#</th>
                                    <th class="p-3">استاد کا نام و کوڈ</th>
                                    <th class="p-3">جامعہ</th>
                                    <th class="p-3">ماہ</th>
                                    <th class="p-3">استاد کی وضاحت (Reason)</th>
                                    <th class="p-3">درخواست کا وقت</th>
                                    <th class="p-3 text-center">حالت</th>
                                    <th class="p-3 text-center w-36">ایکشن</th>
                                </tr>
                            </thead>
                            <tbody id="reqs-tbody" class="divide-y divide-slate-100">
                                <tr>
                                    <td colspan="8" class="p-8 text-center text-slate-400 font-bold">
                                        درخواستیں لوڈ ہو رہی ہیں...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- CREATE / EDIT RULE MODAL -->
            <div id="modal-lock-rule" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] hidden flex justify-center items-center p-3" dir="rtl">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all border border-slate-100 max-h-[92vh] flex flex-col">
                    <div class="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                        <h3 id="modal-rule-title" class="text-lg font-black flex items-center gap-2">
                            <i class="fas fa-shield-alt text-amber-400"></i>
                            نیا ان لاک رول شامل کریں
                        </h3>
                        <button type="button" id="btn-close-rule-modal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>

                    <form id="form-lock-rule" class="p-6 overflow-y-auto space-y-4 flex-1">
                        <input type="hidden" id="rule-doc-id" value="">

                        <!-- Scope Selection -->
                        <div>
                            <label class="block text-xs font-black text-slate-700 uppercase mb-1">
                                کس دائرے پر لاگو کرنا ہے؟ (Scope) <span class="text-red-500">*</span>
                            </label>
                            <select id="rule-scope-select" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none text-sm" required>
                                <option value="all">🌍 تمام بھارت / سبھی اساتذہ (All India)</option>
                                <option value="region">📍 مخصوص خطہ / ریجن (Specific Region)</option>
                                <option value="state">🏛️ مخصوص ریاست / صوبہ (Specific State)</option>
                                <option value="jamia">🏫 مخصوص جامعہ (Specific Jamia)</option>
                                <option value="teacher">👨‍🏫 مخصوص استاد (Specific Teacher / Ajeer Code)</option>
                            </select>
                        </div>

                        <!-- Dynamic Target Container -->
                        <div id="target-container" class="hidden">
                            <label id="target-label" class="block text-xs font-black text-slate-700 uppercase mb-1">
                                ہدف منتخب کریں <span class="text-red-500">*</span>
                            </label>
                            <div id="target-input-wrap"></div>
                        </div>

                        <!-- Month & Year -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-black text-slate-700 uppercase mb-1">رپورٹ کا ماہ <span class="text-red-500">*</span></label>
                                <select id="rule-month-select" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-sm" required>
                                    <option value="all">تمام مہینے (All Months)</option>
                                    ${URDU_MONTHS.map((m, idx) => `<option value="${idx}" ${idx === new Date().getMonth() ? 'selected' : ''}>${m}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-black text-slate-700 uppercase mb-1">سال (Year) <span class="text-red-500">*</span></label>
                                <select id="rule-year-select" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-sm" required>
                                    <option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>
                                    <option value="${new Date().getFullYear() - 1}">${new Date().getFullYear() - 1}</option>
                                    <option value="${new Date().getFullYear() + 1}">${new Date().getFullYear() + 1}</option>
                                </select>
                            </div>
                        </div>

                        <!-- Dates (From & To) -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-black text-slate-700 uppercase mb-1">کب سے کھولیں؟ (Open From) <span class="text-red-500">*</span></label>
                                <input type="date" id="rule-from-date" value="${ymd()}" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-sm bg-white" required>
                            </div>
                            <div>
                                <label class="block text-xs font-black text-slate-700 uppercase mb-1">کب تک کھلی رہے؟ (Open To) <span class="text-red-500">*</span></label>
                                <input type="date" id="rule-to-date" value="${ymd(addDays(new Date(), 5))}" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-sm bg-white" required>
                            </div>
                        </div>

                        <!-- Date Quick Presets -->
                        <div class="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <span class="text-slate-400">فوری انتخاب:</span>
                            <button type="button" class="btn-preset bg-white hover:bg-slate-200 px-2.5 py-1 rounded-lg border shadow-xs" data-days="3">+3 دن</button>
                            <button type="button" class="btn-preset bg-white hover:bg-slate-200 px-2.5 py-1 rounded-lg border shadow-xs" data-days="5">+5 دن</button>
                            <button type="button" class="btn-preset bg-white hover:bg-slate-200 px-2.5 py-1 rounded-lg border shadow-xs" data-days="10">+10 دن</button>
                            <button type="button" class="btn-preset-next5 bg-white hover:bg-slate-200 px-2.5 py-1 rounded-lg border shadow-xs">اگلے ماہ کی 5 تاریخ</button>
                        </div>

                        <!-- Reason / Title -->
                        <div>
                            <label class="block text-xs font-black text-slate-700 uppercase mb-1">وجہ یا دفتری نوٹ (Reason / Title) <span class="text-red-500">*</span></label>
                            <input type="text" id="rule-reason-input" placeholder="مثلاً: سالانہ اجتماع، تربیتی سیشن یا دفتری رعایت کی بناء پر" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500" required>
                        </div>

                        <!-- Status toggle -->
                        <div class="flex items-center gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            <input type="checkbox" id="rule-active-checkbox" checked class="w-5 h-5 text-emerald-600 rounded cursor-pointer">
                            <label for="rule-active-checkbox" class="text-sm font-black text-emerald-900 cursor-pointer">
                                یہ رول فوراً فعال (Active) کریں
                            </label>
                        </div>

                        <div class="pt-3 border-t flex justify-end gap-3">
                            <button type="button" id="btn-cancel-rule" class="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">منسوخ</button>
                            <button type="submit" id="btn-save-rule" class="bg-teal-600 hover:bg-teal-700 text-white font-black px-6 py-2.5 rounded-xl text-sm shadow-md transition flex items-center gap-2">
                                <i class="fas fa-check"></i> رول محفوظ کریں
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- APPROVE / REJECT MODAL FOR TEACHER REQUEST -->
            <div id="modal-req-decision" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] hidden flex justify-center items-center p-3" dir="rtl">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100 p-6 space-y-4">
                    <h3 class="text-lg font-black text-slate-800 flex items-center gap-2">
                        <i class="fas fa-key text-amber-500"></i>
                        استاد کی درخواست کا فیصلہ
                    </h3>
                    <div id="decision-req-summary" class="bg-slate-50 p-3 rounded-xl border text-sm space-y-1"></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">کب سے کھولیں</label>
                            <input type="date" id="dec-from-date" value="${ymd()}" class="w-full p-2 border rounded-lg text-sm bg-white font-bold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">کب تک کھلی رہے</label>
                            <input type="date" id="dec-to-date" value="${ymd(addDays(new Date(), 3))}" class="w-full p-2 border rounded-lg text-sm bg-white font-bold">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">ایڈمن کا نوٹ (اختیاری)</label>
                        <input type="text" id="dec-note" placeholder="مثلاً: منظور کی گئی" class="w-full p-2 border rounded-lg text-sm bg-white font-bold">
                    </div>
                    <div class="flex gap-2 pt-2">
                        <button type="button" id="btn-dec-approve" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 rounded-xl text-sm">منظور کریں</button>
                        <button type="button" id="btn-dec-reject" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2 rounded-xl text-sm">مسترد کریں</button>
                        <button type="button" id="btn-dec-cancel" class="px-3 bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-sm">بند کریں</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadMasterData(db) {
    try {
        const snap = await getDocs(collection(db, 'jamiaat_master'));
        const regSet = new Set();
        const stateSet = new Set();
        const jList = [];

        snap.forEach(d => {
            const data = d.data();
            const name = (data.name || '').trim();
            const urduName = (data.urduName || '').trim();
            const region = (data.region || '').trim().toUpperCase();
            const state = (data.state || '').trim().toUpperCase();

            if (name && name !== 'undefined') {
                jList.push({ id: d.id, name, urduName, region, state });
                if (region) regSet.add(region);
                if (state) stateSet.add(state);
            }
        });

        cachedJamias = jList.sort((a, b) => a.name.localeCompare(b.name));
        cachedRegions = Array.from(regSet).sort();
        cachedStates = Array.from(stateSet).sort();

        // Also fetch teachers
        try {
            const teachSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
            cachedTeachers = teachSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch(e) {
            console.warn('Teacher fetch error:', e);
        }
    } catch(e) {
        console.error('Master data load error:', e);
    }
}

function updateDynamicTargetInput() {
    const scope = document.getElementById('rule-scope-select').value;
    const container = document.getElementById('target-container');
    const wrap = document.getElementById('target-input-wrap');
    const label = document.getElementById('target-label');

    if (scope === 'all') {
        container.classList.add('hidden');
        wrap.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');

    if (scope === 'region') {
        label.textContent = 'ریجن منتخب کریں (Select Region)';
        wrap.innerHTML = `
            <select id="rule-target-val" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-sm" required>
                <option value="">-- ریجن منتخب کریں --</option>
                ${cachedRegions.map(r => `<option value="${r}">${r}</option>`).join('')}
            </select>
        `;
    } else if (scope === 'state') {
        label.textContent = 'ریاست / صوبہ منتخب کریں (Select State)';
        wrap.innerHTML = `
            <select id="rule-target-val" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-sm" required>
                <option value="">-- ریاست منتخب کریں --</option>
                ${cachedStates.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
        `;
    } else if (scope === 'jamia') {
        label.textContent = 'جامعہ منتخب کریں (Select Jamia)';
        wrap.innerHTML = `
            <select id="rule-target-val" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-sm" required>
                <option value="">-- جامعہ منتخب کریں --</option>
                ${cachedJamias.map(j => `<option value="${j.name}">${j.name} ${j.urduName ? '(' + j.urduName + ')' : ''} [${j.region || ''}]</option>`).join('')}
            </select>
        `;
    } else if (scope === 'teacher') {
        label.textContent = 'استاد کا اجیر کوڈ یا نام درج کریں (Teacher Ajeer Code)';
        wrap.innerHTML = `
            <div class="space-y-2">
                <input type="text" id="rule-target-val" placeholder="مثلاً: 12345" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-sm outline-none focus:ring-2 focus:ring-teal-500" required>
                <div id="teacher-lookup-info" class="text-xs text-slate-500 font-bold">اجیر کوڈ لکھیں، استاد کا نام خود بخود چیک ہوگا...</div>
            </div>
        `;

        const inp = document.getElementById('rule-target-val');
        const info = document.getElementById('teacher-lookup-info');
        inp.addEventListener('input', () => {
            const val = inp.value.trim();
            if (!val) { info.textContent = ''; return; }
            const match = cachedTeachers.find(t => String(t.ajeerCode).trim() === val || String(t.email || '').split('@')[0] === val);
            if (match) {
                info.innerHTML = `<span class="text-emerald-700"><i class="fas fa-check-circle"></i> ${match.name || 'نامعلوم'} (${match.jamiaName || 'جامعہ'})</span>`;
            } else {
                info.innerHTML = `<span class="text-amber-700">کوئی استاد نہیں ملا، رول اس کوڈ [${val}] پر لاگو ہو جائے گا</span>`;
            }
        });
    }
}

async function loadRules(db) {
    const tbody = document.getElementById('rules-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, LOCK_RULES_COL));
        rulesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        rulesCache.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
        renderRulesTable();
        updateStats();
        await syncRulesToSettings(db);
    } catch(e) {
        console.error('Rules load error:', e);
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-600 font-bold">خرابی: ${e.message}</td></tr>`;
    }
}

async function syncRulesToSettings(db) {
    try {
        const cleanRules = rulesCache.map(r => {
            const clean = {};
            Object.keys(r || {}).forEach(k => {
                if (r[k] !== undefined) clean[k] = r[k];
            });
            return clean;
        });
        await setDoc(doc(db, 'settings', 'karkardagi_lock_rules'), {
            rules: cleanRules,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch(e) {
        console.warn('Sync to settings error:', e);
    }
}

function renderRulesTable() {
    const tbody = document.getElementById('rules-tbody');
    if (!tbody) return;

    const filterScope = document.getElementById('filter-rule-scope')?.value || 'all';
    let filtered = rulesCache;
    if (filterScope !== 'all') {
        filtered = rulesCache.filter(r => (filterScope === 'all_india' ? r.scope === 'all' : r.scope === filterScope));
    }

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="p-8 text-center text-slate-400 font-bold">
                    کوئی رول موجود نہیں۔ اوپر "نیا ان لاک رول شامل کریں" پر کلک کریں۔
                </td>
            </tr>
        `;
        return;
    }

    const todayStr = ymd();

    tbody.innerHTML = filtered.map((r, i) => {
        const isCurrentlyValid = r.status === 'active' && todayStr >= r.openFrom && todayStr <= r.openTo;
        const isExpired = todayStr > r.openTo;
        const isEarly = todayStr < r.openFrom;

        let statusBadge = '';
        if (r.status !== 'active') {
            statusBadge = '<span class="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-black">غیر فعال (Paused)</span>';
        } else if (isCurrentlyValid) {
            statusBadge = '<span class="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-black animate-pulse">کھلا ہے (Open Now)</span>';
        } else if (isExpired) {
            statusBadge = '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold">مدت ختم (Expired)</span>';
        } else if (isEarly) {
            statusBadge = '<span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold">آئندہ کھلے گا (Upcoming)</span>';
        }

        let scopeBadge = '';
        if (r.scope === 'all') {
            scopeBadge = '<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-black">🌍 تمام بھارت</span>';
        } else if (r.scope === 'region') {
            scopeBadge = '<span class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-black">📍 ریجن</span>';
        } else if (r.scope === 'state') {
            scopeBadge = '<span class="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs font-black">🏛️ ریاست</span>';
        } else if (r.scope === 'jamia') {
            scopeBadge = '<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-black">🏫 جامعہ</span>';
        } else if (r.scope === 'teacher') {
            scopeBadge = '<span class="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-xs font-black">👨‍🏫 استاد</span>';
        }

        const monthLabel = r.month === 'all' ? 'تمام مہینے' : (URDU_MONTHS[r.month] || r.month) + ' ' + (r.year || '');

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center text-slate-400 font-bold">${i + 1}</td>
                <td class="p-3">${scopeBadge}</td>
                <td class="p-3 font-bold text-slate-800">${r.targetLabel || r.targetValue || 'تمام'}</td>
                <td class="p-3 font-bold text-slate-700">${monthLabel}</td>
                <td class="p-3">
                    <div class="text-xs font-bold text-slate-800" style="text-align:center" dir="rtl">
                        <span class="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono" dir="ltr">${r.openFrom}</span>
                        <span class="text-slate-400 font-normal mx-1">تا</span>
                        <span class="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono" dir="ltr">${r.openTo}</span>
                        <div class="text-[11px] text-teal-700 mt-1 font-bold">${fmtDateUrdu(r.openFrom)} تا ${fmtDateUrdu(r.openTo)}</div>
                    </div>
                </td>
                <td class="p-3 text-xs text-slate-600 max-w-[220px] truncate" title="${r.reason || ''}">${r.reason || '-'}</td>
                <td class="p-3 text-center">${statusBadge}</td>
                <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button type="button" class="btn-toggle-rule text-slate-600 hover:text-teal-700 p-1.5 rounded-lg hover:bg-slate-100 transition" data-id="${r.id}" title="${r.status === 'active' ? 'غیر فعال کریں' : 'فعال کریں'}">
                            <i class="fas ${r.status === 'active' ? 'fa-toggle-on text-teal-600 text-xl' : 'fa-toggle-off text-slate-400 text-xl'}"></i>
                        </button>
                        <button type="button" class="btn-edit-rule text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition" data-id="${r.id}" title="ترمیم کریں">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-delete-rule text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition" data-id="${r.id}" title="حذف کریں">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    const todayStr = ymd();
    const active = rulesCache.filter(r => r.status === 'active');
    const elActive = document.getElementById('stat-active-rules');
    if (elActive) elActive.textContent = active.length;

    const allIndia = active.find(r => r.scope === 'all' && todayStr >= r.openFrom && todayStr <= r.openTo);
    const elAllIndia = document.getElementById('stat-all-india');
    if (elAllIndia) {
        if (allIndia) {
            elAllIndia.innerHTML = `<span class="text-emerald-700 font-black"><i class="fas fa-check-circle"></i> کھلا ہے (${allIndia.openTo} تک)</span>`;
        } else {
            elAllIndia.textContent = 'کوئی فعال نہیں';
        }
    }

    const jamiaRules = active.filter(r => r.scope === 'jamia' || r.scope === 'region' || r.scope === 'state');
    const elJamia = document.getElementById('stat-jamia-rules');
    if (elJamia) elJamia.textContent = jamiaRules.length;
}

async function loadTeacherRequests(db) {
    const tbody = document.getElementById('reqs-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, UNLOCK_REQ_COL));
        requestsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        requestsCache.sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));

        const pendingCount = requestsCache.filter(r => r.status === 'pending').length;
        const statReqs = document.getElementById('stat-pending-reqs');
        if (statReqs) statReqs.textContent = pendingCount;

        const badgeReqs = document.getElementById('tab-badge-reqs');
        if (badgeReqs) {
            badgeReqs.textContent = pendingCount;
            badgeReqs.classList.toggle('hidden', pendingCount === 0);
        }

        renderRequestsTable();
    } catch(e) {
        console.warn('Teacher requests load error:', e);
    }
}

function renderRequestsTable() {
    const tbody = document.getElementById('reqs-tbody');
    if (!tbody) return;

    if (!requestsCache.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 font-bold">کوئی درخواست موصول نہیں ہوئی۔</td></tr>`;
        return;
    }

    tbody.innerHTML = requestsCache.map((r, i) => {
        let stBadge = '';
        if (r.status === 'pending') stBadge = '<span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-black">زیرِ غور (Pending)</span>';
        else if (r.status === 'approved') stBadge = `<span class="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-black">منظور شدہ (${r.openTo || ''})</span>`;
        else stBadge = '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold">مسترد (Rejected)</span>';

        const monthText = r.monthLabel || (URDU_MONTHS[r.month] ? URDU_MONTHS[r.month] + ' ' + (r.year || '') : '-');
        const reqDate = r.requestedAt ? new Date(r.requestedAt).toLocaleDateString('ur-PK') : '-';

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center text-slate-400 font-bold">${i + 1}</td>
                <td class="p-3 font-bold text-slate-800">
                    ${r.teacherName || 'استاد'}
                    <span class="block text-xs text-slate-500 font-normal">کوڈ: ${r.ajeerCode || '-'}</span>
                </td>
                <td class="p-3 font-bold text-slate-700">${r.jamiaName || '-'}</td>
                <td class="p-3 font-bold text-slate-700">${monthText}</td>
                <td class="p-3 text-xs text-slate-600 max-w-[200px] truncate" title="${r.reason || ''}">${r.reason || '-'}</td>
                <td class="p-3 text-xs text-slate-500">${reqDate}</td>
                <td class="p-3 text-center">${stBadge}</td>
                <td class="p-3 text-center">
                    <button type="button" class="btn-decide-req bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition" data-id="${r.id}">
                        فیصلہ کریں
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function attachEventListeners(db) {
    // Tab switching
    const tabRules = document.getElementById('tab-btn-rules');
    const tabReqs = document.getElementById('tab-btn-reqs');
    const secRules = document.getElementById('section-rules-view');
    const secReqs = document.getElementById('section-reqs-view');

    tabRules.addEventListener('click', () => {
        tabRules.className = 'py-3 px-4 font-black text-sm border-b-2 border-teal-600 text-teal-700 flex items-center gap-2';
        tabReqs.className = 'py-3 px-4 font-bold text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2';
        secRules.classList.remove('hidden');
        secReqs.classList.add('hidden');
    });

    tabReqs.addEventListener('click', () => {
        tabReqs.className = 'py-3 px-4 font-black text-sm border-b-2 border-teal-600 text-teal-700 flex items-center gap-2';
        tabRules.className = 'py-3 px-4 font-bold text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2';
        secReqs.classList.remove('hidden');
        secRules.classList.add('hidden');
    });

    // Refresh button
    document.getElementById('btn-refresh-lock-rules')?.addEventListener('click', async () => {
        await loadRules(db);
        await loadTeacherRequests(db);
        showToast('رولز اور درخواستیں ریفریش ہو گئیں');
    });

    // Scope selection change
    document.getElementById('rule-scope-select')?.addEventListener('change', updateDynamicTargetInput);

    // Filter scope
    document.getElementById('filter-rule-scope')?.addEventListener('change', renderRulesTable);

    // Open create rule modal
    document.getElementById('btn-open-create-rule')?.addEventListener('click', () => {
        openRuleModal();
    });

    // Close modal
    document.getElementById('btn-close-rule-modal')?.addEventListener('click', closeRuleModal);
    document.getElementById('btn-cancel-rule')?.addEventListener('click', closeRuleModal);

    // Quick presets
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const days = parseInt(btn.dataset.days, 10);
            const from = document.getElementById('rule-from-date').value ? new Date(document.getElementById('rule-from-date').value) : new Date();
            document.getElementById('rule-to-date').value = ymd(addDays(from, days));
        });
    });

    document.querySelector('.btn-preset-next5')?.addEventListener('click', () => {
        const now = new Date();
        const nextMonth5 = new Date(now.getFullYear(), now.getMonth() + 1, 5);
        document.getElementById('rule-to-date').value = ymd(nextMonth5);
    });

    // Quick All-India unlock button
    document.getElementById('btn-quick-unlock-all')?.addEventListener('click', async () => {
        const m = parseInt(document.getElementById('quick-month-select').value, 10);
        const toDate = document.getElementById('quick-to-date').value;
        if (!toDate) return showToast('آخری تاریخ درج کریں', true);

        const reason = 'مرکزی ایڈمن کی فوری عمومی رعایت برائے تمام بھارت';
        const docId = `all_india_${new Date().getFullYear()}_${m}`;

        try {
            await setDoc(doc(db, LOCK_RULES_COL, docId), {
                scope: 'all',
                targetValue: 'ALL',
                targetLabel: 'تمام بھارت (All India)',
                month: m,
                year: new Date().getFullYear(),
                openFrom: ymd(),
                openTo: toDate,
                reason: reason,
                status: 'active',
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            }, { merge: true });

            showToast('تمام بھارت کے لیے ان لاک رول کامیابی سے فعال کر دیا گیا!');
            await loadRules(db);
        } catch(e) {
            showToast('خرابی: ' + e.message, true);
        }
    });

    // Form submit (create or update rule)
    document.getElementById('form-lock-rule')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const docId = document.getElementById('rule-doc-id').value;
        const scope = document.getElementById('rule-scope-select').value;
        const month = document.getElementById('rule-month-select').value;
        const year = parseInt(document.getElementById('rule-year-select').value, 10);
        const openFrom = document.getElementById('rule-from-date').value;
        const openTo = document.getElementById('rule-to-date').value;
        const reason = document.getElementById('rule-reason-input').value.trim();
        const isActive = document.getElementById('rule-active-checkbox').checked;

        if (!openFrom || !openTo || openTo < openFrom) {
            return showToast('تاریخیں درست منتخب کریں (آخری تاریخ شروع سے پہلے نہیں ہو سکتی)', true);
        }

        let targetValue = 'ALL';
        let targetLabel = 'تمام بھارت (All India)';

        if (scope !== 'all') {
            const targetEl = document.getElementById('rule-target-val');
            targetValue = (targetEl?.value || '').trim();
            if (!targetValue) return showToast('براہِ کرم ہدف (Target) منتخب یا درج کریں', true);

            if (scope === 'teacher') {
                const match = cachedTeachers.find(t => String(t.ajeerCode || '').trim() === targetValue || String(t.email || '').split('@')[0].trim() === targetValue || String(t.code || '').trim() === targetValue);
                if (match) {
                    targetLabel = `${match.name || 'استاد'} (${targetValue})`;
                } else if (docId) {
                    const existing = rulesCache.find(x => x.id === docId);
                    targetLabel = existing?.targetLabel || `استاد کوڈ: ${targetValue}`;
                } else {
                    targetLabel = `استاد کوڈ: ${targetValue}`;
                }
            } else {
                targetLabel = targetValue;
            }
        }

        const payload = {
            scope,
            targetValue,
            targetLabel,
            month: month === 'all' ? 'all' : parseInt(month, 10),
            year,
            openFrom,
            openTo,
            reason,
            status: isActive ? 'active' : 'inactive',
            updatedAt: new Date().toISOString()
        };

        try {
            if (docId) {
                await setDoc(doc(db, LOCK_RULES_COL, docId), payload, { merge: true });
                showToast('رول میں ترمیم محفوظ ہو گئی');
            } else {
                payload.createdAt = new Date().toISOString();
                const docRef = await addDoc(collection(db, LOCK_RULES_COL), payload);
                payload.id = docRef.id;
                showToast('نیا ان لاک رول کامیابی سے شامل ہو گیا');
            }
            closeRuleModal();
            await loadRules(db);
        } catch(err) {
            console.error('Save rule error:', err);
            showToast('خرابی: ' + err.message, true);
        }
    });

    // Delegate table buttons (toggle, edit, delete)
    document.getElementById('rules-tbody')?.addEventListener('click', async (e) => {
        const toggleBtn = e.target.closest('.btn-toggle-rule');
        if (toggleBtn) {
            const id = toggleBtn.dataset.id;
            const r = rulesCache.find(x => x.id === id);
            if (!r) return;
            const newStatus = r.status === 'active' ? 'inactive' : 'active';
            try {
                await setDoc(doc(db, LOCK_RULES_COL, id), { status: newStatus }, { merge: true });
                showToast(newStatus === 'active' ? 'رول فعال کر دیا گیا' : 'رول غیر فعال کر دیا گیا');
                await loadRules(db);
            } catch(err) {
                showToast('خرابی: ' + err.message, true);
            }
            return;
        }

        const editBtn = e.target.closest('.btn-edit-rule');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const r = rulesCache.find(x => x.id === id);
            if (r) openRuleModal(r);
            return;
        }

        const delBtn = e.target.closest('.btn-delete-rule');
        if (delBtn) {
            const id = delBtn.dataset.id;
            if (!confirm('کیا آپ واقعی یہ ان لاک رول حذف کرنا چاہتے ہیں؟')) return;
            try {
                await deleteDoc(doc(db, LOCK_RULES_COL, id));
                showToast('رول حذف کر دیا گیا');
                await loadRules(db);
            } catch(err) {
                showToast('خرابی: ' + err.message, true);
            }
            return;
        }
    });

    // Delegate requests table button (decide)
    document.getElementById('reqs-tbody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-decide-req');
        if (btn) {
            const id = btn.dataset.id;
            const r = requestsCache.find(x => x.id === id);
            if (r) openReqDecisionModal(db, r);
        }
    });
}

function openRuleModal(rule = null) {
    const modal = document.getElementById('modal-lock-rule');
    const title = document.getElementById('modal-rule-title');
    const docId = document.getElementById('rule-doc-id');
    const scopeSel = document.getElementById('rule-scope-select');
    const monthSel = document.getElementById('rule-month-select');
    const yearSel = document.getElementById('rule-year-select');
    const fromInp = document.getElementById('rule-from-date');
    const toInp = document.getElementById('rule-to-date');
    const reasonInp = document.getElementById('rule-reason-input');
    const activeCb = document.getElementById('rule-active-checkbox');

    if (rule) {
        title.innerHTML = '<i class="fas fa-edit text-amber-400"></i> ان لاک رول میں ترمیم کریں';
        docId.value = rule.id;
        scopeSel.value = rule.scope || 'all';
        updateDynamicTargetInput();
        if (rule.scope !== 'all') {
            const targetEl = document.getElementById('rule-target-val');
            if (targetEl) {
                targetEl.value = rule.targetValue || '';
                targetEl.dispatchEvent(new Event('input'));
            }
        }
        monthSel.value = rule.month !== undefined ? String(rule.month) : 'all';
        yearSel.value = rule.year || new Date().getFullYear();
        fromInp.value = rule.openFrom || ymd();
        toInp.value = rule.openTo || ymd(addDays(new Date(), 5));
        reasonInp.value = rule.reason || '';
        activeCb.checked = rule.status === 'active';
    } else {
        title.innerHTML = '<i class="fas fa-shield-alt text-amber-400"></i> نیا ان لاک رول شامل کریں';
        docId.value = '';
        scopeSel.value = 'all';
        updateDynamicTargetInput();
        monthSel.value = String(new Date().getMonth());
        yearSel.value = new Date().getFullYear();
        fromInp.value = ymd();
        toInp.value = ymd(addDays(new Date(), 5));
        reasonInp.value = '';
        activeCb.checked = true;
    }

    modal.classList.remove('hidden');
}

function closeRuleModal() {
    document.getElementById('modal-lock-rule')?.classList.add('hidden');
}

function openReqDecisionModal(db, r) {
    const modal = document.getElementById('modal-req-decision');
    const summary = document.getElementById('decision-req-summary');
    const fromInp = document.getElementById('dec-from-date');
    const toInp = document.getElementById('dec-to-date');
    const noteInp = document.getElementById('dec-note');

    fromInp.value = ymd();
    toInp.value = ymd(addDays(new Date(), 3));
    noteInp.value = r.zimmedarNote || '';

    summary.innerHTML = `
        <div class="font-bold text-slate-800">${r.teacherName || 'استاد'} (${r.ajeerCode || '-'}) — ${r.jamiaName || ''}</div>
        <div class="text-xs text-slate-600">ماہ: ${r.monthLabel || ''}</div>
        <div class="text-xs text-amber-800 bg-amber-50 p-2 rounded mt-1"><strong>وجہ:</strong> ${r.reason || '-'}</div>
    `;

    modal.classList.remove('hidden');

    const btnApprove = document.getElementById('btn-dec-approve');
    const btnReject = document.getElementById('btn-dec-reject');
    const btnCancel = document.getElementById('btn-dec-cancel');

    btnCancel.onclick = () => modal.classList.add('hidden');

    btnApprove.onclick = async () => {
        const from = fromInp.value, to = toInp.value;
        if (!from || !to || to < from) return showToast('تاریخیں درست منتخب کریں', true);
        try {
            await updateDoc(doc(db, UNLOCK_REQ_COL, r.id), {
                status: 'approved',
                openFrom: from,
                openTo: to,
                zimmedarNote: noteInp.value.trim() || 'ایڈمن کی جانب سے منظور شدہ',
                decidedAt: new Date().toISOString()
            });
            showToast('درخواست منظور کر لی گئی');
            modal.classList.add('hidden');
            await loadTeacherRequests(db);
        } catch(err) {
            showToast('خرابی: ' + err.message, true);
        }
    };

    btnReject.onclick = async () => {
        try {
            await updateDoc(doc(db, UNLOCK_REQ_COL, r.id), {
                status: 'rejected',
                zimmedarNote: noteInp.value.trim() || 'مسترد کی گئی',
                decidedAt: new Date().toISOString()
            });
            showToast('درخواست مسترد کر دی گئی');
            modal.classList.add('hidden');
            await loadTeacherRequests(db);
        } catch(err) {
            showToast('خرابی: ' + err.message, true);
        }
    };
}


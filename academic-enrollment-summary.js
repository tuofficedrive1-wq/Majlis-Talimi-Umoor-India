import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let _db, _assignedJamiaat, _currentUser;
let _allRecords = []; 
let _currentEditRecord = null; 

export async function renderEnrollmentSummary(assignedJamiaat, db, currentUser) {
    _db = db; _assignedJamiaat = assignedJamiaat; _currentUser = currentUser;
    const container = document.getElementById('enrollment-summary-container');
    
    if (!assignedJamiaat || assignedJamiaat.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400 font-medium">Koi Jamia assign nahi hai.</div>';
        return;
    }

    container.innerHTML = '<div class="p-8 text-center text-indigo-500 font-bold"><i class="fas fa-spinner fa-spin mr-2"></i> Data load ho raha hai...</div>';

    try {
        _allRecords = [];
        for (let i = 0; i < assignedJamiaat.length; i += 30) {
            const chunk = assignedJamiaat.slice(i, i + 30);
            const q = query(collection(db, "enrollment_records"), where("inspectorId", "==", currentUser.uid), where("jamiaName", "in", chunk));
            const snap = await getDocs(q);
            snap.forEach(doc => { 
                // YAHAN FIX KIYA GAYA HAI: ...doc.data() pehle aur id: doc.id baad mein
                // Taake form ki fake ID asli Firebase ID ko overwrite na kare
                _allRecords.push({ ...doc.data(), id: doc.id }); 
            });
        }

        if (_allRecords.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-slate-400 font-medium">Abhi tak kisi Jamia ka koi student data submit nahi hua.</div>';
            return;
        }

        // Dropdowns ke liye unique values nikalna
        const uniqueJamias = [...new Set(_allRecords.map(r => r.jamiaName).filter(Boolean))].sort();
        const uniqueClasses = [...new Set(_allRecords.map(r => r.jmClass).filter(Boolean))].sort();
        const uniqueAdmissions = [...new Set(_allRecords.map(r => r.admissionType).filter(Boolean))].sort();

        let html = `
        <!-- Filters & Search Section -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Student Search</label>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
                        <input type="text" id="filter-search" onkeyup="window.applyEnrollmentFilters()" placeholder="Student ka naam type karein..." 
                            class="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jamia Filter</label>
                    <select id="filter-jamia" onchange="window.applyEnrollmentFilters()" class="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none">
                        <option value="">All Jamiaat</option>
                        ${uniqueJamias.map(j => `<option value="${j}">${j}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">JM Class Filter</label>
                    <select id="filter-class" onchange="window.applyEnrollmentFilters()" class="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none">
                        <option value="">All Classes</option>
                        ${uniqueClasses.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Admission Type</label>
                    <select id="filter-adm" onchange="window.applyEnrollmentFilters()" class="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none">
                        <option value="">All Types</option>
                        ${uniqueAdmissions.map(a => `<option value="${a}">${a}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>

        <!-- Table Container -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h4 class="font-bold text-slate-700 text-sm">Showing: <span id="record-count" class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">${_allRecords.length}</span> Students</h4>
            </div>
            <div class="overflow-x-auto max-h-[500px]">
                <table class="w-full text-left border-collapse whitespace-nowrap">
                    <thead class="sticky top-0 bg-slate-100 shadow-sm z-10">
                        <tr class="text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <th class="p-3">Jamia</th>
                            <th class="p-3">Student Name</th>
                            <th class="p-3">Father's Name</th>
                            <th class="p-3">JM Class</th>
                            <th class="p-3">Adm Type</th>
                            <th class="p-3">Details</th>
                            <th class="p-3 text-center">Status</th>
                            <th class="p-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody id="enrollment-tbody" class="text-xs md:text-sm text-slate-600 divide-y divide-slate-100">
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Edit Modal -->
        <div id="edit-enrollment-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] hidden flex justify-center items-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 class="font-bold text-slate-800 text-lg"><i class="fas fa-user-edit text-indigo-600 mr-2"></i> Edit Student Record</h3>
                    <button onclick="window.closeEditModal()" class="text-slate-400 hover:text-red-500 transition"><i class="fas fa-times text-lg"></i></button>
                </div>
                <div class="p-4 overflow-y-auto space-y-4" id="edit-modal-body">
                    <!-- Javascript se content aayega -->
                </div>
                <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onclick="window.closeEditModal()" class="px-4 py-2 rounded-lg text-slate-500 font-bold hover:bg-slate-200 transition text-sm">Cancel</button>
                    <button id="save-edit-btn" class="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition text-sm flex items-center gap-2">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
        `;
        
        container.innerHTML = html;
        window.renderEnrollmentTableRows(_allRecords);

    } catch (error) {
        container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Data fetch error: ${error.message}</div>`;
    }
}

// ══════════════════════════════════════════════════
// TABLE RENDER & FILTERS LOGIC
// ══════════════════════════════════════════════════
window.renderEnrollmentTableRows = (records) => {
    const tbody = document.getElementById('enrollment-tbody');
    const countEl = document.getElementById('record-count');
    if(countEl) countEl.textContent = records.length;

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-400 font-medium">Koi record nahi mila.</td></tr>';
        return;
    }

    let html = '';
    records.forEach(r => {
        let details = r.admissionType === 'NIOS' ? `Langs: ${(r.languages||[]).length} | Subs: ${(r.subjects||[]).length}` 
                    : r.admissionType === 'School' ? `${r.classLevel||''} | ${r.board||r.stream||''}`
                    : r.admissionType === 'College' ? `${r.degree||''} | ${r.duration||''} | ${r.session||''}`
                    : r.admissionType === 'Madrasa Board' ? `Class: ${r.classLevel||''} ${r.stream ? ' | '+r.stream : ''}`
                    : (r.reason || '—');

        let statusBadge = '<span class="text-slate-400">—</span>';
        if(r.status === 'Pass') statusBadge = `<span class="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded font-bold text-[10px] uppercase">Pass ${r.result?'('+r.result+')':''}</span>`;
        else if(r.status === 'Fail') statusBadge = `<span class="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded font-bold text-[10px] uppercase">Fail</span>`;

        html += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 font-semibold text-slate-700">${r.jamiaName || '—'}</td>
                <td class="p-3 font-bold text-indigo-700">${r.studentName || '—'}</td>
                <td class="p-3">${r.fatherName || '—'}</td>
                <td class="p-3"><span class="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">${r.jmClass || '—'}</span></td>
                <td class="p-3"><span class="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">${r.admissionType || '—'}</span></td>
                <td class="p-3 text-slate-500 text-xs truncate max-w-[200px]" title="${details}">${details}</td>
                <td class="p-3 text-center">${statusBadge}</td>
                <td class="p-3 text-center">
                    <button onclick="window.openEditModal('${r.id}')" class="text-amber-500 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 p-1.5 rounded mr-1 transition" title="Edit"><i class="fas fa-edit"></i></button>
                    <button onclick="window.deleteEnrollmentRecord('${r.id}', '${r.studentName.replace(/'/g, "\\'")}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition" title="Delete"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

window.applyEnrollmentFilters = () => {
    const searchTerm = document.getElementById('filter-search').value.toLowerCase();
    const jamiaFilter = document.getElementById('filter-jamia').value;
    const classFilter = document.getElementById('filter-class').value;
    const admFilter = document.getElementById('filter-adm').value;

    const filtered = _allRecords.filter(r => {
        const matchesSearch = (r.studentName || '').toLowerCase().includes(searchTerm) || (r.fatherName || '').toLowerCase().includes(searchTerm);
        const matchesJamia = jamiaFilter === "" || r.jamiaName === jamiaFilter;
        const matchesClass = classFilter === "" || r.jmClass === classFilter;
        const matchesAdm = admFilter === "" || r.admissionType === admFilter;
        return matchesSearch && matchesJamia && matchesClass && matchesAdm;
    });

    window.renderEnrollmentTableRows(filtered);
};

// ══════════════════════════════════════════════════
// 🛑 DELETE LOGIC
// ══════════════════════════════════════════════════
window.deleteEnrollmentRecord = async (docId, name) => {
    if(!confirm(`Kya aap waqai "${name}" ki entry delete karna chahte hain? Yeh Cloud database se mukammal khatam ho jayegi.`)) return;
    try {
        await deleteDoc(doc(_db, "enrollment_records", docId));
        _allRecords = _allRecords.filter(r => r.id !== docId);
        window.applyEnrollmentFilters();
        alert("Entry successfully delete ho gayi.");
    } catch (error) {
        alert("Delete error: " + error.message);
    }
};

// ══════════════════════════════════════════════════
// EDIT MODAL LOGIC (Form Wale Dropdowns)
// ══════════════════════════════════════════════════
let _currentEditId = null;
const QUAL_OPTIONS = ["0 Class","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th","Graduation","Post Graduation"];

window.openEditModal = (docId) => {
    _currentEditRecord = _allRecords.find(r => r.id === docId);
    if(!_currentEditRecord) return;
    _currentEditId = docId;

    const modalBody = document.getElementById('edit-modal-body');
    const r = _currentEditRecord;
    const uniqueClasses = [...new Set(_allRecords.map(x => x.jmClass).filter(Boolean))].sort();
    
    modalBody.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Student's Name</label>
                <input type="text" id="edit-name" value="${r.studentName || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Father's Name</label>
                <input type="text" id="edit-father" value="${r.fatherName || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Date of Birth</label>
                <input type="date" id="edit-dob" value="${r.dob || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Jamiatul Madina Class</label>
                <select id="edit-jmclass" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                    <option value="${r.jmClass || ''}">${r.jmClass || '— Select —'}</option>
                    ${uniqueClasses.filter(c => c !== r.jmClass).map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
        </div>

        <hr class="border-slate-100">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Admission Type</label>
                <select id="edit-admtype" onchange="window.updateDynamicFields()" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="NIOS" ${r.admissionType === 'NIOS' ? 'selected' : ''}>NIOS</option>
                    <option value="School" ${r.admissionType === 'School' ? 'selected' : ''}>School</option>
                    <option value="Madrasa Board" ${r.admissionType === 'Madrasa Board' ? 'selected' : ''}>Madrasa Board</option>
                    <option value="College" ${r.admissionType === 'College' ? 'selected' : ''}>College</option>
                    <option value="No Admission" ${r.admissionType === 'No Admission' ? 'selected' : ''}>No Admission</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Current Qualification</label>
                <select id="edit-qual" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                    <option value="">— Select —</option>
                    ${QUAL_OPTIONS.map(q => `<option value="${q}" ${r.currentQualification === q ? 'selected' : ''}>${q}</option>`).join('')}
                </select>
            </div>
        </div>

        <!-- Dynamic Fields Container -->
        <div id="dynamic-fields-container" class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
        </div>

        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p class="text-xs text-slate-700 font-bold mb-2"><i class="fas fa-clipboard-check mr-1"></i> Result Update</p>
            <div class="flex gap-4">
                <div class="flex-1">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select id="edit-status" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                        <option value="">Pending</option>
                        <option value="Pass" ${r.status === 'Pass' ? 'selected' : ''}>Pass</option>
                        <option value="Fail" ${r.status === 'Fail' ? 'selected' : ''}>Fail</option>
                    </select>
                </div>
                <div class="flex-1">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Result (Marks/%)</label>
                    <input type="text" id="edit-result" value="${r.result || ''}" placeholder="e.g. 78%" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                </div>
            </div>
        </div>
    `;

    document.getElementById('edit-enrollment-modal').classList.remove('hidden');
    window.updateDynamicFields(); 
    document.getElementById('save-edit-btn').onclick = () => window.saveEditRecord();
};

window.closeEditModal = () => {
    document.getElementById('edit-enrollment-modal').classList.add('hidden');
    _currentEditId = null;
    _currentEditRecord = null;
};

// ══════════════════════════════════════════════════
// DYNAMIC FIELDS RENDERER (Original Dropdowns k sath)
// ══════════════════════════════════════════════════
window.updateDynamicFields = () => {
    const type = document.getElementById('edit-admtype').value;
    const container = document.getElementById('dynamic-fields-container');
    const r = _currentEditRecord || {};
    const isSameType = r.admissionType === type;

    let html = '';
    const makeOpts = (opts, sel) => opts.map(o => `<option value="${o}" ${sel===o?'selected':''}>${o}</option>`).join('');

    if (type === 'NIOS') {
        html = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label class="text-xs font-bold text-slate-500 mb-1">Class</label>
                    <select id="dyn-classLevel" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                        <option value="">— Select —</option>
                        ${makeOpts(['8th','10th','12th'], isSameType ? r.classLevel : '')}
                    </select>
                </div>
                <div><label class="text-xs font-bold text-slate-500 mb-1">Languages (Comma , se alag karein)</label><input type="text" id="dyn-langs" value="${isSameType ? (r.languages||[]).join(', ') : ''}" placeholder="Urdu, English..." class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"></div>
                <div><label class="text-xs font-bold text-slate-500 mb-1">Subjects (Comma , se alag karein)</label><input type="text" id="dyn-subs" value="${isSameType ? (r.subjects||[]).join(', ') : ''}" placeholder="Maths, Science..." class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"></div>
            </div>`;
        container.innerHTML = html;
    } else if (type === 'School') {
        html = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label class="text-xs font-bold text-slate-500 mb-1">Class</label>
                    <select id="dyn-classLevel" onchange="window.refreshEditModalSubFields()" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                        <option value="">— Select —</option>
                        ${makeOpts(['5th','6th','7th','8th','9th','10th','11th','12th'], isSameType ? r.classLevel : '')}
                    </select>
                </div>
                <div id="dyn-board-container"></div>
                <div id="dyn-stream-container"></div>
            </div>`;
        container.innerHTML = html;
        window.refreshEditModalSubFields();
    } else if (type === 'Madrasa Board') {
        html = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="text-xs font-bold text-slate-500 mb-1">Class</label>
                    <select id="dyn-classLevel" onchange="window.refreshEditModalSubFields()" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                        <option value="">— Select —</option>
                        ${makeOpts(['5th','6th','7th','8th','9th','10th','11th','12th'], isSameType ? r.classLevel : '')}
                    </select>
                </div>
                <div id="dyn-stream-container"></div>
            </div>`;
        container.innerHTML = html;
        window.refreshEditModalSubFields();
    } else if (type === 'College') {
        html = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label class="text-xs font-bold text-slate-500 mb-1">Degree</label>
                    <select id="dyn-degree" onchange="window.refreshEditModalSubFields()" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                        <option value="">— Select —</option>
                        <optgroup label="Under-Graduate">
                            ${makeOpts(['B.A.','B.Com','B.Sc.'], isSameType ? r.degree : '')}
                        </optgroup>
                        <optgroup label="Post-Graduate">
                            ${makeOpts(['M.A.','M.Com','M.Sc.'], isSameType ? r.degree : '')}
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 mb-1">Duration System</label>
                    <select id="dyn-duration" onchange="window.refreshEditModalSubFields()" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                        <option value="">— Select —</option>
                        ${makeOpts(['Semester','Year'], isSameType ? r.duration : '')}
                    </select>
                </div>
                <div id="dyn-session-container"></div>
            </div>`;
        container.innerHTML = html;
        window.refreshEditModalSubFields();
    } else if (type === 'No Admission') {
        html = `<div><label class="text-xs font-bold text-slate-500 mb-1">Wazahat / Reason</label><textarea id="dyn-reason" rows="2" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">${isSameType ? (r.reason||'') : ''}</textarea></div>`;
        container.innerHTML = html;
    }
};

window.refreshEditModalSubFields = () => {
    const type = document.getElementById('edit-admtype').value;
    const r = _currentEditRecord || {};
    const isSameType = r.admissionType === type;
    const makeOpts = (opts, sel) => opts.map(o => `<option value="${o}" ${sel===o?'selected':''}>${o}</option>`).join('');

    if (type === 'School') {
        const cls = document.getElementById('dyn-classLevel').value;
        const bCont = document.getElementById('dyn-board-container');
        const sCont = document.getElementById('dyn-stream-container');
        let bHtml = '', sHtml = '';

        if (cls === '8th') bHtml = `<label class="text-xs font-bold text-slate-500 mb-1">Board</label><select id="dyn-board" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="">— Select —</option>${makeOpts(['State Board','Non Board'], isSameType?r.board:'')}</select>`;
        else if (cls === '10th') bHtml = `<label class="text-xs font-bold text-slate-500 mb-1">Board</label><select id="dyn-board" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="">— Select —</option>${makeOpts(['State Board','Open State Board','CBSE'], isSameType?r.board:'')}</select>`;
        else if (cls === '11th') sHtml = `<label class="text-xs font-bold text-slate-500 mb-1">Stream</label><select id="dyn-stream" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="">— Select —</option>${makeOpts(['Arts','Commerce','Science'], isSameType?r.stream:'')}</select>`;
        else if (cls === '12th') {
            bHtml = `<label class="text-xs font-bold text-slate-500 mb-1">Board</label><select id="dyn-board" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="">— Select —</option>${makeOpts(['State Board','Open State Board'], isSameType?r.board:'')}</select>`;
            sHtml = `<label class="text-xs font-bold text-slate-500 mb-1">Stream</label><select id="dyn-stream" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="">— Select —</option>${makeOpts(['Arts','Commerce','Science'], isSameType?r.stream:'')}</select>`;
        }
        bCont.innerHTML = bHtml; sCont.innerHTML = sHtml;
    }
    else if (type === 'Madrasa Board') {
        const cls = document.getElementById('dyn-classLevel').value;
        const sCont = document.getElementById('dyn-stream-container');
        if (cls === '11th' || cls === '12th') {
            sCont.innerHTML = `<label class="text-xs font-bold text-slate-500 mb-1">Stream</label><select id="dyn-stream" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="">— Select —</option>${makeOpts(['Arts','Commerce','Science'], isSameType?r.stream:'')}</select>`;
        } else {
            sCont.innerHTML = '';
        }
    }
    else if (type === 'College') {
        const deg = document.getElementById('dyn-degree').value;
        const dur = document.getElementById('dyn-duration').value;
        const sCont = document.getElementById('dyn-session-container');
        const opts = {
            'UG_Semester': ['1st Semester','2nd Semester','3rd Semester','4th Semester','5th Semester','6th Semester'],
            'UG_Year': ['1st Year','2nd Year','3rd Year'],
            'PG_Semester': ['1st Semester','2nd Semester','3rd Semester','4th Semester'],
            'PG_Year': ['1st Year','2nd Year']
        };
        if(deg && dur) {
            const key = (['B.A.','B.Com','B.Sc.'].includes(deg) ? 'UG' : 'PG') + '_' + dur;
            sCont.innerHTML = `<label class="text-xs font-bold text-slate-500 mb-1">Session</label><select id="dyn-session" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"><option value="">— Select —</option>${makeOpts(opts[key]||[], isSameType?r.session:'')}</select>`;
        } else {
            sCont.innerHTML = '';
        }
    }
};

// ══════════════════════════════════════════════════
// SAVE EDIT LOGIC 
// ══════════════════════════════════════════════════
window.saveEditRecord = async () => {
    if(!_currentEditId) return;
    
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : null;
    const admType = document.getElementById('edit-admtype').value;

    const updatedData = {
        studentName: getVal('edit-name'),
        fatherName: getVal('edit-father'),
        dob: getVal('edit-dob'),
        jmClass: getVal('edit-jmclass'),
        currentQualification: getVal('edit-qual'),
        admissionType: admType,
        status: getVal('edit-status'),
        result: getVal('edit-result')
    };

    if(!updatedData.studentName || !updatedData.fatherName) {
        alert("Student aur Father ka naam zaruri hai."); return;
    }

    if (admType === 'NIOS') {
        updatedData.classLevel = getVal('dyn-classLevel') || '';
        updatedData.languages = (getVal('dyn-langs') || '').split(',').map(s=>s.trim()).filter(Boolean);
        updatedData.subjects = (getVal('dyn-subs') || '').split(',').map(s=>s.trim()).filter(Boolean);
    } else if (admType === 'School') {
        updatedData.classLevel = getVal('dyn-classLevel') || '';
        updatedData.board = getVal('dyn-board') || '';
        updatedData.stream = getVal('dyn-stream') || '';
    } else if (admType === 'Madrasa Board') {
        updatedData.classLevel = getVal('dyn-classLevel') || '';
        updatedData.stream = getVal('dyn-stream') || '';
    } else if (admType === 'College') {
        updatedData.degree = getVal('dyn-degree') || '';
        updatedData.classLevel = updatedData.degree; 
        updatedData.duration = getVal('dyn-duration') || '';
        updatedData.session = getVal('dyn-session') || '';
    } else if (admType === 'No Admission') {
        updatedData.reason = getVal('dyn-reason') || '';
    }

    const saveBtn = document.getElementById('save-edit-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        await updateDoc(doc(_db, "enrollment_records", _currentEditId), updatedData);
        
        const index = _allRecords.findIndex(r => r.id === _currentEditId);
        if(index !== -1) {
            _allRecords[index] = { ..._allRecords[index], ...updatedData };
        }
        
        window.closeEditModal();
        window.applyEnrollmentFilters(); 
        alert("Record successfully update ho gaya!");

    } catch (error) {
        alert("Update error: " + error.message);
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
};

import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Global variables taake filtering aur editing asaan ho
let _db, _assignedJamiaat, _currentUser;
let _allRecords = []; 

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
            snap.forEach(doc => { _allRecords.push({ id: doc.id, ...doc.data() }); });
        }

        if (_allRecords.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-slate-400 font-medium">Abhi tak kisi Jamia ka koi student data submit nahi hua.</div>';
            return;
        }

        // Filter options ke liye unique values nikalna
        const uniqueJamias = [...new Set(_allRecords.map(r => r.jamiaName).filter(Boolean))].sort();
        const uniqueClasses = [...new Set(_allRecords.map(r => r.jmClass).filter(Boolean))].sort();
        const uniqueAdmissions = [...new Set(_allRecords.map(r => r.admissionType).filter(Boolean))].sort();

        let html = `
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

        <div id="edit-enrollment-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] hidden flex justify-center items-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 class="font-bold text-slate-800 text-lg"><i class="fas fa-user-edit text-indigo-600 mr-2"></i> Edit Student Record</h3>
                    <button onclick="window.closeEditModal()" class="text-slate-400 hover:text-red-500 transition"><i class="fas fa-times text-lg"></i></button>
                </div>
                <div class="p-4 overflow-y-auto" id="edit-modal-body">
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
                    : r.admissionType === 'College' ? `${r.degree||''} | ${r.duration||''}`
                    : r.admissionType === 'Madrasa Board' ? `Class: ${r.classLevel||''}`
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
                <td class="p-3 text-slate-500 text-xs truncate max-w-[150px]" title="${details}">${details}</td>
                <td class="p-3 text-center">${statusBadge}</td>
                <td class="p-3 text-center">
                    <button onclick="window.openEditModal('${r.id}')" class="text-amber-500 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 p-1.5 rounded mr-1 transition" title="Edit"><i class="fas fa-edit"></i></button>
                    <button onclick="window.deleteEnrollmentRecord('${r.id}', '${r.studentName}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition" title="Delete"><i class="fas fa-trash-alt"></i></button>
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
// DELETE LOGIC
// ══════════════════════════════════════════════════
window.deleteEnrollmentRecord = async (docId, name) => {
    if(!confirm(`Kya aap waqai "${name}" ki entry delete karna chahte hain?`)) return;
    try {
        await deleteDoc(doc(_db, "enrollment_records", docId));
        _allRecords = _allRecords.filter(r => r.id !== docId); // Local list se hatayein
        window.applyEnrollmentFilters(); // Table refresh
        alert("Entry successfully delete ho gayi.");
    } catch (error) {
        alert("Delete error: " + error.message);
    }
};

// ══════════════════════════════════════════════════
// EDIT MODAL LOGIC (Pura Form)
// ══════════════════════════════════════════════════
let _currentEditId = null;

window.openEditModal = (docId) => {
    const record = _allRecords.find(r => r.id === docId);
    if(!record) return;
    _currentEditId = docId;

    const modalBody = document.getElementById('edit-modal-body');
    
    modalBody.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Student's Name</label>
                <input type="text" id="edit-name" value="${record.studentName || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Father's Name</label>
                <input type="text" id="edit-father" value="${record.fatherName || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Date of Birth</label>
                <input type="date" id="edit-dob" value="${record.dob || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Jamiatul Madina Class</label>
                <input type="text" id="edit-jmclass" value="${record.jmClass || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
        </div>

        <hr class="border-slate-200 my-4">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Admission Type</label>
                <select id="edit-admtype" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="NIOS" ${record.admissionType === 'NIOS' ? 'selected' : ''}>NIOS</option>
                    <option value="School" ${record.admissionType === 'School' ? 'selected' : ''}>School</option>
                    <option value="Madrasa Board" ${record.admissionType === 'Madrasa Board' ? 'selected' : ''}>Madrasa Board</option>
                    <option value="College" ${record.admissionType === 'College' ? 'selected' : ''}>College</option>
                    <option value="No Admission" ${record.admissionType === 'No Admission' ? 'selected' : ''}>No Admission</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Current Qualification</label>
                <input type="text" id="edit-qual" value="${record.currentQualification || ''}" placeholder="e.g. 8th, 10th" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
        </div>

        <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4">
            <p class="text-xs text-indigo-700 font-semibold mb-2"><i class="fas fa-info-circle mr-1"></i> Status & Result</p>
            <div class="flex gap-4">
                <div class="flex-1">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select id="edit-status" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                        <option value="">Pending</option>
                        <option value="Pass" ${record.status === 'Pass' ? 'selected' : ''}>Pass</option>
                        <option value="Fail" ${record.status === 'Fail' ? 'selected' : ''}>Fail</option>
                    </select>
                </div>
                <div class="flex-1">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Result (Marks/%)</label>
                    <input type="text" id="edit-result" value="${record.result || ''}" placeholder="e.g. 78%" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                </div>
            </div>
        </div>
    `;

    document.getElementById('edit-enrollment-modal').classList.remove('hidden');
    
    // Save button click event override taake purana event na chale
    document.getElementById('save-edit-btn').onclick = () => window.saveEditRecord();
};

window.closeEditModal = () => {
    document.getElementById('edit-enrollment-modal').classList.add('hidden');
    _currentEditId = null;
};

window.saveEditRecord = async () => {
    if(!_currentEditId) return;
    
    const updatedData = {
        studentName: document.getElementById('edit-name').value.trim(),
        fatherName: document.getElementById('edit-father').value.trim(),
        dob: document.getElementById('edit-dob').value,
        jmClass: document.getElementById('edit-jmclass').value.trim(),
        admissionType: document.getElementById('edit-admtype').value,
        currentQualification: document.getElementById('edit-qual').value.trim(),
        status: document.getElementById('edit-status').value,
        result: document.getElementById('edit-result').value.trim()
    };

    if(!updatedData.studentName || !updatedData.fatherName) {
        alert("Student aur Father ka naam zaruri hai.");
        return;
    }

    const saveBtn = document.getElementById('save-edit-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        await updateDoc(doc(_db, "enrollment_records", _currentEditId), updatedData);
        
        // Local array ko update karna bina refresh kiye
        const index = _allRecords.findIndex(r => r.id === _currentEditId);
        if(index !== -1) {
            _allRecords[index] = { ..._allRecords[index], ...updatedData };
        }
        
        window.closeEditModal();
        window.applyEnrollmentFilters(); // List automatically nayi values k sath show hogi
        alert("Record successfully update ho gaya!");

    } catch (error) {
        alert("Update error: " + error.message);
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
};

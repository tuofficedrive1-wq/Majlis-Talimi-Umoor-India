/**
 * Monthly Performance Module - Structure Tab (Firestore Enabled)
 */

import { 
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const renderPerformanceTab = (assignedJamiaat, currentUser, db) => {
    const container = document.getElementById('performance-jamia-list');
    container.innerHTML = `
        <div class="mb-6">
            <div class="flex border-b border-slate-200 gap-4 overflow-x-auto">
                <button class="sub-tab-btn active border-b-2 border-indigo-600 px-4 py-2 text-sm font-bold text-indigo-600" data-sub="performance">Performance</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500" data-sub="summary">Summary</button>
                <button class="sub-tab-btn px-4 py-2 text-sm font-bold text-slate-500" data-sub="structure">Structure</button>
            </div>
        </div>
        <div id="sub-tab-content"></div>
    `;

    const subTabBtns = container.querySelectorAll('.sub-tab-btn');
    subTabBtns.forEach(btn => {
        btn.onclick = () => {
            subTabBtns.forEach(b => {
                b.classList.remove('active', 'border-b-2', 'border-indigo-600', 'text-indigo-600');
                b.classList.add('text-slate-500');
            });
            btn.classList.add('active', 'border-b-2', 'border-indigo-600', 'text-indigo-600');
            renderSubTabContent(btn.dataset.sub, assignedJamiaat, currentUser, db);
        };
    });

    renderSubTabContent('performance', assignedJamiaat, currentUser, db);
};

const renderSubTabContent = async (tabName, assignedJamiaat, currentUser, db) => {
    const contentArea = document.getElementById('sub-tab-content');
    
    if (tabName === 'structure') {
        contentArea.innerHTML = `
            <div id="structure-accordion" class="space-y-4">
                ${assignedJamiaat.map(jamia => `
                    <div class="border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm" data-jamia="${jamia}">
                        <button class="jamia-toggle w-full flex justify-between items-center p-5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 transition-all">
                            <span>${jamia}</span>
                            <i class="fas fa-chevron-down transition-transform"></i>
                        </button>
                        <div class="jamia-content hidden p-6 border-t border-slate-100">
                            <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 mb-6">
                                <h4 class="text-sm font-bold text-indigo-600 uppercase mb-4 flex items-center gap-2">
                                    <i class="fas fa-user-plus"></i> Register New Teacher
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" id="name-${jamia.replace(/\s+/g, '')}" placeholder="Name Of Teacher" class="p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <input type="text" id="ajeer-${jamia.replace(/\s+/g, '')}" placeholder="Ajeer Code (Login Code)" class="p-2.5 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" maxlength="6">
                                    <input type="text" id="contact-${jamia.replace(/\s+/g, '')}" placeholder="Contact No." class="p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                </div>
                                <button class="save-teacher-btn w-full mt-4 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all" data-jamia-name="${jamia}">
                                    Save Teacher Profile
                                </button>
                            </div>
                            <div class="teacher-list-area space-y-4" id="list-${jamia.replace(/\s+/g, '')}">
                                <p class="text-center text-slate-400 text-xs py-4">Loading Teachers...</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        setupStructureEvents(contentArea, db, currentUser);
        loadAllTeachers(assignedJamiaat, db, currentUser);
    } else {
        contentArea.innerHTML = `<p class="p-10 text-center text-slate-400">Loading ${tabName.toUpperCase()} section...</p>`;
    }
};

const setupStructureEvents = (container, db, currentUser) => {
    container.querySelectorAll('.jamia-toggle').forEach(btn => {
        btn.onclick = () => {
            const content = btn.nextElementSibling;
            btn.querySelector('i').classList.toggle('rotate-180');
            content.classList.toggle('hidden');
        };
    });

    container.querySelectorAll('.save-teacher-btn').forEach(btn => {
        btn.onclick = async () => {
            const jamiaName = btn.dataset.jamiaName;
            const safeId = jamiaName.replace(/\s+/g, '');
            const name = document.getElementById(`name-${safeId}`).value.trim();
            const ajeerCode = document.getElementById(`ajeer-${safeId}`).value.trim();
            const contact = document.getElementById(`contact-${safeId}`).value.trim();

            if (!name || !ajeerCode) {
                alert("Please fill Name and Ajeer Code.");
                return;
            }

            btn.disabled = true;
            btn.innerText = "Saving...";

            try {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                let academicYears = userSnap.data().academicYears || {};
                
                // Hum current active year (2025-2026) use karenge
                const activeYear = "2025-2026"; 
                if (!academicYears[activeYear]) academicYears[activeYear] = { karkardagiStructure: [] };
                
                let structure = academicYears[activeYear].karkardagiStructure;
                let jamiaData = structure.find(j => j.jamiaName === jamiaName);
                
                if (!jamiaData) {
                    jamiaData = { jamiaName: jamiaName, teachers: [] };
                    structure.push(jamiaData);
                }

                const newTeacher = {
                    id: `t-${Date.now()}`,
                    name: name,
                    loginCode: ajeerCode, // Merged
                    contact: contact,
                    periods: []
                };

                jamiaData.teachers.push(newTeacher);
                await updateDoc(userRef, { academicYears: academicYears });

                alert("Teacher Saved Successfully!");
                document.getElementById(`name-${safeId}`).value = "";
                document.getElementById(`ajeer-${safeId}`).value = "";
                loadAllTeachers([jamiaName], db, currentUser);
            } catch (e) {
                console.error(e);
                alert("Error saving: " + e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Save Teacher Profile";
            }
        };
    });
};

const loadAllTeachers = async (jamiaat, db, currentUser) => {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const academicYears = userSnap.data().academicYears || {};
    const activeYear = "2025-2026";
    const structure = academicYears[activeYear]?.karkardagiStructure || [];

    jamiaat.forEach(jamia => {
        const safeId = jamia.replace(/\s+/g, '');
        const listDiv = document.getElementById(`list-${safeId}`);
        const jamiaData = structure.find(j => j.jamiaName === jamia);

        if (!jamiaData || !jamiaData.teachers || jamiaData.teachers.length === 0) {
            listDiv.innerHTML = `<p class="text-center text-slate-400 text-xs py-4">No teachers registered yet.</p>`;
            return;
        }

        listDiv.innerHTML = jamiaData.teachers.map(t => `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center group hover:border-indigo-300 transition-all">
                <div>
                    <p class="font-bold text-slate-700">${t.name}</p>
                    <p class="text-[10px] text-slate-400 font-mono uppercase">Code: ${t.loginCode}</p>
                </div>
                <button class="text-indigo-600 hover:text-indigo-800"><i class="fas fa-edit"></i></button>
            </div>
        `).join('');
    });
};

import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export async function renderRecordingTab(assignedJamiaat, currentUser, db) {
    const container = document.getElementById('tab-recording');
    const monthInput = document.getElementById('report-month').value;

    if (!assignedJamiaat || assignedJamiaat.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-500 font-bold">Koi Jamia assign nahi kiya gaya hai.</div>`;
        return;
    }

    // 1. Sub-tabs aur Layout Setup
    container.innerHTML = `
        <div class="flex items-center gap-8 border-b border-slate-100 mb-6 px-2">
            <button class="rec-sub-tab-btn active group flex items-center gap-2 pb-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600 transition-all" data-sub="jamia-list">
                <i class="fas fa-mosque text-xs"></i>
                <span>Jamiaat List & Links</span>
            </button>
            <button class="rec-sub-tab-btn group flex items-center gap-2 pb-3 text-sm font-bold text-slate-400 hover:text-blue-500 transition-all" data-sub="saved-recordings">
                <i class="fas fa-microphone-alt text-xs"></i>
                <span>Saved Recordings</span>
            </button>
        </div>

        <div id="rec-sub-jamia-list" class="rec-sub-tab-content block">
            <div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i><p class="text-slate-500 mt-2">Data load ho raha hai...</p></div>
        </div>

        <div id="rec-sub-saved-recordings" class="rec-sub-tab-content hidden">
             <div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i><p class="text-slate-500 mt-2">Data load ho raha hai...</p></div>
        </div>
    `;

    // 2. Sub-tab Switching Logic
    document.querySelectorAll('.rec-sub-tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.rec-sub-tab-btn').forEach(b => {
                b.classList.remove('text-blue-600', 'border-blue-600', 'active');
                b.classList.add('text-slate-400', 'border-transparent');
            });
            btn.classList.add('text-blue-600', 'border-blue-600', 'active');
            btn.classList.remove('text-slate-400', 'border-transparent');

            const target = btn.dataset.sub;
            document.getElementById('rec-sub-jamia-list').classList.toggle('hidden', target !== 'jamia-list');
            document.getElementById('rec-sub-jamia-list').classList.toggle('block', target === 'jamia-list');
            document.getElementById('rec-sub-saved-recordings').classList.toggle('hidden', target !== 'saved-recordings');
            document.getElementById('rec-sub-saved-recordings').classList.toggle('block', target === 'saved-recordings');
        };
    });

    // 3. Database se Recordings Fetch Karna
    await loadRecordingData(assignedJamiaat, currentUser, db, monthInput);
}

async function loadRecordingData(assignedJamiaat, currentUser, db, monthInput) {
    const listContainer = document.getElementById('rec-sub-jamia-list');
    const savedContainer = document.getElementById('rec-sub-saved-recordings');

    try {
        // Month formatting logic
        const [yearStr, monthStr] = monthInput.split("-");
        const monthNum = parseInt(monthStr) - 1;
        const yearNum = parseInt(yearStr);
        const academicYear = monthNum >= 3 ? `${yearNum}-${yearNum + 1}` : `${yearNum - 1}-${yearNum}`;
        const reportId = `${currentUser.uid}_${academicYear}_${yearNum}_${monthNum}`;
        const simpleId = `${currentUser.uid}_${yearNum}_${monthNum}`;

        // Fetching report from Firestore
        const reportsRef = collection(db, "monthly_reports");
        const qReports = query(reportsRef, where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(qReports);
        
        let allRecordings = [];
        snapshot.forEach(doc => {
            if(doc.id === reportId || doc.id === simpleId) {
                const data = doc.data();
                if(data.tadrisRecording && Array.isArray(data.tadrisRecording.data)) {
                    allRecordings = allRecordings.concat(data.tadrisRecording.data);
                }
            }
        });

        // ============================================
        // RENDER JAMIA LIST & LINKS
        // ============================================
        let listHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
        
        assignedJamiaat.forEach(jamia => {
            // Calculate total recordings for this specific jamia
            const jamiaRecs = allRecordings.filter(r => r.jamiaName === jamia);
            const count = jamiaRecs.length;
            
            // Link generation
            const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
            const portalLink = `${baseUrl}/tadris-teacher-portal.html?jamiaId=${encodeURIComponent(jamia)}&userId=${currentUser.uid}&activeYear=${encodeURIComponent(academicYear)}`;

            listHTML += `
            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-all">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-bold text-slate-800 text-base urdu-font leading-tight">${jamia}</h4>
                    <span class="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                        <i class="fas fa-file-audio mr-1"></i> ${count} Saved
                    </span>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <button onclick="navigator.clipboard.writeText('${portalLink}').then(() => alert('Link Copy Ho Gaya!'))" 
                            class="w-full bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 py-2 rounded-xl text-xs font-bold transition flex justify-center items-center gap-2">
                        <i class="fas fa-link"></i> Copy Portal Link
                    </button>
                </div>
            </div>`;
        });
        listHTML += `</div>`;
        listContainer.innerHTML = listHTML;

        // ============================================
        // RENDER SAVED RECORDINGS TABLE
        // ============================================
        if (allRecordings.length === 0) {
            savedContainer.innerHTML = `<div class="p-10 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">Is mahine ki koi recording maujood nahi hai.</div>`;
        } else {
            let tableHTML = `
            <div class="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                            <th class="p-4 font-bold">Jamia</th>
                            <th class="p-4 font-bold">Teacher / Class</th>
                            <th class="p-4 font-bold">Date</th>
                            <th class="p-4 font-bold text-center">Audio</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-slate-100 text-slate-700">
            `;

            allRecordings.forEach(rec => {
                const audioBtn = rec.url 
                    ? `<a href="${rec.url}" target="_blank" class="text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto w-max"><i class="fas fa-play"></i> Play</a>` 
                    : `<span class="text-slate-400 text-xs italic">No Audio</span>`;

                tableHTML += `
                <tr class="hover:bg-slate-50/50 transition">
                    <td class="p-4 font-bold text-slate-800 urdu-font">${rec.jamiaName}</td>
                    <td class="p-4">
                        <div class="font-bold urdu-font text-blue-700">${rec.teacherName}</div>
                        <div class="text-xs text-slate-500 urdu-font mt-0.5">${rec.className} - ${rec.kitabName}</div>
                    </td>
                    <td class="p-4 text-xs font-medium text-slate-500">${rec.date}</td>
                    <td class="p-4">${audioBtn}</td>
                </tr>`;
            });

            tableHTML += `</tbody></table></div>`;
            savedContainer.innerHTML = tableHTML;
        }

    } catch (error) {
        console.error("Error loading recordings:", error);
        listContainer.innerHTML = `<div class="text-red-500 font-bold p-4">Data fetch karne me error aaya: ${error.message}</div>`;
        savedContainer.innerHTML = `<div class="text-red-500 font-bold p-4">Data fetch karne me error aaya.</div>`;
    }
}
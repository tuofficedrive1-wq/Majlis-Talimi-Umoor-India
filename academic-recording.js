import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export async function renderRecordingTab(assignedJamiaat, currentUser, db) {
    const container = document.getElementById('tab-recording');
    const monthInput = document.getElementById('report-month').value;

    // FIX: HTML mein jo purani badi padding (p-10) lagi thi, usey yahan se clear kar rahe hain 
    // taaki mobile par full width use ho aur space waste na ho.
    container.className = 'tab-content w-full';

    if (!assignedJamiaat || assignedJamiaat.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500 font-bold text-sm">Koi Jamia assign nahi kiya gaya hai.</div>`;
        return;
    }

    // 1. Title, Sub-tabs aur Layout Setup (Flat & Mobile Optimized)
    container.innerHTML = `
        <!-- NAYA TITLE YAHAN ADD KIYA GAYA HAI -->
        <div class="mb-4">
            <h3 class="text-base md:text-lg font-black text-slate-800 leading-tight">Tadris Recordings</h3>
            <p class="text-[10px] md:text-xs text-slate-500 mt-0.5 font-medium">Asatiza ki audio recordings aur mufattish ke tabsire</p>
        </div>

        <div class="flex items-center gap-3 border-b border-slate-200 mb-4 overflow-x-auto no-scrollbar whitespace-nowrap w-full">
            <button class="rec-sub-tab-btn active group flex items-center gap-1.5 pb-2 text-xs md:text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition-all shrink-0" data-sub="jamia-list">
                <i class="fas fa-mosque"></i>
                <span>Jamiaat List</span>
            </button>
            <button class="rec-sub-tab-btn group flex items-center gap-1.5 pb-2 text-xs md:text-sm font-bold text-slate-400 hover:text-indigo-500 border-b-2 border-transparent transition-all shrink-0" data-sub="saved-recordings">
                <i class="fas fa-microphone-alt"></i>
                <span>Recordings</span>
            </button>
        </div>

        <div id="rec-sub-jamia-list" class="rec-sub-tab-content block w-full">
            <div class="text-center py-6"><i class="fas fa-spinner fa-spin text-xl text-indigo-500"></i><p class="text-slate-500 text-xs mt-1">Load ho raha hai...</p></div>
        </div>

        <div id="rec-sub-saved-recordings" class="rec-sub-tab-content hidden w-full">
             <div class="text-center py-6"><i class="fas fa-spinner fa-spin text-xl text-indigo-500"></i><p class="text-slate-500 text-xs mt-1">Load ho raha hai...</p></div>
        </div>
    `;

    // 2. Sub-tab Switching Logic
    document.querySelectorAll('.rec-sub-tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.rec-sub-tab-btn').forEach(b => {
                b.classList.remove('text-indigo-600', 'border-indigo-600', 'active');
                b.classList.add('text-slate-400', 'border-transparent');
            });
            btn.classList.add('text-indigo-600', 'border-indigo-600', 'active');
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
        const [yearStr, monthStr] = monthInput.split("-");
        const monthNum = parseInt(monthStr) - 1;
        const yearNum = parseInt(yearStr);
        const academicYear = monthNum >= 3 ? `${yearNum}-${yearNum + 1}` : `${yearNum - 1}-${yearNum}`;
        const reportId = `${currentUser.uid}_${academicYear}_${yearNum}_${monthNum}`;
        const simpleId = `${currentUser.uid}_${yearNum}_${monthNum}`;

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
        // RENDER JAMIA LIST & LINKS (Compact Grid)
        // ============================================
        let listHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">`;
        
        assignedJamiaat.forEach(jamia => {
            const jamiaRecs = allRecordings.filter(r => r.jamiaName === jamia);
            const count = jamiaRecs.length;
            
            const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
            const portalLink = `${baseUrl}/tadris-teacher-portal.html?jamiaId=${encodeURIComponent(jamia)}&userId=${currentUser.uid}&activeYear=${encodeURIComponent(academicYear)}&lang=en`;

            listHTML += `
            <div class="border border-slate-200 rounded-xl p-3 hover:border-indigo-300 bg-white shadow-sm flex flex-col gap-2 transition-all">
                <div class="flex justify-between items-center">
                    <h4 class="font-bold text-slate-800 text-xs md:text-sm urdu-font leading-tight truncate pr-2 w-3/4">${jamia}</h4>
                    <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                        <i class="fas fa-file-audio mr-1"></i> ${count}
                    </span>
                </div>
                <button onclick="navigator.clipboard.writeText('${portalLink}').then(() => alert('Link Copy Ho Gaya!'))" 
                        class="w-full bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 py-1.5 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5">
                    <i class="fas fa-link"></i> Copy Link
                </button>
            </div>`;
        });
        listHTML += `</div>`;
        listContainer.innerHTML = listHTML;

        // ============================================
        // RENDER SAVED RECORDINGS TABLE (Mobile Optimized)
        // ============================================
        if (allRecordings.length === 0) {
            savedContainer.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">Is mahine ki koi recording maujood nahi hai.</div>`;
        } else {
            let tableHTML = `
            <div class="overflow-x-auto no-scrollbar rounded-xl border border-slate-200 bg-white shadow-sm w-full">
                <table class="w-full text-left whitespace-nowrap">
                    <thead>
                        <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase font-black border-b border-slate-200">
                            <th class="p-2 border-r border-slate-100">Jamia</th>
                            <th class="p-2 border-r border-slate-100">Details (Teacher/Class)</th>
                            <th class="p-2 border-r border-slate-100 text-center">Audio</th>
                            <th class="p-2">Comment</th>
                        </tr>
                    </thead>
                    <tbody class="text-[10px] md:text-[11px] divide-y divide-slate-100 text-slate-700">
            `;

            allRecordings.forEach(rec => {
                const audioBtn = rec.url 
                    ? `<a href="${rec.url}" target="_blank" class="text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 mx-auto w-max"><i class="fas fa-play"></i> Play</a>` 
                    : `<span class="text-slate-400 text-[9px] italic">N/A</span>`;

                const commentText = rec.mufattishComment || rec.comment;
                const commentUI = commentText 
                    ? `<div class="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 whitespace-normal min-w-[120px] urdu-font leading-relaxed">${commentText}</div>`
                    : `<span class="text-slate-400 text-[9px] italic">N/A</span>`;

                tableHTML += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-2 border-r border-slate-100 font-bold text-slate-800 urdu-font whitespace-normal min-w-[80px] align-top">${rec.jamiaName}</td>
                    
                    <td class="p-2 border-r border-slate-100 align-top whitespace-normal min-w-[120px]">
                        <div class="font-bold text-indigo-700 urdu-font leading-tight">${rec.teacherName}</div>
                        <div class="text-[9px] text-slate-500 mt-0.5">${rec.className} • ${rec.kitabName}</div>
                        <div class="text-[8px] text-slate-400 mt-1 font-medium bg-slate-100 px-1 py-0.5 rounded w-fit"><i class="far fa-calendar-alt"></i> ${rec.date}</div>
                    </td>
                    
                    <td class="p-2 border-r border-slate-100 align-top text-center">${audioBtn}</td>
                    <td class="p-2 align-top whitespace-normal">${commentUI}</td>
                </tr>`;
            });

            tableHTML += `</tbody></table></div>`;
            savedContainer.innerHTML = tableHTML;
        }

    } catch (error) {
        console.error("Error loading recordings:", error);
        listContainer.innerHTML = `<div class="text-red-500 text-xs p-3">Data fetch error: ${error.message}</div>`;
        savedContainer.innerHTML = `<div class="text-red-500 text-xs p-3">Data fetch error.</div>`;
    }
}

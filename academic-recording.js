import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Global array filtering ke liye
let allFetchedRecordings = [];

export async function renderRecordingTab(assignedJamiaat, currentUser, db) {
    const container = document.getElementById('tab-recording');
    const monthInput = document.getElementById('report-month').value;

    container.className = 'tab-content w-full';

    if (!assignedJamiaat || assignedJamiaat.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500 font-bold text-sm">Koi Jamia assign nahi kiya gaya hai.</div>`;
        return;
    }

    // 1. Title aur Sub-tabs Setup
    container.innerHTML = `
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
                <span>Saved Recordings</span>
            </button>
        </div>

        <div id="rec-sub-jamia-list" class="rec-sub-tab-content block w-full">
            <div class="text-center py-6"><i class="fas fa-spinner fa-spin text-xl text-indigo-500"></i><p class="text-slate-500 text-xs mt-1">Load ho raha hai...</p></div>
        </div>

        <div id="rec-sub-saved-recordings" class="rec-sub-tab-content hidden w-full">
             <div class="text-center py-6"><i class="fas fa-spinner fa-spin text-xl text-indigo-500"></i><p class="text-slate-500 text-xs mt-1">Load ho raha hai...</p></div>
        </div>
    `;

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
        
        allFetchedRecordings = [];
        snapshot.forEach(doc => {
            if(doc.id === reportId || doc.id === simpleId) {
                const data = doc.data();
                if(data.tadrisRecording && Array.isArray(data.tadrisRecording.data)) {
                    allFetchedRecordings = allFetchedRecordings.concat(data.tadrisRecording.data);
                }
            }
        });

        // ============================================
        // RENDER JAMIA LIST
        // ============================================
        let listHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">`;
        assignedJamiaat.forEach(jamia => {
            const jamiaRecs = allFetchedRecordings.filter(r => r.jamiaName === jamia);
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
        // RENDER SAVED RECORDINGS + FILTERS
        // ============================================
        let savedHTML = `
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Jamia</label>
                        <select id="rec-filter-jamia" class="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-indigo-500">
                            <option value="">Sab Jamiaat</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teacher Name</label>
                        <input type="text" id="rec-filter-teacher" placeholder="Search teacher..." class="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-indigo-500">
                    </div>
                    <div class="flex gap-2">
                        <div class="w-1/2">
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date From</label>
                            <input type="date" id="rec-filter-date-from" class="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-indigo-500">
                        </div>
                        <div class="w-1/2">
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date To</label>
                            <input type="date" id="rec-filter-date-to" class="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-indigo-500">
                        </div>
                    </div>
                </div>
            </div>
            <div id="rec-filtered-table-container"></div>
        `;
        savedContainer.innerHTML = savedHTML;

        // Populate Jamia Dropdown
        const jamiaFilter = document.getElementById('rec-filter-jamia');
        const uniqueJamias = [...new Set(allFetchedRecordings.map(r => r.jamiaName))].sort();
        uniqueJamias.forEach(j => {
            if(j) jamiaFilter.innerHTML += `<option value="${j}">${j}</option>`;
        });

        // Event Listeners for Live Filtering
        ['rec-filter-jamia', 'rec-filter-teacher', 'rec-filter-date-from', 'rec-filter-date-to'].forEach(id => {
            document.getElementById(id).addEventListener('input', renderSavedTableUI);
            document.getElementById(id).addEventListener('change', renderSavedTableUI);
        });

        renderSavedTableUI(); // Initial Table Render

    } catch (error) {
        console.error("Error loading recordings:", error);
        listContainer.innerHTML = `<div class="text-red-500 text-xs p-3">Data fetch error: ${error.message}</div>`;
        savedContainer.innerHTML = `<div class="text-red-500 text-xs p-3">Data fetch error.</div>`;
    }
}

function renderSavedTableUI() {
    const tableContainer = document.getElementById('rec-filtered-table-container');
    
    const fJamia = document.getElementById('rec-filter-jamia').value;
    const fTeacher = document.getElementById('rec-filter-teacher').value.toLowerCase();
    const fDateFrom = document.getElementById('rec-filter-date-from').value;
    const fDateTo = document.getElementById('rec-filter-date-to').value;

    const filtered = allFetchedRecordings.filter(rec => {
        const matchJ = !fJamia || rec.jamiaName === fJamia;
        const matchT = !fTeacher || (rec.teacherName || "").toLowerCase().includes(fTeacher);
        let matchD = true;
        if (fDateFrom) matchD = matchD && (rec.date >= fDateFrom);
        if (fDateTo) matchD = matchD && (rec.date <= fDateTo);
        return matchJ && matchT && matchD;
    });

    if (filtered.length === 0) {
        tableContainer.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">Koi recording nahi mili.</div>`;
        return;
    }

    let tableHTML = `
    <div class="overflow-x-auto no-scrollbar rounded-xl border border-slate-200 bg-white shadow-sm w-full">
        <table class="w-full text-left whitespace-nowrap">
            <thead>
                <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase font-black border-b border-slate-200">
                    <th class="p-2 border-r border-slate-100">Jamia</th>
                    <th class="p-2 border-r border-slate-100">Details (Teacher/Class)</th>
                    <th class="p-2 border-r border-slate-100 text-center">Audio</th>
                    <th class="p-2 border-r border-slate-100">Comment</th>
                    <th class="p-2 text-center">Action</th>
                </tr>
            </thead>
            <tbody class="text-[10px] md:text-[11px] divide-y divide-slate-100 text-slate-700">
    `;

    filtered.forEach(rec => {
        const audioBtn = rec.url 
            ? `<a href="${rec.url}" target="_blank" class="text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 mx-auto w-max"><i class="fas fa-play"></i> Play</a>` 
            : `<span class="text-slate-400 text-[9px] italic">N/A</span>`;

        const commentText = rec.mufattishComment || rec.comment;
        const commentUI = commentText 
            ? `<div class="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 whitespace-normal min-w-[120px] urdu-font leading-relaxed">${commentText}</div>`
            : `<span class="text-slate-400 text-[9px] italic">N/A</span>`;

        const zimmedarComment = rec.adminTasurat || "";

        tableHTML += `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-2 border-r border-slate-100 font-bold text-slate-800 urdu-font whitespace-normal min-w-[80px] align-top">${rec.jamiaName}</td>
            
            <td class="p-2 border-r border-slate-100 align-top whitespace-normal min-w-[120px]">
                <div class="font-bold text-indigo-700 urdu-font leading-tight">${rec.teacherName}</div>
                <div class="text-[9px] text-slate-500 mt-0.5">${rec.className} • ${rec.kitabName}</div>
                <div class="text-[8px] text-slate-400 mt-1 font-medium bg-slate-100 px-1 py-0.5 rounded w-fit"><i class="far fa-calendar-alt"></i> ${rec.date}</div>
            </td>
            
            <td class="p-2 border-r border-slate-100 align-top text-center">${audioBtn}</td>
            <td class="p-2 border-r border-slate-100 align-top whitespace-normal">${commentUI}</td>
            
            <td class="p-2 align-top text-center">
                <button type="button" 
                    onclick="downloadTadrisPDF('${encodeURIComponent(rec.jamiaName)}', '${encodeURIComponent(rec.teacherName)}', '${encodeURIComponent(rec.className)}', '${encodeURIComponent(rec.kitabName)}', '${rec.date}', '${encodeURIComponent(commentText || '')}', '${encodeURIComponent(zimmedarComment)}')"\n                    class="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 px-2 py-1 rounded text-[10px] transition font-bold shadow-sm mx-auto flex items-center justify-center gap-1">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
            </td>
        </tr>`;
    });

    tableHTML += `</tbody></table></div>`;
    tableContainer.innerHTML = tableHTML;
}

// ========================================================
// ENGLISH PDF GENERATOR (Attached to Window for Global Use)
// ========================================================
window.downloadTadrisPDF = async function(jamiaName, teacherName, className, kitabName, date, tasurat, zimmedarTasurat) {
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
        alert("JS-PDF aur HTML2Canvas load nahi hui. HTML file me script check karein.");
        return;
    }

    const loader = document.getElementById("loader");
    if(loader) loader.classList.remove("hidden");

    try {
        const safeJamia = decodeURIComponent(jamiaName);
        const safeTeacher = decodeURIComponent(teacherName);
        const safeClass = decodeURIComponent(className);
        const safeKitab = decodeURIComponent(kitabName);
        const safeTasurat = decodeURIComponent(tasurat) || "No comments recorded.";
        const safeZimmedar = decodeURIComponent(zimmedarTasurat) || "No comments recorded.";

        // English Formatted PDF Structure
        const pdfContentHTML = `
          <div style="font-family:'Poppins', Arial, sans-serif; background-color:#fff; color:#111; position:relative; direction:ltr;">
            <div id="pdf-container-div" style="padding:40px; width:794px; border:8px double #4f46e5; background-color:#fdfdfd; box-sizing: border-box; margin:0 auto;">
              
              <div style="text-align:center; border-bottom:3px solid #4338ca; padding-bottom:15px; margin-bottom:25px;">
                <h1 style="font-size:32px; font-weight:900; color:#4338ca; margin:0; line-height:1.2; text-transform:uppercase;">Majlis Talimi Umoor India</h1>
                <h2 style="font-size:22px; font-weight:700; color:#333; margin:5px 0 0 0;">Tadris Recording Report</h2>
              </div>

              <table style="width:100%; border-collapse:collapse; margin-bottom:30px; border:2px solid #ccc; font-size:16px;">
                <tr style="background-color:#eef2ff;">
                   <td style="padding:12px; border:1px solid #ccc; font-weight:bold; color:#4338ca; width:15%;">Jamia:</td>
                   <td style="padding:12px; border:1px solid #ccc; width:35%;">${safeJamia}</td>
                   <td style="padding:12px; border:1px solid #ccc; font-weight:bold; color:#4338ca; width:15%;">Date:</td>
                   <td style="padding:12px; border:1px solid #ccc; width:35%;">${date}</td>
                </tr>
                <tr>
                   <td style="padding:12px; border:1px solid #ccc; font-weight:bold; color:#4338ca;">Teacher:</td>
                   <td style="padding:12px; border:1px solid #ccc;">${safeTeacher}</td>
                   <td style="padding:12px; border:1px solid #ccc; font-weight:bold; color:#4338ca;">Subject:</td>
                   <td style="padding:12px; border:1px solid #ccc;">${safeClass} - ${safeKitab}</td>
                </tr>
              </table>

              <div style="margin-bottom:25px; border:2px solid #10b981; border-radius:12px; overflow:hidden; background-color:#fff;">
                 <div style="background-color:#ecfdf5; padding:10px 15px; border-bottom:1px solid #10b981;">
                    <span style="font-size:18px; font-weight:bold; color:#047857;">Inspector's Comments on Recording</span>
                 </div>
                 <div style="padding:20px; font-size:16px; line-height:1.8; color:#333; min-height:100px; text-align:justify;">
                    ${safeTasurat}
                 </div>
              </div>

              <div style="margin-bottom:40px; border:2px solid #3b82f6; border-radius:12px; overflow:hidden; background-color:#fff;">
                 <div style="background-color:#eff6ff; padding:10px 15px; border-bottom:1px solid #3b82f6;">
                    <span style="font-size:18px; font-weight:bold; color:#1d4ed8;">Admin's / Zimmedar's Comments</span>
                 </div>
                 <div style="padding:20px; font-size:16px; line-height:1.8; color:#333; min-height:100px; text-align:justify;">
                    ${safeZimmedar}
                 </div>
              </div>

              <div style="text-align:center; margin-top:50px; padding-top:20px; border-top:1px dashed #ccc; color:#666; font-size:12px;">
                This report is computer generated by Majlis Talimi Umoor Portal.
              </div>

            </div>
          </div>
        `;

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = pdfContentHTML;
        tempDiv.style.width = "794px"; 
        tempDiv.style.position = "fixed"; 
        tempDiv.style.left = "-9999px";
        tempDiv.style.top = "0";
        tempDiv.style.zIndex = "-1";
        document.body.appendChild(tempDiv);

        await new Promise(resolve => setTimeout(resolve, 500));

        const elementHeight = tempDiv.offsetHeight + 50; 

        const canvas = await window.html2canvas(tempDiv, { 
            scale: 2, 
            useCORS: true, 
            allowTaint: true,
            windowWidth: 794, 
            width: 794,
            height: elementHeight,
            windowHeight: elementHeight,
            scrollY: 0
        });
        
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const { jsPDF } = window.jspdf;
        const pdfWidth = 210; 
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        const docPdf = new jsPDF({ 
            orientation: "portrait", 
            unit: "mm", 
            format: [pdfWidth, pdfHeight]
        });
        
        docPdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

        const safeName = `${safeTeacher.replace(/\s+/g,'_')}_${date}`;
        docPdf.save(`Tadris_Report_${safeName}.pdf`);
        
        document.body.removeChild(tempDiv);

    } catch (err) {
        console.error("PDF Error:", err);
        alert("PDF banane me masla aya.");
    } finally {
        if(loader) loader.classList.add("hidden");
    }
};

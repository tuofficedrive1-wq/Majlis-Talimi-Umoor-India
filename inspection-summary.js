import { 
    getDocs, 
    collection, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export async function renderInspectionSummary(assignedJamiaat, db) {
    const container = document.getElementById('summary-container');
    container.innerHTML = `<div class="flex justify-center py-10"><div class="loader"></div></div>`; // Loading state

    try {
        // Firestore se saari inspections fetch karna
        const q = query(collection(db, "academic_inspections"));
        const querySnapshot = await getDocs(q);
        const allInspections = [];
        querySnapshot.forEach((doc) => {
            allInspections.push(doc.data());
        });

        if (allInspections.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 py-10">No records found.</p>`;
            return;
        }

        // Table ka structure
        let tableHtml = `
            <div class="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                            <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jamia Name</th>
                            <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classes</th>
                            <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                            <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
        `;

        allInspections.forEach(report => {
            // Check if this jamia is in assigned list
            if (assignedJamiaat.includes(report.jamiaName)) {
                const date = report.inspectionDate ? report.inspectionDate.toDate().toLocaleDateString() : 'N/A';
                const score = parseFloat(report.overallPercentage) || 0;
                const scoreClass = score >= 80 ? 'text-emerald-600 bg-emerald-50' : (score >= 50 ? 'text-indigo-600 bg-indigo-50' : 'text-red-600 bg-red-50');

                tableHtml += `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-4 font-bold text-slate-700">${report.jamiaName}</td>
                        <td class="p-4 text-sm text-slate-500">${date}</td>
                        <td class="p-4 text-sm text-slate-500">${report.totalClasses || 0} Classes</td>
                        <td class="p-4 text-center">
                            <span class="px-3 py-1 rounded-full text-xs font-black ${scoreClass}">${score}%</span>
                        </td>
                        <td class="p-4 text-right">
                            <button onclick="window.open('academic-inspection-form.html?jamia=${encodeURIComponent(report.jamiaName)}', '_blank')" 
                                    class="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase tracking-tight">
                                View Details <i class="fas fa-chevron-right ml-1"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
        });

        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;

    } catch (error) {
        console.error("Summary error:", error);
        container.innerHTML = `<p class="text-red-500 text-center py-10">Error loading data.</p>`;
    }
}
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export async function renderEnrollmentSummary(assignedJamiaat, db, currentUser) {
    const container = document.getElementById('enrollment-summary-container');
    
    if (!assignedJamiaat || assignedJamiaat.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400 font-medium">Koi Jamia assign nahi hai.</div>';
        return;
    }

    container.innerHTML = '<div class="p-8 text-center text-indigo-500 font-bold"><i class="fas fa-spinner fa-spin mr-2"></i> Data load ho raha hai...</div>';

    try {
        let allRecords = [];
        
        // Firestore 'in' query ki limit 30 hoti hai, isliye chunks me fetch karenge
        for (let i = 0; i < assignedJamiaat.length; i += 30) {
            const chunk = assignedJamiaat.slice(i, i + 30);
            const q = query(
                collection(db, "enrollment_records"),
                where("inspectorId", "==", currentUser.uid),
                where("jamiaName", "in", chunk)
            );
            
            const snap = await getDocs(q);
            snap.forEach(doc => {
                allRecords.push({ id: doc.id, ...doc.data() });
            });
        }

        if (allRecords.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-slate-400 font-medium">Abhi tak kisi Jamia ka koi student data submit nahi hua.</div>';
            return;
        }

        // Table UI Build karna
        let html = `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h4 class="font-bold text-slate-700">Total Enrollments: <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">${allRecords.length}</span></h4>
            </div>
            <div class="overflow-x-auto max-h-[500px]">
                <table class="w-full text-left border-collapse whitespace-nowrap">
                    <thead class="sticky top-0 bg-slate-100 shadow-sm z-10">
                        <tr class="text-slate-600 text-[11px] md:text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                            <th class="p-3">Jamia</th>
                            <th class="p-3">Student Name</th>
                            <th class="p-3">Father's Name</th>
                            <th class="p-3">JM Class</th>
                            <th class="p-3">Qualification</th>
                            <th class="p-3 text-center">Admission</th>
                            <th class="p-3">Details (Board/Class)</th>
                            <th class="p-3 text-center">Result</th>
                        </tr>
                    </thead>
                    <tbody class="text-xs md:text-sm text-slate-600 divide-y divide-slate-100">
        `;

        allRecords.forEach(record => {
            // Details text format karna
            let details = "—";
            if (record.admissionType === 'NIOS') details = `Class: ${record.classLevel || ''}`;
            else if (record.admissionType === 'School' || record.admissionType === 'Madrasa Board') details = `Class: ${record.classLevel || ''} | ${record.board || record.stream || ''}`;
            else if (record.admissionType === 'College') details = `${record.degree || ''} | ${record.duration || ''}`;
            else if (record.admissionType === 'No Admission') details = `<span class="text-red-400 truncate max-w-[150px] inline-block" title="${record.reason}">${record.reason || 'N/A'}</span>`;

            // Result/Status Badge
            let resultBadge = '<span class="text-slate-400">-</span>';
            if(record.status === 'Pass') resultBadge = `<span class="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded font-bold text-xs">Pass ${record.result ? '('+record.result+')' : ''}</span>`;
            else if(record.status === 'Fail') resultBadge = `<span class="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded font-bold text-xs">Fail</span>`;

            html += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-3 font-semibold text-slate-700">${record.jamiaName || '—'}</td>
                    <td class="p-3 font-bold text-indigo-700">${record.studentName || '—'}</td>
                    <td class="p-3">${record.fatherName || '—'}</td>
                    <td class="p-3"><span class="bg-slate-100 px-2 py-1 rounded-md text-xs font-semibold">${record.jmClass || '—'}</span></td>
                    <td class="p-3">${record.currentQualification || '—'}</td>
                    <td class="p-3 text-center"><span class="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">${record.admissionType || '—'}</span></td>
                    <td class="p-3 text-slate-500">${details}</td>
                    <td class="p-3 text-center">${resultBadge}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div></div>`;
        container.innerHTML = html;

    } catch (error) {
        console.error("Enrollment Summary Error:", error);
        container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Data fetch karne mein masla aaya: ${error.message}</div>`;
    }
}
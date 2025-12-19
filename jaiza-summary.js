// Filename: jaiza-summary.js

import {
    collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Helper: Grade nikalne ke liye (Image ke hisaab se)
const getGrade = (p) => {
    if (!p && p !== 0) return "-";
    if (p >= 80) return "ممتاز";
    if (p >= 60) return "بہتر"; // 60-79
    if (p >= 40) return "مناسب";
    return "کمزور";
};

// Main Function
export async function initJaizaSummary(db, user, containerId, userProfileData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Default Month (Current)
    const date = new Date();
    const defaultMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // UI Structure matches the Image style
    container.innerHTML = `
      <div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-4">
        
        <div class="flex flex-col md:flex-row gap-4 items-end no-print">
            <div class="w-full md:w-1/3">
                <label class="block text-xs font-medium text-gray-700 mb-1">Mahina Select Karein</label>
                <input type="month" id="js-month-filter" class="w-full p-2 border rounded text-sm" value="${defaultMonth}">
            </div>
            
            <div class="w-full md:w-1/3">
                <label class="block text-xs font-medium text-gray-700 mb-1">Jamia (Optional)</label>
                <select id="js-jamia-filter" class="w-full p-2 border rounded text-sm urdu-font">
                    <option value="">Tamam Jamiaat</option>
                </select>
            </div>

            <button id="js-show-btn" class="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded transition">
                Report Dekhein
            </button>
        </div>

        <div id="js-loader" class="hidden text-center py-4 text-teal-600 font-bold">
            Report tyar ho rahi hai...
        </div>

        <div id="js-report-area" class="hidden mt-6 overflow-x-auto bg-white p-2">
            
            <div class="bg-[#4a7c2d] text-white text-center py-3 font-bold text-xl urdu-font border border-black border-b-0 rounded-t-lg" id="js-report-header">
                درجہ جائزہ رپورٹ
            </div>

            <table class="min-w-full border-collapse border border-black text-center text-sm" dir="rtl">
                <thead>
                    <tr class="bg-blue-100 urdu-font text-black font-bold text-base">
                        <th class="border border-black px-2 py-2 w-10">نمبر</th>
                        <th class="border border-black px-2 py-2">جامعہ</th>
                        <th class="border border-black px-2 py-2">استاذ</th>
                        <th class="border border-black px-2 py-2 w-24">درجہ</th>
                        <th class="border border-black px-2 py-2">کتاب</th>
                        <th class="border border-black px-2 py-2 w-20">کیفیت (%)</th> <th class="border border-black px-2 py-2 w-20">فیصلہ</th> </tr>
                </thead>
                <tbody id="js-table-body" class="urdu-font text-gray-900">
                    </tbody>
            </table>

            <div class="mt-4 flex justify-end no-print">
                <button id="js-download-img" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-sm">
                    <i class="fas fa-image mr-2"></i> Download Image
                </button>
            </div>
        </div>
      </div>
    `;

    // Populate Jamia Filter
    const jamiaSelect = document.getElementById('js-jamia-filter');
    if (userProfileData && userProfileData.jamiaatList) {
        userProfileData.jamiaatList.forEach(j => {
            jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });
    }

    // Logic for Button
    document.getElementById('js-show-btn').addEventListener('click', () => fetchAndRenderReport(db, user));
    
    // Logic for Download
    document.getElementById('js-download-img').addEventListener('click', () => {
        const area = document.getElementById('js-report-area');
        const btns = document.querySelectorAll('.no-print');
        btns.forEach(b => b.style.display = 'none'); // Hide buttons for image
        
        html2canvas(area, { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Jaiza_Report.png`;
            link.href = canvas.toDataURL();
            link.click();
            btns.forEach(b => b.style.display = ''); // Show buttons back
        });
    });
}

async function fetchAndRenderReport(db, user) {
    const monthKey = document.getElementById('js-month-filter').value;
    const jamiaFilter = document.getElementById('js-jamia-filter').value;
    const loader = document.getElementById('js-loader');
    const reportArea = document.getElementById('js-report-area');
    const tbody = document.getElementById('js-table-body');
    const headerTitle = document.getElementById('js-report-header');

    if (!monthKey) { alert("Mahina select karein"); return; }

    loader.classList.remove('hidden');
    reportArea.classList.add('hidden');
    tbody.innerHTML = '';

    // Month name in Urdu for Header
    const dateObj = new Date(monthKey + "-01");
    const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
    headerTitle.textContent = `درجہ جائزہ: ${monthKey} (${monthName}) کی رپورٹ`;

    try {
        const qRef = collection(db, 'jaiza_forms');
        let q = query(qRef, where("createdBy", "==", user.uid), where("monthKey", "==", monthKey));
        
        // Note: Firestore me multiple fields par filter ke liye composite index chahiye hota hai.
        // Agar index error aaye, to hum JS me filter kar lenge (Better for dynamic filtering).
        
        const snapshot = await getDocs(q);
        let docs = snapshot.docs.map(d => d.data());

        // JS Filtering for Jamia (if selected)
        if (jamiaFilter) {
            docs = docs.filter(d => d.jamiaId === jamiaFilter);
        }

        // --- CORE LOGIC: FLATTENING THE DATA ---
        // Hamare paas data Class-wise hai, hamein Kitab-wise rows chahiye image ki tarah.
        let rows = [];

        docs.forEach(doc => {
            if (doc.books && Array.isArray(doc.books)) {
                doc.books.forEach(book => {
                    // Agar koi data hi nahi bhara, to skip karein (optional)
                    // if (!book.teacherName && !book.percentage) return;

                    rows.push({
                        jamia: doc.jamiaId,
                        teacher: book.teacherName || "-",
                        className: doc.className || "-",
                        book: book.bookName || "-",
                        percent: book.percentage, // Number expected
                        grade: getGrade(book.percentage)
                    });
                });
            }
        });

        // Sorting: Pehle Jamia ke naam se, phir Class ke naam se
        rows.sort((a, b) => {
            if (a.jamia === b.jamia) {
                return a.className.localeCompare(b.className);
            }
            return a.jamia.localeCompare(b.jamia);
        });

        // Rendering Rows
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-red-500">Is mahine ka koi data nahi mila.</td></tr>`;
        } else {
            rows.forEach((row, index) => {
                const pVal = row.percent !== null && row.percent !== undefined ? row.percent.toFixed(2) : "-";
                
                // Row Style
                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 border-b border-gray-300">
                        <td class="border border-black px-2 py-1 font-sans">${index + 1}</td>
                        <td class="border border-black px-2 py-1">${row.jamia}</td>
                        <td class="border border-black px-2 py-1">${row.teacher}</td>
                        <td class="border border-black px-2 py-1">${row.className}</td>
                        <td class="border border-black px-2 py-1">${row.book}</td>
                        <td class="border border-black px-2 py-1 font-bold font-sans">${pVal}</td>
                        <td class="border border-black px-2 py-1">${row.grade}</td>
                    </tr>
                `;
            });
        }

        loader.classList.add('hidden');
        reportArea.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        loader.textContent = "Error: Data load nahi ho saka.";
    }
}

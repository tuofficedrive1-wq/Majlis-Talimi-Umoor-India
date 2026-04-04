// ✅ COMPLETE ADMIN RESULT ANALYSIS SYSTEM
// Includes: Region/User Lookup, Dynamic Filters, Beautiful Tables (Image Style), Auto-Totals, and Excel Export.

import {
    collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 🔹 HELPER: Get Status Text (Kefiyat)
const getJamiaKefiyat = (p) => {
    let val = parseFloat(String(p).replace('%', ''));
    if (isNaN(val)) return "-";
    if (val >= 85) return "ممتاز مع شرف";
    if (val >= 76) return "ممتاز";
    if (val >= 61) return "بہتر";
    if (val >= 40) return "مناسب";
    return "کمزور";
};

// 🔹 HELPER: Get Status Color
const getKefiyatColor = (p) => {
    let val = parseFloat(String(p).replace('%', ''));
    if (val >= 85) return "#059669"; // Emerald
    if (val >= 70) return "#2563eb"; // Blue
    if (val >= 60) return "#d97706"; // Amber
    if (val >= 40) return "#7c3aed"; // Purple
    return "#dc2626"; // Red
};

// 🚀 MAIN FUNCTION
export async function initAdminResultAnalysis(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Get Global Data for Mapping
    const allUsers = window.allUsersData || [];
    const regions = [...new Set(allUsers.map(u => u.region).filter(r => r))].sort();

    // 🔍 Context Lookup: Jamia Name se User aur Region nikalna
    const getJamiaContext = (jamiaName) => {
        if (!jamiaName || allUsers.length === 0) return { userName: 'Not Linked', region: 'N/A' };
        const target = jamiaName.trim().toLowerCase();
        const foundUser = allUsers.find(u => {
            const list = u.jamiaatList || [];
            return list.some(j => {
                const name = typeof j === 'object' ? (j.name || j.jamiaName) : j;
                return (name || '').trim().toLowerCase() === target;
            });
        });
        return {
            userName: foundUser ? (foundUser.name || foundUser.email) : 'Not Linked',
            region: foundUser ? (foundUser.region || 'N/A') : 'N/A'
        };
    };

    // 2. Render UI Interface
    container.innerHTML = `
    <div class="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-6">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                 <button id="admin-excel-btn" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition hidden">
                    <i class="fas fa-file-excel"></i> Excel Download
                </button>
                <h4 class="font-bold text-indigo-800 urdu-font text-2xl text-right">فائنل رزلٹ اینالائسس (ایڈمن پینل)</h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Exam Type</label>
                    <select id="admin-exam-type" class="w-full p-2.5 border rounded-lg urdu-font focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="ششماہی امتحان">ششماہی امتحان</option>
                        <option value="سالانہ امتحان">سالانہ امتحان</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Academic Year</label>
                    <select id="admin-exam-year" class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26" selected>2025-26</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Region</label>
                    <select id="admin-region-filter" class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="all">All Regions</option>
                        ${regions.map(r => `<option value="${r}">${r}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">User</label>
                    <select id="admin-user-filter" class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="all">All Users</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Layout</label>
                    <select id="admin-layout" class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="jamia">Jamia Wise</option>
                        <option value="class">Class Wise</option>
                        <option value="teacher">Asatiza Wise</option>
                    </select>
                </div>
            </div>
            <button id="admin-show-btn" class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl w-full font-bold shadow-lg transform transition active:scale-95">
                <i class="fas fa-search mr-2"></i> Show Analysis
            </button>
        </div>

        <div id="admin-loader" class="hidden text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p class="mt-2 text-gray-500 font-medium">Fetching Data...</p>
        </div>

        <div id="admin-report" class="hidden overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table class="w-full text-center border-collapse" id="final-analysis-table-to-export">
                <thead>
                    <tr id="admin-head" class="bg-gray-800 text-white urdu-font text-[13px]"></tr>
                </thead>
                <tbody id="admin-body" class="divide-y divide-gray-100 text-gray-700"></tbody>
                <tfoot id="admin-foot"></tfoot>
            </table>
        </div>
    </div>`;

    // admin-final-result-analysis.js mein is block ko update karein:

document.getElementById("admin-excel-btn").onclick = () => {
    const table = document.getElementById("final-analysis-table-to-export");
    const examType = document.getElementById("admin-exam-type").value;
    const layout = document.getElementById("admin-layout").value;
    const region = document.getElementById("admin-region-filter").value;
    const user = document.getElementById("admin-user-filter").value;

    // 1. Dynamic File Name Logic
    let fileName = `Final_Analysis_${layout}`;
    if (region !== "all") fileName += `_Region_${region}`;
    if (user !== "all") fileName += `_User_${user}`;
    fileName += `_${examType}.xlsx`;

    // 2. Table to Book with Formatting (raw: false taake % dikhe)
    const wb = XLSX.utils.table_to_book(table, { sheet: "Final Analysis", raw: false });
    const ws = wb.Sheets["Final Analysis"];

    // 3. Professional Styling logic
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cell_address]) continue;

            ws[cell_address].s = {
                border: {
                    top: { style: "thin" }, bottom: { style: "thin" },
                    left: { style: "thin" }, right: { style: "thin" }
                },
                alignment: { vertical: "center", horizontal: "center", wrapText: true },
                font: { name: "Arial", sz: 10 }
            };

            // Header Row (Dark Gray Background, White Font)
            if (R === 0) {
                ws[cell_address].s.fill = { fgColor: { rgb: "333333" } };
                ws[cell_address].s.font = { color: { rgb: "FFFFFF" }, bold: true, sz: 11 };
            }
        }
    }

    // Column width adjustment
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];

    XLSX.writeFile(wb, fileName);
};

    // 3. Elements Setup
    const regionSelect = document.getElementById("admin-region-filter");
    const userSelect = document.getElementById("admin-user-filter");
    const loader = document.getElementById("admin-loader");
    const report = document.getElementById("admin-report");
    const thead = document.getElementById("admin-head");
    const tbody = document.getElementById("admin-body");
    const tfoot = document.getElementById("admin-foot");
    const excelBtn = document.getElementById("admin-excel-btn");

    // 🔄 Dynamic Filter Sync: Region badalne par users badlein
    regionSelect.onchange = () => {
        const selectedReg = regionSelect.value;
        userSelect.innerHTML = '<option value="all">All Users</option>';
        const filteredUsers = selectedReg === "all" ? allUsers : allUsers.filter(u => u.region === selectedReg);
        filteredUsers.forEach(u => {
            const name = u.name || u.email;
            userSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
    };
    regionSelect.onchange();

    // 📈 Excel Download Logic
    excelBtn.onclick = () => {
        const table = document.getElementById("final-analysis-table-to-export");
        const wb = XLSX.utils.table_to_book(table, { sheet: "Analysis" });
        XLSX.writeFile(wb, `Final_Analysis_Report.xlsx`);
    };

    // 🚀 Execution Logic
    document.getElementById("admin-show-btn").onclick = async () => {
        const examType = document.getElementById("admin-exam-type").value;
        const examYear = document.getElementById("admin-exam-year").value;
        const layout = document.getElementById("admin-layout").value;
        const selRegion = regionSelect.value;
        const selUser = userSelect.value;

        loader.classList.remove("hidden");
        report.classList.add("hidden");
        excelBtn.classList.add("hidden");
        tbody.innerHTML = "";
        tfoot.innerHTML = "";

        try {
            const colName = (layout === 'teacher') ? "asatiza_wise_results" : "class_wise_results";
            const q = query(collection(db, colName), where("examType", "==", examType), where("examYear", "==", examYear), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            
            let latestDataMap = new Map();
            snapshot.forEach(docSnap => {
                const d = docSnap.data();
                const context = getJamiaContext(d.jamia);

                if (selRegion !== "all" && context.region !== selRegion) return;
                if (selUser !== "all" && context.userName !== selUser) return;

                let key = layout === 'teacher' ? `${d.jamia}_${d.teacher}_${d.subject}_${d.darjah}` : `${d.jamia}_${d.darjah}`;
                if (!latestDataMap.has(key)) latestDataMap.set(key, { ...d, ...context });
            });

            const num = (v) => parseInt(v) || 0;
            let rowsHtml = "";
            let totals = { kul: 0, hazir: 0, kamyab: 0, zimni: 0, nakam: 0 };

            // ==========================================
            // 🔥 LAYOUT: JAMIA WISE
            // ==========================================
            if (layout === 'jamia') {
                thead.innerHTML = `
                    <th class="p-3 border">#</th><th class="p-3 border">Region</th><th class="p-3 border">User</th>
                    <th class="p-3 border text-right">جامعہ کا نام</th><th class="p-3 border">کل طلبہ</th>
                    <th class="p-3 border">حاضر</th><th class="p-3 border">کامیاب</th>
                    <th class="p-3 border text-purple-600">ضمنی</th><th class="p-3 border text-red-600">ناکام</th>
                    <th class="p-3 border">فیصد</th><th class="p-3 border">کیفیت</th>`;

                let stats = {};
                latestDataMap.forEach(d => {
                    const kul = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                    const kamyab = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                    const hazir = Math.max(0, kul - num(d.ghaib));

                    if (!stats[d.jamia]) stats[d.jamia] = { kul: 0, hazir: 0, kamyab: 0, zimni: 0, nakam: 0, region: d.region, user: d.userName };
                    stats[d.jamia].kul += kul; stats[d.jamia].hazir += hazir; stats[d.jamia].kamyab += kamyab;
                    stats[d.jamia].zimni += num(d.majazZimni); stats[d.jamia].nakam += num(d.nakam);
                });

                let i = 1;
                for (let j in stats) {
                    const s = stats[j];
                    const per = s.hazir ? (s.kamyab / s.hazir) * 100 : 0;
                    totals.kul += s.kul; totals.hazir += s.hazir; totals.kamyab += s.kamyab; totals.zimni += s.zimni; totals.nakam += s.nakam;

                    rowsHtml += `
                    <tr class="hover:bg-blue-50 transition text-[13px] border-b">
                        <td class="p-2 border text-gray-400">${i++}</td>
                        <td class="p-2 border text-xs text-gray-500">${s.region}</td>
                        <td class="p-2 border text-xs text-gray-500">${s.user}</td>
                        <td class="p-2 border font-bold text-right text-gray-800 urdu-font">${j}</td>
                        <td class="p-2 border font-bold">${s.kul}</td>
                        <td class="p-2 border text-blue-600">${s.hazir}</td>
                        <td class="p-2 border text-emerald-600 font-bold">${s.kamyab}</td>
                        <td class="p-2 border text-purple-600">${s.zimni}</td>
                        <td class="p-2 border text-red-500">${s.nakam}</td>
                        <td class="p-2 border font-bold text-teal-700">${per.toFixed(2)}%</td>
                        <td class="p-2 border font-bold urdu-font" style="color:${getKefiyatColor(per)}">${getJamiaKefiyat(per)}</td>
                    </tr>`;
                }
                const gPer = totals.hazir ? (totals.kamyab / totals.hazir) * 100 : 0;
                tfoot.innerHTML = `<tr class="bg-gray-800 text-white text-[13px] font-bold"><td colspan="4" class="p-3 text-right">TOTAL SUMMARY</td><td class="p-3 border">${totals.kul}</td><td class="p-3 border">${totals.hazir}</td><td class="p-3 border">${totals.kamyab}</td><td class="p-3 border">${totals.zimni}</td><td class="p-3 border">${totals.nakam}</td><td class="p-3 border">${gPer.toFixed(2)}%</td><td class="p-3 border urdu-font">${getJamiaKefiyat(gPer)}</td></tr>`;
            }

            // ==========================================
            // 🔥 LAYOUT: CLASS WISE
            // ==========================================
            else if (layout === 'class') {
                thead.innerHTML = `
                <th class="p-2 border">Region</th><th class="p-2 border">User</th><th class="p-2 border text-right">جامعہ</th><th class="p-2 border text-right">درجہ</th>
                <th class="p-2 border">ممتاز مع الشرف</th><th class="p-2 border">ممتاز</th><th class="p-2 border">جید جدا</th><th class="p-2 border">جید</th>
                <th class="p-2 border">مقبول</th><th class="p-2 border">ضمنی</th><th class="p-2 border text-red-400">ناکام</th><th class="p-2 border">غیر حاضر</th>
                <th class="p-2 border bg-gray-700">کل تعداد</th><th class="p-2 border bg-blue-900">کل حاضر</th><th class="p-2 border bg-emerald-700">کامیاب</th>
                <th class="p-2 border bg-red-900">ناکام</th><th class="p-2 border">فیصد</th>`;

                latestDataMap.forEach(d => {
                    const kul = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool)+num(d.majazZimni)+num(d.nakam)+num(d.ghaib);
                    const hazir = Math.max(0, kul - num(d.ghaib));
                    const kamyab = num(d.mumtazSharf)+num(d.mumtaz)+num(d.jayyidJidda)+num(d.jayyid)+num(d.maqbool);
                    const nakam = num(d.majazZimni)+num(d.nakam);
                    const per = hazir ? (kamyab / hazir) * 100 : 0;
                    totals.kul += kul; totals.hazir += hazir; totals.kamyab += kamyab; totals.nakam += nakam;

                    rowsHtml += `<tr class="hover:bg-gray-50 transition text-[12px] text-center border-b">
                        <td class="p-2 border text-gray-500">${d.region}</td><td class="p-2 border text-gray-500">${d.userName}</td>
                        <td class="p-2 border font-bold text-right urdu-font">${d.jamia}</td><td class="p-2 border text-right urdu-font text-gray-500">${d.darjah}</td>
                        <td class="p-2 border">${num(d.mumtazSharf)}</td><td class="p-2 border">${num(d.mumtaz)}</td><td class="p-2 border">${num(d.jayyidJidda)}</td>
                        <td class="p-2 border">${num(d.jayyid)}</td><td class="p-2 border">${num(d.maqbool)}</td><td class="p-2 border text-purple-600">${num(d.majazZimni)}</td>
                        <td class="p-2 border text-red-500">${num(d.nakam)}</td><td class="p-2 border text-gray-400">${num(d.ghaib)}</td>
                        <td class="p-2 border font-bold bg-gray-50">${kul}</td><td class="p-2 border font-bold text-blue-700 bg-blue-50">${hazir}</td>
                        <td class="p-2 border font-bold text-emerald-700 bg-emerald-50">${kamyab}</td><td class="p-2 border font-bold text-red-700 bg-red-50">${nakam}</td>
                        <td class="p-2 border font-bold text-teal-700">${per.toFixed(2)}%</td></tr>`;
                });
                const gPer = totals.hazir ? (totals.kamyab / totals.hazir) * 100 : 0;
                tfoot.innerHTML = `<tr class="bg-gray-800 text-white text-[12px] font-bold"><td colspan="12" class="p-2 text-right">TOTAL SUMMARY</td><td class="p-2 border">${totals.kul}</td><td class="p-2 border">${totals.hazir}</td><td class="p-2 border">${totals.kamyab}</td><td class="p-2 border">${totals.nakam}</td><td class="p-2 border">${gPer.toFixed(2)}%</td></tr>`;
            }

            // ==========================================
            // 🔥 LAYOUT: ASATIZA WISE
            // ==========================================
            // 🔥 ASATIZA WISE (Font Size Updated & Centered)
else {
    thead.innerHTML = `
    <tr class="bg-gray-800 text-white urdu-font text-[16px]"> 
        <th class="p-3 border">Region</th>
        <th class="p-3 border">User</th>
        <th class="p-3 border text-center">جامعہ</th>
        <th class="p-3 border text-center">استاد</th>
        <th class="p-3 border text-center">مضمون</th>
        <th class="p-3 border text-center">درجہ</th>
        <th class="p-3 border">کل</th>
        <th class="p-3 border text-emerald-400">کامیاب</th>
        <th class="p-3 border text-red-400">ناکام</th>
        <th class="p-3 border">فیصد</th>
        <th class="p-3 border">کیفیت</th>
        <th class="p-3 border bg-emerald-900">مجموعی</th>
    </tr>`;

    latestDataMap.forEach((d) => {
        if (d.data && Array.isArray(d.data)) {
            d.data.forEach((tEntry) => {
                const periods = tEntry.periods || [];
                const pCount = periods.length || 1;

                let tT = 0, tP = 0;
                periods.forEach(p => { 
                    tT += parseInt(p.total) || 0; 
                    tP += parseInt(p.passed) || 0; 
                });
                const tPer = tT > 0 ? (tP / tT) * 100 : 0;
                const tKefiyat = getJamiaKefiyat(tPer);
                const tCol = getKefiyatColor(tPer);

                periods.forEach((p, pIdx) => {
                    const subTotal = parseInt(p.total) || 0;
                    const subPass = parseInt(p.passed) || 0;
                    const subNakam = Math.max(0, subTotal - subPass);
                    const subPercent = subTotal > 0 ? (subPass / subTotal) * 100 : 0;
                    const subKefiyat = p.kaifiyat || getJamiaKefiyat(subPercent);

                    // Darja (Class) Name logic
                    const displayClass = p.class || p['class'] || p.className || p.darjah || d.darjah || '-';

                    rowsHtml += `
                    <tr class="hover:bg-gray-50 transition text-[15px] text-center border-b"> 
                        ${pIdx === 0 ? `
                            <td class="p-3 border text-gray-600 font-sans align-middle" rowspan="${pCount}">${d.region || '-'}</td>
                            <td class="p-3 border text-gray-600 font-sans align-middle" rowspan="${pCount}">${d.userName || '-'}</td>
                            <td class="p-3 border font-bold text-center font-sans text-gray-800 align-middle" rowspan="${pCount}">${d.jamia || '-'}</td>
                            <td class="p-3 border font-bold text-center font-sans text-blue-700 align-middle" rowspan="${pCount}">${tEntry.teacher || "-"}</td>
                        ` : ''}
                        
                        <td class="p-3 border text-right urdu-font text-gray-800 text-[18px]">${p.subject || p.bookName || p.mazmoon || '-'}</td>
                        <td class="p-3 border text-center urdu-font text-gray-700 text-[18px]">${displayClass}</td>
                        <td class="p-3 border font-bold">${subTotal}</td>
                        <td class="p-3 border text-emerald-600 font-bold">${subPass}</td>
                        <td class="p-3 border text-red-500">${subNakam}</td>
                        <td class="p-3 border font-bold">${subPercent.toFixed(1)}%</td>
                        <td class="p-3 border urdu-font text-[18px]" style="color:${getKefiyatColor(subPercent)}">${subKefiyat}</td>
                        
                        ${pIdx === 0 ? `
                            <td class="p-3 border bg-emerald-50 align-middle font-bold" rowspan="${pCount}">
                                <div class="text-[18px]" style="color:${tCol}">${tPer.toFixed(1)}%</div>
                                <div class="text-[16px] urdu-font" style="color:${tCol}">${tKefiyat}</div>
                            </td>
                        ` : ''}
                    </tr>`;
                });
            });
        }
    });
    tfoot.innerHTML = ""; 
}
            tbody.innerHTML = rowsHtml || `<tr><td colspan="15" class="p-10 text-gray-400">No Data Found</td></tr>`;
            loader.classList.add("hidden"); report.classList.remove("hidden");
            if (rowsHtml) excelBtn.classList.remove("hidden");

        } catch (err) {
            console.error(err); loader.classList.add("hidden"); alert("Error: " + err.message);
        }
    };
}

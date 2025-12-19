// Filename: jaiza-summary.js

import {
    getFirestore, collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Helper: Grade nikalne ke liye
const getGrade = (p) => {
    if (p >= 80) return "Mumtaz (Excellent)";
    if (p >= 60) return "Behtar (Very Good)";
    if (p >= 40) return "Munasib (Good)";
    if (p > 0) return "Kamzor (Weak)";
    return "-";
};

// Main Function jo Index.html se call hoga
export async function initJaizaSummary(db, user, containerId, userProfileData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // UI Structure (Filters & Results Area)
    container.innerHTML = `
      <div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-4">
        <h3 class="text-lg font-bold text-gray-700 border-b pb-2">Jaiza Summary & Analysis</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Report Type</label>
                <select id="js-report-type" class="w-full p-2 border rounded text-sm">
                    <option value="jamia">Jamia Overall Report</option>
                    <option value="teacher">Teacher Wise Report</option>
                </select>
            </div>
            
            <div id="js-jamia-filter-div">
                <label class="block text-xs font-medium text-gray-700 mb-1">Select Jamia</label>
                <select id="js-jamia-select" class="w-full p-2 border rounded text-sm urdu-font">
                    <option value="">Select Jamia</option>
                </select>
            </div>

            <div id="js-teacher-filter-div" class="hidden">
                <label class="block text-xs font-medium text-gray-700 mb-1">Select Teacher</label>
                <select id="js-teacher-select" class="w-full p-2 border rounded text-sm urdu-font">
                    <option value="">Select Teacher</option>
                </select>
            </div>

            <div class="flex items-end">
                <button id="js-search-btn" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition">
                    <i class="fas fa-search mr-2"></i> Show Report
                </button>
            </div>
        </div>

        <div id="js-loader" class="hidden text-center py-4 text-teal-600 font-bold">
            Data load ho raha hai...
        </div>

        <div id="js-results-area" class="hidden space-y-6 mt-6">
            
            <div id="js-summary-card" class="bg-gray-50 p-4 rounded border flex justify-between items-center">
                </div>

            <div class="bg-white p-2 border rounded shadow-sm">
                <canvas id="js-summary-chart" style="max-height: 300px;"></canvas>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full text-sm text-left border">
                    <thead class="bg-gray-100 text-gray-600 uppercase font-medium">
                        <tr id="js-table-header"></tr>
                    </thead>
                    <tbody id="js-table-body" class="divide-y divide-gray-200 bg-white"></tbody>
                </table>
            </div>

            <button id="js-download-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full md:w-auto">
                <i class="fas fa-download mr-2"></i> Download Report as Image
            </button>
        </div>
      </div>
    `;

    // 1. Populate Dropdowns
    const jamiaSelect = document.getElementById('js-jamia-select');
    const teacherSelect = document.getElementById('js-teacher-select');
    const reportType = document.getElementById('js-report-type');
    const jamiaDiv = document.getElementById('js-jamia-filter-div');
    const teacherDiv = document.getElementById('js-teacher-filter-div');
    
    // Fill Jamia
    if (userProfileData && userProfileData.jamiaatList) {
        userProfileData.jamiaatList.forEach(j => {
            jamiaSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });
    }

    // Fill Teacher (Extract unique teachers from structure if available, else fetching logic needed)
    // For now, simple logic:
    let allTeachers = new Set();
    if (userProfileData.academicStructure) {
        userProfileData.academicStructure.forEach(j => {
            if(j.teachers) j.teachers.forEach(t => allTeachers.add(t.name || t.teacherName));
        });
    }
    allTeachers.forEach(t => {
        teacherSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });

    // 2. Event Listeners
    reportType.addEventListener('change', (e) => {
        if (e.target.value === 'jamia') {
            jamiaDiv.classList.remove('hidden');
            teacherDiv.classList.add('hidden');
        } else {
            jamiaDiv.classList.add('hidden');
            teacherDiv.classList.remove('hidden');
        }
    });

    document.getElementById('js-search-btn').addEventListener('click', () => handleSearch(db, user));

    document.getElementById('js-download-btn').addEventListener('click', () => {
        const resultArea = document.getElementById('js-results-area');
        // Temporarily white background for cleaner image
        const originalBg = resultArea.style.backgroundColor;
        resultArea.style.backgroundColor = "#ffffff";
        resultArea.style.padding = "20px";
        
        html2canvas(resultArea).then(canvas => {
            const link = document.createElement('a');
            link.download = `Jaiza_Report_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
            
            // Revert styles
            resultArea.style.backgroundColor = originalBg;
            resultArea.style.padding = "";
        });
    });
}

// Search Logic
async function handleSearch(db, user) {
    const type = document.getElementById('js-report-type').value;
    const jamia = document.getElementById('js-jamia-select').value;
    const teacher = document.getElementById('js-teacher-select').value;
    const loader = document.getElementById('js-loader');
    const resultsArea = document.getElementById('js-results-area');

    if (type === 'jamia' && !jamia) {
        alert("Please select a Jamia."); return;
    }
    if (type === 'teacher' && !teacher) {
        alert("Please select a Teacher."); return;
    }

    loader.classList.remove('hidden');
    resultsArea.classList.add('hidden');

    try {
        const jaizaRef = collection(db, 'jaiza_forms');
        let q;
        
        // Ham saara data le aate hain user ka, phir JS me filter karenge (Firestore limits ke karan)
        // Optimization: Agar Jamia select hai to wo filter lagayein
        if (type === 'jamia') {
            q = query(jaizaRef, where("createdBy", "==", user.uid), where("jamiaId", "==", jamia));
        } else {
            q = query(jaizaRef, where("createdBy", "==", user.uid));
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => d.data());

        if (type === 'jamia') {
            renderJamiaReport(docs, jamia);
        } else {
            renderTeacherReport(docs, teacher);
        }

        loader.classList.add('hidden');
        resultsArea.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        loader.textContent = "Error loading data.";
    }
}

// --- JAMIA REPORT LOGIC ---
function renderJamiaReport(docs, jamiaName) {
    // Group by Month
    // Structure: { "2025-01": [percentages...], "2025-02": ... }
    const monthlyStats = {};

    docs.forEach(doc => {
        if (!doc.monthKey || doc.classPercentage == null) return;
        if (!monthlyStats[doc.monthKey]) monthlyStats[doc.monthKey] = [];
        // classPercentage ko number me convert karein
        const p = parseFloat(doc.classPercentage.toString().replace('%',''));
        if (!isNaN(p)) monthlyStats[doc.monthKey].push(p);
    });

    // Calculate Averages
    const labels = Object.keys(monthlyStats).sort(); // Sort months like 2025-01, 2025-02
    const dataPoints = [];
    
    // Table HTML setup
    const thead = document.getElementById('js-table-header');
    const tbody = document.getElementById('js-table-body');
    const summaryCard = document.getElementById('js-summary-card');

    thead.innerHTML = `
        <th class="px-4 py-2">Mahina (Month)</th>
        <th class="px-4 py-2">Total Classes</th>
        <th class="px-4 py-2">Average %</th>
        <th class="px-4 py-2">Kaifiyat (Grade)</th>
    `;
    tbody.innerHTML = '';

    labels.forEach(month => {
        const scores = monthlyStats[month];
        const sum = scores.reduce((a,b) => a+b, 0);
        const avg = sum / scores.length;
        dataPoints.push(avg.toFixed(1));

        tbody.innerHTML += `
            <tr>
                <td class="px-4 py-2 border-t">${month}</td>
                <td class="px-4 py-2 border-t">${scores.length}</td>
                <td class="px-4 py-2 border-t font-bold">${avg.toFixed(1)}%</td>
                <td class="px-4 py-2 border-t urdu-font">${getGrade(avg)}</td>
            </tr>
        `;
    });

    summaryCard.innerHTML = `
        <div>
            <h4 class="text-xl font-bold text-teal-700 urdu-font">${jamiaName}</h4>
            <p class="text-sm text-gray-500">Overall Performance Report</p>
        </div>
        <div class="text-right">
            <p class="text-xs text-gray-600">Reports Found</p>
            <p class="font-bold text-lg">${labels.length} Months</p>
        </div>
    `;

    renderChart(labels, dataPoints, `Performance of ${jamiaName}`);
}

// --- TEACHER REPORT LOGIC ---
function renderTeacherReport(docs, teacherName) {
    // Humein wo saari "books" objects dhundni hain jahan teacherName match ho
    const records = [];

    docs.forEach(doc => {
        if (doc.books && Array.isArray(doc.books)) {
            doc.books.forEach(book => {
                if (book.teacherName === teacherName) {
                    // Match found
                    const p = book.percentage || 0;
                    records.push({
                        month: doc.monthKey,
                        jamia: doc.jamiaId, // Assuming jamiaId is saved in form
                        className: doc.className,
                        book: book.bookName,
                        percentage: p,
                        weakness: book.weakness || "-"
                    });
                }
            });
        }
    });

    // Sort by Month
    records.sort((a,b) => a.month.localeCompare(b.month));

    const labels = records.map(r => r.month); // Simplified: shows every entry. Or group by month for avg.
    // Let's group by month for the CHART, but show details in TABLE.
    
    // Grouping for Chart
    const monthGroups = {};
    records.forEach(r => {
        if(!monthGroups[r.month]) monthGroups[r.month] = [];
        monthGroups[r.month].push(parseFloat(r.percentage));
    });
    const chartLabels = Object.keys(monthGroups).sort();
    const chartData = chartLabels.map(m => {
        const arr = monthGroups[m];
        return (arr.reduce((a,b)=>a+b,0) / arr.length).toFixed(1);
    });

    // Render Table
    const thead = document.getElementById('js-table-header');
    const tbody = document.getElementById('js-table-body');
    const summaryCard = document.getElementById('js-summary-card');

    thead.innerHTML = `
        <th class="px-4 py-2">Mahina</th>
        <th class="px-4 py-2">Jamia</th>
        <th class="px-4 py-2">Class / Kitab</th>
        <th class="px-4 py-2">%</th>
        <th class="px-4 py-2">Kaifiyat</th>
    `;
    tbody.innerHTML = '';

    records.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td class="px-4 py-2 border-t">${r.month}</td>
                <td class="px-4 py-2 border-t urdu-font">${r.jamia}</td>
                <td class="px-4 py-2 border-t urdu-font">${r.className} - ${r.book}</td>
                <td class="px-4 py-2 border-t font-bold">${typeof r.percentage === 'number' ? r.percentage.toFixed(1) : r.percentage}%</td>
                <td class="px-4 py-2 border-t urdu-font text-xs">${getGrade(r.percentage)} <br> <span class="text-gray-400">${r.weakness}</span></td>
            </tr>
        `;
    });

    summaryCard.innerHTML = `
        <div>
            <h4 class="text-xl font-bold text-indigo-700 urdu-font">${teacherName}</h4>
            <p class="text-sm text-gray-500">Teacher Performance Report</p>
        </div>
        <div class="text-right">
            <p class="text-xs text-gray-600">Total Records</p>
            <p class="font-bold text-lg">${records.length}</p>
        </div>
    `;

    renderChart(chartLabels, chartData, `Performance of ${teacherName}`);
}

// --- CHART RENDERING (Reusing Chart.js) ---
let currentChart = null;

function renderChart(labels, data, labelStr) {
    const ctx = document.getElementById('js-summary-chart').getContext('2d');
    
    if (currentChart) currentChart.destroy();

    currentChart = new Chart(ctx, {
        type: 'line', // Line chart for trend
        data: {
            labels: labels,
            datasets: [{
                label: labelStr,
                data: data,
                borderColor: 'rgb(20, 184, 166)', // Teal
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}
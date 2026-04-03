// admin-final-result-analysis.js

import {
    collection,
    query,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("btn-generate-final-analysis");
    const container = document.getElementById("final-analysis-container");

    if (!btn) return;

    btn.addEventListener("click", async () => {

        const db = window.db;

        const region = document.getElementById("final-filter-region").value;
        const user = document.getElementById("final-filter-user").value;
        const jamia = document.getElementById("final-filter-jamia").value;

        if (!db) {
            alert("DB load nahi hua");
            return;
        }

        container.innerHTML = "Loading...";

        try {

            const q = query(
                collection(db, "class_wise_results"),
                orderBy("timestamp", "desc")
            );

            const snapshot = await getDocs(q);

            let data = [];

            snapshot.forEach(doc => {
                const d = doc.data();

                // 🔥 FILTER
                if (region !== "all" && d.region !== region) return;
                if (user !== "all" && d.userId !== user) return;
                if (jamia !== "all" && d.jamia !== jamia) return;

                data.push(d);
            });

            // 🔥 TABLE
            let html = `
                <table class="w-full border text-sm">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="border p-2">Jamia</th>
                            <th class="border p-2">Class</th>
                            <th class="border p-2">Total</th>
                            <th class="border p-2">Pass</th>
                            <th class="border p-2">%</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(d => {
                html += `
                    <tr>
                        <td class="border p-2">${d.jamia || "-"}</td>
                        <td class="border p-2">${d.darjah || "-"}</td>
                        <td class="border p-2">${d.total || 0}</td>
                        <td class="border p-2">${d.passed || 0}</td>
                        <td class="border p-2">${d.percent || 0}%</td>
                    </tr>
                `;
            });

            html += "</tbody></table>";

            container.innerHTML = html;

        } catch (err) {
            console.error(err);
            container.innerHTML = "Error loading data";
        }

    });

});

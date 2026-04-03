// admin-final-result-analysis.js

import { initResultAnalysis } from "./result-analysis.js";

document.addEventListener("DOMContentLoaded", () => {

    const containerId = "final-analysis-container";
    const btn = document.getElementById("btn-generate-final-analysis");

    if (!btn) return;

    btn.addEventListener("click", () => {

        const type = document.getElementById("final-analysis-type-select").value;

        if (!type) {
            alert("Pehle Report Type select karein");
            return;
        }

        // 🔹 GLOBAL VARIABLES (admin file se)
        const db = window.db;
        const currentUser = window.currentUser;
        const userProfileData = window.userProfileData || {};

        if (!db || !currentUser) {
            alert("System load nahi hua, dobara try karein");
            return;
        }

        // 🔥 SAME LOGIC CALL (result-analysis.js se)
        initResultAnalysis(db, currentUser, containerId, userProfileData);

    });

});
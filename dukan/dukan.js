/* ========================================================
   SIMPLICITY ERP - DUKAN / GADDI TRANSFER ENGINE
   File: dukan/dukan.js • Developed by Farhan Jawed
   (Factory Outward, Challan Notes & Finished Stock Sync)
======================================================== */

function getDukanTransfers() {
    return safeArray(getStore("dukan_transfer_history"));
}

function openDukanModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("jobwork-section", "block");
    setDisplay("jw-hub-view", "none");
    setDisplay("jw-workers-view", "none");
    setDisplay("jw-sheet-view", "none");
    setDisplay("jw-dukan-view", "block");
    renderDukanTransferTable();
}

// 1. TABLE RENDERING
function renderDukanTransferTable() {
    var tbody = document.getElementById("jw-dukan-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = getDukanTransfers();
    var totSent = 0;
    list.forEach(function(d) { totSent += (Number(d.pcs) || 0); });

    setElementText("jw-hub-badge-dukan", totSent + " Pcs Bheje");
    setElementText("jw-dukan-total-pcs", totSent + " Pcs");

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Dukan par abhi koi maal nahi bheja gaya hai.</td></tr>";
        return;
    }

    list.forEach(function(d) {
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(d.date) + "</td>" +
            "<td><strong>" + (d.sareeName || "-") + "</strong></td>" +
            "<td style='color:#dc2626; font-weight:700;'>-" + (d.pcs || 0) + " Pcs</td>" +
            "<td>" + (d.receiver || "Dukan / Gaddi") + "</td>" +
            "<td>" + (d.note || "-") + "</td>" +
            "<td style='text-align:center;'><button class='delete-btn' onclick='deleteDukanTransfer(\"" + d.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
}

// 2. DISPATCH SAREE TO DUKAN
function saveDukanTransfer() {
    var d = (document.getElementById("dukan-transfer-date") && document.getElementById("dukan-transfer-date").value) || getTodayDate();
    var sName = (document.getElementById("dukan-saree-name") && document.getElementById("dukan-saree-name").value || "").trim().toUpperCase();
    var pcs = parseInt(document.getElementById("dukan-pcs") && document.getElementById("dukan-pcs").value, 10) || 0;
    var rec = (document.getElementById("dukan-receiver") && document.getElementById("dukan-receiver").value || "Main Dukan").trim();
    var note = (document.getElementById("dukan-note") && document.getElementById("dukan-note").value || "").trim();

    if (!sName || pcs <= 0) return alert("Saree ka naam aur sahi Pcs bharein!");

    // Finished stock se minus karna
    var finStock = safeArray(getStore("finished_saree_stock"));
    var target = finStock.find(function(s) { return s && s.name && s.name.toUpperCase() === sName; });

    if (target) {
        target.pcs = Math.max(0, (Number(target.pcs) || 0) - pcs);
        setStore("finished_saree_stock", finStock);
    }

    var list = getDukanTransfers();
    list.push({
        id: "dt_" + Date.now(),
        date: d,
        sareeName: sName,
        pcs: pcs,
        receiver: rec,
        note: note
    });
    setStore("dukan_transfer_history", list);

    // History log
    var h = safeArray(getStore("saree_history"));
    h.push({
        id: "sh_" + Date.now(),
        date: d,
        type: "Dukan Bheja (Out)",
        name: sName,
        kariger: rec,
        pcs: pcs,
        tab: "finished",
        note: "Challan / Dukan: " + note
    });
    setStore("saree_history", h);

    // Reset Form
    if (document.getElementById("dukan-saree-name")) document.getElementById("dukan-saree-name").value = "";
    if (document.getElementById("dukan-pcs")) document.getElementById("dukan-pcs").value = "";
    if (document.getElementById("dukan-note")) document.getElementById("dukan-note").value = "";

    renderDukanTransferTable();
    if (typeof updateJobWorkHubBadges === "function") updateJobWorkHubBadges();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + pcs + " Pcs Saree Dukan ke liye darj ho gayi!");
}

function deleteDukanTransfer(id) {
    if (!confirm("Kya aap is entry ko delete karna chahte hain?")) return;
    var list = getDukanTransfers().filter(function(x) { return String(x.id) !== String(id); });
    setStore("dukan_transfer_history", list);
    renderDukanTransferTable();
    if (typeof updateJobWorkHubBadges === "function") updateJobWorkHubBadges();
}

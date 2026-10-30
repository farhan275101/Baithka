/* ========================================================
   SIMPLICITY ERP - PAYMENT MODULE & ASALI PAISA PASSBOOK
   File: payment/payment.js • Developed by Farhan Jawed
   (Paisa Aaya/Gaya, Running Baki, Kariger Name & Delete Action)
======================================================== */

var currentPaymentKarkhanaFilter = "all";
var currentPaymentPage = 1;
var paymentPageSize = 50;

function openPaymentModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("payment-section", "block");
    currentPaymentPage = 1;
    renderPaymentKarkhanaTabs();
    renderPaymentTable();
}

// 1. PAYMENT KARKHANA TABS
function renderPaymentKarkhanaTabs() {
    var bar = document.getElementById("payment-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    var allKarigers = sanitizeKarigerList();
    var allActive = (currentPaymentKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchPaymentKarkhanaTab(\"all\")'>👥 Sabhi Karkhane (" + allKarigers.length + ")</button>";

    kList.forEach(function(k) {
        var count = allKarigers.filter(function(w) { 
            return String(w.karkhanaId) === String(k.id) || (!w.karkhanaId && k.isDefault); 
        }).length;
        var isActive = (String(currentPaymentKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchPaymentKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + " (" + count + ")</button>";
    });
}

function switchPaymentKarkhanaTab(kId) {
    currentPaymentKarkhanaFilter = kId;
    currentPaymentPage = 1;
    renderPaymentKarkhanaTabs();
    renderPaymentTable();
}

// 2. PAYMENT TABLE WITH 50/PAGE PAGINATION
function renderPaymentTable(flist) {
    var tbody = document.getElementById("payment-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = flist || sanitizeKarigerList();
    if (currentPaymentKarkhanaFilter !== "all") {
        list = list.filter(function(k) {
            return String(k.karkhanaId) === String(currentPaymentKarkhanaFilter) || (!k.karkhanaId && currentPaymentKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-payment-input") && document.getElementById("search-payment-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(k) {
            return (String(k.name || "") + " " + String(k.saree || "") + " " + String(k.karkhanaName || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var overallPaid = 0;
    var overallBaki = 0;
    list.forEach(function(k) {
        var fin = getKarigerFinanceSummary(k.id);
        overallPaid += fin.totalPaid;
        overallBaki += fin.currentBakaya;
    });

    setElementText("total-paid-display", "₹ " + overallPaid.toFixed(2));
    setElementText("total-baki-display", "₹ " + overallBaki.toFixed(2));

    var totalItems = list.length;
    var totalPages = Math.ceil(totalItems / paymentPageSize) || 1;
    if (currentPaymentPage > totalPages) currentPaymentPage = totalPages;
    if (currentPaymentPage < 1) currentPaymentPage = 1;

    var pagBar = document.getElementById("payment-pagination-bar");
    if (pagBar) {
        if (!totalItems) {
            pagBar.style.display = "none";
        } else {
            pagBar.style.display = "flex";
            var startIdx = (currentPaymentPage - 1) * paymentPageSize + 1;
            var endIdx = Math.min(currentPaymentPage * paymentPageSize, totalItems);
            var prevDis = (currentPaymentPage <= 1) ? "disabled style='opacity:0.5;'" : "";
            var nextDis = (currentPaymentPage >= totalPages) ? "disabled style='opacity:0.5;'" : "";

            pagBar.innerHTML = 
                "<div style='color:#7c3aed;'>📊 Dikh rahe hain: " + startIdx + " - " + endIdx + " (Kul: " + totalItems + ")</div>" +
                "<div style='display:flex; gap:8px; align-items:center;'>" +
                    "<button class='quick-btn btn-out' " + prevDis + " onclick='prevPaymentPage()'>◀️ Pichla</button>" +
                    "<span style='background:#fff; border:1px solid #cbd5e1; padding:4px 10px; border-radius:6px;'>Page " + currentPaymentPage + " / " + totalPages + "</span>" +
                    "<button class='quick-btn btn-in' " + nextDis + " onclick='nextPaymentPage()'>Agla ▶️</button>" +
                "</div>";
        }
    }

    if (!totalItems) {
        tbody.innerHTML = "<tr><td colspan='9' style='text-align:center; padding:20px; color:#888;'>Koi hisab nahi mila.</td></tr>";
        return;
    }

    var pageList = list.slice((currentPaymentPage - 1) * paymentPageSize, currentPaymentPage * paymentPageSize);
    var html = "";

    pageList.forEach(function(k, idx) {
        var fin = getKarigerFinanceSummary(k.id);
        var bakiBadgeClass = fin.currentBakaya > 0 ? "badge-red" : "badge-green";
        var actualIdx = (currentPaymentPage - 1) * paymentPageSize + (idx + 1);

        html += "<tr>" +
            "<td>" + actualIdx + "</td>" +
            "<td><span class='badge-blue' style='font-size:11px;'>🏭 " + (k.karkhanaName || "Main Godown") + "</span></td>" +
            "<td><strong>" + k.name + "</strong></td>" +
            "<td>" + (k.saree || "-") + "</td>" +
            "<td style='font-weight:700;'>₹ " + fin.totalMazdoori.toFixed(2) + "</td>" +
            "<td style='color:#059669; font-weight:700;'>₹ " + fin.totalPaid.toFixed(2) + "</td>" +
            "<td><span class='" + bakiBadgeClass + "' style='font-size:12px; font-weight:800;'>₹ " + fin.currentBakaya.toFixed(2) + "</span></td>" +
            "<td style='text-align:center;'><button class='quick-btn btn-in' onclick='quickPayToKariger(\"" + k.id + "\")'>💵 Pay Karein</button></td>" +
            "<td style='text-align:center;'><button class='detail-btn' style='background:#7c3aed;' onclick='viewKarigerPaymentPassbook(\"" + k.id + "\")'>📖 Paisa Passbook</button></td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

function nextPaymentPage() { currentPaymentPage++; renderPaymentTable(); }
function prevPaymentPage() { if (currentPaymentPage > 1) { currentPaymentPage--; renderPaymentTable(); } }
function filterPayment() { currentPaymentPage = 1; renderPaymentTable(); }

// 3. QUICK PAY
function quickPayToKariger(karId) {
    var kar = sanitizeKarigerList().find(function(x) { return String(x.id) === String(karId); });
    if (!kar) return;

    var amt = parseFloat(prompt("Kariger " + kar.name + " ko kitna paisa diya (₹):"));
    if (!amt || isNaN(amt) || amt <= 0) return;

    var payDate = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();
    var sheets = getKarigerSheets(karId);
    var targetSheet = sheets[sheets.length - 1];

    targetSheet.rows = safeArray(targetSheet.rows);
    targetSheet.rows.push({
        id: "row_" + Date.now(),
        date: payDate,
        saree: 0,
        cone: 0,
        lessTp: 0,
        netBana: 0,
        zariQty: 0,
        topi: 0,
        netZari: 0,
        paid: amt,
        retBana: 0,
        retZari: 0,
        karkhanaId: kar.karkhanaId || "k_main"
    });

    saveKarigerSheets(karId, sheets);
    renderPaymentTable();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ ₹ " + amt + " " + kar.name + " ke naam darj hua!");
}

// 4. 📖 ASALI PAISA PASSBOOK (PAISA AAYA / GAYA / RUNNING BAKI)
function viewKarigerPaymentPassbook(karId) {
    var kar = sanitizeKarigerList().find(function(x) { return String(x.id) === String(karId); });
    if (!kar) return;

    var titleEl = document.getElementById("modal-item-title");
    if (titleEl) titleEl.textContent = "📖 Payment Passbook: " + kar.name + " (" + (kar.karkhanaName || "Main Godown") + ")";

    var modalTable = document.querySelector("#item-modal table");
    if (!modalTable) return;

    // Table Header Set
    modalTable.innerHTML = 
        "<thead>" +
            "<tr style='background:#7c3aed; color:white;'>" +
                "<th>Tarikh</th>" +
                "<th>Kariger Ka Naam</th>" +
                "<th>Mazdoori (+ Aaya)</th>" +
                "<th>Diya Bhugtan (- Gaya)</th>" +
                "<th>Baki Bakaya (₹)</th>" +
                "<th>Khata / Vivran</th>" +
                "<th style='text-align:center;'>Action</th>" +
            "</tr>" +
        "</thead>" +
        "<tbody id='modal-history-body'></tbody>";

    var tbody = document.getElementById("modal-history-body");
    var sheets = getKarigerSheets(karId);
    var runningBaki = 0;
    var rowsFound = 0;

    sheets.forEach(function(sh, sIdx) {
        var rBani = Number(sh.rateBani) || 240;
        var pBani = Number(sh.pichlaBani) || Number(sh.closingBani) || 0;

        // Agar pichla baki hai to pehli line pichle baki ki dikhao
        if (sIdx === 0 && pBani > 0) {
            runningBaki += pBani;
            rowsFound++;
            tbody.innerHTML += "<tr style='background:#fef2f2;'>" +
                "<td>-</td>" +
                "<td><strong>" + kar.name + "</strong></td>" +
                "<td style='color:#1e3a8a; font-weight:700;'>+₹ " + pBani.toFixed(2) + "</td>" +
                "<td>-</td>" +
                "<td style='color:#dc2626; font-weight:800;'>₹ " + runningBaki.toFixed(2) + "</td>" +
                "<td>📦 Pichla Opening Balance (" + sh.title + ")</td>" +
                "<td style='text-align:center;'>-</td>" +
            "</tr>";
        }

        safeArray(sh.rows).forEach(function(r) {
            var mazdooriAmt = (Number(r.saree) || 0) * rBani;
            var paidAmt = Number(r.paid) || 0;

            if (mazdooriAmt > 0 || paidAmt > 0) {
                runningBaki = (runningBaki + mazdooriAmt) - paidAmt;
                rowsFound++;

                var vivranText = sh.title;
                if (r.saree > 0) vivranText += " (" + r.saree + " Saree × ₹" + rBani + ")";
                else vivranText += " (Direct Payment)";

                var deleteBtn = (paidAmt > 0) ? 
                    "<button class='delete-btn' onclick='deletePaymentFromSheet(\"" + karId + "\", \"" + sh.id + "\", \"" + r.id + "\")'>🗑️ Delete</button>" : "-";

                tbody.innerHTML += "<tr>" +
                    "<td>" + formatDateDisplay(r.date) + "</td>" +
                    "<td><strong>" + kar.name + "</strong></td>" +
                    "<td style='color:#059669; font-weight:700;'>" + (mazdooriAmt > 0 ? ("+₹ " + mazdooriAmt.toFixed(2)) : "-") + "</td>" +
                    "<td style='color:#dc2626; font-weight:700;'>" + (paidAmt > 0 ? ("-₹ " + paidAmt.toFixed(2)) : "-") + "</td>" +
                    "<td><strong style='color:#7c3aed; font-size:13px;'>₹ " + runningBaki.toFixed(2) + "</strong></td>" +
                    "<td>" + vivranText + "</td>" +
                    "<td style='text-align:center;'>" + deleteBtn + "</td>" +
                "</tr>";
            }
        });
    });

    if (!rowsFound) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Is Kariger ka abhi koi bhugtan ya mazdoori record nahi hai.</td></tr>";
    }

    setDisplay("item-modal", "flex");
}

function deletePaymentFromSheet(karId, sheetId, rowId) {
    if (!confirm("Kya aap sach me is payment entry ko delete karna chahte hain?")) return;
    var sheets = getKarigerSheets(karId);
    var targetSheet = sheets.find(function(s) { return s && String(s.id) === String(sheetId); });
    if (!targetSheet) return;

    targetSheet.rows = safeArray(targetSheet.rows);
    var rIdx = targetSheet.rows.findIndex(function(r) { return r && String(r.id) === String(rowId); });

    if (rIdx !== -1) {
        var r = targetSheet.rows[rIdx];
        if ((Number(r.saree) || 0) === 0 && (Number(r.netBana) || 0) === 0 && (Number(r.netZari) || 0) === 0) {
            targetSheet.rows.splice(rIdx, 1);
        } else {
            r.paid = 0;
        }
        saveKarigerSheets(karId, sheets);

        viewKarigerPaymentPassbook(karId);
        renderPaymentTable();
        if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
        if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
        alert("✅ Payment entry delete ho gayi!");
    }
}

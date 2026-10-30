/* ========================================================
   SIMPLICITY ERP - ROZANA DAY-BOOK & DASHBOARD ENGINE
   File: daybook/daybook.js • Developed by Farhan Jawed
   (Bana, Zari, Saree, Cash In/Out Register & Live Badges)
======================================================== */

var currentDayBookTab = "bana";
var badgeCalculationTimer = null;

function setDashboardToday() {
    var dateInput = document.getElementById("dash-day-date");
    if (dateInput) dateInput.value = getTodayDate();
    renderDashboardDayBook();
}

function switchDayBookTab(tab) {
    currentDayBookTab = tab;
    ["bana", "zari", "saree", "payment"].forEach(function(t) {
        var el = document.getElementById("btn-tab-" + t);
        if (el) {
            if (t === tab) el.classList.add("active");
            else el.classList.remove("active");
        }
    });
    renderDashboardDayBook();
}

// 1. ROZANA DAY-BOOK RENDER ENGINE
function renderDashboardDayBook() {
    var d = (document.getElementById("dash-day-date") && document.getElementById("dash-day-date").value) || getTodayDate();
    var thead = document.getElementById("dash-daybook-thead");
    var tbody = document.getElementById("dash-daybook-tbody");
    var tfoot = document.getElementById("dash-daybook-tfoot");
    if (!thead || !tbody || !tfoot) return;
    tbody.innerHTML = "";

    var bIn = 0, bOut = 0, zIn = 0, zOut = 0, pOut = 0;
    var bStock = safeArray(getStore("bana_stock"));
    var zStock = safeArray(getStore("zari_stock"));

    bStock.forEach(function(b) { if (b && b.date === d) bIn += (Number(b.aaya) || 0); });
    zStock.forEach(function(z) { if (z && z.date === d) zIn += (Number(z.aaya) || 0); });

    var karList = sanitizeKarigerList();
    karList.forEach(function(k) {
        var sheets = getKarigerSheets(k.id);
        sheets.forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.date === d) {
                    if (Number(r.netBana) > 0) bOut += Number(r.netBana);
                    if (Number(r.retBana) > 0) bIn += Number(r.retBana);
                    if (Number(r.netZari) > 0) zOut += Number(r.netZari);
                    if (Number(r.retZari) > 0) zIn += Number(r.retZari);
                    if (Number(r.paid) > 0) pOut += Number(r.paid);
                }
            });
        });
    });

    // Saree Daybook calculation (Bug fixed: Consistent filtering)
    var sH = safeArray(getStore("saree_history")).filter(function(h) {
        if (!h || h.date !== d) return false;
        var typeStr = String(h.type || "");
        var isTransfer = (typeStr.indexOf("Transfer") !== -1);
        var isJobWork = (typeStr.indexOf("Cutting") !== -1) || (typeStr.indexOf("Calender") !== -1);
        return !isTransfer && !isJobWork;
    });

    var sIn = 0, sOut = 0;
    sH.forEach(function(h) {
        if (String(h.type).indexOf("In") !== -1) sIn += (Number(h.pcs) || 0);
        else sOut += (Number(h.pcs) || 0);
    });

    setElementText("sub-day-bana", "In: +" + bIn.toFixed(1) + " | Out: -" + bOut.toFixed(1));
    setElementText("sub-day-zari", "In: +" + zIn.toFixed(1) + " | Out: -" + zOut.toFixed(1));
    setElementText("sub-day-saree", "In: +" + sIn + " | Out: -" + sOut);
    setElementText("sub-day-payment", "Diya: ₹ " + pOut.toFixed(0));

    // TAB 1: BANA
    if (currentDayBookTab === "bana") {
        thead.innerHTML = "<tr style='background:#059669; color:white;'><th>Bana Ka Naam</th><th>Kariger / Vivran</th><th>📥 Aaya (In)</th><th>📤 Gaya (Out)</th></tr>";
        var bRows = [];
        bStock.forEach(function(b) {
            if (b && b.date === d && Number(b.aaya) > 0) {
                bRows.push({ name: b.name, desc: b.isOpening ? "📦 Opening Stock" : "Godam Purchase", inQty: Number(b.aaya), outQty: 0 });
            }
        });
        karList.forEach(function(k) {
            getKarigerSheets(k.id).forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.date === d) {
                        var itName = r.banaItemName || "Bana";
                        if (Number(r.netBana) > 0) bRows.push({ name: itName, desc: k.name + " (" + sh.title + ")", inQty: 0, outQty: Number(r.netBana) });
                        if (Number(r.retBana) > 0) bRows.push({ name: itName, desc: k.name + " (" + sh.title + ") Return", inQty: Number(r.retBana), outQty: 0 });
                    }
                });
            });
        });

        if (!bRows.length) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Bana ki koi entry nahi hai.</td></tr>";
        } else {
            var bBuf = "";
            bRows.forEach(function(r) {
                bBuf += "<tr><td><strong>" + r.name + "</strong></td><td>" + r.desc + "</td><td style='color:#059669; font-weight:700;'>" + (r.inQty > 0 ? ("+" + r.inQty.toFixed(2)) : "-") + "</td><td style='color:#dc2626; font-weight:700;'>" + (r.outQty > 0 ? ("-" + r.outQty.toFixed(2)) : "-") + "</td></tr>";
            });
            tbody.innerHTML = bBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Bana:</strong></td><td><strong style='color:#059669;'>+" + bIn.toFixed(2) + "</strong></td><td><strong style='color:#dc2626;'>-" + bOut.toFixed(2) + "</strong></td></tr>";

    // TAB 2: ZARI
    } else if (currentDayBookTab === "zari") {
        thead.innerHTML = "<tr style='background:#ea580c; color:white;'><th>Zari Ka Naam</th><th>Kariger / Vivran</th><th>📥 Aayi (In)</th><th>📤 Gayi (Out)</th></tr>";
        var zRows = [];
        zStock.forEach(function(z) {
            if (z && z.date === d && Number(z.aaya) > 0) {
                zRows.push({ name: z.name, desc: z.isOpening ? "📦 Opening Stock" : "Godam Purchase", inQty: Number(z.aaya), outQty: 0 });
            }
        });
        karList.forEach(function(k) {
            getKarigerSheets(k.id).forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.date === d) {
                        var itName = r.zariItemName || "Zari";
                        if (Number(r.netZari) > 0) zRows.push({ name: itName, desc: k.name + " (" + sh.title + ")", inQty: 0, outQty: Number(r.netZari) });
                        if (Number(r.retZari) > 0) zRows.push({ name: itName, desc: k.name + " (" + sh.title + ") Return", inQty: Number(r.retZari), outQty: 0 });
                    }
                });
            });
        });

        if (!zRows.length) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Zari ki koi entry nahi hai.</td></tr>";
        } else {
            var zBuf = "";
            zRows.forEach(function(r) {
                zBuf += "<tr><td><strong>" + r.name + "</strong></td><td>" + r.desc + "</td><td style='color:#059669; font-weight:700;'>" + (r.inQty > 0 ? ("+" + r.inQty.toFixed(2)) : "-") + "</td><td style='color:#dc2626; font-weight:700;'>" + (r.outQty > 0 ? ("-" + r.outQty.toFixed(2)) : "-") + "</td></tr>";
            });
            tbody.innerHTML = zBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Zari:</strong></td><td><strong style='color:#059669;'>+" + zIn.toFixed(2) + "</strong></td><td><strong style='color:#dc2626;'>-" + zOut.toFixed(2) + "</strong></td></tr>";

    // TAB 3: SAREE
    } else if (currentDayBookTab === "saree") {
        thead.innerHTML = "<tr style='background:#2563eb; color:white;'><th>Saree Ka Naam</th><th>Kariger / Godam</th><th>📥 Aayi (In)</th><th>📤 Gayi (Out)</th><th>Vivran</th></tr>";
        if (!sH.length) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Factory Saree ki entry nahi hai.</td></tr>";
        } else {
            var sBuf = "";
            sH.forEach(function(h) {
                var isA = String(h.type).indexOf("In") !== -1;
                sBuf += "<tr><td><strong>" + h.name + "</strong></td><td>" + (h.kariger || "-") + "</td><td style='color:#059669; font-weight:700;'>" + (isA ? ("+" + h.pcs + " Pcs") : "-") + "</td><td style='color:#dc2626; font-weight:700;'>" + (!isA ? ("-" + h.pcs + " Pcs") : "-") + "</td><td>" + (h.note || "-") + "</td></tr>";
            });
            tbody.innerHTML = sBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Kul Fresh Saree:</strong></td><td><strong style='color:#059669;'>+" + sIn + " Pcs</strong></td><td><strong style='color:#dc2626;'>-" + sOut + " Pcs</strong></td><td>-</td></tr>";

    // TAB 4: PAYMENT
    } else if (currentDayBookTab === "payment") {
        thead.innerHTML = "<tr style='background:#7c3aed; color:white;'><th>Kariger</th><th>Tani / Vivran</th><th>📤 Bhugtan Diya</th></tr>";
        var pRows = [];
        karList.forEach(function(k) {
            getKarigerSheets(k.id).forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.date === d && Number(r.paid) > 0) {
                        pRows.push({ kariger: k.name, tani: sh.title, amount: Number(r.paid) });
                    }
                });
            });
        });

        if (!pRows.length) {
            tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:15px; color:#888;'>Is tarikh me koi payment nahi di gayi.</td></tr>";
        } else {
            var pBuf = "";
            pRows.forEach(function(dp) {
                pBuf += "<tr><td><strong>" + dp.kariger + "</strong></td><td>" + dp.tani + "</td><td style='color:#dc2626; font-weight:700;'>- ₹ " + dp.amount.toFixed(2) + "</td></tr>";
            });
            tbody.innerHTML = pBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Bhugtan:</strong></td><td><strong style='color:#dc2626;'>- ₹ " + pOut.toFixed(2) + "</strong></td></tr>";
    }
}

// 2. DASHBOARD TOTAL BADGES ENGINE
function updateDashboardBadgeTotals() {
    var karList = sanitizeKarigerList();
    setElementText("btn-total-kariger", "Total: " + karList.length);
    setElementText("btn-total-info", "Total: " + safeArray(getStore("info_ledger")).length);

    var ts = 0;
    safeArray(getStore("saree_stock")).forEach(function(s) { if (s) ts += (Number(s.pcs) || 0); });
    setElementText("btn-total-saree", "Stock: " + ts + " Pcs");

    if (badgeCalculationTimer) clearTimeout(badgeCalculationTimer);

    badgeCalculationTimer = setTimeout(function() {
        var tb = 0, seenBana = [];
        safeArray(getStore("bana_stock")).forEach(function(b) {
            if (b && b.name) {
                var nLow = b.name.trim().toLowerCase();
                if (seenBana.indexOf(nLow) === -1) {
                    seenBana.push(nLow);
                    try { tb += Number(getBanaItemStats(b.name, "k_main").bacha || 0); } catch(e) {}
                }
            }
        });
        setElementText("btn-total-bana", "Bacha: " + tb.toFixed(2) + " Kg");

        var tz = 0, seenZari = [];
        safeArray(getStore("zari_stock")).forEach(function(z) {
            if (z && z.name) {
                var nLow = z.name.trim().toLowerCase();
                if (seenZari.indexOf(nLow) === -1) {
                    seenZari.push(nLow);
                    try { tz += Number(getZariItemStats(z.name, "k_main").bacha || 0); } catch(e) {}
                }
            }
        });
        setElementText("btn-total-zari", "Bacha: " + tz.toFixed(2) + " Kg");

        var totalBaki = 0;
        karList.forEach(function(k) {
            var fin = getKarigerFinanceSummary(k.id);
            totalBaki += fin.currentBakaya;
        });
        setElementText("btn-total-payment", "Baki: ₹ " + totalBaki.toFixed(0));
    }, 60);
}

// 3. NAVIGATION HELPERS
function hideAllSections() {
    [
        "dashboard-view", "admin-section", "info-section",
        "kariger-section", "kariger-sheet-section", "bana-section",
        "zari-section", "saree-section", "payment-section", "sancha-section",
        "jobwork-section"
    ].forEach(function(id) {
        setDisplay(id, "none");
    });
}

function backToDashboard() {
    hideAllSections();
    setDisplay("dashboard-view", "block");
    if (typeof populateSessionDropdown === "function") populateSessionDropdown();
    renderDashboardDayBook();
    updateDashboardBadgeTotals();
}

function triggerActiveSectionRefresh() {
    var cur = getCurrentActiveSection();
    if (cur === "dashboard-view") {
        renderDashboardDayBook();
        updateDashboardBadgeTotals();
    } else if (cur === "kariger-section" && typeof renderKarigerTable === "function") {
        renderKarigerTable();
    } else if (cur === "bana-section" && typeof renderBanaTable === "function") {
        renderBanaTable();
    } else if (cur === "zari-section" && typeof renderZariTable === "function") {
        renderZariTable();
    } else if (cur === "saree-section" && typeof renderSareeTable === "function") {
        renderSareeTable();
    } else if (cur === "payment-section" && typeof renderPaymentTable === "function") {
        renderPaymentTable();
    }
}

function getCurrentActiveSection() {
    var sections = [
        "dashboard-view", "admin-section", "info-section", 
        "kariger-section", "kariger-sheet-section", "bana-section", 
        "zari-section", "saree-section", "payment-section", "sancha-section",
        "jobwork-section"
    ];
    for (var i = 0; i < sections.length; i++) {
        var el = document.getElementById(sections[i]);
        if (el && el.style.display === "block") return sections[i];
    }
    return "dashboard-view";
}

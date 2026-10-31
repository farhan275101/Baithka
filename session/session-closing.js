/* ========================================================
   SIMPLICITY ERP - 5-STAGE SEQUENTIAL YEAR-END CLOSING
   File: session/session-closing.js • Developed by Farhan Jawed
   (Accurate Opening Stock + Firebase Lock + Non-Freezing Chunks)
======================================================== */

var pendingTransferNewSession = null;
var stage1_oldKarigers = [];
var stage1_newKarigerSheetsMap = {};
var stage1_idx = 0;
var stage1_chunkSize = 25;

var stage2_newSareeHistory = [];
var stage2_totFreshPcs = 0;
var stage2_totFinPcs = 0;
var stage2_totLottPcs = 0;

var stage3_newBanaStock = [];
var stage3_newZariStock = [];

var stage4_newSanchaItems = [];
var stage4_oldJwWorkers = [];
var stage4_newJwSheetsMap = {};

function startSequentialYearClosing() {
    var curSess = getActiveFinancialSession();
    var newSessEl = document.getElementById("session-new-input");
    var newSess = (newSessEl ? newSessEl.value : "").trim();

    if (!newSess) return alert("Naye Saal ka naam daalein! (Jaise: 2027-2028)");
    if (newSess === curSess) return alert("Naya session purane se alag hona chahiye!");

    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) !== -1) {
        return alert("Ye Session pehle se bana hua hai!");
    }

    closeSessionClosingModal();
    pendingTransferNewSession = newSess;

    var modal = document.getElementById("session-transfer-modal");
    if (!modal) return;

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#e2e8f0; height:10px; margin-bottom:14px; border-radius:5px; overflow:hidden;'>" +
                "<div id='transfer-main-bar' style='background:#2563eb; width:0%; height:100%; transition:width 0.3s;'></div>" +
            "</div>" +
            "<div><span id='stage-badge-1' class='badge-blue'>Waiting</span> <small id='stage-status-1'>1. Kariger Opening Carry-Forward</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-1' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-2' class='badge-blue'>Waiting</span> <small id='stage-status-2'>2. Saree Opening Stock</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-2' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-3' class='badge-blue'>Waiting</span> <small id='stage-status-3'>3. Bana & Zari Opening Stock</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-3' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-4' class='badge-blue'>Waiting</span> <small id='stage-status-4'>4. Sancha & Job Work Carry-Forward</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-4' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-5' class='badge-blue'>Waiting</span> <small id='stage-status-5'>5. Safe Commit & Cloud Lock</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-5' style='background:#2563eb; width:0%; height:100%;'></div></div></div>";
    }

    modal.style.display = "flex";

    setTimeout(function() {
        runStage1_Karigers(curSess, newSess);
    }, 150);
}

// STAGE 1: KARIGER KHATA (25-25 CHUNKS)
function runStage1_Karigers(curSess, newSess) {
    stage1_oldKarigers = safeArray(getStore("kariger_list"));
    stage1_newKarigerSheetsMap = {};
    stage1_idx = 0;

    var badge = document.getElementById("stage-badge-1");
    if (badge) {
        badge.textContent = "⏳ Transferring...";
        badge.style.background = "#eff6ff";
        badge.style.color = "#2563eb";
    }
    processNextKarigerChunk(curSess, newSess);
}

function processNextKarigerChunk(curSess, newSess) {
    var total = stage1_oldKarigers.length;
    var end = Math.min(stage1_idx + stage1_chunkSize, total);

    for (var i = stage1_idx; i < end; i++) {
        var k = stage1_oldKarigers[i];
        if (!k || !k.id) continue;
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        var lastSheet = sheets.length ? sheets[sheets.length - 1] : null;
        var calc = (lastSheet && typeof calculateSheetTotals === "function")
            ? calculateSheetTotals(lastSheet)
            : { remainingBana: 0, remainingZari: 0, remainingAmt: 0 };

        stage1_newKarigerSheetsMap[k.id] = [{
            id: "tani_1",
            title: "Tani 1 (Opening " + newSess + ")",
            pichlaBana: Number((calc.remainingBana || 0).toFixed(2)),
            pichlaZari: Number((calc.remainingZari || 0).toFixed(2)),
            pichlaBani: Number((calc.remainingAmt || 0).toFixed(2)),
            banaWaste: 0,
            zariWaste: 0,
            rateBana: lastSheet ? (Number(lastSheet.rateBana) || 0.311) : 0.311,
            rateZari: lastSheet ? (Number(lastSheet.rateZari) || 0.110) : 0.110,
            rateBani: lastSheet ? (Number(lastSheet.rateBani) || 240) : 240,
            note: "📦 31st March (" + curSess + ") Closing se Aaya Opening Balance",
            rows: []
        }];
    }

    stage1_idx = end;
    var pct = total > 0 ? Math.floor((stage1_idx / total) * 100) : 100;
    var bar1 = document.getElementById("stage-bar-1");
    var status1 = document.getElementById("stage-status-1");
    var mainBar = document.getElementById("transfer-main-bar");

    if (bar1) bar1.style.width = pct + "%";
    if (status1) status1.textContent = "⏳ " + stage1_idx + " / " + total + " Kariger Done (" + pct + "%)";
    if (mainBar) mainBar.style.width = Math.floor(pct * 0.25) + "%";

    if (stage1_idx < total) {
        setTimeout(function() { processNextKarigerChunk(curSess, newSess); }, 20);
    } else {
        var badge1 = document.getElementById("stage-badge-1");
        if (badge1) {
            badge1.textContent = "✅ Done (" + total + ")";
            badge1.style.background = "#ecfdf5";
            badge1.style.color = "#059669";
        }
        setTimeout(function() { runStage2_SareeStock(curSess, newSess); }, 150);
    }
}

// STAGE 2: SAREE STOCK
function runStage2_SareeStock(curSess, newSess) {
    var rawHistory = safeArray(getStore("saree_history"));
    var freshMap = {}, finMap = {}, lottMap = {};

    rawHistory.forEach(function(h) {
        if (!h) return;
        var t = (h.type || "fresh").toLowerCase();
        var sName = (h.sareeName || h.name || "Saree").trim();
        var kName = (h.karigerName || h.kariger || "Karkhana").trim();
        var kId = h.karkhanaId || "k_main";
        var key = sName + "___" + kName + "___" + kId;

        var inQ = Number(h.aai !== undefined ? h.aai : (h.pcs || 0));
        var outQ = Number(h.gai || 0);
        var diff = inQ - outQ;

        if (t === "fresh") freshMap[key] = (freshMap[key] || 0) + diff;
        else if (t === "finished") finMap[key] = (finMap[key] || 0) + diff;
        else if (t === "lott") lottMap[key] = (lottMap[key] || 0) + diff;
    });

    stage2_newSareeHistory = [];
    stage2_totFreshPcs = 0;
    stage2_totFinPcs = 0;
    stage2_totLottPcs = 0;

    for (var kf in freshMap) {
        var bachi = Math.max(0, freshMap[kf]);
        if (bachi > 0) {
            stage2_totFreshPcs += bachi;
            var parts = kf.split("___");
            stage2_newSareeHistory.push({
                id: "saree_open_f_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                date: getTodayDate(),
                sareeName: parts[0],
                karigerName: parts[1],
                kariger: parts[1],
                karkhanaId: parts[2] || "k_main",
                type: "fresh",
                typeLabel: "📦 Opening Stock (" + curSess + " Se Aaya)",
                aai: bachi,
                gai: 0,
                isOut: false,
                isOpening: true,
                note: "Opening Stock"
            });
        }
    }

    for (var kfin in finMap) {
        var bachiFin = Math.max(0, finMap[kfin]);
        if (bachiFin > 0) {
            stage2_totFinPcs += bachiFin;
            var partsFin = kfin.split("___");
            stage2_newSareeHistory.push({
                id: "saree_open_fin_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                date: getTodayDate(),
                sareeName: partsFin[0],
                karigerName: partsFin[1],
                kariger: partsFin[1],
                karkhanaId: partsFin[2] || "k_main",
                type: "finished",
                typeLabel: "📦 Opening Finished (" + curSess + " Se Aaya)",
                aai: bachiFin,
                gai: 0,
                isOut: false,
                isOpening: true,
                note: "Opening Finished"
            });
        }
    }

    for (var kl in lottMap) {
        var bachiLott = Math.max(0, lottMap[kl]);
        if (bachiLott > 0) {
            stage2_totLottPcs += bachiLott;
            var partsL = kl.split("___");
            stage2_newSareeHistory.push({
                id: "saree_open_l_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                date: getTodayDate(),
                sareeName: partsL[0],
                karigerName: partsL[1],
                kariger: partsL[1],
                karkhanaId: partsL[2] || "k_main",
                type: "lott",
                typeLabel: "📦 Opening Damage/Lott (" + curSess + " Se Aaya)",
                aai: bachiLott,
                gai: 0,
                isOut: false,
                isOpening: true,
                note: "Opening Lott"
            });
        }
    }

    var bar2 = document.getElementById("stage-bar-2");
    var badge2 = document.getElementById("stage-badge-2");
    var status2 = document.getElementById("stage-status-2");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar2) bar2.style.width = "100%";
    if (mainBar) mainBar.style.width = "50%";
    if (status2) status2.textContent = "✅ Fresh: " + stage2_totFreshPcs + " | Finished: " + stage2_totFinPcs + " Pcs";
    if (badge2) { badge2.textContent = "✅ Done"; badge2.style.background = "#ecfdf5"; badge2.style.color = "#059669"; }

    setTimeout(function() { runStage3_BanaZariStock(curSess, newSess); }, 150);
}

// STAGE 3: BANA & ZARI STOCK FREEZE
function runStage3_BanaZariStock(curSess, newSess) {
    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    stage3_newBanaStock = [];
    var banaItems = safeArray(getStore("bana_stock"));
    var seenBana = [];

    banaItems.forEach(function(b) {
        if (!b || !b.name) return;
        var nLow = b.name.trim().toLowerCase();
        if (seenBana.indexOf(nLow) === -1) {
            seenBana.push(nLow);
            karkhanas.forEach(function(k) {
                var bacha = 0;
                if (typeof getBanaItemStats === "function") {
                    try { bacha = Number(getBanaItemStats(b.name, k.id).bacha || 0); } catch(e) {}
                } else {
                    bacha = Number(b.bacha || b.aaya || 0);
                }
                if (bacha > 0) {
                    stage3_newBanaStock.push({
                        id: "bana_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                        name: b.name.trim(),
                        date: getTodayDate(),
                        aaya: bacha,
                        openingAaya: bacha,
                        gaya: 0,
                        bacha: bacha,
                        karkhanaId: k.id,
                        isOpening: true,
                        note: "📦 Opening Stock (" + curSess + " Se Aaya)"
                    });
                }
            });
        }
    });

    stage3_newZariStock = [];
    var zariItems = safeArray(getStore("zari_stock"));
    var seenZari = [];

    zariItems.forEach(function(z) {
        if (!z || !z.name) return;
        var nLowZ = z.name.trim().toLowerCase();
        if (seenZari.indexOf(nLowZ) === -1) {
            seenZari.push(nLowZ);
            karkhanas.forEach(function(k) {
                var bachaZ = 0;
                if (typeof getZariItemStats === "function") {
                    try { bachaZ = Number(getZariItemStats(z.name, k.id).bacha || 0); } catch(e) {}
                } else {
                    bachaZ = Number(z.bacha || z.aaya || 0);
                }
                if (bachaZ > 0) {
                    stage3_newZariStock.push({
                        id: "zari_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                        name: z.name.trim(),
                        date: getTodayDate(),
                        aaya: bachaZ,
                        openingAaya: bachaZ,
                        gaya: 0,
                        bacha: bachaZ,
                        karkhanaId: k.id,
                        isOpening: true,
                        note: "📦 Opening Stock (" + curSess + " Se Aaya)"
                    });
                }
            });
        }
    });

    var bar3 = document.getElementById("stage-bar-3");
    var badge3 = document.getElementById("stage-badge-3");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar3) bar3.style.width = "100%";
    if (mainBar) mainBar.style.width = "75%";
    if (badge3) { badge3.textContent = "✅ Done"; badge3.style.background = "#ecfdf5"; badge3.style.color = "#059669"; }

    setTimeout(function() { runStage4_SanchaAndJobwork(curSess, newSess); }, 150);
}

// STAGE 4: SANCHA & JOB WORK CARRY-FORWARD
function runStage4_SanchaAndJobwork(curSess, newSess) {
    stage4_newSanchaItems = safeArray(getStore("sancha_items")).map(function(s) {
        var bacha = Number(s.bacha !== undefined ? s.bacha : (s.aaya || 0));
        return {
            id: s.id,
            name: s.name,
            category: s.category || "tani",
            aaya: bacha,
            gaya: 0,
            bacha: bacha,
            date: getTodayDate(),
            karkhanaId: s.karkhanaId || "k_main",
            note: "📦 Opening (" + curSess + " Se Aaya)"
        };
    });

    stage4_oldJwWorkers = safeArray(getStore("jobwork_workers"));
    stage4_newJwSheetsMap = {};

    stage4_oldJwWorkers.forEach(function(w) {
        if (!w || !w.id) return;
        var sheets = safeArray(getStore("jobwork_sheets_" + w.id));
        var lastSh = sheets.length ? sheets[sheets.length - 1] : null;
        var pSaree = 0;
        if (lastSh && typeof calculateJobWorkSheetTotals === "function") {
            pSaree = calculateJobWorkSheetTotals(lastSh).pendingSaree || 0;
        }
        stage4_newJwSheetsMap[w.id] = [{
            id: "jws_open_1",
            title: "Khata 1 (Opening " + newSess + ")",
            closingPendingSaree: pSaree,
            closingBakiAmt: 0,
            rows: []
        }];
    });

    var bar4 = document.getElementById("stage-bar-4");
    var badge4 = document.getElementById("stage-badge-4");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar4) bar4.style.width = "100%";
    if (mainBar) mainBar.style.width = "90%";
    if (badge4) { badge4.textContent = "✅ Done"; badge4.style.background = "#ecfdf5"; badge4.style.color = "#059669"; }

    setTimeout(function() { commitStage5_Finalize(curSess, newSess); }, 150);
}

// STAGE 5: SAVE TO NEW SESSION & FIREBASE LOCK
function commitStage5_Finalize(curSess, newSess) {
    var uId = (typeof currentUserId !== "undefined" && currentUserId) ? currentUserId : "app";
    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) === -1) sessions.push(newSess);

    // Save session pointers to LocalStorage & Memory
    localStorage.setItem(uId + "_app_sessions_list", JSON.stringify(sessions));
    localStorage.setItem(uId + "_app_active_session", newSess);
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE[uId + "_app_sessions_list"] = sessions;
        APP_MEMORY_CACHE[uId + "_app_active_session"] = newSess;
    }
    if (typeof idbPut === "function") {
        idbPut(uId + "_app_sessions_list", sessions);
        idbPut(uId + "_app_active_session", newSess);
    }

    // 🚨 FIREBASE ACTIVE SESSION LOCK (Prevents Jumping Back)
    if (typeof db !== "undefined" && db && uId) {
        try {
            db.ref("users/" + uId + "/app_active_session").set(newSess);
            db.ref("users/" + uId + "/app_sessions_list").set(sessions);
        } catch(e) {}
    }

    var setTargetStore = function(key, data) {
        var fullKey = uId + "_" + newSess + "_" + key;
        if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[fullKey] = data;
        if (typeof idbPut === "function") idbPut(fullKey, data);
        try { localStorage.setItem(fullKey, JSON.stringify(data)); } catch(e) {}
        if (typeof db !== "undefined" && db && uId) {
            try { db.ref("users/" + uId + "/" + newSess + "_" + key).set(data); } catch(e) {}
        }
    };

    setTargetStore("kariger_list", stage1_oldKarigers);
    for (var kId in stage1_newKarigerSheetsMap) {
        setTargetStore("kariger_sheets_" + kId, stage1_newKarigerSheetsMap[kId]);
    }

    setTargetStore("saree_history", stage2_newSareeHistory);
    setTargetStore("bana_stock", stage3_newBanaStock);
    setTargetStore("bana_history", []);
    setTargetStore("zari_stock", stage3_newZariStock);
    setTargetStore("zari_history", []);

    setTargetStore("sancha_items", stage4_newSanchaItems);
    setTargetStore("sancha_history", []);

    setTargetStore("jobwork_workers", stage4_oldJwWorkers);
    for (var wId in stage4_newJwSheetsMap) {
        setTargetStore("jobwork_sheets_" + wId, stage4_newJwSheetsMap[wId]);
    }
    setTargetStore("jw_bills_list", []);
    setTargetStore("jw_payments_list", []);
    setTargetStore("dukan_transfer_history", []);

    var bar5 = document.getElementById("stage-bar-5");
    var badge5 = document.getElementById("stage-badge-5");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar5) bar5.style.width = "100%";
    if (mainBar) mainBar.style.width = "100%";
    if (badge5) { badge5.textContent = "✅ Complete"; badge5.style.background = "#ecfdf5"; badge5.style.color = "#059669"; }

    // 🎉 CELEBRATION WISH SCREEN
    setTimeout(function() {
        var modal = document.getElementById("session-transfer-modal");
        if (!modal) return;
        var modalBody = modal.querySelector(".modal-body");
        if (modalBody) {
            modalBody.innerHTML = 
                "<div style='text-align:center; padding:15px; animation:fadeIn 0.4s ease;'>" +
                    "<div style='font-size:55px; margin-bottom:8px;'>🎉 ✨ 🚀</div>" +
                    "<h2 style='color:#1e3a8a; font-size:22px; font-weight:800; margin-bottom:6px;'>NAYA SAAL MUBARAK HO!</h2>" +
                    "<p style='color:#059669; font-size:14px; font-weight:700;'>Session '" + newSess + "' Successfully Start Ho Gaya Hai!</p>" +
                    "<div style='background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px; margin:16px 0; text-align:left; font-size:13px; display:grid; grid-template-columns:1fr 1fr; gap:8px;'>" +
                        "<div>🧵 <strong>Kariger Carry:</strong> " + stage1_oldKarigers.length + " Kariger</div>" +
                        "<div>🥻 <strong>Saree Opening:</strong> " + stage2_totFreshPcs + " Fresh Pcs</div>" +
                        "<div>🧶 <strong>Bana Items:</strong> " + stage3_newBanaStock.length + " Items Safe</div>" +
                        "<div>✨ <strong>Zari Items:</strong> " + stage3_newZariStock.length + " Items Safe</div>" +
                        "<div>⚙️ <strong>Sancha Stock:</strong> Carry Forward</div>" +
                        "<div>✂️ <strong>Job Work Khata:</strong> Carry Forward</div>" +
                    "</div>" +
                    "<p style='font-size:12px; color:#64748b; margin-bottom:15px;'>* Pichla saal safely freeze ho chuka hai. Aap jab chahein session dropdown se purana hisab dekh sakte hain.</p>" +
                    "<button class='btn' style='background:linear-gradient(135deg, #10b981, #059669); font-size:15px; font-weight:bold; padding:12px; cursor:pointer;' onclick='completeNewSessionStartup(\"" + newSess + "\")'>🚀 Naye Saal Me Kaam Shuru Karein</button>" +
                "</div>";
        }
    }, 400);
}

function completeNewSessionStartup(targetSess) {
    var modal = document.getElementById("session-transfer-modal");
    if (modal) modal.style.display = "none";

    var uId = (typeof currentUserId !== "undefined" && currentUserId) ? currentUserId : "app";
    var s = targetSess || pendingTransferNewSession || getActiveFinancialSession();

    localStorage.setItem(uId + "_app_active_session", s);
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE[uId + "_app_active_session"] = s;
    }
    if (typeof idbPut === "function") idbPut(uId + "_app_active_session", s);

    if (typeof db !== "undefined" && db && uId) {
        try { db.ref("users/" + uId + "/app_active_session").set(s); } catch(e) {}
    }

    populateSessionDropdown();
    var sel = document.getElementById("app-session-select");
    if (sel) sel.value = s;

    if (typeof clearMemoryCache === "function") clearMemoryCache();
    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[uId + "_app_active_session"] = s;

    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            if (typeof triggerActiveSectionRefresh === "function") triggerActiveSectionRefresh();
            if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
        });
    } else {
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
        if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    }
}

/* ========================================================
   SIMPLICITY ERP - 5-STAGE SEQUENTIAL YEAR-END CLOSING
   File: session/session-closing.js • Developed by Farhan Jawed
   (Safe 25-Kariger Non-Freezing Chunks + IndexedDB Commit)
======================================================== */

var pendingTransferNewSession = null;
var stage1_oldKarigers = [];
var stage1_newKarigerSheetsMap = {};
var stage1_idx = 0;
var stage1_chunkSize = 25; // 2000+ kariger ke liye fastest & non-freezing size

var stage2_newSareeStock = [];
var stage2_newFinStock = [];
var stage2_newLottStock = [];

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

    setDisplay("session-transfer-modal", "flex");
    setDisplay("transfer-progress-view", "block");

    for (var i = 1; i <= 5; i++) {
        var bar = document.getElementById("stage-bar-" + i);
        var badge = document.getElementById("stage-badge-" + i);
        var status = document.getElementById("stage-status-" + i);
        if (bar) bar.style.width = "0%";
        if (badge) {
            badge.textContent = "⏸️ Waiting";
            badge.style.background = "#e2e8f0";
            badge.style.color = "#64748b";
        }
        if (status) status.textContent = "Wait kar raha hai...";
    }
    var mainBar = document.getElementById("transfer-main-bar");
    if (mainBar) mainBar.style.width = "0%";

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
    if (mainBar) mainBar.style.width = Math.floor(pct * 0.3) + "%";

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
    var karkhanas = (typeof getKarkhanasSafe === "function") ? getKarkhanasSafe() : safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allSarees = safeArray(getStore("saree_stock"));
    stage2_newSareeStock = [];

    karkhanas.forEach(function(k) {
        var kPcs = 0;
        allSarees.forEach(function(s) {
            var matchK = (String(s.karkhanaId) === String(k.id)) || (!s.karkhanaId && k.isDefault);
            if (matchK) kPcs += (Number(s.pcs) || 0);
        });
        if (kPcs > 0) {
            stage2_newSareeStock.push({
                id: "saree_open_" + k.id + "_" + Date.now(),
                date: getTodayDate(),
                name: "Fresh Saree Opening Stock",
                kariger: "📦 Opening (" + curSess + " Se Aaya)",
                karkhanaId: k.id,
                karkhanaName: k.name,
                pcs: kPcs,
                openingPcs: kPcs,
                outPcs: 0,
                isOpening: true
            });
        }
    });

    var finTotalPcs = 0;
    safeArray(getStore("finished_saree_stock")).forEach(function(f) { finTotalPcs += (Number(f.pcs) || 0); });
    stage2_newFinStock = [];
    if (finTotalPcs > 0) {
        stage2_newFinStock.push({
            id: "fin_open_" + Date.now(),
            date: getTodayDate(),
            name: "Calender Finished Saree",
            source: "📦 Opening (" + curSess + " Se Aaya)",
            pcs: finTotalPcs,
            openingPcs: finTotalPcs,
            isOpening: true
        });
    }

    var allLott = safeArray(getStore("lott_saree_stock"));
    stage2_newLottStock = [];
    karkhanas.forEach(function(k) {
        var lPcs = 0;
        allLott.forEach(function(l) {
            var matchL = (String(l.karkhanaId) === String(k.id)) || (!l.karkhanaId && k.isDefault);
            if (matchL) lPcs += (Number(l.pcs) || 0);
        });
        if (lPcs > 0) {
            stage2_newLottStock.push({
                id: "lott_open_" + k.id + "_" + Date.now(),
                date: getTodayDate(),
                name: "Damage Saree Opening Stock",
                source: "📦 Opening (" + curSess + " Se Aaya)",
                karkhanaId: k.id,
                karkhanaName: k.name,
                pcs: lPcs,
                openingPcs: lPcs,
                isOpening: true
            });
        }
    });

    var bar2 = document.getElementById("stage-bar-2");
    var badge2 = document.getElementById("stage-badge-2");
    if (bar2) bar2.style.width = "100%";
    if (badge2) { badge2.textContent = "✅ Done"; badge2.style.background = "#ecfdf5"; badge2.style.color = "#059669"; }

    setTimeout(function() { runStage3_BanaZariStock(curSess, newSess); }, 150);
}

// STAGE 3: BANA & ZARI STOCK FREEZE
function runStage3_BanaZariStock(curSess, newSess) {
    var karkhanas = (typeof getKarkhanasSafe === "function") ? getKarkhanasSafe() : safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    stage3_newBanaStock = [];
    var banaItems = safeArray(getStore("bana_stock"));
    var uniqueBanaNames = [];

    banaItems.forEach(function(b) {
        if (b && b.name && uniqueBanaNames.indexOf(b.name.trim().toLowerCase()) === -1) {
            uniqueBanaNames.push(b.name.trim().toLowerCase());
        }
    });

    uniqueBanaNames.forEach(function(bNameLow) {
        var orig = banaItems.find(function(x) { return x && x.name && x.name.trim().toLowerCase() === bNameLow; });
        var dName = orig ? orig.name : bNameLow;
        karkhanas.forEach(function(k) {
            var bacha = 0;
            if (typeof getBanaItemStats === "function") {
                try { bacha = getBanaItemStats(dName, k.id).bacha; } catch(e) {}
            }
            if (bacha > 0) {
                stage3_newBanaStock.push({
                    id: Date.now() + Math.random(),
                    name: dName,
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
    });

    stage3_newZariStock = [];
    var zariItems = safeArray(getStore("zari_stock"));
    var uniqueZariNames = [];

    zariItems.forEach(function(z) {
        if (z && z.name && uniqueZariNames.indexOf(z.name.trim().toLowerCase()) === -1) {
            uniqueZariNames.push(z.name.trim().toLowerCase());
        }
    });

    uniqueZariNames.forEach(function(zNameLow) {
        var origZ = zariItems.find(function(x) { return x && x.name && x.name.trim().toLowerCase() === zNameLow; });
        var dNameZ = origZ ? origZ.name : zNameLow;
        karkhanas.forEach(function(k) {
            var bachaZ = 0;
            if (typeof getZariItemStats === "function") {
                try { bachaZ = getZariItemStats(dNameZ, k.id).bacha; } catch(e) {}
            }
            if (bachaZ > 0) {
                stage3_newZariStock.push({
                    id: Date.now() + Math.random(),
                    name: dNameZ,
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
    });

    var bar3 = document.getElementById("stage-bar-3");
    var badge3 = document.getElementById("stage-badge-3");
    if (bar3) bar3.style.width = "100%";
    if (badge3) { badge3.textContent = "✅ Done"; badge3.style.background = "#ecfdf5"; badge3.style.color = "#059669"; }

    setTimeout(function() { runStage4_SanchaAndJobwork(curSess, newSess); }, 150);
}

// STAGE 4: SANCHA & JOB WORK CARRY-FORWARD
function runStage4_SanchaAndJobwork(curSess, newSess) {
    stage4_newSanchaItems = safeArray(getStore("sancha_items")).map(function(s) {
        return {
            id: s.id,
            name: s.name,
            totalQty: s.totalQty || 0,
            date: getTodayDate(),
            karkhanaId: s.karkhanaId || "k_main"
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
    if (bar4) bar4.style.width = "100%";
    if (badge4) { badge4.textContent = "✅ Done"; badge4.style.background = "#ecfdf5"; badge4.style.color = "#059669"; }

    setTimeout(function() { commitStage5_Finalize(curSess, newSess); }, 150);
}

// STAGE 5: SAVE TO NEW SESSION & SWITCH
function commitStage5_Finalize(curSess, newSess) {
    var uId = getSafeUserId();
    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) === -1) sessions.push(newSess);
    localStorage.setItem(uId + "_app_sessions_list", JSON.stringify(sessions));

    var setTargetStore = function(key, data) {
        var fullKey = uId + "_" + newSess + "_" + key;
        if (typeof APP_MEMORY_CACHE !== "undefined") {
            APP_MEMORY_CACHE[fullKey] = data;
        }
        // Asli Bada Database: IndexedDB
        if (typeof idbPut === "function") {
            try { idbPut(fullKey, data); } catch(e) {}
        }
        // LocalStorage fallback
        try { 
            localStorage.setItem(fullKey, JSON.stringify(data)); 
        } catch(e) {}

        // Firebase Cloud Sync
        if (typeof db !== "undefined" && db && uId) {
            try { db.ref("users/" + uId + "/" + newSess + "_" + key).set(data); } catch(e) {}
        }
    };

    setTargetStore("kariger_list", stage1_oldKarigers);
    for (var kId in stage1_newKarigerSheetsMap) {
        setTargetStore("kariger_sheets_" + kId, stage1_newKarigerSheetsMap[kId]);
    }
    setTargetStore("saree_stock", stage2_newSareeStock);
    setTargetStore("finished_saree_stock", stage2_newFinStock);
    setTargetStore("lott_saree_stock", stage2_newLottStock);
    setTargetStore("bana_stock", stage3_newBanaStock);
    setTargetStore("zari_stock", stage3_newZariStock);
    setTargetStore("sancha_items", stage4_newSanchaItems);
    setTargetStore("jobwork_workers", stage4_oldJwWorkers);
    for (var wId in stage4_newJwSheetsMap) {
        setTargetStore("jobwork_sheets_" + wId, stage4_newJwSheetsMap[wId]);
    }

    localStorage.setItem(uId + "_app_active_session", newSess);

    var bar5 = document.getElementById("stage-bar-5");
    var badge5 = document.getElementById("stage-badge-5");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar5) bar5.style.width = "100%";
    if (mainBar) mainBar.style.width = "100%";
    if (badge5) { badge5.textContent = "✅ Complete"; badge5.style.background = "#ecfdf5"; badge5.style.color = "#059669"; }

    setTimeout(function() {
        setDisplay("session-transfer-modal", "none");
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
        alert("🎉 NAYA SAAL MUBARAK HO!\nSession '" + newSess + "' successfully chalu ho gaya!");
    }, 400);
}

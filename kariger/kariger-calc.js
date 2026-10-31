/* ========================================================
   SIMPLICITY ERP - KARIGER CALCULATION ENGINE
   File: kariger/kariger-calc.js • Developed by Farhan Jawed
   (Formulas, Wastage, Mazdoori, Less TP & Topi Engine)
======================================================== */

// 1. TANI SHEETS GET & SAVE
function getKarigerSheets(karigerId) {
    if (!karigerId) return [];
    var sheets = safeArray(getStore("kariger_sheets_" + karigerId));
    sheets.forEach(function(sh) { if (sh) sh.rows = safeArray(sh.rows); });
    return sheets;
}

function saveKarigerSheets(karigerId, sheets) {
    if (!karigerId) return;
    var clean = safeArray(sheets);
    clean.forEach(function(sh) { if (sh) sh.rows = safeArray(sh.rows); });
    setStore("kariger_sheets_" + karigerId, clean);
}

// 2. CORE CALCULATION FORMULAS (MATCHES SCREENSHOT 1 & 2)
function calculateSheetTotals(sh) {
    var def = { 
        totSaree: 0, totLott: 0, netSaree: 0, grossBani: 0, totPaid: 0, remainingAmt: 0, 
        totTaniWazan: 0, totBana: 0, retBana: 0, banaConsumption: 0, banaWaste: 0, remainingBana: 0, 
        totZari: 0, retZari: 0, zariConsumption: 0, zariWaste: 0, remainingZari: 0 
    };
    if (!sh || typeof sh !== "object") return def;

    var saree = 0, lott = 0, paid = 0, netB = 0, retB = 0, netZ = 0, retZ = 0, taniW = 0;
    safeArray(sh.rows).forEach(function(r) {
        if (!r) return;
        saree += (Number(r.saree) || 0);
        lott += (Number(r.lott) || 0);
        paid += (Number(r.paid) || 0);
        netB += (Number(r.netBana) || 0);
        retB += (Number(r.retBana) || 0);
        netZ += (Number(r.netZari) || 0);
        retZ += (Number(r.retZari) || 0);
        taniW += (Number(r.taniWazan) || 0);
    });

    // Mazdoori Hisab
    var netSaree = Math.max(0, saree - lott);
    var rateBani = (sh.rateBani !== undefined) ? Number(sh.rateBani) : 240;
    var grossBani = netSaree * rateBani;
    var pichlaBani = Number(sh.pichlaBani) || 0;
    var remAmt = (grossBani + pichlaBani) - paid;

    // Bana Hisab
    var rateB = (sh.rateBana !== undefined) ? Number(sh.rateBana) : 0.311;
    var banaCons = saree * rateB;
    var pichlaB = Number(sh.pichlaBana) || 0;
    var bWaste = Number(sh.banaWaste) || 0;
    var remBana = (pichlaB + netB) - (retB + banaCons + bWaste);

    // Zari Hisab
    var rateZ = (sh.rateZari !== undefined) ? Number(sh.rateZari) : 0.110;
    var zariCons = saree * rateZ;
    var pichlaZ = Number(sh.pichlaZari) || 0;
    var zWaste = Number(sh.zariWaste) || 0;
    var remZari = (pichlaZ + netZ) - (retZ + zariCons + zWaste);

    return {
        totSaree: saree, totLott: lott, netSaree: netSaree, grossBani: grossBani, totPaid: paid, remainingAmt: remAmt,
        totTaniWazan: Number(taniW.toFixed(2)),
        totBana: Number(netB.toFixed(2)), retBana: Number(retB.toFixed(2)), banaConsumption: Number(banaCons.toFixed(2)), banaWaste: bWaste, remainingBana: Number(remBana.toFixed(2)),
        totZari: Number(netZ.toFixed(2)), retZari: Number(retZ.toFixed(2)), zariConsumption: Number(zariCons.toFixed(2)), zariWaste: zWaste, remainingZari: Number(remZari.toFixed(2))
    };
}

// 3. KARIGER ACTIVITY & ABSENT CALCULATION
function getKarigerLastActiveInfo(karigerId) {
    var sheets = getKarigerSheets(karigerId);
    var latestDate = null;
    sheets.forEach(function(sh) {
        if (sh && sh.rows) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.date && (!latestDate || r.date > latestDate)) latestDate = r.date;
            });
        }
    });
    var k = safeArray(getStore("kariger_list")).find(function(x) { return String(x.id) === String(karigerId); });
    if (!latestDate) latestDate = (k && k.date) ? k.date : null;
    if (!latestDate) return { lastDate: "-", daysAbsent: 0 };
    var diffDays = Math.floor((new Date(getTodayDate()) - new Date(latestDate)) / (1000 * 60 * 60 * 24));
    return { lastDate: latestDate, daysAbsent: Math.max(0, diffDays) };
}

// 4. OVERALL FINANCE SUMMARY
function getKarigerFinanceSummary(karId) {
    var sheets = getKarigerSheets(karId);
    var totalMazdoori = 0, totalPaidEver = 0, currentBakaya = 0;
    if (!sheets || !sheets.length) return { totalMazdoori: 0, totalPaid: 0, currentBakaya: 0 };

    sheets.forEach(function(sh, sIdx) {
        if (!sh) return;
        var c = calculateSheetTotals(sh);
        totalMazdoori += c.grossBani;
        if (sIdx === 0) totalMazdoori += (Number(sh.pichlaBani) || 0);
        totalPaidEver += c.totPaid;
    });

    var latestSheet = sheets[sheets.length - 1];
    if (latestSheet) {
        var latestCalc = calculateSheetTotals(latestSheet);
        currentBakaya = latestCalc.remainingAmt;
    }

    return {
        totalMazdoori: Number(totalMazdoori.toFixed(2)),
        totalPaid: Number(totalPaidEver.toFixed(2)),
        currentBakaya: Number(currentBakaya.toFixed(2))
    };
}

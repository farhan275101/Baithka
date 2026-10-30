/* ========================================================
   SIMPLICITY ERP - KARIGER CALCULATION ENGINE
   File: kariger/kariger-calc.js • Developed by Farhan Jawed
   (Less TP, Topi, Wastage, Mazdoori & Sheet Formula Engine)
======================================================== */

// 1. TANI SHEETS GET & SAVE
function getKarigerSheets(karId) {
    if (!karId) return [];
    var sheets = safeArray(getStore("kariger_sheets_" + karId));
    if (!sheets.length) {
        sheets = [{
            id: "tani_1",
            title: "Tani 1",
            pichlaBana: 0,
            pichlaZari: 0,
            pichlaBani: 0,
            banaWaste: 0,
            zariWaste: 0,
            rateBana: 0.311,
            rateZari: 0.110,
            rateBani: 240,
            note: "",
            rows: []
        }];
        setStore("kariger_sheets_" + karId, sheets);
    }
    sheets.forEach(function(sh) {
        if (sh) sh.rows = safeArray(sh.rows);
    });
    return sheets;
}

function saveKarigerSheets(karId, sheets) {
    if (!karId) return;
    var clean = safeArray(sheets);
    clean.forEach(function(sh) {
        if (sh) sh.rows = safeArray(sh.rows);
    });
    setStore("kariger_sheets_" + karId, clean);
}

// 2. TANI SHEET TOTAL CALCULATION (CORE FORMULAS)
function calculateSheetTotals(sh) {
    var def = {
        totSaree: 0, totNetBana: 0, totNetZari: 0, totPaid: 0,
        totRetBana: 0, totRetZari: 0, grossBani: 0,
        remainingBana: 0, remainingZari: 0, remainingAmt: 0
    };
    if (!sh || typeof sh !== "object") return def;

    var sPcs = 0, nBana = 0, nZari = 0, paid = 0, retB = 0, retZ = 0;

    safeArray(sh.rows).forEach(function(r) {
        if (!r) return;
        sPcs += (Number(r.saree) || 0);
        nBana += (Number(r.netBana) || 0);
        nZari += (Number(r.netZari) || 0);
        paid += (Number(r.paid) || 0);
        retB += (Number(r.retBana) || 0);
        retZ += (Number(r.retZari) || 0);
    });

    var rBana = Number(sh.rateBana) || 0.311;
    var rZari = Number(sh.rateZari) || 0.110;
    var rBani = Number(sh.rateBani) || 240;

    var pBana = Number(sh.pichlaBana) || 0;
    var pZari = Number(sh.pichlaZari) || 0;
    var pBani = Number(sh.pichlaBani) || Number(sh.closingBani) || 0;

    var wBana = Number(sh.banaWaste) || 0;
    var wZari = Number(sh.zariWaste) || 0;

    // Formulas
    var expectedBanaUsed = (sPcs * rBana) + wBana;
    var expectedZariUsed = (sPcs * rZari) + wZari;

    var remBana = (pBana + nBana) - (expectedBanaUsed + retB);
    var remZari = (pZari + nZari) - (expectedZariUsed + retZ);

    var grossBani = sPcs * rBani;
    var remAmt = (pBani + grossBani) - paid;

    return {
        totSaree: sPcs,
        totNetBana: Number(nBana.toFixed(2)),
        totNetZari: Number(nZari.toFixed(2)),
        totPaid: Number(paid.toFixed(2)),
        totRetBana: Number(retB.toFixed(2)),
        totRetZari: Number(retZ.toFixed(2)),
        grossBani: Number(grossBani.toFixed(2)),
        remainingBana: Number(remBana.toFixed(2)),
        remainingZari: Number(remZari.toFixed(2)),
        remainingAmt: Number(remAmt.toFixed(2))
    };
}

// 3. KARIGER OVERALL FINANCE SUMMARY (MULTI-KARKHANA SAFE)
function getKarigerFinanceSummary(karId, targetKarkhanaId) {
    var sheets = getKarigerSheets(karId);
    var totalMazdoori = 0;
    var totalPaidEver = 0;
    var currentBakaya = 0;

    if (!sheets || !sheets.length) {
        return { totalMazdoori: 0, totalPaid: 0, currentBakaya: 0 };
    }

    sheets.forEach(function(sh, sIdx) {
        if (!sh) return;
        var c = calculateSheetTotals(sh);
        totalMazdoori += c.grossBani;
        if (sIdx === 0) {
            totalMazdoori += (Number(sh.pichlaBani) || Number(sh.closingBani) || 0);
        }
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

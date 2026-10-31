/* ========================================================
   SIMPLICITY ERP - KARIGER CALCULATION ENGINE
   File: kariger/kariger-calc.js
======================================================== */

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
    var pBani = Number(sh.pichlaBani) || 0;

    var wBana = Number(sh.banaWaste) || 0;
    var wZari = Number(sh.zariWaste) || 0;

    var expBana = (sPcs * rBana) + wBana;
    var expZari = (sPcs * rZari) + wZari;

    var remBana = (pBana + nBana) - (expBana + retB);
    var remZari = (pZari + nZari) - (expZari + retZ);

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

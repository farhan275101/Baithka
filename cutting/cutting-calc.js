/* ========================================================
   SIMPLICITY ERP - BOOTI CUTTING CALCULATION ENGINE
   File: cutting/cutting-calc.js • Developed by Farhan Jawed
   (Pending Saree Formula, Absent Days & Live Cutting Pool)
======================================================== */

// 1. GET & SAVE CUTTING WORKERS
function getCuttingWorkers() {
    return safeArray(getStore("jobwork_workers")).filter(function(w) {
        return w && w.type === "cutting";
    });
}

// 2. CUTTING SHEET TOTALS FORMULA
function calculateCuttingSheetTotals(sh) {
    var def = {
        closingPendingSaree: 0,
        totGayiQty: 0,
        totAayiQty: 0,
        totDamageAmt: 0,
        totDamagePcs: 0,
        pendingSaree: 0
    };
    if (!sh || typeof sh !== "object") return def;

    var gayiQ = 0, aayiQ = 0, dmgAmt = 0, dmgPcs = 0;

    safeArray(sh.rows).forEach(function(r) {
        if (!r) return;
        gayiQ += (Number(r.gayiQty) || 0);
        aayiQ += (Number(r.aayiQty) || 0);
        dmgAmt += (Number(r.damageAmt) || 0);
        dmgPcs += (Number(r.damagePcs) || 0);
    });

    var pichliSaree = Number(sh.closingPendingSaree) || 0;
    var pendingSaree = Math.max(0, (pichliSaree + gayiQ) - (aayiQ + dmgPcs));

    return {
        closingPendingSaree: pichliSaree,
        totGayiQty: gayiQ,
        totAayiQty: aayiQ,
        totDamageAmt: dmgAmt,
        totDamagePcs: dmgPcs,
        pendingSaree: pendingSaree
    };
}

// 3. WORKER OVERALL SUMMARY
function getCuttingWorkerOverallSummary(workerId) {
    var sheets = safeArray(getStore("jobwork_sheets_" + workerId));
    if (!sheets.length) {
        return { totGayi: 0, totAayi: 0, totDmg: 0, pendingSaree: 0 };
    }

    var gTot = 0, aTot = 0, dTot = 0;
    sheets.forEach(function(sh) {
        var c = calculateCuttingSheetTotals(sh);
        gTot += c.totGayiQty;
        aTot += c.totAayiQty;
        dTot += c.totDamagePcs;
    });

    var latestSheet = sheets[sheets.length - 1];
    var latestCalc = calculateCuttingSheetTotals(latestSheet);

    return {
        totGayi: gTot,
        totAayi: aTot,
        totDmg: dTot,
        pendingSaree: latestCalc.pendingSaree
    };
}

// 4. ABSENT DAYS TRACKER (FOR WHATSAPP TAGADA)
function getCuttingWorkerAbsentInfo(workerId) {
    var sheets = safeArray(getStore("jobwork_sheets_" + workerId));
    var latestDate = null;

    sheets.forEach(function(sh) {
        safeArray(sh.rows).forEach(function(r) {
            if (r && r.date) {
                if (!latestDate || r.date > latestDate) latestDate = r.date;
            }
        });
    });

    var w = getCuttingWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!latestDate) latestDate = (w && w.date) ? w.date : null;
    if (!latestDate) return { lastDate: "-", daysAbsent: 0 };

    var diffTime = new Date(getTodayDate()) - new Date(latestDate);
    var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return { lastDate: latestDate, daysAbsent: Math.max(0, diffDays) };
}

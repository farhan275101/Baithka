/* ========================================================
   SIMPLICITY ERP - CALENDER FINISHING CALCULATION ENGINE
   File: calender/calender-calc.js • Developed by Farhan Jawed
   (Finishing Stock, Damage Deduction & Calender Worker Stats)
======================================================== */

// 1. GET CALENDER WORKERS
function getCalenderWorkers() {
    return safeArray(getStore("jobwork_workers")).filter(function(w) {
        return w && w.type === "calender";
    });
}

// 2. CALENDER SHEET TOTALS FORMULA
function calculateCalenderSheetTotals(sh) {
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

// 3. CALENDER WORKER OVERALL SUMMARY
function getCalenderWorkerOverallSummary(workerId) {
    var sheets = safeArray(getStore("jobwork_sheets_" + workerId));
    if (!sheets.length) {
        return { totGayi: 0, totAayi: 0, totDmg: 0, pendingSaree: 0 };
    }

    var gTot = 0, aTot = 0, dTot = 0;
    sheets.forEach(function(sh) {
        var c = calculateCalenderSheetTotals(sh);
        gTot += c.totGayiQty;
        aTot += c.totAayiQty;
        dTot += c.totDamagePcs;
    });

    var latestSheet = sheets[sheets.length - 1];
    var latestCalc = calculateCalenderSheetTotals(latestSheet);

    return {
        totGayi: gTot,
        totAayi: aTot,
        totDmg: dTot,
        pendingSaree: latestCalc.pendingSaree
    };
}

// 4. CALENDER ABSENT DAYS TRACKER
function getCalenderWorkerAbsentInfo(workerId) {
    var sheets = safeArray(getStore("jobwork_sheets_" + workerId));
    var latestDate = null;

    sheets.forEach(function(sh) {
        safeArray(sh.rows).forEach(function(r) {
            if (r && r.date) {
                if (!latestDate || r.date > latestDate) latestDate = r.date;
            }
        });
    });

    var w = getCalenderWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!latestDate) latestDate = (w && w.date) ? w.date : null;
    if (!latestDate) return { lastDate: "-", daysAbsent: 0 };

    var diffTime = new Date(getTodayDate()) - new Date(latestDate);
    var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return { lastDate: latestDate, daysAbsent: Math.max(0, diffDays) };
}

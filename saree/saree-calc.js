/* ========================================================
   SIMPLICITY ERP - SAREE STOCK CALCULATION ENGINE
   File: saree/saree-calc.js • Developed by Farhan Jawed
   (Fresh Saree, Calender Finished, Lott & Multi-Godown Balance)
======================================================== */

var currentSareeKarkhanaFilter = "k_main";
var currentSareeStockTab = "fresh"; // "fresh", "finished", "lott"

// 1. FRESH SAREE STOCK STATS (KARKHANA-WISE)
function getFreshSareeStockStats(targetKarkhanaId) {
    var kId = targetKarkhanaId || currentSareeKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var stock = safeArray(getStore("saree_stock"));

    var totPcs = 0;
    var totOpening = 0;

    stock.forEach(function(s) {
        if (!s) return;
        var matchK = isMain ? (!s.karkhanaId || s.karkhanaId === "k_main") : (String(s.karkhanaId) === String(kId));
        if (matchK) {
            totPcs += (Number(s.pcs) || 0);
            if (s.isOpening) {
                totOpening += (Number(s.openingPcs) || Number(s.pcs) || 0);
            }
        }
    });

    return {
        karkhanaId: kId,
        totalPcs: totPcs,
        openingPcs: totOpening
    };
}

// 2. FINISHED SAREE STOCK STATS (CALENDER SE READY)
function getFinishedSareeStockStats() {
    var finStock = safeArray(getStore("finished_saree_stock"));
    var tot = 0;
    var totOpen = 0;

    finStock.forEach(function(f) {
        if (!f) return;
        tot += (Number(f.pcs) || 0);
        if (f.isOpening) {
            totOpen += (Number(f.openingPcs) || Number(f.pcs) || 0);
        }
    });

    return {
        totalPcs: tot,
        openingPcs: totOpen
    };
}

// 3. LOTT / DAMAGE SAREE STATS
function getLottSareeStockStats(targetKarkhanaId) {
    var kId = targetKarkhanaId || currentSareeKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var lottStock = safeArray(getStore("lott_saree_stock"));

    var tot = 0;
    var totOpen = 0;

    lottStock.forEach(function(l) {
        if (!l) return;
        var matchK = isMain ? (!l.karkhanaId || l.karkhanaId === "k_main") : (String(l.karkhanaId) === String(kId));
        if (matchK) {
            tot += (Number(l.pcs) || 0);
            if (l.isOpening) {
                totOpen += (Number(l.openingPcs) || Number(l.pcs) || 0);
            }
        }
    });

    return {
        karkhanaId: kId,
        totalPcs: tot,
        openingPcs: totOpen
    };
}

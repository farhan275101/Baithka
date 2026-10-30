/* ========================================================
   SIMPLICITY ERP - SANCHA STOCK CALCULATION ENGINE (FIXED)
   File: sancha/sancha-calc.js • Developed by Farhan Jawed
======================================================== */

var currentSanchaKarkhanaFilter = "k_main";

function getSanchaItems() {
    return safeArray(getStore("sancha_items"));
}

function saveSanchaItems(list) {
    setStore("sancha_items", safeArray(list));
}

// LIVE SANCHA STATS PER ITEM
function getSanchaItemStats(itemId, itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentSanchaKarkhanaFilter || "k_main";
    var items = getSanchaItems();
    var hist = safeArray(getStore("sancha_history"));

    var targetItem = items.find(function(s) {
        return (itemId && String(s.id) === String(itemId)) || 
               (!itemId && s.name && s.name.trim().toLowerCase() === (itemName || "").trim().toLowerCase());
    });

    var totalPurchased = targetItem ? (Number(targetItem.totalQty) || 0) : 0;
    var diyaQty = 0;
    var jamaQty = 0;

    hist.forEach(function(h) {
        if (!h) return;
        var matchItem = (targetItem && String(h.itemId) === String(targetItem.id)) || 
                        (itemName && h.name && h.name.toLowerCase() === itemName.toLowerCase());
        var matchK = (!h.karkhanaId && kId === "k_main") || (String(h.karkhanaId) === String(kId));

        if (matchItem && matchK) {
            var q = Number(h.qty) || 0;
            var t = String(h.type || "");
            if (t.indexOf("Diya") !== -1 || t.indexOf("Out") !== -1) {
                diyaQty += q;
            } else if (t.indexOf("Jama") !== -1 || t.indexOf("Wapas") !== -1) {
                jamaQty += q;
            }
        }
    });

    // Asali formula: (Kul Kharid/Opening + Kariger Return) - Kariger Le Gaya
    var bacha = Math.max(0, (totalPurchased + jamaQty) - diyaQty);

    return {
        id: targetItem ? targetItem.id : itemId,
        name: itemName || (targetItem ? targetItem.name : "-"),
        totalAaya: totalPurchased,
        diya: diyaQty,
        jama: jamaQty,
        bacha: bacha
    };
}

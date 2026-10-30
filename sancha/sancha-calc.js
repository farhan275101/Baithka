/* ========================================================
   SIMPLICITY ERP - SANCHA STOCK CALCULATION ENGINE
   File: sancha/sancha-calc.js • Developed by Farhan Jawed
   (Sancha Inventory, Allocation, Return & Live Balance Stats)
======================================================== */

var currentSanchaKarkhanaFilter = "k_main";

function getSanchaItems() {
    return safeArray(getStore("sancha_items"));
}

function saveSanchaItems(list) {
    setStore("sancha_items", safeArray(list));
}

// LIVE SANCHA STATS PER ITEM PER GODOWN
function getSanchaItemStats(itemId, itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentSanchaKarkhanaFilter || "k_main";
    var items = getSanchaItems();
    var hist = safeArray(getStore("sancha_history"));

    var targetItem = items.find(function(s) {
        return (itemId && String(s.id) === String(itemId)) || 
               (!itemId && s.name && s.name.trim().toLowerCase() === (itemName || "").trim().toLowerCase());
    });

    var totalQty = targetItem ? (Number(targetItem.totalQty) || 0) : 0;
    var diyaQty = 0;
    var jamaQty = 0;

    hist.forEach(function(h) {
        if (!h) return;
        var matchItem = (itemId && String(h.itemId) === String(itemId)) || 
                        (itemName && h.name && h.name.toLowerCase() === itemName.toLowerCase());
        var matchK = (!h.karkhanaId && kId === "k_main") || (String(h.karkhanaId) === String(kId));

        if (matchItem && matchK) {
            var q = Number(h.qty) || 0;
            if (String(h.type).indexOf("Diya") !== -1 || String(h.type).indexOf("Out") !== -1) {
                diyaQty += q;
            } else if (String(h.type).indexOf("Jama") !== -1 || String(h.type).indexOf("In") !== -1) {
                jamaQty += q;
            }
        }
    });

    var bacha = Math.max(0, (totalQty + jamaQty) - diyaQty);

    return {
        id: itemId,
        name: itemName || (targetItem ? targetItem.name : "-"),
        totalQty: totalQty,
        diya: diyaQty,
        jama: jamaQty,
        bacha: bacha
    };
}

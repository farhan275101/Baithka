/* ========================================================
   SIMPLICITY ERP - SAREE CALCULATION ENGINE
   File: saree/saree-calc.js • Developed by Farhan Jawed
======================================================== */

/**
 * 1. Kariger Sheet se Saree / Lott auto jama karne ka function
 */
function recordSareeFromKariger(date, sareeName, karigerName, karkhanaId, sareeQty, lottQty, refId) {
    var history = safeArray(getStore("saree_history"));

    // Fresh Saree entry
    if (Number(sareeQty) > 0) {
        history.push({
            id: "saree_in_" + Date.now() + "_f",
            date: date || getTodayDate(),
            sareeName: (sareeName || "General Saree").trim(),
            karigerName: (karigerName || "Kariger").trim(),
            karkhanaId: karkhanaId || "k_main",
            type: "fresh",
            typeLabel: "Fresh Saree (Kariger Sheet)",
            aai: Number(sareeQty),
            gai: 0,
            refId: refId || ""
        });
    }

    // Lott Saree entry
    if (Number(lottQty) > 0) {
        history.push({
            id: "saree_in_" + Date.now() + "_l",
            date: date || getTodayDate(),
            sareeName: (sareeName || "General Saree").trim(),
            karigerName: (karigerName || "Kariger").trim(),
            karkhanaId: karkhanaId || "k_main",
            type: "lott",
            typeLabel: "Lott Saree (Kariger Sheet)",
            aai: Number(lottQty),
            gai: 0,
            refId: refId || ""
        });
    }

    setStore("saree_history", history);
}

/**
 * 2. Kariger Sheet ki line delete hone par Saree Stock se entry hatana
 */
function removeSareeByRefId(refId) {
    if (!refId) return;
    var history = safeArray(getStore("saree_history"));
    history = history.filter(function(item) {
        return String(item.refId) !== String(refId);
    });
    setStore("saree_history", history);
}

/**
 * 3. All-Column Universal Search Filter
 */
function searchSareeData(list, searchText) {
    if (!searchText || !searchText.trim()) return list;
    var query = searchText.toLowerCase().trim();

    return list.filter(function(row) {
        var rowText = (
            String(row.date || "") + " " +
            String(row.sareeName || "") + " " +
            String(row.karigerName || "") + " " +
            String(row.godamName || "") + " " +
            String(row.aai || "") + " " +
            String(row.gai || "") + " " +
            String(row.bachi || "")
        ).toLowerCase();

        return rowText.indexOf(query) !== -1;
    });
}

/**
 * 4. Passbook Filter (Date Range + Search)
 */
function filterPassbookHistory(historyList, fromDate, toDate, searchTxt) {
    var filtered = safeArray(historyList);

    if (fromDate) {
        filtered = filtered.filter(function(item) {
            return item.date >= fromDate;
        });
    }

    if (toDate) {
        filtered = filtered.filter(function(item) {
            return item.date <= toDate;
        });
    }

    if (searchTxt && searchTxt.trim()) {
        var query = searchTxt.toLowerCase().trim();
        filtered = filtered.filter(function(item) {
            var fullText = (
                String(item.date || "") + " " +
                String(item.sareeName || "") + " " +
                String(item.karigerName || "") + " " +
                String(item.typeLabel || "") + " " +
                String(item.aai || "") + " " +
                String(item.gai || "")
            ).toLowerCase();
            return fullText.indexOf(query) !== -1;
        });
    }

    return filtered;
}

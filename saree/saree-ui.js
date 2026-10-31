/* ========================================================
   SIMPLICITY ERP - SAREE CALCULATION & PIPELINE ENGINE
   File: saree/saree-calc.js • Developed by Farhan Jawed
   (Fresh -> Cutting -> Calender -> Finished -> Dukan)
======================================================== */

/**
 * 1. Kariger Sheet se Saree / Lott auto jama karne ka function
 */
function recordSareeFromKariger(date, sareeName, karigerName, karkhanaId, sareeQty, lottQty, refId) {
    var history = safeArray(getStore("saree_history"));

    // Old entry clean if updating
    if (refId) {
        history = history.filter(function(h) { return !h || String(h.refId) !== String(refId); });
    }

    var d = date || getTodayDate();
    var sName = (sareeName || "General Saree").trim();
    var kName = (karigerName || "Kariger").trim();
    var kId = karkhanaId || "k_main";

    // 1. Fresh Saree Inward (Kariger Sheet)
    if (Number(sareeQty) > 0) {
        history.push({
            id: "saree_in_" + Date.now() + "_f",
            refId: refId || "",
            date: d,
            sareeName: sName,
            karigerName: kName,
            kariger: kName,
            karkhanaId: kId,
            type: "fresh",
            typeLabel: "Fresh Saree (Kariger Sheet)",
            aai: Number(sareeQty),
            gai: 0,
            isOut: false,
            note: "Kariger Bunai Entry"
        });
    }

    // 2. Lott Saree Inward (Kariger Sheet)
    if (Number(lottQty) > 0) {
        history.push({
            id: "saree_in_" + Date.now() + "_l",
            refId: refId || "",
            date: d,
            sareeName: sName,
            karigerName: kName,
            kariger: kName,
            karkhanaId: kId,
            type: "lott",
            typeLabel: "Lott Saree (Kariger Sheet)",
            aai: Number(lottQty),
            gai: 0,
            isOut: false,
            note: "Kariger Lott Entry"
        });
    }

    setStore("saree_history", history);
}

/**
 * 2. Sheet / Batch delete hone par Saree Stock se entry hatana
 */
function removeSareeByRefId(refId) {
    if (!refId) return;
    var history = safeArray(getStore("saree_history"));
    history = history.filter(function(item) {
        return !item || String(item.refId) !== String(refId);
    });
    setStore("saree_history", history);
}

/**
 * 3. Saree Pipeline Grouping & Tab-wise Stock Calculator
 * Tabs: 'fresh', 'cutting', 'finished', 'lott'
 */
function groupSareeStockByTab(historyList, targetTab, karkhanaFilter) {
    var list = safeArray(historyList).filter(function(item) {
        if (!item) return false;
        var t = (item.type || "fresh").toLowerCase();
        return t === targetTab.toLowerCase();
    });

    if (karkhanaFilter && karkhanaFilter !== "all") {
        list = list.filter(function(item) {
            return String(item.karkhanaId) === String(karkhanaFilter) || (!item.karkhanaId && karkhanaFilter === "k_main");
        });
    }

    var karkhanas = safeArray(getStore("karkhana_list"));
    var getGodamName = function(kid) {
        var found = karkhanas.find(function(k) { return k && String(k.id) === String(kid); });
        return found ? found.name : "Main Godown";
    };

    var groupedMap = {};

    list.forEach(function(r) {
        var sName = (r.sareeName || r.name || "General Saree").trim();
        var kName = (r.karigerName || r.kariger || "Karkhana").trim();
        var kid = r.karkhanaId || "k_main";
        var gName = getGodamName(kid);

        var key = (sName + "___" + kName + "___" + kid).toLowerCase();

        if (!groupedMap[key]) {
            groupedMap[key] = {
                key: key,
                date: r.date || "-",
                sareeName: sName,
                karigerName: kName,
                godamName: gName,
                karkhanaId: kid,
                aai: 0,
                gai: 0,
                bachi: 0
            };
        }

        // Precise Aai vs Gai calculation
        var isGai = (r.isOut === true) || (Number(r.gai) > 0) || (String(r.type || "").indexOf("Out") !== -1);
        var inQty = isGai ? 0 : Number(r.aai !== undefined ? r.aai : (r.pcs || 0));
        var outQty = isGai ? Number(r.gai !== undefined ? r.gai : (r.pcs || 0)) : 0;

        groupedMap[key].aai += inQty;
        groupedMap[key].gai += outQty;
        groupedMap[key].bachi = Math.max(0, groupedMap[key].aai - groupedMap[key].gai);

        if (r.date && r.date > groupedMap[key].date) {
            groupedMap[key].date = r.date;
        }
    });

    return Object.values(groupedMap);
}

/**
 * 4. Universal All-Column Multi Search
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
 * 5. Passbook Filter (Date Range + Search)
 */
function filterPassbookHistory(historyList, fromDate, toDate, searchTxt) {
    var filtered = safeArray(historyList);

    if (fromDate) {
        filtered = filtered.filter(function(item) {
            return item && item.date >= fromDate;
        });
    }

    if (toDate) {
        filtered = filtered.filter(function(item) {
            return item && item.date <= toDate;
        });
    }

    if (searchTxt && searchTxt.trim()) {
        var query = searchTxt.toLowerCase().trim();
        filtered = filtered.filter(function(item) {
            var fullText = (
                String(item.date || "") + " " +
                String(item.sareeName || item.name || "") + " " +
                String(item.karigerName || item.kariger || "") + " " +
                String(item.typeLabel || item.type || item.note || "") + " " +
                String(item.aai || "") + " " +
                String(item.gai || "")
            ).toLowerCase();
            return fullText.indexOf(query) !== -1;
        });
    }

    return filtered;
}

/* ========================================================
   SIMPLICITY ERP - ZARI STOCK UI & PASSBOOK ENGINE
   File: zari/zari-ui.js • Developed by Farhan Jawed
   (Godown Table, Add Purchase, Multi-Karkhana Tabs & Passbook)
======================================================== */

function openZariModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("zari-section", "block");
    renderZariKarkhanaTabs();
    renderZariTable();
}

// 1. ZARI KARKHANA TABS
function renderZariKarkhanaTabs() {
    var bar = document.getElementById("zari-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    kList.forEach(function(k) {
        var isActive = (String(currentZariKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchZariKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchZariKarkhanaTab(kId) {
    currentZariKarkhanaFilter = kId;
    renderZariKarkhanaTabs();
    renderZariTable();
}

// 2. FORM CONTROLS & DROPDOWNS
function populateZariExistingDropdown() {
    var sel = document.getElementById("zari-select-existing");
    if (!sel) return;
    sel.innerHTML = "";

    var stock = safeArray(getStore("zari_stock"));
    var uniqueNames = [];

    stock.forEach(function(z) {
        if (z && z.name && uniqueNames.indexOf(z.name.trim().toLowerCase()) === -1) {
            uniqueNames.push(z.name.trim().toLowerCase());
            var st = getZariItemStats(z.name, currentZariKarkhanaFilter);
            var opt = document.createElement("option");
            opt.value = z.name.trim();
            opt.textContent = z.name.trim() + " (Bacha: " + st.bacha.toFixed(2) + " Kg)";
            sel.appendChild(opt);
        }
    });

    if (!uniqueNames.length) {
        sel.innerHTML = "<option value=''>Koi purani Zari nahi mili (Naya naam likhein)</option>";
    }
}

function toggleZariItemType() {
    var isNew = document.getElementById("zari-type-new") && document.getElementById("zari-type-new").checked;
    setDisplay("zari-existing-group", isNew ? "none" : "block");
    setDisplay("zari-new-group", isNew ? "block" : "none");
}

function toggleZariForm() {
    var f = document.getElementById("add-zari-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("zari-date").value = getTodayDate();

    var rOld = document.getElementById("zari-type-existing");
    if (rOld) rOld.checked = true;
    populateZariExistingDropdown();
    toggleZariItemType();
}

function saveNewZari() {
    var d = document.getElementById("zari-date").value || getTodayDate();
    var isNew = document.getElementById("zari-type-new") && document.getElementById("zari-type-new").checked;
    var n = "";

    if (isNew) {
        n = (document.getElementById("zari-new-name").value || "").trim().toUpperCase();
        if (!n) return alert("Nayi Zari ka naam likhein!");
    } else {
        n = (document.getElementById("zari-select-existing").value || "").trim();
        if (!n) return alert("Pehle se maujood Zari chunein ya Naya Item chunein!");
    }

    var q = parseFloat(document.getElementById("zari-aaya").value) || 0;
    if (q <= 0) return alert("Sahi quantity (Qty) bharein!");

    var isMain = (currentZariKarkhanaFilter === "k_main");
    var stock = safeArray(getStore("zari_stock"));

    var item = stock.find(function(z) {
        var matchK = isMain ? (!z.karkhanaId || z.karkhanaId === "k_main") : (String(z.karkhanaId) === String(currentZariKarkhanaFilter));
        return z && matchK && z.name && z.name.toLowerCase() === n.toLowerCase();
    });

    if (item) {
        if (item.isOpening && item.openingAaya === undefined) {
            item.openingAaya = Number(item.aaya) || 0;
        }
        item.aaya = (Number(item.aaya) || 0) + q;
        item.date = d;
    } else {
        stock.push({
            id: Date.now(),
            name: n,
            date: d,
            aaya: q,
            gaya: 0,
            bacha: q,
            karkhanaId: currentZariKarkhanaFilter || "k_main",
            isOpening: false
        });
    }
    setStore("zari_stock", stock);

    var h = safeArray(getStore("zari_history"));
    var kName = getKarkhanaNameById(currentZariKarkhanaFilter);

    h.push({
        id: "zh_" + Date.now(),
        date: d,
        type: "Godam Kharid (Naya Maal)",
        name: n,
        qty: q,
        karkhanaId: currentZariKarkhanaFilter,
        note: kName + " Purchase"
    });
    setStore("zari_history", h);

    if (document.getElementById("zari-new-name")) document.getElementById("zari-new-name").value = "";
    if (document.getElementById("zari-aaya")) document.getElementById("zari-aaya").value = "";

    toggleZariForm();
    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Kg " + n + " jud gaya!");
}

// 3. TABLE RENDERING
function renderZariTable(flist) {
    var tbody = document.getElementById("zari-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var kName = getKarkhanaNameById(currentZariKarkhanaFilter);
    var isMain = (currentZariKarkhanaFilter === "k_main");
    var allZari = safeArray(getStore("zari_stock"));

    // Frozen opening stock calculation
    var totOpenZari = 0;
    allZari.forEach(function(z) {
        if (!z) return;
        var matchK = isMain ? (!z.karkhanaId || z.karkhanaId === "k_main") : (String(z.karkhanaId) === String(currentZariKarkhanaFilter));
        if (matchK && (z.isOpening || (z.note && z.note.indexOf("Opening") !== -1))) {
            totOpenZari += Number(z.openingAaya !== undefined ? z.openingAaya : z.aaya) || 0;
        }
    });

    var elVal = document.getElementById("zari-opening-val");
    if (elVal) elVal.textContent = totOpenZari.toFixed(2) + " Kg (" + kName + ")";

    var uniqueZariNames = [];
    allZari.forEach(function(z) {
        if (!z || !z.name) return;
        var matchK = isMain ? (!z.karkhanaId || z.karkhanaId === "k_main") : (String(z.karkhanaId) === String(currentZariKarkhanaFilter));
        if (matchK && uniqueZariNames.indexOf(z.name.trim().toLowerCase()) === -1) {
            uniqueZariNames.push(z.name.trim().toLowerCase());
        }
    });

    if (flist && Array.isArray(flist)) {
        uniqueZariNames = flist.map(function(x) { return x.name.trim().toLowerCase(); });
    }

    if (!uniqueZariNames.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Is Godam (" + kName + ") me koi Zari nahi mili.</td></tr>";
        return;
    }

    var html = "";
    uniqueZariNames.forEach(function(nameLower) {
        var origItem = allZari.find(function(x) { return x && x.name && x.name.trim().toLowerCase() === nameLower; });
        var displayName = origItem ? origItem.name : nameLower.toUpperCase();
        var st = getZariItemStats(displayName, currentZariKarkhanaFilter);

        var isOp = origItem && (origItem.isOpening || (origItem.note && origItem.note.indexOf("Opening") !== -1));
        var opBadge = isOp ? "<span class='badge-blue' style='font-size:10px; display:block;'>📦 Opening Stock</span>" : "";

        html += "<tr>" +
            "<td>" + formatDateDisplay(st.date) + "</td>" +
            "<td><strong>" + displayName + "</strong>" + opBadge + "</td>" +
            "<td style='color:#059669; font-weight:700;'>+" + st.aaya.toFixed(2) + " Kg</td>" +
            "<td style='color:#dc2626; font-weight:700;'>-" + st.gaya.toFixed(2) + " Kg</td>" +
            "<td><strong style='color:#ea580c; font-size:13px;'>" + st.bacha.toFixed(2) + " Kg</strong></td>" +
            "<td style='text-align:center;'><button class='detail-btn' onclick='viewZariPassbook(\"" + displayName + "\")'>📖 Passbook</button></td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

function filterZari() {
    var txt = (document.getElementById("search-zari-input") && document.getElementById("search-zari-input").value || "").toLowerCase().trim();
    if (!txt) {
        renderZariTable();
        return;
    }
    var allZari = safeArray(getStore("zari_stock"));
    var filtered = allZari.filter(function(z) {
        return z && z.name && z.name.toLowerCase().indexOf(txt) !== -1;
    });
    renderZariTable(filtered);
}

// 4. PASSBOOK MODAL
function viewZariPassbook(itemName) {
    var titleEl = document.getElementById("modal-item-title");
    if (titleEl) titleEl.textContent = "📖 Zari Passbook: " + itemName + " (" + getKarkhanaNameById(currentZariKarkhanaFilter) + ")";

    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var hist = safeArray(getStore("zari_history")).filter(function(h) {
        return h && h.name && h.name.toLowerCase() === itemName.toLowerCase() &&
               (!h.karkhanaId || String(h.karkhanaId) === String(currentZariKarkhanaFilter));
    });

    if (!hist.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
    } else {
        hist.forEach(function(r) {
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td>" + r.type + "</td>" +
                "<td style='font-weight:700;'>" + Number(r.qty).toFixed(2) + " Kg</td>" +
                "<td>" + (r.note || "-") + "</td>" +
            "</tr>";
        });
    }

    setDisplay("item-modal", "flex");
}

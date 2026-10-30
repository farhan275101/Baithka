/* ========================================================
   SIMPLICITY ERP - BANA STOCK UI & PASSBOOK ENGINE
   File: bana/bana-ui.js • Developed by Farhan Jawed
   (Godown Table, Add Purchase, Multi-Karkhana Tabs & Passbook)
======================================================== */

function openBanaModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("bana-section", "block");
    renderBanaKarkhanaTabs();
    renderBanaTable();
}

// 1. BANA KARKHANA TABS
function renderBanaKarkhanaTabs() {
    var bar = document.getElementById("bana-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    kList.forEach(function(k) {
        var isActive = (String(currentBanaKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchBanaKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchBanaKarkhanaTab(kId) {
    currentBanaKarkhanaFilter = kId;
    renderBanaKarkhanaTabs();
    renderBanaTable();
}

// 2. FORM CONTROLS & DROPDOWNS
function populateBanaExistingDropdown() {
    var sel = document.getElementById("bana-select-existing");
    if (!sel) return;
    sel.innerHTML = "";

    var stock = safeArray(getStore("bana_stock"));
    var uniqueNames = [];

    stock.forEach(function(b) {
        if (b && b.name && uniqueNames.indexOf(b.name.trim().toLowerCase()) === -1) {
            uniqueNames.push(b.name.trim().toLowerCase());
            var st = getBanaItemStats(b.name, currentBanaKarkhanaFilter);
            var opt = document.createElement("option");
            opt.value = b.name.trim();
            opt.textContent = b.name.trim() + " (Bacha: " + st.bacha.toFixed(2) + " Kg)";
            sel.appendChild(opt);
        }
    });

    if (!uniqueNames.length) {
        sel.innerHTML = "<option value=''>Koi purana Bana nahi mila (Naya naam likhein)</option>";
    }
}

function toggleBanaItemType() {
    var isNew = document.getElementById("bana-type-new") && document.getElementById("bana-type-new").checked;
    setDisplay("bana-existing-group", isNew ? "none" : "block");
    setDisplay("bana-new-group", isNew ? "block" : "none");
}

function toggleBanaForm() {
    var f = document.getElementById("add-bana-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("bana-date").value = getTodayDate();

    var rOld = document.getElementById("bana-type-existing");
    if (rOld) rOld.checked = true;
    populateBanaExistingDropdown();
    toggleBanaItemType();
}

function saveNewBana() {
    var d = document.getElementById("bana-date").value || getTodayDate();
    var isNew = document.getElementById("bana-type-new") && document.getElementById("bana-type-new").checked;
    var n = "";

    if (isNew) {
        n = (document.getElementById("bana-new-name").value || "").trim().toUpperCase();
        if (!n) return alert("Naye Bana ka naam likhein!");
    } else {
        n = (document.getElementById("bana-select-existing").value || "").trim();
        if (!n) return alert("Pehle se maujood Bana chunein ya Naya Item chunein!");
    }

    var q = parseFloat(document.getElementById("bana-aaya").value) || 0;
    if (q <= 0) return alert("Sahi quantity (Qty) bharein!");

    var isMain = (currentBanaKarkhanaFilter === "k_main");
    var stock = safeArray(getStore("bana_stock"));

    var item = stock.find(function(b) {
        var matchK = isMain ? (!b.karkhanaId || b.karkhanaId === "k_main") : (String(b.karkhanaId) === String(currentBanaKarkhanaFilter));
        return b && matchK && b.name && b.name.toLowerCase() === n.toLowerCase();
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
            karkhanaId: currentBanaKarkhanaFilter || "k_main",
            isOpening: false
        });
    }
    setStore("bana_stock", stock);

    var h = safeArray(getStore("bana_history"));
    var kName = getKarkhanaNameById(currentBanaKarkhanaFilter);

    h.push({
        id: "bh_" + Date.now(),
        date: d,
        type: "Godam Kharid (Naya Maal)",
        name: n,
        qty: q,
        karkhanaId: currentBanaKarkhanaFilter,
        note: kName + " Purchase"
    });
    setStore("bana_history", h);

    if (document.getElementById("bana-new-name")) document.getElementById("bana-new-name").value = "";
    if (document.getElementById("bana-aaya")) document.getElementById("bana-aaya").value = "";

    toggleBanaForm();
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Kg " + n + " jud gaya!");
}

// 3. TABLE RENDERING
function renderBanaTable(flist) {
    var tbody = document.getElementById("bana-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var kName = getKarkhanaNameById(currentBanaKarkhanaFilter);
    var isMain = (currentBanaKarkhanaFilter === "k_main");
    var allBana = safeArray(getStore("bana_stock"));

    // Frozen opening stock calculation
    var totOpenBana = 0;
    allBana.forEach(function(b) {
        if (!b) return;
        var matchK = isMain ? (!b.karkhanaId || b.karkhanaId === "k_main") : (String(b.karkhanaId) === String(currentBanaKarkhanaFilter));
        if (matchK && (b.isOpening || (b.note && b.note.indexOf("Opening") !== -1))) {
            totOpenBana += Number(b.openingAaya !== undefined ? b.openingAaya : b.aaya) || 0;
        }
    });

    var elVal = document.getElementById("bana-opening-val");
    if (elVal) elVal.textContent = totOpenBana.toFixed(2) + " Kg (" + kName + ")";

    var uniqueBanaNames = [];
    allBana.forEach(function(b) {
        if (!b || !b.name) return;
        var matchK = isMain ? (!b.karkhanaId || b.karkhanaId === "k_main") : (String(b.karkhanaId) === String(currentBanaKarkhanaFilter));
        if (matchK && uniqueBanaNames.indexOf(b.name.trim().toLowerCase()) === -1) {
            uniqueBanaNames.push(b.name.trim().toLowerCase());
        }
    });

    if (flist && Array.isArray(flist)) {
        uniqueBanaNames = flist.map(function(x) { return x.name.trim().toLowerCase(); });
    }

    if (!uniqueBanaNames.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Is Godam (" + kName + ") me koi Bana nahi mila.</td></tr>";
        return;
    }

    var html = "";
    uniqueBanaNames.forEach(function(nameLower) {
        var origItem = allBana.find(function(x) { return x && x.name && x.name.trim().toLowerCase() === nameLower; });
        var displayName = origItem ? origItem.name : nameLower.toUpperCase();
        var st = getBanaItemStats(displayName, currentBanaKarkhanaFilter);

        var isOp = origItem && (origItem.isOpening || (origItem.note && origItem.note.indexOf("Opening") !== -1));
        var opBadge = isOp ? "<span class='badge-blue' style='font-size:10px; display:block;'>📦 Opening Stock</span>" : "";

        html += "<tr>" +
            "<td>" + formatDateDisplay(st.date) + "</td>" +
            "<td><strong>" + displayName + "</strong>" + opBadge + "</td>" +
            "<td style='color:#059669; font-weight:700;'>+" + st.aaya.toFixed(2) + " Kg</td>" +
            "<td style='color:#dc2626; font-weight:700;'>-" + st.gaya.toFixed(2) + " Kg</td>" +
            "<td><strong style='color:#1e3a8a; font-size:13px;'>" + st.bacha.toFixed(2) + " Kg</strong></td>" +
            "<td style='text-align:center;'><button class='detail-btn' onclick='viewBanaPassbook(\"" + displayName + "\")'>📖 Passbook</button></td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

function filterBana() {
    var txt = (document.getElementById("search-bana-input") && document.getElementById("search-bana-input").value || "").toLowerCase().trim();
    if (!txt) {
        renderBanaTable();
        return;
    }
    var allBana = safeArray(getStore("bana_stock"));
    var filtered = allBana.filter(function(b) {
        return b && b.name && b.name.toLowerCase().indexOf(txt) !== -1;
    });
    renderBanaTable(filtered);
}

// 4. PASSBOOK MODAL
function viewBanaPassbook(itemName) {
    var titleEl = document.getElementById("modal-item-title");
    if (titleEl) titleEl.textContent = "📖 Bana Passbook: " + itemName + " (" + getKarkhanaNameById(currentBanaKarkhanaFilter) + ")";

    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var hist = safeArray(getStore("bana_history")).filter(function(h) {
        return h && h.name && h.name.toLowerCase() === itemName.toLowerCase() &&
               (!h.karkhanaId || String(h.karkhanaId) === String(currentBanaKarkhanaFilter));
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

/* ========================================================
   SIMPLICITY ERP - SAREE STOCK UI & REGISTER ENGINE
   File: saree/saree-ui.js • Developed by Farhan Jawed
   (Fresh/Finished/Lott Tabs, Inward/Outward & Passbook)
======================================================== */

function openSareeModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("saree-section", "block");
    renderSareeKarkhanaTabs();
    switchSareeStockTab(currentSareeStockTab || "fresh");
}

// 1. SAREE KARKHANA TABS
function renderSareeKarkhanaTabs() {
    var bar = document.getElementById("saree-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    kList.forEach(function(k) {
        var isActive = (String(currentSareeKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchSareeKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchSareeKarkhanaTab(kId) {
    currentSareeKarkhanaFilter = kId;
    renderSareeKarkhanaTabs();
    renderSareeTable();
}

// 2. 3 REGISTER TAB SWITCHER (FRESH / FINISHED / LOTT)
function switchSareeStockTab(tab) {
    currentSareeStockTab = tab;
    ["fresh", "finished", "lott"].forEach(function(t) {
        var el = document.getElementById("tab-saree-" + t);
        if (el) {
            if (t === tab) el.classList.add("active");
            else el.classList.remove("active");
        }
    });

    var kTabs = document.getElementById("saree-karkhana-tabs-bar");
    if (kTabs) {
        kTabs.style.display = (tab === "finished") ? "none" : "flex";
    }

    renderSareeTable();
}

// 3. TABLE RENDERING
function renderSareeTable(flist) {
    var thead = document.getElementById("saree-table-head");
    var tbody = document.getElementById("saree-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var kName = getKarkhanaNameById(currentSareeKarkhanaFilter);
    var isMain = (currentSareeKarkhanaFilter === "k_main");
    var storeKey = (currentSareeStockTab === "finished") ? "finished_saree_stock" : 
                   ((currentSareeStockTab === "lott") ? "lott_saree_stock" : "saree_stock");

    var list = flist || safeArray(getStore(storeKey));

    if (currentSareeStockTab !== "finished") {
        list = list.filter(function(s) {
            return isMain ? (!s.karkhanaId || s.karkhanaId === "k_main") : (String(s.karkhanaId) === String(currentSareeKarkhanaFilter));
        });
    }

    if (thead) {
        thead.innerHTML = "<tr style='background:#1e3a8a; color:white;'>" +
            "<th>Tarikh</th><th>Saree Ka Naam</th><th>Kariger / Source</th><th>Karkhana</th><th>Bacha Stock</th><th style='text-align:center;'>Action</th>" +
        "</tr>";
    }

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Is register me koi Saree nahi mili.</td></tr>";
        return;
    }

    var html = "";
    list.forEach(function(s) {
        var opBadge = s.isOpening ? "<span class='badge-blue' style='font-size:10px; display:block;'>📦 Opening Stock</span>" : "";
        var kLabel = (currentSareeStockTab === "finished") ? "Calender Ready" : (s.karkhanaName || kName);

        html += "<tr>" +
            "<td>" + formatDateDisplay(s.date) + "</td>" +
            "<td><strong>" + (s.name || "-") + "</strong>" + opBadge + "</td>" +
            "<td>" + (s.kariger || s.source || "-") + "</td>" +
            "<td><span class='badge-blue' style='font-size:11px;'>🏭 " + kLabel + "</span></td>" +
            "<td><strong style='color:#059669; font-size:13px;'>" + (s.pcs || 0) + " Pcs</strong></td>" +
            "<td style='text-align:center;'>" +
                "<button class='quick-btn btn-out' onclick='quickOutSaree(\"" + s.id + "\", \"" + storeKey + "\")'>📤 Out (Gayi)</button>" +
                "<button class='detail-btn' onclick='viewSareePassbook(\"" + (s.name || "") + "\")'>📖 Passbook</button>" +
            "</td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

// 4. ADD / OUT SAREE FORM
function toggleSareeForm() {
    var f = document.getElementById("add-saree-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("saree-date").value = getTodayDate();
}

function saveNewSareeStock() {
    var d = document.getElementById("saree-date").value || getTodayDate();
    var n = (document.getElementById("saree-name").value || "").trim().toUpperCase();
    var k = (document.getElementById("saree-kariger").value || "").trim();
    var p = parseInt(document.getElementById("saree-pcs").value, 10) || 0;

    if (!n || p <= 0) return alert("Saree ka naam aur sahi Pcs bharein!");

    var storeKey = (currentSareeStockTab === "finished") ? "finished_saree_stock" : 
                   ((currentSareeStockTab === "lott") ? "lott_saree_stock" : "saree_stock");

    var list = safeArray(getStore(storeKey));
    var kName = getKarkhanaNameById(currentSareeKarkhanaFilter);

    list.push({
        id: "saree_" + Date.now(),
        date: d,
        name: n,
        kariger: k || "Direct Godam",
        source: k || "Direct Godam",
        pcs: p,
        karkhanaId: currentSareeKarkhanaFilter || "k_main",
        karkhanaName: kName,
        isOpening: false
    });
    setStore(storeKey, list);

    var h = safeArray(getStore("saree_history"));
    h.push({
        id: "sh_" + Date.now(),
        date: d,
        type: "Inward (Aayi)",
        name: n,
        kariger: k || "Direct Godam",
        pcs: p,
        tab: currentSareeStockTab,
        karkhanaId: currentSareeKarkhanaFilter,
        note: currentSareeStockTab.toUpperCase() + " Entry"
    });
    setStore("saree_history", h);

    document.getElementById("saree-name").value = "";
    document.getElementById("saree-kariger").value = "";
    document.getElementById("saree-pcs").value = "";

    toggleSareeForm();
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + p + " Pcs " + n + " stock me jud gaya!");
}

function quickOutSaree(id, storeKey) {
    var list = safeArray(getStore(storeKey));
    var item = list.find(function(x) { return String(x.id) === String(id); });
    if (!item) return;

    var outPcs = parseInt(prompt("Kitni Saree bahar bheji (Out Pcs):", "1"), 10);
    if (!outPcs || outPcs <= 0) return;
    if (outPcs > (Number(item.pcs) || 0)) {
        return alert("⚠️ Utna stock nahi hai! Bacha sirf: " + item.pcs + " Pcs");
    }

    var reason = prompt("Vivran / Kisko diya (Job Work / Dukan / Customer):", "Bahar Bheja");

    item.pcs = (Number(item.pcs) || 0) - outPcs;
    setStore(storeKey, list);

    var h = safeArray(getStore("saree_history"));
    h.push({
        id: "sh_" + Date.now(),
        date: getTodayDate(),
        type: "Outward (Gayi)",
        name: item.name,
        kariger: reason || "-",
        pcs: outPcs,
        tab: currentSareeStockTab,
        karkhanaId: item.karkhanaId || currentSareeKarkhanaFilter,
        note: reason || "-"
    });
    setStore("saree_history", h);

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + outPcs + " Pcs Saree bahar darj ho gayi!");
}

// 5. FILTER & PASSBOOK
function filterSaree() {
    var txt = (document.getElementById("search-saree-input") && document.getElementById("search-saree-input").value || "").toLowerCase().trim();
    if (!txt) {
        renderSareeTable();
        return;
    }
    var storeKey = (currentSareeStockTab === "finished") ? "finished_saree_stock" : 
                   ((currentSareeStockTab === "lott") ? "lott_saree_stock" : "saree_stock");
    var list = safeArray(getStore(storeKey));
    var filtered = list.filter(function(s) {
        return (String(s.name || "") + " " + String(s.kariger || "")).toLowerCase().indexOf(txt) !== -1;
    });
    renderSareeTable(filtered);
}

function viewSareePassbook(name) {
    var titleEl = document.getElementById("modal-item-title");
    if (titleEl) titleEl.textContent = "📖 Saree Passbook: " + name;

    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var hist = safeArray(getStore("saree_history")).filter(function(h) {
        return h && h.name && h.name.toLowerCase() === name.toLowerCase();
    });

    if (!hist.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
    } else {
        hist.forEach(function(r) {
            var isA = String(r.type).indexOf("In") !== -1;
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td>" + r.type + "</td>" +
                "<td style='font-weight:700; color:" + (isA ? "#059669" : "#dc2626") + ";'>" + (isA ? "+" : "-") + r.pcs + " Pcs</td>" +
                "<td>" + (r.kariger || r.note || "-") + "</td>" +
            "</tr>";
        });
    }

    setDisplay("item-modal", "flex");
}

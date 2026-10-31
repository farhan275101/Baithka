/* ========================================================
   SIMPLICITY ERP - SAREE STOCK & PASSBOOK UI
   File: saree/saree-ui.js • Developed by Farhan Jawed
======================================================== */

var currentSareeTab = "fresh"; // "fresh", "lott", ya "finished"
var currentSareeKarkhanaFilter = "all";
var currentPassbookSareeKey = "";
var currentPassbookSareeTitle = "";

/**
 * 1. Saree Module kholne ka main function
 */
function openSareeModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";

    var sSec = document.getElementById("saree-section");
    if (sSec) sSec.style.display = "block";

    renderSareeKarkhanaTabs();
    switchSareeStockTab(currentSareeTab || "fresh");
}

/**
 * 2. 3 Main Buttons / Tabs switch karna (Fresh, Lott, Finished)
 */
function switchSareeStockTab(tabName) {
    currentSareeTab = tabName;

    var tabFresh = document.getElementById("tab-saree-fresh");
    var tabFinished = document.getElementById("tab-saree-finished");
    var tabLott = document.getElementById("tab-saree-lott");

    if (tabFresh) tabFresh.className = (tabName === "fresh") ? "sheet-tab active" : "sheet-tab";
    if (tabFinished) tabFinished.className = (tabName === "finished") ? "sheet-tab active" : "sheet-tab";
    if (tabLott) tabLott.className = (tabName === "lott") ? "sheet-tab active" : "sheet-tab";

    renderSareeTable();
}

/**
 * 3. Karkhana / Godam Filter Tabs render karna
 */
function renderSareeKarkhanaTabs() {
    var bar = document.getElementById("saree-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allActive = (currentSareeKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchSareeKarkhanaTab(\"all\")'>👥 Sabhi Godam</button>";

    karkhanas.forEach(function(k) {
        var isActive = (String(currentSareeKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchSareeKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchSareeKarkhanaTab(kId) {
    currentSareeKarkhanaFilter = kId;
    renderSareeTable();
}

function filterSaree() {
    renderSareeTable();
}

/**
 * Helper: Karkhana ID se Godam ka Naam nikalna
 */
function getSareeGodamName(kId) {
    var karkhanas = safeArray(getStore("karkhana_list"));
    var found = karkhanas.find(function(k) { return String(k.id) === String(kId); });
    return found ? found.name : "Main Godown";
}

/**
 * 4. Main Table Render Karna (Aapke paper ke exact 8 columns)
 */
function renderSareeTable() {
    var thead = document.getElementById("saree-table-head");
    var tbody = document.getElementById("saree-table-body");
    if (!thead || !tbody) return;

    // Header Setup
    thead.innerHTML = 
        "<tr style='background:#2563eb; color:white; font-size:13px; text-align:left;'>" +
            "<th>Tarikh</th>" +
            "<th>Saree Name</th>" +
            "<th>Karigar Name</th>" +
            "<th>Godam</th>" +
            "<th>Aai Saree</th>" +
            "<th>Gai Saree</th>" +
            "<th>Bachi Saree</th>" +
            "<th style='text-align:center;'>Passbook</th>" +
        "</tr>";

    tbody.innerHTML = "";

    // 3rd Tab: Finished Saree (Abhi Khali hai)
    if (currentSareeTab === "finished") {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:30px; color:#64748b; font-weight:700;'>⏳ Ye Button abhi khali hai. Job-Work se wapas aane ke baad Finished Stock yahan dikhega.</td></tr>";
        return;
    }

    var history = safeArray(getStore("saree_history"));

    // Tab filter (Fresh vs Lott)
    var list = history.filter(function(item) {
        return (item.type || "fresh") === currentSareeTab;
    });

    // Godam filter
    if (currentSareeKarkhanaFilter !== "all") {
        list = list.filter(function(item) {
            return String(item.karkhanaId) === String(currentSareeKarkhanaFilter) || (!item.karkhanaId && currentSareeKarkhanaFilter === "k_main");
        });
    }

    // Saree Items ko group karke Total Aai, Gai, aur Bachi nikalna
    var groupedMap = {};
    list.forEach(function(r) {
        var sName = (r.sareeName || "General").trim();
        var kName = (r.karigerName || "Kariger").trim();
        var gName = getSareeGodamName(r.karkhanaId);
        var key = (sName + "___" + kName + "___" + (r.karkhanaId || "k_main")).toLowerCase();

        if (!groupedMap[key]) {
            groupedMap[key] = {
                key: key,
                date: r.date || "-",
                sareeName: sName,
                karigerName: kName,
                godamName: gName,
                karkhanaId: r.karkhanaId || "k_main",
                aai: 0,
                gai: 0,
                bachi: 0
            };
        }

        groupedMap[key].aai += Number(r.aai || 0);
        groupedMap[key].gai += Number(r.gai || 0);
        groupedMap[key].bachi = groupedMap[key].aai - groupedMap[key].gai;
        if (r.date && r.date > groupedMap[key].date) {
            groupedMap[key].date = r.date;
        }
    });

    var rows = Object.values(groupedMap);

    // Universal Multi-Column Search
    var searchInput = document.getElementById("search-saree-input");
    var searchText = searchInput ? searchInput.value : "";
    if (typeof searchSareeData === "function") {
        rows = searchSareeData(rows, searchText);
    }

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:20px; color:#888;'>Koi " + (currentSareeTab === "fresh" ? "Fresh" : "Lott") + " Saree Record nahi mila.</td></tr>";
        return;
    }

    rows.forEach(function(row) {
        var safeSaree = encodeURIComponent(row.sareeName);
        var safeKariger = encodeURIComponent(row.karigerName);
        var safeKid = encodeURIComponent(row.karkhanaId);

        tbody.innerHTML += "<tr>" +
            "<td>" + row.date + "</td>" +
            "<td><strong style='color:#1e3a8a;'>" + row.sareeName + "</strong></td>" +
            "<td>👤 " + row.karigerName + "</td>" +
            "<td>🏭 " + row.godamName + "</td>" +
            "<td style='color:#059669; font-weight:800; font-size:14px;'>" + row.aai + "</td>" +
            "<td style='color:#dc2626; font-weight:800; font-size:14px;'>" + row.gai + "</td>" +
            "<td style='color:#2563eb; font-weight:800; font-size:15px; background:#eff6ff;'>" + row.bachi + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' style='background:#2563eb; padding:5px 12px; font-weight:bold;' onclick='openSareePassbook(\"" + safeSaree + "\", \"" + safeKariger + "\", \"" + safeKid + "\")'>📖 Passbook</button>" +
            "</td>" +
        "</tr>";
    });
}

/**
 * 5. Passbook Modal Kholna (Bana aur Zari ki tarah)
 */
function openSareePassbook(safeSaree, safeKariger, safeKid) {
    var sName = decodeURIComponent(safeSaree);
    var kName = decodeURIComponent(safeKariger);
    var kId = decodeURIComponent(safeKid);

    currentPassbookSareeKey = (sName + "___" + kName + "___" + kId).toLowerCase();
    currentPassbookSareeTitle = sName + " (" + kName + ")";

    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Saree Passbook: " + currentPassbookSareeTitle + " [" + (currentSareeTab === "fresh" ? "Fresh Saree" : "Lott Saree") + "]";

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='saree-pass-from-date' onchange='renderSareePassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='saree-pass-to-date' onchange='renderSareePassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button class='quick-btn btn-out' onclick='resetSareePassbookFilters()'>Reset</button></div>" +
                "</div>" +
                "<div style='flex:1; min-width:200px;'>" +
                    "<label style='font-size:12px; font-weight:700;'>🔍 Search in Passbook:</label><br>" +
                    "<input type='text' id='saree-pass-search-input' class='search-box' placeholder='Search Date, Detail, Qty...' oninput='renderSareePassbookRows()'>" +
                "</div>" +
            "</div>" +
            "<div class='table-responsive'>" +
                "<table>" +
                    "<thead>" +
                        "<tr style='background:#2563eb; color:white; font-size:12px;'>" +
                            "<th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / PERSON</th><th>AAI SAREE</th><th>GAI SAREE</th><th>ACTION</th>" +
                        "</tr>" +
                    "</thead>" +
                    "<tbody id='saree-passbook-table-body'></tbody>" +
                "</table>" +
            "</div>";
    }

    modal.style.display = "flex";
    renderSareePassbookRows();
}

function resetSareePassbookFilters() {
    var fDate = document.getElementById("saree-pass-from-date");
    var tDate = document.getElementById("saree-pass-to-date");
    var sInp = document.getElementById("saree-pass-search-input");
    if (fDate) fDate.value = "";
    if (tDate) tDate.value = "";
    if (sInp) sInp.value = "";
    renderSareePassbookRows();
}

/**
 * 6. Passbook ki entries render karna
 */
function renderSareePassbookRows() {
    var tbody = document.getElementById("saree-passbook-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var history = safeArray(getStore("saree_history"));

    // Selected Saree item filter
    var list = history.filter(function(r) {
        var key = ((r.sareeName || "General").trim() + "___" + (r.karigerName || "Kariger").trim() + "___" + (r.karkhanaId || "k_main")).toLowerCase();
        return key === currentPassbookSareeKey && (r.type || "fresh") === currentSareeTab;
    });

    // Date filters & Search
    var fDate = document.getElementById("saree-pass-from-date")?.value;
    var tDate = document.getElementById("saree-pass-to-date")?.value;
    var sTxt = document.getElementById("saree-pass-search-input")?.value;

    if (typeof filterPassbookHistory === "function") {
        list = filterPassbookHistory(list, fDate, tDate, sTxt);
    }

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
        return;
    }

    list.forEach(function(r) {
        var isKarigerEntry = r.refId ? true : false;
        var actBtn = isKarigerEntry 
            ? "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Kariger Sheet</span>"
            : "<button class='delete-btn' onclick='deleteManualSareeEntry(\"" + r.id + "\")'>🗑️ Delete</button>";

        tbody.innerHTML += "<tr>" +
            "<td>" + (r.date || "-") + "</td>" +
            "<td><strong>" + (r.typeLabel || "Saree Inward") + "</strong></td>" +
            "<td style='color:#1e3a8a; font-weight:700;'>👤 " + (r.karigerName || "-") + "</td>" +
            "<td style='color:#059669; font-weight:700;'>" + (r.aai || 0) + "</td>" +
            "<td style='color:#dc2626; font-weight:700;'>" + (r.gai || 0) + "</td>" +
            "<td style='text-align:center;'>" + actBtn + "</td>" +
        "</tr>";
    });
}

function deleteManualSareeEntry(id) {
    if (!confirm("Kya aap sach me ye entry delete karna chahte hain?")) return;
    var history = safeArray(getStore("saree_history"));
    history = history.filter(function(x) { return x.id !== id; });
    setStore("saree_history", history);

    renderSareePassbookRows();
    renderSareeTable();
    alert("✅ Entry delete ho gayi!");
}

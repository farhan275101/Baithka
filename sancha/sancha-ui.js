/* ========================================================
   SIMPLICITY ERP - SANCHA (LOOM TANI) UI & PASSBOOK ENGINE (FIXED)
   File: sancha/sancha-ui.js • Developed by Farhan Jawed
   (Kariger Dropdown Selection, Edit Name & Live Holder Tracker)
======================================================== */

function openSanchaModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("sancha-section", "block");
    renderSanchaKarkhanaTabs();
    renderSanchaTable();
}

// 1. KARKHANA TABS
function renderSanchaKarkhanaTabs() {
    var bar = document.getElementById("sancha-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    kList.forEach(function(k) {
        var isActive = (String(currentSanchaKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchSanchaKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchSanchaKarkhanaTab(kId) {
    currentSanchaKarkhanaFilter = kId;
    renderSanchaKarkhanaTabs();
    renderSanchaTable();
}

// 2. LIVE HOLDER TRACKER: KAUN-KAUN SE KARIGER TANI LE GAYE HAIN
function getSanchaHoldersSummary(itemName) {
    var hist = safeArray(getStore("sancha_history")).filter(function(h) {
        return h && h.name && h.name.toLowerCase() === itemName.toLowerCase() &&
               (!h.karkhanaId || String(h.karkhanaId) === String(currentSanchaKarkhanaFilter));
    });

    var holderMap = {};
    hist.forEach(function(h) {
        var p = (h.person || "").trim().toUpperCase();
        if (!p || p === "SANCHA PRODUCTION" || p === "SANCHA PAR BANI" || p === "GODAM" || p === "GODAM STOCK") return;

        if (!holderMap[p]) holderMap[p] = 0;
        var q = Number(h.qty) || 0;
        var t = String(h.type || "");

        if (t.indexOf("Le Gaya") !== -1 || t.indexOf("Out") !== -1 || t.indexOf("Diya") !== -1) {
            holderMap[p] += q;
        } else if (t.indexOf("Wapas") !== -1 || t.indexOf("Jama") !== -1) {
            holderMap[p] -= q;
        }
    });

    var summaryList = [];
    for (var karigerName in holderMap) {
        if (holderMap[karigerName] > 0) {
            summaryList.push("<span class='badge-red' style='font-size:12px; display:inline-block; margin:2px 0;'>👤 <strong>" + karigerName + "</strong> (" + holderMap[karigerName] + " Tani)</span>");
        }
    }

    if (!summaryList.length) {
        return "<span class='badge-green' style='font-size:11px;'>🟢 Sabhi Tani Godam Me Hai</span>";
    }
    return summaryList.join("<br>");
}

// 3. SANCHA PAR NAYI TANI BANI (ADD TANI STOCK)
function toggleAddSanchaItemForm() {
    var f = document.getElementById("add-sancha-item-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("sancha-date").value = getTodayDate();
    cancelSanchaEdit();
}

function cancelSanchaEdit() {
    var eId = document.getElementById("sancha-edit-id");
    if (eId) eId.value = "";
    document.getElementById("sancha-name").value = "";
    document.getElementById("sancha-qty").value = "";
    var pInp = document.getElementById("sancha-person");
    if (pInp) pInp.value = "";
    var sBtn = document.getElementById("sancha-save-btn");
    if (sBtn) sBtn.textContent = "Save Tani Stock";
}

function saveSanchaItem() {
    var editId = (document.getElementById("sancha-edit-id") && document.getElementById("sancha-edit-id").value) || "";
    var n = (document.getElementById("sancha-name") && document.getElementById("sancha-name").value || "").trim().toUpperCase();
    var q = parseFloat(document.getElementById("sancha-qty") && document.getElementById("sancha-qty").value) || 0;
    var d = (document.getElementById("sancha-date") && document.getElementById("sancha-date").value) || getTodayDate();
    var p = (document.getElementById("sancha-person") && document.getElementById("sancha-person").value || "").trim().toUpperCase();

    if (!n || q <= 0) return alert("Tani/Sancha ka naam aur kitni Tani bani (Qty) bharein!");

    var list = getSanchaItems();
    var isMain = (currentSanchaKarkhanaFilter === "k_main");

    var existing = list.find(function(s) {
        var matchK = isMain ? (!s.karkhanaId || s.karkhanaId === "k_main") : (String(s.karkhanaId) === String(currentSanchaKarkhanaFilter));
        return s && matchK && s.name && s.name.toUpperCase() === n;
    });

    if (existing && !editId) {
        existing.totalQty = (Number(existing.totalQty) || 0) + q;
        existing.date = d;
    } else if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n;
            it.totalQty = q;
            it.date = d;
        }
    } else {
        list.push({
            id: "sancha_" + Date.now(),
            name: n,
            totalQty: q,
            date: d,
            karkhanaId: currentSanchaKarkhanaFilter || "k_main"
        });
    }

    saveSanchaItems(list);

    // History log
    var h = safeArray(getStore("sancha_history"));
    h.push({
        id: "sh_" + Date.now(),
        name: n,
        date: d,
        type: "Sancha Par Tani Bani (+ In)",
        qty: q,
        person: p || "Sancha Production",
        karkhanaId: currentSanchaKarkhanaFilter,
        note: q + " Tani Tayyar Hokar Stock Me Aayi"
    });
    setStore("sancha_history", h);

    toggleAddSanchaItemForm();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Tani stock me jud gayi!");
}

// 4. SANCHA TABLE RENDERING
function renderSanchaTable(flist) {
    var tableEl = document.querySelector("#sancha-section table");
    if (!tableEl) return;

    tableEl.innerHTML = 
        "<thead>" +
            "<tr style='background:#0284c7; color:white;'>" +
                "<th>Tarikh</th>" +
                "<th>Sancha / Tani Ka Naam</th>" +
                "<th>Kul Tani Bani</th>" +
                "<th>Kaun Kariger Le Gaya (Loom Par)</th>" +
                "<th>Bachi Tani (Ready Stock)</th>" +
                "<th style='text-align:center;'>Action</th>" +
            "</tr>" +
        "</thead>" +
        "<tbody id='sancha-table-body'></tbody>";

    var tbody = document.getElementById("sancha-table-body");
    var kName = getKarkhanaNameById(currentSanchaKarkhanaFilter);
    var isMain = (currentSanchaKarkhanaFilter === "k_main");
    var allItems = flist || getSanchaItems();

    var filtered = allItems.filter(function(s) {
        return isMain ? (!s.karkhanaId || s.karkhanaId === "k_main") : (String(s.karkhanaId) === String(currentSanchaKarkhanaFilter));
    });

    var totReady = 0;
    filtered.forEach(function(s) {
        totReady += getSanchaItemStats(s.id, s.name, currentSanchaKarkhanaFilter).bachiTani;
    });

    var elVal = document.getElementById("sancha-opening-val");
    if (elVal) elVal.textContent = totReady + " Tani Tayyar Bachi Hai (" + kName + ")";

    if (!filtered.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Is Godam (" + kName + ") me koi Tani nahi bani hai.</td></tr>";
        return;
    }

    var html = "";
    filtered.forEach(function(s) {
        var st = getSanchaItemStats(s.id, s.name, currentSanchaKarkhanaFilter);
        var holdersHtml = getSanchaHoldersSummary(s.name);

        html += "<tr>" +
            "<td>" + formatDateDisplay(s.date) + "</td>" +
            "<td><strong>" + s.name + "</strong></td>" +
            "<td style='font-weight:700;'>+" + st.totalBani + " Tani</td>" +
            "<td>" + holdersHtml + "</td>" +
            "<td><strong style='color:#0284c7; font-size:15px;'>" + st.bachiTani + " Tani Bachi</strong></td>" +
            "<td style='text-align:center; white-space:nowrap;'>" +
                "<button class='quick-btn btn-out' onclick='allotSanchaToKariger(\"" + s.id + "\")'>📤 Kariger Tani Le Gaya</button> " +
                "<button class='quick-btn btn-in' onclick='returnSanchaFromKariger(\"" + s.id + "\")'>📥 Wapas Aayi</button> " +
                "<button class='detail-btn' style='background:#0284c7;' onclick='viewSanchaPassbook(\"" + s.name + "\")'>📖 Passbook</button> " +
                "<button class='delete-btn' onclick='deleteSanchaItem(\"" + s.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

function filterSancha() {
    var txt = (document.getElementById("search-sancha-input") && document.getElementById("search-sancha-input").value || "").toLowerCase().trim();
    if (!txt) {
        renderSanchaTable();
        return;
    }
    var filtered = getSanchaItems().filter(function(s) {
        return (String(s.name || "")).toLowerCase().indexOf(txt) !== -1;
    });
    renderSanchaTable(filtered);
}

// 5. 📤 KARIGER TANI LE GAYA (SMART KARIGER SELECTION)
function allotSanchaToKariger(itemId) {
    var it = getSanchaItems().find(function(x) { return String(x.id) === String(itemId); });
    if (!it) return;

    var st = getSanchaItemStats(it.id, it.name, currentSanchaKarkhanaFilter);
    if (st.bachiTani <= 0) {
        return alert("⚠️ Is quality ki ek bhi Tani tayyar nahi bachi hai!");
    }

    var karList = sanitizeKarigerList();
    var karNames = karList.map(function(k, idx) { return (idx + 1) + ". " + k.name; }).join("\n");
    
    var promptMsg = "Kaun sa Kariger Tani le gaya?\nKariger ka Asali Naam likhein (Jaise: Salman):\n\nRegistered Karigers:\n" + (karNames || "Koi nahi");
    var kariger = prompt(promptMsg);
    if (!kariger || !kariger.trim()) return;

    var cleanName = kariger.trim().toUpperCase();
    if (cleanName === "KARIGER") {
        cleanName = prompt("⚠️ 'KARIGER' nahi, Kariger ka Asali Naam likhein (Jaise: SALMAN):", "SALMAN");
        if (!cleanName || !cleanName.trim()) return;
        cleanName = cleanName.trim().toUpperCase();
    }

    var q = parseInt(prompt(cleanName + " kitni Tani le gaya (Pcs/Tani):", "1"), 10);
    if (!q || q <= 0) return;

    if (q > st.bachiTani) {
        return alert("⚠️ Godam me sirf " + st.bachiTani + " Tani bachi hai! Utna nahi de sakte.");
    }

    var d = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();

    var h = safeArray(getStore("sancha_history"));
    h.push({
        id: "sh_" + Date.now(),
        itemId: it.id,
        name: it.name,
        date: d,
        type: "Kariger Tani Le Gaya (- Out)",
        qty: q,
        person: cleanName,
        karkhanaId: currentSanchaKarkhanaFilter,
        note: cleanName + " loom par chadhane ke liye le gaya"
    });
    setStore("sancha_history", h);

    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Tani " + cleanName + " ke naam darj hui aur Stock se ghat gayi!");
}

// 6. 📥 TANI WAPAS AAYI
function returnSanchaFromKariger(itemId) {
    var it = getSanchaItems().find(function(x) { return String(x.id) === String(itemId); });
    if (!it) return;

    var kariger = prompt("Kis Kariger ne Tani wapas ki (Kariger Ka Asali Naam, jaise SALMAN):");
    if (!kariger || !kariger.trim()) return;

    var cleanName = kariger.trim().toUpperCase();
    var q = parseInt(prompt(cleanName + " ne kitni Tani wapas loutayi:", "1"), 10);
    if (!q || q <= 0) return;

    var d = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();

    var h = safeArray(getStore("sancha_history"));
    h.push({
        id: "sh_" + Date.now(),
        itemId: it.id,
        name: it.name,
        date: d,
        type: "Tani Wapas Aayi (+ In)",
        qty: q,
        person: cleanName,
        karkhanaId: currentSanchaKarkhanaFilter,
        note: cleanName + " se wapas stock me aayi"
    });
    setStore("sancha_history", h);

    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Tani Godam me wapas jud gayi!");
}

// 7. 📖 SANCHA (TANI) PASSBOOK WITH EDIT & DELETE
function viewSanchaPassbook(itemName) {
    var titleEl = document.getElementById("modal-item-title");
    if (titleEl) titleEl.textContent = "📖 Sancha / Tani Passbook: " + itemName + " (" + getKarkhanaNameById(currentSanchaKarkhanaFilter) + ")";

    var modalTable = document.querySelector("#item-modal table");
    if (!modalTable) return;

    modalTable.innerHTML = 
        "<thead>" +
            "<tr style='background:#0284c7; color:white;'>" +
                "<th>Tarikh</th>" +
                "<th>Kariger Ka Naam (Loom)</th>" +
                "<th>Vivran (Tani Status)</th>" +
                "<th>Kitni Tani</th>" +
                "<th style='text-align:center;'>Action</th>" +
            "</tr>" +
        "</thead>" +
        "<tbody id='modal-history-body'></tbody>";

    var tbody = document.getElementById("modal-history-body");

    var hist = safeArray(getStore("sancha_history")).filter(function(h) {
        return h && h.name && h.name.toLowerCase() === itemName.toLowerCase() &&
               (!h.karkhanaId || String(h.karkhanaId) === String(currentSanchaKarkhanaFilter));
    });

    if (!hist.length) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:#888;'>Is Tani ka koi lenden nahi mila.</td></tr>";
    } else {
        hist.forEach(function(r) {
            var isOut = String(r.type).indexOf("Le Gaya") !== -1 || String(r.type).indexOf("Out") !== -1;
            var personDisplay = (r.person || "Sancha Production").trim();

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong style='color:#1e3a8a; font-size:13px;'>👤 " + personDisplay + "</strong></td>" +
                "<td>" + r.type + "</td>" +
                "<td style='font-weight:700; color:" + (isOut ? "#dc2626" : "#059669") + "; font-size:13px;'>" + (isOut ? "-" : "+") + r.qty + " Tani</td>" +
                "<td style='text-align:center; white-space:nowrap;'>" +
                    "<button class='edit-btn' onclick='editSanchaPersonName(\"" + r.id + "\", \"" + itemName + "\")'>✏️ Naam Badlein</button> " +
                    "<button class='delete-btn' onclick='deleteSanchaHistoryEntry(\"" + r.id + "\", \"" + itemName + "\")'>🗑️ Delete</button>" +
                "</td>" +
            "</tr>";
        });
    }

    setDisplay("item-modal", "flex");
}

// 8. PURANI ENTRY KA NAAM BADALNA (AGAR "KARIGER" LIKHA THA TO "SALMAN" KARO)
function editSanchaPersonName(hId, itemName) {
    var hist = safeArray(getStore("sancha_history"));
    var entry = hist.find(function(x) { return String(x.id) === String(hId); });
    if (!entry) return;

    var newName = prompt("Is entry me Kariger ka sahi naam daalein (Jaise: SALMAN):", (entry.person || "SALMAN"));
    if (!newName || !newName.trim()) return;

    entry.person = newName.trim().toUpperCase();
    entry.note = entry.person + " le gaya/loutaya";
    setStore("sancha_history", hist);

    viewSanchaPassbook(itemName);
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Naam update hokar " + entry.person + " ho gaya!");
}

function deleteSanchaHistoryEntry(hId, itemName) {
    if (!confirm("Kya aap is entry ko delete karna chahte hain?")) return;
    var hist = safeArray(getStore("sancha_history")).filter(function(x) { return String(x.id) !== String(hId); });
    setStore("sancha_history", hist);

    viewSanchaPassbook(itemName);
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Entry delete ho gayi!");
}

function deleteSanchaItem(id) {
    if (!confirm("Kya aap is Tani item ko delete karna chahte hain?")) return;
    var list = getSanchaItems().filter(function(x) { return String(x.id) !== String(id); });
    saveSanchaItems(list);
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

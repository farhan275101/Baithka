/* ========================================================
   SIMPLICITY ERP - SANCHA STOCK UI & PASSBOOK ENGINE (FIXED)
   File: sancha/sancha-ui.js • Developed by Farhan Jawed
   (Kaun Kariger Kitna Le Gaya, Return & Full Passbook History)
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

// 2. ADD SANCHA STOCK FORM
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
    document.getElementById("sancha-person").value = "";
    var sBtn = document.getElementById("sancha-save-btn");
    if (sBtn) sBtn.textContent = "Save Sancha";
}

function saveSanchaItem() {
    var editId = (document.getElementById("sancha-edit-id") && document.getElementById("sancha-edit-id").value) || "";
    var n = (document.getElementById("sancha-name") && document.getElementById("sancha-name").value || "").trim().toUpperCase();
    var q = parseFloat(document.getElementById("sancha-qty") && document.getElementById("sancha-qty").value) || 0;
    var d = (document.getElementById("sancha-date") && document.getElementById("sancha-date").value) || getTodayDate();
    var p = (document.getElementById("sancha-person") && document.getElementById("sancha-person").value || "").trim();

    if (!n || q <= 0) return alert("Sancha ka naam aur sahi Quantity bharein!");

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

    // History log me add karna
    var h = safeArray(getStore("sancha_history"));
    h.push({
        id: "sh_" + Date.now(),
        name: n,
        date: d,
        type: "Godam Kharid (In)",
        qty: q,
        person: p || "Godam Kharid",
        karkhanaId: currentSanchaKarkhanaFilter,
        note: q + " Sancha Stock me Joda Gaya"
    });
    setStore("sancha_history", h);

    toggleAddSanchaItemForm();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Sancha Stock me jud gaya!");
}

// 3. TABLE RENDERING
function renderSanchaTable(flist) {
    var tbody = document.getElementById("sancha-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var kName = getKarkhanaNameById(currentSanchaKarkhanaFilter);
    var isMain = (currentSanchaKarkhanaFilter === "k_main");
    var allItems = flist || getSanchaItems();

    var filtered = allItems.filter(function(s) {
        return isMain ? (!s.karkhanaId || s.karkhanaId === "k_main") : (String(s.karkhanaId) === String(currentSanchaKarkhanaFilter));
    });

    // Opening box update
    var totOpen = 0;
    filtered.forEach(function(s) { totOpen += (Number(s.totalQty) || 0); });
    var elVal = document.getElementById("sancha-opening-val");
    if (elVal) elVal.textContent = totOpen + " Pcs (" + kName + ")";

    if (!filtered.length) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Is Godam (" + kName + ") me koi Sancha nahi mila.</td></tr>";
        return;
    }

    var html = "";
    filtered.forEach(function(s) {
        var st = getSanchaItemStats(s.id, s.name, currentSanchaKarkhanaFilter);

        html += "<tr>" +
            "<td>" + formatDateDisplay(s.date) + "</td>" +
            "<td><strong>" + s.name + "</strong></td>" +
            "<td style='font-weight:700;'>+" + st.totalAaya + "</td>" +
            "<td style='color:#dc2626; font-weight:700;'>-" + st.diya + "</td>" +
            "<td style='color:#059669; font-weight:700;'>+" + st.jama + "</td>" +
            "<td><strong style='color:#0284c7; font-size:14px;'>" + st.bacha + " Pcs</strong></td>" +
            "<td style='text-align:center;'>" +
                "<button class='quick-btn btn-out' onclick='allotSanchaToKariger(\"" + s.id + "\")'>📤 Kariger Le Gaya</button> " +
                "<button class='quick-btn btn-in' onclick='returnSanchaFromKariger(\"" + s.id + "\")'>📥 Wapas Aaya</button> " +
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

// 4. 📤 KARIGER LE GAYA (MINUS HO JAYEGA & NAAM RECORD HOGA)
function allotSanchaToKariger(itemId) {
    var it = getSanchaItems().find(function(x) { return String(x.id) === String(itemId); });
    if (!it) return;

    var st = getSanchaItemStats(it.id, it.name, currentSanchaKarkhanaFilter);
    if (st.bacha <= 0) {
        return alert("⚠️ Godam me Sancha nahi bacha hai! Bacha: 0");
    }

    var kariger = prompt("Kaun sa Kariger le gaya (Kariger Ka Naam):");
    if (!kariger || !kariger.trim()) return;

    var q = parseInt(prompt("Kitna Sancha le gaya (Qty):", "1"), 10);
    if (!q || q <= 0) return;

    if (q > st.bacha) {
        return alert("⚠️ Godam me sirf " + st.bacha + " Sancha bacha hai! Utna nahi de sakte.");
    }

    var d = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();

    var h = safeArray(getStore("sancha_history"));
    h.push({
        id: "sh_" + Date.now(),
        itemId: it.id,
        name: it.name,
        date: d,
        type: "Kariger Ko Diya (Out)",
        qty: q,
        person: kariger.trim().toUpperCase(),
        karkhanaId: currentSanchaKarkhanaFilter,
        note: kariger.trim().toUpperCase() + " le gaya"
    });
    setStore("sancha_history", h);

    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Sancha " + kariger.trim().toUpperCase() + " ke naam darj hua aur Godam se ghat gaya!");
}

// 5. 📥 KARIGER NE WAPAS KIYA (PLUS HO JAYEGA & NAAM RECORD HOGA)
function returnSanchaFromKariger(itemId) {
    var it = getSanchaItems().find(function(x) { return String(x.id) === String(itemId); });
    if (!it) return;

    var kariger = prompt("Kis Kariger ne wapas loutaya (Kariger Ka Naam):");
    if (!kariger || !kariger.trim()) return;

    var q = parseInt(prompt("Kitna Sancha wapas laya (Qty):", "1"), 10);
    if (!q || q <= 0) return;

    var d = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();

    var h = safeArray(getStore("sancha_history"));
    h.push({
        id: "sh_" + Date.now(),
        itemId: it.id,
        name: it.name,
        date: d,
        type: "Kariger Se Wapas (In)",
        qty: q,
        person: kariger.trim().toUpperCase(),
        karkhanaId: currentSanchaKarkhanaFilter,
        note: kariger.trim().toUpperCase() + " ne wapas loutaya"
    });
    setStore("sancha_history", h);

    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Sancha Godam me wapas jud gaya!");
}

// 6. 📖 SANCHA PASSBOOK (KARIGER NAAM KE SATH PURA HISAB)
function viewSanchaPassbook(itemName) {
    var titleEl = document.getElementById("modal-item-title");
    if (titleEl) titleEl.textContent = "📖 Sancha Passbook: " + itemName + " (" + getKarkhanaNameById(currentSanchaKarkhanaFilter) + ")";

    var modalTable = document.querySelector("#item-modal table");
    if (!modalTable) return;

    // Header Set with Kariger Name Column
    modalTable.innerHTML = 
        "<thead>" +
            "<tr style='background:#0284c7; color:white;'>" +
                "<th>Tarikh</th>" +
                "<th>Kariger Ka Naam / Person</th>" +
                "<th>Vivran (Type)</th>" +
                "<th>Quantity</th>" +
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
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:#888;'>Is Sancha ka koi lenden nahi mila.</td></tr>";
    } else {
        hist.forEach(function(r) {
            var isOut = String(r.type).indexOf("Out") !== -1 || String(r.type).indexOf("Diya") !== -1;
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong style='color:#1e3a8a; font-size:13px;'>👤 " + (r.person || "Godam Kharid") + "</strong></td>" +
                "<td>" + r.type + "</td>" +
                "<td style='font-weight:700; color:" + (isOut ? "#dc2626" : "#059669") + "; font-size:13px;'>" + (isOut ? "-" : "+") + r.qty + " Pcs</td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deleteSanchaHistoryEntry(\"" + r.id + "\", \"" + itemName + "\")'>🗑️ Delete</button></td>" +
            "</tr>";
        });
    }

    setDisplay("item-modal", "flex");
}

function deleteSanchaHistoryEntry(hId, itemName) {
    if (!confirm("Kya aap is Sancha entry ko delete karna chahte hain?")) return;
    var hist = safeArray(getStore("sancha_history")).filter(function(x) { return String(x.id) !== String(hId); });
    setStore("sancha_history", hist);

    viewSanchaPassbook(itemName);
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Entry delete ho gayi!");
}

function deleteSanchaItem(id) {
    if (!confirm("Kya aap is Sancha item ko delete karna chahte hain?")) return;
    var list = getSanchaItems().filter(function(x) { return String(x.id) !== String(id); });
    saveSanchaItems(list);
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

/* ========================================================
   SIMPLICITY ERP - SANCHA STOCK UI & PASSBOOK ENGINE
   File: sancha/sancha-ui.js • Developed by Farhan Jawed
   (Table Controller, Add Item, Person Allotment & History)
======================================================== */

function openSanchaModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("sancha-section", "block");
    renderSanchaKarkhanaTabs();
    renderSanchaTable();
}

// 1. SANCHA KARKHANA TABS
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

// 2. ADD / EDIT SANCHA ITEM
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
    var nInp = document.getElementById("sancha-name");
    if (nInp) nInp.value = "";
    var qInp = document.getElementById("sancha-qty");
    if (qInp) qInp.value = "";
    var pInp = document.getElementById("sancha-person");
    if (pInp) pInp.value = "";
    var sBtn = document.getElementById("sancha-save-btn");
    if (sBtn) sBtn.textContent = "Save Sancha";
}

function saveSanchaItem() {
    var editId = (document.getElementById("sancha-edit-id") && document.getElementById("sancha-edit-id").value) || "";
    var n = (document.getElementById("sancha-name") && document.getElementById("sancha-name").value || "").trim().toUpperCase();
    var q = parseFloat(document.getElementById("sancha-qty") && document.getElementById("sancha-qty").value) || 0;
    var p = (document.getElementById("sancha-person") && document.getElementById("sancha-person").value || "").trim();
    var d = (document.getElementById("sancha-date") && document.getElementById("sancha-date").value) || getTodayDate();

    if (!n) return alert("Sancha ka naam zaroori hai!");
    if (q <= 0 && !editId) return alert("Sahi quantity bharein!");

    var list = getSanchaItems();
    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n;
            it.totalQty = q;
            it.personName = p;
            it.date = d;
            it.karkhanaId = currentSanchaKarkhanaFilter;
        }
    } else {
        list.push({
            id: "sancha_" + Date.now(),
            name: n,
            totalQty: q,
            personName: p,
            date: d,
            karkhanaId: currentSanchaKarkhanaFilter || "k_main"
        });
    }

    saveSanchaItems(list);
    toggleAddSanchaItemForm();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Sancha save ho gaya!");
}

function editSanchaItem(id) {
    var it = getSanchaItems().find(function(x) { return String(x.id) === String(id); });
    if (!it) return;
    var f = document.getElementById("add-sancha-item-form");
    if (f) f.style.display = "block";

    document.getElementById("sancha-edit-id").value = it.id;
    document.getElementById("sancha-name").value = it.name;
    document.getElementById("sancha-qty").value = it.totalQty || 0;
    document.getElementById("sancha-person").value = it.personName || "";
    document.getElementById("sancha-date").value = it.date || getTodayDate();
    var sBtn = document.getElementById("sancha-save-btn");
    if (sBtn) sBtn.textContent = "Update Sancha";
}

function deleteSanchaItem(id) {
    if (!confirm("Kya aap is Sancha item ko delete karna chahte hain?")) return;
    var list = getSanchaItems().filter(function(x) { return String(x.id) !== String(id); });
    saveSanchaItems(list);
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
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
            "<td>" + (s.personName || "-") + "</td>" +
            "<td style='font-weight:700;'>" + st.totalQty + "</td>" +
            "<td style='color:#dc2626; font-weight:700;'>-" + st.diya + "</td>" +
            "<td style='color:#059669; font-weight:700;'>+" + st.jama + "</td>" +
            "<td><strong style='color:#0284c7; font-size:13px;'>" + st.bacha + "</strong></td>" +
            "<td style='text-align:center;'>" +
                "<button class='quick-btn btn-out' onclick='quickAllotSancha(\"" + s.id + "\")'>📤 Diya</button>" +
                "<button class='quick-btn btn-in' onclick='quickReturnSancha(\"" + s.id + "\")'>📥 Wapas</button>" +
                "<button class='edit-btn' onclick='editSanchaItem(\"" + s.id + "\")'>✏️</button>" +
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
        return (String(s.name || "") + " " + String(s.personName || "")).toLowerCase().indexOf(txt) !== -1;
    });
    renderSanchaTable(filtered);
}

// 4. QUICK ALLOT / RETURN
function quickAllotSancha(itemId) {
    var it = getSanchaItems().find(function(x) { return String(x.id) === String(itemId); });
    if (!it) return;

    var person = prompt("Kisko diya (Kariger / Person Name):");
    if (!person || !person.trim()) return;

    var q = parseInt(prompt("Kitna Sancha diya (Qty):", "1"), 10);
    if (!q || q <= 0) return;

    var h = safeArray(getStore("sancha_history"));
    h.push({
        id: "sh_" + Date.now(),
        itemId: it.id,
        name: it.name,
        date: getTodayDate(),
        type: "Diya (Out)",
        qty: q,
        person: person.trim(),
        karkhanaId: currentSanchaKarkhanaFilter,
        note: person.trim() + " ko diya"
    });
    setStore("sancha_history", h);

    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Sancha allot ho gaya!");
}

function quickReturnSancha(itemId) {
    var it = getSanchaItems().find(function(x) { return String(x.id) === String(itemId); });
    if (!it) return;

    var person = prompt("Kisse wapas aaya (Kariger / Person Name):");
    if (!person || !person.trim()) return;

    var q = parseInt(prompt("Kitna Sancha wapas aaya (Qty):", "1"), 10);
    if (!q || q <= 0) return;

    var h = safeArray(getStore("sancha_history"));
    h.push({
        id: "sh_" + Date.now(),
        itemId: it.id,
        name: it.name,
        date: getTodayDate(),
        type: "Jama (In)",
        qty: q,
        person: person.trim(),
        karkhanaId: currentSanchaKarkhanaFilter,
        note: person.trim() + " se wapas aaya"
    });
    setStore("sancha_history", h);

    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Sancha jama ho gaya!");
}

/* ========================================================
   SIMPLICITY ERP - KARIGER UI & KHATA CONTROLLER
   File: kariger/kariger-ui.js
======================================================== */

var activeKarigerId = null;
var activeSheetIndex = 0;
var currentKarigerKarkhanaFilter = "all";
var currentKarigerPage = 1;
var karigerPageSize = 50;

function setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = (v !== undefined && v !== null) ? v : "";
}

function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = (v !== undefined && v !== null) ? v : "";
}

function sanitizeKarigerList() {
    var list = safeArray(getStore("kariger_list"));
    return list.filter(function(k) { return k && k.name && String(k.name).trim() !== ""; });
}

function openKarigerModule() {
    var s1 = document.getElementById("kariger-sheet-section");
    if (s1) s1.style.display = "none";
    var s2 = document.getElementById("kariger-section");
    if (s2) s2.style.display = "block";

    currentKarigerPage = 1;
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
}

// 1. KARKHANA TABS & TABLE
function renderKarigerKarkhanaTabs() {
    var bar = document.getElementById("kariger-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";
    var allKarigers = sanitizeKarigerList();
    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allActive = (currentKarigerKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchKarigerKarkhanaTab(\"all\")'>👥 Sabhi (" + allKarigers.length + ")</button>";

    karkhanas.forEach(function(k) {
        var count = allKarigers.filter(function(w) { return String(w.karkhanaId) === String(k.id) || (!w.karkhanaId && k.isDefault); }).length;
        var isActive = (String(currentKarigerKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchKarigerKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + " (" + count + ")</button>";
    });
}

function switchKarigerKarkhanaTab(kId) {
    currentKarigerKarkhanaFilter = kId;
    currentKarigerPage = 1;
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
}

function filterKariger() {
    currentKarigerPage = 1;
    renderKarigerTable();
}

function renderKarigerTable() {
    var tbody = document.getElementById("kariger-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    var list = sanitizeKarigerList();

    if (currentKarigerKarkhanaFilter !== "all") {
        list = list.filter(function(k) {
            return String(k.karkhanaId) === String(currentKarigerKarkhanaFilter) || (!k.karkhanaId && currentKarigerKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-kariger-input") && document.getElementById("search-kariger-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(k) {
            return (String(k.name || "") + " " + String(k.saree || "") + " " + String(k.mobile || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var totalItems = list.length;
    var totalPages = Math.ceil(totalItems / karigerPageSize) || 1;
    if (currentKarigerPage > totalPages) currentKarigerPage = totalPages;
    if (currentKarigerPage < 1) currentKarigerPage = 1;

    var pagBar = document.getElementById("kariger-pagination-bar");
    if (pagBar) {
        if (!totalItems) {
            pagBar.style.display = "none";
        } else {
            pagBar.style.display = "flex";
            var startIdx = (currentKarigerPage - 1) * karigerPageSize + 1;
            var endIdx = Math.min(currentKarigerPage * karigerPageSize, totalItems);
            pagBar.innerHTML = "<div style='color:#2563eb;'>📊 Dikh rahe hain: " + startIdx + " - " + endIdx + " (Kul: " + totalItems + ")</div>" +
                "<div style='display:flex; gap:8px; align-items:center;'>" +
                    "<button class='quick-btn btn-out' onclick='prevKarigerPage()'>◀️ Pichla</button>" +
                    "<span style='background:#fff; border:1px solid #cbd5e1; padding:4px 10px; border-radius:6px;'>Page " + currentKarigerPage + " / " + totalPages + "</span>" +
                    "<button class='quick-btn btn-in' onclick='nextKarigerPage()'>Agla ▶️</button>" +
                "</div>";
        }
    }

    if (!totalItems) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Koi Kariger nahi mila.</td></tr>";
        return;
    }

    var pageList = list.slice((currentKarigerPage - 1) * karigerPageSize, currentKarigerPage * karigerPageSize);
    var html = "";
    pageList.forEach(function(k, idx) {
        var actualIdx = (currentKarigerPage - 1) * karigerPageSize + (idx + 1);
        var kBadge = "<span class='badge-blue' style='font-size:11px;'>🏭 " + (k.karkhanaName || "Main Godown") + "</span>";
        html += "<tr>" +
            "<td>" + actualIdx + "</td>" +
            "<td>" + kBadge + "</td>" +
            "<td><strong>" + k.name + "</strong></td>" +
            "<td>" + (k.saree || "-") + "</td>" +
            "<td>" + (k.mobile || "-") + "</td>" +
            "<td>" + (k.date || "-") + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' onclick='openKarigerSheet(\"" + k.id + "\")'>📊 Tani Khata</button> " +
                "<button class='edit-btn' onclick='editKariger(\"" + k.id + "\")'>✏️</button> " +
                "<button class='delete-btn' onclick='deleteKariger(\"" + k.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

function nextKarigerPage() { currentKarigerPage++; renderKarigerTable(); }
function prevKarigerPage() { if (currentKarigerPage > 1) { currentKarigerPage--; renderKarigerTable(); } }

function toggleKarigerForm() {
    var f = document.getElementById("add-kariger-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    setVal("kar-date", getTodayDate());
}

function saveKariger() {
    var editId = (document.getElementById("kar-edit-id") && document.getElementById("kar-edit-id").value) || "";
    var n = (document.getElementById("kar-name") && document.getElementById("kar-name").value || "").trim().toUpperCase();
    var s = (document.getElementById("kar-saree") && document.getElementById("kar-saree").value || "").trim();
    var m = (document.getElementById("kar-mobile") && document.getElementById("kar-mobile").value || "").trim();
    var d = (document.getElementById("kar-date") && document.getElementById("kar-date").value) || getTodayDate();
    if (!n) return alert("Kariger ka naam zaroori hai!");

    var list = sanitizeKarigerList();
    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) { it.name = n; it.saree = s; it.mobile = m; it.date = d; }
    } else {
        list.push({ id: "kar_" + Date.now(), name: n, saree: s, mobile: m, date: d, karkhanaId: "k_main", karkhanaName: "Main Godown" });
    }
    setStore("kariger_list", list);
    toggleKarigerForm();
    renderKarigerTable();
}

function editKariger(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return;
    toggleKarigerForm();
    setVal("kar-edit-id", k.id);
    setVal("kar-name", k.name);
    setVal("kar-saree", k.saree || "");
    setVal("kar-mobile", k.mobile || "");
    setVal("kar-date", k.date || getTodayDate());
}

function deleteKariger(id) {
    if (!confirm("Kya is Kariger ko delete karna chahte hain?")) return;
    var list = sanitizeKarigerList().filter(function(x) { return String(x.id) !== String(id); });
    setStore("kariger_list", list);
    renderKarigerTable();
}

// 2. TANI KHATA SHEET CONTROLLER
function openKarigerSheet(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return alert("Kariger nahi mila!");

    activeKarigerId = k.id;
    activeSheetIndex = 0;

    var s1 = document.getElementById("kariger-section");
    if (s1) s1.style.display = "none";
    var s2 = document.getElementById("kariger-sheet-section");
    if (s2) s2.style.display = "block";

    setText("sheet-kariger-title", k.name + " (" + (k.karkhanaName || "Main Godown") + ") - Saree: " + (k.saree || "-"));
    setVal("row-date", getTodayDate());

    var sheets = getKarigerSheets(activeKarigerId);
    if (!sheets || !sheets.length) {
        sheets = [{
            id: "tani_1", title: "Tani 1",
            pichlaBana: 0, pichlaZari: 0, pichlaBani: 0,
            banaWaste: 0, zariWaste: 0,
            rateBana: 0.311, rateZari: 0.110, rateBani: 240,
            note: "", rows: []
        }];
        saveKarigerSheets(activeKarigerId, sheets);
    }

    renderSheetTabs();
    loadCurrentSheetData();
}

function renderSheetTabs() {
    var sheets = getKarigerSheets(activeKarigerId);
    var box = document.getElementById("sheet-tabs-container");
    if (!box) return;
    box.innerHTML = "";
    sheets.forEach(function(sh, idx) {
        if (!sh) return;
        var btn = document.createElement("button");
        btn.className = "sheet-tab" + (idx === activeSheetIndex ? " active" : "");
        btn.innerHTML = sh.title + (sheets.length > 1 ? "<span class='del-tab-btn' onclick='deleteTaniSheet(" + idx + ", event)'> ×</span>" : "");
        btn.onclick = function() { switchTaniSheetTab(idx); };
        box.appendChild(btn);
    });
}

function switchTaniSheetTab(idx) {
    activeSheetIndex = idx;
    renderSheetTabs();
    loadCurrentSheetData();
}

function addNewTaniSheet() {
    var sheets = getKarigerSheets(activeKarigerId);
    var cur = sheets[activeSheetIndex] || sheets[sheets.length - 1];
    var calc = cur ? calculateSheetTotals(cur) : { remainingBana: 0, remainingZari: 0, remainingAmt: 0 };
    var nextNum = sheets.length + 1;
    sheets.push({
        id: "tani_" + nextNum, title: "Tani " + nextNum,
        pichlaBana: Number((calc.remainingBana || 0).toFixed(2)),
        pichlaZari: Number((calc.remainingZari || 0).toFixed(2)),
        pichlaBani: Number((calc.remainingAmt || 0).toFixed(2)),
        banaWaste: 0, zariWaste: 0,
        rateBana: cur ? (Number(cur.rateBana) || 0.311) : 0.311,
        rateZari: cur ? (Number(cur.rateZari) || 0.110) : 0.110,
        rateBani: cur ? (Number(cur.rateBani) || 240) : 240,
        note: "", rows: []
    });
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetIndex = sheets.length - 1;
    renderSheetTabs();
    loadCurrentSheetData();
}

function deleteTaniSheet(idx, e) {
    if (e) e.stopPropagation();
    var sheets = getKarigerSheets(activeKarigerId);
    if (sheets.length <= 1) return alert("Pehli Tani Sheet delete nahi ho sakti!");
    if (!confirm("Kya is Tani Sheet ko delete karna chahte hain?")) return;
    sheets.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetIndex = 0;
    renderSheetTabs();
    loadCurrentSheetData();
}

function loadCurrentSheetData() {
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex] || sheets[0];
    if (!sh) return;

    setVal("rate-bana-input", (sh.rateBana !== undefined) ? sh.rateBana : 0.311);
    setVal("rate-zari-input", (sh.rateZari !== undefined) ? sh.rateZari : 0.110);
    setVal("rate-bani-input", (sh.rateBani !== undefined) ? sh.rateBani : 240);
    setVal("pichla-bana-input", sh.pichlaBana || 0);
    setVal("pichla-zari-input", sh.pichlaZari || 0);
    setVal("pichla-bani-input", sh.pichlaBani || 0);
    setVal("waste-bana-input", sh.banaWaste || 0);
    setVal("waste-zari-input", sh.zariWaste || 0);

    renderSheetRows(sh);
}

function saveCurrentSheetConfig() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    sh.rateBana = parseFloat(document.getElementById("rate-bana-input")?.value) || 0;
    sh.rateZari = parseFloat(document.getElementById("rate-zari-input")?.value) || 0;
    sh.rateBani = parseFloat(document.getElementById("rate-bani-input")?.value) || 0;
    sh.pichlaBana = parseFloat(document.getElementById("pichla-bana-input")?.value) || 0;
    sh.pichlaZari = parseFloat(document.getElementById("pichla-zari-input")?.value) || 0;
    sh.pichlaBani = parseFloat(document.getElementById("pichla-bani-input")?.value) || 0;
    sh.banaWaste = parseFloat(document.getElementById("waste-bana-input")?.value) || 0;
    sh.zariWaste = parseFloat(document.getElementById("waste-zari-input")?.value) || 0;

    saveKarigerSheets(activeKarigerId, sheets);
    renderSheetRows(sh);
}

// 3. ADD LINE ROW (LESS TP & LESS TOPI MINUS KARKE NET LINE ME JUDNA)
function saveTaniRow() {
    if (!activeKarigerId) return alert("Pehle Kariger chunein!");
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    var d = (document.getElementById("row-date") && document.getElementById("row-date").value) || getTodayDate();
    var s = parseFloat(document.getElementById("row-saree") && document.getElementById("row-saree").value) || 0;
    var cone = parseFloat(document.getElementById("row-cone") && document.getElementById("row-cone").value) || 0;
    var lessTp = parseFloat(document.getElementById("row-lesstp") && document.getElementById("row-lesstp").value) || 0;
    var zQty = parseFloat(document.getElementById("row-zariqty") && document.getElementById("row-zariqty").value) || 0;
    var topi = parseFloat(document.getElementById("row-topi") && document.getElementById("row-topi").value) || 0;
    var paid = parseFloat(document.getElementById("row-paid") && document.getElementById("row-paid").value) || 0;
    var retB = parseFloat(document.getElementById("row-retbana") && document.getElementById("row-retbana").value) || 0;
    var retZ = parseFloat(document.getElementById("row-retzari") && document.getElementById("row-retzari").value) || 0;

    // NET FORMULA
    var nBana = Math.max(0, cone - lessTp);
    var nZari = Math.max(0, zQty - topi);
    var rowId = "row_" + Date.now();

    var newRow = {
        id: rowId,
        date: d,
        saree: s,
        cone: cone,
        lessTp: lessTp,
        netBana: Number(nBana.toFixed(2)),
        zariQty: zQty,
        topi: topi,
        netZari: Number(nZari.toFixed(2)),
        paid: paid,
        retBana: retB,
        retZari: retZ
    };

    sh.rows = safeArray(sh.rows);
    sh.rows.push(newRow);
    saveKarigerSheets(activeKarigerId, sheets);

    // Karkhana Stock Update
    if (s > 0) {
        var sStock = safeArray(getStore("saree_stock"));
        sStock.push({ id: "saree_" + Date.now(), refId: rowId, date: d, pcs: s });
        setStore("saree_stock", sStock);
    }
    if (nBana > 0 || retB > 0) {
        var bStock = safeArray(getStore("bana_stock"));
        if (bStock.length > 0) {
            bStock[0].gaya = Number(((Number(bStock[0].gaya) || 0) + nBana).toFixed(2));
            if (retB > 0) bStock[0].aaya = Number(((Number(bStock[0].aaya) || 0) + retB).toFixed(2));
            bStock[0].bacha = Number(((Number(bStock[0].aaya) || 0) - (Number(bStock[0].gaya) || 0)).toFixed(2));
            setStore("bana_stock", bStock);
        }
    }
    if (nZari > 0 || retZ > 0) {
        var zStock = safeArray(getStore("zari_stock"));
        if (zStock.length > 0) {
            zStock[0].gaya = Number(((Number(zStock[0].gaya) || 0) + nZari).toFixed(2));
            if (retZ > 0) zStock[0].aaya = Number(((Number(zStock[0].aaya) || 0) + retZ).toFixed(2));
            zStock[0].bacha = Number(((Number(zStock[0].aaya) || 0) - (Number(zStock[0].gaya) || 0)).toFixed(2));
            setStore("zari_stock", zStock);
        }
    }

    // Reset Form
    setVal("row-saree", "");
    setVal("row-cone", "");
    setVal("row-lesstp", "");
    setVal("row-zariqty", "");
    setVal("row-topi", "");
    setVal("row-paid", "");
    setVal("row-retbana", "");
    setVal("row-retzari", "");

    renderSheetRows(sh);
    alert("✅ Line jud gayi!");
}

function deleteTaniRow(idx) {
    if (!confirm("Kya aap is row ko delete karna chahte hain?")) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;
    sh.rows = safeArray(sh.rows);
    sh.rows.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);
    renderSheetRows(sh);
}

// 4. RENDER 12 EXACT COLUMNS (DELETE BUTTON AAKHRI ME RAHEGI)
function renderSheetRows(sh) {
    var tbody = document.getElementById("sheet-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    var rows = safeArray(sh.rows);

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='12' style='text-align:center; padding:15px; color:#888;'>Is Tani me koi entry nahi hai.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            tbody.innerHTML += "<tr>" +
                "<td>" + (r.date || "-") + "</td>" +
                "<td><strong>" + (r.saree || 0) + "</strong></td>" +
                "<td>" + (r.cone || 0) + "</td>" +
                "<td>" + (r.lessTp || 0) + "</td>" +
                "<td><strong style='color:#059669;'>" + (r.netBana || 0) + "</strong></td>" +
                "<td>" + (r.zariQty || 0) + "</td>" +
                "<td>" + (r.topi || 0) + "</td>" +
                "<td><strong style='color:#ea580c;'>" + (r.netZari || 0) + "</strong></td>" +
                "<td style='color:#059669; font-weight:700;'>₹ " + (r.paid || 0) + "</td>" +
                "<td>" + (r.retBana || 0) + "</td>" +
                "<td>" + (r.retZari || 0) + "</td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deleteTaniRow(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    // Bottom Calculation Cards
    var c = calculateSheetTotals(sh);
    setText("calc-rem-bana", c.remainingBana + " Kg");
    setText("calc-rem-zari", c.remainingZari + " Kg");
    setText("calc-rem-amt", "₹ " + c.remainingAmt);
}

function sendKarigerWhatsAppParchi() {
    if (!activeKarigerId) return;
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!k || !sh) return;
    var c = calculateSheetTotals(sh);

    var mob = (k.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mob || mob.length < 10) {
        mob = prompt("Kariger ka 10-digit WhatsApp number:", mob);
        if (!mob) return;
        mob = mob.trim().replace(/[^0-9]/g, "");
    }
    if (mob.length === 10) mob = "91" + mob;

    var msg = "🧵 *SIMPLICITY KARKHANA ERP*\n" +
              "👤 *कारीगर:* " + k.name + "\n" +
              "📑 *खाता:* " + sh.title + "\n" +
              "🥻 कुल साड़ी: *" + c.totSaree + " Pcs*\n" +
              "🧶 बाना बकाया: *" + c.remainingBana + " Kg*\n" +
              "✨ जरी बकाया: *" + c.remainingZari + " Kg*\n" +
              "💰 कुल मजदूरी: *₹ " + c.grossBani + "*\n" +
              "💵 दिया गया: *₹ " + c.totPaid + "*\n" +
              "🔴 *अंतिम बाकी रुपया: ₹ " + c.remainingAmt + "*";

    window.open("https://wa.me/" + mob + "?text=" + encodeURIComponent(msg), "_blank");
}

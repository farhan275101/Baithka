/* ========================================================
   SIMPLICITY ERP - KARIGER MASTER, MULTI-KARKHANA & KHATA
   File: kariger/kariger-ui.js • Developed by Farhan Jawed
======================================================== */

var activeKarigerId = null;
var activeSheetIndex = 0;
var currentKarigerKarkhanaFilter = "all";
var currentKarigerPage = 1;
var karigerPageSize = 50;

// 1. FINANCIAL YEAR SESSION SYSTEM
function getAppSessions() {
    var userKey = (currentUserId || "app") + "_app_sessions_list";
    var raw = localStorage.getItem(userKey);
    var list = [];
    try { list = JSON.parse(raw) || []; } catch (e) {}
    if (!Array.isArray(list) || !list.length) {
        list = ["2026-2027"];
        localStorage.setItem(userKey, JSON.stringify(list));
    }
    return list.map(function(s) { return String(s).replace(/['"]+/g, '').trim(); });
}

function getActiveFinancialSession() {
    var userKey = (currentUserId || "app") + "_app_active_session";
    var sess = localStorage.getItem(userKey);
    if (!sess || typeof sess !== "string" || sess === "[]") {
        var list = getAppSessions();
        sess = list[list.length - 1] || "2026-2027";
        localStorage.setItem(userKey, sess);
    }
    return String(sess).replace(/['"]+/g, '').trim() || "2026-2027";
}

function populateSessionDropdown() {
    var sel = document.getElementById("app-session-select");
    if (!sel) return;
    sel.innerHTML = "";
    var sessions = getAppSessions();
    var activeSess = getActiveFinancialSession();
    sessions.forEach(function(s) {
        var opt = document.createElement("option");
        opt.value = s; opt.textContent = "📅 " + s;
        if (String(s) === String(activeSess)) opt.selected = true;
        sel.appendChild(opt);
    });
}

function switchAppFinancialSession(targetSession) {
    var activeSess = getActiveFinancialSession();
    if (!targetSession || targetSession === activeSess) return;

    if (!confirm("Kya aap Session badal kar '" + targetSession + "' me jana chahte hain?")) {
        populateSessionDropdown();
        return;
    }

    var cleanTarget = String(targetSession).replace(/['"]+/g, '').trim();
    localStorage.setItem((currentUserId || "app") + "_app_active_session", cleanTarget);
    if (typeof clearMemoryCache === "function") clearMemoryCache();
    setStore("app_active_session", cleanTarget);

    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            renderKarigerKarkhanaTabs();
            renderKarigerTable();
        });
    } else {
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
    }
}

// 2. KARKHANA MANAGEMENT
function getKarkhanas() {
    var list = safeArray(getStore("karkhana_list"));
    if (!list.length) {
        list = [{ id: "k_main", name: "Main Godown", location: "Head Office", isDefault: true }];
        setStore("karkhana_list", list);
    }
    return list;
}

function renderKarigerKarkhanaTabs() {
    var bar = document.getElementById("kariger-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";
    var allKarigers = sanitizeKarigerList();
    var karkhanas = getKarkhanas();
    var allActive = (currentKarigerKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchKarigerKarkhanaTab(\"all\")'>👥 Sabhi Kariger (" + allKarigers.length + ")</button>";

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

function populateKarigerKarkhanaSelect() {
    var sel = document.getElementById("kar-karkhana");
    if (!sel) return;
    sel.innerHTML = "";
    getKarkhanas().forEach(function(k) {
        var opt = document.createElement("option");
        opt.value = k.id;
        opt.textContent = "🏭 " + k.name + (k.location ? " (" + k.location + ")" : "");
        sel.appendChild(opt);
    });
    if (currentKarigerKarkhanaFilter !== "all") sel.value = currentKarigerKarkhanaFilter;
}

// 3. KARIGER MASTER
function openKarigerModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("kariger-section", "block");
    populateSessionDropdown();
    renderKarigerKarkhanaTabs();
    populateKarigerKarkhanaSelect();
    currentKarigerPage = 1;
    renderKarigerTable();
}

function sanitizeKarigerList() { return safeArray(getStore("kariger_list")); }
function saveKarigerList(list) { setStore("kariger_list", safeArray(list)); }

function toggleKarigerForm() {
    var f = document.getElementById("add-kariger-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("kar-date").value = getTodayDate();
    cancelKarigerEdit();
    populateKarigerKarkhanaSelect();
}

function cancelKarigerEdit() {
    document.getElementById("kar-edit-id").value = "";
    document.getElementById("kar-name").value = "";
    document.getElementById("kar-saree").value = "";
    document.getElementById("kar-date").value = getTodayDate();
    document.getElementById("kar-save-btn").textContent = "Save Kariger";
    setDisplay("kar-cancel-btn", "none");
}

function saveNewKariger() {
    var editId = document.getElementById("kar-edit-id").value;
    var n = (document.getElementById("kar-name").value || "").trim().toUpperCase();
    var s = (document.getElementById("kar-saree").value || "").trim();
    var d = document.getElementById("kar-date").value || getTodayDate();
    var kId = document.getElementById("kar-karkhana") ? document.getElementById("kar-karkhana").value : "k_main";
    var kObj = getKarkhanas().find(function(x) { return String(x.id) === String(kId); });
    var kName = kObj ? kObj.name : "Main Godown";
    if (!n) return alert("Kariger ka naam zaroori hai!");

    var list = sanitizeKarigerList();
    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) { it.name = n; it.saree = s; it.date = d; it.karkhanaId = kId; it.karkhanaName = kName; }
    } else {
        list.push({ id: "kar_" + Date.now(), name: n, saree: s, date: d, karkhanaId: kId, karkhanaName: kName });
    }
    saveKarigerList(list);
    cancelKarigerEdit();
    setDisplay("add-kariger-form", "none");
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
}

function editKariger(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return;
    toggleKarigerForm();
    document.getElementById("kar-edit-id").value = k.id;
    document.getElementById("kar-name").value = k.name;
    document.getElementById("kar-saree").value = k.saree || "";
    document.getElementById("kar-date").value = k.date || getTodayDate();
    if (document.getElementById("kar-karkhana") && k.karkhanaId) document.getElementById("kar-karkhana").value = k.karkhanaId;
    document.getElementById("kar-save-btn").textContent = "Update Kariger";
    setDisplay("kar-cancel-btn", "inline-block");
}

function deleteKariger(id) {
    if (!confirm("Kya is Kariger ko delete karna chahte hain?")) return;
    saveKarigerList(sanitizeKarigerList().filter(function(x) { return String(x.id) !== String(id); }));
    setStore("kariger_sheets_" + id, []);
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
}

function renderKarigerTable() {
    var tbody = document.getElementById("kariger-table-body");
    if (!tbody) return;
    var list = sanitizeKarigerList();

    if (currentKarigerKarkhanaFilter !== "all") {
        list = list.filter(function(k) {
            return String(k.karkhanaId) === String(currentKarigerKarkhanaFilter) || (!k.karkhanaId && currentKarigerKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-kariger-input") && document.getElementById("search-kariger-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(k) {
            return (String(k.name || "") + " " + String(k.saree || "") + " " + String(k.karkhanaName || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var totalKarigers = list.length;
    var totalPages = Math.ceil(totalKarigers / karigerPageSize) || 1;
    if (currentKarigerPage > totalPages) currentKarigerPage = totalPages;
    if (currentKarigerPage < 1) currentKarigerPage = 1;

    var pagContainer = document.getElementById("kariger-pagination-bar");
    if (!totalKarigers) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:25px; color:#888;'>Koi Kariger nahi mila.</td></tr>";
        if (pagContainer) pagContainer.style.display = "none";
        return;
    }

    if (pagContainer) {
        pagContainer.style.display = "flex";
        var startIdx = (currentKarigerPage - 1) * karigerPageSize + 1;
        var endIdx = Math.min(currentKarigerPage * karigerPageSize, totalKarigers);
        pagContainer.innerHTML = 
            "<div style='color:#0f766e;'>📊 Dikh rahe hain: " + startIdx + " - " + endIdx + " (Kul: " + totalKarigers + ")</div>" +
            "<div style='display:flex; align-items:center; gap:8px;'>" +
                "<button class='quick-btn btn-out' onclick='prevKarigerPage()'>◀️ Pichla</button>" +
                "<span style='background:#ffffff; border:1px solid #cbd5e1; padding:5px 12px; border-radius:6px;'>Page " + currentKarigerPage + " / " + totalPages + "</span>" +
                "<button class='quick-btn btn-in' onclick='nextKarigerPage()'>Agla ▶️</button>" +
            "</div>";
    }

    var pageList = list.slice((currentKarigerPage - 1) * karigerPageSize, currentKarigerPage * karigerPageSize);
    var html = "";
    pageList.forEach(function(k) {
        var act = getKarigerLastActiveInfo(k.id);
        var statusBadge = act.daysAbsent >= 30 ? "<span class='badge-red'>⚠️ Absent</span>" : "<span class='badge-green'>🟢 Active</span>";
        html += "<tr>" +
            "<td><span class='badge-blue'>🏭 " + (k.karkhanaName || "Main Godown") + "</span></td>" +
            "<td><strong>" + k.name + "</strong></td>" +
            "<td>" + (k.saree || "-") + "</td>" +
            "<td>" + formatDateDisplay(act.lastDate) + "</td>" +
            "<td>" + statusBadge + "</td>" +
            "<td style='text-align:center;'><button class='sheet-btn' onclick='openKarigerSheet(\"" + k.id + "\")'>📊 Khata Sheet</button> <button class='edit-btn' onclick='editKariger(\"" + k.id + "\")'>✏️</button> <button class='delete-btn' onclick='deleteKariger(\"" + k.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

function nextKarigerPage() { currentKarigerPage++; renderKarigerTable(); }
function prevKarigerPage() { if (currentKarigerPage > 1) { currentKarigerPage--; renderKarigerTable(); } }

// 4. KARIGER KHATA SHEET ENGINE
function openKarigerSheet(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return alert("Kariger nahi mila!");
    activeKarigerId = k.id;
    activeSheetIndex = 0;

    var sess = getActiveFinancialSession();
    document.getElementById("sheet-banner-name").textContent = k.name + " • 🏭 " + (k.karkhanaName || "Main Godown") + " (" + sess + " Khata)";
    if (document.getElementById("line-date")) document.getElementById("line-date").value = getTodayDate();

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
    setDisplay("kariger-section", "none");
    setDisplay("kariger-sheet-section", "block");
    populateSheetDatalists();
    renderKarigerSheetTabs();
    loadCurrentSheetData();
}

function closeKarigerSheet() {
    activeKarigerId = null;
    setDisplay("kariger-sheet-section", "none");
    setDisplay("kariger-section", "block");
    renderKarigerTable();
}

function renderKarigerSheetTabs() {
    var sheets = getKarigerSheets(activeKarigerId);
    var box = document.getElementById("tani-tabs-container");
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
    renderKarigerSheetTabs();
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
    renderKarigerSheetTabs();
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
    renderKarigerSheetTabs();
    loadCurrentSheetData();
}

function loadCurrentSheetData() {
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex] || sheets[0];
    if (!sh) return;

    if (document.getElementById("sheet-active-badge")) document.getElementById("sheet-active-badge").textContent = sh.title;
    if (document.getElementById("tani-bana")) document.getElementById("tani-bana").value = sh.pichlaBana || 0;
    if (document.getElementById("tani-zari")) document.getElementById("tani-zari").value = sh.pichlaZari || 0;
    if (document.getElementById("tani-bani")) document.getElementById("tani-bani").value = sh.pichlaBani || 0;
    if (document.getElementById("tani-bana-waste")) document.getElementById("tani-bana-waste").value = sh.banaWaste || 0;
    if (document.getElementById("tani-zari-waste")) document.getElementById("tani-zari-waste").value = sh.zariWaste || 0;
    if (document.getElementById("tani-note")) document.getElementById("tani-note").value = sh.note || "";

    if (document.getElementById("rate-bana")) document.getElementById("rate-bana").value = (sh.rateBana !== undefined) ? sh.rateBana : 0.311;
    if (document.getElementById("rate-zari")) document.getElementById("rate-zari").value = (sh.rateZari !== undefined) ? sh.rateZari : 0.110;
    if (document.getElementById("rate-bani")) document.getElementById("rate-bani").value = (sh.rateBani !== undefined) ? sh.rateBani : 240;

    renderSheetTable(sh);
    updateLiveStockDisplay();
}

function saveCurrentSheetConfig() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    sh.pichlaBana = parseFloat(document.getElementById("tani-bana").value) || 0;
    sh.pichlaZari = parseFloat(document.getElementById("tani-zari").value) || 0;
    sh.pichlaBani = parseFloat(document.getElementById("tani-bani").value) || 0;
    if (document.getElementById("tani-bana-waste")) sh.banaWaste = parseFloat(document.getElementById("tani-bana-waste").value) || 0;
    if (document.getElementById("tani-zari-waste")) sh.zariWaste = parseFloat(document.getElementById("tani-zari-waste").value) || 0;
    if (document.getElementById("tani-note")) sh.note = document.getElementById("tani-note").value || "";
    if (document.getElementById("rate-bana")) sh.rateBana = parseFloat(document.getElementById("rate-bana").value) || 0;
    if (document.getElementById("rate-zari")) sh.rateZari = parseFloat(document.getElementById("rate-zari").value) || 0;
    if (document.getElementById("rate-bani")) sh.rateBani = parseFloat(document.getElementById("rate-bani").value) || 0;

    saveKarigerSheets(activeKarigerId, sheets);
    renderSheetTable(sh);
}

// 5. ADD LINE ENTRY & REAL-TIME STOCK ADJUST (BANA, ZARI & SANCHA IN KG)
function addSheetLineRow() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    var kariger = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var kName = kariger ? kariger.name : "Kariger";
    var kKarkhanaId = kariger ? (kariger.karkhanaId || "k_main") : "k_main";
    var kKarkhanaName = kariger ? (kariger.karkhanaName || "Main Godown") : "Main Godown";

    var d = (document.getElementById("line-date") && document.getElementById("line-date").value) || getTodayDate();
    var saree = parseInt(document.getElementById("line-saree") && document.getElementById("line-saree").value, 10) || 0;
    var sancha = (document.getElementById("line-entry-sancha") && document.getElementById("line-entry-sancha").value || "").trim();
    var taniName = (document.getElementById("line-tani-name") && document.getElementById("line-tani-name").value || "").trim();
    var taniWazan = parseFloat(document.getElementById("line-tani-wazan") && document.getElementById("line-tani-wazan").value) || 0;

    // Net Bana: Bana Cone - Less TP
    var bCone = parseFloat(document.getElementById("line-bana-cone") && document.getElementById("line-bana-cone").value) || 0;
    var bLess = parseFloat(document.getElementById("line-bana-less") && document.getElementById("line-bana-less").value) || 0;
    var netBana = Math.max(0, bCone - bLess);

    // Net Zari: Zari Qty - Topi
    var zQty = parseFloat(document.getElementById("line-zari") && document.getElementById("line-zari").value) || 0;
    var zTopi = parseFloat(document.getElementById("line-zari-topi") && document.getElementById("line-zari-topi").value) || 0;
    var netZari = Math.max(0, zQty - zTopi);

    var paid = parseFloat(document.getElementById("line-paid") && document.getElementById("line-paid").value) || 0;
    var lott = parseInt(document.getElementById("line-lott") && document.getElementById("line-lott").value, 10) || 0;
    var retBana = parseFloat(document.getElementById("line-ret-bana") && document.getElementById("line-ret-bana").value) || 0;
    var retZari = parseFloat(document.getElementById("line-ret-zari") && document.getElementById("line-ret-zari").value) || 0;

    var banaItem = (document.getElementById("line-bana-name") && document.getElementById("line-bana-name").value || "").trim();
    var zariItem = (document.getElementById("line-zari-name") && document.getElementById("line-zari-name").value || "").trim();
    var rowId = "row_" + Date.now();

    var newRow = {
        id: rowId, date: d, saree: saree, sancha: sancha, taniName: taniName, taniWazan: taniWazan,
        banaCone: bCone, banaLess: bLess, netBana: Number(netBana.toFixed(2)),
        zariQty: zQty, zariTopi: zTopi, netZari: Number(netZari.toFixed(2)),
        paid: paid, lott: lott, retBana: retBana, retZari: retZari,
        banaItemName: banaItem, zariItemName: zariItem, karkhanaId: kKarkhanaId, karkhanaName: kKarkhanaName
    };

    sh.rows = safeArray(sh.rows);
    sh.rows.push(newRow);
    saveKarigerSheets(activeKarigerId, sheets);

    // --- REAL-TIME STOCK ADJUSTMENT ---

    // 1. Saree Stock
    if (saree > 0) {
        var sStock = safeArray(getStore("saree_stock"));
        sStock.push({
            id: "saree_" + Date.now(), refId: rowId, date: d,
            name: (kariger ? kariger.saree : "Saree") || "Fresh Saree",
            kariger: kName, karkhanaId: kKarkhanaId, karkhanaName: kKarkhanaName, pcs: saree, outPcs: 0
        });
        setStore("saree_stock", sStock);
    }

    // 2. Lott Saree Stock
    if (lott > 0) {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        lottStock.push({
            id: "lott_" + Date.now(), refId: rowId, date: d, name: "Lott Saree",
            source: kName + " (" + kKarkhanaName + ")", karkhanaId: kKarkhanaId, karkhanaName: kKarkhanaName, pcs: lott
        });
        setStore("lott_saree_stock", lottStock);
    }

    // 3. Bana Godown Stock: Net Bana Minus (-), Ret Bana Plus (+)
    if (banaItem && (netBana > 0 || retBana > 0)) {
        var banaList = safeArray(getStore("bana_stock"));
        var bFound = banaList.find(function(b) {
            return b && b.name && b.name.trim().toLowerCase() === banaItem.toLowerCase() &&
                   ((String(b.karkhanaId) === String(kKarkhanaId)) || (!b.karkhanaId));
        });
        if (!bFound) {
            bFound = banaList.find(function(b) {
                return b && b.name && b.name.trim().toLowerCase() === banaItem.toLowerCase();
            });
        }
        if (bFound) {
            bFound.gaya = Number(((Number(bFound.gaya) || 0) + netBana).toFixed(2));
            if (retBana > 0) bFound.aaya = Number(((Number(bFound.aaya) || 0) + retBana).toFixed(2));
            bFound.bacha = Number(((Number(bFound.aaya) || 0) - (Number(bFound.gaya) || 0)).toFixed(2));
            setStore("bana_stock", banaList);
        }
    }

    // 4. Zari Godown Stock: Net Zari Minus (-), Ret Zari Plus (+)
    if (zariItem && (netZari > 0 || retZari > 0)) {
        var zariList = safeArray(getStore("zari_stock"));
        var zFound = zariList.find(function(z) {
            return z && z.name && z.name.trim().toLowerCase() === zariItem.toLowerCase() &&
                   ((String(z.karkhanaId) === String(kKarkhanaId)) || (!z.karkhanaId));
        });
        if (!zFound) {
            zFound = zariList.find(function(z) {
                return z && z.name && z.name.trim().toLowerCase() === zariItem.toLowerCase();
            });
        }
        if (zFound) {
            zFound.gaya = Number(((Number(zFound.gaya) || 0) + netZari).toFixed(2));
            if (retZari > 0) zFound.aaya = Number(((Number(zFound.aaya) || 0) + retZari).toFixed(2));
            zFound.bacha = Number(((Number(zFound.aaya) || 0) - (Number(zFound.gaya) || 0)).toFixed(2));
            setStore("zari_stock", zariList);
        }
    }

    // 5. Sancha Godown Stock: Tani Wazan (Kg) seedhe Minus (-)
    if (sancha && taniWazan > 0) {
        var sanchaList = safeArray(getStore("sancha_items"));
        var sFound = sanchaList.find(function(s) {
            return s && s.name && s.name.trim().toLowerCase() === sancha.toLowerCase() &&
                   ((String(s.karkhanaId) === String(kKarkhanaId)) || (!s.karkhanaId));
        });
        if (!sFound) {
            sFound = sanchaList.find(function(s) {
                return s && s.name && s.name.trim().toLowerCase() === sancha.toLowerCase();
            });
        }
        if (sFound) {
            if (sFound.aaya !== undefined) sFound.aaya = Math.max(0, Number(((Number(sFound.aaya) || 0) - taniWazan).toFixed(2)));
            if (sFound.bacha !== undefined) sFound.bacha = Math.max(0, Number(((Number(sFound.bacha) || 0) - taniWazan).toFixed(2)));
            setStore("sancha_items", sanchaList);
        }
    }

    // Reset Input Fields
    if (document.getElementById("line-saree")) document.getElementById("line-saree").value = "";
    if (document.getElementById("line-tani-wazan")) document.getElementById("line-tani-wazan").value = "";
    if (document.getElementById("line-bana-cone")) document.getElementById("line-bana-cone").value = "";
    if (document.getElementById("line-bana-less")) document.getElementById("line-bana-less").value = "";
    if (document.getElementById("line-zari")) document.getElementById("line-zari").value = "";
    if (document.getElementById("line-zari-topi")) document.getElementById("line-zari-topi").value = "";
    if (document.getElementById("line-paid")) document.getElementById("line-paid").value = "";
    if (document.getElementById("line-lott")) document.getElementById("line-lott").value = "";
    if (document.getElementById("line-ret-bana")) document.getElementById("line-ret-bana").value = "";
    if (document.getElementById("line-ret-zari")) document.getElementById("line-ret-zari").value = "";

    renderSheetTable(sh);
    updateLiveStockDisplay();
    alert("✅ Line jud gayi aur Karkhana Stock adjust ho gaya!");
}
// Alias so both function names work
var saveTaniRow = addSheetLineRow;

// 6. DELETE LINE ROW & REVERSE STOCK
function deleteSheetLineRow(idx) {
    if (!confirm("Kya is line entry ko delete karna chahte hain?")) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;
    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];
    if (!r) return;

    // Saree & Lott stock clean
    if (Number(r.saree) > 0) {
        var sStock = safeArray(getStore("saree_stock")).filter(function(x) { return !x || String(x.refId) !== String(r.id); });
        setStore("saree_stock", sStock);
    }
    if (Number(r.lott) > 0) {
        var lStock = safeArray(getStore("lott_saree_stock")).filter(function(x) { return !x || String(x.refId) !== String(r.id); });
        setStore("lott_saree_stock", lStock);
    }

    // Reverse Bana
    if (r.banaItemName && (r.netBana > 0 || r.retBana > 0)) {
        var bList = safeArray(getStore("bana_stock"));
        var bItem = bList.find(function(b) { return b && b.name && b.name.toLowerCase() === r.banaItemName.toLowerCase(); });
        if (bItem) {
            bItem.gaya = Math.max(0, Number(((Number(bItem.gaya) || 0) - (Number(r.netBana) || 0)).toFixed(2)));
            if (r.retBana > 0) bItem.aaya = Math.max(0, Number(((Number(bItem.aaya) || 0) - Number(r.retBana)).toFixed(2)));
            bItem.bacha = Number(((Number(bItem.aaya) || 0) - (Number(bItem.gaya) || 0)).toFixed(2));
            setStore("bana_stock", bList);
        }
    }

    // Reverse Zari
    if (r.zariItemName && (r.netZari > 0 || r.retZari > 0)) {
        var zList = safeArray(getStore("zari_stock"));
        var zItem = zList.find(function(z) { return z && z.name && z.name.toLowerCase() === r.zariItemName.toLowerCase(); });
        if (zItem) {
            zItem.gaya = Math.max(0, Number(((Number(zItem.gaya) || 0) - (Number(r.netZari) || 0)).toFixed(2)));
            if (r.retZari > 0) zItem.aaya = Math.max(0, Number(((Number(zItem.aaya) || 0) - Number(r.retZari)).toFixed(2)));
            zItem.bacha = Number(((Number(zItem.aaya) || 0) - (Number(zItem.gaya) || 0)).toFixed(2));
            setStore("zari_stock", zList);
        }
    }

    // Reverse Sancha (in Kg)
    if (r.sancha && r.taniWazan > 0) {
        var sList = safeArray(getStore("sancha_items"));
        var sItem = sList.find(function(s) { return s && s.name && s.name.toLowerCase() === r.sancha.toLowerCase(); });
        if (sItem) {
            if (sItem.aaya !== undefined) sItem.aaya = Number(((Number(sItem.aaya) || 0) + Number(r.taniWazan)).toFixed(2));
            if (sItem.bacha !== undefined) sItem.bacha = Number(((Number(sItem.bacha) || 0) + Number(r.taniWazan)).toFixed(2));
            setStore("sancha_items", sList);
        }
    }

    sh.rows.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);
    renderSheetTable(sh);
    updateLiveStockDisplay();
    alert("🗑️ Line delete ho gayi aur Stock restore ho gaya!");
}
// Alias so both function names work
var deleteTaniRow = deleteSheetLineRow;

// 7. RENDER SHEET TABLE (12 EXACT COLUMNS + SUMMARY BOXES)
function renderSheetTable(sh) {
    var tbody = document.getElementById("sheet-rows-body") || document.getElementById("sheet-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    var rows = safeArray(sh.rows);
    var totS = 0, totW = 0, totB = 0, totZ = 0, totP = 0, totL = 0, totRB = 0, totRZ = 0;

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='12' style='text-align:center; padding:15px; color:#888;'>Is Tani me koi rozana entry nahi hai.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            totS += (Number(r.saree) || 0);
            totW += (Number(r.taniWazan) || 0);
            totB += (Number(r.netBana) || 0);
            totZ += (Number(r.netZari) || 0);
            totP += (Number(r.paid) || 0);
            totL += (Number(r.lott) || 0);
            totRB += (Number(r.retBana) || 0);
            totRZ += (Number(r.retZari) || 0);

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong style='color:#2563eb;'>" + (r.saree || "-") + "</strong></td>" +
                "<td>" + (r.sancha || "-") + "</td>" +
                "<td>" + (r.taniName || "-") + "</td>" +
                "<td>" + (r.taniWazan || "-") + "</td>" +
                "<td><strong style='color:#059669;'>" + (r.netBana ? Number(r.netBana).toFixed(2) : "-") + "</strong></td>" +
                "<td><strong style='color:#ea580c;'>" + (r.netZari ? Number(r.netZari).toFixed(2) : "-") + "</strong></td>" +
                "<td>" + (r.paid ? ("₹ " + r.paid) : "-") + "</td>" +
                "<td>" + (r.lott ? ("⚠️ " + r.lott) : "-") + "</td>" +
                "<td>" + (r.retBana ? Number(r.retBana).toFixed(2) : "-") + "</td>" +
                "<td>" + (r.retZari ? Number(r.retZari).toFixed(2) : "-") + "</td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deleteSheetLineRow(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    // Totals bar
    var setEl = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    setEl("tot-saree", totS);
    setEl("tot-tani-wazan", totW.toFixed(2));
    setEl("tot-bana-net", totB.toFixed(2));
    setEl("tot-zari-net", totZ.toFixed(2));
    setEl("tot-paid", "₹ " + totP);
    setEl("tot-lott", totL);
    setEl("tot-ret-bana", totRB.toFixed(2));
    setEl("tot-ret-zari", totRZ.toFixed(2));

    // Summary calculation cards (Mazdoori, Bana & Zari Hisab)
    var c = calculateSheetTotals(sh);
    setEl("calc-tot-saree", c.totSaree);
    setEl("calc-tot-lott", "- " + c.totLott);
    setEl("calc-net-saree", c.netSaree);
    setEl("calc-bani-rate", "₹ " + (sh.rateBani !== undefined ? sh.rateBani : 240));
    setEl("calc-gross-bani", "₹ " + c.grossBani.toFixed(2));
    setEl("calc-last-tani-bani", "+ ₹ " + (sh.pichlaBani || 0));
    setEl("calc-tot-paid", "- ₹ " + c.totPaid.toFixed(2));
    setEl("calc-remaining-amt", "₹ " + c.remainingAmt.toFixed(2));

    setEl("calc-last-tani-bana", (sh.pichlaBana || 0));
    setEl("calc-tot-bana", c.totBana.toFixed(2));
    setEl("calc-ret-bana", "- " + c.retBana.toFixed(2));
    setEl("calc-bana-consumption", c.banaConsumption.toFixed(2));
    setEl("calc-bana-wastage", "- " + c.banaWaste.toFixed(2));
    setEl("calc-remaining-bana", c.remainingBana.toFixed(2));

    setEl("calc-last-tani-zari", (sh.pichlaZari || 0));
    setEl("calc-tot-zari", c.totZari.toFixed(2));
    setEl("calc-ret-zari", "- " + c.retZari.toFixed(2));
    setEl("calc-zari-consumption", c.zariConsumption.toFixed(2));
    setEl("calc-zari-wastage", "- " + c.zariWaste.toFixed(2));
    setEl("calc-remaining-zari", c.remainingZari.toFixed(2));
}

function updateLiveStockDisplay() {
    var bName = (document.getElementById("line-bana-name") && document.getElementById("line-bana-name").value || "").trim();
    var zName = (document.getElementById("line-zari-name") && document.getElementById("line-zari-name").value || "").trim();
    var elB = document.getElementById("live-bana-stock-badge");
    var elZ = document.getElementById("live-zari-stock-badge");
    var kariger = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var kId = kariger ? (kariger.karkhanaId || "k_main") : "k_main";

    if (elB && typeof getBanaItemStats === "function") {
        try { elB.textContent = "Bacha: " + Number(getBanaItemStats(bName, kId).bacha || 0).toFixed(2) + " Kg"; } catch(e) {}
    }
    if (elZ && typeof getZariItemStats === "function") {
        try { elZ.textContent = "Bacha: " + Number(getZariItemStats(zName, kId).bacha || 0).toFixed(2) + " Kg"; } catch(e) {}
    }
}

function populateSheetDatalists() {
    var sanchaDl = document.getElementById("sheet-sancha-dl");
    if (sanchaDl && typeof getSanchaItems === "function") {
        sanchaDl.innerHTML = "";
        var uniqueS = [];
        getSanchaItems().forEach(function(s) {
            if (s && s.name && uniqueS.indexOf(s.name.trim().toLowerCase()) === -1) {
                uniqueS.push(s.name.trim().toLowerCase());
                var opt = document.createElement("option"); opt.value = s.name.trim(); sanchaDl.appendChild(opt);
            }
        });
    }

    var banaDl = document.getElementById("sheet-bana-dl");
    if (banaDl) {
        banaDl.innerHTML = "";
        var uniqueB = [];
        safeArray(getStore("bana_stock")).forEach(function(b) {
            if (b && b.name && uniqueB.indexOf(b.name.trim().toLowerCase()) === -1) {
                uniqueB.push(b.name.trim().toLowerCase());
                var opt = document.createElement("option"); opt.value = b.name.trim(); banaDl.appendChild(opt);
            }
        });
    }

    var zariDl = document.getElementById("sheet-zari-dl");
    if (zariDl) {
        zariDl.innerHTML = "";
        var uniqueZ = [];
        safeArray(getStore("zari_stock")).forEach(function(z) {
            if (z && z.name && uniqueZ.indexOf(z.name.trim().toLowerCase()) === -1) {
                uniqueZ.push(z.name.trim().toLowerCase());
                var opt = document.createElement("option"); opt.value = z.name.trim(); zariDl.appendChild(opt);
            }
        });
    }
}

// 8. WHATSAPP SHARE
function shareSheetOnWhatsApp() {
    if (!activeKarigerId) return alert("Pehle koi Khata Sheet kholein!");
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!k || !sh) return alert("Data nahi mila!");

    var c = calculateSheetTotals(sh);
    var text = "🧾 *SIMPLICITY KARIGER KHATA PARCHI* 🧾\n━━━━━━━━━━━━━━━━━━━━━\n" +
        "👤 *Kariger:* " + k.name + "\n🏭 *Karkhana:* " + (k.karkhanaName || "Main Godown") + "\n🧵 *Saree:* " + (k.saree || "-") + "\n📑 *Sheet:* " + sh.title + "\n📅 *Tarikh:* " + formatDateDisplay(getTodayDate()) + "\n━━━━━━━━━━━━━━━━━━━━━\n" +
        "💰 *MAZDOORI HISAB:*\n• Kul Saree: " + c.totSaree + " Pcs\n• Net Saree: *" + c.netSaree + " Pcs*\n• Rate: ₹" + (sh.rateBani !== undefined ? sh.rateBani : 240) + "\n• Gross Bani: ₹" + c.grossBani.toFixed(2) + "\n• Pichla Baki: +₹" + (sh.pichlaBani || 0) + "\n• Paid: -₹" + c.totPaid.toFixed(2) + "\n-------------------------------------\n🔴 *FINAL BAKI: ₹ " + c.remainingAmt.toFixed(2) + "*\n━━━━━━━━━━━━━━━━━━━━━\n" +
        "🧶 *Bacha Bana:* *" + c.remainingBana.toFixed(2) + " Kg*\n✨ *Bachi Zari:* *" + c.remainingZari.toFixed(2) + " Kg*\n━━━━━━━━━━━━━━━━━━━━━\n_Simplicity ERP • by Farhan Jawed_";

    window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(text), "_blank");
}

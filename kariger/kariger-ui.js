/* ========================================================
   SIMPLICITY ERP - KARIGER MASTER & SHEET UI ENGINE
   File: kariger/kariger-ui.js • Developed by Farhan Jawed
   (Paging 50/page, Tani Sheet Controller & WhatsApp Parchi)
======================================================== */

var activeKarigerId = null;
var activeSheetIndex = 0;
var currentKarigerKarkhanaFilter = "all";
var currentKarigerPage = 1;
var karigerPageSize = 50;

function sanitizeKarigerList() {
    var list = safeArray(getStore("kariger_list"));
    return list.filter(function(k) { return k && k.name && String(k.name).trim() !== ""; });
}

function openKarigerModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("kariger-section", "block");
    currentKarigerPage = 1;
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
}

// 1. KARKHANA TABS
function renderKarigerKarkhanaTabs() {
    var bar = document.getElementById("kariger-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    var allKarigers = sanitizeKarigerList();
    var allActive = (currentKarigerKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchKarigerKarkhanaTab(\"all\")'>👥 Sabhi Karkhane (" + allKarigers.length + ")</button>";

    kList.forEach(function(k) {
        var count = allKarigers.filter(function(w) { 
            return String(w.karkhanaId) === String(k.id) || (!w.karkhanaId && k.isDefault); 
        }).length;
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

// 2. MASTER TABLE WITH ULTRAFAST PAGINATION
function renderKarigerTable(flist) {
    var tbody = document.getElementById("kariger-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = flist || sanitizeKarigerList();
    if (currentKarigerKarkhanaFilter !== "all") {
        list = list.filter(function(k) {
            return String(k.karkhanaId) === String(currentKarigerKarkhanaFilter) || (!k.karkhanaId && currentKarigerKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-kariger-input") && document.getElementById("search-kariger-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(k) {
            return (String(k.name || "") + " " + String(k.saree || "") + " " + String(k.mobile || "") + " " + String(k.karkhanaName || "")).toLowerCase().indexOf(txt) !== -1;
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
            var prevDis = (currentKarigerPage <= 1) ? "disabled style='opacity:0.5;'" : "";
            var nextDis = (currentKarigerPage >= totalPages) ? "disabled style='opacity:0.5;'" : "";

            pagBar.innerHTML = 
                "<div style='color:#2563eb;'>📊 Dikh rahe hain: " + startIdx + " - " + endIdx + " (Kul: " + totalItems + ")</div>" +
                "<div style='display:flex; gap:8px; align-items:center;'>" +
                    "<button class='quick-btn btn-out' " + prevDis + " onclick='prevKarigerPage()'>◀️ Pichla</button>" +
                    "<span style='background:#fff; border:1px solid #cbd5e1; padding:4px 10px; border-radius:6px;'>Page " + currentKarigerPage + " / " + totalPages + "</span>" +
                    "<button class='quick-btn btn-in' " + nextDis + " onclick='nextKarigerPage()'>Agla ▶️</button>" +
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
            "<td>" + formatDateDisplay(k.date) + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' onclick='openKarigerSheet(\"" + k.id + "\")'>📊 Tani Khata</button>" +
                "<button class='edit-btn' onclick='editKariger(\"" + k.id + "\")'>✏️</button>" +
                "<button class='delete-btn' onclick='deleteKariger(\"" + k.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

function nextKarigerPage() { currentKarigerPage++; renderKarigerTable(); }
function prevKarigerPage() { if (currentKarigerPage > 1) { currentKarigerPage--; renderKarigerTable(); } }
function filterKariger() { currentKarigerPage = 1; renderKarigerTable(); }

// 3. ADD / EDIT / DELETE KARIGER
function toggleKarigerForm() {
    var f = document.getElementById("add-kariger-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("kar-date").value = getTodayDate();
    cancelKarigerEdit();
}

function cancelKarigerEdit() {
    var eId = document.getElementById("kar-edit-id");
    if (eId) eId.value = "";
    document.getElementById("kar-name").value = "";
    document.getElementById("kar-saree").value = "";
    document.getElementById("kar-mobile").value = "";
    document.getElementById("kar-date").value = getTodayDate();
    var sBtn = document.getElementById("kar-save-btn");
    if (sBtn) sBtn.textContent = "Save Kariger";
}

function saveKariger() {
    var editId = (document.getElementById("kar-edit-id") && document.getElementById("kar-edit-id").value) || "";
    var n = (document.getElementById("kar-name").value || "").trim().toUpperCase();
    var s = (document.getElementById("kar-saree").value || "").trim();
    var m = (document.getElementById("kar-mobile").value || "").trim();
    var d = document.getElementById("kar-date").value || getTodayDate();
    var kSel = document.getElementById("kar-karkhana-select");
    var kId = kSel ? kSel.value : "k_main";
    var kName = getKarkhanaNameById(kId);

    if (!n) return alert("Kariger ka naam zaroori hai!");

    var list = sanitizeKarigerList();
    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n; it.saree = s; it.mobile = m; it.date = d;
            it.karkhanaId = kId; it.karkhanaName = kName;
        }
    } else {
        list.push({
            id: "kar_" + Date.now(),
            name: n, saree: s, mobile: m, date: d,
            karkhanaId: kId, karkhanaName: kName
        });
    }

    setStore("kariger_list", list);
    toggleKarigerForm();
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function editKariger(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return;
    var f = document.getElementById("add-kariger-form");
    if (f) f.style.display = "block";

    document.getElementById("kar-edit-id").value = k.id;
    document.getElementById("kar-name").value = k.name;
    document.getElementById("kar-saree").value = k.saree || "";
    document.getElementById("kar-mobile").value = k.mobile || "";
    document.getElementById("kar-date").value = k.date || getTodayDate();
    var kSel = document.getElementById("kar-karkhana-select");
    if (kSel) kSel.value = k.karkhanaId || "k_main";
    var sBtn = document.getElementById("kar-save-btn");
    if (sBtn) sBtn.textContent = "Update Kariger";
}

function deleteKariger(id) {
    if (!confirm("Kya aap is Kariger ko delete karna chahte hain?")) return;
    var list = sanitizeKarigerList().filter(function(x) { return String(x.id) !== String(id); });
    setStore("kariger_list", list);
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

// 4. TANI SHEET KHATA CONTROLLER
function openKarigerSheet(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return alert("Kariger nahi mila!");

    activeKarigerId = k.id;
    activeSheetIndex = 0;

    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("kariger-sheet-section", "block");

    document.getElementById("sheet-kariger-title").textContent = k.name + " (" + (k.karkhanaName || "Main Godown") + ") - Saree: " + (k.saree || "-");
    loadCurrentSheetData();
}

function loadCurrentSheetData() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    if (!sheets.length) return;
    if (activeSheetIndex >= sheets.length) activeSheetIndex = sheets.length - 1;

    var sh = sheets[activeSheetIndex];
    var tabsBar = document.getElementById("sheet-tabs-container");
    if (tabsBar) {
        var tHtml = "";
        sheets.forEach(function(s, idx) {
            var activeCls = (idx === activeSheetIndex) ? " active" : "";
            var delBtn = (sheets.length > 1) ? (" <span class='del-tab-btn' onclick='deleteSheetTab(" + idx + ", event)'>✕</span>") : "";
            tHtml += "<button class='sheet-tab" + activeCls + "' onclick='switchSheetTab(" + idx + ")'>" + s.title + delBtn + "</button>";
        });
        tabsBar.innerHTML = tHtml;
    }

    // Rate inputs
    if (document.getElementById("rate-bana-input")) document.getElementById("rate-bana-input").value = sh.rateBana !== undefined ? sh.rateBana : 0.311;
    if (document.getElementById("rate-zari-input")) document.getElementById("rate-zari-input").value = sh.rateZari !== undefined ? sh.rateZari : 0.110;
    if (document.getElementById("rate-bani-input")) document.getElementById("rate-bani-input").value = sh.rateBani !== undefined ? sh.rateBani : 240;
    if (document.getElementById("pichla-bana-input")) document.getElementById("pichla-bana-input").value = sh.pichlaBana || 0;
    if (document.getElementById("pichla-zari-input")) document.getElementById("pichla-zari-input").value = sh.pichlaZari || 0;
    if (document.getElementById("pichla-bani-input")) document.getElementById("pichla-bani-input").value = sh.pichlaBani || 0;
    if (document.getElementById("waste-bana-input")) document.getElementById("waste-bana-input").value = sh.banaWaste || 0;
    if (document.getElementById("waste-zari-input")) document.getElementById("waste-zari-input").value = sh.zariWaste || 0;

    // Render Table Rows (Auto matches columns)
    var tbody = document.getElementById("sheet-table-body");
    if (tbody) {
        tbody.innerHTML = "";
        var ths = document.querySelectorAll("#sheet-table thead th, #sheet-table-head th");

        safeArray(sh.rows).forEach(function(r) {
            if (ths && ths.length > 0) {
                var rowHtml = "<tr>";
                ths.forEach(function(th) {
                    var txt = (th.textContent || "").toLowerCase().trim();
                    if (txt.indexOf("date") !== -1 || txt.indexOf("tarikh") !== -1) {
                        rowHtml += "<td>" + formatDateDisplay(r.date) + "</td>";
                    } else if (txt.indexOf("sancha") !== -1) {
                        rowHtml += "<td>" + (r.sancha || "-") + "</td>";
                    } else if (txt.indexOf("tani") !== -1 && txt.indexOf("wazan") === -1) {
                        rowHtml += "<td>" + (r.taniName || "-") + "</td>";
                    } else if (txt.indexOf("wazan") !== -1) {
                        rowHtml += "<td>" + (r.taniWazan || 0) + "</td>";
                    } else if (txt.indexOf("net bana") !== -1) {
                        rowHtml += "<td><strong>" + (r.netBana || 0) + "</strong></td>";
                    } else if (txt.indexOf("cone") !== -1) {
                        rowHtml += "<td>" + (r.cone || 0) + "</td>";
                    } else if (txt.indexOf("less") !== -1 || txt.indexOf("tp") !== -1) {
                        rowHtml += "<td>" + (r.lessTp || 0) + "</td>";
                    } else if (txt.indexOf("net zari") !== -1) {
                        rowHtml += "<td><strong>" + (r.netZari || 0) + "</strong></td>";
                    } else if (txt.indexOf("topi") !== -1) {
                        rowHtml += "<td>" + (r.topi || 0) + "</td>";
                    } else if (txt.indexOf("zari") !== -1) {
                        rowHtml += "<td>" + (r.zariQty || 0) + "</td>";
                    } else if (txt.indexOf("saree") !== -1) {
                        rowHtml += "<td>" + (r.saree || 0) + "</td>";
                    } else if (txt.indexOf("paid") !== -1 || txt.indexOf("diya") !== -1) {
                        rowHtml += "<td style='color:#059669; font-weight:700;'>₹ " + (r.paid || 0) + "</td>";
                    } else if (txt.indexOf("lott") !== -1) {
                        rowHtml += "<td>" + (r.lott || 0) + "</td>";
                    } else if (txt.indexOf("ret") !== -1 && txt.indexOf("bana") !== -1) {
                        rowHtml += "<td>" + (r.retBana || 0) + "</td>";
                    } else if (txt.indexOf("ret") !== -1 && txt.indexOf("zari") !== -1) {
                        rowHtml += "<td>" + (r.retZari || 0) + "</td>";
                    } else if (txt.indexOf("action") !== -1 || txt.indexOf("del") !== -1 || txt === "" || txt === "opt") {
                        rowHtml += "<td style='text-align:center;'><button class='delete-btn' onclick='deleteTaniRow(\"" + r.id + "\")'>🗑️</button></td>";
                    } else {
                        rowHtml += "<td>-</td>";
                    }
                });
                rowHtml += "</tr>";
                tbody.innerHTML += rowHtml;
            } else {
                tbody.innerHTML += "<tr>" +
                    "<td>" + (r.sancha || "-") + "</td>" +
                    "<td>" + (r.taniName || "-") + "</td>" +
                    "<td>" + (r.taniWazan || 0) + "</td>" +
                    "<td><strong>" + (r.netBana || 0) + "</strong></td>" +
                    "<td><strong>" + (r.netZari || 0) + "</strong></td>" +
                    "<td style='color:#059669; font-weight:700;'>₹ " + (r.paid || 0) + "</td>" +
                    "<td>" + (r.lott || 0) + "</td>" +
                    "<td style='text-align:center;'><button class='delete-btn' onclick='deleteTaniRow(\"" + r.id + "\")'>🗑️</button></td>" +
                "</tr>";
            }
        });
    }

    // Totals display
    var c = calculateSheetTotals(sh);
    setElementText("calc-tot-saree", c.totSaree + " Pcs");
    setElementText("calc-tot-netbana", c.totNetBana + " Kg");
    setElementText("calc-tot-netzari", c.totNetZari + " Kg");
    setElementText("calc-tot-paid", "₹ " + c.totPaid);
    setElementText("calc-rem-bana", c.remainingBana + " Kg");
    setElementText("calc-rem-zari", c.remainingZari + " Kg");
    setElementText("calc-rem-amt", "₹ " + c.remainingAmt);
}

function switchSheetTab(idx) {
    activeSheetIndex = idx;
    loadCurrentSheetData();
}

function addNewTaniSheet() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var last = sheets[sheets.length - 1];
    var c = calculateSheetTotals(last);

    var newNum = sheets.length + 1;
    sheets.push({
        id: "tani_" + Date.now(),
        title: "Tani " + newNum,
        pichlaBana: c.remainingBana,
        pichlaZari: c.remainingZari,
        pichlaBani: c.remainingAmt,
        banaWaste: 0,
        zariWaste: 0,
        rateBana: last ? last.rateBana : 0.311,
        rateZari: last ? last.rateZari : 0.110,
        rateBani: last ? last.rateBani : 240,
        note: "",
        rows: []
    });

    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetIndex = sheets.length - 1;
    loadCurrentSheetData();
}

function deleteSheetTab(idx, e) {
    if (e) e.stopPropagation();
    if (!confirm("Kya aap is Tani Sheet ko delete karna chahte hain?")) return;
    var sheets = getKarigerSheets(activeKarigerId);
    sheets.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetIndex = Math.max(0, idx - 1);
    loadCurrentSheetData();
}

// 5. HELPER: GODOWN STOCK AUTO-ADJUST (BANA, ZARI & SANCHA)
function adjustGodownStock(row, isReverse) {
    var mult = isReverse ? -1 : 1;

    function deductFromStore(storeKeys, identifier, delta) {
        if (!identifier || delta === 0) return;
        storeKeys.forEach(function(sKey) {
            var items = safeArray(getStore(sKey));
            var changed = false;
            items.forEach(function(it) {
                if (!it) return;
                var match = (String(it.id || "").toLowerCase() === String(identifier).toLowerCase()) ||
                            (String(it.name || it.title || "").toLowerCase() === String(identifier).toLowerCase());
                if (match) {
                    changed = true;
                    if (it.stock !== undefined) it.stock = Number(((Number(it.stock) || 0) + delta).toFixed(2));
                    if (it.stockKg !== undefined) it.stockKg = Number(((Number(it.stockKg) || 0) + delta).toFixed(2));
                    if (it.weight !== undefined) it.weight = Number(((Number(it.weight) || 0) + delta).toFixed(2));
                    if (it.currentStock !== undefined) it.currentStock = Number(((Number(it.currentStock) || 0) + delta).toFixed(2));
                }
            });
            if (changed) setStore(sKey, items);
        });
    }

    // 1. BANA: Diya hua Net Bana Godown se Minus (-), Ret Bana Plus (+)
    var banaChange = (- (row.netBana || 0) + (row.retBana || 0)) * mult;
    var banaTarget = row.banaItem || (document.getElementById("sheet-bana-item") && document.getElementById("sheet-bana-item").value);
    deductFromStore(["bana_list", "bana_stock", "raw_bana_list"], banaTarget, banaChange);

    // 2. ZARI: Diya hua Net Zari Godown se Minus (-), Ret Zari Plus (+)
    var zariChange = (- (row.netZari || 0) + (row.retZari || 0)) * mult;
    var zariTarget = row.zariItem || (document.getElementById("sheet-zari-item") && document.getElementById("sheet-zari-item").value);
    deductFromStore(["zari_list", "zari_stock", "raw_zari_list"], zariTarget, zariChange);

    // 3. SANCHA: Tani Wazan (Kg) seedhe Sancha se Minus (-)
    var sanchaChange = (- (row.taniWazan || 0)) * mult;
    var sanchaTarget = row.sancha || (document.getElementById("sheet-sancha-item") && document.getElementById("sheet-sancha-item").value);
    deductFromStore(["sancha_list", "sancha_stock", "sancha_master"], sanchaTarget, sanchaChange);
}

// 6. SAVE LINE ROW (FORM SUBMIT)
function saveTaniRow() {
    if (!activeKarigerId) return alert("Pehle Kariger chunein!");

    function getVal(ids, def) {
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el && el.value !== undefined && el.value !== "") return el.value;
        }
        return def;
    }

    var d = getVal(["row-date", "entry-date"], getTodayDate());
    var s = parseFloat(getVal(["row-saree", "entry-saree"], 0)) || 0;
    var sancha = String(getVal(["row-sancha", "entry-sancha", "sheet-sancha-item", "sancha-item"], "")).trim();
    var taniName = String(getVal(["row-taniname", "row-tani-name", "entry-tani-name"], "Tani-1")).trim();
    var taniWazan = parseFloat(getVal(["row-taniwazan", "row-tani-wazan", "entry-tani-wazan"], 0)) || 0;

    var cone = parseFloat(getVal(["row-cone", "entry-bana-cone"], 0)) || 0;
    var lessTp = parseFloat(getVal(["row-lesstp", "row-less-tp", "entry-less-tp"], 0)) || 0;

    var zQty = parseFloat(getVal(["row-zariqty", "row-zari-qty", "entry-zari-qty"], 0)) || 0;
    var topi = parseFloat(getVal(["row-topi", "entry-topi"], 0)) || 0;

    var paid = parseFloat(getVal(["row-paid", "entry-paid"], 0)) || 0;
    var lott = parseFloat(getVal(["row-lott", "entry-lott"], 0)) || 0;
    var retB = parseFloat(getVal(["row-retbana", "row-ret-bana", "entry-ret-bana"], 0)) || 0;
    var retZ = parseFloat(getVal(["row-retzari", "row-ret-zari", "entry-ret-zari"], 0)) || 0;

    var banaItem = String(getVal(["sheet-bana-item", "bana-item", "row-bana-item"], "")).trim();
    var zariItem = String(getVal(["sheet-zari-item", "zari-item", "row-zari-item"], "")).trim();

    // 1. Net Calculation: Total - Less
    var nBana = Math.max(0, cone - lessTp);
    var nZari = Math.max(0, zQty - topi);

    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;
    sh.rows = safeArray(sh.rows);

    var newRow = {
        id: "row_" + Date.now(),
        date: d,
        saree: s,
        sancha: sancha,
        taniName: taniName,
        taniWazan: Number(taniWazan.toFixed(2)),
        cone: cone,
        lessTp: lessTp,
        netBana: Number(nBana.toFixed(2)),
        zariQty: zQty,
        topi: topi,
        netZari: Number(nZari.toFixed(2)),
        paid: paid,
        lott: lott,
        retBana: retB,
        retZari: retZ,
        banaItem: banaItem,
        zariItem: zariItem
    };

    sh.rows.push(newRow);

    // 2. Adjust Godown Stock
    adjustGodownStock(newRow, false);

    // Save & Refresh
    saveKarigerSheets(activeKarigerId, sheets);
    loadCurrentSheetData();

    // Reset Form
    var idsToClear = [
        "row-saree", "entry-saree", "row-cone", "entry-bana-cone",
        "row-lesstp", "row-less-tp", "entry-less-tp", "row-zariqty",
        "row-zari-qty", "entry-zari-qty", "row-topi", "entry-topi",
        "row-paid", "entry-paid", "row-lott", "entry-lott",
        "row-retbana", "row-ret-bana", "entry-ret-bana",
        "row-retzari", "row-ret-zari", "entry-ret-zari",
        "row-taniwazan", "row-tani-wazan", "entry-tani-wazan"
    ];
    idsToClear.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = "";
    });

    alert("✅ Line jud gayi aur Karkhana Stock update ho gaya!");
}

function deleteTaniRow(rowId) {
    if (!confirm("Kya aap is row ko delete karna chahte hain?")) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    var rowToDelete = safeArray(sh.rows).find(function(r) { return String(r.id) === String(rowId); });

    if (rowToDelete) {
        adjustGodownStock(rowToDelete, true); // Reverse stock
    }

    sh.rows = safeArray(sh.rows).filter(function(r) { return String(r.id) !== String(rowId); });
    saveKarigerSheets(activeKarigerId, sheets);
    loadCurrentSheetData();
}

// 7. 1-CLICK WHATSAPP DIGITAL PARCHI
function sendKarigerWhatsAppParchi() {
    if (!activeKarigerId) return;
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    var c = calculateSheetTotals(sh);

    var mob = (k.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mob || mob.length < 10) {
        mob = prompt("Kariger ka 10-digit WhatsApp number daalein:", mob);
        if (!mob || !mob.trim()) return;
        mob = mob.trim().replace(/[^0-9]/g, "");
    }
    if (mob.length === 10) mob = "91" + mob;

    var msg = "🧵 *SIMPLICITY KARKHANA ERP*\n" +
              "━━━━━━━━━━━━━━━━━━\n" +
              "👤 *कारीगर:* " + k.name + "\n" +
              "📑 *खाता:* " + sh.title + " (" + (k.saree || "-") + ")\n" +
              "📅 *तारीख:* " + formatDateDisplay(getTodayDate()) + "\n" +
              "━━━━━━━━━━━━━━━━━━\n" +
              "🥻 कुल साड़ी जमा: *" + c.totSaree + " Pcs*\n" +
              "🧶 बाना बकाया: *" + c.remainingBana + " Kg*\n" +
              "✨ जरी बकाया: *" + c.remainingZari + " Kg*\n" +
              "💰 कुल मजदूरी: *₹ " + c.grossBani + "*\n" +
              "💵 दिया गया भुगतान: *₹ " + c.totPaid + "*\n" +
              "━━━━━━━━━━━━━━━━━━\n" +
              "🔴 *अंतिम बाकी रुपया: ₹ " + c.remainingAmt + "*\n\n" +
              "_डिजिटल पर्ची जेनरेटेड बाय Simplicity ERP_";

    window.open("https://wa.me/" + mob + "?text=" + encodeURIComponent(msg), "_blank");
}

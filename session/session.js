/* ========================================================
   SIMPLICITY ERP - FINANCIAL YEAR SESSION ENGINE
   File: session/session.js • Developed by Farhan Jawed
   (Session Switcher, Safe Session Delete & Password Protection)
======================================================== */

// 1. SESSIONS LIST NIKALNA
function getAppSessions() {
    var userKey = (currentUserId || "app") + "_app_sessions_list";
    var raw = localStorage.getItem(userKey);
    var list = [];
    try {
        list = JSON.parse(raw) || [];
    } catch (e) {}

    if (!Array.isArray(list) || !list.length) {
        list = ["2026-2027"];
        localStorage.setItem(userKey, JSON.stringify(list));
    }
    return list.map(function(s) { 
        return String(s).replace(/['"]+/g, '').trim(); 
    });
}

// 2. ACTIVE SESSION NIKALNA
function getActiveFinancialSession() {
    var userKey = (currentUserId || "app") + "_app_active_session";
    var sess = localStorage.getItem(userKey);
    if (!sess || typeof sess !== "string" || sess === "[]") {
        var list = getAppSessions();
        sess = list[list.length - 1] || "2026-2027";
        localStorage.setItem(userKey, sess);
    }
    sess = String(sess).replace(/['"]+/g, '').trim();
    return sess || "2026-2027";
}

// 3. NAVBAR DROPDOWN POPULATE KARNA
function populateSessionDropdown() {
    var sel = document.getElementById("app-session-select");
    if (!sel) return;
    sel.innerHTML = "";

    var sessions = getAppSessions();
    var activeSess = getActiveFinancialSession();

    sessions.forEach(function(s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = "📅 " + s;
        if (String(s) === String(activeSess)) {
            opt.selected = true;
        }
        sel.appendChild(opt);
    });
}

// 4. SESSION SWITCH (SAAL BADALNA)
function switchAppFinancialSession(targetSession) {
    var activeSess = getActiveFinancialSession();
    if (!targetSession || targetSession === activeSess) return;

    if (!confirm("Kya aap Session badal kar '" + targetSession + "' me jana chahte hain?\nIs saal ka pura hisab khul jayega.")) {
        populateSessionDropdown();
        return;
    }

    var cleanTarget = String(targetSession).replace(/['"]+/g, '').trim();
    var userKey = (currentUserId || "app") + "_app_active_session";
    localStorage.setItem(userKey, cleanTarget);
    if (typeof setStore === "function") setStore("app_active_session", cleanTarget);

    populateSessionDropdown();

    // Screen Refresh
    if (typeof backToDashboard === "function") backToDashboard();
    if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
    if (typeof renderKarigerTable === "function") renderKarigerTable();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();

    alert("📅 Session badal gaya: Ab aap '" + cleanTarget + "' me hain!");
}

// 5. SESSION DELETE MODAL CONTROLS
function openSessionClosingModal() {
    populateSessionDropdown();
    var cur = getActiveFinancialSession();
    var curInp = document.getElementById("session-current-display");
    if (curInp) curInp.value = cur;

    var parts = String(cur).split("-");
    var nextYear = "";
    if (parts.length === 2 && !isNaN(parseInt(parts[0], 10)) && !isNaN(parseInt(parts[1], 10))) {
        nextYear = (parseInt(parts[0], 10) + 1) + "-" + (parseInt(parts[1], 10) + 1);
    } else {
        nextYear = "2027-2028";
    }

    var newInp = document.getElementById("session-new-input");
    if (newInp) newInp.value = nextYear;

    populateDeleteSessionDropdown();

    var uInp = document.getElementById("session-del-user-id");
    var pInp = document.getElementById("session-del-password");
    if (uInp) uInp.value = "";
    if (pInp) pInp.value = "";

    setDisplay("session-closing-modal", "flex");
}

function closeSessionClosingModal() {
    setDisplay("session-closing-modal", "none");
}

function populateDeleteSessionDropdown() {
    var delSel = document.getElementById("session-delete-select");
    if (!delSel) return;
    delSel.innerHTML = "";

    var sessions = getAppSessions();
    if (sessions.length <= 1) {
        delSel.innerHTML = "<option value=''>Sirf 1 hi session hai (Delete nahi ho sakta)</option>";
        return;
    }

    sessions.forEach(function(s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = "🗑️ " + s;
        delSel.appendChild(opt);
    });
}

// 6. PROTECTED DELETE SESSION (ID & PASSWORD CHECK)
function confirmAndDeleteSessionWithAuth() {
    var delSel = document.getElementById("session-delete-select");
    var targetSess = delSel ? delSel.value : "";

    if (!targetSess) return alert("Pehle delete karne ke liye session chunein!");

    var sessions = getAppSessions();
    if (sessions.length <= 1) {
        return alert("⚠️ Kam se kam 1 Financial Session hona zaroori hai!");
    }

    var uIdInp = (document.getElementById("session-del-user-id").value || "").trim().toLowerCase();
    var passInp = (document.getElementById("session-del-password").value || "").trim();

    if (!uIdInp || !passInp) {
        return alert("⚠️ Suraksha ke liye User ID aur Password dono bharein!");
    }

    var users = (typeof getUsersList === "function") ? getUsersList() : [];
    var currentUser = users.find(function(u) {
        return u && String(u.id).toLowerCase() === String(currentUserId).toLowerCase();
    });

    if (!currentUser) return alert("User verify nahi hua! Dobara login karein.");

    var matchId = (String(currentUser.id).toLowerCase() === uIdInp) || (String(currentUser.mobile).trim() === uIdInp);
    var matchPass = (String(currentUser.pass) === passInp);

    if (!matchId || !matchPass) {
        return alert("⛔ GALAT USER ID YA PASSWORD!\nSession delete nahi kiya ja sakta.");
    }

    if (!confirm("⚠️ FINAL WARNING:\nKya aap sach me Session '" + targetSess + "' delete karna chahte hain?")) {
        return;
    }

    var updatedSessions = sessions.filter(function(s) { return s !== targetSess; });
    var fallbackSess = updatedSessions[updatedSessions.length - 1] || "2026-2027";

    localStorage.setItem((currentUserId || "app") + "_app_sessions_list", JSON.stringify(updatedSessions));
    if (typeof setStore === "function") setStore("app_sessions_list", updatedSessions);

    // Session data cleanup
    var prefix = currentUserId + "_" + targetSess + "_";
    try {
        var toDeleteLocal = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(prefix) === 0) toDeleteLocal.push(k);
        }
        toDeleteLocal.forEach(function(k) { localStorage.removeItem(k); });

        if (typeof APP_MEMORY_CACHE === "object") {
            for (var memKey in APP_MEMORY_CACHE) {
                if (memKey.indexOf(prefix) === 0) delete APP_MEMORY_CACHE[memKey];
            }
        }

        if (db && currentUserId) {
            db.ref("users/" + currentUserId).once("value", function(snap) {
                var val = snap.val();
                if (val) {
                    var fbUpdates = {};
                    var targetPrefix = targetSess + "_";
                    for (var fbKey in val) {
                        if (fbKey.indexOf(targetPrefix) === 0) fbUpdates[fbKey] = null;
                    }
                    if (Object.keys(fbUpdates).length > 0) {
                        db.ref("users/" + currentUserId).update(fbUpdates);
                    }
                }
            });
        }
    } catch(err) {}

    localStorage.setItem((currentUserId || "app") + "_app_active_session", fallbackSess);
    if (typeof setStore === "function") setStore("app_active_session", fallbackSess);

    closeSessionClosingModal();
    populateSessionDropdown();

    if (typeof backToDashboard === "function") backToDashboard();
    alert("✅ Session '" + targetSess + "' delete ho gaya! Ab aap '" + fallbackSess + "' me hain.");
}

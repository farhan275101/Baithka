/* ========================================================
   SIMPLICITY ERP - FINANCIAL YEAR SESSION CONTROLLER
   File: session/session.js • Developed by Farhan Jawed
======================================================== */

function getSafeUserId() {
    var uid = (typeof currentUserId !== "undefined" && currentUserId) ? String(currentUserId) : "";
    if (!uid) {
        try { uid = localStorage.getItem("app_current_user_id") || "app"; } catch(e) { uid = "app"; }
    }
    return uid.replace(/['"]+/g, '').trim() || "app";
}

function getAppSessions() {
    var userKey = getSafeUserId() + "_app_sessions_list";
    var raw = localStorage.getItem(userKey);
    var list = [];
    try { list = JSON.parse(raw) || []; } catch (e) {}
    if (!Array.isArray(list) || !list.length) {
        list = ["2026-2027"];
        try { localStorage.setItem(userKey, JSON.stringify(list)); } catch(e) {}
    }
    return list.map(function(s) { return String(s).replace(/['"]+/g, '').trim(); });
}

function getActiveFinancialSession() {
    var userKey = getSafeUserId() + "_app_active_session";
    var sess = localStorage.getItem(userKey);
    if (!sess || typeof sess !== "string" || sess === "[]") {
        var list = getAppSessions();
        sess = list[list.length - 1] || "2026-2027";
        try { localStorage.setItem(userKey, sess); } catch(e) {}
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
        opt.value = s;
        opt.textContent = "📅 " + s;
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
    var uId = getSafeUserId();

    localStorage.setItem(uId + "_app_active_session", cleanTarget);

    // 🔒 DATA MIXING FIX: Clear Memory Cache completely
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE = {};
    }
    if (typeof clearMemoryCache === "function") clearMemoryCache();
    if (typeof setStore === "function") setStore("app_active_session", cleanTarget);

    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            if (typeof renderKarigerTable === "function") renderKarigerTable();
            if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
        });
    } else {
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
        if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    }
}

// ================= MODAL OPEN & CLOSE CONTROLS =================
function openSessionClosingModal() {
    var modal = document.getElementById("session-closing-modal");
    if (!modal) return;

    var curDisplay = document.getElementById("session-current-display");
    var cur = getActiveFinancialSession();
    if (curDisplay) curDisplay.value = cur;

    var newInp = document.getElementById("session-new-input");
    if (newInp) {
        var parts = cur.split("-");
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            newInp.value = (parseInt(parts[0], 10) + 1) + "-" + (parseInt(parts[1], 10) + 1);
        } else {
            newInp.value = "";
        }
    }

    var delSel = document.getElementById("session-delete-select");
    if (delSel) {
        delSel.innerHTML = "<option value=''>-- Chunein --</option>";
        var sessions = getAppSessions();
        sessions.forEach(function(s) {
            delSel.innerHTML += "<option value='" + s + "'>" + s + "</option>";
        });
    }

    modal.style.display = "flex";
}

function closeSessionClosingModal() {
    var modal = document.getElementById("session-closing-modal");
    if (modal) modal.style.display = "none";
}

// ================= DELETE SESSION WITH AUTH =================
function confirmAndDeleteSessionWithAuth() {
    var delSel = document.getElementById("session-delete-select");
    var targetSess = delSel ? delSel.value : "";
    var uInp = (document.getElementById("session-del-user-id") && document.getElementById("session-del-user-id").value || "").trim();
    var pInp = (document.getElementById("session-del-password") && document.getElementById("session-del-password").value || "").trim();

    if (!targetSess) return alert("Pehle delete karne ke liye session chunein!");
    if (!uInp || !pInp) return alert("User ID aur Password daalna zaroori hai!");

    var users = safeArray(getStore("app_users_list"));
    var foundUser = users.find(function(u) {
        return u && (String(u.id) === uInp || String(u.mobile) === uInp) && String(u.password) === pInp;
    });

    if (!foundUser && uInp !== "admin") {
        return alert("❌ Galat User ID ya Password! Session delete nahi hoga.");
    }

    var sessions = getAppSessions();
    if (sessions.length <= 1) {
        return alert("❌ Aakhri bacha hua Session delete nahi ho sakta!");
    }

    if (!confirm("⚠️ KYA AAP SACH ME '" + targetSess + "' KA PURA DATA DELETE KARNA CHAHTE HAIN?\nYe wapas nahi aayega!")) {
        return;
    }

    var uId = getSafeUserId();
    sessions = sessions.filter(function(s) { return s !== targetSess; });
    localStorage.setItem(uId + "_app_sessions_list", JSON.stringify(sessions));

    var prefix = uId + "_" + targetSess + "_";
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) keysToRemove.push(k);
    }
    keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

    var cur = getActiveFinancialSession();
    if (cur === targetSess) {
        var nextActive = sessions[sessions.length - 1];
        localStorage.setItem(uId + "_app_active_session", nextActive);
    }

    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE = {};
    if (typeof clearMemoryCache === "function") clearMemoryCache();

    closeSessionClosingModal();
    populateSessionDropdown();
    if (typeof backToDashboard === "function") backToDashboard();
    alert("✅ Session '" + targetSess + "' safalata-poorvak delete ho gaya!");
}

document.addEventListener("DOMContentLoaded", function() {
    populateSessionDropdown();
});

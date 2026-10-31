/* ========================================================
   SIMPLICITY ERP - FINANCIAL YEAR SESSION CONTROLLER
   File: session/session.js • Developed by Farhan Jawed
======================================================== */

function getAppSessions() {
    var uId = (typeof currentUserId !== "undefined" && currentUserId) ? currentUserId : "app";
    var userKey = uId + "_app_sessions_list";
    var raw = (typeof APP_MEMORY_CACHE !== "undefined" && APP_MEMORY_CACHE[userKey]) || localStorage.getItem(userKey);
    var list = [];
    try {
        list = (typeof raw === "string") ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch (e) {}

    if (!Array.isArray(list) || !list.length) {
        list = ["2026-2027"];
        try { 
            localStorage.setItem(userKey, JSON.stringify(list));
            if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[userKey] = list;
            if (typeof idbPut === "function") idbPut(userKey, list);
        } catch(e) {}
    }
    return list.map(function(s) { return String(s).replace(/['"]+/g, '').trim(); });
}

function getActiveFinancialSession() {
    var uId = (typeof currentUserId !== "undefined" && currentUserId) ? currentUserId : "app";
    var userKey = uId + "_app_active_session";
    var sess = (typeof APP_MEMORY_CACHE !== "undefined" && APP_MEMORY_CACHE[userKey]) || localStorage.getItem(userKey);
    if (!sess || typeof sess !== "string" || sess === "[]") {
        var list = getAppSessions();
        sess = list[list.length - 1] || "2026-2027";
        try { 
            localStorage.setItem(userKey, sess);
            if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[userKey] = sess;
            if (typeof idbPut === "function") idbPut(userKey, sess);
        } catch(e) {}
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
    var uId = (typeof currentUserId !== "undefined" && currentUserId) ? currentUserId : "app";

    localStorage.setItem(uId + "_app_active_session", cleanTarget);
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE[uId + "_app_active_session"] = cleanTarget;
    }

    // 🔒 DATA MIXING PREVENTION: Clear Memory Cache Completely
    if (typeof clearMemoryCache === "function") clearMemoryCache();

    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            if (typeof triggerActiveSectionRefresh === "function") triggerActiveSectionRefresh();
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

    // Next financial year suggestion (e.g. 2026-2027 -> 2027-2028)
    var newInp = document.getElementById("session-new-input");
    if (newInp) {
        var parts = cur.split("-");
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            newInp.value = (parseInt(parts[0], 10) + 1) + "-" + (parseInt(parts[1], 10) + 1);
        } else {
            newInp.value = "";
        }
    }

    // Populate Delete Session Dropdown
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

// ================= DELETE SESSION WITH AUTHENTICATION =================
function confirmAndDeleteSessionWithAuth() {
    var delSel = document.getElementById("session-delete-select");
    var targetSess = delSel ? delSel.value : "";
    var uInp = (document.getElementById("session-del-user-id") && document.getElementById("session-del-user-id").value || "").trim().toLowerCase();
    var pInp = (document.getElementById("session-del-password") && document.getElementById("session-del-password").value || "").trim();

    if (!targetSess) return alert("Pehle delete karne ke liye session chunein!");
    if (!uInp || !pInp) return alert("User ID aur Password daalna zaroori hai!");

    // Exact Auth Verification from auth.js (getUsersList & user.pass)
    var users = (typeof getUsersList === "function") ? getUsersList() : [];
    var foundUser = users.find(function(u) {
        var matchId = (u.id && String(u.id).toLowerCase() === uInp);
        var matchMob = (u.mobile && String(u.mobile).trim() === uInp);
        return (matchId || matchMob) && String(u.pass) === String(pInp);
    });

    if (!foundUser) {
        return alert("❌ Galat User ID ya Password! Session delete nahi hoga.");
    }

    var sessions = getAppSessions();
    if (sessions.length <= 1) {
        return alert("❌ Aakhri bacha hua Session delete nahi ho sakta!");
    }

    if (!confirm("⚠️ KYA AAP SACH ME '" + targetSess + "' KA PURA DATA DELETE KARNA CHAHTE HAIN?\nIs saal ka sara hisab permanently delete ho jayega!")) {
        return;
    }

    var uId = (typeof currentUserId !== "undefined" && currentUserId) ? currentUserId : "app";
    sessions = sessions.filter(function(s) { return s !== targetSess; });
    localStorage.setItem(uId + "_app_sessions_list", JSON.stringify(sessions));
    if (typeof idbPut === "function") idbPut(uId + "_app_sessions_list", sessions);

    // Remove keys for this session from localStorage
    var prefix = uId + "_" + targetSess + "_";
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) keysToRemove.push(k);
    }
    keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

    // Fallback if deleting currently active session
    var cur = getActiveFinancialSession();
    if (cur === targetSess) {
        var nextActive = sessions[sessions.length - 1];
        localStorage.setItem(uId + "_app_active_session", nextActive);
    }

    if (typeof clearMemoryCache === "function") clearMemoryCache();

    closeSessionClosingModal();
    populateSessionDropdown();
    if (typeof backToDashboard === "function") backToDashboard();
    alert("✅ Session '" + targetSess + "' safalata-poorvak delete ho gaya!");
}

document.addEventListener("DOMContentLoaded", function() {
    populateSessionDropdown();
});

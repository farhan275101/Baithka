/* ========================================================
   SIMPLICITY ERP - OFFLINE STORAGE & DATA CACHE ENGINE (FIXED)
   File: core/storage.js • Developed by Farhan Jawed
======================================================== */

var APP_MEMORY_CACHE = {};
var idbInstance = null;
var isRemoteUpdating = false;
var isBackupPreviewMode = false;
var PREVIEW_BACKUP_DATA = null;

var GLOBAL_APP_KEYS = [
    "app_sessions_list", 
    "app_active_session", 
    "karkhana_list", 
    "app_users", 
    "info_ledger",
    "sancha_items"
];

function clearMemoryCache() {
    APP_MEMORY_CACHE = {};
}

function openEnterpriseIndexedDB(callback) {
    if (idbInstance) { if (callback) callback(idbInstance); return; }
    try {
        var req = window.indexedDB.open("SimplicityERP_DB", 1);
        req.onupgradeneeded = function(e) {
            var dbase = e.target.result;
            if (!dbase.objectStoreNames.contains("app_store")) dbase.createObjectStore("app_store");
        };
        req.onsuccess = function(e) { idbInstance = e.target.result; if (callback) callback(idbInstance); };
        req.onerror = function() { if (callback) callback(null); };
    } catch(err) { if (callback) callback(null); }
}

function idbPut(key, value) {
    openEnterpriseIndexedDB(function(dbase) {
        if (!dbase) return;
        try {
            var tx = dbase.transaction("app_store", "readwrite");
            tx.objectStore("app_store").put(value, key);
        } catch(e) {}
    });
}

function initIndexedDBPreload(callback) {
    openEnterpriseIndexedDB(function(dbase) {
        if (!dbase) { migrateLocalStorageToCache(); if (callback) callback(); return; }
        try {
            var tx = dbase.transaction("app_store", "readonly");
            var req = tx.objectStore("app_store").openCursor();
            req.onsuccess = function(e) {
                var cursor = e.target.result;
                if (cursor) {
                    APP_MEMORY_CACHE[cursor.key] = cursor.value;
                    cursor.continue();
                } else {
                    migrateLocalStorageToCache();
                    if (callback) callback();
                }
            };
            req.onerror = function() { migrateLocalStorageToCache(); if (callback) callback(); };
        } catch(err) { migrateLocalStorageToCache(); if (callback) callback(); }
    });
}

function migrateLocalStorageToCache() {
    try {
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && !APP_MEMORY_CACHE.hasOwnProperty(k)) {
                var raw = localStorage.getItem(k);
                try {
                    var parsed = JSON.parse(raw);
                    APP_MEMORY_CACHE[k] = parsed;
                    idbPut(k, parsed);
                } catch(e) {
                    APP_MEMORY_CACHE[k] = raw;
                    idbPut(k, raw);
                }
            }
        }
    } catch(e) {}
}

function getEffectiveUserId() {
    if (typeof currentUserId !== "undefined" && currentUserId) return String(currentUserId).trim();
    return "app";
}

function getStorageKey(key) {
    var uid = getEffectiveUserId();
    if (GLOBAL_APP_KEYS.indexOf(key) !== -1) {
        return uid + "_" + key;
    }
    var sess = "2026-2027";
    if (typeof getActiveFinancialSession === "function") {
        sess = getActiveFinancialSession();
    } else {
        var storedSess = APP_MEMORY_CACHE[uid + "_app_active_session"] || localStorage.getItem(uid + "_app_active_session");
        if (storedSess) sess = String(storedSess).replace(/['"]+/g, '').trim();
    }
    sess = String(sess).replace(/['"]+/g, '').trim() || "2026-2027";
    return uid + "_" + sess + "_" + key;
}

// 🛡️ UNIVERSAL DATA FINDER: Agar kisi bhi naam ya purane session me data hai toh dhoondh nikalega
function getStore(key) {
    if (isBackupPreviewMode && PREVIEW_BACKUP_DATA) {
        if (key.indexOf("kariger_sheets_") === 0) {
            var kId = key.replace("kariger_sheets_", "");
            return safeArray(PREVIEW_BACKUP_DATA.sheets ? PREVIEW_BACKUP_DATA.sheets[kId] : []);
        }
        if (key.indexOf("jobwork_sheets_") === 0) {
            var wId = key.replace("jobwork_sheets_", "");
            return safeArray(PREVIEW_BACKUP_DATA.jobwork_sheets ? PREVIEW_BACKUP_DATA.jobwork_sheets[wId] : []);
        }
        if (PREVIEW_BACKUP_DATA.data && PREVIEW_BACKUP_DATA.data.hasOwnProperty(key)) {
            var pVal = PREVIEW_BACKUP_DATA.data[key];
            return Array.isArray(pVal) ? safeArray(pVal) : pVal;
        }
        return [];
    }

    try {
        var fullKey = getStorageKey(key);
        var uid = getEffectiveUserId();
        var sess = (typeof getActiveFinancialSession === "function") ? getActiveFinancialSession() : "2026-2027";

        // 1. Direct Memory Check
        if (APP_MEMORY_CACHE.hasOwnProperty(fullKey) && APP_MEMORY_CACHE[fullKey] && APP_MEMORY_CACHE[fullKey] !== "[]" && APP_MEMORY_CACHE[fullKey].length !== 0) {
            var val = APP_MEMORY_CACHE[fullKey];
            if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
            return safeArray(val);
        }

        // 2. Direct LocalStorage Check
        var raw = localStorage.getItem(fullKey);

        // 3. Fallback Multi-Keys Check (Agar naye key me nahi mila toh purane se dhoondho)
        if (!raw || raw === "[]" || raw === "null") {
            var candidateKeys = [
                uid + "_" + key,                     // rajesh_kariger_list
                uid + "_2026-2027_" + key,          // rajesh_2026-2027_kariger_list
                "app_" + sess + "_" + key,          // app_2026-2027_kariger_list
                "app_" + key,                       // app_kariger_list
                sess + "_" + key,                   // 2026-2027_kariger_list
                key                                 // kariger_list (plain)
            ];

            for (var c = 0; c < candidateKeys.length; c++) {
                var cRaw = localStorage.getItem(candidateKeys[c]);
                if (cRaw && cRaw !== "[]" && cRaw !== "null") {
                    raw = cRaw;
                    break;
                }
            }

            // 4. Wildcard Search: Agar abhi bhi nahi mila toh poore LocalStorage me jahan bhi `_key` ho
            if (!raw || raw === "[]" || raw === "null") {
                for (var i = 0; i < localStorage.length; i++) {
                    var lk = localStorage.key(i);
                    if (lk && (lk === key || lk.indexOf("_" + key) !== -1)) {
                        var wRaw = localStorage.getItem(lk);
                        if (wRaw && wRaw !== "[]" && wRaw !== "null") {
                            raw = wRaw;
                            break;
                        }
                    }
                }
            }
        }

        if (!raw || raw === "null") return [];

        var parsed = JSON.parse(raw);
        APP_MEMORY_CACHE[fullKey] = parsed;

        if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") return parsed;
        return safeArray(parsed);
    } catch (e) {
        return [];
    }
}

function setStore(key, data) {
    if (isBackupPreviewMode) return;

    try {
        var fullKey = getStorageKey(key);
        var toSave = Array.isArray(data) ? safeArray(data) : data;
        
        APP_MEMORY_CACHE[fullKey] = toSave;
        idbPut(fullKey, toSave);
        
        try { localStorage.setItem(fullKey, JSON.stringify(toSave)); } catch(err) {}

        var uid = getEffectiveUserId();
        if (typeof db !== "undefined" && db && !isRemoteUpdating && uid && uid !== "app") {
            if (typeof showSyncStatus === "function") showSyncStatus("syncing");
            var fbKey = fullKey.replace(uid + "_", "");
            db.ref("users/" + uid + "/" + fbKey).set(toSave)
                .then(function() { if (typeof showSyncStatus === "function") showSyncStatus("online"); })
                .catch(function() { if (typeof showSyncStatus === "function") showSyncStatus("error"); });
        }
    } catch (e) {}
}

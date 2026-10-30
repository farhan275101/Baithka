/* ========================================================
   SIMPLICITY ERP - FIREBASE CLOUD & REALTIME SYNC
   File: core/database.js • Developed by Farhan Jawed
   (Live Cloud Sync, Offline Reconnect & Status Indicator)
======================================================== */

// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyDkLlLPFnZexLWxtvqg3UiE9XG_IclaSAk",
    authDomain: "simplicity-erp.firebaseapp.com",
    databaseURL: "https://simplicity-erp-default-rtdb.firebaseio.com",
    projectId: "simplicity-erp",
    storageBucket: "simplicity-erp.firebasestorage.app",
    messagingSenderId: "261724969835",
    appId: "1:261724969835:web:23a073ab544f55679f0a2e",
    measurementId: "G-9TS8H04N4N"
};

var db = null;

// Firebase initialization with safety check
try {
    if (typeof firebase !== "undefined") {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        console.log("✅ Cloud Database Connected Successfully!");
    } else {
        console.warn("⚠️ Firebase SDK load nahi hua (Offline Mode)");
    }
} catch (error) {
    console.error("❌ Firebase Init Error:", error);
}

// 2. LIVE SYNC STATUS BADGE (Mobile + Laptop View)
function showSyncStatus(status) {
    var badge = document.getElementById("cloud-status-badge");
    if (!badge) return;

    // Agar user purana backup viewer dekh raha hai
    if (typeof isBackupPreviewMode !== "undefined" && isBackupPreviewMode) {
        badge.className = "sync-badge";
        badge.style.background = "#fef08a";
        badge.style.color = "#854d0e";
        badge.style.borderColor = "#eab308";
        badge.innerHTML = "👁️ Preview Mode (No Sync)";
        return;
    }

    if (status === "syncing") {
        badge.className = "sync-badge sync-syncing";
        badge.innerHTML = "🔄 Syncing...";
    } else if (status === "offline") {
        badge.className = "sync-badge";
        badge.style.background = "#fff7ed";
        badge.style.color = "#ea580c";
        badge.style.borderColor = "#fed7aa";
        badge.innerHTML = "🟠 Offline Mode";
    } else if (status === "error") {
        badge.className = "sync-badge";
        badge.style.background = "#fef2f2";
        badge.style.color = "#dc2626";
        badge.style.borderColor = "#fecaca";
        badge.innerHTML = "⚠️ Sync Error";
    } else {
        // Online / Synced
        badge.className = "sync-badge";
        badge.style.background = "#ecfdf5";
        badge.style.color = "#059669";
        badge.style.borderColor = "#a7f3d0";
        badge.innerHTML = "🟢 Cloud Synced";
    }
}

// 3. FIREBASE REALTIME LISTENER (Doosre phone/laptop me change hone par turant screen update)
function initFirebaseLiveListeners() {
    if (!db || !currentUserId) return;

    try {
        db.ref("users/" + currentUserId).on("value", function(snapshot) {
            if (typeof isBackupPreviewMode !== "undefined" && isBackupPreviewMode) return;
            
            var val = snapshot.val();
            if (val) {
                isRemoteUpdating = true;
                
                for (var k in val) {
                    try {
                        var itemData = Array.isArray(val[k]) ? safeArray(val[k]) : val[k];
                        var fullKey = currentUserId + "_" + k;
                        
                        APP_MEMORY_CACHE[fullKey] = itemData;
                        if (typeof idbPut === "function") idbPut(fullKey, itemData);
                        try { localStorage.setItem(fullKey, JSON.stringify(itemData)); } catch(e) {}
                    } catch (e) {}
                }
                
                isRemoteUpdating = false;

                // UI Auto-Refresh (Active Section ko bina page reload kiye refresh karna)
                if (typeof triggerActiveSectionRefresh === "function") {
                    triggerActiveSectionRefresh();
                }

                showSyncStatus("online");
            }
        });
    } catch (e) {
        console.error("Firebase Listener Error:", e);
    }
}

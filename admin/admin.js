/* ========================================================
   SIMPLICITY ERP - OWNER ADMIN CONTROL PANEL
   File: admin/admin.js • Developed by Farhan Jawed
   (User Licenses, +30D Validity, Auto-Block & Pass Reset)
======================================================== */

function openAdminModule() {
    if (currentUserRole !== "admin") return alert("Sirf Admin is panel ko access kar sakte hain!");
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("admin-section", "block");
    renderAdminUsersTable();
}

// 1. ADMIN USERS DIRECTORY TABLE
function renderAdminUsersTable() {
    var users = getUsersList();
    var tbody = document.getElementById("admin-users-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    var tot = 0, act = 0, blk = 0;

    users.forEach(function(u, idx) {
        tot++;
        var isB = (u.status === "blocked");
        var isE = isUserExpired(u);
        if (isB || isE) blk++; else act++;

        var isA = (u.role === "admin" || u.id === "farhan");
        var stBadge = isA ? "<span class='badge-green'>👑 Owner</span>" : 
                     (isB ? "<span class='badge-red'>⛔ Blocked</span>" : 
                     (isE ? "<span class='badge-red'>⌛ Expired</span>" : "<span class='badge-green'>Active</span>"));

        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + u.name + "</strong></td>" +
            "<td>" + (u.mobile || "-") + "</td>" +
            "<td><code>" + u.id + "</code></td>" +
            "<td><strong style='color:#1e3a8a;'>" + (u.pass || "-") + "</strong></td>" +
            "<td>" + formatDateDisplay(u.date) + "</td>" +
            "<td>" + (isA ? "Lifetime" : ("<input type='date' value='" + (u.expiryDate || "") + "' onchange='updateUserExpiryDate(\"" + u.id + "\", this.value)' style='padding:2px 4px;font-size:11px;border-radius:4px;border:1px solid #cbd5e1;'> " + formatDateDisplay(u.expiryDate) + " <button onclick='extendValidity(\"" + u.id + "\", 30)' style='padding:2px 6px;font-size:10px;border-radius:4px;border:none;background:#2563eb;color:white;cursor:pointer;'>+30D</button>")) + "</td>" +
            "<td>" + stBadge + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='quick-btn " + (isB ? "btn-in" : "btn-out") + "' onclick='toggleUserBlockStatus(\"" + u.id + "\")'>" + (isB ? "Unblock" : "Block") + "</button> " +
                "<button class='edit-btn' onclick='resetUserPasswordByAdmin(\"" + u.id + "\")'>🔑 Pass</button> " +
                "<button class='delete-btn' onclick='deleteUserByAdmin(\"" + u.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });

    setElementText("admin-total-users", tot);
    setElementText("admin-active-users", act);
    setElementText("admin-blocked-users", blk);
}

// 2. EXPIRY & VALIDITY CONTROLS
function updateUserExpiryDate(uid, dateVal) {
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === uid; });
    if (!u) return;
    u.expiryDate = dateVal;
    localStorage.setItem("app_users", JSON.stringify(users));
    APP_MEMORY_CACHE["app_users"] = users; 
    if (typeof idbPut === "function") idbPut("app_users", users);
    if (db) try { db.ref("app_users/" + uid + "/expiryDate").set(dateVal); } catch (e) {}
    renderAdminUsersTable();
}

function extendValidity(uid, days) {
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === uid; });
    if (!u) return;
    var base = (u.expiryDate && new Date(u.expiryDate) > new Date()) ? new Date(u.expiryDate) : new Date();
    base.setDate(base.getDate() + days);
    var formatted = base.toISOString().split('T')[0];
    u.expiryDate = formatted;
    if (u.status === "blocked") u.status = "active";

    localStorage.setItem("app_users", JSON.stringify(users));
    APP_MEMORY_CACHE["app_users"] = users; 
    if (typeof idbPut === "function") idbPut("app_users", users);
    if (db) {
        try {
            db.ref("app_users/" + uid + "/expiryDate").set(formatted);
            db.ref("app_users/" + uid + "/status").set("active");
        } catch (e) {}
    }
    renderAdminUsersTable();
    alert("✅ User " + u.name + " ki validity " + formatDateDisplay(formatted) + " tak badh gayi!");
}

// 3. ADMIN ACTIONS
function resetUserPasswordByAdmin(uid) {
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === uid; });
    if (!u) return;
    var newPass = prompt("User " + u.name + " ka naya password daalein:", Math.floor(100000 + Math.random() * 900000).toString());
    if (!newPass || !newPass.trim()) return;
    u.pass = newPass.trim();

    localStorage.setItem("app_users", JSON.stringify(users));
    APP_MEMORY_CACHE["app_users"] = users; 
    if (typeof idbPut === "function") idbPut("app_users", users);
    if (db) try { db.ref("app_users/" + uid + "/pass").set(u.pass); } catch (e) {}
    renderAdminUsersTable();
    alert("✅ Password update ho gaya: " + u.pass);
}

function toggleUserBlockStatus(uid) {
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === uid; });
    if (!u) return;
    u.status = (u.status === "blocked" ? "active" : "blocked");

    localStorage.setItem("app_users", JSON.stringify(users));
    APP_MEMORY_CACHE["app_users"] = users; 
    if (typeof idbPut === "function") idbPut("app_users", users);
    if (db) try { db.ref("app_users/" + uid + "/status").set(u.status); } catch (e) {}
    renderAdminUsersTable();
}

function deleteUserByAdmin(uid) {
    if (!confirm("User ko delete karna chahte hain?")) return;
    var users = getUsersList().filter(function(x) { return x.id !== uid; });
    localStorage.setItem("app_users", JSON.stringify(users));
    APP_MEMORY_CACHE["app_users"] = users; 
    if (typeof idbPut === "function") idbPut("app_users", users);
    if (db) {
        try {
            db.ref("app_users/" + uid).remove();
            db.ref("users/" + uid).remove();
        } catch (e) {}
    }
    renderAdminUsersTable();
}

function refreshAdminUsersList() {
    if (db) {
        try {
            db.ref("app_users").once("value", function(snap) {
                var v = snap.val();
                if (v) {
                    var arr = [];
                    for (var k in v) { if (v[k]) arr.push(v[k]); }
                    localStorage.setItem("app_users", JSON.stringify(arr));
                    APP_MEMORY_CACHE["app_users"] = arr; 
                    if (typeof idbPut === "function") idbPut("app_users", arr);
                    renderAdminUsersTable();
                    alert("✅ Admin Users List Refresh ho gayi!");
                }
            });
        } catch (e) { renderAdminUsersTable(); }
    } else {
        renderAdminUsersTable();
    }
}

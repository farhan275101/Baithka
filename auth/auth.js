/* ========================================================
   SIMPLICITY ERP - AUTHENTICATION & SECURITY
   File: auth/auth.js • Developed by Farhan Jawed
   (Login, Registration, PIN Reset & User Session)
======================================================== */

var currentUserId = null;
var currentUserRole = null;
var targetResetUser = null;

// 1. GET USERS LIST (Default Admin Hamesha Rahega)
function getUsersList() {
    var defaultAdmin = [{
        id: "farhan", 
        name: "Farhan Bhai (Admin)", 
        pass: "1234",
        mobile: "9876543210", 
        pin: "1234", 
        role: "admin", 
        status: "active",
        date: "2026-01-01", 
        expiryDate: ""
    }];

    try {
        var local = APP_MEMORY_CACHE["app_users"] || localStorage.getItem("app_users");
        if (local) {
            var parsed = (typeof local === "string") ? JSON.parse(local) : local;
            if (Array.isArray(parsed) && parsed.length > 0) {
                if (!parsed.some(function(u) { return u.id === "farhan"; })) {
                    parsed.push(defaultAdmin[0]);
                }
                return parsed;
            }
        }
    } catch (e) {}

    localStorage.setItem("app_users", JSON.stringify(defaultAdmin));
    APP_MEMORY_CACHE["app_users"] = defaultAdmin;
    if (typeof idbPut === "function") idbPut("app_users", defaultAdmin);
    return defaultAdmin;
}

// 2. SYNC USERS WITH FIREBASE
function syncUsersWithFirebase() {
    if (!db) return;
    try {
        db.ref("app_users").on("value", function(snap) {
            var val = snap.val();
            if (val) {
                var arr = [];
                for (var uid in val) { 
                    if (val[uid]) arr.push(val[uid]); 
                }
                if (!arr.some(function(u) { return u.id === "farhan"; })) {
                    var defaultAdmin = {
                        id: "farhan", name: "Farhan Bhai (Admin)", pass: "1234",
                        mobile: "9876543210", pin: "1234", role: "admin",
                        status: "active", date: "2026-01-01", expiryDate: ""
                    };
                    arr.push(defaultAdmin);
                    db.ref("app_users/farhan").set(defaultAdmin);
                }
                localStorage.setItem("app_users", JSON.stringify(arr));
                APP_MEMORY_CACHE["app_users"] = arr;
                if (typeof idbPut === "function") idbPut("app_users", arr);
                if (currentUserRole === "admin" && typeof renderAdminUsersTable === "function") {
                    renderAdminUsersTable();
                }
            }
        });
    } catch (e) {}
}

// 3. EXPIRY CHECK (30 Days Trial / Paid Engine)
function isUserExpired(user) {
    if (!user || user.role === "admin" || user.id === "farhan" || !user.expiryDate) return false;
    return getTodayDate() > user.expiryDate;
}

// 4. UI SCREEN SWITCHERS
function showSignup() {
    setDisplay("login-box", "none");
    setDisplay("forgot-box", "none");
    setDisplay("signup-box", "block");
}

function showLogin() {
    setDisplay("signup-box", "none");
    setDisplay("forgot-box", "none");
    setDisplay("login-box", "block");
}

function showForgotPassword() {
    setDisplay("login-box", "none");
    setDisplay("signup-box", "none");
    setDisplay("forgot-box", "block");
    setDisplay("forgot-step-1", "block");
    setDisplay("forgot-step-2", "none");
}

// 5. REGISTRATION
function handleRegister() {
    var name = (document.getElementById("reg-name").value || "").trim();
    var mobile = (document.getElementById("reg-mobile").value || "").trim();
    var id = (document.getElementById("reg-id").value || "").trim().toLowerCase();
    var pass = (document.getElementById("reg-pass").value || "").trim();
    var pin = (document.getElementById("reg-pin").value || "").trim();
    var msg = document.getElementById("signup-msg");

    if (!name || !id || !pass || !mobile || !pin || pin.length !== 4) {
        msg.textContent = "Sabhi details bharein (4-digit PIN zaroori hai)!";
        msg.className = "message error"; 
        msg.style.display = "block";
        return;
    }

    var users = getUsersList();
    if (users.some(function(u) { return u.id && u.id.toLowerCase() === id; })) {
        msg.textContent = "Yeh User ID pehle se maujood hai!";
        msg.className = "message error"; 
        msg.style.display = "block";
        return;
    }

    var exp = new Date(); 
    exp.setDate(exp.getDate() + 30);
    var newUser = {
        id: id, name: name, pass: pass, mobile: mobile, pin: pin,
        role: (id === "farhan" ? "admin" : "user"), status: "active",
        date: getTodayDate(), expiryDate: exp.toISOString().split('T')[0]
    };

    users.push(newUser);
    localStorage.setItem("app_users", JSON.stringify(users));
    APP_MEMORY_CACHE["app_users"] = users;
    if (typeof idbPut === "function") idbPut("app_users", users);
    if (db) try { db.ref("app_users/" + id).set(newUser); } catch (e) {}

    msg.textContent = "✅ Account ban gaya! 30 din ki validity shuru.";
    msg.className = "message success"; 
    msg.style.display = "block";

    setTimeout(function() {
        showLogin();
        document.getElementById("reg-name").value = "";
        document.getElementById("reg-mobile").value = "";
        document.getElementById("reg-id").value = "";
        document.getElementById("reg-pass").value = "";
        document.getElementById("reg-pin").value = "";
        msg.style.display = "none";
    }, 1200);
}

// 6. LOGIN
function handleLogin() {
    var idInput = document.getElementById("login-id");
    var passInput = document.getElementById("login-pass");
    var err = document.getElementById("login-error");

    var id = (idInput ? idInput.value : "").trim().toLowerCase();
    var pass = (passInput ? passInput.value : "").trim();

    if (!id || !pass) {
        err.textContent = "Kripya User ID aur Password dono bharein!";
        err.style.display = "block";
        return;
    }

    var users = getUsersList();
    var user = users.find(function(u) {
        var matchId = (u.id && String(u.id).toLowerCase() === id);
        var matchMob = (u.mobile && String(u.mobile).trim() === id);
        return (matchId || matchMob) && String(u.pass) === String(pass);
    });

    if (user) {
        if (user.status === "blocked") {
            err.textContent = "⛔ Account Block hai! Admin se contact karein.";
            err.style.display = "block";
            return;
        }
        if (isUserExpired(user)) {
            err.innerHTML = "⌛ Account Expired (" + formatDateDisplay(user.expiryDate) + ")! Admin se contact karein.";
            err.style.display = "block";
            return;
        }

        clearMemoryCache();
        currentUserId = user.id;
        currentUserRole = user.role || (user.id === "farhan" ? "admin" : "user");

        err.style.display = "none";
        setDisplay("login-wrapper", "none");
        setDisplay("desktop-screen", "flex");

        if (currentUserRole === "admin") {
            document.getElementById("welcome-text").textContent = "👑 Swagat hai Admin, " + user.name + "!";
            setDisplay("nav-admin-btn", "inline-block");
        } else {
            document.getElementById("welcome-text").textContent = "Swagat hai, " + user.name + "!";
            setDisplay("nav-admin-btn", "none");
        }

        initIndexedDBPreload(function() {
            initFirebaseLiveListeners();
            if (typeof populateSessionDropdown === "function") populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
        });
    } else {
        err.textContent = "Galat User ID ya Password!";
        err.style.display = "block";
    }
}

// 7. LOGOUT
function logout() {
    clearMemoryCache();
    currentUserId = null;
    currentUserRole = null;
    activeKarigerId = null;
    activeSheetId = null;

    var idInput = document.getElementById("login-id");
    var passInput = document.getElementById("login-pass");
    var err = document.getElementById("login-error");
    if (idInput) idInput.value = "";
    if (passInput) passInput.value = "";
    if (err) err.style.display = "none";

    setDisplay("desktop-screen", "none");
    setDisplay("login-wrapper", "flex");
    showLogin();
}

// 8. 4-DIGIT PIN FORGOT PASSWORD
function verifyForgotPin() {
    var q = (document.getElementById("forgot-query").value || "").trim().toLowerCase();
    var pin = (document.getElementById("forgot-pin").value || "").trim();
    var msg = document.getElementById("forgot-msg");
    var users = getUsersList();
    var user = users.find(function(u) {
        return (u.id && u.id.toLowerCase() === q) || (u.mobile && u.mobile.trim() === q);
    });

    if (!user || String(pin) !== String(user.pin || "1234")) {
        msg.textContent = "Galat User details ya PIN!";
        msg.className = "message error"; 
        msg.style.display = "block";
        return;
    }
    targetResetUser = user;
    setDisplay("forgot-step-1", "none");
    setDisplay("forgot-step-2", "block");
    msg.textContent = "✅ PIN Verified! Naya password banayein.";
    msg.className = "message success"; 
    msg.style.display = "block";
}

function saveNewPassword() {
    var p1 = (document.getElementById("forgot-new-pass").value || "").trim();
    var p2 = (document.getElementById("forgot-confirm-pass").value || "").trim();
    var msg = document.getElementById("forgot-msg");

    if (!p1 || p1 !== p2) {
        msg.textContent = "Dono password match hone chahiye!";
        msg.className = "message error"; 
        msg.style.display = "block";
        return;
    }
    var users = getUsersList();
    var idx = users.findIndex(function(u) { return u.id === targetResetUser.id; });
    if (idx !== -1) {
        users[idx].pass = p1;
        localStorage.setItem("app_users", JSON.stringify(users));
        APP_MEMORY_CACHE["app_users"] = users;
        if (typeof idbPut === "function") idbPut("app_users", users);
        if (db) try { db.ref("app_users/" + targetResetUser.id + "/pass").set(p1); } catch (e) {}

        msg.textContent = "✅ Password update ho gaya! Login karein.";
        msg.className = "message success"; 
        msg.style.display = "block";

        setTimeout(function() {
            showLogin();
            document.getElementById("forgot-query").value = "";
            document.getElementById("forgot-pin").value = "";
            document.getElementById("forgot-new-pass").value = "";
            document.getElementById("forgot-confirm-pass").value = "";
            msg.style.display = "none";
        }, 1200);
    }
}

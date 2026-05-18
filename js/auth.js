// ===== js/auth.js - Brainy Tuition Classes admin auth =====
(function () {
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD_KEY = "brainyAdminPassword";
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_TIME = 30_000;
  const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

  let loginAttempts = Number(sessionStorage.getItem("brainyLoginAttempts") || "0");
  let lastAttemptTime = Number(sessionStorage.getItem("brainyLastAttemptTime") || "0");

  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    const defaultPassword = "Brainy@" + Date.now().toString().slice(-6);
    localStorage.setItem(ADMIN_PASSWORD_KEY, defaultPassword);
    alert(
      "IMPORTANT: Default admin password generated.\n\nUsername: admin\nPassword: " +
        defaultPassword +
        "\n\nChange it immediately from the admin dashboard."
    );
  }

  window.logSecurityEvent = function (event, data = {}) {
    try {
      const logs = JSON.parse(localStorage.getItem("brainySecurityLogs") || "[]");
      logs.push({
        event,
        data,
        userAgent: navigator.userAgent.substring(0, 100),
        timestamp: new Date().toISOString(),
      });
      if (logs.length > 100) logs.splice(0, logs.length - 100);
      localStorage.setItem("brainySecurityLogs", JSON.stringify(logs));
    } catch (error) {
      console.error("Security log error:", error);
    }
  };

  function authenticateUser(username, password) {
    return username === ADMIN_USERNAME && password === localStorage.getItem(ADMIN_PASSWORD_KEY);
  }

  function redirectToHome() {
    window.location.href = "index.html";
  }

  function checkSessionTimeout() {
    const loginTime = Number(sessionStorage.getItem("brainyAdminLoginTime") || "0");
    if (!loginTime) return;

    if (Date.now() - loginTime > SESSION_TIMEOUT) {
      sessionStorage.removeItem("brainyAdminLoggedIn");
      sessionStorage.removeItem("brainyAdminLoginTime");
      alert("Session expired. Please login again.");
      showLoginPrompt();
    }
  }

  function showLoginPrompt() {
    const now = Date.now();

    if (loginAttempts >= MAX_ATTEMPTS && now - lastAttemptTime < LOCKOUT_TIME) {
      const remaining = Math.ceil((LOCKOUT_TIME - (now - lastAttemptTime)) / 1000);
      alert("Too many failed attempts. Please wait " + remaining + " seconds.");
      redirectToHome();
      return;
    }

    if (now - lastAttemptTime >= LOCKOUT_TIME) loginAttempts = 0;

    const username = prompt("Brainy Tuition Admin Login\n\nUsername:");
    if (username === null) return redirectToHome();

    const password = prompt("Brainy Tuition Admin Login\n\nPassword:");
    if (password === null) return redirectToHome();

    if (authenticateUser(username.trim(), password)) {
      loginAttempts = 0;
      sessionStorage.setItem("brainyLoginAttempts", "0");
      sessionStorage.setItem("brainyAdminLoggedIn", "true");
      sessionStorage.setItem("brainyAdminLoginTime", now.toString());
      logSecurityEvent("LOGIN_SUCCESS", { username });
      alert("Welcome to Brainy Tuition Admin Dashboard!");
    } else {
      loginAttempts++;
      lastAttemptTime = now;
      sessionStorage.setItem("brainyLoginAttempts", String(loginAttempts));
      sessionStorage.setItem("brainyLastAttemptTime", String(lastAttemptTime));
      logSecurityEvent("LOGIN_FAILED", { username, attempts: loginAttempts });

      const remaining = MAX_ATTEMPTS - loginAttempts;
      if (remaining > 0) {
        alert("Invalid credentials. Attempts remaining: " + remaining);
        showLoginPrompt();
      } else {
        alert("Maximum login attempts exceeded.");
        redirectToHome();
      }
    }
  }

  function checkAuth() {
    if (!sessionStorage.getItem("brainyAdminLoggedIn")) {
      showLoginPrompt();
    } else {
      checkSessionTimeout();
    }
  }

  window.adminLogout = function () {
    if (!confirm("Logout from admin panel?")) return;
    sessionStorage.removeItem("brainyAdminLoggedIn");
    sessionStorage.removeItem("brainyAdminLoginTime");
    logSecurityEvent("LOGOUT");
    window.location.href = "index.html";
  };

  function initPasswordReset() {
    const toggleBtn = document.getElementById("change-password-toggle");
    const section = document.getElementById("password-reset-section");
    const resetBtn = document.getElementById("reset-password-btn");
    const cancelBtn = document.getElementById("cancel-password-reset");

    if (toggleBtn && section) {
      toggleBtn.addEventListener("click", () => section.classList.toggle("hidden"));
    }

    if (cancelBtn && section) {
      cancelBtn.addEventListener("click", () => {
        section.classList.add("hidden");
        ["current-password", "new-password", "confirm-password"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const currentPass = document.getElementById("current-password")?.value || "";
        const newPass = document.getElementById("new-password")?.value || "";
        const confirmPass = document.getElementById("confirm-password")?.value || "";

        if (!currentPass || !newPass || !confirmPass) return alert("All password fields are required.");
        if (currentPass !== localStorage.getItem(ADMIN_PASSWORD_KEY)) return alert("Current password is incorrect.");
        if (newPass !== confirmPass) return alert("New passwords do not match.");
        if (newPass.length < 8) return alert("Password must be at least 8 characters.");

        localStorage.setItem(ADMIN_PASSWORD_KEY, newPass);
        logSecurityEvent("PASSWORD_CHANGED");
        alert("Password updated successfully.");
        section?.classList.add("hidden");
      });
    }
  }

  if (window.location.pathname.includes("admin.html")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        checkAuth();
        initPasswordReset();
      });
    } else {
      checkAuth();
      initPasswordReset();
    }
    setInterval(checkSessionTimeout, 5 * 60 * 1000);
  }
})();
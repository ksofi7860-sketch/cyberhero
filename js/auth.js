// ===== js/auth.js (COMPLETE WORKING VERSION) =====
(function() {
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD_KEY = 'adminPassword';
    
    // Security settings - PROPERLY DECLARED
    let loginAttempts = 0;
    let lastAttemptTime = 0;
    const MAX_ATTEMPTS = 3;
    const LOCKOUT_TIME = 30000; // 30 seconds
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

    // Initialize secure password if not set
    if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
        const secureDefault = 'CH' + Date.now().toString().slice(-6) + '!';
        localStorage.setItem(ADMIN_PASSWORD_KEY, secureDefault);
        alert('🔐 IMPORTANT: Default password generated!\n\nNew Password: ' + secureDefault + '\n\nChange this immediately in admin dashboard!');
        console.log('🔐 Secure default password generated:', secureDefault);
    }
    
    // Security logging function
    window.logSecurityEvent = function(event, data) {
        try {
            const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
            logs.push({
                event: event,
                data: data,
                userAgent: navigator.userAgent.substring(0, 100),
                timestamp: new Date().toISOString()
            });
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            localStorage.setItem('securityLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Error logging security event:', error);
        }
    };
    
    function checkAuth() {
        console.log('🔐 Checking authentication...');
        if (!sessionStorage.getItem('adminLoggedIn')) {
            console.log('❌ No admin session found, showing login prompt');
            showLoginPrompt();
        } else {
            console.log('✅ Admin session found, checking timeout');
            checkSessionTimeout();
        }
    }
    
    function showLoginPrompt() {
        const now = Date.now();
        
        // Check lockout
        if (loginAttempts >= MAX_ATTEMPTS) {
            const timeSinceLastAttempt = now - lastAttemptTime;
            if (timeSinceLastAttempt < LOCKOUT_TIME) {
                const remainingTime = Math.ceil((LOCKOUT_TIME - timeSinceLastAttempt) / 1000);
                alert(`🔒 Too many failed attempts!\nPlease wait ${remainingTime} seconds.`);
                redirectToHome();
                return;
            } else {
                loginAttempts = 0;
            }
        }
        
        const username = prompt('🔐 Cyber Hero Admin Login\n\nUsername:');
        if (username === null) {
            redirectToHome();
            return;
        }
        
        const password = prompt('🔐 Cyber Hero Admin Login\n\nPassword:');
        if (password === null) {
            redirectToHome();
            return;
        }
        
        if (authenticateUser(username, password)) {
            loginAttempts = 0;
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminLoginTime', now.toString());
            logSecurityEvent('LOGIN_SUCCESS', { username: username, timestamp: now });
            alert('✅ Welcome to Cyber Hero Admin Dashboard!');
            console.log('✅ Admin login successful');
        } else {
            loginAttempts++;
            lastAttemptTime = now;
            const remaining = MAX_ATTEMPTS - loginAttempts;
            
            logSecurityEvent('LOGIN_FAILED', { 
                username: username, 
                attempts: loginAttempts, 
                timestamp: now 
            });
            
            if (remaining > 0) {
                alert(`❌ Invalid credentials!\n\nAttempts remaining: ${remaining}`);
                showLoginPrompt();
            } else {
                alert(`❌ Maximum login attempts exceeded!`);
                redirectToHome();
            }
        }
    }
    
    function authenticateUser(username, password) {
        const storedPassword = localStorage.getItem(ADMIN_PASSWORD_KEY);
        console.log('🔐 Authenticating user:', username);
        if (!storedPassword) {
            console.error('❌ No stored password found!');
            return false;
        }
        return username === ADMIN_USERNAME && password === storedPassword;
    }
    
    function checkSessionTimeout() {
        const loginTime = sessionStorage.getItem('adminLoginTime');
        if (loginTime) {
            const now = Date.now();
            const sessionAge = now - parseInt(loginTime);
            
            if (sessionAge > SESSION_TIMEOUT) {
                sessionStorage.removeItem('adminLoggedIn');
                sessionStorage.removeItem('adminLoginTime');
                alert('🕒 Session expired. Please login again.');
                showLoginPrompt();
            }
        }
    }
    
    function redirectToHome() {
        console.log('🔄 Redirecting to home...');
        window.location.href = 'index.html';
    }
    
    window.adminLogout = function() {
        if (confirm('Are you sure you want to logout?')) {
            sessionStorage.removeItem('adminLoggedIn');
            sessionStorage.removeItem('adminLoginTime');
            logSecurityEvent('LOGOUT', { timestamp: Date.now() });
            alert('👋 Logged out successfully!');
            window.location.href = 'index.html';
        }
    };
    
    // CRITICAL: Check auth on admin pages - THIS IS THE KEY PART
    if (window.location.pathname.includes('admin.html')) {
        console.log('🔐 Admin page detected, enforcing authentication...');
        checkAuth();
        setInterval(checkSessionTimeout, 5 * 60 * 1000);
    }
    
    console.log('🛡️ Security system initialized');
})();

// Enhanced Password Reset System
window.addEventListener('load', function() {
    console.log('🚀 Password reset loading...');
    
    setTimeout(function() {
        // Toggle password reset section
        const toggleBtn = document.getElementById('change-password-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = function(e) {
                e.preventDefault();
                const section = document.getElementById('password-reset-section');
                if (section) {
                    section.classList.toggle('hidden');
                    console.log('✅ Password reset section toggled');
                }
            };
        }
        
        // Password Reset Handler - FIXED: No hardcoded fallback
        const resetBtn = document.getElementById('reset-password-btn');
        if (resetBtn) {
            resetBtn.onclick = function(e) {
                e.preventDefault();
                console.log('🔐 Password reset initiated');
                
                const currentPass = document.getElementById('current-password').value.trim();
                const newPass = document.getElementById('new-password').value.trim();
                const confirmPass = document.getElementById('confirm-password').value.trim();
                
                // Validation
                if (!currentPass || !newPass || !confirmPass) {
                    alert('❌ All fields are required!');
                    return;
                }
                
                // FIXED: No hardcoded fallback
                const storedPassword = localStorage.getItem('adminPassword');
                if (!storedPassword) {
                    alert('❌ No admin password found! Please contact administrator.');
                    return;
                }
                
                if (currentPass !== storedPassword) {
                    alert('❌ Current password is incorrect!');
                    return;
                }
                
                if (newPass !== confirmPass) {
                    alert('❌ New passwords do not match!');
                    return;
                }
                
                if (newPass.length < 8) {
                    alert('❌ Password must be at least 8 characters!');
                    return;
                }
                
                // Update password
                localStorage.setItem('adminPassword', newPass);
                alert('✅ Password updated successfully!\n\nNew password is now active.');
                
                // Log security event
                if (window.logSecurityEvent) {
                    window.logSecurityEvent('PASSWORD_CHANGED', { 
                        timestamp: new Date().toISOString() 
                    });
                }
                
                // Clear and hide form
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                document.getElementById('password-reset-section').classList.add('hidden');
                
                console.log('✅ Password changed successfully');
            };
            console.log('✅ Password reset handler attached');
        }
        
        // Cancel button handler
        const cancelBtn = document.getElementById('cancel-password-reset');
        if (cancelBtn) {
            cancelBtn.onclick = function(e) {
                e.preventDefault();
                document.getElementById('password-reset-section').classList.add('hidden');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            };
        }
        
        console.log('✅ Password reset system ready!');
    }, 500);
});

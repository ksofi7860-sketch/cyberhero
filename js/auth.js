
(function() {
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD_KEY = 'adminPassword';
    const DEFAULT_PASSWORD = 'TempSetup123!';
    
    // Security settings
    let loginAttempts = 0;
    let lastAttemptTime = 0;
    const MAX_ATTEMPTS = 3;
    const LOCKOUT_TIME = 30000;
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

    if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
        localStorage.setItem(ADMIN_PASSWORD_KEY, DEFAULT_PASSWORD);
    }
    
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
        if (!sessionStorage.getItem('adminLoggedIn')) {
            showLoginPrompt();
        } else {
            checkSessionTimeout();
        }
    }
    
    function showLoginPrompt() {
        const now = Date.now();
        
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
        
        const username = prompt('🔐 Admin Login\n\nEnter Username:');
        if (username === null) {
            redirectToHome();
            return;
        }
        
        const password = prompt('🔐 Admin Login\n\nEnter Password:');
        if (password === null) {
            redirectToHome();
            return;
        }
        
        if (authenticateUser(username, password)) {
            loginAttempts = 0;
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminLoginTime', now.toString());
            logSecurityEvent('LOGIN_SUCCESS', { username: username, timestamp: now });
            alert('✅ Welcome to Admin Dashboard!');
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
    
    if (window.location.pathname.includes('admin.html')) {
        checkAuth();
        setInterval(checkSessionTimeout, 5 * 60 * 1000);
    }
})();

// WORKING Password Reset - Waits for DOM then uses direct binding
window.addEventListener('load', function() {
    console.log('🚀 Password reset loading...');
    
    // Wait a bit more to ensure everything is ready
    setTimeout(function() {
        
        // Toggle handler
        const toggleBtn = document.getElementById('change-password-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = function(e) {
                e.preventDefault();
                const section = document.getElementById('password-reset-section');
                if (section) {
                    section.classList.toggle('hidden');
                    console.log('Toggle worked!');
                }
            };
        }
        
        // Reset button handler - DIRECT BINDING
        const resetBtn = document.getElementById('reset-password-btn');
        if (resetBtn) {
            resetBtn.onclick = function(e) {
                e.preventDefault();
                console.log('🔥 RESET BUTTON CLICKED!');
                
                const current = document.getElementById('current-password').value.trim();
                const newPass = document.getElementById('new-password').value.trim();
                const confirm = document.getElementById('confirm-password').value.trim();
                
                if (!current || !newPass || !confirm) {
                    alert('❌ All fields required!');
                    return;
                }
                
                const stored = localStorage.getItem('adminPassword') || 'CyberHero2025!';
                if (current !== stored) {
                    alert('❌ Current password incorrect!');
                    return;
                }
                
                if (newPass !== confirm) {
                    alert('❌ Passwords do not match!');
                    return;
                }
                
                if (newPass.length < 8) {
                    alert('❌ Password must be 8+ characters!');
                    return;
                }
                
                localStorage.setItem('adminPassword', newPass);
                alert('✅ Password updated successfully!');
                
                // Clear and hide
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                document.getElementById('password-reset-section').classList.add('hidden');
            };
            console.log('✅ Reset button handler attached');
        }
        
        // Cancel handler
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
        
        console.log('✅ Password reset ready!');
    }, 500); // 500ms delay to ensure DOM is fully ready
});
// In your admin login success section, add:
firebase.auth().signInAnonymously().catch(console.error);

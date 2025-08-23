// ===== js/auth.js (FIXED WORKING VERSION) =====
(function() {
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD_KEY = 'adminPassword';
    
    // Security settings
    let loginAttempts = 0;
    let lastAttemptTime = 0;
    const MAX_ATTEMPTS = 3;
    const LOCKOUT_TIME = 30000;
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

    // Initialize secure password if not set
    if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
        const secureDefault = 'CH' + Date.now().toString().slice(-6) + '!';
        localStorage.setItem(ADMIN_PASSWORD_KEY, secureDefault);
        alert('🔐 IMPORTANT: Default password generated!\n\nNew Password: ' + secureDefault + '\n\nChange this immediately in admin dashboard!');
    }
    
    // Security logging
    window.logSecurityEvent = function(event, data) {
        try {
            const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
            logs.push({
                event: event,
                data: data,
                userAgent: navigator.userAgent.substring(0, 100),
                timestamp: new Date().toISOString()
            });
            if (logs.length > 100) logs.splice(0, logs.length - 100);
            localStorage.setItem('securityLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Error logging security event:', error);
        }
    };
    
    // Authentication functions
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
        if (!storedPassword) return false;
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
    
    // Check auth on admin pages
    if (window.location.pathname.includes('admin.html')) {
        checkAuth();
        setInterval(checkSessionTimeout, 5 * 60 * 1000);
    }
    
    // Password Reset System - FIXED VERSION
    function initPasswordReset() {
        console.log('🚀 Initializing password reset system...');
        
        // Toggle button handler
        const toggleBtn = document.getElementById('change-password-toggle');
        if (toggleBtn) {
            // Remove existing handlers first
            toggleBtn.replaceWith(toggleBtn.cloneNode(true));
            const newToggleBtn = document.getElementById('change-password-toggle');
            
            newToggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const section = document.getElementById('password-reset-section');
                if (section) {
                    section.classList.toggle('hidden');
                    console.log('✅ Password reset section toggled');
                    
                    // Initialize reset button handler after section is shown
                    if (!section.classList.contains('hidden')) {
                        setTimeout(initResetHandler, 100);
                    }
                }
            });
            console.log('✅ Toggle button handler attached');
        }
        
        // Initialize reset handler immediately if section is visible
        const section = document.getElementById('password-reset-section');
        if (section && !section.classList.contains('hidden')) {
            initResetHandler();
        }
    }
    
    function initResetHandler() {
        const resetBtn = document.getElementById('reset-password-btn');
        if (resetBtn && !resetBtn.dataset.handlerAttached) {
            resetBtn.dataset.handlerAttached = 'true';
            
            resetBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔐 Password reset button clicked!');
                
                const currentPass = document.getElementById('current-password')?.value?.trim();
                const newPass = document.getElementById('new-password')?.value?.trim();
                const confirmPass = document.getElementById('confirm-password')?.value?.trim();
                const messageDiv = document.getElementById('password-message');
                
                // Clear previous messages
                if (messageDiv) messageDiv.textContent = '';
                
                // Validation
                if (!currentPass || !newPass || !confirmPass) {
                    alert('❌ All fields are required!');
                    return;
                }
                
                const storedPassword = localStorage.getItem('adminPassword');
                if (!storedPassword) {
                    alert('❌ No admin password found!');
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
                logSecurityEvent('PASSWORD_CHANGED', { 
                    timestamp: new Date().toISOString() 
                });
                
                // Clear and hide form
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                document.getElementById('password-reset-section').classList.add('hidden');
                
                console.log('✅ Password changed successfully');
            });
            console.log('✅ Password reset handler attached');
        }
        
        // Cancel button
        const cancelBtn = document.getElementById('cancel-password-reset');
        if (cancelBtn && !cancelBtn.dataset.handlerAttached) {
            cancelBtn.dataset.handlerAttached = 'true';
            cancelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('password-reset-section').classList.add('hidden');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            });
        }
    }
    
    // Initialize password reset when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPasswordReset);
    } else {
        initPasswordReset();
    }
    
    // Backup initialization
    window.addEventListener('load', function() {
        setTimeout(initPasswordReset, 500);
    });
    
})();

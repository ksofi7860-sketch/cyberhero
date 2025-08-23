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
// ===== WORKING PASSWORD RESET SYSTEM =====
// Wait for DOM to be completely loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing password reset...');
    
    // Wait a bit more to ensure everything is ready
    setTimeout(function() {
        
        // Toggle password reset section
        const toggleBtn = document.getElementById('change-password-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const section = document.getElementById('password-reset-section');
                if (section) {
                    section.classList.toggle('hidden');
                    console.log('✅ Password reset section toggled');
                    
                    // Debug: Check if elements exist after showing section
                    setTimeout(() => {
                        console.log('Reset button exists:', !!document.getElementById('reset-password-btn'));
                        console.log('Current password field exists:', !!document.getElementById('current-password'));
                        console.log('New password field exists:', !!document.getElementById('new-password'));
                        console.log('Confirm password field exists:', !!document.getElementById('confirm-password'));
                    }, 100);
                }
            });
            console.log('✅ Toggle button handler attached');
        } else {
            console.error('❌ Toggle button not found');
        }
        
        // Password Reset Handler
        const resetBtn = document.getElementById('reset-password-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔐 Password reset button clicked!');
                
                // Get form values
                const currentPassField = document.getElementById('current-password');
                const newPassField = document.getElementById('new-password');
                const confirmPassField = document.getElementById('confirm-password');
                const messageDiv = document.getElementById('password-message');
                
                if (!currentPassField || !newPassField || !confirmPassField) {
                    alert('❌ Form fields not found! Please refresh the page.');
                    return;
                }
                
                const currentPass = currentPassField.value.trim();
                const newPass = newPassField.value.trim();
                const confirmPass = confirmPassField.value.trim();
                
                console.log('Form values retrieved successfully');
                
                // Clear previous messages
                if (messageDiv) messageDiv.textContent = '';
                
                // Validation
                if (!currentPass || !newPass || !confirmPass) {
                    alert('❌ All fields are required!');
                    return;
                }
                
                // Get stored password
                const storedPassword = localStorage.getItem('adminPassword');
                if (!storedPassword) {
                    alert('❌ No admin password found! Please contact administrator.');
                    return;
                }
                
                if (currentPass !== storedPassword) {
                    alert('❌ Current password is incorrect!');
                    if (messageDiv) messageDiv.textContent = 'Current password is incorrect';
                    return;
                }
                
                if (newPass !== confirmPass) {
                    alert('❌ New passwords do not match!');
                    if (messageDiv) messageDiv.textContent = 'New passwords do not match';
                    return;
                }
                
                if (newPass.length < 8) {
                    alert('❌ Password must be at least 8 characters!');
                    if (messageDiv) messageDiv.textContent = 'Password must be at least 8 characters';
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
                
                // Show success message
                if (messageDiv) {
                    messageDiv.textContent = '✅ Password updated successfully!';
                    messageDiv.style.color = 'green';
                }
                
                // Clear and hide form
                currentPassField.value = '';
                newPassField.value = '';
                confirmPassField.value = '';
                
                setTimeout(() => {
                    document.getElementById('password-reset-section').classList.add('hidden');
                    if (messageDiv) messageDiv.textContent = '';
                }, 2000);
                
                console.log('✅ Password changed successfully');
            });
            console.log('✅ Password reset handler attached');
        } else {
            console.error('❌ Reset button not found');
        }
        
        // Cancel button handler
        const cancelBtn = document.getElementById('cancel-password-reset');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('password-reset-section').classList.add('hidden');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                const messageDiv = document.getElementById('password-message');
                if (messageDiv) messageDiv.textContent = '';
            });
            console.log('✅ Cancel button handler attached');
        }
        
        console.log('✅ Password reset system fully initialized!');
        
    }, 1000); // Wait 1 second for everything to load
});

// Also attach on window load as backup
window.addEventListener('load', function() {
    console.log('🚀 Window loaded - backup initialization');
    
    // If elements still don't exist, force initialize
    setTimeout(() => {
        if (!document.getElementById('reset-password-btn')?.onclick) {
            console.log('🔄 Backup: Re-initializing password reset...');
            // Trigger the same initialization
            document.dispatchEvent(new Event('DOMContentLoaded'));
        }
    }, 500);
});

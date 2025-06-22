// Clear any existing invalid tokens on login page load
localStorage.removeItem('adminToken');
localStorage.removeItem('adminLoggedIn');

document.getElementById('adminLoginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            // Store both token and loggedIn flag for compatibility
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminLoggedIn', 'true');
            
            // Redirect to dashboard (use absolute path)
            window.location.href = '/admin/dashboard.html';
        } else {
            throw new Error(data.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message || 'Login failed. Please try again.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminLoggedIn');
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

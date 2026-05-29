document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already authenticated
  redirectIfLoggedIn();
  
  // Theme init
  const savedTheme = localStorage.getItem('orbitmind_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorAlert = document.getElementById('error-alert');

  // Helper to show errors
  const showError = (msg) => {
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.style.display = 'block';
      setTimeout(() => {
        errorAlert.style.display = 'none';
      }, 5000);
    } else {
      alert(msg);
    }
  };

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        return showError('Please fill in all fields');
      }

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (data.success) {
          setToken(data.token);
          setUser(data.user);
          window.location.href = 'dashboard.html';
        }
      } catch (err) {
        showError(err.message || 'Login failed. Please check your credentials.');
      }
    });
  }

  // Registration Form Submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const university = document.getElementById('university').value.trim();
      const department = document.getElementById('department').value.trim();

      // Front-end Validations
      if (!fullName || !email || !password || !university || !department) {
        return showError('Please fill in all fields');
      }

      if (password.length < 6) {
        return showError('Password must be at least 6 characters long');
      }

      if (password !== confirmPassword) {
        return showError('Passwords do not match');
      }

      try {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            fullName,
            email,
            password,
            university,
            department
          })
        });

        if (data.success) {
          setToken(data.token);
          setUser(data.user);
          window.location.href = 'dashboard.html';
        }
      } catch (err) {
        showError(err.message || 'Registration failed. Try again.');
      }
    });
  }
});

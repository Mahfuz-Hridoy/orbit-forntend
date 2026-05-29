const API_BASE_URL = 'https://orbit-backend-zeta.vercel.app/api';

// Auth State Helpers
const getToken = () => localStorage.getItem('orbitmind_token');
const setToken = (token) => localStorage.setItem('orbitmind_token', token);
const removeToken = () => localStorage.removeItem('orbitmind_token');

const getUser = () => {
  const user = localStorage.getItem('orbitmind_user');
  return user ? JSON.parse(user) : null;
};
const setUser = (user) => localStorage.setItem('orbitmind_user', JSON.stringify(user));
const removeUser = () => localStorage.removeItem('orbitmind_user');

// Global API Request Helper
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Check if token expired/invalid
    if (response.status === 401) {
      removeToken();
      removeUser();
      // If not already on login or register, redirect
      if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html') && !window.location.pathname.includes('index.html')) {
        window.location.href = 'login.html';
      }
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error.message);
    throw error;
  }
};

// Check if user is authenticated (runs on protected pages)
const checkAuth = () => {
  const token = getToken();
  const user = getUser();
  
  if (!token || !user) {
    removeToken();
    removeUser();
    window.location.href = 'login.html';
    return null;
  }
  return user;
};

// Check if already logged in (runs on index, login, register)
const redirectIfLoggedIn = () => {
  const token = getToken();
  const user = getUser();
  if (token && user) {
    window.location.href = 'dashboard.html';
  }
};

// Log Out User
const logout = () => {
  removeToken();
  removeUser();
  window.location.href = 'login.html';
};

// Setup Dark/Light Mode Theme persistence
const initTheme = () => {
  const savedTheme = localStorage.getItem('orbitmind_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    updateThemeToggleIcon(themeToggle, savedTheme);
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('orbitmind_theme', newTheme);
      updateThemeToggleIcon(themeToggle, newTheme);
    });
  }
};

const updateThemeToggleIcon = (btn, theme) => {
  if (theme === 'dark') {
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap:round stroke-linejoin:round>
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
  } else {
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap:round stroke-linejoin:round>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
  }
};

// Render Global Navigation components (Header & Sidebar) if they exist
const renderCommonUI = (activePage) => {
  const user = getUser();
  if (!user) return;

  // Render Sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = `
      <div class="app-sidebar">
        <div class="sidebar-logo">
          <span>🧠</span> OrbitMind AI
        </div>
        <ul class="sidebar-nav">
          <li>
            <a href="dashboard.html" class="sidebar-nav-link ${activePage === 'dashboard' ? 'active' : ''}">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              Dashboard
            </a>
          </li>
          <li>
            <a href="tasks.html" class="sidebar-nav-link ${activePage === 'tasks' ? 'active' : ''}">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Task Manager
            </a>
          </li>
          <li>
            <a href="studyplan.html" class="sidebar-nav-link ${activePage === 'studyplan' ? 'active' : ''}">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              AI Study Planner
            </a>
          </li>
          <li>
            <a href="summarizer.html" class="sidebar-nav-link ${activePage === 'summarizer' ? 'active' : ''}">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Note Summarizer
            </a>
          </li>
          <li>
            <a href="chatbot.html" class="sidebar-nav-link ${activePage === 'chatbot' ? 'active' : ''}">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              AI Study Coach
            </a>
          </li>
        </ul>
        <div class="sidebar-footer">
          <button onclick="logout()" class="btn btn-secondary btn-logout" style="width:100%; font-size:0.9rem; padding:0.6rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    `;
  }

  // Render Header Navbar
  const headerContainer = document.getElementById('header-container');
  if (headerContainer) {
    const initials = user.fullName.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2);
    headerContainer.innerHTML = `
      <header class="app-header">
        <div class="header-title">
          <h2>${activePage.charAt(0).toUpperCase() + activePage.slice(1).replace('-', ' ')}</h2>
        </div>
        <div class="header-actions">
          <button class="theme-toggle-btn" id="theme-toggle" title="Toggle Theme"></button>
          
          <div class="notification-bell-container">
            <button class="bell-btn" id="noti-bell-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span class="notification-badge" id="noti-badge" style="display:none;">0</span>
            </button>
            
            <div class="notification-dropdown" id="noti-dropdown">
              <div class="noti-header">
                <h4>Notifications</h4>
                <button id="noti-clear-btn">Mark all read</button>
              </div>
              <div class="noti-body" id="noti-list">
                <div class="noti-empty">No notifications yet.</div>
              </div>
            </div>
          </div>
          
          <div class="user-profile-badge">
            <div class="user-avatar">${initials}</div>
            <div class="user-info">
              <span class="user-name">${user.fullName}</span>
              <span class="user-uni">${user.university} (${user.department})</span>
            </div>
          </div>
        </div>
      </header>
    `;
  }
};

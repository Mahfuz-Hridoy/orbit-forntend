document.addEventListener('DOMContentLoaded', () => {
  // Wait slightly to ensure header is rendered via renderCommonUI
  setTimeout(() => {
    initNotifications();
  }, 100);
});

const initNotifications = () => {
  const bellBtn = document.getElementById('noti-bell-btn');
  const dropdown = document.getElementById('noti-dropdown');
  const list = document.getElementById('noti-list');
  const badge = document.getElementById('noti-badge');
  const clearBtn = document.getElementById('noti-clear-btn');

  if (!bellBtn || !dropdown) return;

  // Toggle Dropdown
  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
    if (dropdown.classList.contains('active')) {
      fetchNotifications();
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== bellBtn) {
      dropdown.classList.remove('active');
    }
  });

  // Fetch Notifications from Server
  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/notifications');
      if (data.success) {
        renderNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  // Render Notifications
  const renderNotifications = (notifications) => {
    list.innerHTML = '';
    
    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }

    if (notifications.length === 0) {
      list.innerHTML = '<div class="noti-empty">No notifications yet.</div>';
      return;
    }

    notifications.forEach(noti => {
      const date = new Date(noti.createdAt).toLocaleDateString();
      const time = new Date(noti.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const notiItem = document.createElement('div');
      notiItem.className = `noti-item ${noti.isRead ? '' : 'unread'}`;
      notiItem.innerHTML = `
        <span class="noti-item-title">${noti.title}</span>
        <span class="noti-item-msg">${noti.message}</span>
        <span class="noti-item-time">${date} @ ${time}</span>
      `;

      // Mark read when clicked
      notiItem.addEventListener('click', async () => {
        if (!noti.isRead) {
          try {
            await apiFetch(`/notifications/${noti._id}/read`, { method: 'PUT' });
            fetchNotifications(); // Reload list
            
            // If on task page or dashboard, reload details
            if (typeof loadTasks === 'function') loadTasks();
            if (typeof loadDashboardData === 'function') loadDashboardData();
          } catch (err) {
            console.error('Failed to mark read:', err);
          }
        }
      });

      list.appendChild(notiItem);
    });
  };

  // Mark All Read Button
  if (clearBtn) {
    clearBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await apiFetch('/notifications/read-all', { method: 'PUT' });
        fetchNotifications();
        
        // If on task page or dashboard, reload details
        if (typeof loadTasks === 'function') loadTasks();
        if (typeof loadDashboardData === 'function') loadDashboardData();
      } catch (err) {
        console.error('Failed to clear notifications:', err);
      }
    });
  }

  // Initial badge check
  fetchNotifications();
  
  // Poll notifications every 45 seconds
  setInterval(fetchNotifications, 45000);
};

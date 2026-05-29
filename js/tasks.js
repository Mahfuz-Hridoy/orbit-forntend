let tasksState = [];
let currentView = 'all';

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user) return;

  initTheme();
  renderCommonUI('tasks');

  // Load Tasks
  loadTasks();

  // Setup Event Listeners
  setupEventListeners();
});

const setupEventListeners = () => {
  const openModalBtn = document.getElementById('open-task-modal-btn');
  const closeModalBtn = document.getElementById('close-task-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-task-modal-btn');
  const modal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');

  // Modal controls
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      openTaskModal();
    });
  }

  const closeModal = () => {
    modal.classList.remove('active');
    taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('modal-error').style.display = 'none';
  };

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  // Close modal when clicking on overlay background
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Task form submission
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleFormSubmit(closeModal);
    });
  }

  // Filter & Search Controls
  const categoryFilter = document.getElementById('filter-category');
  const priorityFilter = document.getElementById('filter-priority');
  const sortFilter = document.getElementById('filter-sort');
  const searchInput = document.getElementById('search-tasks');

  categoryFilter.addEventListener('change', loadTasks);
  priorityFilter.addEventListener('change', loadTasks);
  sortFilter.addEventListener('change', loadTasks);
  
  // Debounce search input
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTasks, 300);
  });

  // View Tab Switcher
  const viewTabs = document.getElementById('view-tabs');
  viewTabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-tab-btn')) {
      // Remove active from all
      viewTabs.querySelectorAll('.view-tab-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      currentView = e.target.dataset.view;
      renderTasks(tasksState);
    }
  });
};

// Open Modal in Create Mode
const openTaskModal = (task = null) => {
  const modal = document.getElementById('task-modal');
  const modalTitle = document.getElementById('modal-title');
  const taskIdInput = document.getElementById('task-id');
  
  const titleInput = document.getElementById('task-title');
  const descInput = document.getElementById('task-desc');
  const deadlineInput = document.getElementById('task-deadline');
  const hoursInput = document.getElementById('task-hours');
  const categorySelect = document.getElementById('task-category');
  const prioritySelect = document.getElementById('task-priority');

  document.getElementById('modal-error').style.display = 'none';

  if (task) {
    // Edit mode
    modalTitle.textContent = 'Edit Task';
    taskIdInput.value = task._id;
    titleInput.value = task.title;
    descInput.value = task.description || '';
    
    // Format date for datetime-local (YYYY-MM-DDTHH:MM)
    const d = new Date(task.deadline);
    const formattedDate = d.getFullYear() + '-' + 
      String(d.getMonth() + 1).padStart(2, '0') + '-' + 
      String(d.getDate()).padStart(2, '0') + 'T' + 
      String(d.getHours()).padStart(2, '0') + ':' + 
      String(d.getMinutes()).padStart(2, '0');
    
    deadlineInput.value = formattedDate;
    hoursInput.value = task.estimatedHours;
    categorySelect.value = task.category;
    prioritySelect.value = task.priority;
  } else {
    // Create mode
    modalTitle.textContent = 'Create New Task';
    taskIdInput.value = '';
    
    // Set default deadline to tomorrow same hour
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(0);
    const formattedDate = tomorrow.getFullYear() + '-' + 
      String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
      String(tomorrow.getDate()).padStart(2, '0') + 'T' + 
      String(tomorrow.getHours()).padStart(2, '0') + ':00';
      
    deadlineInput.value = formattedDate;
    hoursInput.value = 1;
    categorySelect.value = 'study';
    prioritySelect.value = 'medium';
  }

  modal.classList.add('active');
};

// Form submit helper (create or update)
const handleFormSubmit = async (successCallback) => {
  const taskId = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const deadline = document.getElementById('task-deadline').value;
  const estimatedHours = parseFloat(document.getElementById('task-hours').value) || 1;
  const category = document.getElementById('task-category').value;
  const priority = document.getElementById('task-priority').value;

  const errorEl = document.getElementById('modal-error');

  if (!title || !deadline) {
    errorEl.textContent = 'Title and deadline are required';
    errorEl.style.display = 'block';
    return;
  }

  const payload = {
    title,
    description,
    deadline,
    estimatedHours,
    category,
    priority
  };

  try {
    let response;
    if (taskId) {
      // Update Task
      response = await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      // Create Task
      response = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (response.success) {
      successCallback();
      loadTasks(); // Reload
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Operation failed';
    errorEl.style.display = 'block';
  }
};

// Load Tasks from API
const loadTasks = async () => {
  const grid = document.getElementById('tasks-grid');
  const spinner = document.getElementById('tasks-loading-spinner');

  grid.style.display = 'none';
  spinner.style.display = 'block';

  // Gather filters
  const category = document.getElementById('filter-category').value;
  const priority = document.getElementById('filter-priority').value;
  const sortBy = document.getElementById('filter-sort').value;
  const q = document.getElementById('search-tasks').value.trim();

  let query = `?sortBy=${sortBy}`;
  if (category) query += `&category=${category}`;
  if (priority) query += `&completed=false`; // let priority query show uncompleted by default or custom, let's keep all tasks in search but apply filters
  if (q) query += `&q=${q}`;

  try {
    const data = await apiFetch(`/tasks${query}`);
    if (data.success) {
      // If priority filter is custom set, we filter client side
      let filtered = data.tasks;
      if (priority) {
        filtered = filtered.filter(t => t.priority === priority);
      }
      
      tasksState = filtered;
      renderTasks(tasksState);
    }
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--danger); font-size:1rem; padding:2rem;">Error: ${err.message}</div>`;
  } finally {
    spinner.style.display = 'none';
    grid.style.display = 'grid';
  }
};

// Render Task list
const renderTasks = (tasks) => {
  const grid = document.getElementById('tasks-grid');
  grid.innerHTML = '';

  // Apply Tab Filtering
  let viewFiltered = [...tasks];
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();

  if (currentView === 'daily') {
    viewFiltered = viewFiltered.filter(t => t.deadline.split('T')[0] === todayStr);
  } else if (currentView === 'weekly') {
    const monday = getStartOfWeek(now);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    viewFiltered = viewFiltered.filter(t => {
      const d = new Date(t.deadline);
      return d >= monday && d <= sunday;
    });
  } else if (currentView === 'monthly') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

    viewFiltered = viewFiltered.filter(t => {
      const d = new Date(t.deadline);
      return d >= firstDay && d <= lastDay;
    });
  }

  if (viewFiltered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
        <p style="font-size: 1.25rem; font-weight: 500; margin-bottom:0.25rem;">No tasks found</p>
        <p style="font-size: 0.9rem;">Add a task above to populate your planner board.</p>
      </div>
    `;
    return;
  }

  viewFiltered.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-item-card ${task.isCompleted ? 'completed' : ''}`;
    
    const deadlineDate = new Date(task.deadline).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    card.innerHTML = `
      <div>
        <div class="task-card-top">
          <span class="badge badge-${task.category}">${task.category}</span>
          <span class="badge badge-${task.priority}">${task.priority} Priority</span>
        </div>
        <h4 class="task-card-title">${task.title}</h4>
        <p class="task-card-desc">${task.description || 'No description provided.'}</p>
      </div>

      <div>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.5rem; display:flex; justify-content:space-between;">
          <span>📅 Due: ${deadlineDate}</span>
          <span>⏳ Est: ${task.estimatedHours}h</span>
        </div>
        
        <div class="task-card-footer">
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; cursor:pointer; font-weight:500;">
            <input type="checkbox" class="dash-task-checkbox task-complete-check" ${task.isCompleted ? 'checked' : ''}>
            ${task.isCompleted ? 'Completed' : 'Mark Completed'}
          </label>
          <div class="task-actions-btn">
            <button class="icon-btn edit-task-btn" title="Edit Task">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button class="icon-btn delete delete-task-btn" title="Delete Task">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook events
    const check = card.querySelector('.task-complete-check');
    check.addEventListener('change', async () => {
      try {
        await apiFetch(`/tasks/${task._id}`, {
          method: 'PUT',
          body: JSON.stringify({ isCompleted: check.checked })
        });
        loadTasks();
      } catch (err) {
        check.checked = !check.checked;
      }
    });

    card.querySelector('.edit-task-btn').addEventListener('click', () => {
      openTaskModal(task);
    });

    card.querySelector('.delete-task-btn').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
        try {
          await apiFetch(`/tasks/${task._id}`, { method: 'DELETE' });
          loadTasks();
        } catch (err) {
          console.error(err);
        }
      }
    });

    grid.appendChild(card);
  });
};

const getStartOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(date.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

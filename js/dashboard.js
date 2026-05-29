document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user) return;

  // Initialize Theme and Shared UI
  initTheme();
  renderCommonUI('dashboard');

  // Set Dynamic Greeting
  setGreeting(user.fullName);

  // Set Random Quote
  setQuote();

  // Load All Dashboard Data
  loadDashboardData();
});

// Dynamic Greeting based on time of day
const setGreeting = (name) => {
  const hr = new Date().getHours();
  const greetingEl = document.getElementById('dynamic-greeting');
  let greet = 'Hello';
  
  if (hr < 12) greet = 'Good morning';
  else if (hr < 18) greet = 'Good afternoon';
  else greet = 'Good evening';

  if (greetingEl) {
    greetingEl.innerHTML = `${greet}, <span>${name.split(' ')[0]}</span>!`;
  }
};

// Selection of student motivational quotes
const setQuote = () => {
  const quotes = [
    "“The secret of getting ahead is getting started.” — Mark Twain",
    "“It always seems impossible until it's done.” — Nelson Mandela",
    "“Productivity is being able to do things that you were never able to do before.” — Franz Kafka",
    "“Start where you are. Use what you have. Do what you can.” — Arthur Ashe",
    "“Your talent determines what you can do. Your motivation determines how much you are willing to do.” — Lou Holtz",
    "“Make each day your masterpiece.” — John Wooden",
    "“Success is the sum of small efforts, repeated day in and day out.” — Robert Collier"
  ];
  const quoteEl = document.getElementById('motivational-quote');
  if (quoteEl) {
    const randomIdx = Math.floor(Math.random() * quotes.length);
    quoteEl.textContent = quotes[randomIdx];
  }
};

// Main Data Fetcher
const loadDashboardData = async () => {
  try {
    // 1. Fetch Tasks
    const taskData = await apiFetch('/tasks');
    if (taskData.success) {
      processTasks(taskData.tasks);
    }

    // 2. Fetch AI Recommendations
    await loadRecommendations();

    // 3. Fetch Recent Summaries
    const summaryData = await apiFetch('/summaries');
    if (summaryData.success) {
      processSummaries(summaryData.summaries);
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
};

// Categorize tasks, deadlines, and calculate workload charts
const processTasks = (tasks) => {
  const todayList = document.getElementById('today-tasks-list');
  const deadlineList = document.getElementById('upcoming-deadlines-list');
  
  // Clear lists
  todayList.innerHTML = '';
  deadlineList.innerHTML = '';

  const todayStr = new Date().toISOString().split('T')[0];

  const todayTasks = [];
  const upcomingDeadlines = [];
  
  // Weekly workload hours array [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  const weeklyHours = [0, 0, 0, 0, 0, 0, 0];
  const startOfWeek = getStartOfWeek(new Date());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  tasks.forEach(task => {
    const taskDate = new Date(task.deadline);
    const taskDateStr = task.deadline.split('T')[0];
    
    // Group weekly hours
    if (taskDate >= startOfWeek && taskDate <= endOfWeek && !task.isCompleted) {
      let dayIndex = taskDate.getDay() - 1; // 0 for Mon, 6 for Sun
      if (dayIndex === -1) dayIndex = 6; // Sunday fix
      weeklyHours[dayIndex] += task.estimatedHours || 0;
    }

    if (taskDateStr === todayStr && !task.isCompleted) {
      todayTasks.push(task);
    } else if (taskDate > new Date() && taskDate <= endOfWeek && !task.isCompleted) {
      upcomingDeadlines.push(task);
    }
  });

  // Render Today's Tasks
  if (todayTasks.length === 0) {
    todayList.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-secondary); font-size:0.9rem;">No tasks scheduled for today. Good job!</div>';
  } else {
    todayTasks.forEach(task => {
      todayList.appendChild(createDashboardTaskRow(task));
    });
  }

  // Render Upcoming Deadlines
  if (upcomingDeadlines.length === 0) {
    deadlineList.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-secondary); font-size:0.9rem;">No upcoming deadlines this week.</div>';
  } else {
    upcomingDeadlines.forEach(task => {
      deadlineList.appendChild(createDashboardTaskRow(task, true));
    });
  }

  // Render Weekly Workload Graph
  renderWorkloadGraph(weeklyHours);
};

// Dashboard Task Row Creator
const createDashboardTaskRow = (task, showDeadline = false) => {
  const row = document.createElement('div');
  row.className = 'dash-task-item';
  
  const deadlineDate = new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const deadlineHtml = showDeadline ? `<span class="task-deadline-tag">📅 ${deadlineDate}</span>` : '';
  
  row.innerHTML = `
    <div class="dash-task-left">
      <input type="checkbox" class="dash-task-checkbox" ${task.isCompleted ? 'checked' : ''}>
      <span class="dash-task-title ${task.isCompleted ? 'completed' : ''}">${task.title}</span>
    </div>
    <div class="dash-task-meta">
      <span class="badge badge-${task.category}">${task.category}</span>
      <span class="badge badge-${task.priority}">${task.priority}</span>
      ${deadlineHtml}
    </div>
  `;

  // Checkbox Event
  const checkbox = row.querySelector('.dash-task-checkbox');
  checkbox.addEventListener('change', async () => {
    try {
      await apiFetch(`/tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: checkbox.checked })
      });
      // Reload Dashboard
      loadDashboardData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
      checkbox.checked = !checkbox.checked;
    }
  });

  return row;
};

// Render Weekly Graph
const renderWorkloadGraph = (hoursArray) => {
  const graphContainer = document.getElementById('workload-graph');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxHours = Math.max(...hoursArray, 4); // avoid division by zero, scale to min 4 hours limit

  graphContainer.innerHTML = '';
  
  hoursArray.forEach((hours, idx) => {
    const percent = (hours / maxHours) * 80; // keep some padding
    const barWrapper = document.createElement('div');
    barWrapper.className = 'graph-bar-wrapper';
    barWrapper.innerHTML = `
      <div class="graph-bar-fill" style="height:${percent}%;" data-hours="${hours}"></div>
      <div class="graph-day-label">${days[idx]}</div>
    `;
    graphContainer.appendChild(barWrapper);
  });

  const totalHours = hoursArray.reduce((a, b) => a + b, 0);
  document.getElementById('total-hours-label').textContent = `${totalHours} hrs active this week`;
};

// Helper: Get Start of Current Week (Monday)
const getStartOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const start = new Date(date.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

// Recommendations & Score ring updater
const loadRecommendations = async () => {
  const recContainer = document.getElementById('recommendations-container');
  try {
    const response = await apiFetch('/recommendations');
    if (response.success && response.data) {
      const { productivityScore, burnoutLevel, burnoutWarning, priorityAlerts, recommendations } = response.data;
      
      // Update Score circle
      updateScoreRing(productivityScore, burnoutLevel);

      // Render Coach Advice Cards
      recContainer.innerHTML = '';

      // Burnout warning card if medium/high
      if (burnoutWarning) {
        const burnoutCard = document.createElement('div');
        burnoutCard.className = `rec-alert-card ${burnoutLevel === 'high' ? 'danger' : 'warning'}`;
        burnoutCard.innerHTML = `
          <div class="rec-alert-icon">${burnoutLevel === 'high' ? '🚨' : '⚠️'}</div>
          <div class="rec-alert-content">
            <h4>Workload Burnout Status</h4>
            <p>${burnoutWarning}</p>
          </div>
        `;
        recContainer.appendChild(burnoutCard);
      }

      // Priority Alerts
      if (priorityAlerts && priorityAlerts.length > 0 && priorityAlerts[0] !== 'No pending tasks.') {
        priorityAlerts.forEach(alert => {
          const alertCard = document.createElement('div');
          alertCard.className = 'rec-alert-card warning';
          alertCard.innerHTML = `
            <div class="rec-alert-icon">⚡</div>
            <div class="rec-alert-content">
              <h4>Deadline alert</h4>
              <p>${alert}</p>
            </div>
          `;
          recContainer.appendChild(alertCard);
        });
      }

      // Recommendations list
      if (recommendations && recommendations.length > 0) {
        recommendations.forEach(tip => {
          const tipCard = document.createElement('div');
          tipCard.className = 'rec-alert-card success';
          tipCard.innerHTML = `
            <div class="rec-alert-icon">💡</div>
            <div class="rec-alert-content">
              <h4>Study suggestion</h4>
              <p>${tip}</p>
            </div>
          `;
          recContainer.appendChild(tipCard);
        });
      }

    }
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    recContainer.innerHTML = '<div style="color:var(--danger); text-align:center; font-size:0.9rem;">Could not load AI recommendations.</div>';
  }
};

const updateScoreRing = (score, level) => {
  const ring = document.getElementById('score-ring');
  const valueEl = document.getElementById('score-value');
  const levelEl = document.getElementById('burnout-level-label');

  if (ring && valueEl) {
    valueEl.textContent = score;
    
    // ring circumference is 440 (2 * pi * r = 2 * 3.14 * 70)
    const offset = 440 - (440 * score) / 100;
    ring.style.strokeDashoffset = offset;
    
    if (score >= 80) {
      ring.style.stroke = 'var(--success)';
    } else if (score >= 50) {
      ring.style.stroke = 'var(--accent)';
    } else {
      ring.style.stroke = 'var(--danger)';
    }
  }

  if (levelEl) {
    levelEl.textContent = `Workload Stress: ${level}`;
    levelEl.className = `level-${level}`;
    if (level === 'high') {
      levelEl.style.color = 'var(--danger)';
    } else if (level === 'medium') {
      levelEl.style.color = 'var(--warning)';
    } else {
      levelEl.style.color = 'var(--success)';
    }
  }
};

// Render Recent Summaries
const processSummaries = (summaries) => {
  const list = document.getElementById('recent-summaries-list');
  list.innerHTML = '';

  const recents = summaries.slice(0, 3);
  if (recents.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-secondary); font-size:0.9rem;">No summaries saved yet.</div>';
    return;
  }

  recents.forEach(item => {
    const summaryCard = document.createElement('div');
    summaryCard.className = 'dash-task-item';
    summaryCard.style.cursor = 'pointer';
    summaryCard.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.15rem;">
        <span style="font-weight:600; font-size:0.9rem;">${item.title}</span>
        <span style="font-size:0.8rem; color:var(--text-secondary); display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${item.summaryText}</span>
      </div>
      <span style="font-size:0.75rem; color:var(--text-secondary);">${new Date(item.createdAt).toLocaleDateString()}</span>
    `;

    // Navigate to summarizer on click
    summaryCard.addEventListener('click', () => {
      window.location.href = 'summarizer.html';
    });

    list.appendChild(summaryCard);
  });
};

let savedPlans = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user) return;

  initTheme();
  renderCommonUI('studyplan');

  // Load Saved Plans
  loadSavedPlans();

  // Setup Form handler
  setupPlannerForm();
});

const setupPlannerForm = () => {
  const form = document.getElementById('studyplan-form');
  const dateInput = document.getElementById('plan-exam-date');

  // Set min date of exam to today
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]; // Default: 2 weeks out
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleGeneratePlan();
    });
  }
};

// Fetch saved study plans
const loadSavedPlans = async () => {
  try {
    const data = await apiFetch('/studyplans');
    if (data.success) {
      savedPlans = data.plans;
      renderSavedPlansList();
    }
  } catch (err) {
    console.error('Failed to load saved plans:', err);
  }
};

const renderSavedPlansList = () => {
  const container = document.getElementById('saved-plans-container');
  container.innerHTML = '';

  if (savedPlans.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-secondary); font-size:0.85rem;">No saved plan roadmaps.</div>';
    return;
  }

  savedPlans.forEach(plan => {
    const item = document.createElement('div');
    item.className = 'saved-plan-item';
    item.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.15rem; flex:1; overflow:hidden;">
        <h4 style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-size:0.9rem;">${plan.subject}</h4>
        <p style="font-size:0.75rem; color:var(--text-secondary);">Target: ${new Date(plan.examDate).toLocaleDateString()}</p>
      </div>
      <button class="icon-btn delete-plan-btn" style="padding:0.25rem;" title="Delete Study Plan">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;

    // Click list item to load plan details
    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-plan-btn')) return;
      renderPlanDetails(plan);
    });

    // Delete plan item
    item.querySelector('.delete-plan-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete the plan for "${plan.subject}"?`)) {
        try {
          await apiFetch(`/studyplans/${plan._id}`, { method: 'DELETE' });
          loadSavedPlans();
          // Reset schedule panel
          resetSchedulePanel();
        } catch (err) {
          console.error(err);
        }
      }
    });

    container.appendChild(item);
  });
};

const resetSchedulePanel = () => {
  document.getElementById('studyplan-output').innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:350px; background-color:var(--card-bg); border:1px solid var(--border); border-radius:16px; text-align:center; padding:2rem; box-shadow:var(--shadow);">
      <span style="font-size:3rem; margin-bottom:1rem;">📅</span>
      <h4>No Study Roadmap Active</h4>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem; max-width:400px;">Enter subject parameters in the form to generate a dynamic week-by-week timeline schedule.</p>
    </div>
  `;
};

// Form submission API caller
const handleGeneratePlan = async () => {
  const overlay = document.getElementById('studyplan-loading-overlay');
  
  const subject = document.getElementById('plan-subject').value.trim();
  const topicsText = document.getElementById('plan-topics').value.trim();
  const difficultyLevel = document.getElementById('plan-difficulty').value;
  const examDate = document.getElementById('plan-exam-date').value;
  const availableHoursPerDay = parseInt(document.getElementById('plan-hours').value) || 2;

  if (!subject || !topicsText || !examDate) {
    alert('Please enter all required fields.');
    return;
  }

  // Parse topics
  const topics = topicsText.split(',').map(t => t.trim()).filter(t => t.length > 0);

  overlay.style.display = 'flex';

  try {
    const data = await apiFetch('/studyplans/generate', {
      method: 'POST',
      body: JSON.stringify({
        subject,
        topics,
        difficultyLevel,
        examDate,
        availableHoursPerDay
      })
    });

    if (data.success && data.studyPlan) {
      renderPlanDetails(data.studyPlan);
      loadSavedPlans(); // Reload side drawer list
    }
  } catch (err) {
    alert('Generation error: ' + err.message);
  } finally {
    overlay.style.display = 'none';
  }
};

// Render plan details on screen
const renderPlanDetails = (studyPlan) => {
  const container = document.getElementById('studyplan-output');
  const details = studyPlan.planData;

  // Weeks roadmap html
  let weeksHtml = '';
  if (details.weeklyRoadmap && details.weeklyRoadmap.length > 0) {
    details.weeklyRoadmap.forEach((w, wIdx) => {
      let daysRowsHtml = '';
      if (w.dailyTasks && w.dailyTasks.length > 0) {
        w.dailyTasks.forEach(task => {
          daysRowsHtml += `
            <div class="daily-schedule-row">
              <span class="daily-day-tag">${task.day || 'Day'}</span>
              <span class="daily-task-desc">${task.task || 'Review session'}</span>
              <span class="daily-hours-tag">⏳ ${task.hours || 1} hrs</span>
            </div>
          `;
        });
      }

      weeksHtml += `
        <div class="timeline-week-node">
          <div class="week-roadmap-card">
            <div class="week-roadmap-header" onclick="toggleWeekCollapse(this)">
              <h4>Week ${w.weekNumber || (wIdx + 1)}: ${w.focus || 'Core Review'}</h4>
              <span>▼ Click to toggle</span>
            </div>
            <div class="week-roadmap-body">
              ${daysRowsHtml}
            </div>
          </div>
        </div>
      `;
    });
  }

  // Revision sessions list
  let revisionHtml = '';
  if (details.revisionSessions && details.revisionSessions.length > 0) {
    revisionHtml = `
      <div class="dash-card" style="margin-top:1.5rem;">
        <div class="dash-card-header" style="margin-bottom:0.75rem;">
          <h3>🔄 Revision Schedules</h3>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          ${details.revisionSessions.map(r => `
            <div class="daily-schedule-row" style="border-bottom: 1px solid var(--border)">
              <span style="font-weight:600;">${r.sessionName}</span>
              <span style="color:var(--text-secondary); flex:1; margin:0 1rem;">${r.focus}</span>
              <span style="font-weight:500;">⏳ ${r.recommendedHours} hrs</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Recommendations cards
  let recsHtml = '';
  if (details.smartRecommendations && details.smartRecommendations.length > 0) {
    recsHtml = `
      <div class="dash-card" style="margin-top:1.5rem;">
        <div class="dash-card-header" style="margin-bottom:0.75rem;">
          <h3>💡 Planner Recommendations</h3>
        </div>
        <div class="rec-panel">
          ${details.smartRecommendations.map(tip => `
            <div class="rec-alert-card success" style="margin-bottom: 0.25rem;">
              <div class="rec-alert-icon">💡</div>
              <div class="rec-alert-content">
                <p style="font-size:0.85rem; color:var(--text-primary);">${tip}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="padding:0.25rem 0;">
      
      <!-- Meta Card -->
      <div class="studyplan-meta-summary" style="margin-bottom: 1.5rem;">
        <div class="studyplan-meta-item">
          <h4>Subject Course</h4>
          <p>${studyPlan.subject}</p>
        </div>
        <div class="studyplan-meta-item">
          <h4>Target Exam Date</h4>
          <p>${new Date(studyPlan.examDate).toLocaleDateString()}</p>
        </div>
        <div class="studyplan-meta-item">
          <h4>AI Period Estimate</h4>
          <p>${details.estimatedCompletionTime || '2 weeks'}</p>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="studyplan-action-bar" style="margin-bottom: 1.5rem;">
        <button class="btn btn-secondary" onclick="window.print()" style="width:auto; padding:0.6rem 1.25rem;">
          🖨️ Download PDF Plan
        </button>
      </div>

      <!-- Roadmap Timeline -->
      <div class="timeline-roadmap">
        ${weeksHtml}
      </div>

      <!-- Revisions section -->
      ${revisionHtml}

      <!-- Tips section -->
      ${recsHtml}

    </div>
  `;
};

// Click toggle collapse handler for roadmap weeks
window.toggleWeekCollapse = (headerElement) => {
  const body = headerElement.nextElementSibling;
  body.classList.toggle('collapsed');
  const span = headerElement.querySelector('span');
  if (body.classList.contains('collapsed')) {
    span.textContent = '▲ Click to expand';
  } else {
    span.textContent = '▼ Click to toggle';
  }
};

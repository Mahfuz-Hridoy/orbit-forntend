let savedSummaries = [];
let activeSummaryText = '';

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user) return;

  initTheme();
  renderCommonUI('summarizer');

  // Load past summaries
  loadSavedSummaries();

  // Setup Event Listeners
  setupSummarizerListeners();
});

const setupSummarizerListeners = () => {
  const textarea = document.getElementById('notes-textarea');
  const charCounter = document.getElementById('char-counter');
  const clearBtn = document.getElementById('clear-notes-btn');
  const summarizeBtn = document.getElementById('summarize-btn');
  const copyBtn = document.getElementById('copy-summary-btn');

  // Character counter
  if (textarea && charCounter) {
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCounter.textContent = `${len} characters`;
    });
  }

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      textarea.value = '';
      charCounter.textContent = '0 characters';
      resetOutputPanel();
    });
  }

  // Summarize action
  if (summarizeBtn) {
    summarizeBtn.addEventListener('click', () => {
      handleSummarize();
    });
  }

  // Copy action
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      handleCopyText();
    });
  }
};

const resetOutputPanel = () => {
  const output = document.getElementById('summary-output');
  const copyBtn = document.getElementById('copy-summary-btn');
  
  copyBtn.style.display = 'none';
  activeSummaryText = '';
  
  output.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-secondary); text-align:center; padding:2rem;">
      <span style="font-size:3rem; margin-bottom:1rem;">📝</span>
      <h4>No Summary Generated Yet</h4>
      <p style="font-size:0.85rem; margin-top:0.25rem;">Paste your notes in the left editor panel and click "Generate Summary" to analyze them.</p>
    </div>
  `;
};

// Fetch summaries
const loadSavedSummaries = async () => {
  const container = document.getElementById('saved-summaries-container');
  try {
    const data = await apiFetch('/summaries');
    if (data.success) {
      savedSummaries = data.summaries;
      renderSavedSummariesList();
    }
  } catch (err) {
    console.error('Error fetching summaries list:', err);
  }
};

const renderSavedSummariesList = () => {
  const container = document.getElementById('saved-summaries-container');
  container.innerHTML = '';

  if (savedSummaries.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:var(--text-secondary); font-size:0.8rem; padding:1.5rem;">No saved summaries yet.</div>';
    return;
  }

  savedSummaries.forEach(item => {
    const row = document.createElement('div');
    row.className = 'saved-plan-item';
    row.style.padding = '0.5rem 0.75rem';
    row.style.marginBottom = '0.5rem';
    row.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.15rem; flex:1; overflow:hidden;">
        <h4 style="font-size:0.85rem; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${item.title}</h4>
        <span style="font-size:0.7rem; color:var(--text-secondary);">${new Date(item.createdAt).toLocaleDateString()}</span>
      </div>
      <button class="icon-btn delete-sum-btn" style="padding:0.25rem;" title="Delete Summary">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;

    // Click to load summary details
    row.addEventListener('click', (e) => {
      // Don't trigger if clicked on delete button
      if (e.target.closest('.delete-sum-btn')) return;
      renderSummaryDetails(item);
    });

    // Delete summary action
    row.querySelector('.delete-sum-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete summary "${item.title}"?`)) {
        try {
          await apiFetch(`/summaries/${item._id}`, { method: 'DELETE' });
          loadSavedSummaries();
          // Reset panel if deleting current active
          resetOutputPanel();
        } catch (err) {
          console.error(err);
        }
      }
    });

    container.appendChild(row);
  });
};

// Send notes to backend
const handleSummarize = async () => {
  const textarea = document.getElementById('notes-textarea');
  const overlay = document.getElementById('summarizer-loading-overlay');
  const text = textarea.value.trim();

  if (text.length < 100) {
    alert('Please enter at least 100 characters of notes to generate a meaningful summary.');
    return;
  }

  overlay.style.display = 'flex';

  try {
    const data = await apiFetch('/summaries/summarize', {
      method: 'POST',
      body: JSON.stringify({ notesText: text })
    });

    if (data.success && data.summary) {
      renderSummaryDetails(data.summary);
      loadSavedSummaries(); // Reload list
    }
  } catch (err) {
    alert('Failed to generate summary: ' + err.message);
  } finally {
    overlay.style.display = 'none';
  }
};

// Render Details of summary
const renderSummaryDetails = (item) => {
  const output = document.getElementById('summary-output');
  const copyBtn = document.getElementById('copy-summary-btn');

  copyBtn.style.display = 'inline-flex';
  
  // Format key concepts pills
  let conceptsHtml = '';
  if (item.keyConcepts && item.keyConcepts.length > 0) {
    conceptsHtml = `
      <div class="summary-block-section">
        <h4>🏷️ Key Concepts</h4>
        <div class="concept-pills-container">
          ${item.keyConcepts.map(c => `<span class="concept-pill">${c}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // Format bullet points
  let bulletsHtml = '';
  if (item.bulletPoints && item.bulletPoints.length > 0) {
    bulletsHtml = `
      <div class="summary-block-section">
        <h4>📌 Important Highlights</h4>
        <ul class="summary-bullet-list">
          ${item.bulletPoints.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  output.innerHTML = `
    <div style="padding:0.25rem 0;">
      <h2 style="font-size:1.3rem; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; color:var(--accent-hover);">${item.title}</h2>
      
      <div class="summary-block-section">
        <h4>📖 Summary Overview</h4>
        <p class="summary-paragraph-text">${item.summaryText}</p>
      </div>

      ${bulletsHtml}
      ${conceptsHtml}
    </div>
  `;

  // Construct text for copy to clipboard
  activeSummaryText = `TITLE: ${item.title}\n\nOVERVIEW:\n${item.summaryText}\n\nHIGHLIGHTS:\n${item.bulletPoints.map(b => `- ${b}`).join('\n')}\n\nKEY CONCEPTS:\n${item.keyConcepts.join(', ')}`;
};

// Copy summary text to clipboard
const handleCopyText = () => {
  if (!activeSummaryText) return;

  const btn = document.getElementById('copy-summary-btn');
  navigator.clipboard.writeText(activeSummaryText).then(() => {
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    btn.classList.add('btn-primary');
    btn.style.backgroundColor = 'var(--success)';
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove('btn-primary');
      btn.style.backgroundColor = '';
    }, 2000);
  }).catch(err => {
    alert('Failed to copy to clipboard');
  });
};

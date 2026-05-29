document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user) return;

  initTheme();
  renderCommonUI('chatbot');

  // Load chat history
  loadChatHistory();

  // Setup Event listeners
  setupChatListeners();
});

const setupChatListeners = () => {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  if (!input || !sendBtn) return;

  // Click send button
  sendBtn.addEventListener('click', () => {
    handleSendMessage();
  });

  // Press Enter key (but shift+enter adds newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
};

// Load History logs
const loadChatHistory = async () => {
  const historyLog = document.getElementById('chat-history');
  try {
    const data = await apiFetch('/chat/history');
    if (data.success && data.messages.length > 0) {
      // Clear default initial message
      historyLog.innerHTML = '';
      
      data.messages.forEach(msg => {
        appendMessageBubble(msg.sender, msg.message);
      });
      
      scrollToBottom();
    }
  } catch (err) {
    console.error('Failed to load chat history:', err);
  }
};

// Handle sending message
const handleSendMessage = async () => {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const typing = document.getElementById('chat-typing-indicator');

  const text = input.value.trim();
  if (!text) return;

  // Clear input
  input.value = '';
  
  // Disable fields
  input.disabled = true;
  sendBtn.disabled = true;

  // Append user bubble
  appendMessageBubble('user', text);
  scrollToBottom();

  // Show typing dot
  typing.style.display = 'flex';
  scrollToBottom();

  try {
    const data = await apiFetch('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message: text })
    });

    if (data.success) {
      // Hide typing dot
      typing.style.display = 'none';

      // Append bot response
      appendMessageBubble('ai', data.reply);
      
      // If task was auto-created, play bell animation or reload notification
      if (data.autoCreatedTask) {
        // Trigger notification check in notification utility if available
        if (typeof initNotifications === 'function') {
          // Recheck notifications
          const badge = document.getElementById('noti-badge');
          if (badge) {
            const currentVal = parseInt(badge.textContent) || 0;
            badge.textContent = currentVal + 1;
            badge.style.display = 'flex';
          }
        }
      }
    }
  } catch (err) {
    typing.style.display = 'none';
    appendMessageBubble('ai', '⚠️ Error: Could not connect to study coach. Please try again.');
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
    scrollToBottom();
  }
};

// Append bubble helper
const appendMessageBubble = (sender, text) => {
  const historyLog = document.getElementById('chat-history');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  
  // Format basic markdown style (bullet points, bold text, newlines)
  let formattedText = escapeHTML(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[Auto-Task\] (.*?)/g, '<div style="background-color:rgba(229,169,59,0.1); border-left:3px solid var(--accent); padding:0.5rem 0.75rem; border-radius:4px; margin-top:0.5rem; font-size:0.85rem;">📌 <strong>Auto-Added Task:</strong> $1</div>');

  bubble.innerHTML = formattedText;
  historyLog.appendChild(bubble);
};

// Scroll log helper
const scrollToBottom = () => {
  const historyLog = document.getElementById('chat-history');
  historyLog.scrollTop = historyLog.scrollHeight;
};

// HTML Escaper to prevent script injection
const escapeHTML = (str) => {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
};

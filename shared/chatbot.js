// InstaPix Events — Pixy AI Sales Chatbot Widget
// Self-contained: injects HTML + CSS, no external dependencies
(function () {
  'use strict';

  const SUPABASE_URL = 'https://iopvkxokniexbwxizkyd.supabase.co';
  const FUNCTION_URL = SUPABASE_URL + '/functions/v1/ai-sales-chat';

  const GREETING = "Hey! I'm Pixy, your virtual booking assistant at InstaPix Events.\n\nWhether you're planning a wedding, birthday, or corporate event — I can help you find the perfect photo booth package.\n\nWhat can I help you with?";

  // --- Session (localStorage with 24h expiry) ---
  const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  function getSessionId() {
    const stored = localStorage.getItem('ipx_chat_session');
    const ts = localStorage.getItem('ipx_chat_session_ts');
    if (stored && ts && (Date.now() - Number(ts)) < SESSION_EXPIRY_MS) return stored;
    // Expired or missing — start fresh
    const id = crypto.randomUUID();
    localStorage.setItem('ipx_chat_session', id);
    localStorage.setItem('ipx_chat_session_ts', String(Date.now()));
    localStorage.removeItem('ipx_chat_msgs');
    return id;
  }

  function getMessages() {
    try {
      const ts = localStorage.getItem('ipx_chat_session_ts');
      if (ts && (Date.now() - Number(ts)) >= SESSION_EXPIRY_MS) {
        localStorage.removeItem('ipx_chat_msgs');
        return [];
      }
      return JSON.parse(localStorage.getItem('ipx_chat_msgs') || '[]');
    } catch { return []; }
  }

  function saveMessages(msgs) {
    localStorage.setItem('ipx_chat_msgs', JSON.stringify(msgs));
  }

  // --- Inject CSS ---
  const style = document.createElement('style');
  style.textContent = `
    .ipx-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9998;
      width: 56px; height: 56px; border-radius: 50%;
      background: #0B1F14; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .ipx-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.35); }
    .ipx-chat-btn svg { width: 26px; height: 26px; fill: none; stroke: #C5A96A; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .ipx-chat-btn .ipx-close-icon { display: none; }
    .ipx-chat-btn.open .ipx-chat-icon { display: none; }
    .ipx-chat-btn.open .ipx-close-icon { display: block; }

    .ipx-chat-badge {
      position: absolute; top: -4px; right: -4px;
      width: 20px; height: 20px; border-radius: 50%;
      background: #C5A96A; color: #0B1F14;
      font-size: 11px; font-weight: 700; font-family: 'Montserrat', sans-serif;
      display: flex; align-items: center; justify-content: center;
    }

    .ipx-chat-tooltip {
      position: fixed; bottom: 90px; right: 24px; z-index: 9997;
      background: #0B1F14; color: #F5F0E8; padding: 10px 16px;
      border-radius: 12px 12px 4px 12px;
      font-family: 'Montserrat', sans-serif; font-size: 13px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      opacity: 0; transform: translateY(8px);
      transition: opacity 0.4s, transform 0.4s;
      pointer-events: none; max-width: 240px;
    }
    .ipx-chat-tooltip.show { opacity: 1; transform: translateY(0); }

    .ipx-chat-panel {
      position: fixed; bottom: 92px; right: 24px; z-index: 9999;
      width: 380px; height: 520px;
      border-radius: 16px; overflow: hidden;
      background: #F5F0E8;
      box-shadow: 0 12px 48px rgba(0,0,0,0.2);
      display: flex; flex-direction: column;
      opacity: 0; transform: translateY(16px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    .ipx-chat-panel.open {
      opacity: 1; transform: translateY(0) scale(1);
      pointer-events: all;
    }

    .ipx-chat-header {
      background: #0B1F14; color: #F5F0E8;
      padding: 14px 18px; display: flex; align-items: center; gap: 10px;
      font-family: 'Montserrat', sans-serif; flex-shrink: 0;
    }
    .ipx-chat-header-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #6FCF97; flex-shrink: 0;
    }
    .ipx-chat-header-name { font-size: 14px; font-weight: 600; flex: 1; }
    .ipx-chat-header-close {
      background: none; border: none; color: #F5F0E8; cursor: pointer;
      font-size: 20px; line-height: 1; padding: 0 4px; opacity: 0.7;
      transition: opacity 0.15s;
    }
    .ipx-chat-header-close:hover { opacity: 1; }

    .ipx-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    .ipx-chat-messages::-webkit-scrollbar { width: 4px; }
    .ipx-chat-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }

    .ipx-msg {
      max-width: 85%; padding: 10px 14px;
      font-family: 'Montserrat', sans-serif; font-size: 13.5px; line-height: 1.55;
      word-wrap: break-word; white-space: pre-wrap;
    }
    .ipx-msg a { color: inherit; text-decoration: underline; font-weight: 600; }
    .ipx-msg-bot {
      align-self: flex-start;
      background: #fff; color: #1a1a1a;
      border-radius: 4px 14px 14px 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .ipx-msg-user {
      align-self: flex-end;
      background: #2D5A3D; color: #fff;
      border-radius: 14px 4px 14px 14px;
    }

    .ipx-typing {
      align-self: flex-start; display: flex; gap: 5px;
      padding: 12px 16px; background: #fff;
      border-radius: 4px 14px 14px 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .ipx-typing span {
      width: 7px; height: 7px; border-radius: 50%;
      background: #2D5A3D; opacity: 0.4;
      animation: ipxBounce 1.2s infinite;
    }
    .ipx-typing span:nth-child(2) { animation-delay: 0.15s; }
    .ipx-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes ipxBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    .ipx-chat-input-wrap {
      display: flex; gap: 8px; padding: 12px 16px;
      background: #fff; border-top: 1px solid rgba(0,0,0,0.06);
      flex-shrink: 0;
    }
    .ipx-chat-input {
      flex: 1; border: 1px solid rgba(0,0,0,0.1); border-radius: 24px;
      padding: 10px 16px; font-family: 'Montserrat', sans-serif;
      font-size: 13.5px; outline: none; background: #F5F0E8;
      transition: border-color 0.15s;
    }
    .ipx-chat-input::placeholder { color: rgba(0,0,0,0.35); }
    .ipx-chat-input:focus { border-color: #2D5A3D; }
    .ipx-chat-send {
      width: 40px; height: 40px; border-radius: 50%;
      background: #C5A96A; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, transform 0.15s; flex-shrink: 0;
    }
    .ipx-chat-send:hover { background: #b89a5a; transform: scale(1.05); }
    .ipx-chat-send:disabled { opacity: 0.5; cursor: default; transform: none; }
    .ipx-chat-send svg { width: 18px; height: 18px; fill: none; stroke: #0B1F14; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    .ipx-chat-powered {
      text-align: center; padding: 6px; font-family: 'Montserrat', sans-serif;
      font-size: 10px; color: rgba(0,0,0,0.3); background: #fff; flex-shrink: 0;
    }

    @media (max-width: 640px) {
      .ipx-chat-panel {
        bottom: 0; right: 0; left: 0; top: 0;
        width: 100%; height: 100%;
        border-radius: 0;
      }
      .ipx-chat-btn { bottom: 16px; right: 16px; }
      .ipx-chat-tooltip { bottom: 82px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  // --- Inject HTML ---
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="ipx-chat-tooltip" id="ipxTooltip">Have a question about our photo booths?</div>

    <button class="ipx-chat-btn" id="ipxChatBtn" aria-label="Open chat">
      <svg class="ipx-chat-icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <svg class="ipx-close-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      <span class="ipx-chat-badge" id="ipxBadge" style="display:none">1</span>
    </button>

    <div class="ipx-chat-panel" id="ipxPanel">
      <div class="ipx-chat-header">
        <div class="ipx-chat-header-dot"></div>
        <div class="ipx-chat-header-name">Pixy — InstaPix Assistant</div>
        <button class="ipx-chat-header-close" id="ipxPanelClose" aria-label="Close chat">&times;</button>
      </div>
      <div class="ipx-chat-messages" id="ipxMessages"></div>
      <div class="ipx-chat-input-wrap">
        <input class="ipx-chat-input" id="ipxInput" type="text" placeholder="Type your message..." autocomplete="off">
        <button class="ipx-chat-send" id="ipxSend" aria-label="Send message">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div class="ipx-chat-powered">Powered by InstaPix Events</div>
    </div>
  `;
  document.body.appendChild(container);

  // --- References ---
  const btn = document.getElementById('ipxChatBtn');
  const panel = document.getElementById('ipxPanel');
  const closeBtn = document.getElementById('ipxPanelClose');
  const messagesEl = document.getElementById('ipxMessages');
  const input = document.getElementById('ipxInput');
  const sendBtn = document.getElementById('ipxSend');
  const tooltip = document.getElementById('ipxTooltip');
  const badge = document.getElementById('ipxBadge');

  let isOpen = false;
  let isLoading = false;
  let messages = getMessages();
  let hasShownTooltip = localStorage.getItem('ipx_chat_tooltip_shown');

  // --- Render messages ---
  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach(m => appendBubble(m.role, m.content));
    scrollToBottom();
  }

  function appendBubble(role, text) {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'ipx-msg ipx-msg-user' : 'ipx-msg ipx-msg-bot';
    // Convert **bold** to <strong>
    let html = escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    // Convert URLs to links
    html = html.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );
    // Convert book.html and instapixevents.com/book references to links
    html = html.replace(
      /instapixevents\.com\/book/g,
      '<a href="book.html">instapixevents.com/book</a>'
    );
    div.innerHTML = html;
    messagesEl.appendChild(div);
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'ipx-typing';
    div.id = 'ipxTyping';
    div.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    const t = document.getElementById('ipxTyping');
    if (t) t.remove();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // --- API call ---
  async function sendToAI(userText) {
    messages.push({ role: 'user', content: userText });
    saveMessages(messages);
    appendBubble('user', userText);
    showTyping();
    isLoading = true;
    sendBtn.disabled = true;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': getSessionId() },
        signal: controller.signal,
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          session_id: getSessionId(),
          page_url: window.location.href,
        }),
      });
      clearTimeout(timeout);

      const data = await res.json();
      hideTyping();

      if (data.text) {
        messages.push({ role: 'assistant', content: data.text });
        saveMessages(messages);
        appendBubble('assistant', data.text);
      } else if (data.error) {
        appendBubble('assistant', "Sorry, I'm having a little trouble right now. Feel free to call us at (647) 952-0738 or email instapixevents@gmail.com!");
      }
    } catch (err) {
      hideTyping();
      const msg = err.name === 'AbortError'
        ? "That's taking longer than expected. You can reach us directly at (647) 952-0738 or instapixevents@gmail.com!"
        : "Oops, something went wrong. You can reach us directly at (647) 952-0738 or instapixevents@gmail.com!";
      appendBubble('assistant', msg);
    }

    isLoading = false;
    sendBtn.disabled = false;
    scrollToBottom();
    input.focus();
  }

  // --- Open / Close ---
  function openChat() {
    isOpen = true;
    panel.classList.add('open');
    btn.classList.add('open');
    tooltip.classList.remove('show');
    badge.style.display = 'none';
    document.body.style.overflow = window.innerWidth <= 640 ? 'hidden' : '';

    // Load greeting if first open
    if (messages.length === 0) {
      messages.push({ role: 'assistant', content: GREETING });
      saveMessages(messages);
    }
    renderMessages();
    input.focus();
  }

  function closeChat() {
    isOpen = false;
    panel.classList.remove('open');
    btn.classList.remove('open');
    document.body.style.overflow = '';
  }

  // --- Event listeners ---
  btn.addEventListener('click', () => {
    if (isOpen) closeChat();
    else openChat();
  });

  closeBtn.addEventListener('click', closeChat);

  sendBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    sendToAI(text);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeChat();
  });

  // --- Tooltip on first visit ---
  if (!hasShownTooltip && messages.length === 0) {
    setTimeout(() => {
      if (!isOpen) {
        tooltip.classList.add('show');
        badge.style.display = 'flex';
        localStorage.setItem('ipx_chat_tooltip_shown', '1');
        setTimeout(() => tooltip.classList.remove('show'), 8000);
      }
    }, 5000);
  }

  // --- Safety net: save messages on tab close/hide ---
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && messages.length > 1) {
      const payload = JSON.stringify({
        type: 'save_partial',
        session_id: getSessionId(),
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        page_url: window.location.href,
      });
      navigator.sendBeacon(FUNCTION_URL, new Blob([payload], { type: 'application/json' }));
    }
  });

  // --- Restore session ---
  if (messages.length > 0 && !isOpen) {
    // Show badge if there are previous messages
    badge.style.display = 'flex';
  }
})();

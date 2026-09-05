(function () {
  const toggle = document.getElementById('chat-toggle');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messagesEl = document.getElementById('chat-messages');
  const widget = document.getElementById('chat-widget');

  if (!toggle || !panel) return;

  const history = [];

  toggle.addEventListener('click', () => widget.classList.toggle('open'));
  closeBtn.addEventListener('click', () => widget.classList.remove('open'));

  function addMessage(text, who) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + who;
    if (who === 'bot') {
      div.innerHTML = text; // respostas do bot são sempre conteúdo nosso, pré-definido
    } else {
      div.textContent = text;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg bot typing';
    div.id = 'chat-typing';
    div.textContent = '...';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('chat-typing');
    if (el) el.remove();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    addMessage(message, 'user');
    history.push({ role: 'user', content: message });
    input.value = '';
    addTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: history.slice(0, -1) })
      });
      const data = await res.json();
      removeTyping();
      if (data.ok) {
        addMessage(data.reply, 'bot');
        history.push({ role: 'assistant', content: data.reply });
      } else {
        addMessage(data.erro || 'Não consegui responder agora.', 'bot');
      }
    } catch (err) {
      removeTyping();
      addMessage('Erro de ligação. Tenta novamente.', 'bot');
    }
  });
})();

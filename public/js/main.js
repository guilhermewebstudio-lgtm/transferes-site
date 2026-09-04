(function () {
  // Animação de entrada do site: mostra-se uma vez por sessão do browser
  if (!sessionStorage.getItem('site_entered')) {
    const pre = document.createElement('div');
    pre.className = 'site-preloader';
    pre.innerHTML = `
      <div class="preloader-mark">
        <svg class="preloader-ring" viewBox="0 0 120 120" width="88" height="88">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(61,125,251,0.15)" stroke-width="1.5"/>
          <circle class="preloader-ring-progress" cx="60" cy="60" r="52" fill="none" stroke="#3d7dfb" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <svg class="preloader-car" viewBox="0 0 40 24" width="38" height="23" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 17c0-2 1.5-3.4 3.6-3.8L9 12.4l3-4.6c.6-.9 1.6-1.4 2.7-1.4h9.4c1.2 0 2.3.6 2.9 1.7l2.6 4.6 3.2.7c1.6.4 2.6 1.8 2.6 3.4v2.2c0 .9-.7 1.6-1.6 1.6H35" stroke="#eef2f8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="11" cy="18.4" r="2.4" stroke="#3d7dfb" stroke-width="1.6"/>
          <circle cx="27" cy="18.4" r="2.4" stroke="#3d7dfb" stroke-width="1.6"/>
          <path d="M2 17H7" stroke="#eef2f8" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="preloader-word">Transferes</div>
    `;
    document.documentElement.classList.add('preloading');
    document.body.prepend(pre);

    window.addEventListener('load', () => {
      setTimeout(() => {
        pre.classList.add('fade-out');
        document.documentElement.classList.remove('preloading');
        setTimeout(() => pre.remove(), 600);
      }, 1100);
    });

    sessionStorage.setItem('site_entered', '1');
  }

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isOpen = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Olho para mostrar/esconder password
  document.querySelectorAll('.pw-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.closest('.pw-field');
      const input = field.querySelector('.pw-input');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      field.querySelector('.pw-eye-open').style.display = isHidden ? 'none' : 'block';
      field.querySelector('.pw-eye-closed').style.display = isHidden ? 'block' : 'none';
      btn.setAttribute('aria-label', isHidden ? 'Esconder password' : 'Mostrar password');
    });
  });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const overlay = document.querySelector('.route-transition');

  document.querySelectorAll('a[data-nav]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || link.target === '_blank') return;
      if (window.location.pathname === href) return;

      e.preventDefault();

      if (prefersReducedMotion || !overlay) {
        window.location.href = href;
        return;
      }

      overlay.classList.add('active');
      setTimeout(() => {
        window.location.href = href;
      }, 480);
    });
  });
})();

(function () {
  // Animação de entrada do site: mostra-se uma vez por sessão do browser
  if (!sessionStorage.getItem('site_entered')) {
    const pre = document.createElement('div');
    pre.className = 'site-preloader';
    pre.innerHTML = `
      <div class="preloader-mark">
        <svg class="preloader-ring" viewBox="0 0 120 120" width="88" height="88">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(201,161,106,0.15)" stroke-width="1.5"/>
          <circle class="preloader-ring-progress" cx="60" cy="60" r="52" fill="none" stroke="#c9a16a" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <img class="preloader-car" src="/img/logo-icon.png" alt="" style="max-height:52px; max-width:64px; width:auto; height:auto; object-fit:contain;">
      </div>
      <div class="preloader-word">Sr Transferes</div>
    `;
    document.documentElement.classList.add('preloading');
    document.body.prepend(pre);

    window.addEventListener('load', () => {
      setTimeout(() => {
        pre.classList.add('fade-out');
        document.documentElement.classList.remove('preloading');
        setTimeout(() => pre.remove(), 600);
      }, 1350);
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

  // Menu suspenso da conta
  const accountMenu = document.querySelector('.account-menu');
  if (accountMenu) {
    const toggleBtn = accountMenu.querySelector('.account-menu-toggle');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      accountMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!accountMenu.contains(e.target)) accountMenu.classList.remove('open');
    });
  }

  // Animação de revelação ao fazer scroll
  const revealTargets = document.querySelectorAll('.strip-card, .fleet-card, .service-row, .value-item, .admin-stat-card');
  if (revealTargets.length && 'IntersectionObserver' in window) {
    revealTargets.forEach((el) => el.classList.add('reveal-on-scroll'));
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealTargets.forEach((el) => revealObserver.observe(el));
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
      }, 380);
    });
  });
})();

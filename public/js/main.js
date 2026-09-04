(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isOpen = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

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

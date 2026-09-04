(function () {
  // Animação de entrada do site: mostra-se uma vez por sessão do browser
  if (!sessionStorage.getItem('site_entered')) {
    const pre = document.createElement('div');
    pre.className = 'site-preloader';
    pre.innerHTML = `
      <svg class="preloader-scene" viewBox="0 0 400 200" width="260">
        <defs>
          <linearGradient id="preBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ffe9b0" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#ffe9b0" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="pre-beam pre-beam-1" d="M180 96 L400 40 L400 96 Z" fill="url(#preBeam)"/>
        <path class="pre-beam pre-beam-2" d="M180 104 L400 104 L400 160 Z" fill="url(#preBeam)"/>
        <circle class="pre-light" cx="176" cy="100" r="5" fill="#ffe9b0"/>
      </svg>
      <div class="preloader-word">
        <span>T</span><span>r</span><span>a</span><span>n</span><span>s</span><span>f</span><span>e</span><span>r</span><span>e</span><span>s</span>
      </div>
    `;
    document.documentElement.classList.add('preloading');
    document.body.prepend(pre);

    window.addEventListener('load', () => {
      setTimeout(() => {
        pre.classList.add('fade-out');
        document.documentElement.classList.remove('preloading');
        setTimeout(() => pre.remove(), 700);
      }, 1400);
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

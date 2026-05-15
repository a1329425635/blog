/**
 * Theme Manager - Day/Night Mode Toggle
 * Persists preference to localStorage, applies on page load
 */
const Theme = (() => {
  const KEY = 'blog_theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function get() {
    const stored = localStorage.getItem(KEY);
    if (stored === LIGHT || stored === DARK) return stored;
    // Respect system preference as default
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return LIGHT;
    }
    return DARK;
  }

  function apply(theme) {
    if (theme === LIGHT) {
      document.documentElement.setAttribute('data-theme', LIGHT);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(KEY, theme);
    updateToggleUI(theme);
  }

  function toggle() {
    const current = get();
    const next = current === DARK ? LIGHT : DARK;
    apply(next);
  }

  function updateToggleUI(theme) {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    const label = theme === DARK ? '暗' : '明';
    btn.setAttribute('title', theme === DARK ? '切换至日间模式' : '切换至夜间模式');
    btn.setAttribute('aria-label', theme === DARK ? '切换至日间模式' : '切换至夜间模式');
  }

  function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    // Close when clicking a link
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !links.contains(e.target)) {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function init() {
    apply(get());

    const container = document.getElementById('theme-toggle-container');
    if (container) {
      mountToggle(container);
    }

    initMobileNav();

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem(KEY)) {
          apply(e.matches ? LIGHT : DARK);
        }
      });
    }
  }

  // Render the toggle button into a container
  function mountToggle(container) {
    if (!container) return;
    container.innerHTML = `
      <button class="theme-toggle" onclick="Theme.toggle()"
              title="切换日/夜间模式" aria-label="切换日/夜间模式">
        <span class="theme-toggle-icon"></span>
      </button>
    `;
  }

  document.addEventListener('DOMContentLoaded', init);

  return { get, apply, toggle, mountToggle, init };
})();

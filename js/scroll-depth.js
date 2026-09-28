'use strict';

(() => {
  const sections = Array.from(document.querySelectorAll('.depth-section'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!sections.length || reduceMotion.matches) return;

  let ticking = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateDepth() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);

      let y = 0;
      let z = 0;
      let scale = 1;
      let opacity = 1;
      let shadow = .08;

      if (progress < .42) {
        const t = 1 - progress / .42;
        y = 72 * t;
        z = 130 * t;
        scale = 1 + .045 * t;
        opacity = 1 - .28 * t;
        shadow = .12 + .08 * t;
      } else if (progress > .64) {
        const t = (progress - .64) / .36;
        y = -34 * t;
        z = -190 * t;
        scale = 1 - .085 * t;
        opacity = 1 - .52 * t;
        shadow = .08 - .04 * t;
      }

      section.style.setProperty('--depth-y', y.toFixed(1) + 'px');
      section.style.setProperty('--depth-z', z.toFixed(1) + 'px');
      section.style.setProperty('--depth-scale', scale.toFixed(4));
      section.style.setProperty('--depth-opacity', opacity.toFixed(3));
      section.style.setProperty('--depth-shadow', Math.max(.02, shadow).toFixed(3));
    });

    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateDepth);
  }

  updateDepth();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
})();

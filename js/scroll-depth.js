'use strict';

(() => {
  const cards = Array.from(document.querySelectorAll('.bento-card'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!cards.length || reduceMotion.matches) return;

  let ticking = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateBentoDepth() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportCenterY = viewportHeight * 0.52;
    const isMobile = viewportWidth < 700;

    cards.forEach((card, index) => {
      if (card.hidden || card.offsetParent === null) return;

      const rect = card.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;
      const cardCenterX = rect.left + rect.width / 2;
      const vertical = clamp((cardCenterY - viewportCenterY) / (viewportHeight * .78), -1.25, 1.25);
      const horizontal = clamp((cardCenterX / viewportWidth - .5) * 2, -1, 1);
      const distance = Math.min(Math.abs(vertical), 1);
      const depthMultiplier = Number(card.dataset.bentoDepth || 1);

      const z = isMobile
        ? (24 - distance * 50) * depthMultiplier
        : (72 - distance * 165) * depthMultiplier;
      const y = vertical * (isMobile ? 10 : 24) * depthMultiplier;
      const rx = vertical * (isMobile ? -2.2 : -7.2) * depthMultiplier;
      const ryBase = isMobile ? 0 : (-horizontal * 4.2 + vertical * horizontal * 2.4);
      const ry = ryBase * depthMultiplier;
      const scale = isMobile
        ? 1 - distance * .012
        : 1 - distance * .032;

      card.style.setProperty('--bento-y', y.toFixed(1) + 'px');
      card.style.setProperty('--bento-z', z.toFixed(1) + 'px');
      card.style.setProperty('--bento-rx', rx.toFixed(2) + 'deg');
      card.style.setProperty('--bento-ry', ry.toFixed(2) + 'deg');
      card.style.setProperty('--bento-scale', scale.toFixed(4));
    });

    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateBentoDepth);
  }

  updateBentoDepth();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
})();

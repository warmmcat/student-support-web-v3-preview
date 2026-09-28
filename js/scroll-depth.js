'use strict';

(() => {
  const cards = Array.from(document.querySelectorAll('.bento-card'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!cards.length || reduceMotion.matches) return;

  const states = new Map();
  let frameId = 0;
  let targetsDirty = true;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function layoutPosition(element) {
    let x = 0;
    let y = 0;
    let node = element;

    while (node) {
      x += node.offsetLeft || 0;
      y += node.offsetTop || 0;
      node = node.offsetParent;
    }

    return {
      x,
      y,
      width: element.offsetWidth,
      height: element.offsetHeight
    };
  }

  function computeTargets() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportCenterY = viewportHeight * 0.52;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const isMobile = viewportWidth < 700;

    cards.forEach((card) => {
      if (card.hidden || card.offsetParent === null) return;

      const layout = layoutPosition(card);
      const cardCenterY = layout.y - scrollY + layout.height / 2;
      const cardCenterX = layout.x - scrollX + layout.width / 2;

      const vertical = clamp(
        (cardCenterY - viewportCenterY) / (viewportHeight * .82),
        -1.2,
        1.2
      );
      const horizontal = clamp(
        (cardCenterX / viewportWidth - .5) * 2,
        -1,
        1
      );
      const distance = Math.min(Math.abs(vertical), 1);
      const depthMultiplier = Number(card.dataset.bentoDepth || 1);

      const isImageCard = card.dataset.bentoImageCard === 'true';
      const target = {
        y: vertical * (isMobile ? 7 : 20) * depthMultiplier,
        z: (isMobile ? 12 - distance * 24 : 34 - distance * 74) * depthMultiplier,
        rx: isImageCard ? 0 : vertical * (isMobile ? -1.2 : -4.2) * depthMultiplier,
        ry: isImageCard ? 0 : (isMobile ? 0 : (-horizontal * 2.6 + vertical * horizontal * 1.3)) * depthMultiplier,
        scale: isImageCard
          ? 1
          : (isMobile ? 1 - distance * .008 : 1 - distance * .022)
      };

      let state = states.get(card);
      if (!state) {
        state = {
          current: { ...target },
          target: { ...target }
        };
        states.set(card, state);
      } else {
        state.target = target;
      }
    });

    targetsDirty = false;
  }

  function lerp(current, target, amount) {
    return current + (target - current) * amount;
  }

  function animate() {
    if (targetsDirty) computeTargets();

    let stillMoving = false;

    states.forEach((state, card) => {
      if (card.hidden || card.offsetParent === null) return;

      const c = state.current;
      const t = state.target;
      const smoothing = .13;

      c.y = lerp(c.y, t.y, smoothing);
      c.z = lerp(c.z, t.z, smoothing);
      c.rx = lerp(c.rx, t.rx, smoothing);
      c.ry = lerp(c.ry, t.ry, smoothing);
      c.scale = lerp(c.scale, t.scale, smoothing);

      card.style.setProperty('--bento-y', c.y.toFixed(2) + 'px');
      card.style.setProperty('--bento-z', c.z.toFixed(2) + 'px');
      card.style.setProperty('--bento-rx', c.rx.toFixed(3) + 'deg');
      card.style.setProperty('--bento-ry', c.ry.toFixed(3) + 'deg');
      card.style.setProperty('--bento-scale', c.scale.toFixed(5));

      const delta =
        Math.abs(c.y - t.y) +
        Math.abs(c.z - t.z) +
        Math.abs(c.rx - t.rx) * 4 +
        Math.abs(c.ry - t.ry) * 4 +
        Math.abs(c.scale - t.scale) * 100;

      if (delta > .08) stillMoving = true;
    });

    if (stillMoving || targetsDirty) {
      frameId = window.requestAnimationFrame(animate);
    } else {
      frameId = 0;
    }
  }

  function requestUpdate() {
    targetsDirty = true;
    if (!frameId) frameId = window.requestAnimationFrame(animate);
  }

  requestUpdate();

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  window.addEventListener('orientationchange', requestUpdate, { passive: true });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(requestUpdate);
    cards.forEach(card => resizeObserver.observe(card));
  }
})();

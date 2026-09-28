'use strict';

const drawStylesheet = document.createElement('link');
drawStylesheet.rel = 'stylesheet';
drawStylesheet.href = 'css/draw.css?v=20260929-wheel3d1';
document.head.append(drawStylesheet);

const v2Stylesheet = document.createElement('link');
v2Stylesheet.rel = 'stylesheet';
v2Stylesheet.href = 'css/v2.css?v=20260823-2';
document.head.append(v2Stylesheet);

const shareModule = document.createElement('script');
shareModule.src = 'js/share-result.js?v=20260823-6';
shareModule.defer = true;
document.head.append(shareModule);

const yearTarget = document.querySelector('#current-year');
const drawButton = document.querySelector('#draw-button');
const drawAgainButton = document.querySelector('#draw-again-button');
const drawAnimation = document.querySelector('#draw-animation');
const resultCard = document.querySelector('#result-card');
const resultNumber = document.querySelector('#result-number');
const resultTitle = document.querySelector('#result-title');
const resultDescription = document.querySelector('#result-description');
const resultLove = document.querySelector('#result-love');
const resultStudy = document.querySelector('#result-study');
const resultRelationships = document.querySelector('#result-relationships');
const resultStress = document.querySelector('#result-stress');
const resultMessage = document.querySelector('#result-message');

if (yearTarget) yearTarget.textContent = new Date().getFullYear().toString();

let previousIndex = -1;
let isDrawing = false;
let activeDrawToken = 0;
let drawFallbackTimer = 0;

function updateEligibility() {
  const eligible = !isDrawing;
  if (drawButton) drawButton.disabled = !eligible;
  if (drawAgainButton) drawAgainButton.disabled = !eligible;
}

function getRandomIndex(length) {
  if (length <= 1) return 0;
  let index;

  if (window.crypto && window.crypto.getRandomValues) {
    const randomValue = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(randomValue);
      index = randomValue[0] % length;
    } while (index === previousIndex);
  } else {
    do index = Math.floor(Math.random() * length); while (index === previousIndex);
  }

  return index;
}

function formatSection(text, category) {
  if (typeof text !== 'string') return '';
  const cleaned = text.trim().replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '');
  const prefix = `${category}：`;
  return cleaned.startsWith(prefix) ? cleaned.slice(prefix.length).trim() : cleaned;
}

function setResultContent(target, text, category) {
  if (target) target.textContent = formatSection(text, category);
}

function setDrawingState(active) {
  isDrawing = active;

  if (drawButton) {
    drawButton.textContent = active ? '正在抽取一卦…' : '靜心後，抽一卦';
    drawButton.setAttribute('aria-busy', active.toString());
  }

  if (drawAgainButton) {
    drawAgainButton.textContent = active ? '正在抽取…' : '再抽一卦';
    drawAgainButton.setAttribute('aria-busy', active.toString());
  }

  updateEligibility();
}

function clearDrawFallback() {
  window.clearTimeout(drawFallbackTimer);
  drawFallbackTimer = 0;
}

function revealHexagram(hexagram, token) {
  if (token !== activeDrawToken || !isDrawing) return;

  clearDrawFallback();
  window.Wheel3D?.stop?.();

  resultNumber.textContent = `第 ${hexagram.number} 卦`;
  resultTitle.textContent = hexagram.name;
  setResultContent(resultDescription, hexagram.description, '說明');
  setResultContent(resultLove, hexagram.love, '關於感情');
  setResultContent(resultStudy, hexagram.study, '關於課業');
  setResultContent(resultRelationships, hexagram.relationships, '關於人際');
  setResultContent(resultStress, hexagram.stress, '壓力調適');
  setResultContent(resultMessage, hexagram.message, '給同學的一句話');

  if (drawAnimation) drawAnimation.hidden = true;
  resultCard.hidden = false;
  setDrawingState(false);

  window.requestAnimationFrame(() => {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resultTitle.focus({ preventScroll: true });
  });
}

async function drawHexagram() {
  if (isDrawing || !Array.isArray(window.HEXAGRAMS) || window.HEXAGRAMS.length !== 64) return;

  const index = getRandomIndex(window.HEXAGRAMS.length);
  const hexagram = window.HEXAGRAMS[index];
  const token = ++activeDrawToken;

  setDrawingState(true);
  resultCard.hidden = true;
  previousIndex = index;

  window.StudentSupportStats?.recordDraw(hexagram);

  if (drawAnimation) {
    drawAnimation.hidden = false;
    window.requestAnimationFrame(() => {
      drawAnimation.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    drawFallbackTimer = window.setTimeout(() => revealHexagram(hexagram, token), 900);
    return;
  }

  let started = false;

  try {
    started = window.Wheel3D?.play?.({
      onComplete: () => revealHexagram(hexagram, token)
    }) === true;
  } catch (error) {
    console.warn('3D draw animation failed; using result fallback.', error);
  }

  // Safety fallback: guarantees the result still appears if WebGL/CDN animation fails.
  drawFallbackTimer = window.setTimeout(
    () => revealHexagram(hexagram, token),
    started ? 7500 : 1200
  );
}

if (resultTitle) resultTitle.tabIndex = -1;
drawButton?.addEventListener('click', drawHexagram);
drawAgainButton?.addEventListener('click', drawHexagram);
updateEligibility();

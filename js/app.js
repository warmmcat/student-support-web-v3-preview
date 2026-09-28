'use strict';

const drawStylesheet = document.createElement('link');
drawStylesheet.rel = 'stylesheet';
drawStylesheet.href = 'css/draw.css?v=20260928-wheel2';
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
const drawIntro = document.querySelector('.draw-intro');
const drawNotice = document.querySelector('.draw-notice');

if (yearTarget) yearTarget.textContent = new Date().getFullYear().toString();

let previousIndex = -1;
let isDrawing = false;
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

function revealHexagram(hexagram) {
  resultNumber.textContent = `第 ${hexagram.number} 卦`;
  resultTitle.textContent = hexagram.name;
  setResultContent(resultDescription, hexagram.description, '說明');
  setResultContent(resultLove, hexagram.love, '關於感情');
  setResultContent(resultStudy, hexagram.study, '關於課業');
  setResultContent(resultRelationships, hexagram.relationships, '關於人際');
  setResultContent(resultStress, hexagram.stress, '壓力調適');
  setResultContent(resultMessage, hexagram.message, '給同學的一句話');
  if (drawAnimation) {
    drawAnimation.classList.remove('is-spinning');
    drawAnimation.hidden = true;
  }
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

  setDrawingState(true);
  resultCard.hidden = true;

  previousIndex = index;
  window.StudentSupportStats?.recordDraw(hexagram);
  if (drawAnimation) {
    drawAnimation.hidden = false;
    drawAnimation.classList.remove('is-spinning');
    void drawAnimation.offsetWidth;
    drawAnimation.classList.add('is-spinning');
    window.requestAnimationFrame(() => drawAnimation.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(() => revealHexagram(hexagram), reduceMotion ? 900 : 5000);
}

if (resultTitle) resultTitle.tabIndex = -1;
drawButton?.addEventListener('click', drawHexagram);
drawAgainButton?.addEventListener('click', drawHexagram);
updateEligibility();

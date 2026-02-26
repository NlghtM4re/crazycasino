const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const betAmountInput = document.getElementById('betAmount');
const submitBetBtn = document.getElementById('submitBet');
const takeProfitsBtn = document.getElementById('takeProfits');
const messageBox = document.getElementById('messageBox');
const roundStateEl = document.getElementById('roundState');
const multiplierEl = document.getElementById('currentMultiplier');
const lastCrashesEl = document.getElementById('lastCrashes');

const autoBetToggle = document.getElementById('autoBetToggle');
const autoCashoutToggle = document.getElementById('autoCashoutToggle');
const autoCashoutValue = document.getElementById('autoCashoutValue');

const fairRound = document.getElementById('fairRound');
const fairCommit = document.getElementById('fairCommit');
const fairSeed = document.getElementById('fairSeed');
const fairHash = document.getElementById('fairHash');
const fairCrash = document.getElementById('fairCrash');

let gameState = 'idle';
let betAmount = 0;
let profitsTaken = false;
let cashoutMultiplier = 0;
let payoutAmount = 0;

let currentMultiplier = 1;
let elapsedSeconds = 0;
let curvePoints = [];
let rocketPosition = { x: 0, y: 0 };
let renderWidth = 0;
let renderHeight = 0;
let frameId = null;
let lastTimestamp = 0;
let countdownTimer = null;

let roundCounter = 0;
let currentRound = null;
let crashMultiplier = 1.5;

const HISTORY_LIMIT = 50;
const COUNTDOWN_SECONDS = 3;
const GROWTH_RATE = 0.15;
const INSTANT_CRASH_MODULO = 90;
const MIN_NON_INSTANT_CRASH = 1.1;
const CRASH_UPLIFT = 1.12;

function resizeCanvas() {
  const container = document.getElementById('gameContainer');
  if (!container) return;

  const { width, height } = container.getBoundingClientRect();
  if (!width || !height) return;

  renderWidth = width;
  renderHeight = height;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  drawCurve();
}

function formatCurrency(value) {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function clampBet(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0.01, Number(value.toFixed(2)));
}

function setMessage(text) {
  if (messageBox) messageBox.innerText = text;
}

function setRoundState(text) {
  if (roundStateEl) roundStateEl.innerText = text;
}

function setMultiplierDisplay(multiplier, crashed = false) {
  multiplierEl.innerText = `${multiplier.toFixed(2)}x`;
  multiplierEl.style.color = crashed ? '#f87171' : '#00ffc3';
  multiplierEl.style.textShadow = crashed ? '0 0 10px #f87171' : '0 0 10px #00ffc3';
}

function resetFairnessReveal() {
  fairSeed.textContent = '-';
  fairHash.textContent = '-';
  fairCrash.textContent = '-';
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function generateSeed() {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  return bytesToHex(randomBytes);
}

async function sha256Hex(input) {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(hash);
}

function hashToCrashMultiplier(hashHex) {
  const value = parseInt(hashHex.slice(0, 13), 16);
  const e = 2 ** 52;

  if (value % INSTANT_CRASH_MODULO === 0) {
    return 1.0;
  }

  const baseMultiplier = Math.floor(((100 * e - value) / (e - value))) / 100;
  const adjustedMultiplier = 1 + (baseMultiplier - 1) * CRASH_UPLIFT;
  return Math.max(MIN_NON_INSTANT_CRASH, Math.min(adjustedMultiplier, 500));
}

async function createRoundData() {
  roundCounter += 1;
  const seed = generateSeed();
  const commit = await sha256Hex(seed);
  const resultHash = await sha256Hex(`${seed}:${roundCounter}`);
  const crashPoint = hashToCrashMultiplier(resultHash);

  return {
    id: roundCounter,
    seed,
    commit,
    hash: resultHash,
    crashPoint,
  };
}

function getAutoCashoutTarget() {
  const value = parseFloat(autoCashoutValue.value);
  if (!Number.isFinite(value) || value < 1.01) return 2;
  return value;
}

function getMultiplierByTime(seconds) {
  return Math.max(1, Math.exp(GROWTH_RATE * seconds));
}

function addHistoryEntry(finalCrash, won, amount) {
  const row = document.createElement('div');
  row.classList.add('crash-entry');
  row.style.color = won ? '#4ade80' : '#f87171';

  row.innerHTML = `
    <span>${finalCrash.toFixed(2)}x</span>
    <span>${formatCurrency(betAmount)}</span>
    <span>${won ? `+${formatCurrency(amount)}` : `-${formatCurrency(betAmount)}`}</span>
  `;

  lastCrashesEl.prepend(row);

  while (lastCrashesEl.children.length > HISTORY_LIMIT) {
    lastCrashesEl.removeChild(lastCrashesEl.lastChild);
  }
}

function worldPoint(multiplier, elapsed) {
  const rise = Math.max(0, multiplier - 1);
  return {
    worldX: elapsed * 58,
    worldY: (Math.pow(multiplier, 1.9) - 1) * 42 + rise * 55,
    multiplier,
  };
}

function getViewTransform() {
  const margin = 28;
  const maxX = Math.max(1, curvePoints[curvePoints.length - 1]?.worldX || 1);
  const maxY = Math.max(1, curvePoints[curvePoints.length - 1]?.worldY || 1);

  const scaleX = (renderWidth - margin * 2) / (maxX + 100);
  const scaleY = (renderHeight - margin * 2) / (maxY + 28);

  const scale = Math.min(1, scaleX, scaleY);
  return { margin, scale };
}

function toScreen(point, transform) {
  return {
    x: transform.margin + point.worldX * transform.scale,
    y: renderHeight - transform.margin - point.worldY * transform.scale,
  };
}

function drawGrid() {
  const lines = 10;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  for (let index = 0; index <= lines; index += 1) {
    const x = (renderWidth / lines) * index;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, renderHeight);
    ctx.stroke();

    const y = (renderHeight / lines) * index;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(renderWidth, y);
    ctx.stroke();
  }
}

function drawCurve() {
  if (!renderWidth || !renderHeight) return;

  ctx.clearRect(0, 0, renderWidth, renderHeight);
  drawGrid();

  if (curvePoints.length < 2) return;

  const transform = getViewTransform();
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let index = 1; index < curvePoints.length; index += 1) {
    const prev = toScreen(curvePoints[index - 1], transform);
    const curr = toScreen(curvePoints[index], transform);

    ctx.strokeStyle = curr.y <= prev.y ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }

  const lastPoint = toScreen(curvePoints[curvePoints.length - 1], transform);
  const prevPoint = toScreen(curvePoints[curvePoints.length - 2], transform);

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
  ctx.fill();

  const angle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);
  ctx.save();
  ctx.translate(lastPoint.x, lastPoint.y);
  ctx.rotate(angle + Math.PI / 4);
  ctx.font = '28px Arial';
  ctx.fillText(gameState === 'crashed' ? '💥' : '🚀', 0, -8);
  ctx.restore();

  rocketPosition = lastPoint;
}

function stopLoop() {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
}

function settleRound(crashedAt) {
  gameState = 'crashed';
  stopLoop();

  setMultiplierDisplay(crashedAt, true);

  const won = profitsTaken;
  if (won) {
    setMessage(`Cashed out at ${cashoutMultiplier.toFixed(2)}x (+${formatCurrency(payoutAmount)})`);
  } else {
    setMessage(`Crashed at ${crashedAt.toFixed(2)}x. You lost ${formatCurrency(betAmount)}.`);
  }

  setRoundState('Crashed');
  submitBetBtn.disabled = false;
  takeProfitsBtn.disabled = true;

  fairSeed.textContent = currentRound.seed;
  fairHash.textContent = currentRound.hash;
  fairCrash.textContent = `${currentRound.crashPoint.toFixed(2)}x`;

  addHistoryEntry(crashedAt, won, payoutAmount);
  drawCurve();

  if (autoBetToggle.checked) {
    setTimeout(() => {
      beginRound();
    }, 1200);
  }
}

function tryCashout(isAutomatic = false) {
  if (gameState !== 'running' || profitsTaken) return;

  profitsTaken = true;
  cashoutMultiplier = currentMultiplier;
  payoutAmount = betAmount * cashoutMultiplier;
  updateCredits(payoutAmount);

  takeProfitsBtn.disabled = true;
  setMessage(
    isAutomatic
      ? `Auto cashout at ${cashoutMultiplier.toFixed(2)}x (+${formatCurrency(payoutAmount)})`
      : `Profit taken at ${cashoutMultiplier.toFixed(2)}x (+${formatCurrency(payoutAmount)})`
  );
}

function gameTick(timestamp) {
  if (gameState !== 'running') return;

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;
  elapsedSeconds += dt;

  currentMultiplier = getMultiplierByTime(elapsedSeconds);

  if (autoCashoutToggle.checked && !profitsTaken && currentMultiplier >= getAutoCashoutTarget()) {
    tryCashout(true);
  }

  if (currentMultiplier >= crashMultiplier) {
    currentMultiplier = crashMultiplier;
    curvePoints.push(worldPoint(currentMultiplier, elapsedSeconds));
    drawCurve();
    settleRound(crashMultiplier);
    return;
  }

  curvePoints.push(worldPoint(currentMultiplier, elapsedSeconds));
  setMultiplierDisplay(currentMultiplier, false);
  drawCurve();

  frameId = requestAnimationFrame(gameTick);
}

function startRunningPhase() {
  gameState = 'running';
  setRoundState('Running');
  setMessage('Round live. Cash out before crash!');
  takeProfitsBtn.disabled = false;

  elapsedSeconds = 0;
  lastTimestamp = 0;
  currentMultiplier = 1;
  curvePoints = [worldPoint(1, 0)];
  drawCurve();

  frameId = requestAnimationFrame(gameTick);
}

function beginCountdown() {
  let countdown = COUNTDOWN_SECONDS;
  setRoundState(`Starting in ${countdown}`);

  countdownTimer = setInterval(() => {
    countdown -= 1;
    if (countdown > 0) {
      setRoundState(`Starting in ${countdown}`);
      return;
    }

    clearInterval(countdownTimer);
    countdownTimer = null;
    startRunningPhase();
  }, 1000);
}

async function beginRound() {
  if (gameState === 'countdown' || gameState === 'running') return;

  const requestedBet = clampBet(parseFloat(betAmountInput.value));
  if (!requestedBet) {
    setMessage('Enter a valid bet amount.');
    return;
  }

  if (requestedBet > credits) {
    setMessage('Not enough credits.');
    return;
  }

  updateCredits(-requestedBet);
  betAmount = requestedBet;
  profitsTaken = false;
  cashoutMultiplier = 0;
  payoutAmount = 0;

  gameState = 'countdown';
  submitBetBtn.disabled = true;
  takeProfitsBtn.disabled = true;

  try {
    currentRound = await createRoundData();
  } catch (error) {
    gameState = 'idle';
    submitBetBtn.disabled = false;
    setMessage('Failed to create round seed. Try again.');
    return;
  }

  crashMultiplier = currentRound.crashPoint;

  fairRound.textContent = currentRound.id;
  fairCommit.textContent = currentRound.commit;
  resetFairnessReveal();

  setMultiplierDisplay(1);
  setMessage(`Bet locked: ${formatCurrency(betAmount)}. Good luck!`);
  beginCountdown();
}

function applyQuickBet(add = 0, mult = 1) {
  const current = clampBet(parseFloat(betAmountInput.value)) || 1;
  let next = current;

  if (add) {
    next = current + add;
  }

  if (mult !== 1) {
    next = current * mult;
  }

  betAmountInput.value = clampBet(next).toFixed(2);
}

function setMaxBet() {
  betAmountInput.value = clampBet(Math.floor(credits)).toFixed(2);
}

submitBetBtn.addEventListener('click', beginRound);
takeProfitsBtn.addEventListener('click', () => tryCashout(false));

document.querySelectorAll('.quick-bet-btn').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.betAdd) {
      applyQuickBet(Number(button.dataset.betAdd), 1);
    } else if (button.dataset.betMult) {
      applyQuickBet(0, Number(button.dataset.betMult));
    }
  });
});

document.getElementById('maxBetBtn').addEventListener('click', setMaxBet);

window.addEventListener('resize', resizeCanvas);

document.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  submitBetBtn.disabled = false;
  takeProfitsBtn.disabled = true;
  setMultiplierDisplay(1);
  setRoundState('Waiting');
  setMessage('Ready for next round.');
});
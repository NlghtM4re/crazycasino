const canvas = document.getElementById('plinko-canvas');
const ctx = canvas.getContext('2d');

const boardWrap = document.querySelector('.plinko-board-wrap');
const betInput = document.getElementById('plinko-bet');
const difficultySelect = document.getElementById('plinko-difficulty');
const dropBtn = document.getElementById('plinko-drop');
const statusEl = document.getElementById('plinko-status');
const historyEl = document.getElementById('plinko-history');
const allInBtn = document.getElementById('plinko-allin');
const activeEl = document.getElementById('plinko-active');
const lastTotalEl = document.getElementById('plinko-last-total');
const statDropsEl = document.getElementById('plinko-stat-drops');
const statWageredEl = document.getElementById('plinko-stat-wagered');
const statPaidEl = document.getElementById('plinko-stat-paid');
const statAverageEl = document.getElementById('plinko-stat-average');
const statWinRateEl = document.getElementById('plinko-stat-winrate');
const statNetEl = document.getElementById('plinko-stat-net');

const BALL_RADIUS = 6;
const PEG_RADIUS = 5;
const PEG_COLLISION_MARGIN = 0.15;
const ROWS = 14;
const WIDEST_ROW_PEGS = 16;
const HISTORY_LIMIT = 18;
const PLINKO_DIFFICULTY_KEY = 'plinkoDifficulty';

const PEG_BOUNCE = 0.62;
const WALL_BOUNCE = 0.45;
const GRAVITY = 860;
const AIR_DRAG = 0.992;

const DIFFICULTY_CONFIG = {
  low: {
    label: 'Low Risk',
    multipliers: [2.2, 1.8, 1.45, 1.25, 1.12, 1.02, 0.9, 0.58, 0.58, 0.9, 1.02, 1.12, 1.25, 1.45, 1.8, 2.2],
    spread: 8,
    pegKick: 1.3,
  },
  normal: {
    label: 'Normal',
    multipliers: [5.5, 3.6, 2.5, 1.7, 1.25, 1.05, 0.82, 0.24, 0.24, 0.82, 1.05, 1.25, 1.7, 2.5, 3.6, 5.5],
    spread: 7,
    pegKick: 1,
  },
  high: {
    label: 'High Risk',
    multipliers: [30, 12, 5, 2.4, 1.35, 1.05, 0.62, 0.05, 0.05, 0.62, 1.05, 1.35, 2.4, 5, 12, 30],
    spread: 6,
    pegKick: 0.8,
  },
};

let board = {
  width: 760,
  height: 520,
  left: 42,
  right: 718,
  top: 18,
  bottom: 500,
  rowGap: 32,
  colGap: 40,
  slotHeight: 50,
};

let pegs = [];
let bins = [];
let balls = [];
let currentDifficulty = 'normal';
let lastPayout = 0;
let running = false;
let lastTs = 0;
let sessionDrops = 0;
let sessionWagered = 0;
let sessionPaid = 0;
let sessionWins = 0;

function toCurrency(value) {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateHud() {
  activeEl.textContent = String(balls.length);
  lastTotalEl.textContent = toCurrency(lastPayout);
  difficultySelect.disabled = balls.length > 0;
}

function updateStatsPanel() {
  const averageGain = sessionDrops > 0 ? sessionPaid / sessionDrops : 0;
  const winRate = sessionDrops > 0 ? sessionWins / sessionDrops : 0;
  const net = sessionPaid - sessionWagered;

  statDropsEl.textContent = String(sessionDrops);
  statWageredEl.textContent = toCurrency(sessionWagered);
  statPaidEl.textContent = toCurrency(sessionPaid);
  statAverageEl.textContent = toCurrency(averageGain);
  statWinRateEl.textContent = `${Math.round(winRate * 100)}%`;
  statNetEl.textContent = `${net >= 0 ? '+' : '-'}${toCurrency(Math.abs(net))}`;
}

function getDifficultyConfig() {
  return DIFFICULTY_CONFIG[currentDifficulty] ?? DIFFICULTY_CONFIG.normal;
}

function getScaledMultipliers(source, targetLength) {
  if (!Array.isArray(source) || source.length === 0 || targetLength <= 0) {
    return [];
  }

  if (source.length === targetLength) {
    return [...source];
  }

  if (targetLength === 1) {
    return [source[Math.floor(source.length / 2)] ?? source[0]];
  }

  const scaled = [];
  const sourceLast = source.length - 1;

  for (let index = 0; index < targetLength; index += 1) {
    const position = (index / (targetLength - 1)) * sourceLast;
    const left = Math.floor(position);
    const right = Math.min(sourceLast, left + 1);
    const t = position - left;
    const leftValue = source[left] ?? source[0];
    const rightValue = source[right] ?? source[sourceLast];
    scaled.push(Number((leftValue + (rightValue - leftValue) * t).toFixed(2)));
  }

  return scaled;
}

function buildBinomialProbabilities(slotCount) {
  const n = Math.max(1, slotCount - 1);
  const probabilities = [];
  let coefficient = 1;

  for (let k = 0; k <= n; k += 1) {
    if (k > 0) {
      coefficient = (coefficient * (n - (k - 1))) / k;
    }
    probabilities.push(coefficient / (2 ** n));
  }

  return probabilities;
}

function getDifficultyStats(config) {
  const slotCount = WIDEST_ROW_PEGS + 1;
  const multipliers = getScaledMultipliers(config.multipliers ?? [], slotCount);
  const probabilities = buildBinomialProbabilities(slotCount);

  let expectedReturn = 0;
  let profitChance = 0;

  for (let index = 0; index < multipliers.length; index += 1) {
    const multiplier = multipliers[index] ?? 0;
    const probability = probabilities[index] ?? 0;
    expectedReturn += multiplier * probability;
    if (multiplier > 1) {
      profitChance += probability;
    }
  }

  return {
    expectedReturn,
    profitChance,
  };
}

function resizeCanvas() {
  const rect = boardWrap.getBoundingClientRect();
  if (!rect.width) return;

  const maxWidth = Math.min(900, Math.max(520, rect.width));
  const ratioWH = 520 / 760;
  const cssWidth = maxWidth;
  const cssHeight = Math.round(cssWidth * ratioWH);

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  board.width = cssWidth;
  board.height = cssHeight;
  board.left = 34;
  board.right = cssWidth - 34;
  board.top = 14;
  board.bottom = cssHeight - 26;
  board.slotHeight = 50;

  const rowsAreaHeight = (board.bottom - board.top) - board.slotHeight - 8;
  board.rowGap = rowsAreaHeight / (ROWS + 1);

  const maxCount = WIDEST_ROW_PEGS;
  board.colGap = (board.right - board.left) / (maxCount + 1);

  buildTriangle();
  draw();
}

function buildTriangle() {
  pegs = [];
  bins = [];

  for (let row = 0; row < ROWS; row += 1) {
    const count = Math.min(WIDEST_ROW_PEGS, 3 + row);
    const y = board.top + (row + 1) * board.rowGap;
    const startX = (board.left + board.right) / 2 - ((count - 1) * board.colGap) / 2;

    for (let index = 0; index < count; index += 1) {
      pegs.push({
        row,
        x: startX + index * board.colGap,
        y,
        r: PEG_RADIUS,
      });
    }
  }

  const slots = WIDEST_ROW_PEGS + 1;
  const slotW = (board.right - board.left) / slots;
  const by = board.bottom - board.slotHeight;
  const config = getDifficultyConfig();
  const multipliers = getScaledMultipliers(config.multipliers ?? [], slots);

  for (let index = 0; index < slots; index += 1) {
    bins.push({
      index,
      x: board.left + index * slotW,
      y: by,
      w: slotW,
      h: board.slotHeight,
      multiplier: multipliers[index] ?? 1,
    });
  }
}

function drawBackgroundGrid() {
  ctx.fillStyle = '#171627';
  ctx.fillRect(0, 0, board.width, board.height);
}

function drawBins() {
  const maxMultiplier = Math.max(...bins.map(bin => bin.multiplier));

  for (const bin of bins) {
    const hot = bin.multiplier >= Math.max(4, maxMultiplier * 0.45);
    const medium = bin.multiplier >= 1 && !hot;

    ctx.fillStyle = hot
      ? 'rgba(37, 99, 235, 0.45)'
      : medium
        ? 'rgba(59, 130, 246, 0.35)'
        : 'rgba(96, 165, 250, 0.28)';
    ctx.strokeStyle = hot ? '#1d4ed8' : medium ? '#2563eb' : '#3b82f6';
    ctx.lineWidth = 1.4;

    const insetX = 1.6;
    const insetY = 2;
    const boxX = bin.x + insetX;
    const boxY = bin.y + insetY;
    const boxW = Math.max(4, bin.w - insetX * 2);
    const boxH = Math.max(4, bin.h - insetY * 2);
    const radius = Math.min(8, boxH * 0.42);

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, radius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dbeafe';
    ctx.font = `bold ${Math.max(9, Math.min(11, Math.floor(bin.w * 0.24)))}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = Number.isInteger(bin.multiplier)
      ? `${bin.multiplier}x`
      : `${bin.multiplier.toFixed(1)}x`;
    ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2);
  }
}

function drawPegs() {
  ctx.fillStyle = '#94a3b8';
  for (const peg of pegs) {
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBalls() {
  for (const ball of balls) {
    ctx.beginPath();
    ctx.fillStyle = '#22d3ee';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.arc(ball.x - 2.5, ball.y - 2.5, ball.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  drawBackgroundGrid();
  drawBins();
  drawPegs();
  drawBalls();
}

function randomSpawnX() {
  const topRow = pegs.filter(peg => peg.row === 0);
  if (topRow.length >= 3) {
    const left = topRow[0].x;
    const right = topRow[2].x;
    return left + Math.random() * (right - left);
  }

  const center = (board.left + board.right) / 2;
  return center + (Math.random() - 0.5) * getDifficultyConfig().spread;
}

function spawnBall(bet) {
  balls.push({
    x: randomSpawnX(),
    y: board.top - 6,
    vx: (Math.random() - 0.5) * 35,
    vy: 0,
    r: BALL_RADIUS,
    bet,
  });
}

function resolvePegCollision(ball, peg) {
  const dx = ball.x - peg.x;
  const dy = ball.y - peg.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.r + peg.r + PEG_COLLISION_MARGIN;

  if (dist >= minDist || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  const overlap = minDist - dist;
  ball.x += nx * (overlap + 0.45);
  ball.y += ny * (overlap + 0.45);

  const dot = ball.vx * nx + ball.vy * ny;
  ball.vx = (ball.vx - 2 * dot * nx) * PEG_BOUNCE;
  ball.vy = (ball.vy - 2 * dot * ny) * PEG_BOUNCE;

  const lateralKick = getDifficultyConfig().pegKick;

  ball.vx += (Math.random() - 0.5) * lateralKick;
  ball.vy = Math.max(ball.vy * 0.96, 16);
}

function settleBallInBin(ball) {
  const bin = bins.find(slot => ball.x >= slot.x && ball.x <= slot.x + slot.w);
  if (!bin) return false;

  const payout = Number((ball.bet * bin.multiplier).toFixed(2));
  updateCredits(payout);
  lastPayout = payout;
  sessionPaid += payout;
  if (payout > ball.bet) {
    sessionWins += 1;
  }

  const row = document.createElement('div');
  row.className = 'win-entry';
  row.textContent = `${bin.multiplier}x • Bet ${toCurrency(ball.bet)} • +${toCurrency(payout)}`;
  historyEl.prepend(row);

  while (historyEl.children.length > HISTORY_LIMIT) {
    historyEl.removeChild(historyEl.lastChild);
  }

  updateStatsPanel();

  return true;
}

function updateBalls(dt) {
  const remaining = [];

  for (const ball of balls) {
    const speed = Math.hypot(ball.vx, ball.vy);
    const subSteps = Math.max(1, Math.min(5, Math.ceil((speed * dt) / 4)));
    const stepDt = dt / subSteps;

    for (let step = 0; step < subSteps; step += 1) {
      ball.vy += GRAVITY * stepDt;
      ball.vx *= AIR_DRAG;
      ball.vy *= AIR_DRAG;

      ball.vx = Math.max(-220, Math.min(220, ball.vx));

      ball.x += ball.vx * stepDt;
      ball.y += ball.vy * stepDt;

      if (ball.x - ball.r < board.left) {
        ball.x = board.left + ball.r;
        ball.vx = Math.abs(ball.vx) * WALL_BOUNCE;
      }
      if (ball.x + ball.r > board.right) {
        ball.x = board.right - ball.r;
        ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE;
      }

      for (let pegIndex = 0; pegIndex < pegs.length; pegIndex += 1) {
        resolvePegCollision(ball, pegs[pegIndex]);
      }
    }

    if (ball.y + ball.r >= bins[0].y) {
      if (!settleBallInBin(ball)) {
        remaining.push(ball);
      }
      continue;
    }

    if (ball.y - ball.r > board.height + 10) {
      continue;
    }

    remaining.push(ball);
  }

  balls = remaining;
}

function gameLoop(timestamp) {
  if (!running) return;

  if (!lastTs) {
    lastTs = timestamp;
  }

  const dt = Math.min(0.033, (timestamp - lastTs) / 1000);
  lastTs = timestamp;

  updateBalls(dt);
  updateHud();
  draw();

  requestAnimationFrame(gameLoop);
}

function startLoop() {
  if (running) return;
  running = true;
  requestAnimationFrame(gameLoop);
}

function getValidatedBet() {
  const bet = Number(parseFloat(betInput.value).toFixed(2));
  if (!Number.isFinite(bet) || bet <= 0) {
    showPopup('Enter a valid bet amount.');
    return null;
  }

  if (bet > credits) {
    showPopup('Not enough credits for this drop.');
    return null;
  }

  return bet;
}

function dropSingleBall() {
  const bet = getValidatedBet();
  if (!bet) return;

  updateCredits(-bet);
  sessionDrops += 1;
  sessionWagered += bet;
  spawnBall(bet);
  setStatus(`Dropped 1 ball • ${getDifficultyConfig().label}`);
  updateHud();
  updateStatsPanel();
}

function setDifficulty(value, persist = true) {
  if (balls.length > 0) {
    difficultySelect.value = currentDifficulty;
    showPopup('You can change difficulty only when all balls have landed.');
    return;
  }

  if (!DIFFICULTY_CONFIG[value]) {
    return;
  }

  currentDifficulty = value;
  difficultySelect.value = value;
  buildTriangle();
  draw();
  setStatus(`Difficulty: ${getDifficultyConfig().label}`);
  updateStatsPanel();

  if (persist) {
    localStorage.setItem(PLINKO_DIFFICULTY_KEY, value);
  }
}

function setQuickBet(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return;
  betInput.value = next.toFixed(2);
}

document.querySelectorAll('.plinko-quick-bets button[data-bet]').forEach(button => {
  button.addEventListener('click', () => setQuickBet(button.dataset.bet));
});

allInBtn.addEventListener('click', () => {
  setQuickBet(Math.max(0.01, Number(credits.toFixed(2))));
});

difficultySelect.addEventListener('change', () => {
  setDifficulty(difficultySelect.value);
});

dropBtn.addEventListener('click', dropSingleBall);

window.addEventListener('resize', resizeCanvas);

document.addEventListener('DOMContentLoaded', () => {
  const savedDifficulty = localStorage.getItem(PLINKO_DIFFICULTY_KEY);
  if (savedDifficulty && DIFFICULTY_CONFIG[savedDifficulty]) {
    currentDifficulty = savedDifficulty;
  }
  difficultySelect.value = currentDifficulty;

  resizeCanvas();
  startLoop();
  updateHud();
  setDifficulty(currentDifficulty, false);
  updateStatsPanel();
});

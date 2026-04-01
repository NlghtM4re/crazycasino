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
const PLINKO_DECISIONS = ROWS;

const PEG_BOUNCE = 0.62;
const WALL_BOUNCE = 0.45;
const GRAVITY = 860;
const AIR_DRAG = 0.992;
const PEG_RECOIL_STIFFNESS = 120;
const PEG_RECOIL_DAMPING = 18;
const PEG_RECOIL_MAX_OFFSET = 2.2;
const PEG_RECOIL_MAX_VELOCITY = 32;

const SLOT_COUNT = WIDEST_ROW_PEGS + 1;
const DEFAULT_PLINKO_RTP = 0.95;

function buildActualLandingProbabilities(slotCount, decisionCount) {
  const probabilities = Array.from({ length: slotCount }, () => 0);
  const outcomes = decisionCount + 1;
  const offset = Math.floor((slotCount - outcomes) / 2);
  const n = Math.max(1, decisionCount);

  let coefficient = 1;
  for (let k = 0; k <= n; k += 1) {
    if (k > 0) {
      coefficient = (coefficient * (n - (k - 1))) / k;
    }
    const index = offset + k;
    if (index >= 0 && index < slotCount) {
      probabilities[index] = coefficient / (2 ** n);
    }
  }

  return probabilities;
}

function createRtpCalibratedMultipliers(minMultiplier, maxMultiplier, targetRtp = DEFAULT_PLINKO_RTP) {
  const probabilities = buildActualLandingProbabilities(SLOT_COUNT, PLINKO_DECISIONS);
  const clampedMin = Math.max(0.01, minMultiplier);
  const clampedMax = Math.max(clampedMin + 0.01, maxMultiplier);
  const center = (SLOT_COUNT - 1) / 2;
  const EXP_CURVE_STRENGTH = 3.6;

  function expNormalized(t) {
    const safeT = Math.max(0, Math.min(1, t));
    const numerator = Math.exp(EXP_CURVE_STRENGTH * safeT) - 1;
    const denominator = Math.exp(EXP_CURVE_STRENGTH) - 1;
    return denominator > 0 ? (numerator / denominator) : safeT;
  }

  function buildForGamma(gamma) {
    return Array.from({ length: SLOT_COUNT }, (_, index) => {
      const distance = Math.abs(index - center) / Math.max(1, center);
      const shaped = Math.pow(expNormalized(distance), gamma);
      return clampedMin + ((clampedMax - clampedMin) * shaped);
    });
  }

  function expectedFor(values) {
    return values.reduce((sum, multiplier, index) => sum + (multiplier * probabilities[index]), 0);
  }

  let lowGamma = 0.2;
  let highGamma = 4.5;
  let candidate = buildForGamma(1);

  for (let step = 0; step < 48; step += 1) {
    const midGamma = (lowGamma + highGamma) / 2;
    candidate = buildForGamma(midGamma);
    const expected = expectedFor(candidate);

    if (expected > targetRtp) {
      lowGamma = midGamma;
    } else {
      highGamma = midGamma;
    }
  }

  const strict = candidate.map(value => Number(value.toFixed(2)));
  const centerIndex = Math.floor(center);
  strict[centerIndex] = Number(clampedMin.toFixed(2));

  for (let step = 1; step <= centerIndex; step += 1) {
    const minDelta = Number((0.01 * Math.pow(1.24, step - 1)).toFixed(3));
    const leftIndex = centerIndex - step;
    const rightIndex = centerIndex + step;

    strict[leftIndex] = Math.max(strict[leftIndex], Number((strict[leftIndex + 1] + minDelta).toFixed(2)));
    strict[rightIndex] = Math.max(strict[rightIndex], Number((strict[rightIndex - 1] + minDelta).toFixed(2)));
  }

  strict[0] = Number(clampedMax.toFixed(0));
  strict[SLOT_COUNT - 1] = Number(clampedMax.toFixed(0));

  return strict;
}

const DIFFICULTY_CONFIG = {
  low: {
    label: 'Low Risk',
    multipliers: createRtpCalibratedMultipliers(0.58, 120, 0.99),
    spread: 8,
    pegKick: 1.3,
  },
  normal: {
    label: 'Normal',
    multipliers: createRtpCalibratedMultipliers(0.34, 320, 0.95),
    spread: 7,
    pegKick: 1,
  },
  high: {
    label: 'High Risk',
    multipliers: createRtpCalibratedMultipliers(0.2, 900, 0.9),
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

function easeInOutQuad(t) {
  if (t < 0.5) {
    return 2 * t * t;
  }
  return 1 - ((-2 * t + 2) ** 2) / 2;
}

function easeInCubic(t) {
  return t * t * t;
}

function easeInQuart(t) {
  return t * t * t * t;
}

function easeOutCubic(t) {
  return 1 - ((1 - t) ** 3);
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function getBinCenterX(index) {
  const bin = bins[index];
  if (!bin) {
    return (board.left + board.right) / 2;
  }
  return bin.x + bin.w / 2;
}

function getPegRows() {
  const rows = [];

  for (const peg of pegs) {
    if (!rows[peg.row]) {
      rows[peg.row] = [];
    }
    rows[peg.row].push(peg);
  }

  rows.forEach(row => row.sort((left, right) => left.x - right.x));
  return rows.filter(Boolean);
}

function getNearestPeg(rowPegs, x) {
  if (!rowPegs || rowPegs.length === 0) {
    return null;
  }

  let nearest = rowPegs[0];
  let nearestDistance = Math.abs(rowPegs[0].x - x);

  for (let index = 1; index < rowPegs.length; index += 1) {
    const distance = Math.abs(rowPegs[index].x - x);
    if (distance < nearestDistance) {
      nearest = rowPegs[index];
      nearestDistance = distance;
    }
  }

  return nearest;
}

function getPegIndexInRow(rowPegs, peg) {
  return rowPegs.indexOf(peg);
}

function pointOnPeg(peg, angle, radius) {
  return {
    x: peg.x + (Math.cos(angle) * radius),
    y: peg.y + (Math.sin(angle) * radius),
  };
}

function createBallisticSegment(from, to, duration, gravity, hitPeg = null, impactStrength = 0) {
  const safeGravity = Math.max(1, gravity);
  const dy = to.y - from.y;
  const requestedDuration = Math.max(0.01, duration);

  // Keep post-contact motion physically downward: never launch upward from a peg.
  let safeDuration = requestedDuration;
  if (dy > 0) {
    const maxNoLiftDuration = Math.sqrt((2 * dy) / safeGravity) * 0.98;
    if (Number.isFinite(maxNoLiftDuration) && maxNoLiftDuration > 0.01) {
      safeDuration = Math.min(safeDuration, maxNoLiftDuration);
    }
  }

  const computedVy = (dy - (0.5 * safeGravity * safeDuration * safeDuration)) / safeDuration;

  return {
    type: 'fall',
    from,
    to,
    duration: safeDuration,
    gravity: safeGravity,
    vx: (to.x - from.x) / safeDuration,
    vy: Math.max(0, computedVy),
    hitPeg,
    impactStrength,
  };
}

function triggerPegRecoil(peg, impactStrength = 1) {
  if (!peg) return;

  const clampedStrength = Math.max(0.2, Math.min(1.2, impactStrength));
  const nextVelocity = (peg.recoilVelocity || 0) + (10 * clampedStrength);
  peg.recoilVelocity = Math.min(PEG_RECOIL_MAX_VELOCITY, nextVelocity);
}

function updatePegRecoils(dt) {
  for (const peg of pegs) {
    const offset = peg.recoilOffset || 0;
    const velocity = peg.recoilVelocity || 0;
    const acceleration = (-PEG_RECOIL_STIFFNESS * offset) - (PEG_RECOIL_DAMPING * velocity);
    const nextVelocity = velocity + (acceleration * dt);
    const nextOffset = offset + (nextVelocity * dt);

    peg.recoilVelocity = nextVelocity;
    peg.recoilOffset = Math.max(-0.35, Math.min(PEG_RECOIL_MAX_OFFSET, nextOffset));

    if (Math.abs(peg.recoilOffset) < 0.01 && Math.abs(peg.recoilVelocity) < 0.05) {
      peg.recoilOffset = 0;
      peg.recoilVelocity = 0;
    }
  }
}

function buildGuidedPath() {
  const pegRows = getPegRows();
  const contactRadius = PEG_RADIUS + BALL_RADIUS + PEG_COLLISION_MARGIN + 0.35;
  const segments = [];
  const topRow = pegRows[0] ?? [];
  const centerPeg = topRow[Math.floor(topRow.length / 2)] ?? null;

  if (!centerPeg || bins.length === 0) {
    return {
      segments: [],
      targetBinIndex: Math.floor(bins.length / 2),
    };
  }

  let currentPeg = centerPeg;
  let currentPoint = {
    x: currentPeg.x,
    y: board.top - Math.max(12, board.rowGap * 0.95),
  };

  const firstContact = {
    x: currentPeg.x,
    y: currentPeg.y - contactRadius,
  };

  segments.push(createBallisticSegment(currentPoint, firstContact, 0.38, 1080, currentPeg, 0.75));
  currentPoint = firstContact;

  for (let row = 0; row < pegRows.length; row += 1) {
    const currentRow = pegRows[row] ?? [];
    const currentIndex = getPegIndexInRow(currentRow, currentPeg);
    if (currentIndex < 0) {
      break;
    }

    const goesRight = Math.random() < 0.5;
    const direction = goesRight ? 1 : -1;
    const pushOffsetX = direction * Math.max(6, board.colGap * 0.14);
    const pushDropY = Math.max(6, board.rowGap * 0.16);
    const releasePoint = {
      x: currentPeg.x + pushOffsetX,
      y: currentPeg.y - contactRadius + pushDropY,
    };

    segments.push(createBallisticSegment(currentPoint, releasePoint, 0.12, 820));
    currentPoint = releasePoint;

    if (row === pegRows.length - 1) {
      const targetBinIndex = Math.max(0, Math.min(bins.length - 1, currentIndex + (goesRight ? 1 : 0)));
      const finalPoint = {
        x: getBinCenterX(targetBinIndex),
        y: bins[targetBinIndex].y + Math.max(8, board.slotHeight * 0.48),
      };

      segments.push(createBallisticSegment(currentPoint, finalPoint, 0.34, 1160));

      return {
        segments,
        targetBinIndex,
      };
    }

    const nextRow = pegRows[row + 1] ?? [];
    const nextIndex = Math.max(0, Math.min(nextRow.length - 1, currentIndex + (goesRight ? 1 : 0)));
    const nextPeg = nextRow[nextIndex];
    const nextContact = {
      x: nextPeg.x,
      y: nextPeg.y - contactRadius,
    };
    const verticalDistance = Math.max(12, nextContact.y - currentPoint.y);
    const duration = 0.28 + Math.min(0.08, verticalDistance / 180) + (row * 0.004);
    const gravity = 1120 + (row * 18);

    segments.push(createBallisticSegment(currentPoint, nextContact, duration, gravity, nextPeg, 0.58));

    currentPeg = nextPeg;
    currentPoint = nextContact;
  }

  return {
    segments,
    targetBinIndex: Math.floor(bins.length / 2),
  };
}

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
  const probabilities = buildActualLandingProbabilities(slotCount, PLINKO_DECISIONS);

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
  const pegsByRow = [];

  for (let row = 0; row < ROWS; row += 1) {
    const count = Math.min(WIDEST_ROW_PEGS, 3 + row);
    const y = board.top + (row + 1) * board.rowGap;
    const startX = (board.left + board.right) / 2 - ((count - 1) * board.colGap) / 2;
    const rowPegs = [];

    for (let index = 0; index < count; index += 1) {
      const peg = {
        row,
        x: startX + index * board.colGap,
        y,
        r: PEG_RADIUS,
        recoilOffset: 0,
        recoilVelocity: 0,
      };
      pegs.push(peg);
      rowPegs.push(peg);
    }

    pegsByRow.push(rowPegs);
  }

  const slots = WIDEST_ROW_PEGS + 1;
  const bottomRowPegs = pegsByRow[pegsByRow.length - 1] ?? [];
  const fallbackLeft = board.left;
  const fallbackRight = board.right;
  const slotLeft = bottomRowPegs.length >= 2
    ? bottomRowPegs[0].x - board.colGap / 2
    : fallbackLeft;
  const slotRight = bottomRowPegs.length >= 2
    ? bottomRowPegs[bottomRowPegs.length - 1].x + board.colGap / 2
    : fallbackRight;
  const slotW = (slotRight - slotLeft) / slots;
  const by = board.bottom - board.slotHeight;
  const config = getDifficultyConfig();
  const multipliers = getScaledMultipliers(config.multipliers ?? [], slots);

  for (let index = 0; index < slots; index += 1) {
    bins.push({
      index,
      x: slotLeft + index * slotW,
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
    ctx.arc(peg.x, peg.y + (peg.recoilOffset || 0), peg.r, 0, Math.PI * 2);
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
  if (topRow.length > 0) {
    const centerPeg = topRow[Math.floor(topRow.length / 2)];
    return centerPeg.x;
  }

  return (board.left + board.right) / 2;
}

function spawnBall(bet) {
  const guided = buildGuidedPath();
  const start = guided.segments[0]?.from ?? { x: randomSpawnX(), y: board.top - 10 };

  balls.push({
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    r: BALL_RADIUS,
    bet,
    segments: guided.segments,
    segmentIndex: 0,
    segmentT: 0,
    targetBinIndex: guided.targetBinIndex,
    timeAlive: 0,
    wobblePhase: Math.random() * Math.PI * 2,
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
  const bin = Number.isInteger(ball.targetBinIndex)
    ? bins[ball.targetBinIndex]
    : bins.find(slot => ball.x >= slot.x && ball.x <= slot.x + slot.w);
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
    if (!ball.segments || ball.segments.length === 0) {
      remaining.push(ball);
      continue;
    }

    ball.timeAlive += dt;
    let timeLeft = dt;

    while (timeLeft > 0 && ball.segmentIndex < ball.segments.length) {
      const segment = ball.segments[ball.segmentIndex] ?? { type: 'fall', duration: 0.1 };
      const segDuration = segment.duration ?? 0.1;
      const remainingSegTime = (1 - ball.segmentT) * segDuration;
      const stepTime = Math.min(timeLeft, remainingSegTime);

      ball.segmentT += stepTime / segDuration;
      timeLeft -= stepTime;

      if (ball.segmentT >= 1) {
        if (segment.hitPeg) {
          triggerPegRecoil(segment.hitPeg, segment.impactStrength);
        }
        ball.segmentIndex += 1;
        ball.segmentT = 0;
      }
    }

    if (ball.segmentIndex >= ball.segments.length) {
      const landed = settleBallInBin(ball);
      if (!landed) {
        remaining.push(ball);
      }
      continue;
    }

    const segment = ball.segments[ball.segmentIndex] ?? { type: 'fall' };
    const rawT = Math.max(0, Math.min(1, ball.segmentT));
    let baseX = 0;
    let baseY = 0;

    const elapsed = rawT * (segment.duration ?? 0.1);
    baseX = segment.from.x + (segment.vx * elapsed);
    baseY = segment.from.y + (segment.vy * elapsed) + (0.5 * segment.gravity * elapsed * elapsed);

    const wobbleScale = 0;
    const wobble = wobbleScale > 0
      ? Math.sin(ball.timeAlive * 9 + ball.wobblePhase) * wobbleScale
      : 0;
    const settleDip = 0;

    ball.x = baseX + wobble;
    ball.y = baseY + settleDip;
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
  updatePegRecoils(dt);
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

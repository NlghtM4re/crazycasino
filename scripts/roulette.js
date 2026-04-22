const ROULETTE_ORDER = [
  "0", "28", "9", "26", "30", "11", "7", "20", "32", "17", "5", "22", "34",
  "15", "3", "24", "36", "13", "1", "00", "27", "10", "25", "29", "12", "8",
  "19", "31", "18", "6", "21", "33", "16", "4", "23", "35", "14", "2",
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const BET_DEFINITIONS = {
  red: { label: "Red", multiplier: 1 },
  black: { label: "Black", multiplier: 1 },
  odd: { label: "Odd", multiplier: 1 },
  even: { label: "Even", multiplier: 1 },
  low: { label: "1-18", multiplier: 1 },
  high: { label: "19-36", multiplier: 1 },
  dozen1: { label: "1st 12", multiplier: 2 },
  dozen2: { label: "2nd 12", multiplier: 2 },
  dozen3: { label: "3rd 12", multiplier: 2 },
  column1: { label: "Column 1", multiplier: 2 },
  column2: { label: "Column 2", multiplier: 2 },
  column3: { label: "Column 3", multiplier: 2 },
  straight: { label: "Number", multiplier: 35 },
};

const wheelCanvas = document.getElementById("roulette-wheel");
const wheelCtx = wheelCanvas.getContext("2d");
const wheelWrapEl = document.querySelector(".roulette-wheel-wrap");
const betInput = document.getElementById("roulette-bet");
const spinButton = document.getElementById("roulette-spin");
const statusEl = document.getElementById("roulette-status");
const selectionEl = document.getElementById("roulette-selection");
const lastResultEl = document.getElementById("roulette-last-result");
const tableEl = document.getElementById("roulette-table");
const straightGridEl = document.getElementById("roulette-straight-grid");
const historyEl = document.getElementById("roulette-history");
const allInButton = document.getElementById("roulette-allin");
const clearBetsButton = document.getElementById("roulette-clear-bets");
const betsTotalEl = document.getElementById("roulette-bets-total");

const statSpinsEl = document.getElementById("roulette-stat-spins");
const statWageredEl = document.getElementById("roulette-stat-wagered");
const statReturnedEl = document.getElementById("roulette-stat-returned");
const statNetEl = document.getElementById("roulette-stat-net");

let selectedBets = [];
let wheelAngle = 0;
let isSpinning = false;
let stats = {
  spins: 0,
  wagered: 0,
  returned: 0,
};

function resizeWheelCanvas() {
  if (!wheelWrapEl) return;

  const bounds = wheelWrapEl.getBoundingClientRect();
  const size = Math.max(220, Math.floor(Math.min(bounds.width, bounds.height)));
  const ratio = window.devicePixelRatio || 1;
  const internalSize = Math.max(220, Math.floor(size * ratio));

  if (wheelCanvas.width === internalSize && wheelCanvas.height === internalSize) {
    return;
  }

  wheelCanvas.width = internalSize;
  wheelCanvas.height = internalSize;
  drawWheel(wheelAngle);
}

function formatCurrency(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toNumeric(number) {
  if (number === "00") return null;
  const parsed = Number(number);
  return Number.isInteger(parsed) ? parsed : null;
}

function getNumberColor(number) {
  if (number === "0" || number === "00" || number === 0) return "green";
  const numeric = toNumeric(number);
  if (!numeric) return "green";
  return RED_NUMBERS.has(numeric) ? "red" : "black";
}

function getBetKey(bet) {
  return `${bet.type}:${bet.payload ?? ""}`;
}

function getBetLabel(bet) {
  const definition = BET_DEFINITIONS[bet.type];
  if (!definition) return "Unknown";

  if (bet.type === "straight") {
    return `Number ${bet.payload}`;
  }

  return definition.label;
}

function updateTotalDisplay() {
  const total = selectedBets.reduce((sum, bet) => sum + bet.amount, 0);
  betsTotalEl.textContent = `$${formatCurrency(total)}`;
}

function updateSelectionDisplay() {
  selectionEl.innerHTML = "";

  if (selectedBets.length === 0) {
    const empty = document.createElement("span");
    empty.className = "roulette-no-bets";
    empty.textContent = "No bets placed. Select a zone on the table.";
    selectionEl.appendChild(empty);
    betsTotalEl.textContent = "$0.00";
    return;
  }

  selectedBets.forEach((bet, index) => {
    const row = document.createElement("div");
    row.className = "roulette-bet-row";

    const label = document.createElement("span");
    label.className = "roulette-bet-row-label";
    label.textContent = getBetLabel(bet);

    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.className = "roulette-bet-row-amount";
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.value = bet.amount.toFixed(2);
    amountInput.addEventListener("change", () => {
      const val = parseFloat(amountInput.value);
      if (Number.isFinite(val) && val > 0) {
        selectedBets[index].amount = val;
        updateTotalDisplay();
      } else {
        amountInput.value = selectedBets[index].amount.toFixed(2);
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "roulette-bet-row-remove";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      selectedBets.splice(index, 1);
      syncActiveButtons();
      updateSelectionDisplay();
    });

    row.appendChild(label);
    row.appendChild(amountInput);
    row.appendChild(removeBtn);
    selectionEl.appendChild(row);
  });

  updateTotalDisplay();
}

function setSelectedBet(type, payload = null) {
  const bet = { type, payload };
  const key = getBetKey(bet);
  const existingIndex = selectedBets.findIndex((item) => getBetKey(item) === key);

  if (existingIndex >= 0) {
    selectedBets.splice(existingIndex, 1);
  } else {
    const amount = parseFloat(betInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      showPopup("Enter a valid bet amount before selecting a bet.");
      return;
    }
    selectedBets.push({ type, payload, amount });
  }

  updateSelectionDisplay();
}

function clearSelections() {
  selectedBets = [];
  syncActiveButtons();
  updateSelectionDisplay();
}

function syncActiveButtons() {
  const selected = new Set(selectedBets.map(getBetKey));

  tableEl.querySelectorAll("button[data-type]").forEach((button) => {
    const key = `${button.dataset.type}:${button.dataset.payload ?? ""}`;
    button.classList.toggle("active", selected.has(key));
  });
}

function createBetButton({ label, type, payload = null, className = "roulette-bet-btn" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.type = type;
  if (payload !== null) {
    button.dataset.payload = String(payload);
  }

  return button;
}

function createStraightGrid() {
  const zeroColumn = document.createElement("div");
  zeroColumn.className = "roulette-zero-column";
  zeroColumn.appendChild(createBetButton({
    label: "00",
    type: "straight",
    payload: "00",
    className: "roulette-bet-btn roulette-number-green",
  }));
  zeroColumn.appendChild(createBetButton({
    label: "0",
    type: "straight",
    payload: "0",
    className: "roulette-bet-btn roulette-number-green",
  }));

  const rowsWrap = document.createElement("div");
  rowsWrap.className = "roulette-rows";

  const rowStarts = [3, 2, 1];
  rowStarts.forEach((start) => {
    const row = document.createElement("div");
    row.className = "roulette-row";

    for (let number = start; number <= 36; number += 3) {
      const colorClass = getNumberColor(String(number)) === "red"
        ? "roulette-number-red"
        : "roulette-number-black";

      row.appendChild(createBetButton({
        label: String(number),
        type: "straight",
        payload: String(number),
        className: `roulette-bet-btn ${colorClass}`,
      }));
    }

    rowsWrap.appendChild(row);
  });

  const columnsWrap = document.createElement("div");
  columnsWrap.className = "roulette-column-bets";
  columnsWrap.appendChild(createBetButton({
    label: "2:1",
    type: "column3",
    className: "roulette-column-btn",
  }));
  columnsWrap.appendChild(createBetButton({
    label: "2:1",
    type: "column2",
    className: "roulette-column-btn",
  }));
  columnsWrap.appendChild(createBetButton({
    label: "2:1",
    type: "column1",
    className: "roulette-column-btn",
  }));

  straightGridEl.appendChild(zeroColumn);
  straightGridEl.appendChild(rowsWrap);
  straightGridEl.appendChild(columnsWrap);
}

function updateStats() {
  statSpinsEl.textContent = String(stats.spins);
  statWageredEl.textContent = formatCurrency(stats.wagered);
  statReturnedEl.textContent = formatCurrency(stats.returned);

  const net = stats.returned - stats.wagered;
  statNetEl.textContent = formatCurrency(net);
  statNetEl.style.color = net >= 0 ? "#34d399" : "#f87171";
}

function addHistoryItem({ number, betLabel, won, amount }) {
  const item = document.createElement("div");
  const color = getNumberColor(number);
  const outcomeText = won ? "WIN" : "LOSE";
  const amountText = won ? `+${formatCurrency(amount)}` : `-${formatCurrency(amount)}`;

  item.className = `roulette-history-item ${won ? "is-win" : "is-loss"}`;
  item.innerHTML = `
    <div class="roulette-history-top">
      <span class="roulette-history-result is-${color}">${number}</span>
      <span class="roulette-history-outcome">${outcomeText}</span>
      <strong class="roulette-history-amount">${amountText}</strong>
    </div>
    <div class="roulette-history-meta">
      <span>Bet: ${betLabel}</span>
      <span>Result: ${number} (${color})</span>
    </div>
  `;

  historyEl.prepend(item);

  while (historyEl.children.length > 16) {
    historyEl.removeChild(historyEl.lastChild);
  }
}

function checkBetWin(number, bet) {
  const { type, payload } = bet;
  const numeric = toNumeric(number);

  switch (type) {
    case "straight":
      return String(number) === String(payload);
    case "red":
      return getNumberColor(number) === "red";
    case "black":
      return getNumberColor(number) === "black";
    case "odd":
      return numeric !== null && numeric >= 1 && numeric <= 36 && numeric % 2 === 1;
    case "even":
      return numeric !== null && numeric >= 1 && numeric <= 36 && numeric % 2 === 0;
    case "low":
      return numeric !== null && numeric >= 1 && numeric <= 18;
    case "high":
      return numeric !== null && numeric >= 19 && numeric <= 36;
    case "dozen1":
      return numeric !== null && numeric >= 1 && numeric <= 12;
    case "dozen2":
      return numeric !== null && numeric >= 13 && numeric <= 24;
    case "dozen3":
      return numeric !== null && numeric >= 25 && numeric <= 36;
    case "column1":
      return numeric !== null && numeric >= 1 && numeric <= 36 && numeric % 3 === 1;
    case "column2":
      return numeric !== null && numeric >= 1 && numeric <= 36 && numeric % 3 === 2;
    case "column3":
      return numeric !== null && numeric >= 1 && numeric <= 36 && numeric % 3 === 0;
    default:
      return false;
  }
}

function drawWheel(angle = 0) {
  const width = wheelCanvas.width;
  const height = wheelCanvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 26;
  const segmentAngle = (Math.PI * 2) / ROULETTE_ORDER.length;
  const fontSize = Math.max(10, Math.floor(radius * 0.07));
  const centerRadius = Math.max(18, radius * 0.62);
  const markerDistance = Math.max(22, radius * 0.2);

  wheelCtx.clearRect(0, 0, width, height);

  wheelCtx.save();
  wheelCtx.translate(cx, cy);

  for (let index = 0; index < ROULETTE_ORDER.length; index += 1) {
    const number = ROULETTE_ORDER[index];
    const start = angle + (index * segmentAngle) - Math.PI / 2;
    const end = start + segmentAngle;

    let fill = "#111827";
    if (number === "0" || number === "00") fill = "#047857";
    if (RED_NUMBERS.has(Number(number))) fill = "#b91c1c";

    wheelCtx.beginPath();
    wheelCtx.moveTo(0, 0);
    wheelCtx.arc(0, 0, radius, start, end);
    wheelCtx.closePath();
    wheelCtx.fillStyle = fill;
    wheelCtx.fill();

    wheelCtx.save();
    wheelCtx.rotate(start + segmentAngle / 2);
    wheelCtx.textAlign = "center";
    wheelCtx.fillStyle = "#f8fafc";
    wheelCtx.font = `bold ${fontSize}px Inter`;
    wheelCtx.fillText(String(number), radius - markerDistance, 4);
    wheelCtx.restore();
  }

  wheelCtx.beginPath();
  wheelCtx.arc(0, 0, centerRadius, 0, Math.PI * 2);
  wheelCtx.fillStyle = "#0f172a";
  wheelCtx.fill();
  wheelCtx.lineWidth = 8;
  wheelCtx.strokeStyle = "#334155";
  wheelCtx.stroke();

  wheelCtx.beginPath();
  wheelCtx.arc(0, 0, 20, 0, Math.PI * 2);
  wheelCtx.fillStyle = "#fbbf24";
  wheelCtx.fill();

  wheelCtx.restore();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function getLandingAngleForNumber(number) {
  const index = ROULETTE_ORDER.indexOf(String(number));
  const segmentAngle = (Math.PI * 2) / ROULETTE_ORDER.length;
  return -((index + 0.5) * segmentAngle);
}

function normalizePositiveAngle(angle) {
  const full = Math.PI * 2;
  return ((angle % full) + full) % full;
}

function settleRound(number, placedBets) {
  const resultColor = getNumberColor(number);
  const totalWager = placedBets.reduce((sum, bet) => sum + bet.amount, 0);

  let totalPayout = 0;
  let totalProfit = 0;
  let winningCount = 0;

  placedBets.forEach((bet) => {
    if (!checkBetWin(number, bet)) return;

    const definition = BET_DEFINITIONS[bet.type];
    const payout = bet.amount * (definition.multiplier + 1);
    totalPayout += payout;
    totalProfit += payout - bet.amount;
    winningCount += 1;
  });

  const betSummary = placedBets.map((bet) => `${getBetLabel(bet)} $${formatCurrency(bet.amount)}`).join(", ");

  lastResultEl.textContent = `${number} (${resultColor})`;

  stats.spins += 1;
  stats.wagered += totalWager;

  if (totalPayout > 0) {
    updateCredits(totalPayout);
    stats.returned += totalPayout;
    addHistoryItem({ number, betLabel: betSummary, won: true, amount: totalProfit });

    statusEl.textContent = `Win! ${winningCount}/${placedBets.length} bets hit on ${number}. +$${formatCurrency(totalProfit)}`;
    statusEl.style.color = "#34d399";
  } else {
    addHistoryItem({ number, betLabel: betSummary, won: false, amount: totalWager });
    statusEl.textContent = `Lost. ${number} did not hit any selected bet.`;
    statusEl.style.color = "#f87171";
  }

  updateStats();
  isSpinning = false;
  spinButton.disabled = false;
}

function spinWheel() {
  if (isSpinning) return;

  if (selectedBets.length === 0) {
    showPopup("Select at least one bet before spinning.");
    return;
  }

  const totalWager = selectedBets.reduce((sum, bet) => sum + bet.amount, 0);
  if (totalWager > credits) {
    showPopup("Insufficient credits.");
    return;
  }

  const placedBets = selectedBets.map((bet) => ({ ...bet }));

  updateCredits(-totalWager);
  isSpinning = true;
  spinButton.disabled = true;
  statusEl.textContent = `Spinning ${placedBets.length} bet${placedBets.length > 1 ? "s" : ""}...`;
  statusEl.style.color = "#93c5fd";

  const resultNumber = ROULETTE_ORDER[Math.floor(Math.random() * ROULETTE_ORDER.length)];
  const targetBase = getLandingAngleForNumber(resultNumber);
  const currentNormalized = normalizePositiveAngle(wheelAngle);
  const delta = normalizePositiveAngle(targetBase - currentNormalized);
  const spins = 5 + Math.floor(Math.random() * 3);
  const targetAngle = wheelAngle + spins * Math.PI * 2 + delta;

  const startAngle = wheelAngle;
  const duration = 4600;
  const startTime = performance.now();

  function animate(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = easeOutCubic(progress);

    wheelAngle = startAngle + (targetAngle - startAngle) * eased;
    drawWheel(wheelAngle);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      wheelAngle = normalizePositiveAngle(targetAngle);
      drawWheel(wheelAngle);
      settleRound(resultNumber, placedBets);
    }
  }

  requestAnimationFrame(animate);
}

function initQuickBets() {
  document.querySelectorAll(".roulette-quick-bets [data-bet]").forEach((button) => {
    button.addEventListener("click", () => {
      betInput.value = button.dataset.bet;
    });
  });

  allInButton.addEventListener("click", () => {
    betInput.value = credits.toFixed(2);
  });
}

function initOutsideBets() {
  tableEl.querySelectorAll("button[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      if (isSpinning) return;

      const type = button.dataset.type;
      const payload = button.dataset.payload ?? null;
      setSelectedBet(type, payload);
      syncActiveButtons();
    });
  });
}

function init() {
  createStraightGrid();
  initQuickBets();
  initOutsideBets();
  updateStats();
  resizeWheelCanvas();
  drawWheel();
  updateSelectionDisplay();

  clearBetsButton.addEventListener("click", () => {
    if (!isSpinning) clearSelections();
  });

  window.addEventListener("resize", resizeWheelCanvas);

  spinButton.addEventListener("click", spinWheel);
}

init();

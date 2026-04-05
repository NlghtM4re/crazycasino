/* ── Roulette game logic ── */

// European roulette wheel order (clockwise from 0)
const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13,
    36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
    31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function getNumberColor(n) {
    if (n === 0) return "zero";
    return RED_NUMBERS.has(n) ? "red" : "black";
}

// ── Betting state ──
// bets = Map<betKey, { type, value, amount }>
const bets = new Map();
let chipValue = 1;
let isSpinning = false;
const spinHistory = [];

function getBetAmount() {
    const v = parseFloat(document.getElementById("roulette-chip-value").value);
    return isNaN(v) || v <= 0 ? 1 : v;
}

function toggleBet(key, type, value) {
    if (isSpinning) return;
    chipValue = getBetAmount();
    if (isNaN(chipValue) || chipValue <= 0) {
        displayMessage("Enter a valid chip value.");
        return;
    }
    if (bets.has(key)) {
        bets.delete(key);
    } else {
        bets.set(key, { type, value, amount: chipValue });
    }
    renderBetChips();
    updateBetTotal();
}

function renderBetChips() {
    // Clear existing chips
    document.querySelectorAll(".rn-cell, .rc-btn, .rob-btn").forEach(el => {
        el.classList.remove("selected");
        const chip = el.querySelector(".chip");
        if (chip) chip.remove();
    });
    bets.forEach((bet, key) => {
        const el = document.querySelector(`[data-betkey="${key}"]`);
        if (!el) return;
        el.classList.add("selected");
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = formatChip(bet.amount);
        el.appendChild(chip);
    });
}

function formatChip(amount) {
    if (amount >= 1000) return Math.round(amount / 1000) + "k";
    return amount % 1 === 0 ? String(amount) : amount.toFixed(1);
}

function updateBetTotal() {
    let total = 0;
    bets.forEach(b => { total += b.amount; });
    document.getElementById("roulette-bet-total").textContent =
        `Total bet: $${total.toFixed(2)}`;
}

function clearBets() {
    if (isSpinning) return;
    bets.clear();
    renderBetChips();
    updateBetTotal();
    displayMessage("");
}

// ── Spin logic ──
function spinWheel() {
    if (isSpinning) return;

    const totalBet = [...bets.values()].reduce((s, b) => s + b.amount, 0);
    if (bets.size === 0 || totalBet <= 0) {
        displayMessage("Place at least one bet before spinning!");
        return;
    }
    if (totalBet > credits) {
        displayMessage("Insufficient credits!");
        return;
    }

    updateCredits(-totalBet);
    isSpinning = true;
    document.getElementById("roulette-spin-btn").disabled = true;
    document.getElementById("roulette-clear-btn").disabled = true;
    displayMessage("Spinning…");

    // Pick result
    const resultIndex = Math.floor(Math.random() * WHEEL_NUMBERS.length);
    const resultNumber = WHEEL_NUMBERS[resultIndex];

    // Calculate spin target angle
    const segAngle = (2 * Math.PI) / WHEEL_NUMBERS.length;
    // We want the result segment to be at the top (π * 1.5 = top of circle)
    const targetAngle = (2 * Math.PI) - (resultIndex * segAngle) - segAngle / 2 + (Math.PI * 1.5);
    // Add multiple full rotations for visual effect
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const finalAngle = targetAngle + extraSpins * 2 * Math.PI;

    animateSpin(finalAngle, 4000, () => {
        isSpinning = false;
        document.getElementById("roulette-spin-btn").disabled = false;
        document.getElementById("roulette-clear-btn").disabled = false;
        resolveRound(resultNumber);
    });
}

// ── Canvas drawing ──
let wheelAngle = 0;
let animFrame = null;

function animateSpin(targetAngle, duration, onDone) {
    const startAngle = wheelAngle;
    const startTime = performance.now();

    function easeOut(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    function frame(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        wheelAngle = startAngle + (targetAngle - startAngle) * easeOut(t);
        drawWheel(wheelAngle);
        if (t < 1) {
            animFrame = requestAnimationFrame(frame);
        } else {
            wheelAngle = targetAngle % (2 * Math.PI);
            drawWheel(wheelAngle);
            if (onDone) onDone();
        }
    }

    animFrame = requestAnimationFrame(frame);
}

function drawWheel(angle) {
    const canvas = document.getElementById("roulette-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = cx - 4;
    const innerR = outerR * 0.62;
    const numCount = WHEEL_NUMBERS.length;
    const segAngle = (2 * Math.PI) / numCount;

    ctx.clearRect(0, 0, size, size);

    // Outer rim
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#78350f";
    ctx.fill();

    // Segments
    for (let i = 0; i < numCount; i++) {
        const startA = angle + i * segAngle - Math.PI / 2;
        const endA = startA + segAngle;
        const num = WHEEL_NUMBERS[i];
        const color = getNumberColor(num);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, startA, endA);
        ctx.closePath();

        if (color === "zero") {
            ctx.fillStyle = "#15803d";
        } else if (color === "red") {
            ctx.fillStyle = "#dc2626";
        } else {
            ctx.fillStyle = "#1a1a2e";
        }
        ctx.fill();

        // Segment border
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Number label
        ctx.save();
        ctx.translate(cx, cy);
        const midA = startA + segAngle / 2;
        ctx.rotate(midA + Math.PI / 2);
        const textR = (outerR + innerR) / 2;
        ctx.translate(0, -textR);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(8, Math.floor(size / 28))}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(num), 0, 0);
        ctx.restore();
    }

    // Inner hub circle
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx, cy, innerR * 0.2, cx, cy, innerR);
    grad.addColorStop(0, "#1e293b");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ball indicator triangle at top
    const indicatorY = cy - outerR - 2;
    ctx.beginPath();
    ctx.moveTo(cx, indicatorY + 12);
    ctx.lineTo(cx - 7, indicatorY + 24);
    ctx.lineTo(cx + 7, indicatorY + 24);
    ctx.closePath();
    ctx.fillStyle = "#fbbf24";
    ctx.fill();
}

function initCanvas() {
    const canvas = document.getElementById("roulette-canvas");
    if (!canvas) return;
    // Responsive size
    const wrap = canvas.parentElement;
    const maxSize = Math.min(wrap.clientWidth || 300, 300);
    const size = Math.max(200, maxSize);
    canvas.width = size;
    canvas.height = size;
    drawWheel(wheelAngle);
}

// ── Resolve round ──
function resolveRound(result) {
    const color = getNumberColor(result);

    let totalWin = 0;
    const winningBets = [];
    const losingBets = [];

    bets.forEach((bet, key) => {
        const win = evaluateBet(bet, result);
        if (win > 0) {
            totalWin += win;
            winningBets.push(key);
        } else {
            losingBets.push(key);
        }
    });

    if (totalWin > 0) {
        updateCredits(totalWin);
        const net = totalWin - [...bets.values()].reduce((s, b) => s + b.amount, 0);
        displayMessage(`🎉 Result: ${result} (${color}) — Won $${totalWin.toFixed(2)}! Net: ${net >= 0 ? "+" : ""}$${net.toFixed(2)}`);
    } else {
        displayMessage(`Result: ${result} (${color}) — No winning bets this round.`);
    }

    // Update result display
    const colorClass = color === "zero" ? "green" : color;
    document.getElementById("roulette-result-display").innerHTML =
        `<span style="color: ${color === "red" ? "#f87171" : color === "black" ? "#94a3b8" : "#4ade80"}">${result}</span>`;

    // Update history
    addHistory(result, color);
}

function evaluateBet(bet, result) {
    const color = getNumberColor(result);
    switch (bet.type) {
        case "straight":
            if (bet.value === result) return bet.amount * 36; // total return = stake × 36 (35:1 payout + original stake)
            return 0;
        case "color":
            if (result !== 0 && bet.value === color) return bet.amount * 2;
            return 0;
        case "parity": {
            const isEven = result !== 0 && result % 2 === 0;
            if ((bet.value === "even" && isEven) || (bet.value === "odd" && !isEven && result !== 0))
                return bet.amount * 2;
            return 0;
        }
        case "half": {
            if (bet.value === "low" && result >= 1 && result <= 18) return bet.amount * 2;
            if (bet.value === "high" && result >= 19 && result <= 36) return bet.amount * 2;
            return 0;
        }
        case "dozen": {
            if (bet.value === 1 && result >= 1 && result <= 12) return bet.amount * 3;
            if (bet.value === 2 && result >= 13 && result <= 24) return bet.amount * 3;
            if (bet.value === 3 && result >= 25 && result <= 36) return bet.amount * 3;
            return 0;
        }
        case "column": {
            // Column 1: 1,4,7,...34; Column 2: 2,5,8,...35; Column 3: 3,6,9,...36
            if (result !== 0 && result % 3 === bet.value % 3) return bet.amount * 3;
            return 0;
        }
        default:
            return 0;
    }
}

// ── History ──
function addHistory(number, color) {
    spinHistory.unshift({ number, color });
    if (spinHistory.length > 15) spinHistory.pop();
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById("roulette-history");
    if (!container) return;
    container.innerHTML = "";
    spinHistory.forEach(h => {
        const pill = document.createElement("span");
        pill.className = `history-pill hp-${h.color}`;
        pill.textContent = h.number;
        container.appendChild(pill);
    });
}

function displayMessage(msg) {
    const el = document.getElementById("roulette-message");
    if (el) el.textContent = msg;
}

// ── Build betting table ──
function buildTable() {
    buildNumberGrid();
    buildColumnRow();
    buildOutsideBets();
}

function buildNumberGrid() {
    const grid = document.getElementById("roulette-number-grid");
    if (!grid) return;
    grid.innerHTML = "";

    // Zero cell spanning 3 rows visually – we use a 13-column grid
    // Row layout: 3 rows × 12 cols plus zero column
    // Col order: zero | 3,6,9,12,15,18,21,24,27,30,33,36
    //                   2,5,8,11,14,17,20,23,26,29,32,35
    //                   1,4,7,10,13,16,19,22,25,28,31,34
    // We render top-to-bottom by column groups

    const rows = [
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
    ];

    // Zero cell (spans all 3 rows)
    const zeroCell = document.createElement("div");
    zeroCell.className = "rn-cell rn-zero";
    zeroCell.textContent = "0";
    zeroCell.dataset.betkey = "straight-0";
    zeroCell.style.gridRow = "1 / 4";
    zeroCell.addEventListener("click", () => toggleBet("straight-0", "straight", 0));
    grid.appendChild(zeroCell);

    // Number cells
    rows.forEach((row, rowIdx) => {
        row.forEach(num => {
            const cell = document.createElement("div");
            const col = getNumberColor(num);
            cell.className = `rn-cell rn-${col}`;
            cell.textContent = num;
            cell.dataset.betkey = `straight-${num}`;
            cell.addEventListener("click", () => toggleBet(`straight-${num}`, "straight", num));
            grid.appendChild(cell);
        });
    });
}

function buildColumnRow() {
    const row = document.getElementById("roulette-column-row");
    if (!row) return;
    row.innerHTML = "";

    // Spacer under zero
    const spacer = document.createElement("div");
    spacer.className = "rc-spacer";
    row.appendChild(spacer);

    // 3 column bets, each covering 4 groups of 3 columns
    // Column 1 = 3,6,9,... Column 2 = 2,5,8,... Column 3 = 1,4,7,...
    // But visually the column buttons span 4 columns each
    const colLabels = ["Col 3", "Col 2", "Col 1"];
    [3, 2, 1].forEach((colVal, idx) => {
        const btn = document.createElement("div");
        btn.className = "rc-btn";
        btn.textContent = colLabels[idx];
        btn.dataset.betkey = `column-${colVal}`;
        btn.addEventListener("click", () => toggleBet(`column-${colVal}`, "column", colVal));
        row.appendChild(btn);
    });
}

function buildOutsideBets() {
    const wrap = document.getElementById("roulette-outside-bets");
    if (!wrap) return;
    wrap.innerHTML = "";

    const betDefs = [
        { key: "color-red",   label: "Red",    cls: "rob-red",   type: "color",  value: "red" },
        { key: "color-black", label: "Black",  cls: "rob-black", type: "color",  value: "black" },
        { key: "parity-even", label: "Even",   cls: "rob-even",  type: "parity", value: "even" },
        { key: "parity-odd",  label: "Odd",    cls: "rob-odd",   type: "parity", value: "odd" },
        { key: "half-low",    label: "1–18",   cls: "rob-low",   type: "half",   value: "low" },
        { key: "half-high",   label: "19–36",  cls: "rob-high",  type: "half",   value: "high" },
        { key: "dozen-1",     label: "1st 12", cls: "rob-dozen", type: "dozen",  value: 1 },
        { key: "dozen-2",     label: "2nd 12", cls: "rob-dozen", type: "dozen",  value: 2 },
        { key: "dozen-3",     label: "3rd 12", cls: "rob-dozen", type: "dozen",  value: 3 },
    ];

    betDefs.forEach(def => {
        const btn = document.createElement("div");
        btn.className = `rob-btn ${def.cls}`;
        btn.textContent = def.label;
        btn.dataset.betkey = def.key;
        btn.addEventListener("click", () => toggleBet(def.key, def.type, def.value));
        wrap.appendChild(btn);
    });
}

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
    buildTable();
    initCanvas();

    document.getElementById("roulette-spin-btn").addEventListener("click", spinWheel);
    document.getElementById("roulette-clear-btn").addEventListener("click", clearBets);

    window.addEventListener("resize", initCanvas);
});

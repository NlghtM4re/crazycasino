const symbols = ["🍒", "🔔", "🍉", "💎", "7️⃣"];
// Lower payout symbols are more common; higher payout symbols are rarer.
const symbolWeights = {
    '🍒': 29,
    '🍉': 29,
    '🔔': 17,
    '💎': 17,
    '7️⃣': 8
};
const totalSymbolWeight = symbols.reduce((sum, sym) => sum + (symbolWeights[sym] || 0), 0);
const ROWS = 3;
const COLS = 5;
let isSpinning = false;

function getWeightedRandomSymbol() {
    const roll = Math.random() * totalSymbolWeight;
    let cumulative = 0;

    for (const sym of symbols) {
        cumulative += symbolWeights[sym] || 0;
        if (roll < cumulative) return sym;
    }

    // Fallback for edge cases caused by floating point precision.
    return symbols[symbols.length - 1];
}

function createSeamlessSpinStrip(durationSeconds) {
    const strip = document.createElement('div');
    strip.className = 'reel-strip spin';
    strip.style.animationDuration = `${durationSeconds}s`;

    // Duplicate the same symbol block so end of animation matches the start perfectly.
    const baseCount = 10;
    const baseSymbols = [];
    for (let i = 0; i < baseCount; i++) {
        baseSymbols.push(getWeightedRandomSymbol());
    }
    const fullSymbols = baseSymbols.concat(baseSymbols);
    strip.style.setProperty('--spin-distance', `${baseCount * 70}px`);

    fullSymbols.forEach((sym) => {
        const cell = document.createElement('div');
        cell.className = 'slot-cell';
        cell.textContent = sym;
        strip.appendChild(cell);
    });

    return strip;
}

function initGrid() {
    const grid = document.getElementById('slotGrid');
    grid.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'slot-cell';
            cell.textContent = getWeightedRandomSymbol();
            grid.appendChild(cell);
        }
    }
}

function renderHybridGrid(finalGrid, stoppedColumns = new Set()) {
    const grid = document.getElementById('slotGrid');
    grid.innerHTML = '';

    for (let c = 0; c < COLS; c++) {
        const column = document.createElement('div');
        column.className = 'reel-column';

        if (stoppedColumns.has(c)) {
            // Render stopped column as static grid
            const page = document.createElement('div');
            page.className = 'reel-strip';

            for (let r = 0; r < ROWS; r++) {
                const cell = document.createElement('div');
                cell.className = 'slot-cell';
                cell.textContent = finalGrid[r][c];
                page.appendChild(cell);
            }

            column.appendChild(page);
        } else {
            // Render spinning column
            const strip = createSeamlessSpinStrip(0.22);

            column.appendChild(strip);
        }

        grid.appendChild(column);
    }
}

function updateSymbolValues() {
    const betInput = parseFloat(document.getElementById('bet').value);
    const betAmount = Number.isFinite(betInput) ? betInput : 0;
    const basePercent = { '🍒': 0.15, '🍉': 0.15, '🔔': 0.50, '💎': 0.50, '7️⃣': 1.00 };
    const symbols_list = ['🍒', '🍉', '🔔', '💎', '7️⃣'];
    
    const spans = document.querySelectorAll('#symbolValues .symbol-credit');
    spans.forEach((span, idx) => {
        const credit = betAmount * basePercent[symbols_list[idx]];
        span.textContent = credit.toFixed(2);
    });
}

function updateSpawnChances() {
    const symbolsList = ['🍒', '🍉', '🔔', '💎', '7️⃣'];
    const spans = document.querySelectorAll('#chanceValues .symbol-chance');

    spans.forEach((span, idx) => {
        const sym = symbolsList[idx];
        const chance = ((symbolWeights[sym] || 0) / totalSymbolWeight) * 100;
        span.textContent = `${chance.toFixed(1)}%`;
    });
}

function renderGrid(gridData, highlightedLines = [], flashCells = []) {
    const grid = document.getElementById('slotGrid');
    grid.innerHTML = '';

    const levelMap = new Map();
    highlightedLines.forEach((line, idx) => {
        const level = Math.min(idx + 1, 4);
        line.cells.forEach((p) => {
            const key = `${p.row}_${p.col}`;
            const prev = levelMap.get(key) || 0;
            levelMap.set(key, Math.max(prev, level));
        });
    });
    const flashMap = new Set(flashCells.map(p => `${p.row}_${p.col}`));

    for (let c = 0; c < COLS; c++) {
        const column = document.createElement('div');
        column.className = 'reel-column';

        const page = document.createElement('div');
        page.className = 'reel-strip';

        for (let r = 0; r < ROWS; r++) {
            const cell = document.createElement('div');
            cell.className = 'slot-cell';
            const key = `${r}_${c}`;
            const level = levelMap.get(key) || 0;
            
            if (level > 0) {
                cell.classList.add('win');
                if (level >= 2) cell.classList.add('level2');
                if (level >= 3) cell.classList.add('level3');
                if (level >= 4) cell.classList.add('level4');
            }
            if (flashMap.has(key)) cell.classList.add('flash');
            
            cell.textContent = gridData[r][c];
            page.appendChild(cell);
        }

        column.appendChild(page);
        grid.appendChild(column);
    }
}


function renderSpinningReels(durationSeconds = 0.9) {
    const grid = document.getElementById('slotGrid');
    grid.innerHTML = '';

    for (let c = 0; c < COLS; c++) {
        const column = document.createElement('div');
        column.className = 'reel-column';

        const strip = createSeamlessSpinStrip(durationSeconds);

        column.appendChild(strip);
        grid.appendChild(column);
    }
}


function calculateWinningLines(gridData) {
    const lineResults = [];
    const basePercent = { '🍒': 0.15, '🍉': 0.15, '🔔': 0.50, '💎': 0.50, '7️⃣': 1.00 };
    const specialLineMasks = [];

    function getPatternMultiplier(length) {
        if (length === 3) return 2;
        if (length === 4) return 5;
        return 10;
    }

    function allSameSymbol(cells) {
        if (cells.length === 0) return null;
        const sym = cells[0].symbol;
        for (let i = 1; i < cells.length; i++) {
            if (cells[i].symbol !== sym) return null;
        }
        return sym;
    }

    function isAllBoardSame() {
        const first = gridData[0][0];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (gridData[r][c] !== first) return null;
            }
        }
        return first;
    }

    function pushSpecialPattern(cells, lineType) {
        const sym = allSameSymbol(cells);
        if (!sym) return;
        const length = cells.length;
        const patternMultiplier = (lineType === 'v-shape' || lineType === 'x-shape' || lineType === 'plus-shape') ? 20 : getPatternMultiplier(length);
        const multiplier = basePercent[sym] * length * patternMultiplier;
        lineResults.push({ symbol: sym, length, lineType, cells, multiplier, baseValue: basePercent[sym], patternMult: patternMultiplier });
        specialLineMasks.push(new Set(cells.map(c => `${c.row}_${c.col}`)));
    }

    function checkLine(cells, lineType) {
        let runSymbol = cells[0].symbol;
        let runStartIdx = 0;

        function commitRun(runEndIdx) {
            const length = runEndIdx - runStartIdx + 1;
            if (length >= 3) {
                const runCells = cells.slice(runStartIdx, runEndIdx + 1);
                const fullyInsideSpecial = specialLineMasks.some(mask =>
                    runCells.every(cell => mask.has(`${cell.row}_${cell.col}`))
                );
                if (fullyInsideSpecial) return;
                const patternMultiplier = getPatternMultiplier(length);
                const multiplier = basePercent[runSymbol] * length * patternMultiplier;
                lineResults.push({ symbol: runSymbol, length, lineType, cells: runCells, multiplier, baseValue: basePercent[runSymbol], patternMult: patternMultiplier });
            }
        }

        for (let i = 1; i < cells.length; i++) {
            if (cells[i].symbol === runSymbol) {
                continue;
            }
            commitRun(i - 1);
            runSymbol = cells[i].symbol;
            runStartIdx = i;
        }
        commitRun(cells.length - 1);
    }

    // Horizontal lines
    for (let r = 0; r < ROWS; r++) {
        const cells = [];
        for (let c = 0; c < COLS; c++) {
            cells.push({ symbol: gridData[r][c], row: r, col: c });
        }
        checkLine(cells, 'horizontal');
    }

    // Vertical lines
    for (let c = 0; c < COLS; c++) {
        const cells = [];
        for (let r = 0; r < ROWS; r++) {
            cells.push({ symbol: gridData[r][c], row: r, col: c });
        }
        checkLine(cells, 'vertical');
    }

    // Special V patterns (priority over diagonals)
    pushSpecialPattern([
        { symbol: gridData[0][0], row: 0, col: 0 },
        { symbol: gridData[1][1], row: 1, col: 1 },
        { symbol: gridData[2][2], row: 2, col: 2 },
        { symbol: gridData[1][3], row: 1, col: 3 },
        { symbol: gridData[0][4], row: 0, col: 4 }
    ], 'v-shape');

    pushSpecialPattern([
        { symbol: gridData[2][0], row: 2, col: 0 },
        { symbol: gridData[1][1], row: 1, col: 1 },
        { symbol: gridData[0][2], row: 0, col: 2 },
        { symbol: gridData[1][3], row: 1, col: 3 },
        { symbol: gridData[2][4], row: 2, col: 4 }
    ], 'v-shape');

    // X pattern can be anywhere in each 3-column window (priority over diagonals)
    for (let startCol = 0; startCol <= COLS - 3; startCol++) {
        pushSpecialPattern([
            { symbol: gridData[0][startCol], row: 0, col: startCol },
            { symbol: gridData[1][startCol + 1], row: 1, col: startCol + 1 },
            { symbol: gridData[2][startCol + 2], row: 2, col: startCol + 2 },
            { symbol: gridData[0][startCol + 2], row: 0, col: startCol + 2 },
            { symbol: gridData[2][startCol], row: 2, col: startCol }
        ], 'x-shape');
    }

    // Plus pattern can be anywhere in each 3-column window (priority over horizontal/vertical lines)
    for (let startCol = 0; startCol <= COLS - 3; startCol++) {
        pushSpecialPattern([
            { symbol: gridData[0][startCol + 1], row: 0, col: startCol + 1 },
            { symbol: gridData[1][startCol], row: 1, col: startCol },
            { symbol: gridData[1][startCol + 1], row: 1, col: startCol + 1 },
            { symbol: gridData[1][startCol + 2], row: 1, col: startCol + 2 },
            { symbol: gridData[2][startCol + 1], row: 2, col: startCol + 1 }
        ], 'plus-shape');
    }

    // Diagonals (down-right)
    const diagStartsDR = [];
    for (let c = 0; c <= COLS - 3; c++) diagStartsDR.push([0, c]);
    for (let r = 1; r <= ROWS - 3; r++) diagStartsDR.push([r, 0]);

    diagStartsDR.forEach(([sr, sc]) => {
        const cells = [];
        let r = sr, c = sc;
        while (r < ROWS && c < COLS) {
            cells.push({ symbol: gridData[r][c], row: r, col: c });
            r += 1; c += 1;
        }
        if (cells.length >= 3) checkLine(cells, 'diagonal');
    });

    // Diagonals (down-left)
    const diagStartsDL = [];
    for (let c = 2; c < COLS; c++) diagStartsDL.push([0, c]);
    for (let r = 1; r <= ROWS - 3; r++) diagStartsDL.push([r, COLS - 1]);

    diagStartsDL.forEach(([sr, sc]) => {
        const cells = [];
        let r = sr, c = sc;
        while (r < ROWS && c >= 0) {
            cells.push({ symbol: gridData[r][c], row: r, col: c });
            r += 1; c -= 1;
        }
        if (cells.length >= 3) checkLine(cells, 'diagonal');
    });

    // Jackpot: every cell on the board is the same symbol.
    const jackpotSymbol = isAllBoardSame();
    if (jackpotSymbol) {
        const jackpotCells = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                jackpotCells.push({ symbol: jackpotSymbol, row: r, col: c });
            }
        }
        lineResults.push({
            symbol: jackpotSymbol,
            length: ROWS * COLS,
            lineType: 'jackpot',
            cells: jackpotCells,
            multiplier: 1000,
            baseValue: null,
            patternMult: 1000
        });
    }

    const totalReward = lineResults.reduce((sum, line) => sum + line.multiplier, 0);
    return { lines: lineResults, multiplier: totalReward };
}

function playWinningLinesSequentially(lines, gridData, betAmount) {
    let currentMultiplier = 0;
    let totalCreditsGained = 0;
    const appliedLines = [];
    const patternCount = Math.max(lines.length, 1);

    function animateMultiplier(fromValue, toValue, duration = 400) {
        const startTime = performance.now();
        const winEl = document.getElementById('win');
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentVal = fromValue + (toValue - fromValue) * progress;
            winEl.textContent = `Total Multiplier: x${currentVal.toFixed(2)}`;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }

    function animateCredits(fromValue, toValue, duration = 400) {
        const startTime = performance.now();
        const credEl = document.getElementById('win-credits');

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentVal = fromValue + (toValue - fromValue) * progress;
            credEl.textContent = `+${currentVal.toFixed(2)} credits`;
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    function applyLine(index) {
        const credEl = document.getElementById('win-credits');

        if (index >= lines.length) {
            document.getElementById('win').textContent = `Total Multiplier: x${currentMultiplier.toFixed(2)}`;
            if (totalCreditsGained === 0) {
                credEl.textContent = '0 credits';
                credEl.className = 'zero';
            }
            isSpinning = false;
            return;
        }

        const line = lines[index];
        const scaledLineMultiplier = line.multiplier * patternCount;
        const prevMultiplier = currentMultiplier;
        const prevCredits = totalCreditsGained;
        currentMultiplier += scaledLineMultiplier;
        const lineWinnings = betAmount * scaledLineMultiplier;
        totalCreditsGained += lineWinnings;
        appliedLines.push(line);

        const flashPositions = line.cells.map(v => ({ row: v.row, col: v.col }));
        renderGrid(gridData, appliedLines, flashPositions);

        updateCredits(lineWinnings);
        document.getElementById('win').textContent = `Processing pattern ${index + 1}...`;

        const winEl = document.getElementById('win');
        
        setTimeout(() => {
            // Pulse win multiplier
            winEl.classList.remove('multiplier-pulse');
            void winEl.offsetWidth;
            winEl.classList.add('multiplier-pulse');

            // Pop credit display
            credEl.className = 'credit-pop';
            void credEl.offsetWidth;
            credEl.classList.add('credit-pop');

            // Animate both counters simultaneously
            animateMultiplier(prevMultiplier, currentMultiplier, 400);
            animateCredits(prevCredits, totalCreditsGained, 400);

            // Add breakdown row
            const bdRows = document.getElementById('win-breakdown-rows');
            const row = document.createElement('div');
            row.className = 'win-breakdown-row';
            const typeLabel = line.lineType.replace(/-/g, ' ');
            let formulaParts;
            if (line.lineType === 'jackpot') {
                formulaParts = `<span class="bd-formula"><span class="bd-f-special">×1000 jackpot</span></span>`;
            } else {
                formulaParts = `<span class="bd-formula">`
                    + `<span class="bd-f-cells">${line.length} cells</span>`
                    + ` <span class="bd-f-op">×</span> <span class="bd-f-sym">${line.baseValue} sym</span>`
                    + ` <span class="bd-f-op">×</span> <span class="bd-f-line">×${line.patternMult} line</span>`
                    + (patternCount > 1 ? ` <span class="bd-f-op">×</span> <span class="bd-f-stack">×${patternCount} stack</span>` : '')
                    + `</span>`;
            }
            row.innerHTML = `<span class="bd-symbol">${line.symbol}</span><span class="bd-type">${typeLabel}</span>${formulaParts}<span class="bd-eq">= x${scaledLineMultiplier.toFixed(2)}</span><span class="bd-credits">+${lineWinnings.toFixed(2)}</span>`;
            bdRows.appendChild(row);

            renderGrid(gridData, appliedLines);
            
            setTimeout(() => applyLine(index + 1), 150);
        }, 100);
    }

    // Show 0 immediately before any patterns
    const credEl = document.getElementById('win-credits');
    credEl.textContent = '0 credits';
    credEl.className = 'zero';
    document.getElementById('win-breakdown-rows').innerHTML = '<p class="bd-empty">Calculating patterns...</p>';

    applyLine(0);
}

function updatePatternPanel(text) {
    const el = document.getElementById('patternContent');
    if (el) el.textContent = text;
}

function startSpin() {
    if (isSpinning) return;

    const betInput = parseFloat(document.getElementById('bet').value);
    const betAmount = Number.isFinite(betInput) ? betInput : 0;
    if (betAmount <= 0 || betAmount > credits) {
        showPopup('Invalid bet amount!');
        return;
    }

    isSpinning = true;
    updateCredits(-betAmount);
    document.getElementById('win-status-placeholder').style.display = 'none';
    document.getElementById('win-status-result').style.display = 'block';
    document.getElementById('win').textContent = 'Spinning...';
    document.getElementById('win-credits').textContent = '';
    document.getElementById('win-breakdown-rows').innerHTML = '<p class="bd-empty">Waiting for result...</p>';

    renderSpinningReels(0.22);

    const finalGrid = Array.from(
        { length: ROWS },
        () => Array.from({ length: COLS }, () => getWeightedRandomSymbol())
    );

    const baseDelay = 900;
    const perColDelay = 450;
    const stoppedColumns = new Set();

    for (let c = 0; c < COLS; c++) {
        setTimeout(() => {
            stoppedColumns.add(c);
            renderHybridGrid(finalGrid, stoppedColumns);

            if (c === COLS - 1) {
                // All columns have stopped, calculate winnings
                setTimeout(() => {
                    const result = calculateWinningLines(finalGrid);
                    if (result.lines.length === 0) {
                        document.getElementById('win').textContent = 'No win, try again!';
                        const credEl = document.getElementById('win-credits');
                        credEl.textContent = '0 credits';
                        credEl.className = 'zero';
                        document.getElementById('win-breakdown-rows').innerHTML = '<p class="bd-empty">No winning patterns this round.</p>';
                        isSpinning = false;
                    } else {
                        document.getElementById('win').textContent = `Found ${result.lines.length} winning line(s)`;
                        playWinningLinesSequentially(result.lines, finalGrid, betAmount);
                    }
                }, 250);
            }
        }, baseDelay + c * perColDelay);
    }
}


// Initialize board on page load
window.addEventListener('DOMContentLoaded', () => {
    renderSpinningReels(1.2);
    updateSymbolValues();
    updateSpawnChances();

    const breakdownEl = document.getElementById('win-breakdown-rows');
    if (breakdownEl && breakdownEl.children.length === 0) {
        breakdownEl.innerHTML = '<p class="bd-empty">Spin to see breakdown.</p>';
    }

    const statusPlaceholder = document.getElementById('win-status-placeholder');
    const statusResult = document.getElementById('win-status-result');
    if (statusPlaceholder && statusResult) {
        statusPlaceholder.style.display = 'block';
        statusResult.style.display = 'none';
    }

    document.getElementById('bet').addEventListener('change', updateSymbolValues);
    document.getElementById('bet').addEventListener('input', updateSymbolValues);
});

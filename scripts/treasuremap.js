let gridSize = 16;
let mapSide = 4;
let trapCount = 3;
let treasureCount = 4;
let gameBoard = [];
let revealedTiles = [];
let currentBet = 1;
let gameActive = false;
let currentMultiplier = 1.0;
let difficulty = 'easy';
let mapSize = 'small';
let lastGameResult = null;

const mapSizeSettings = {
    small: {
        side: 4,
        label: '4 x 4',
        sizeBoost: 0.00
    },
    medium: {
        side: 5,
        label: '5 x 5',
        sizeBoost: 0.18
    },
    large: {
        side: 6,
        label: '6 x 6',
        sizeBoost: 0.35
    }
};

const difficultySettings = {
    easy: {
        label: 'Easy',
        trapRate: 0.18,
        treasureRate: 0.22,
        safeStep: 0.10,
        treasureBonus: 0.18,
        maxMultiplier: 4.6
    },
    medium: {
        label: 'Medium',
        trapRate: 0.24,
        treasureRate: 0.20,
        safeStep: 0.14,
        treasureBonus: 0.24,
        maxMultiplier: 6.4
    },
    hard: {
        label: 'Hard',
        trapRate: 0.30,
        treasureRate: 0.18,
        safeStep: 0.18,
        treasureBonus: 0.30,
        maxMultiplier: 8.6
    }
};

function setMinBet() {
    document.getElementById('bet').value = 0.01;
    syncBetPreview();
}

function setMaxBet() {
    document.getElementById('bet').value = credits;
    syncBetPreview();
}

function setDifficulty(level) {
    if (!gameActive) {
        difficulty = level;
        document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(level + '-btn').classList.add('active');
        refreshPreviewBoard();
    }
}

function setMapSize(size) {
    if (!gameActive) {
        mapSize = size;
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('size-' + size + '-btn').classList.add('active');
        refreshPreviewBoard();
    }
}

function syncBetPreview() {
    const nextBet = parseFloat(document.getElementById('bet').value);
    currentBet = Number.isFinite(nextBet) && nextBet > 0 ? nextBet : 0;
    updateStats();
}

function updateMultiplierDisplay() {
    document.getElementById('multiplier-display').textContent = currentMultiplier.toFixed(2) + 'x';
    document.getElementById('multiplier-subtext').textContent = gameActive
        ? 'Current route value with your revealed path.'
        : 'Treasure tiles add bigger boosts.';
}

function setControlsDisabled(disabled) {
    document.getElementById('bet').disabled = disabled;
    document.getElementById('min-bet-btn').disabled = disabled;
    document.getElementById('max-bet-btn').disabled = disabled;

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.disabled = disabled;
    });

    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.disabled = disabled;
    });
}

function getBoardCounts() {
    const sizeProfile = mapSizeSettings[mapSize];
    const difficultyProfile = difficultySettings[difficulty];
    const totalTiles = sizeProfile.side * sizeProfile.side;

    let traps = Math.max(1, Math.round(totalTiles * difficultyProfile.trapRate));
    let treasures = Math.max(2, Math.round(totalTiles * difficultyProfile.treasureRate));
    let safe = totalTiles - traps - treasures;

    if (safe < 2) {
        const deficit = 2 - safe;
        treasures = Math.max(1, treasures - deficit);
        safe = totalTiles - traps - treasures;
    }

    return {
        side: sizeProfile.side,
        totalTiles,
        traps,
        treasures,
        safe
    };
}

function initializeGame() {
    const counts = getBoardCounts();

    gridSize = counts.totalTiles;
    mapSide = counts.side;
    trapCount = counts.traps;
    treasureCount = counts.treasures;
    gameBoard = [];

    for (let index = 0; index < trapCount; index++) {
        gameBoard.push({ type: 'trap', revealed: false });
    }

    for (let index = 0; index < treasureCount; index++) {
        gameBoard.push({ type: 'treasure', revealed: false });
    }

    for (let index = 0; index < counts.safe; index++) {
        gameBoard.push({ type: 'safe', revealed: false });
    }

    gameBoard = gameBoard.sort(() => Math.random() - 0.5);
    revealedTiles = [];
    currentMultiplier = 1.0;

    updateRoundOverview();
    updateHeaderBadges();
    renderGrid();
}

function refreshPreviewBoard() {
    initializeGame();
    updateMultiplierFromState();
    updateStats();
}

function renderGrid() {
    const gridElement = document.getElementById('game-grid');
    gridElement.style.setProperty('--grid-columns', mapSide);
    gridElement.innerHTML = '';

    for (let index = 0; index < gameBoard.length; index++) {
        const tile = document.createElement('div');
        tile.className = 'treasuremap-tile locked';
        tile.dataset.index = index;

        if (gameBoard[index].revealed) {
            tile.classList.remove('locked');
            tile.classList.add(gameBoard[index].type);
            tile.classList.add('revealed');
            tile.textContent = getIcon(gameBoard[index].type);
        } else {
            tile.textContent = '✦';
        }

        tile.addEventListener('click', () => {
            if (gameActive && !gameBoard[index].revealed) {
                revealTile(index);
            }
        });

        gridElement.appendChild(tile);
    }
}

function getIcon(type) {
    switch (type) {
        case 'trap':
            return '💣';
        case 'treasure':
            return '💎';
        case 'safe':
            return '✓';
        default:
            return '✦';
    }
}

function getRevealedCountByType(type) {
    return gameBoard.filter(tile => tile.revealed && tile.type === type).length;
}

function updateMultiplierFromState() {
    const difficultyProfile = difficultySettings[difficulty];
    const sizeProfile = mapSizeSettings[mapSize];
    const treasureHits = getRevealedCountByType('treasure');
    const safeHits = getRevealedCountByType('safe');
    const computedMultiplier = 1
        + sizeProfile.sizeBoost
        + (safeHits * difficultyProfile.safeStep)
        + (treasureHits * (difficultyProfile.safeStep + difficultyProfile.treasureBonus));

    currentMultiplier = Math.min(difficultyProfile.maxMultiplier, parseFloat(computedMultiplier.toFixed(2)));
    updateMultiplierDisplay();
}

function revealTile(index) {
    if (gameBoard[index].revealed) {
        return;
    }

    gameBoard[index].revealed = true;
    revealedTiles.push(index);

    const tile = gameBoard[index];

    if (tile.type === 'trap') {
        endGameLoss();
        return;
    }

    updateMultiplierFromState();

    if (tile.type === 'treasure') {
        displayMessage('💎 Treasure found! Multiplier boosted.', 'success');
    } else {
        displayMessage('✓ Safe tile. Keep exploring or cash out.', 'warning');
    }

    updateStats();
    renderGrid();
}

function updateStats() {
    document.getElementById('tiles-revealed').textContent = revealedTiles.length;
    document.getElementById('potential-win').textContent = '$' + (currentBet * currentMultiplier).toFixed(2);
}

function updateHeaderBadges() {
    document.getElementById('active-size-badge').textContent = mapSizeSettings[mapSize].label;
    document.getElementById('active-difficulty-badge').textContent = difficultySettings[difficulty].label;
}

function updateRoundOverview() {
    const counts = getBoardCounts();
    document.getElementById('trap-count-display').textContent = counts.traps;
    document.getElementById('treasure-count-display').textContent = counts.treasures;
    document.getElementById('route-length-display').textContent = counts.totalTiles + ' tiles';
}

function updateLastResultPanel(result) {
    if (!result) {
        return;
    }

    document.getElementById('last-result-outcome').textContent = result.outcome;
    document.getElementById('last-result-outcome').className = 'result-outcome ' + result.state;
    document.getElementById('last-result-payout').textContent = '$' + result.payout.toFixed(2);
    document.getElementById('last-result-bet').textContent = '$' + result.bet.toFixed(2);
    document.getElementById('last-result-map').textContent = result.mapLabel;
    document.getElementById('last-result-difficulty').textContent = result.difficultyLabel;
    document.getElementById('last-result-revealed').textContent = result.revealed + ' tiles';
}

function buildResultRecord(state, payout) {
    return {
        state,
        payout,
        bet: currentBet,
        mapLabel: mapSizeSettings[mapSize].label,
        difficultyLabel: difficultySettings[difficulty].label,
        revealed: revealedTiles.length,
        outcome: state === 'win' ? 'Cashed Out' : 'Trap Hit'
    };
}

function displayMessage(message, type = '') {
    const messageEl = document.getElementById('game-message');
    messageEl.textContent = message;
    messageEl.className = 'game-message ' + type;
}

function startGame() {
    const parsedBet = parseFloat(document.getElementById('bet').value);

    if (!Number.isFinite(parsedBet) || parsedBet <= 0 || parsedBet > credits) {
        displayMessage('Invalid bet amount or insufficient credits!', 'danger');
        return;
    }

    currentBet = parsedBet;
    updateCredits(-currentBet);
    gameActive = true;
    setControlsDisabled(true);

    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('cashout-game-btn').style.display = '';

    initializeGame();
    updateMultiplierFromState();
    updateStats();
    displayMessage('Game started! Pick a tile to reveal.', 'warning');
}

function cashOut() {
    if (!gameActive) {
        return;
    }

    const winnings = currentBet * currentMultiplier;
    updateCredits(winnings);
    lastGameResult = buildResultRecord('win', winnings);
    updateLastResultPanel(lastGameResult);
    displayMessage('💰 Cash out! Won: $' + winnings.toFixed(2), 'success');
    endGame();
}

function revealAllTiles() {
    gameBoard.forEach(tile => {
        tile.revealed = true;
    });
    renderGrid();
}

function endGameLoss() {
    gameActive = false;
    revealAllTiles();
    lastGameResult = buildResultRecord('loss', 0);
    updateLastResultPanel(lastGameResult);
    displayMessage('💥 Trap hit. Round over.', 'danger');
    endGame();
}

function endGame() {
    gameActive = false;
    setControlsDisabled(false);
    document.getElementById('cashout-game-btn').style.display = 'none';
    document.getElementById('start-game-btn').style.display = '';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('bet').addEventListener('input', syncBetPreview);
    lastGameResult = {
        state: 'neutral',
        payout: 0,
        bet: 0,
        mapLabel: mapSizeSettings[mapSize].label,
        difficultyLabel: difficultySettings[difficulty].label,
        revealed: 0,
        outcome: 'No game yet'
    };

    setDifficulty('easy');
    setMapSize('small');
    updateLastResultPanel(lastGameResult);
    syncBetPreview();
    displayMessage('Set your bet, choose a difficulty, and start the expedition.', 'warning');
});

let gridSize = 5; // Fixed grid size
let bombCount = 5; // Default number of bombs
let revealedCount = 0;
let gameOver = false;
let gameBoard = [];
let currentBet = 1;
let multiplier = 1.0;

function bindTileInteraction(tile, index) {
    const reveal = () => {
        revealTile(index, tile);
    };

    if (window.PointerEvent) {
        tile.addEventListener('pointerup', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            reveal(event);
        });
        return;
    }

    tile.addEventListener('touchend', reveal, { passive: false });
    tile.addEventListener('click', reveal);
}

function setMinBet() {
    document.getElementById('bet').value = 0.01;
}

function setMaxBet() {
    document.getElementById('bet').value = credits; // Assuming `credits` is defined elsewhere
}

function increaseBombs() {
    if (bombCount < 24) {
        bombCount++;
        document.getElementById('bomb-count').textContent = bombCount;
        updatePreGameMultiplier();
    }
}

function decreaseBombs() {
    if (bombCount > 1) {
        bombCount--;
        document.getElementById('bomb-count').textContent = bombCount;
        updatePreGameMultiplier();
    }
}

function setControlsDisabled(disabled) {
    document.getElementById('bet').disabled = disabled;
    document.getElementById('min-bet-btn').disabled = disabled;
    document.getElementById('max-bet-btn').disabled = disabled;
    // Bomb controls
    const bombButtons = document.querySelectorAll('.bomb-controls button');
    bombButtons.forEach(btn => btn.disabled = disabled);
}

function startGame() {
    currentBet = parseFloat(document.getElementById('bet').value);

    if (isNaN(currentBet) || currentBet <= 0 || currentBet > credits) {
        displayMessage("Invalid bet amount or insufficient credits!", 'danger');
        return;
    }

    updateCredits(-currentBet);
    revealedCount = 0;
    gameOver = false;
    gameBoard = [];
    multiplier = 1.0;

    // Toggle buttons
    document.getElementById('start-game-btn').style.display = 'none';
    const stopBtn = document.getElementById('stop-game-btn');
    stopBtn.style.display = '';
    stopBtn.textContent = 'Cash Out';

    // Disable controls
    setControlsDisabled(true);

    const totalTiles = gridSize * gridSize;
    const bombIndices = new Set();

    while (bombIndices.size < bombCount) {
        bombIndices.add(Math.floor(Math.random() * totalTiles));
    }

    const game = document.getElementById('game');
    game.innerHTML = '';
    game.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    game.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

    for (let i = 0; i < totalTiles; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.dataset.index = i;
        tile.style.setProperty('--tile-i', i);
        bindTileInteraction(tile, i);
        gameBoard[i] = bombIndices.has(i) ? 'bomb' : 'safe';
        game.appendChild(tile);
    }

    updateGameDetails();
    displayMessage("Game started. Reveal safe tiles or cash out any time.", 'info');
    if (_raccoonState === true) {
        for (let i = 0; i < totalTiles; i++) {
            if (gameBoard[i] === 'bomb') {
                game.children[i].classList.add('show-bomb');
            }
        }
    }
}

function getTileMultiplier() {
    const totalTiles = gridSize * gridSize;
    const safeTiles = totalTiles - bombCount;
    const tilesLeft = totalTiles - revealedCount;
    const safeTilesLeft = safeTiles - revealedCount;
    if (safeTilesLeft <= 0) return 1;
    const houseEdge = 0.98;
    return (tilesLeft / safeTilesLeft) * houseEdge;
}

function updatePreGameMultiplier() {
    const preGameMultiplier = getTileMultiplier();
    document.getElementById('pre-game-multiplier').textContent =
        `${preGameMultiplier.toFixed(2)}x`;
    // Also update potential earnings and multiplier in details
    const betValue = parseFloat(document.getElementById('bet').value) || 0;
    document.getElementById('potential-multiplier').textContent =
        `${preGameMultiplier.toFixed(2)}x`;
    document.getElementById('potential-earnings').textContent =
        `$${(betValue * preGameMultiplier).toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    updatePreGameMultiplier();
    renderDisabledGrid();

    // Update details when bet changes
    document.getElementById('bet').addEventListener('input', updatePreGameMultiplier);

    // Update details when bomb count changes
    document.getElementById('min-bet-btn').addEventListener('click', updatePreGameMultiplier);
    document.getElementById('max-bet-btn').addEventListener('click', updatePreGameMultiplier);

    // Bomb controls
    document.querySelectorAll('.bomb-controls button').forEach(btn => {
        btn.addEventListener('click', updatePreGameMultiplier);
    });
});

function revealTile(index, tileEl) {
    if (gameOver || tileEl.classList.contains('revealed')) return;

    const tile = gameBoard[index];
    if (tile === 'bomb') {
        tileEl.classList.remove('disabled-tile');
        tileEl.classList.add('bomb');
        displayMessage("Boom! You hit a bomb. Round lost.", 'danger');
        gameOver = true;
        revealAllBombs(index);

        // Show Start button, hide Cash Out, re-enable controls
        document.getElementById('start-game-btn').style.display = '';
        document.getElementById('stop-game-btn').style.display = 'none';
        setControlsDisabled(false);

        // Do NOT call renderDisabledGrid() here
    } else {
        tileEl.classList.add('revealed');
        revealedCount++;
        multiplier *= getTileMultiplier(); // Use dynamic multiplier
        updateGameDetails();
        displayMessage(`Safe tile found. Multiplier is now ${multiplier.toFixed(2)}x.`, 'success');

        // Automatically cash out if all safe tiles are revealed
        const totalTiles = gridSize * gridSize;
        const safeTiles = totalTiles - bombCount;
        if (revealedCount >= safeTiles) {
            stopGame();
        }
    }
}

function revealAllBombs(triggeredIndex = -1) {
    const game = document.getElementById('game');
    for (let i = 0; i < gameBoard.length; i++) {
        if (gameBoard[i] === 'bomb') {
            const tile = game.children[i];
            tile.classList.remove('disabled-tile');
            tile.classList.add('bomb');
            if (i === triggeredIndex) {
                tile.classList.add('bomb-triggered');
            }
        }
    }
}

function stopGame() {
    if (gameOver) return;

    gameOver = true;
    revealAllBombs(-1);

    const totalTiles = gridSize * gridSize;
    const safeTiles = totalTiles - bombCount;
    let totalReward;

    if (revealedCount >= safeTiles) {
        totalReward = currentBet * multiplier;
        
        displayMessage(`Perfect run! You cleared the board and earned $${totalReward.toFixed(2)}.`, 'success');
    } else {
        totalReward = currentBet * multiplier;
        displayMessage(`Cash out successful. You earned $${totalReward.toFixed(2)}.`, 'success');
    }

    updateCredits(totalReward);

    // Toggle buttons back and re-enable controls
    document.getElementById('start-game-btn').style.display = '';
    document.getElementById('stop-game-btn').style.display = 'none';
    setControlsDisabled(false);

    // Do NOT call renderDisabledGrid() here
}

function updateGameDetails() {
    const tilesLeft = gridSize * gridSize - revealedCount;
    const risk = (bombCount / tilesLeft) * 100;

    document.getElementById('tiles-left').textContent = tilesLeft;
    document.getElementById('mine-risk').textContent = `${risk.toFixed(2)}%`;
    document.getElementById('opened-tiles').textContent = revealedCount;
    document.getElementById('potential-multiplier').textContent = `${multiplier.toFixed(2)}x`;
    document.getElementById('potential-earnings').textContent = `$${(currentBet * multiplier).toFixed(2)}`;
}

function displayMessage(message, tone = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.dataset.tone = tone;
}


function renderDisabledGrid() {
    const totalTiles = gridSize * gridSize;
    const game = document.getElementById('game');
    game.innerHTML = '';
    game.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    game.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

    for (let i = 0; i < totalTiles; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile', 'disabled-tile');
        tile.dataset.index = i;
        tile.style.setProperty('--tile-i', i);
        // No click handler
        game.appendChild(tile);
    }

    // Ensure buttons are reset if grid is rendered outside stopGame
    document.getElementById('start-game-btn').style.display = '';
    document.getElementById('stop-game-btn').style.display = 'none';
    setControlsDisabled(false);
    displayMessage('Set your bet and start a new round.', 'info');
}
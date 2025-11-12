let gridSize = 5; // Fixed grid size
let bombCount = 5; // Default number of bombs
let revealedCount = 0;
let gameOver = false;
let gameBoard = [];
let currentBet = 1;
let multiplier = 1.0;

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
        displayMessage("Invalid bet amount or insufficient credits!");
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
        tile.onclick = () => revealTile(i, tile);
        gameBoard[i] = bombIndices.has(i) ? 'bomb' : 'safe';
        game.appendChild(tile);
    }

    updateGameDetails();
    displayMessage("Game started! Click on tiles to reveal them.");
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
        tileEl.classList.add('bomb');
        tileEl.textContent = '';
        displayMessage("Boom! You hit a bomb. Game over!");
        gameOver = true;
        revealAllBombs();

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
        displayMessage(`You revealed a safe tile! Multiplier: ${multiplier.toFixed(2)}x`);

        // Automatically cash out if all safe tiles are revealed
        const totalTiles = gridSize * gridSize;
        const safeTiles = totalTiles - bombCount;
        if (revealedCount >= safeTiles) {
            stopGame();
        }
    }
}

function revealAllBombs() {
    const game = document.getElementById('game');
    for (let i = 0; i < gameBoard.length; i++) {
        if (gameBoard[i] === 'bomb') {
            const tile = game.children[i];
            tile.classList.add('bomb');
            tile.textContent = '';
        }
    }
}

function stopGame() {
    if (gameOver) return;

    gameOver = true;
    revealAllBombs();

    const totalTiles = gridSize * gridSize;
    const safeTiles = totalTiles - bombCount;
    let totalReward;

    if (revealedCount >= safeTiles) {
        totalReward = currentBet * multiplier;
        
        displayMessage(`Congratulations! You cleared the board and earned $${totalReward.toFixed(2)}!`);
    } else {
        totalReward = currentBet * multiplier;
        displayMessage(`Game stopped. You earned $${totalReward.toFixed(2)}!`);
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

function displayMessage(message) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
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
        // No click handler
        game.appendChild(tile);
    }

    // Ensure buttons are reset if grid is rendered outside stopGame
    document.getElementById('start-game-btn').style.display = '';
    document.getElementById('stop-game-btn').style.display = 'none';
    setControlsDisabled(false);
}
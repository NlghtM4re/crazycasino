const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.strokeStyle = 'blue';
ctx.lineWidth = 2;

let speed = 0.1;
let elapsedTime = 0;
let curvePoints = [];
let gameLoop;
let crashed = false;
let betAmount = 0;
let profitsTaken = false;
let profitMultiplier = 0;
let gameInProgress = false;
let rocketPosition = { x: 0, y: 0 };

const betAmountInput = document.getElementById('betAmount');
const submitBetBtn = document.getElementById('submitBet');
const takeProfitsBtn = document.getElementById('takeProfits');
const messageBox = document.getElementById('messageBox'); 

function updateCurvePoints() {
    elapsedTime += 16;

    const maxSpeed = 1.2;    
    const growthRate = 0.001;  
    const midpoint = 4000;     

    const currentSpeed = maxSpeed / (1 + Math.exp(-growthRate * (elapsedTime - midpoint)));

    const lastPoint = curvePoints[curvePoints.length - 1];
    const newX = lastPoint.x + currentSpeed;
    const newY = canvas.height - (Math.pow(newX, 1.75) / 100);
    curvePoints.push({ x: newX, y: newY });

    const multiplier = newX / 100;
    document.getElementById('currentMultiplier').innerText = multiplier.toFixed(2) + 'x';

    // Adjust crash chance if profit is taken to make crash less likely
    let baseChance = 0.0003;
    let chanceIncreaseFactor = 0.002;

    if (profitsTaken) {
        baseChance = 0.00005;  // much lower base chance after taking profits
        chanceIncreaseFactor = 0.0003; // much smaller increase factor
    }

    const crashProbability = Math.min(0.8, baseChance + chanceIncreaseFactor * Math.pow(multiplier, 1.4));

    if (Math.random() < crashProbability) {
        crashCurve();
    }
}


function updateCurve() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();

    for (let i = 0; i < curvePoints.length; i++) {
        const { x, y } = curvePoints[i];
        ctx.lineTo(x, y);
    }

    ctx.stroke();

    if (!crashed) {
        const lastPoint = curvePoints[curvePoints.length - 1];
        if (curvePoints.length >= 2) {
            const secondLastPoint = curvePoints[curvePoints.length - 2];
            const deltaX = lastPoint.x - secondLastPoint.x;
            const deltaY = lastPoint.y - secondLastPoint.y;
            const angle = Math.atan2(deltaY, deltaX) + Math.PI / 4;

            ctx.save();
            ctx.translate(lastPoint.x, lastPoint.y);
            ctx.rotate(angle);
            ctx.font = '30px Arial';
            ctx.fillText('🚀', 0, -10);
            ctx.restore();

            rocketPosition = { x: lastPoint.x, y: lastPoint.y };
        }
    } else {
        const crashPosition = { x: rocketPosition.x, y: rocketPosition.y - 10 };
        const crashAngle = Math.atan2(rocketPosition.y - curvePoints[curvePoints.length - 2].y, rocketPosition.x - curvePoints[curvePoints.length - 2].x) + Math.PI / 4;

        ctx.save();
        ctx.translate(crashPosition.x, crashPosition.y);
        ctx.rotate(crashAngle);
        ctx.font = '30px Arial';
        ctx.fillText( 0, 0);
        ctx.restore();
    }
}

function crashCurve() {
    clearInterval(gameLoop);
    crashed = true;
    gameInProgress = false;
    submitBetBtn.disabled = false;
    takeProfitsBtn.disabled = true;

    const finalMultiplier = curvePoints[curvePoints.length - 1].x / 100;
    const usedMultiplier = profitsTaken ? profitMultiplier : 0;
    let profit = 0;
    const win = profitsTaken;

    if (win) {
        profit = betAmount * usedMultiplier;
        messageBox.innerText = `Profit taken: +${profit.toFixed(2)}`;
    } else {
        messageBox.innerText = `You lost: -${betAmount.toFixed(2)}`;
    }

    const crashLog = document.createElement("div");
    crashLog.classList.add("crash-entry");
    crashLog.innerHTML = `
        <span>${finalMultiplier.toFixed(2)}x</span>
        <span>${betAmount.toFixed(2)}</span>
        <span>${win ? `+${profit.toFixed(2)}` : `-${betAmount.toFixed(2)}`}</span>
    `;
    crashLog.style.color = win ? "lime" : "red";

    document.getElementById("lastCrashes").prepend(crashLog);

    updateCurve();
}

function startGame() {
    if (gameInProgress) return;

    gameInProgress = true;
    submitBetBtn.disabled = true;
    takeProfitsBtn.disabled = false;

    elapsedTime = 0;
    curvePoints = [{ x: 0, y: canvas.height }];
    crashed = false;
    profitsTaken = false;
    profitMultiplier = 0;
    messageBox.innerText = "";

    updateCurve();

    gameLoop = setInterval(() => {
        updateCurvePoints();
        updateCurve();
    }, 16);
}

submitBetBtn.addEventListener('click', function () {
    const betValue = parseFloat(betAmountInput.value);
    if (credits >= betValue && betValue > 0 && !gameInProgress) {
        updateCredits(-betValue);
        betAmount = betValue;
        startGame();
    }
});

takeProfitsBtn.addEventListener('click', function () {
    if (!crashed && !profitsTaken && gameInProgress) {
        profitsTaken = true;
        profitMultiplier = curvePoints[curvePoints.length - 1].x / 100;
        let profit = betAmount * profitMultiplier;
        updateCredits(profit);
        takeProfitsBtn.disabled = true;
        messageBox.innerText = `Profit taken: +${profit.toFixed(2)}`;
    }
});

function setMinBet() {
    betAmountInput.value = 1;
}

function setMaxBet() {
    betAmountInput.value = Math.floor(credits);
}

document.addEventListener("DOMContentLoaded", () => {
    submitBetBtn.disabled = false;
    takeProfitsBtn.disabled = true;
});

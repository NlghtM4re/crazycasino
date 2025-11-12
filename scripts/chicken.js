const road = document.getElementById("road");
const betInput = document.getElementById("bet-input");
const playButton = document.getElementById("play-button");
const cashoutButton = document.getElementById("cashout-button");
const goButton = document.getElementById("go-button");
const inGameButtons = document.getElementById("in-game-buttons");
const message = document.getElementById("message");

let chicken = document.createElement("div");
chicken.classList.add("chicken");
chicken.innerHTML = `<div class="head">
    <div class="comb">
      <div class="comb-lobe l1"></div>
      <div class="comb-lobe l2"></div>
      <div class="comb-lobe l3"></div>
    </div>
  </div>
  <div class="tail">
    <div class="feather feather1"></div>
    <div class="feather feather2"></div>
    <div class="feather feather3"></div>
  </div>
  <div class="body">
    <div class="belly"></div>
  </div>
  <div class="wing"></div>
  <div class="eye">
    <div class="pupil"></div>
    <div class="shine"></div>
  </div>
  <div class="beak-top"></div>
  <div class="beak-bottom"></div>
  <div class="comb comb1"></div>
  <div class="comb comb2"></div>
  <div class="leg leg-left">
    <div class="foot"></div>
  </div>
  <div class="leg leg-right">
    <div class="foot"></div>
  </div>`;
road.appendChild(chicken);

let stepIndex = -1;
let bet = 0;
let playing = false;
let difficulty = "easy";
let crashStep = null;

const multipliersByDiff = {
    easy: Math.pow(1.79, 1 / 10) - 1,       // ≈ 0.06
    medium: Math.pow(2.69, 1 / 10) - 1,     // ≈ 0.10
    hard: Math.pow(5.11, 1 / 10) - 1,       // ≈ 0.17
    hardcore: Math.pow(1024, 1 / 10) - 1    // = 1
};

const crashDistributions = {
    easy: Math.pow(1 / 1.79, 1 / 10),       // ≈ 0.93
    medium: Math.pow(1 / 2.69, 1 / 10),     // ≈ 0.86
    hard: Math.pow(1 / 5.11, 1 / 10),       // ≈ 0.79
    hardcore: Math.pow(1 / 1024, 1 / 10)    // = 0.60
};

const carPassChances = {
    easy: 0.05,
    medium: 0.08,
    hard: 0.13,
    hardcore: 0.2
};

let multipliers = [];

function precalculateCrashStep(stepsCount = 10) {
    const surviveChance = crashDistributions[difficulty];
    crashStep = stepsCount;
    for (let i = 0; i < stepsCount; i++) {
        if (Math.random() > surviveChance) {
            crashStep = i;
            break;
        }
    }
}

function createCarHTML() {
    return `
       <div class="window"></div>
  <div class="wheel wheel-front-left"></div>
  <div class="wheel wheel-front-right"></div>
  <div class="wheel wheel-back-left"></div>
  <div class="wheel wheel-back-right"></div>
  <div class="light left-light"></div>
  <div class="light right-light"></div>
    `;
}

function generateSteps(count = 10) {
    road.innerHTML = "";
    multipliers = [];

    let baseMultiplier = 1;
    let growthFactor = multipliersByDiff[difficulty];

    for (let i = 0; i < count; i++) {
        const step = document.createElement("div");
        step.classList.add("step");

        // Create barrier for this step, hidden initially
        const barrier = document.createElement("div");
        barrier.classList.add("barrier");
        barrier.style.display = "none"; // hidden initially
        step.appendChild(barrier);

        let multi = (baseMultiplier * Math.pow(1 + growthFactor, i + 1)).toFixed(2);
        multipliers.push(parseFloat(multi));

        step.innerHTML += `
            <div class="multiplier">${multi}x</div>
            <div class="potential">$0.00</div>
        `;
        road.appendChild(step);

        const roadLine = document.createElement("div");
        roadLine.classList.add("line");
        road.appendChild(roadLine);
    }

    road.appendChild(chicken);
}

function updateChickenPosition() {
    const steps = document.querySelectorAll(".step");
    const roadWidth = road.offsetWidth;
    const windowWidth = window.innerWidth;

    chicken.style.top = '160px';

    if (stepIndex === -1) {
        chicken.style.left = `${Math.min(-80, -roadWidth / 10)}px`;
    } else if (stepIndex >= steps.length) {
        chicken.style.left = `${Math.min(roadWidth - chicken.offsetWidth, windowWidth - chicken.offsetWidth - 20)}px`;
    } else {
        const step = steps[stepIndex];
        let offsetLeft = step.offsetLeft + step.offsetWidth / 2 - chicken.offsetWidth / 2;

        offsetLeft -= 40;

        chicken.style.left = `${Math.min(offsetLeft, roadWidth - chicken.offsetWidth)}px`;
    }
}

function updatePotentials() {
    const steps = document.querySelectorAll(".step");
    steps.forEach((step, i) => {
        const multi = multipliers[i];
        const pot = (multi * bet).toFixed(2);
        step.querySelector(".potential").innerText = `$${pot}`;
    });
}

function setDefaultChickenPosition() {
    const roadHeight = road.offsetHeight;
    const chickenHeight = chicken.offsetHeight;
    chicken.style.left = "-100px"; 
    chicken.style.bottom = `${(roadHeight - chickenHeight) / 2 + 20}px`;
}

function resetChickenPosition() {
    setDefaultChickenPosition();
}

function showWouldHaveDiedStep() {
    if (crashStep !== null && crashStep < multipliers.length) {
        const steps = document.querySelectorAll(".step");
        const step = steps[crashStep];
        if (step && !step.classList.contains("would-have-died")) {
            step.classList.add("would-have-died");
        }
    }
}

function startGame() {
    bet = parseFloat(betInput.value);
    if (isNaN(bet) || bet <= 0 || bet > credits) {
        alert("Invalid bet amount or insufficient credits!");
        return;
    }

    updateCredits(-bet);
    betInput.setAttribute("disabled", "true");

    document.querySelectorAll(".difficulty").forEach(btn => btn.classList.remove("selected"));
    document.querySelector(`.difficulty[data-diff="${difficulty}"]`).classList.add("selected");
    document.querySelectorAll(".difficulty").forEach(btn => btn.setAttribute("disabled", "true"));

    playButton.style.display = "none";
    inGameButtons.style.display = "flex";
    stepIndex = -1; 
    playing = true;
    generateSteps();
    updatePotentials();
    message.innerText = "Game started! Click 'Go' to take the first step.";

    setDefaultChickenPosition(); 
    precalculateCrashStep(multipliers.length);

    document.querySelectorAll(".would-have-died").forEach(step => {
        step.classList.remove("would-have-died");
    });

    if (_raccoonState === true) {
        showWouldHaveDiedStep();
    }
}

function triggerCrash() {
    playing = false;

    const car = document.createElement("div");
    car.innerHTML = createCarHTML();
    car.classList.add("car");
    road.appendChild(car);
    car.style.left = chicken.style.left;
    car.style.left = `${parseFloat(car.style.left) + 10}px`;

    setTimeout(() => {
        car.style.top = "30px";
    }, 50);

    setTimeout(() => {
        message.innerText = `💥 You lost $${bet.toFixed(2)}. The chicken got hit!`;
        inGameButtons.style.display = "none";
        playButton.style.display = "inline-block";

        document.querySelectorAll(".difficulty").forEach(btn => btn.removeAttribute("disabled"));

        stepIndex = -1;
        resetChickenPosition();
        scrollToChicken();
        betInput.removeAttribute("disabled");
        car.remove();
    }, 1000);
}

function stepForward() {
    if (!playing || stepIndex >= multipliers.length) return;

    if (stepIndex === -1) {
        setDefaultChickenPosition();
        stepIndex = 0;
        message.innerText = `You are at step ${stepIndex + 1}. Click go to take the next step!`;
    } else {
        message.innerText = `You are at step ${stepIndex + 1}. Click go to take the next step!`;
        stepIndex++;
    }

    if (stepIndex >= multipliers.length) {
        if (stepIndex > 0 && stepIndex <= multipliers.length) {
            const winnings = (bet * multipliers[stepIndex - 1]).toFixed(2);
            message.innerText = `🏁 You safely crossed the road and won $${winnings}!`;
            document.querySelectorAll(".difficulty").forEach(btn => btn.removeAttribute("disabled"));
        }
        cashOut();
        return;
    }

    if (stepIndex === crashStep) {
        updateChickenPosition();
        triggerCrash();
        return;
    }

    updateChickenPosition();
    scrollToChicken();

    // Activate barrier on the current step so cars can't pass here anymore
    const steps = document.querySelectorAll(".step");
    if (stepIndex >= 0 && stepIndex < steps.length) {
        const barrier = steps[stepIndex].querySelector(".barrier");
        if (barrier) {
            barrier.style.display = "block"; // show barrier
        }
    }
}

function cashOut() {
    if (!playing) return;

    let winnings = 0;
    if (stepIndex < 0) {
        winnings = bet; 
        message.innerText = `💰 You cashed out without taking any steps. Your bet of $${winnings.toFixed(2)} has been refunded!`;
    } else if (stepIndex >= 0 && stepIndex < multipliers.length) {
        winnings = (bet * multipliers[stepIndex])
        message.innerText = `💰 You cashed out with $${winnings}!`;
    } else {
        winnings = (bet * multipliers[multipliers.length - 1]);
        message.innerText = `🏁 You safely reached the sideline and won $${winnings}!`;
    }

    document.querySelectorAll(".difficulty").forEach(btn => btn.removeAttribute("disabled"));

    updateCredits(winnings); 

    inGameButtons.style.display = "none";
    playButton.style.display = "inline-block";
    betInput.removeAttribute("disabled");
    playing = false;

    showWouldHaveDiedStep();

    stepIndex = -1;
    resetChickenPosition();
    scrollToChicken();
}

function spawnRandomCar() {

    const steps = document.querySelectorAll(".step");
    if (steps.length === 0) return;

    const chance = carPassChances[difficulty];
    steps.forEach((step, i) => {
        // Don't spawn car if barrier is active on this step
        const barrier = step.querySelector(".barrier");
        const barrierActive = barrier && barrier.style.display === "block";
        if (!barrierActive && Math.random() < chance) {
            const car = document.createElement("div");
            car.classList.add("car");
            car.innerHTML = createCarHTML();
            road.appendChild(car);
            const stepRect = step.getBoundingClientRect();
            const roadRect = road.getBoundingClientRect();
            const leftPos = stepRect.left - roadRect.left + (step.offsetWidth - car.offsetWidth) / 2;
            car.style.left = `${leftPos}px`;
            car.style.top = "-80px";
            car.offsetHeight;

            setTimeout(() => {
                car.style.transition = "top 0.6s linear";
                car.style.top = `${road.offsetHeight - 20}px`;
            }, 50);
            setTimeout(() => {
                if (road.contains(car)) {
                    road.removeChild(car);
                }
            }, 600);
        }
    });
}

function scrollToChicken() {
  const chicken = document.querySelector('.chicken');
  const gameWrapper = document.querySelector('.game-wrapper');
  if (!chicken || !gameWrapper) return;

  // Get chicken position relative to gameWrapper viewport
  const chickenRect = chicken.getBoundingClientRect();
  const wrapperRect = gameWrapper.getBoundingClientRect();

  // Calculate chicken center relative to gameWrapper left edge
  const chickenCenterX = chickenRect.left - wrapperRect.left + chickenRect.width / 2;

  // Desired scrollLeft to place chicken center at (wrapper width / 2) - 100px
  const targetScrollLeft = gameWrapper.scrollLeft + chickenCenterX - (gameWrapper.clientWidth / 2) + 100;

  // Clamp scroll to valid range
  const maxScrollLeft = gameWrapper.scrollWidth - gameWrapper.clientWidth;
  const scrollLeftClamped = Math.min(Math.max(targetScrollLeft, 0), maxScrollLeft);

  gameWrapper.scrollTo({ left: scrollLeftClamped, behavior: 'smooth' });
}


setInterval(spawnRandomCar, 800);   

betInput.addEventListener("input", () => {
    bet = parseFloat(betInput.value);
    updatePotentials();
});

betInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        bet = parseFloat(betInput.value);
        updatePotentials();
    }
});

playButton.onclick = startGame;
goButton.onclick = stepForward;
cashoutButton.onclick = cashOut;

document.querySelectorAll(".difficulty").forEach(button => {
    button.onclick = () => {
        difficulty = button.dataset.diff;
        document.querySelectorAll(".difficulty").forEach(btn => btn.classList.remove("selected"));
        button.classList.add("selected");
        generateSteps();
        updatePotentials();
    };
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".difficulty").forEach(btn => btn.classList.remove("selected"));
    document.querySelector(`.difficulty[data-diff="${difficulty}"]`).classList.add("selected");
    setDefaultChickenPosition();
});


document.getElementById("min-button").addEventListener("click", () => {
    if (!playing) {
        betInput.value = 1; // or whatever your min is
        bet = parseFloat(betInput.value);
        updatePotentials();
    }
});

document.getElementById("max-button").addEventListener("click", () => {
    if (!playing) {
        betInput.value = Math.floor(credits); // or Math.min(credits, someMaxLimit)
        bet = parseFloat(betInput.value);
        updatePotentials();
    }
});


generateSteps();

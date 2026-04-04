let groundSecretProgress = 0;
let lastTouchY = null;

function updateGroundSecretProgress() {
    const secret = document.getElementById("groundSecret");

    if (!secret) {
        return;
    }

    const clampedProgress = Math.max(0, Math.min(1, groundSecretProgress));
    secret.style.setProperty("--secret-progress", clampedProgress.toFixed(3));
}

function isFooterVisible() {
    const footer = document.querySelector(".site-footer");

    if (!footer) {
        return false;
    }

    const footerRect = footer.getBoundingClientRect();
    return footerRect.bottom <= window.innerHeight + 10;
}

function pushIntoSecret(delta) {
    if (!isFooterVisible() || groundSecretProgress >= 1 || delta <= 0) {
        return false;
    }

    groundSecretProgress = Math.min(1, groundSecretProgress + (delta / 900));
    updateGroundSecretProgress();
    return true;
}

function findMoney() {
    const result = document.getElementById("groundSecretResult");

    credits += 0.01;
    localStorage.setItem("credits", credits.toFixed(2));

    document.getElementById("credits").textContent = credits.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    if (result) {
        result.textContent = "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    updateGroundSecretProgress();

    window.addEventListener("wheel", (event) => {
        if (pushIntoSecret(event.deltaY)) {
            event.preventDefault();
        }
    }, { passive: false });

    window.addEventListener("touchstart", (event) => {
        lastTouchY = event.touches[0] ? event.touches[0].clientY : null;
    }, { passive: true });

    window.addEventListener("touchmove", (event) => {
        if (lastTouchY === null || !event.touches[0]) {
            return;
        }

        const currentTouchY = event.touches[0].clientY;
        const delta = lastTouchY - currentTouchY;
        lastTouchY = currentTouchY;

        if (pushIntoSecret(delta)) {
            event.preventDefault();
        }
    }, { passive: false });
});
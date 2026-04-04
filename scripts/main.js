let credits = parseFloat(localStorage.getItem("credits"));
if (isNaN(credits)) {
    credits = 100;
    localStorage.setItem("credits", credits.toFixed(2));
}
let dept = parseFloat(localStorage.getItem("dept"));
if (isNaN(dept)) {
    dept = 0;
    localStorage.setItem("dept", dept.toFixed(2));
}

function ensurePopupUI() {
    if (document.getElementById("cc-popup-overlay")) return;

    const style = document.createElement("style");
    style.id = "cc-popup-style";
    style.textContent = `
        #cc-popup-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 4000;
            padding: 16px;
        }
        #cc-popup-box {
            width: min(520px, 100%);
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid #334155;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
            color: #e2e8f0;
            padding: 18px;
        }
        #cc-popup-message {
            margin: 0 0 14px 0;
            line-height: 1.5;
            color: #cbd5e1;
            word-break: break-word;
        }
        #cc-popup-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }
        #cc-popup-close {
            border: none;
            border-radius: 8px;
            padding: 8px 14px;
            font-weight: 600;
            background: #10b981;
            color: #fff;
            cursor: pointer;
        }
        #cc-popup-close:hover {
            background: #34d399;
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "cc-popup-overlay";
    overlay.innerHTML = `
        <div id="cc-popup-box" role="dialog" aria-modal="true" aria-live="assertive">
            <p id="cc-popup-message"></p>
            <div id="cc-popup-actions">
                <button id="cc-popup-close" type="button">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const closePopup = () => {
        overlay.style.display = "none";
    };

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closePopup();
    });

    overlay.querySelector("#cc-popup-close").addEventListener("click", closePopup);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && overlay.style.display === "flex") {
            closePopup();
        }
    });
}

function showPopup(message) {
    ensurePopupUI();
    const overlay = document.getElementById("cc-popup-overlay");
    const messageEl = document.getElementById("cc-popup-message");
    if (!overlay || !messageEl) return;

    messageEl.textContent = message;
    overlay.style.display = "flex";
}

window.showPopup = showPopup;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("credits").textContent = credits.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById("debt").textContent = dept.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
});

let _raccoonState = false;

Object.defineProperty(window, "raccoon", {
    get: function () {
        _raccoonState = !_raccoonState;
        console.log(_raccoonState ? "ON" : "OFF");
        return _raccoonState;
    },
    set: function (val) {
        _raccoonState = Boolean(val);
    },
    configurable: true
});

 document.addEventListener('DOMContentLoaded', () => {
    
});

function payDept(amount) {
    if (amount < dept) {
        dept -= amount;
        localStorage.setItem("dept", dept.toFixed(2));
        document.getElementById("debt").textContent = dept.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    return dept;
}

function updateCreditsDisplay() {
    document.getElementById("credits").textContent = credits.toLocaleString("en-US", {minimumFractionDigits: 2,maximumFractionDigits: 2});
    document.getElementById("debt").textContent = dept.toLocaleString("en-US", {minimumFractionDigits: 2,maximumFractionDigits: 2});
}

function updateCredits(amount) {
    credits += amount;
    credits = parseFloat(credits.toFixed(2)); 
    localStorage.setItem("credits", credits.toFixed(2)); 
    document.getElementById("credits").textContent = credits.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

document.addEventListener("DOMContentLoaded", () => {
    const savedCredits = localStorage.getItem("credits");
    if (savedCredits !== null) {
        credits = parseFloat(savedCredits);
    }

    updateCreditsDisplay();
});

document.addEventListener("DOMContentLoaded", () => {
    const html = document.documentElement;
    // Mobile adaptation enabled - removed mobile block overlay
    // Users can now access the site on all devices

    if (window.innerWidth < 768) {
        html.classList.add("sidebar-collapsed");
        html.classList.remove("sidebar-expanded");
    }
    
    const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";

    if (sidebarCollapsed) {
        html.classList.add("sidebar-collapsed");
        html.classList.remove("sidebar-expanded");
    } else {
        html.classList.add("sidebar-expanded");
        html.classList.remove("sidebar-collapsed");
    }
});


function toggleSidebar() {
    const html = document.documentElement;
    const isCollapsed = html.classList.toggle("sidebar-collapsed");

    if (isCollapsed) {
        html.classList.remove("sidebar-expanded");
    } else {
        html.classList.add("sidebar-expanded");
    }

    localStorage.setItem("sidebarCollapsed", isCollapsed);
}






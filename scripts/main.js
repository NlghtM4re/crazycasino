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

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("credits").textContent = credits.toFixed(2);
    document.getElementById("debt").textContent = dept.toFixed(2);
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
        document.getElementById("debt").textContent = dept.toFixed(2);
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
    document.getElementById("credits").textContent = credits.toFixed(2);
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
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile ) {
        html.classList.add("sidebar-collapsed");
        html.classList.remove("sidebar-expanded");
        document.getElementById("sidebar-mobile").style.display = "block";
    } else {
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






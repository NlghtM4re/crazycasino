let bankCredits = parseFloat(localStorage.getItem("bankCredits"));
if (isNaN(bankCredits)) {
    bankCredits = 0;
    localStorage.setItem("bankCredits", bankCredits.toFixed(2));
}

function takeLoan() {
    if (credits + bankCredits > 99) {
        showPopup("You can only take a loan when you have less than 100 credits!");
        return;
    }

    const loanAmount = maxLoan();
    if (loanAmount <= 0) {
        showPopup("No loan amount available right now.");
        return;
    }

    dept += loanAmount;
    credits += loanAmount;

    localStorage.setItem("dept", dept);
    localStorage.setItem("credits", credits);

    document.getElementById("credits").textContent = credits.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById("debt").textContent = dept.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById("maxLoan").textContent = maxLoan().toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});

    showPopup(`You took a $${loanAmount.toFixed(2)} loan.`);
}

function payLoan() {
    const paymentAmount = parseFloat(document.getElementById("payment-amount").value);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        showPopup("Invalid payment amount!");
        return;
    }

    if (paymentAmount > credits) {
        showPopup("You don't have enough credits to make this payment!");
        return;
    }

    if (paymentAmount > dept) {
        showPopup("You are trying to pay more than your debt!");
        return;
    }

    credits -= paymentAmount;
    dept -= paymentAmount;

    localStorage.setItem("dept", dept);
    localStorage.setItem("credits", credits);

    document.getElementById("credits").textContent = credits.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById("debt").textContent = dept.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById("maxLoan").textContent = maxLoan().toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});

    showPopup(`You successfully paid $${paymentAmount.toFixed(2)} towards your loan.`);
}

function updateBankCredit(amount){
    bankCredits += amount;
    localStorage.setItem("bankCredits", bankCredits);
    document.getElementById("bankCreditsDisplay").textContent = bankCredits.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById("credits").textContent = credits.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
}

function depositeBank() {
    let amount = parseFloat(document.getElementById("depositeInput").value);

    if (!isNaN(amount) && amount > 0 && amount <= credits) {
        updateBankCredit(amount);
        updateCredits(-amount)
    } else {
        showPopup("Invalid amount.");
    }
}


function takeBank(){
    let amount = parseFloat(document.getElementById("takeInput").value);

    if (!isNaN(amount) && amount > 0 && amount <= bankCredits) {
        updateBankCredit(-amount);
        updateCredits(amount)
    } else {
        showPopup("Invalid amount.");
    }
}

function maxLoan(){
    const maxLoanAmount = 1000 / Math.pow(2, dept / 1000);
    return Math.max(0, maxLoanAmount);
}

function updateMaxLoanDisplay() {
    document.getElementById("maxLoan").textContent = maxLoan().toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("bankCreditsDisplay").textContent = bankCredits.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    updateMaxLoanDisplay();
});

// Update maxLoan display when page loads to ensure dept is initialized
window.addEventListener("load", () => {
    updateMaxLoanDisplay();
});


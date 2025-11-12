let bankCredits = parseFloat(localStorage.getItem("bankCredits"));
if (isNaN(bankCredits)) {
    bankCredits = 0;
    localStorage.setItem("bankCredits", bankCredits.toFixed(2));
}

function takeLoan() {
    if (credits + bankCredits > 99) {
        alert("You can only take a loan when you have less than 100 credits!");
        return;
    }

    dept += 100;
    credits += 100;

    localStorage.setItem("dept", dept);
    localStorage.setItem("credits", credits);

    document.getElementById("credits").textContent = credits.toFixed(2);
    document.getElementById("debt").textContent = dept.toFixed(2);
}

function payLoan() {
    const paymentAmount = parseFloat(document.getElementById("payment-amount").value);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        alert("Invalid payment amount!");
        return;
    }

    if (paymentAmount > credits) {
        alert("You don't have enough credits to make this payment!");
        return;
    }

    if (paymentAmount > dept) {
        alert("You are trying to pay more than your debt!");
        return;
    }

    credits -= paymentAmount;
    dept -= paymentAmount;

    localStorage.setItem("dept", dept);
    localStorage.setItem("credits", credits);

    document.getElementById("credits").textContent = credits.toFixed(2);
    document.getElementById("debt").textContent = dept.toFixed(2);

    alert(`You successfully paid $${paymentAmount.toFixed(2)} towards your loan.`);
}

function updateBankCredit(amount){
    bankCredits += amount;
    localStorage.setItem("bankCredits", bankCredits);
    document.getElementById("bankCreditsDisplay").textContent = bankCredits.toFixed(2);
    document.getElementById("credits").textContent = credits.toFixed(2);
    
}

function depositeBank() {
    let amount = parseFloat(document.getElementById("depositeInput").value);

    if (!isNaN(amount) && amount > 0 && amount <= credits) {
        updateBankCredit(amount);
        updateCredits(-amount)
    } else {
        alert("Invalid amount.");
    }
}


function takeBank(){
    let amount = parseFloat(document.getElementById("takeInput").value);

    if (!isNaN(amount) && amount > 0 && amount <= bankCredits) {
        updateBankCredit(-amount);
        updateCredits(amount)
    } else {
        alert("Invalid amount.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("bankCreditsDisplay").textContent = bankCredits.toFixed(2);
});


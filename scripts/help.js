function findMoney() {
    credits += 0.01;
    localStorage.setItem("credits", credits); 
    document.getElementById("credits").textContent = credits.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2}); 
}
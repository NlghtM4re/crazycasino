function findMoney() {
    credits += 0.01;
    localStorage.setItem("credits", credits); 
    document.getElementById("credits").textContent = credits.toFixed(2); 
}
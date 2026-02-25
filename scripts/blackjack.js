// Blackjack Game State
let gameState = {
  deck: [],
  dealerHand: [],
  playerHand: [],
  splitHand: [],
  currentBet: 0,
  isPlaying: false,
  isSplit: false,
  currentHand: 'player', // 'player' or 'split'
  dealerRevealed: false,
  canDoubleDown: true,
  canSplit: false
};

// Helper: Get card value
function getCardValue(rank) {
  if (rank === "A") return 11;
  if (["K", "Q", "J"].includes(rank)) return 10;
  return parseInt(rank, 10);
}

// Helper: Calculate hand total
function calculateHandTotal(cards) {
  let total = 0;
  let aces = 0;

  cards.forEach(card => {
    if (card.options && card.options.faceDown) return;
    const value = getCardValue(card.rank);
    total += value;
    if (card.rank === "A") aces += 1;
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

// Helper: Check if hand is blackjack
function isBlackjack(cards) {
  return cards.length === 2 && calculateHandTotal(cards) === 21;
}

// Helper: Update display
function updateDisplay() {
  const dealerTotal = calculateHandTotal(gameState.dealerHand);
  const playerTotal = calculateHandTotal(gameState.playerHand);
  
  document.getElementById("dealer-total").textContent = dealerTotal;
  document.getElementById("player-total").textContent = playerTotal;
  
  // Update total styling
  updateTotalStyling("player-total", playerTotal);
  
  if (gameState.isSplit) {
    const splitTotal = calculateHandTotal(gameState.splitHand);
    document.getElementById("split-total").textContent = splitTotal;
    updateTotalStyling("split-total", splitTotal);
  }
  
  // Highlight active hand
  const playerContainer = document.getElementById("player-hand-container");
  const splitContainer = document.getElementById("split-hand-container");
  
  if (gameState.isSplit) {
    playerContainer.classList.toggle("active", gameState.currentHand === 'player');
    splitContainer.classList.toggle("active", gameState.currentHand === 'split');
  }
}

function updateTotalStyling(elementId, total) {
  const el = document.getElementById(elementId);
  el.classList.remove("bust", "blackjack");
  if (total > 21) {
    el.classList.add("bust");
  } else if (total === 21) {
    el.classList.add("blackjack");
  }
}

// Helper: Render hands
function renderHands() {
  window.CardDeck.renderHand(document.getElementById("dealer-hand"), gameState.dealerHand);
  window.CardDeck.renderHand(document.getElementById("player-hand"), gameState.playerHand);
  
  if (gameState.isSplit) {
    window.CardDeck.renderHand(document.getElementById("split-hand"), gameState.splitHand);
  }
  
  updateDisplay();
}

// Helper: Show/hide UI elements
function showElement(id, show = true) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showBlock(id, show = true) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? 'block' : 'none';
}

// Helper: Enable/disable buttons
function setButtonState(buttonId, enabled) {
  const btn = document.getElementById(buttonId);
  if (btn) btn.disabled = !enabled;
}

// Helper: Show message
function showMessage(msg) {
  const msgEl = document.getElementById("blackjack-message");
  if (msgEl) msgEl.textContent = msg;
}

// Set bet amount
function setBet(amount) {
  document.getElementById("bet-amount").value = amount;
}

// Set all-in bet
function setAllIn() {
  if (typeof credits !== 'undefined') {
    document.getElementById("bet-amount").value = Math.floor(credits);
  }
}

// Deal Cards - Start new game
function dealCards() {
  const betAmount = parseFloat(document.getElementById("bet-amount").value);
  
  if (isNaN(betAmount) || betAmount <= 0) {
    showPopup("Please enter a valid bet amount!");
    return;
  }
  
  if (betAmount > credits) {
    showPopup("Insufficient credits!");
    return;
  }
  
  // Deduct bet from credits
  updateCredits(-betAmount);
  gameState.currentBet = betAmount;
  
  // Update UI
  document.getElementById("current-bet").textContent = betAmount.toFixed(2);
  showBlock("betting-section", false);
  showElement("game-info", true);
  showBlock("game-table", true);
  showElement("action-buttons", true);
  
  // Initialize game
  gameState.deck = window.CardDeck.createDeck();
  gameState.isPlaying = true;
  gameState.isSplit = false;
  gameState.currentHand = 'player';
  gameState.dealerRevealed = false;
  gameState.canDoubleDown = true;
  
  // Deal initial cards
  gameState.playerHand = [
    window.CardDeck.drawCard(gameState.deck),
    window.CardDeck.drawCard(gameState.deck)
  ];
  
  gameState.dealerHand = [
    window.CardDeck.drawCard(gameState.deck),
    { ...window.CardDeck.drawCard(gameState.deck), options: { faceDown: true } }
  ];
  
  gameState.splitHand = [];
  document.getElementById("split-hand-container").style.display = 'none';
  document.querySelector(".player-section").classList.remove("has-split");
  
  renderHands();
  
  // Check for split possibility
  gameState.canSplit = gameState.playerHand[0].rank === gameState.playerHand[1].rank && 
                       gameState.currentBet <= credits;
  
  // Enable buttons
  setButtonState("hit-btn", true);
  setButtonState("stand-btn", true);
  setButtonState("double-btn", gameState.currentBet <= credits);
  setButtonState("split-btn", gameState.canSplit);
  
  // Check for instant blackjack
  if (isBlackjack(gameState.playerHand)) {
    showMessage("🎉 Blackjack! Checking dealer...");
    setTimeout(() => revealDealerAndSettle(), 800);
  } else {
    showMessage("Your turn. Hit or Stand?");
  }
}

// Hit - Take another card
function hit() {
  const hand = gameState.currentHand === 'player' ? gameState.playerHand : gameState.splitHand;
  hand.push(window.CardDeck.drawCard(gameState.deck));
  
  gameState.canDoubleDown = false;
  setButtonState("double-btn", false);
  
  renderHands();
  
  const total = calculateHandTotal(hand);
  
  if (total > 21) {
    showMessage(`${gameState.currentHand === 'player' ? 'Your hand' : 'Split hand'} busted!`);
    
    if (gameState.isSplit && gameState.currentHand === 'player') {
      // Switch to split hand
      setTimeout(() => {
        gameState.currentHand = 'split';
        updateDisplay();
        showMessage("Playing split hand now.");
        gameState.canDoubleDown = true;
        setButtonState("double-btn", gameState.currentBet <= credits);
      }, 1000);
    } else {
      // End game
      setTimeout(() => revealDealerAndSettle(), 1000);
    }
  } else if (total === 21) {
    showMessage("21! Auto-standing.");
    setTimeout(() => stand(), 800);
  }
}

// Stand - Keep current hand
function stand() {
  if (gameState.isSplit && gameState.currentHand === 'player') {
    // Switch to split hand
    gameState.currentHand = 'split';
    updateDisplay();
    showMessage("Playing split hand now.");
    gameState.canDoubleDown = true;
    setButtonState("double-btn", gameState.currentBet <= credits);
  } else {
    // Reveal dealer and settle
    setButtonState("hit-btn", false);
    setButtonState("stand-btn", false);
    setButtonState("double-btn", false);
    setButtonState("split-btn", false);
    
    setTimeout(() => revealDealerAndSettle(), 500);
  }
}

// Double Down - Double bet and take one card
function doubleDown() {
  if (gameState.currentBet > credits) {
    showPopup("Insufficient credits to double down!");
    return;
  }
  
  updateCredits(-gameState.currentBet);
  gameState.currentBet *= 2;
  document.getElementById("current-bet").textContent = gameState.currentBet.toFixed(2);
  
  const hand = gameState.currentHand === 'player' ? gameState.playerHand : gameState.splitHand;
  hand.push(window.CardDeck.drawCard(gameState.deck));
  
  renderHands();
  
  const total = calculateHandTotal(hand);
  
  if (total > 21) {
    showMessage(`${gameState.currentHand === 'player' ? 'Your hand' : 'Split hand'} busted on double down!`);
    
    if (gameState.isSplit && gameState.currentHand === 'player') {
      setTimeout(() => {
        gameState.currentHand = 'split';
        updateDisplay();
        showMessage("Playing split hand now.");
        gameState.canDoubleDown = true;
        setButtonState("double-btn", gameState.currentBet / 2 <= credits);
      }, 1000);
    } else {
      setTimeout(() => revealDealerAndSettle(), 1000);
    }
  } else {
    setTimeout(() => stand(), 800);
  }
}

// Split - Split pair into two hands
function split() {
  if (!gameState.canSplit) return;
  
  if (gameState.currentBet > credits) {
    showPopup("Insufficient credits to split!");
    return;
  }
  
  // Deduct additional bet for split
  updateCredits(-gameState.currentBet);
  
  gameState.isSplit = true;
  gameState.splitHand = [gameState.playerHand.pop()];
  gameState.playerHand.push(window.CardDeck.drawCard(gameState.deck));
  gameState.splitHand.push(window.CardDeck.drawCard(gameState.deck));
  
  document.getElementById("split-hand-container").style.display = 'block';
  document.querySelector(".player-section").classList.add("has-split");
  
  setButtonState("split-btn", false);
  
  renderHands();
  showMessage("Playing first hand. Hit or Stand?");
}

// Reveal dealer cards and settle bets
function revealDealerAndSettle() {
  gameState.dealerRevealed = true;
  
  // Flip dealer's face-down card
  gameState.dealerHand.forEach(card => {
    if (card.options && card.options.faceDown) {
      delete card.options.faceDown;
    }
  });
  
  // Add flip animation
  const dealerCards = document.querySelectorAll("#dealer-hand .card");
  dealerCards.forEach(card => card.classList.add("flip-animation"));
  
  renderHands();
  
  // Dealer draws until 17 or higher
  setTimeout(() => {
    dealerDrawCards();
  }, 600);
}

function dealerDrawCards() {
  let dealerTotal = calculateHandTotal(gameState.dealerHand);
  
  if (dealerTotal < 17) {
    gameState.dealerHand.push(window.CardDeck.drawCard(gameState.deck));
    renderHands();
    setTimeout(() => dealerDrawCards(), 600);
  } else {
    setTimeout(() => settleBets(), 800);
  }
}

function settleBets() {
  const dealerTotal = calculateHandTotal(gameState.dealerHand);
  const playerTotal = calculateHandTotal(gameState.playerHand);
  
  let resultMessage = "";
  let totalWinnings = 0;
  
  // Check player hand
  if (playerTotal > 21) {
    resultMessage = "You busted! ";
  } else if (dealerTotal > 21) {
    resultMessage = "Dealer busted! You win! ";
    totalWinnings += isBlackjack(gameState.playerHand) ? 
                     gameState.currentBet * 2.5 : gameState.currentBet * 2;
  } else if (playerTotal > dealerTotal) {
    resultMessage = "You win! ";
    totalWinnings += isBlackjack(gameState.playerHand) ? 
                     gameState.currentBet * 2.5 : gameState.currentBet * 2;
  } else if (playerTotal === dealerTotal) {
    resultMessage = "Push! ";
    totalWinnings += gameState.currentBet;
  } else {
    resultMessage = "Dealer wins! ";
  }
  
  // Check split hand if exists
  if (gameState.isSplit) {
    const splitTotal = calculateHandTotal(gameState.splitHand);
    
    if (splitTotal > 21) {
      resultMessage += "Split busted!";
    } else if (dealerTotal > 21) {
      resultMessage += "Split wins!";
      totalWinnings += gameState.currentBet * 2;
    } else if (splitTotal > dealerTotal) {
      resultMessage += "Split wins!";
      totalWinnings += gameState.currentBet * 2;
    } else if (splitTotal === dealerTotal) {
      resultMessage += "Split pushes!";
      totalWinnings += gameState.currentBet;
    } else {
      resultMessage += "Split loses!";
    }
  }
  
  // Award winnings
  if (totalWinnings > 0) {
    updateCredits(totalWinnings);
    resultMessage += ` Won: $${totalWinnings.toFixed(2)}`;
  }
  
  showMessage(resultMessage);
  
  // Show deal button again
  setTimeout(() => resetGame(), 2000);
}

function resetGame() {
  gameState.isPlaying = false;
  showBlock("betting-section", true);
  showElement("game-info", false);
  showBlock("game-table", false);
  showElement("action-buttons", false);
  
  setButtonState("deal-btn", true);
}

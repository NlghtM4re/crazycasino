// Stock Market Graph Variables
let stockData = [];
let canvas, ctx;
let updateInterval = 200;
let animationId;
let currentValue = 0;
let time = 0;
let timeFilter = 10; // Default to last 10 seconds

// Portfolio tracking
let portfolio = {
  sharesOwned: 0,
  buyPrice: 0,
  buyMarkers: [] // Array of {price, time} for buy markers
};

let sellMarkers = []; // Array of {price, time} for sell markers

// Lifetime statistics tracking
let lifetimeStats = {
  totalProfit: 0,
  totalInvested: 0,
  sharesBought: 0,
  sharesSold: 0,
  totalTrades: 0,
  profitableTrades: 0,
  biggestWin: 0,
  biggestLoss: 0,
  tradeHistory: [] // Array of {profit, invested}
};

// Load lifetime stats from localStorage
function loadLifetimeStats() {
  const saved = localStorage.getItem('stockMarketLifetimeStats');
  if (saved) {
    try {
      lifetimeStats = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load lifetime stats:', e);
    }
  }
}

// Save lifetime stats to localStorage
function saveLifetimeStats() {
  localStorage.setItem('stockMarketLifetimeStats', JSON.stringify(lifetimeStats));
}

// Save state to localStorage
function saveState() {
  const state = {
    stockData,
    currentValue,
    time,
    timeFilter,
    updateInterval,
    portfolio,
    sellMarkers,
    buyAmount: document.getElementById('buy-amount')?.value || 1,
    sellAmount: document.getElementById('sell-amount')?.value || 0
  };
  localStorage.setItem('stockMarketState', JSON.stringify(state));
}

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem('stockMarketState');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      stockData = state.stockData || [];
      currentValue = state.currentValue || 50;
      time = state.time || 0;
      timeFilter = state.timeFilter || 10;
      updateInterval = state.updateInterval || 200;
      portfolio = state.portfolio || { sharesOwned: 0, buyPrice: 0, buyMarkers: [] };
      sellMarkers = state.sellMarkers || [];
      
      // Restore input values
      if (document.getElementById('buy-amount')) {
        document.getElementById('buy-amount').value = state.buyAmount || 1;
      }
      if (document.getElementById('sell-amount')) {
        document.getElementById('sell-amount').value = state.sellAmount || 0;
      }
      if (document.getElementById('update-interval')) {
        document.getElementById('update-interval').value = state.updateInterval || 200;
      }
      
      // Update active time filter button
      document.querySelectorAll('.time-filter-btn').forEach((btn, index) => {
        btn.classList.remove('active');
        const filterValues = [10, 60, 600, 3600, 86400, 'all'];
        if (filterValues[index] === timeFilter) {
          btn.classList.add('active');
        }
      });
      
      return true;
    } catch (e) {
      console.error('Failed to load saved state:', e);
      return false;
    }
  }
  return false;
}

// Initialize the stock market graph
function initializeStockMarket() {
  canvas = document.getElementById('stockmarket-canvas');
  ctx = canvas.getContext('2d');

  // Set canvas size
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Load lifetime stats
  loadLifetimeStats();

  // Try to load saved state
  const loaded = loadState();
  
  if (!loaded || stockData.length === 0) {
    // Add initial data points to have a line to display
    currentValue = 50 + Math.random() * 20;
    stockData.push({ time: 0, value: currentValue });
    
    // Add a second point so we can draw a line immediately
    const change = (Math.random() - 0.5) * 3;
    currentValue = currentValue + change;
    stockData.push({ time: 1, value: currentValue });
    
    time = 2;
  }
  
  // Update portfolio display
  updatePortfolioDisplay();
  
  // Show/hide sell section based on shares
  if (portfolio.sharesOwned > 0) {
    document.getElementById('sell-group').style.display = 'block';
  }

  // Start the graph animation immediately
  startGraphUpdate();
  
  // Save state periodically
  setInterval(saveState, 1000); // Save every second
}

// Resize canvas to fill container
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  drawGraph();
}

// Update interval instantly
function updateIntervalValue() {
  const newInterval = parseInt(document.getElementById('update-interval').value);
  if (newInterval > 0) {
    updateInterval = newInterval;
    
    // Calculate in-game time per real second
    const inGamePerSecond = (1000 / newInterval).toFixed(1);
    document.getElementById('time-conversion').textContent = `1 real-time second = ${inGamePerSecond} in-game seconds`;
    
    restartAnimation();
  }
}

// Slow time to 1000ms
function slowTime() {
  document.getElementById('update-interval').value = 1000;
  updateIntervalValue();
}

// Restart animation with new interval
function restartAnimation() {
  if (animationId) {
    clearTimeout(animationId);
  }
  startGraphUpdate();
}

// Start updating the graph
function startGraphUpdate() {
  if (animationId) {
    clearTimeout(animationId);
  }
  
  const update = () => {
    // Generate a random change with momentum (trending behavior)
    // Get the previous change to add momentum
    let momentum = 0;
    if (stockData.length > 1) {
      const previousChange = stockData[stockData.length - 1].value - stockData[stockData.length - 2].value;
      // 60% chance to continue in same direction, 40% chance to reverse
      momentum = previousChange * (Math.random() < 0.6 ? 0.7 : -0.3);
    }
    
    // Add random component with momentum bias
    const randomComponent = (Math.random() - 0.5) * 2;
    const change = momentum + randomComponent;
    currentValue = currentValue + change;
    
    // Keep value positive, minimum 0.01
    if (currentValue < 0.01) {
      currentValue = 0.01 + Math.random() * 0.1;
    }
    
    // Cap at 100 to keep it reasonable
    if (currentValue > 100) {
      currentValue = 100 - Math.random() * 5;
    }
    
    // Update portfolio display in real-time
    updatePortfolioDisplay();

    // Add data point
    stockData.push({
      time: time,
      value: currentValue
    });

    time++;
    drawGraph();
    animationId = setTimeout(update, updateInterval);
  };

  // Call immediately for the first point
  update();
}

// Draw the graph
function drawGraph() {
  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Clear canvas
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines
  drawGridLines(padding, graphWidth, graphHeight);

  // Draw axes
  drawAxes(padding, graphWidth, graphHeight);

  // Draw data line
  if (stockData.length > 0) {
    drawDataLine(padding, graphWidth, graphHeight);
  }
}

// Statistics Modal Functions
function openStatsModal() {
  // Calculate derived stats
  const winRate = lifetimeStats.totalTrades > 0 
    ? ((lifetimeStats.profitableTrades / lifetimeStats.totalTrades) * 100).toFixed(1) 
    : 0;
  const avgProfit = lifetimeStats.totalTrades > 0 
    ? (lifetimeStats.totalProfit / lifetimeStats.totalTrades).toFixed(2) 
    : 0;
  
  // Update all stat values in modal
  document.getElementById('stat-total-profit').textContent = lifetimeStats.totalProfit.toFixed(2);
  document.getElementById('stat-total-profit').style.color = lifetimeStats.totalProfit >= 0 ? '#4ade80' : '#f87171';
  document.getElementById('stat-total-invested').textContent = lifetimeStats.totalInvested.toFixed(2);
  document.getElementById('stat-shares-bought').textContent = lifetimeStats.sharesBought.toFixed(2);
  document.getElementById('stat-shares-sold').textContent = lifetimeStats.sharesSold.toFixed(2);
  document.getElementById('stat-total-trades').textContent = lifetimeStats.totalTrades;
  document.getElementById('stat-profitable-trades').textContent = lifetimeStats.profitableTrades;
  document.getElementById('stat-biggest-win').textContent = lifetimeStats.biggestWin.toFixed(2);
  document.getElementById('stat-biggest-win').style.color = '#4ade80';
  document.getElementById('stat-biggest-loss').textContent = lifetimeStats.biggestLoss.toFixed(2);
  document.getElementById('stat-biggest-loss').style.color = '#f87171';
  document.getElementById('stat-win-rate').textContent = winRate + '%';
  document.getElementById('stat-avg-profit').textContent = avgProfit;
  document.getElementById('stat-avg-profit').style.color = avgProfit >= 0 ? '#4ade80' : '#f87171';
  
  // Show modal
  document.getElementById('stats-modal').style.display = 'flex';
}

function closeStatsModal() {
  document.getElementById('stats-modal').style.display = 'none';
}

// Draw grid lines
function drawGridLines(padding, graphWidth, graphHeight) {
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;

  // Vertical grid lines
  for (let i = 0; i <= 10; i++) {
    const x = padding + (graphWidth / 10) * i;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, padding + graphHeight);
    ctx.stroke();
  }

  // Horizontal grid lines
  for (let i = 0; i <= 10; i++) {
    const y = padding + (graphHeight / 10) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + graphWidth, y);
    ctx.stroke();
  }
}

// Draw axes
function drawAxes(padding, graphWidth, graphHeight) {
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;

  // Y axis
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + graphHeight);
  ctx.stroke();

  // X axis
  ctx.beginPath();
  ctx.moveTo(padding, padding + graphHeight);
  ctx.lineTo(padding + graphWidth, padding + graphHeight);
  ctx.stroke();

  // Calculate dynamic min/max from data
  let minValue = 0;
  let maxValue = 100;
  if (stockData.length > 0) {
    const allValues = stockData.map(d => d.value);
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    
    // Use tight range with small padding (5% on each side)
    const range = dataMax - dataMin || 1;
    const padding_val = range * 0.05;
    
    minValue = Math.max(0, dataMin - padding_val); // Never go below 0
    maxValue = dataMax + padding_val;
  }

  // Draw axis labels
  ctx.fillStyle = '#aaa';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';

  // X axis labels (time) with units and decimals
  for (let i = 0; i <= 10; i++) {
    const x = padding + (graphWidth / 10) * i;
    const seconds = Math.max(0, time - 100 + (100 / 10) * i);
    let label;
    if (seconds < 60) {
      label = seconds < 10 ? seconds.toFixed(1) + 's' : Math.floor(seconds) + 's';
    } else {
      label = Math.floor(seconds / 60) + 'm';
    }
    ctx.fillText(label, x, padding + graphHeight + 20);
  }

  // Y axis labels (value) - adaptive decimals
  ctx.textAlign = 'right';
  
  // Determine decimal places based on the range
  let decimalPlaces = 2;
  if (maxValue < 1) {
    decimalPlaces = 4;
  } else if (maxValue < 10) {
    decimalPlaces = 3;
  }
  
  for (let i = 0; i <= 10; i++) {
    const y = padding + (graphHeight / 10) * i;
    const value = maxValue - ((maxValue - minValue) / 10) * i;
    const label = value < 0.01 ? value.toExponential(1) : value.toFixed(decimalPlaces);
    ctx.fillText(label, padding + 5, y + 4);
  }

  // Axis titles
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ccc';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.fillText('Time', padding + graphWidth / 2, canvas.height - 10);

  ctx.save();
  ctx.translate(10, padding + graphHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Value', 0, 0);
  ctx.restore();
}

// Draw the data line
function drawDataLine(padding, graphWidth, graphHeight) {
  if (stockData.length < 1) return;

  // Calculate dynamic min/max from filtered data
  let minValue = 0;
  let maxValue = 100;
  const filteredData = getFilteredData();
  if (filteredData.length > 0) {
    const allValues = filteredData.map(d => d.value);
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    
    // Use tight range with small padding (5% on each side)
    const range = dataMax - dataMin || 1;
    const pad_val = range * 0.05;
    
    minValue = Math.max(0, dataMin - pad_val); // Never go below 0
    maxValue = dataMax + pad_val;
  }

  const valueRange = maxValue - minValue;

  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let lastColor = '#00ff00';
  let lastX = 0;
  let lastY = 0;

  for (let i = 0; i < filteredData.length; i++) {
    const point = filteredData[i];

    // Calculate canvas coordinates - use full width for filtered data
    const x = padding + (i / Math.max(1, filteredData.length - 1)) * graphWidth;
    const y = padding + graphHeight - ((point.value - minValue) / valueRange) * graphHeight;

    if (i === 0) {
      lastX = x;
      lastY = y;
    } else {
      // Determine color based on direction
      const color = point.value >= filteredData[i - 1].value ? '#00ff00' : '#ff0000';

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastColor = color;
      lastX = x;
      lastY = y;
    }
  }

  // Draw current value indicator
  if (filteredData.length > 0) {
    const lastPoint = filteredData[filteredData.length - 1];
    const x = padding + ((filteredData.length - 1) / Math.max(1, filteredData.length - 1)) * graphWidth;
    const y = padding + graphHeight - ((lastPoint.value - minValue) / valueRange) * graphHeight;

    ctx.fillStyle = lastColor;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw value label with adaptive decimals
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    let decimals = 2;
    if (lastPoint.value < 1) {
      decimals = 4;
    } else if (lastPoint.value < 10) {
      decimals = 3;
    }
    
    const valueLabel = lastPoint.value < 0.01 ? lastPoint.value.toExponential(1) : lastPoint.value.toFixed(decimals);
    ctx.fillText(`${valueLabel}¢`, x, y - 18);
  }

  // Draw buy markers
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3b82f6'; // Blue for buy
  ctx.setLineDash([5, 5]);
  
  for (let marker of portfolio.buyMarkers) {
    const markerY = padding + graphHeight - ((marker.price - minValue) / valueRange) * graphHeight;
    ctx.beginPath();
    ctx.moveTo(padding, markerY);
    ctx.lineTo(padding + graphWidth, markerY);
    ctx.stroke();
    
    // Draw label with adaptive decimals
    let decimals = 2;
    if (marker.price < 1) {
      decimals = 4;
    } else if (marker.price < 10) {
      decimals = 3;
    }
    const priceLabel = marker.price < 0.01 ? marker.price.toExponential(1) : marker.price.toFixed(decimals);
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`BUY: ${priceLabel}¢`, padding + 5, markerY - 5);
  }

  // Draw sell markers
  ctx.strokeStyle = '#ef4444'; // Red for sell
  
  for (let marker of sellMarkers) {
    const markerY = padding + graphHeight - ((marker.price - minValue) / valueRange) * graphHeight;
    ctx.beginPath();
    ctx.moveTo(padding, markerY);
    ctx.lineTo(padding + graphWidth, markerY);
    ctx.stroke();
    
    // Draw label with adaptive decimals
    let decimals = 2;
    if (marker.price < 1) {
      decimals = 4;
    } else if (marker.price < 10) {
      decimals = 3;
    }
    const priceLabel = marker.price < 0.01 ? marker.price.toExponential(1) : marker.price.toFixed(decimals);
    
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SELL: ${priceLabel}¢`, padding + 5, markerY + 12);
  }

  ctx.setLineDash([]);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeStockMarket);

// Buy stock function
function buyStock() {
  const buyAmount = parseFloat(document.getElementById('buy-amount').value);
  const credits = parseFloat(localStorage.getItem('credits')) || 0;
  const costInCredits = buyAmount * currentValue;
  
  if (buyAmount <= 0 || isNaN(buyAmount)) {
    alert('Please enter a valid amount');
    return;
  }
  
  if (credits < costInCredits) {
    alert('Not enough credits. You need ' + costInCredits.toFixed(2) + ' but only have ' + credits.toFixed(2));
    return;
  }
  
  // Deduct credits
  const newCredits = credits - costInCredits;
  updateCredits(newCredits);
  
  // Update portfolio
  if (portfolio.sharesOwned === 0) {
    // First buy after selling - clear old markers
    portfolio.buyPrice = currentValue;
    portfolio.buyMarkers = [{price: currentValue, time: time}];
    sellMarkers = []; // Clear both buy and sell markers on new buy
  } else {
    // Additional buy - accumulate
    const totalCost = (portfolio.sharesOwned * portfolio.buyPrice) + costInCredits;
    const newShares = portfolio.sharesOwned + buyAmount;
    portfolio.buyPrice = totalCost / newShares;
    portfolio.buyMarkers.push({price: currentValue, time: time});
  }
  
  portfolio.sharesOwned += buyAmount;
  
  // Track lifetime stats
  lifetimeStats.totalInvested += costInCredits;
  lifetimeStats.sharesBought += buyAmount;
  saveLifetimeStats();
  
  // Update UI
  updatePortfolioDisplay();
  document.getElementById('sell-group').style.display = 'block';
  document.getElementById('buy-amount').value = 1;
}

// Sell all stock function
function sellAllStock() {
  if (portfolio.sharesOwned === 0) {
    alert('You don\'t own any shares');
    return;
  }
  
  const saleValue = portfolio.sharesOwned * currentValue;
  const credits = parseFloat(localStorage.getItem('credits')) || 0;
  const newCredits = credits + saleValue;
  updateCredits(newCredits);
  
  // Calculate profit/loss for this trade
  const cost = portfolio.sharesOwned * portfolio.buyPrice;
  const profit = saleValue - cost;
  
  // Track lifetime stats
  lifetimeStats.sharesSold += portfolio.sharesOwned;
  lifetimeStats.totalProfit += profit;
  lifetimeStats.totalTrades += 1;
  if (profit > 0) lifetimeStats.profitableTrades += 1;
  if (profit > lifetimeStats.biggestWin) lifetimeStats.biggestWin = profit;
  if (profit < lifetimeStats.biggestLoss) lifetimeStats.biggestLoss = profit;
  lifetimeStats.tradeHistory.push({profit, invested: cost});
  saveLifetimeStats();
  
  // Add sell marker
  sellMarkers.push({price: currentValue, time: time});
  
  // Reset portfolio but keep markers
  portfolio.sharesOwned = 0;
  portfolio.buyPrice = 0;
  // Keep buy markers until next buy
  
  // Update UI
  updatePortfolioDisplay();
  document.getElementById('sell-group').style.display = 'none';
}

// Sell custom amount
function sellCustomStock() {
  const sellAmount = parseFloat(document.getElementById('sell-amount').value);
  
  if (sellAmount <= 0 || isNaN(sellAmount)) {
    alert('Please enter a valid amount');
    return;
  }
  
  if (sellAmount > portfolio.sharesOwned) {
    alert('You don\'t have that many shares');
    return;
  }
  
  const saleValue = sellAmount * currentValue;
  const credits = parseFloat(localStorage.getItem('credits')) || 0;
  const newCredits = credits + saleValue;
  updateCredits(newCredits);
  
  // Calculate profit/loss for this partial trade
  const cost = sellAmount * portfolio.buyPrice;
  const profit = saleValue - cost;
  
  // Track lifetime stats
  lifetimeStats.sharesSold += sellAmount;
  lifetimeStats.totalProfit += profit;
  lifetimeStats.totalTrades += 1;
  if (profit > 0) lifetimeStats.profitableTrades += 1;
  if (profit > lifetimeStats.biggestWin) lifetimeStats.biggestWin = profit;
  if (profit < lifetimeStats.biggestLoss) lifetimeStats.biggestLoss = profit;
  lifetimeStats.tradeHistory.push({profit, invested: cost});
  saveLifetimeStats();
  
  // Reduce portfolio
  portfolio.sharesOwned -= sellAmount;
  
  // Add sell marker
  sellMarkers.push({price: currentValue, time: time});
  
  // Hide sell group if all sold, but keep markers
  if (portfolio.sharesOwned < 0.01) { // Account for floating point precision
    portfolio.sharesOwned = 0;
    document.getElementById('sell-group').style.display = 'none';
  }
  // Keep both buy and sell markers until next buy
  
  // Update UI
  updatePortfolioDisplay();
  document.getElementById('sell-amount').value = 0;
}

// Set sell amount by percentage
function setSellPercentage(percentage) {
  const amount = (portfolio.sharesOwned * percentage / 100).toFixed(2);
  document.getElementById('sell-amount').value = amount;
}

// Update portfolio display
function updatePortfolioDisplay() {
  document.getElementById('shares-owned').textContent = portfolio.sharesOwned.toFixed(2);
  document.getElementById('buy-price').textContent = '$' + portfolio.buyPrice.toFixed(2);
  
  // Update current price display
  const currentPriceEl = document.getElementById('current-price-value');
  if (currentPriceEl) {
    currentPriceEl.textContent = '$' + currentValue.toFixed(2);
  }
  
  // Calculate profit/loss
  const totalCost = portfolio.sharesOwned * portfolio.buyPrice;
  const totalValue = portfolio.sharesOwned * currentValue;
  const profitLoss = totalValue - totalCost;
  
  // Update profit/loss display
  const profitLossEl = document.getElementById('profit-loss');
  if (profitLossEl) {
    const profitLossText = (profitLoss >= 0 ? '+$' : '-$') + Math.abs(profitLoss).toFixed(2);
    profitLossEl.textContent = profitLossText;
    
    // Color based on profit/loss
    if (profitLoss >= 0) {
      profitLossEl.style.color = '#10b981';
    } else {
      profitLossEl.style.color = '#ef4444';
    }
  }
  
  // Update total value display
  const totalValueEl = document.getElementById('total-value');
  if (totalValueEl) {
    totalValueEl.textContent = '$' + totalValue.toFixed(2);
    
    // Color based on profit/loss
    if (portfolio.sharesOwned > 0) {
      if (profitLoss >= 0) {
        totalValueEl.style.color = '#10b981';
      } else {
        totalValueEl.style.color = '#ef4444';
      }
    } else {
      totalValueEl.style.color = '#10b981';
    }
  }
  
  // Update buy amount cost display
  const buyAmountInput = document.getElementById('buy-amount');
  const buyAmount = parseFloat(buyAmountInput.value) || 0;
  const costInCredits = buyAmount * currentValue;
  document.getElementById('buy-cost-display').textContent = '$' + costInCredits.toFixed(2);
  
  // Update header stats
  updateHeaderStats();
}

// Update header statistics
function updateHeaderStats() {
  // Update current stock price in header
  const headerPriceElement = document.getElementById('header-price');
  if (headerPriceElement) {
    headerPriceElement.textContent = '$' + currentValue.toFixed(2);
  }
  
  // Calculate change since start
  const headerChangeElement = document.getElementById('header-change');
  if (headerChangeElement && stockData.length > 0) {
    const firstValue = stockData[0].value;
    const changePercent = ((currentValue - firstValue) / firstValue) * 100;
    const changeText = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
    headerChangeElement.textContent = changeText;
    
    // Update color based on positive/negative
    if (changePercent >= 0) {
      headerChangeElement.classList.remove('negative');
      headerChangeElement.style.color = '#10b981';
    } else {
      headerChangeElement.classList.add('negative');
      headerChangeElement.style.color = '#ef4444';
    }
  }
  
  // Update portfolio value in header
  const headerPortfolioElement = document.getElementById('header-portfolio');
  if (headerPortfolioElement) {
    const totalValue = portfolio.sharesOwned * currentValue;
    headerPortfolioElement.textContent = '$' + totalValue.toFixed(2);
    
    // Color based on profit/loss
    if (portfolio.sharesOwned > 0) {
      const profitLoss = totalValue - (portfolio.sharesOwned * portfolio.buyPrice);
      if (profitLoss >= 0) {
        headerPortfolioElement.style.color = '#10b981';
      } else {
        headerPortfolioElement.style.color = '#ef4444';
      }
    } else {
      headerPortfolioElement.style.color = '#10b981';
    }
  }
}

// Set max buy amount
function setMaxBuy() {
  const credits = parseFloat(localStorage.getItem('credits')) || 0;
  const maxShares = Math.floor((credits / currentValue) * 100) / 100; // Round down to 2 decimals
  document.getElementById('buy-amount').value = maxShares > 0 ? maxShares : 0;
  updateBuyCost();
}

// Update buy cost display
function updateBuyCost() {
  const buyAmount = parseFloat(document.getElementById('buy-amount').value) || 0;
  const costInCredits = buyAmount * currentValue;
  document.getElementById('buy-cost-display').textContent = costInCredits.toFixed(2) + '¢';
}

// Set time filter for graph
function setTimeFilter(seconds) {
  timeFilter = seconds;
  
  // Update button active state
  document.querySelectorAll('.time-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Redraw graph
  drawGraph();
}

// Get filtered data based on time filter
function getFilteredData() {
  if (timeFilter === 'all') {
    return stockData;
  }
  
  const startTime = time - timeFilter;
  return stockData.filter(d => d.time >= startTime);
}

// Reset graph function
function resetGraph() {
  // Stop current animation
  if (animationId) {
    clearTimeout(animationId);
  }
  
  // Reset all data
  stockData = [];
  time = 0;
  portfolio = { sharesOwned: 0, buyPrice: 0, buyMarkers: [] };
  sellMarkers = [];
  
  // Hide sell section
  document.getElementById('sell-group').style.display = 'none';
  
  // Reset to default time filter
  timeFilter = 10;
  document.querySelectorAll('.time-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.time-filter-btn')[0].classList.add('active');
  
  // Reinitialize
  currentValue = 50 + Math.random() * 20;
  stockData.push({ time: 0, value: currentValue });
  
  const change = (Math.random() - 0.5) * 3;
  currentValue = currentValue + change;
  stockData.push({ time: 1, value: currentValue });
  
  time = 2;
  
  // Clear localStorage
  localStorage.removeItem('stockMarketState');
  
  // Update displays
  updatePortfolioDisplay();
  
  // Restart animation
  startGraphUpdate();
}

// Update credits (from main.js)
function updateCredits(amount) {
  const formattedAmount = parseFloat(amount.toFixed(2));
  document.getElementById('credits').textContent = formattedAmount.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  localStorage.setItem('credits', formattedAmount.toFixed(2));
}
// Charts page logic split from index.html
const stocks = ['AAPL', 'MSFT', 'GOOGL', 'BITO', 'TSLA', 'NVDA'];
const cryptos = [
  { id: 'BTC', name: 'Bitcoin' },
  { id: 'ETH', name: 'Ethereum' },
  { id: 'SOL', name: 'Solana' },
  { id: 'XRP', name: 'XRP (Ripple)' },
  { id: 'DOGE', name: 'Dogecoin' },
  { id: 'ADA', name: 'Cardano' }
];
const charts = {};
let bigChartInstance;

function createChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label, data, borderColor: color, borderWidth: 2, fill: false, pointRadius: 0 }] },
    options: {
      scales: {
        x: { type: 'time', time: { unit: 'month', displayFormats: { month: 'MMM' } } },
        y: { ticks: { callback: (v) => `$${v.toLocaleString()}` } }
      }
    }
  });
}

function updateChart(canvasId, labels, data) {
  if (charts[canvasId]) {
    charts[canvasId].data.labels = labels;
    charts[canvasId].data.datasets[0].data = data;
    charts[canvasId].update();
  }
}

function fetchStockData(ticker) {
  fetch(`/api/stock/${ticker}`)
    .then(r => r.json())
    .then(data => {
      document.getElementById(`price-${ticker}`).textContent = `$${data.info.currentPrice.toFixed(2)}`;
      const changeEl = document.getElementById(`change-${ticker}`);
      const change = data.info.change.toFixed(2);
      const changePercent = data.info.changePercent.toFixed(2);
      changeEl.textContent = `${change} (${changePercent}%)`;
      changeEl.className = 'daily-change';
      if (data.info.change > 0) changeEl.classList.add('positive');
      else if (data.info.change < 0) changeEl.classList.add('negative');

      const infoDiv = document.getElementById(`info-${ticker}`);
      infoDiv.innerHTML = `<strong>${data.info.shortName || ticker}</strong> (${data.info.symbol})<br>Sector: ${data.info.sector || 'N/A'}<br>Market Cap: ${data.info.marketCap ? (data.info.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}<br>P/E Ratio: ${data.info.trailingPE ? data.info.trailingPE.toFixed(2) : 'N/A'}`;

      const dates = data.history.map(item => new Date(item.Date));
      const prices = data.history.map(item => item.Close);
      const canvasId = `chart-${ticker}`;
      if (charts[canvasId]) updateChart(canvasId, dates, prices);
      else createChart(canvasId, dates, prices, `${ticker} Closing Price`, 'rgba(75, 192, 192, 1)');
      document.getElementById(`updated-${ticker}`).textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    });
}

function fetchCryptoData() {
  const cryptoIds = cryptos.map(c => c.id).join(',');
  fetch(`/api/crypto/prices?fsyms=${cryptoIds}`)
    .then(r => r.json())
    .then(prices => {
      cryptos.forEach(coin => {
        if (prices[coin.id]) {
          const priceEl = document.getElementById(`price-${coin.id}`);
          if (priceEl) priceEl.textContent = `$${prices[coin.id].price.toLocaleString()}`;
          const changeEl = document.getElementById(`change-${coin.id}`);
          if (changeEl) {
            const change = prices[coin.id].change.toFixed(2);
            const changePercent = prices[coin.id].changePercent.toFixed(2);
            changeEl.textContent = `${change} (${changePercent}%)`;
            changeEl.className = 'daily-change';
            if (prices[coin.id].change > 0) changeEl.classList.add('positive');
            else if (prices[coin.id].change < 0) changeEl.classList.add('negative');
          }
          const updatedEl = document.getElementById(`updated-${coin.id}`);
          if (updatedEl) updatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
      });
    });

  cryptos.forEach(coin => {
    fetch(`/api/crypto/history/${coin.id}`)
      .then(r => r.json())
      .then(data => {
        if (!data || data.length === 0) return;
        const dates = data.map(item => new Date(item[0]));
        const prices = data.map(item => item[1]);
        const canvasId = `chart-${coin.id}`;
        if (charts[canvasId]) updateChart(canvasId, dates, prices);
        else createChart(canvasId, dates, prices, `${coin.name} Price`, 'rgba(255, 159, 64, 1)');
      });
  });
}

function showBigChart(id, name, type) {
  document.getElementById('big-chart-container').style.display = 'block';
  document.getElementById('big-chart-title').textContent = `${name} Price Chart`;
  const timeframeButtons = document.querySelectorAll('.timeframe-button');
  timeframeButtons.forEach(button => {
    button.onclick = () => {
      timeframeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      fetchBigChartData(id, type, button.dataset.period);
    };
  });
  fetchBigChartData(id, type, '6mo');
}

function hideBigChart() {
  document.getElementById('big-chart-container').style.display = 'none';
  if (bigChartInstance) { bigChartInstance.destroy(); bigChartInstance = null; }
}

function fetchBigChartData(id, type, period) {
  let historyUrl = type === 'stock' ? `/api/stock/${id}?period=${period}` : `/api/crypto/history/${id}?period=${period}`;
  fetch(historyUrl)
    .then(r => r.json())
    .then(data => {
      let dates, prices;
      if (type === 'stock') {
        const series = Array.isArray(data) ? data : (data && data.history ? data.history : []);
        dates = series.map(item => new Date(item.Date));
        prices = series.map(item => item.Close);
      } else {
        dates = data.map(item => new Date(item[0]));
        prices = data.map(item => item[1]);
      }
      if (bigChartInstance) {
        bigChartInstance.data.labels = dates;
        bigChartInstance.data.datasets[0].data = prices;
        bigChartInstance.update();
      } else {
        const ctx = document.getElementById('big-chart').getContext('2d');
        bigChartInstance = new Chart(ctx, {
          type: 'line',
          data: { labels: dates, datasets: [{ label: `${id} Price`, data: prices, borderColor: 'rgba(0,122,255,1)', borderWidth: 2, fill: true, backgroundColor: 'rgba(0,122,255,0.1)', pointRadius: 0 }] },
          options: { scales: { x: { type: 'time', time: { unit: 'day' } }, y: { ticks: { callback: (v)=> `$${v.toLocaleString()}` } } } }
        });
      }
    });
}

function initializeCharts() {
  const stockContainer = document.getElementById('stock-charts');
  if (!stockContainer) return;
  stocks.forEach(ticker => {
    if (document.getElementById(`chart-${ticker}`)) return;
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart-container';
    chartDiv.innerHTML = `<h3>${ticker}</h3><div class="price-info"><div class="current-price" id="price-${ticker}">-</div><div class="daily-change" id="change-${ticker}"></div></div><div class="stock-info" id="info-${ticker}">Loading info...</div><canvas id="chart-${ticker}"></canvas><div class="last-updated" id="updated-${ticker}"></div>`;
    chartDiv.onclick = () => showBigChart(ticker, ticker, 'stock');
    stockContainer.appendChild(chartDiv);
    fetchStockData(ticker);
  });

  const cryptoContainer = document.getElementById('crypto-charts');
  if (!cryptoContainer) return;
  cryptos.forEach(coin => {
    if (document.getElementById(`chart-${coin.id}`)) return;
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart-container';
    chartDiv.innerHTML = `<h3>${coin.name}</h3><div class="price-info"><div class="current-price" id="price-${coin.id}">-</div><div class="daily-change" id="change-${coin.id}"></div></div><canvas id="chart-${coin.id}"></canvas><div class="last-updated" id="updated-${coin.id}"></div>`;
    chartDiv.onclick = () => showBigChart(coin.id, coin.name, 'crypto');
    cryptoContainer.appendChild(chartDiv);
  });
  fetchCryptoData();
}

function refreshData() {
  stocks.forEach(fetchStockData);
  fetchCryptoData();
}

let refreshInterval;
let lastMarketStatus = null;

function updateMarketStatus() {
  const statusEl = document.getElementById('market-status');
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nyTime.getDay();
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const marketOpen = hour > 9 || (hour === 9 && minute >= 30);
  const marketClose = hour >= 16;
  const isOpen = isWeekday && marketOpen && !marketClose;
  if (isOpen !== lastMarketStatus) {
    lastMarketStatus = isOpen;
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshData, isOpen ? 60000 : 3600000);
    refreshData();
  }
  statusEl.style.color = isOpen ? 'green' : 'black';
  if (isOpen) {
    const closeTime = new Date(nyTime); closeTime.setHours(16,0,0,0);
    statusEl.textContent = `Closes in: ${formatCountdown(closeTime - nyTime)}`;
  } else {
    let openTime = new Date(nyTime);
    if (day === 5 && hour >= 16) openTime.setDate(nyTime.getDate() + 3);
    else if (day === 6) openTime.setDate(nyTime.getDate() + 2);
    else if (hour >= 16) openTime.setDate(nyTime.getDate() + 1);
    openTime.setHours(9,30,0,0);
    statusEl.textContent = `Opens in: ${formatCountdown(openTime - nyTime)}`;
  }
}

function formatCountdown(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCharts();
  setInterval(updateMarketStatus, 1000);
  updateMarketStatus();
  document.getElementById('back-button').onclick = hideBigChart;
});



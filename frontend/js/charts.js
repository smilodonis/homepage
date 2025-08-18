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
let volumeChartInstance;
let macdChartInstance;
let rsiChartInstance;
let currentChartType = 'line';
let usdToEurRate = null;
let currentBigChartData = {};

function formatPriceBoth(value) {
  const usd = `$${value.toLocaleString()}`;
  if (!usdToEurRate) return usd;
  const eur = (value * usdToEurRate);
  return `${usd} · €${eur.toLocaleString()}`;
}

function loadFxRate() {
  return fetch('/api/fx').then(r => r.json()).then(d => { usdToEurRate = d.usdToEur || null; }).catch(() => {});
}

function createChartElement(id, name, type) {
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart-container';
    if (type === 'stock') {
        chartDiv.innerHTML = `<h3>${name}</h3><div class="price-info"><div class="current-price" id="price-${id}">-</div><div class="daily-change" id="change-${id}"></div></div><div class="stock-info" id="info-${id}">Loading info...</div><canvas id="chart-${id}"></canvas><div class="last-updated" id="updated-${id}"></div>`;
    } else {
        chartDiv.innerHTML = `<h3>${name}</h3><div class="price-info"><div class="current-price" id="price-${id}">-</div><div class="daily-change" id="change-${id}"></div></div><canvas id="chart-${id}"></canvas><div class="last-updated" id="updated-${id}"></div>`;
    }
    chartDiv.onclick = () => showBigChart(id, name, type);
    return chartDiv;
}

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

function fetchStockData(ticker, name) {
  fetch(`/api/stock/${ticker}`)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch data for ${ticker}`);
      return r.json();
    })
    .then(data => {
      if (data.error) throw new Error(data.error);

      const displayName = data.info.shortName || name;
      document.querySelector(`#chart-${ticker}`).parentElement.querySelector('h3').textContent = displayName;

      document.getElementById(`price-${ticker}`).textContent = formatPriceBoth(Number(data.info.currentPrice.toFixed(2)));
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
    })
    .catch(error => {
      console.error(error);
      const chartDiv = document.getElementById(`chart-${ticker}`).parentElement;
      chartDiv.innerHTML = `<h3>${ticker}</h3><p style="color:red;">Data not available</p>`;
    });
}

function fetchCryptoData(coins) {
  const cryptoIds = coins.map(c => c).join(',');
  fetch(`/api/crypto/prices?fsyms=${cryptoIds}`)
    .then(r => r.json())
    .then(prices => {
      coins.forEach(coinId => {
        if (prices[coinId]) {
          const priceEl = document.getElementById(`price-${coinId}`);
          if (priceEl) priceEl.textContent = formatPriceBoth(prices[coinId].price);
          const changeEl = document.getElementById(`change-${coinId}`);
          if (changeEl) {
            const change = prices[coinId].change.toFixed(2);
            const changePercent = prices[coinId].changePercent.toFixed(2);
            changeEl.textContent = `${change} (${changePercent}%)`;
            changeEl.className = 'daily-change';
            if (prices[coinId].change > 0) changeEl.classList.add('positive');
            else if (prices[coinId].change < 0) changeEl.classList.add('negative');
          }
          const updatedEl = document.getElementById(`updated-${coinId}`);
          if (updatedEl) updatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
      });
    });

  coins.forEach(coinId => {
    fetch(`/api/crypto/history/${coinId}`)
      .then(r => r.json())
      .then(data => {
        if (!data || data.length === 0) return;
        const dates = data.map(item => new Date(item.time));
        const prices = data.map(item => item.close);
        const canvasId = `chart-${coinId}`;
        if (charts[canvasId]) updateChart(canvasId, dates, prices);
        else createChart(canvasId, dates, prices, `${coinId} Price`, 'rgba(255, 159, 64, 1)');
      });
  });
}

function showBigChart(id, name, type) {
  document.getElementById('big-chart-container').style.display = 'block';
  document.getElementById('big-chart-title').textContent = `${name} Price Chart`;
  currentBigChartData.id = id;
  currentBigChartData.type = type;
  
  const timeframeButtons = document.querySelectorAll('.timeframe-button');
  const defaultButton = document.querySelector('.timeframe-button[data-period="6mo"]');
  timeframeButtons.forEach(btn => btn.classList.remove('active'));
  if (defaultButton) defaultButton.classList.add('active');

  fetchBigChartData(id, type, '6mo');
}

function hideBigChart() {
  document.getElementById('big-chart-container').style.display = 'none';
  if (bigChartInstance) {
    bigChartInstance.destroy();
    bigChartInstance = null;
  }
}

function fetchBigChartData(id, type, period) {
  let historyUrl = type === 'stock' ? `/api/stock/${id}?period=${period}` : `/api/crypto/history/${id}?period=${period}`;
  fetch(historyUrl)
    .then(r => r.json())
    .then(data => {
      let ohlcData, volumeData;
      if (type === 'stock') {
        const series = Array.isArray(data) ? data : (data && data.history ? data.history : []);

        if (['1d', '1wk', '1mo'].includes(period) && series.length > 0) {
            const groupedByDay = series.reduce((acc, item) => {
                const day = new Date(item.Date).toDateString();
                if (!acc[day]) {
                    acc[day] = [];
                }
                acc[day].push(item);
                return acc;
            }, {});

            ohlcData = [];
            volumeData = [];
            let dayOffset = 0;
            const sortedDays = Object.keys(groupedByDay).sort((a, b) => new Date(a) - new Date(b));
            const syntheticStartDate = new Date(sortedDays[0]);
            syntheticStartDate.setHours(0, 0, 0, 0);

            for (const day of sortedDays) {
                const daySeries = groupedByDay[day];
                const firstTimestamp = new Date(daySeries[0].Date).getTime();
                const lastTimestamp = new Date(daySeries[daySeries.length - 1].Date).getTime();
                const tradingDuration = lastTimestamp - firstTimestamp;

                const stretchedDayData = daySeries.map(item => {
                    const originalTimestamp = new Date(item.Date).getTime();
                    const percentageOfDay = tradingDuration > 0 ? (originalTimestamp - firstTimestamp) / tradingDuration : 0;
                    const newTimestamp = syntheticStartDate.getTime() + (dayOffset * 24 * 60 * 60 * 1000) + (percentageOfDay * (24 * 60 * 60 * 1000));
                    
                    return {
                        ohlc: {
                            x: new Date(newTimestamp),
                            o: item.Open,
                            h: item.High,
                            l: item.Low,
                            c: item.Close
                        },
                        volume: {
                            x: new Date(newTimestamp),
                            y: item.Volume
                        }
                    };
                });
                
                ohlcData.push(...stretchedDayData.map(d => d.ohlc));
                volumeData.push(...stretchedDayData.map(d => d.volume));
                dayOffset++;
            }
        } else {
            ohlcData = series.map(item => ({
                x: new Date(item.Date),
                o: item.Open,
                h: item.High,
                l: item.Low,
                c: item.Close
            }));
            volumeData = series.map(item => ({
              x: new Date(item.Date),
              y: item.Volume
            }));
        }
      } else {
        ohlcData = data.map(item => ({
          x: new Date(item.time),
          o: item.open,
          h: item.high,
          l: item.low,
          c: item.close
        }));
        volumeData = data.map(item => ({
          x: new Date(item.time),
          y: item.volumefrom
        }));
      }

      currentBigChartData = { id, type, ohlcData, volumeData };
      renderBigChart();
    });
}

function renderBigChart() {
    const { id, ohlcData, volumeData } = currentBigChartData;
    if (!ohlcData) return;

    // Calculate 50-day SMA
    const smaData = [];
    if (ohlcData.length >= 50) {
        for (let i = 49; i < ohlcData.length; i++) {
            const sum = ohlcData.slice(i - 49, i + 1).reduce((acc, val) => acc + val.c, 0);
            smaData.push({ x: ohlcData[i].x, y: sum / 50 });
        }
    }

    const datasets = [{
        type: currentChartType === 'candlestick' ? 'candlestick' : 'line',
        label: `${id} Price`,
        data: currentChartType === 'candlestick' ? ohlcData : ohlcData.map(d => ({x: d.x, y: d.c})),
        borderColor: 'rgba(0,122,255,1)',
        borderWidth: 2,
        fill: currentChartType === 'line',
        backgroundColor: 'rgba(0,122,255,0.1)',
        yAxisID: 'y',
        parsing: currentChartType === 'candlestick' ? false : undefined,
        barPercentage: 0.5,
        categoryPercentage: 0.5
    }];

    const scales = {
        x: { type: 'time', time: { unit: 'day' } },
        y: { position: 'left', ticks: { callback: (v) => `$${v.toLocaleString()}` } }
    };

    if (document.querySelector('.indicator-toggle-button[data-indicator="volume"][data-enabled="true"]')) {
      datasets.push({
          type: 'bar',
          label: 'Volume',
          data: volumeData,
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          yAxisID: 'y3'
      });
      scales.y3 = {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
              callback: function(value, index, values) {
                  return value / 1e6 + 'M';
              }
          }
      };
    }

    if (document.querySelector('.indicator-toggle-button[data-indicator="sma"][data-enabled="true"]')) {
        datasets.push({
            label: '50-Day SMA',
            data: smaData,
            type: 'line',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            yAxisID: 'y'
        });
    }

    if (document.querySelector('.indicator-toggle-button[data-indicator="macd"][data-enabled="true"]')) {
        const macdData = calculateMACD(ohlcData.map(d => d.c));
        datasets.push({
            label: 'MACD',
            data: macdData.map((d, i) => ({x: ohlcData[i].x, y: d.macd})),
            type: 'line',
            borderColor: 'rgba(0, 0, 255, 1)',
            borderWidth: 1,
            pointRadius: 0,
            yAxisID: 'y1'
        });
        datasets.push({
            label: 'Signal',
            data: macdData.map((d, i) => ({x: ohlcData[i].x, y: d.signal})),
            type: 'line',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
            pointRadius: 0,
            yAxisID: 'y1'
        });
        scales.y1 = { type: 'linear', position: 'right', grid: { drawOnChartArea: false } };
    }

    if (document.querySelector('.indicator-toggle-button[data-indicator="rsi"][data-enabled="true"]')) {
        const rsiData = calculateRSI(ohlcData.map(d => d.c));
        datasets.push({
            label: 'RSI',
            data: rsiData.map((d, i) => ({x: ohlcData[i].x, y: d})),
            type: 'line',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
            pointRadius: 0,
            yAxisID: 'y2'
        });
        scales.y2 = { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100 };
    }

    if (bigChartInstance) {
        bigChartInstance.data.datasets = datasets;
        bigChartInstance.options.scales = scales;
        bigChartInstance.update();
        return;
    }

    const mainChartCtx = document.getElementById('big-chart').getContext('2d');
    bigChartInstance = new Chart(mainChartCtx, {
        data: { datasets },
        options: {
            scales,
            plugins: {
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true }, mode: 'x' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

function setupChartTypeSwitcher() {
    const chartTypeButtons = document.querySelectorAll('.chart-type-button');
    chartTypeButtons.forEach(button => {
        button.onclick = (e) => {
            e.preventDefault();
            chartTypeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentChartType = button.dataset.chartType;
            renderBigChart();
        };
    });
}

function setupIndicatorToggles() {
    const indicatorToggleButtons = document.querySelectorAll('.indicator-toggle-button');
    indicatorToggleButtons.forEach(button => {
        button.onclick = (e) => {
            e.preventDefault();
            const enabled = button.dataset.enabled === 'true';
            button.dataset.enabled = !enabled;
            renderBigChart();
        };
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

function refreshData(stocks, cryptos) {
  stocks.forEach(ticker => fetchStockData(ticker, ticker));
  fetchCryptoData(cryptos);
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
    
    // We need to fetch the portfolio again to get the lists for the refresh function
    fetch('/api/portfolio').then(r=>r.json()).then(portfolio => {
        const stocksToRefresh = portfolio.chartStocks || [];
        const cryptosToRefresh = portfolio.chartCryptos || [];
        refreshInterval = setInterval(() => refreshData(stocksToRefresh, cryptosToRefresh), isOpen ? 60000 : 3600000);
        refreshData(stocksToRefresh, cryptosToRefresh);
    });
  }
  statusEl.style.color = isOpen ? 'green' : 'black';
  if (isOpen) {
    const closeTime = new Date(nyTime); closeTime.setHours(16,0,0,0);
    statusEl.textContent = `Market Open · Closes in: ${formatCountdown(closeTime - nyTime)}`;
  } else {
    let openTime = new Date(nyTime);
    openTime.setHours(9, 30, 0, 0);
    if (day === 6) { // Saturday
      openTime.setDate(nyTime.getDate() + 2);
    } else if (day === 0) { // Sunday
      openTime.setDate(nyTime.getDate() + 1);
    } else if (day === 5 && (hour > 16 || (hour === 16 && minute >= 0))) { // Friday after close
      openTime.setDate(nyTime.getDate() + 3);
    } else if (hour > 16 || (hour === 16 && minute >= 0)) { // Weekday after close
      openTime.setDate(nyTime.getDate() + 1);
    }
    statusEl.textContent = `Market Closed · Opens in: ${formatCountdown(openTime - nyTime)}`;
  }
}

function formatCountdown(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

function calculateMACD(data) {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macd = ema12.map((val, i) => val - ema26[i]);
    const signal = calculateEMA(macd, 9);
    return macd.map((val, i) => ({ macd: val, signal: signal[i] }));
}

function calculateRSI(data, period = 14) {
    let gains = 0;
    let losses = 0;
    const rsi = [];

    for (let i = 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        if (diff > 0) {
            gains += diff;
        } else {
            losses -= diff;
        }

        if (i >= period) {
            const avgGain = gains / period;
            const avgLoss = losses / period;
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));

            const prevDiff = data[i - period + 1] - data[i - period];
            if (prevDiff > 0) {
                gains -= prevDiff;
            } else {
                losses += prevDiff;
            }
        } else {
            rsi.push(null);
        }
    }
    return rsi;
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadFxRate();
    updateMarketStatus();
    setInterval(updateMarketStatus, 1000);

    try {
        const portfolioRes = await fetch('/api/portfolio');
        const portfolio = await portfolioRes.json();

        const stocks = portfolio.chartStocks || [];
        const cryptos = portfolio.chartCryptos || [];

        const stockChartsContainer = document.getElementById('stock-charts');
        stockChartsContainer.innerHTML = ''; // Clear any default/placeholder content
        stocks.forEach(ticker => {
            const chartEl = createChartElement(ticker, ticker, 'stock');
            stockChartsContainer.appendChild(chartEl);
            fetchStockData(ticker, ticker); // Use ticker for name initially
        });

        const cryptoChartsContainer = document.getElementById('crypto-charts');
        cryptoChartsContainer.innerHTML = ''; // Clear any default/placeholder content
        cryptos.forEach(symbol => {
            const chartEl = createChartElement(symbol, symbol, 'crypto');
            cryptoChartsContainer.appendChild(chartEl);
        });
        fetchCryptoData(cryptos);

    } catch (error) {
        console.error("Failed to load chart tickers from portfolio:", error);
        const stockChartsContainer = document.getElementById('stock-charts');
        stockChartsContainer.textContent = 'Could not load chart configuration. Please check settings.';
    }


    // Big chart controls setup
    document.getElementById('close-button').onclick = hideBigChart;
  
  const timeframeButtons = document.querySelectorAll('.timeframe-button');
  timeframeButtons.forEach(button => {
    button.onclick = (e) => {
      e.preventDefault();
      timeframeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const { id, type } = currentBigChartData;
      fetchBigChartData(id, type, button.dataset.period);
    };
  });
  
  setupChartTypeSwitcher();
  setupIndicatorToggles();
});



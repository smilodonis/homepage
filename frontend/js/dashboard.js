// Portfolio dashboard logic extracted
let portfolio = { stocks: [], cryptos: [], companies: [], other: [] };

let networthChart;
let allocationChart;
let usdToEurRate = null;
const portfolioState = {
  days: 90,
  include: { stocks: true, crypto: true, companies: true, other: true },
  stockHistories: {},
  cryptoHistories: {},
  currentPrices: { stocks: {}, crypto: {} }
};

function formatUSD(v) { return `$${(v || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}`; }
function formatBoth(v) {
  const usd = formatUSD(v);
  if (!usdToEurRate) return usd;
  const eur = (v || 0) * usdToEurRate;
  return `${usd} · €${eur.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
}
async function loadFxRate() {
  try { const r = await fetch('/api/fx'); const d = await r.json(); usdToEurRate = d.usdToEur || null; } catch {}
}

async function fetchPortfolioData() {
  // ensure holdings loaded
  if (!portfolio.stocks.length && !portfolio.cryptos.length && !portfolio.companies.length && !portfolio.other.length) {
    await loadHoldings();
  }
  await Promise.all(portfolio.stocks.map(async (s) => {
    const res = await fetch(`/api/stock/${s.ticker}?period=1y`);
    const data = await res.json();
    const hist = (Array.isArray(data) ? data : data.history) || [];
    portfolioState.stockHistories[s.ticker] = hist.map(it => ({ date: new Date(it.Date), close: it.Close }));
    if (!Array.isArray(data)) {
      portfolioState.currentPrices.stocks[s.ticker] = data.info.currentPrice;
      s.annualDividend = data.info.annualDividend;
    }
    else if (hist.length) portfolioState.currentPrices.stocks[s.ticker] = hist[hist.length-1].Close;
  }));

  const cryptoSymbols = portfolio.cryptos.map(c => c.symbol).join(',');
  const priceRes = await fetch(`/api/crypto/prices?fsyms=${cryptoSymbols}`);
  const priceJson = await priceRes.json();
  Object.keys(priceJson || {}).forEach(sym => { portfolioState.currentPrices.crypto[sym] = priceJson[sym]?.price || 0; });

  await Promise.all(portfolio.cryptos.map(async (c) => {
    const res = await fetch(`/api/crypto/history/${c.symbol}?period=1y`);
    const data = await res.json();
    portfolioState.cryptoHistories[c.symbol] = Array.isArray(data) ? data : [];
  }));
}

async function loadHoldings() {
  const res = await fetch('/api/portfolio');
  const data = await res.json();
  portfolio = data || { stocks: [], cryptos: [], companies: [], other: [] };
}

function buildDailyRange(days) {
  const dates = [];
  const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - days + 1);
  const cur = new Date(start);
  while (cur <= new Date()) { dates.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return dates;
}

function computeCurrentValues() {
  let stocksVal = 0, cryptoVal = 0, companiesVal = 0, otherVal = 0;
  portfolio.stocks.forEach(s => { const p = portfolioState.currentPrices.stocks[s.ticker] || 0; stocksVal += p * s.shares; });
  portfolio.cryptos.forEach(c => { const p = portfolioState.currentPrices.crypto[c.symbol] || 0; cryptoVal += p * c.units; });
  portfolio.companies.forEach(co => { companiesVal += (Number(co.investedUSD || 0)) / (usdToEurRate || 1); });
  portfolio.other.forEach(o => { 
    const last = (o.valueHistory[o.valueHistory.length-1]?.[1] || o.latestValuationUSD || 0) / (usdToEurRate || 1);
    otherVal += last; 
  });
  return { stocksVal, cryptoVal, companiesVal, otherVal, total: stocksVal + cryptoVal + companiesVal + otherVal };
}

function computeDailySeries(days) {
  const dates = buildDailyRange(days);
  const dayKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
  const stockMaps = {}; portfolio.stocks.forEach(s => { const map = {}; (portfolioState.stockHistories[s.ticker] || []).forEach(pt => { map[dayKey(pt.date)] = pt.close; }); stockMaps[s.ticker] = map; });
  const cryptoMaps = {}; portfolio.cryptos.forEach(c => { const map = {}; (portfolioState.cryptoHistories[c.symbol] || []).forEach(pt => { const d = new Date(pt[0]); map[dayKey(d)] = pt[1]; }); cryptoMaps[c.symbol] = map; });
  const series = []; let lastStockVal = 0, lastCryptoVal = 0, lastCompaniesVal = 0, lastOtherVal = 0;
  dates.forEach(d => {
    const k = dayKey(d); let sv = 0, cv = 0, pv = 0, ov = 0;
    if (portfolioState.include.stocks) { portfolio.stocks.forEach(s => { const px = stockMaps[s.ticker][k]; sv += (px !== undefined ? px : 0) * s.shares; }); if (sv === 0 && lastStockVal) sv = lastStockVal; }
    if (portfolioState.include.crypto) { portfolio.cryptos.forEach(c => { const px = cryptoMaps[c.symbol][k]; cv += (px !== undefined ? px : 0) * c.units; }); if (cv === 0 && lastCryptoVal) cv = lastCryptoVal; }
    if (portfolioState.include.companies) { portfolio.companies.forEach(co => { pv += (Number(co.investedUSD || 0)) / (usdToEurRate || 1); }); if (pv === 0 && lastCompaniesVal) pv = lastCompaniesVal; }
    if (portfolioState.include.other) { portfolio.other.forEach(o => { let val = 0; for (let i=0;i<o.valueHistory.length;i++) { if (o.valueHistory[i][0] <= d.getTime()) val = o.valueHistory[i][1]; else break; } ov += (val || 0) / (usdToEurRate || 1); }); if (ov === 0 && lastOtherVal) ov = lastOtherVal; }
    const total = sv + cv + pv + ov; series.push([d, total, sv, cv, pv, ov]);
    lastStockVal = sv || lastStockVal; lastCryptoVal = cv || lastCryptoVal; lastCompaniesVal = pv || lastCompaniesVal; lastOtherVal = ov || lastOtherVal;
  });
  return series;
}

function renderTables() {
  const tbodyS = document.querySelector('#table-stocks tbody');
  tbodyS.innerHTML = '';
  portfolio.stocks.forEach(s => {
    const price = portfolioState.currentPrices.stocks[s.ticker] || 0;
    const value = price * s.shares;
    const pl = (price - s.costBasis) * s.shares;
    const monthlyDividend = (s.annualDividend || 0) * s.shares / 12;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.ticker}</td><td>${s.shares}</td><td>${formatBoth(price)}</td><td>${formatBoth(value)}</td><td style="color:${pl>=0?'#28a745':'#dc3545'}">${pl>=0?'+':''}${pl.toLocaleString(undefined,{maximumFractionDigits:0})}</td><td>${formatBoth(monthlyDividend)}</td>`;
    tbodyS.appendChild(tr);
  });

  const tbodyC = document.querySelector('#table-crypto tbody');
  tbodyC.innerHTML = '';
  portfolio.cryptos.forEach(c => {
    const price = portfolioState.currentPrices.crypto[c.symbol] || 0;
    const value = price * c.units;
    const pl = (price - c.costBasis) * c.units;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.symbol}</td><td>${c.units}</td><td>${formatBoth(price)}</td><td>${formatBoth(value)}</td><td style=\"color:${pl>=0?'#28a745':'#dc3545'}\">${pl>=0?'+':''}${pl.toLocaleString(undefined,{maximumFractionDigits:0})}</td>`;
    tbodyC.appendChild(tr);
  });

  const tbodyP = document.querySelector('#table-companies tbody');
  tbodyP.innerHTML = '';
  portfolio.companies.forEach(co => {
    const invested = (Number(co.investedUSD || 0)) / (usdToEurRate || 1);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${co.name}</td><td colspan="2">Invested</td><td>${formatBoth(invested)}</td><td></td>`;
    tbodyP.appendChild(tr);
  });

  const tbodyO = document.querySelector('#table-other tbody');
  tbodyO.innerHTML = '';
  portfolio.other.forEach(o => {
    const latest = (o.valueHistory[o.valueHistory.length-1]?.[1] || o.latestValuationUSD || 0) / (usdToEurRate || 1);
    const first = (o.valueHistory[0]?.[1] || latest) / (usdToEurRate || 1);
    const pl = latest - first;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${o.name}</td><td>${formatBoth((o.latestValuationUSD || latest) / (usdToEurRate || 1))}</td><td>${formatBoth(latest)}</td><td style="color:${pl>=0?'#28a745':'#dc3545'}">${pl>=0?'+':''}${pl.toLocaleString(undefined,{maximumFractionDigits:0})}</td>`;
    tbodyO.appendChild(tr);
  });
}

function renderPortfolio() {
  const { stocksVal, cryptoVal, companiesVal, otherVal, total } = computeCurrentValues();
  const prevSeries = computeDailySeries(Math.min(portfolioState.days+1, 365));
  const last = prevSeries[prevSeries.length-1]?.[1] || 0;
  const prev = prevSeries[prevSeries.length-2]?.[1] || last;
  const delta = last - prev;
  const deltaPct = prev ? (delta/prev)*100 : 0;
  document.getElementById('nw-total').textContent = formatBoth(total);
  const nwDeltaEl = document.getElementById('nw-delta');
  nwDeltaEl.textContent = `${delta>=0?'+':''}${delta.toLocaleString(undefined,{maximumFractionDigits:0})} (${deltaPct.toFixed(2)}%)`;
  nwDeltaEl.className = `delta ${delta>=0?'positive':'negative'}`;
  document.getElementById('nw-stocks').textContent = formatBoth(stocksVal);
  document.getElementById('nw-crypto').textContent = formatBoth(cryptoVal);
  document.getElementById('nw-companies').textContent = formatBoth(companiesVal);
  document.getElementById('nw-other').textContent = formatBoth(otherVal);

  const series = computeDailySeries(portfolioState.days);
  const labels = series.map(s => s[0]);
  const values = series.map(s => s[1]);
  if (networthChart) networthChart.destroy();
  networthChart = new Chart(document.getElementById('networth-chart').getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Net Worth', data: values, borderColor: '#007aff', backgroundColor: 'rgba(0,122,255,0.1)', fill: true, pointRadius: 0, borderWidth: 2 }] },
    options: { scales: { x: {type:'time', time:{unit:'month'}}, y: { ticks: { callback: (v)=> `$${v.toLocaleString()}` } } }, plugins:{ legend:{display:false} } }
  });

  if (allocationChart) allocationChart.destroy();
  const allocData = [stocksVal, cryptoVal, companiesVal, otherVal];
  allocationChart = new Chart(document.getElementById('allocation-chart').getContext('2d'), {
    type: 'doughnut',
    data: { labels: ['Stocks','Crypto','Companies','Other'], datasets: [{ data: allocData, backgroundColor: ['#4bc0c0','#ff9f40','#9966ff','#6c757d'] }] },
    options: { plugins: { legend: { position: 'bottom' } } }
  });

  renderTables();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      portfolioState.days = parseInt(btn.dataset.days, 10);
      renderPortfolio();
    });
  });
  document.getElementById('inc-stocks').addEventListener('change', (e) => { portfolioState.include.stocks = e.target.checked; renderPortfolio(); });
  document.getElementById('inc-crypto').addEventListener('change', (e) => { portfolioState.include.crypto = e.target.checked; renderPortfolio(); });
  document.getElementById('inc-companies').addEventListener('change', (e) => { portfolioState.include.companies = e.target.checked; renderPortfolio(); });
  document.getElementById('inc-other').addEventListener('change', (e) => { portfolioState.include.other = e.target.checked; renderPortfolio(); });
  loadFxRate().then(() => loadHoldings().then(() => fetchPortfolioData().then(renderPortfolio)));
});



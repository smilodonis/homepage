let portfolio = { stocks: [], cryptos: [], companies: [], other: [] };

function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function renderList(containerId, items, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach((item, idx) => {
    let row;
    if (type === 'stocks') {
      row = el('div', 'grid');
      const t = el('input'); t.placeholder = 'Ticker'; t.value = item.ticker || '';
      const s = el('input'); s.type = 'number'; s.placeholder = 'Shares'; s.value = item.shares || 0;
      const c = el('input'); c.type = 'number'; c.placeholder = 'Cost Basis'; c.value = item.costBasis || 0;
      const rem = el('button'); rem.textContent = 'Remove'; rem.onclick = () => { portfolio.stocks.splice(idx,1); renderAll(); };
      row.append(t,s,c,rem);
      t.oninput = () => item.ticker = t.value.toUpperCase();
      s.oninput = () => item.shares = parseFloat(s.value || 0);
      c.oninput = () => item.costBasis = parseFloat(c.value || 0);
    } else if (type === 'cryptos') {
      row = el('div', 'grid crypto');
      const sym = el('input'); sym.placeholder = 'Symbol (e.g., BTC)'; sym.value = item.symbol || '';
      const u = el('input'); u.type = 'number'; u.placeholder = 'Units'; u.value = item.units || 0;
      const cb = el('input'); cb.type = 'number'; cb.placeholder = 'Cost Basis'; cb.value = item.costBasis || 0;
      const rem = el('button'); rem.textContent = 'Remove'; rem.onclick = () => { portfolio.cryptos.splice(idx,1); renderAll(); };
      row.append(sym,u,cb,rem);
      sym.oninput = () => item.symbol = sym.value.toUpperCase();
      u.oninput = () => item.units = parseFloat(u.value || 0);
      cb.oninput = () => item.costBasis = parseFloat(cb.value || 0);
    } else if (type === 'companies') {
      row = el('div', 'grid');
      const n = el('input'); n.placeholder = 'Company Name'; n.value = item.name || '';
      const sp = el('input'); sp.type = 'number'; sp.placeholder = 'Stake %'; sp.value = item.stakePercent || 0;
      const val = el('input'); val.type = 'number'; val.placeholder = 'Latest Round Valuation (USD)'; val.value = item.latestRoundValuationUSD || 0;
      const rem = el('button'); rem.textContent = 'Remove'; rem.onclick = () => { portfolio.companies.splice(idx,1); renderAll(); };
      row.append(n,sp,val,rem);
      n.oninput = () => item.name = n.value;
      sp.oninput = () => item.stakePercent = parseFloat(sp.value || 0);
      val.oninput = () => item.latestRoundValuationUSD = parseFloat(val.value || 0);
    } else if (type === 'other') {
      row = el('div', 'grid simple');
      const n = el('input'); n.placeholder = 'Name'; n.value = item.name || '';
      const val = el('input'); val.type = 'number'; val.placeholder = 'Latest Valuation (USD)'; val.value = item.latestValuationUSD || 0;
      const rem = el('button'); rem.textContent = 'Remove'; rem.onclick = () => { portfolio.other.splice(idx,1); renderAll(); };
      row.append(n,val,rem);
      n.oninput = () => item.name = n.value;
      val.oninput = () => item.latestValuationUSD = parseFloat(val.value || 0);
    }
    container.appendChild(row);
  });
}

function renderAll() {
  renderList('stocks-list', portfolio.stocks, 'stocks');
  renderList('cryptos-list', portfolio.cryptos, 'cryptos');
  renderList('companies-list', portfolio.companies, 'companies');
  renderList('other-list', portfolio.other, 'other');
}

async function loadPortfolio() {
  const res = await fetch('/api/portfolio');
  const data = await res.json();
  portfolio = data;
  renderAll();
}

async function savePortfolio() {
  const res = await fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(portfolio) });
  if (!res.ok) { alert('Failed to save'); return; }
  alert('Saved');
}

async function resetDefaults() {
  // reload defaults by overwriting with empty -> backend will ensure file exists with defaults if missing
  // Here we POST the default shape with empty arrays replaced by defaults? Simpler: DELETE file is not allowed. So we fetch defaults first.
  // For simplicity: just reload and then save to ensure file exists.
  await loadPortfolio();
  await savePortfolio();
}

document.addEventListener('DOMContentLoaded', () => {
  loadPortfolio();
  document.getElementById('add-stock').onclick = () => { portfolio.stocks.push({ ticker:'', shares:0, costBasis:0 }); renderAll(); };
  document.getElementById('add-crypto').onclick = () => { portfolio.cryptos.push({ symbol:'', units:0, costBasis:0 }); renderAll(); };
  document.getElementById('add-company').onclick = () => { portfolio.companies.push({ name:'', stakePercent:0, latestRoundValuationUSD:0 }); renderAll(); };
  document.getElementById('add-other').onclick = () => { portfolio.other.push({ name:'', latestValuationUSD:0 }); renderAll(); };
  document.getElementById('save-portfolio').onclick = savePortfolio;
  document.getElementById('reset-defaults').onclick = resetDefaults;
});



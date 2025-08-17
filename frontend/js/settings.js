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
      const tWrap = el('label', 'field');
      tWrap.appendChild(el('span', 'field-label', 'Ticker'));
      const t = el('input'); t.placeholder = 'e.g., AAPL'; t.value = item.ticker || '';
      tWrap.appendChild(t);
      const sWrap = el('label', 'field');
      sWrap.appendChild(el('span', 'field-label', 'Shares'));
      const s = el('input'); s.type = 'number'; s.placeholder = 'e.g., 10'; s.value = item.shares || 0;
      sWrap.appendChild(s);
      const cWrap = el('label', 'field');
      cWrap.appendChild(el('span', 'field-label', 'Cost Basis (USD)'));
      const c = el('input'); c.type = 'number'; c.placeholder = 'e.g., 150'; c.value = item.costBasis || 0;
      cWrap.appendChild(c);
      const rem = el('button', 'remove-btn'); rem.textContent = 'Remove'; rem.onclick = () => { portfolio.stocks.splice(idx,1); renderAll(); };
      row.append(tWrap,sWrap,cWrap,rem);
      t.oninput = () => item.ticker = t.value.toUpperCase();
      s.oninput = () => item.shares = parseFloat(s.value || 0);
      c.oninput = () => item.costBasis = parseFloat(c.value || 0);
    } else if (type === 'cryptos') {
      row = el('div', 'grid crypto');
      const symWrap = el('label', 'field');
      symWrap.appendChild(el('span', 'field-label', 'Symbol'));
      const sym = el('input'); sym.placeholder = 'e.g., BTC'; sym.value = item.symbol || '';
      symWrap.appendChild(sym);
      const uWrap = el('label', 'field');
      uWrap.appendChild(el('span', 'field-label', 'Units'));
      const u = el('input'); u.type = 'number'; u.placeholder = 'e.g., 0.5'; u.value = item.units || 0;
      uWrap.appendChild(u);
      const cbWrap = el('label', 'field');
      cbWrap.appendChild(el('span', 'field-label', 'Cost Basis (USD)'));
      const cb = el('input'); cb.type = 'number'; cb.placeholder = 'e.g., 30000'; cb.value = item.costBasis || 0;
      cbWrap.appendChild(cb);
      const rem = el('button', 'remove-btn'); rem.textContent = 'Remove'; rem.onclick = () => { portfolio.cryptos.splice(idx,1); renderAll(); };
      row.append(symWrap,uWrap,cbWrap,rem);
      sym.oninput = () => item.symbol = sym.value.toUpperCase();
      u.oninput = () => item.units = parseFloat(u.value || 0);
      cb.oninput = () => item.costBasis = parseFloat(cb.value || 0);
    } else if (type === 'companies') {
      row = el('div', 'grid');
      const nWrap = el('label', 'field');
      nWrap.appendChild(el('span', 'field-label', 'Company Name'));
      const n = el('input'); n.placeholder = 'e.g., Acme Inc.'; n.value = item.name || '';
      nWrap.appendChild(n);
      const valWrap = el('label', 'field');
      valWrap.appendChild(el('span', 'field-label', 'Invested Amount (EUR)'));
      const val = el('input'); val.type = 'number'; val.placeholder = 'e.g., 50000'; val.value = item.investedUSD || 0;
      valWrap.appendChild(val);
      const rem = el('button', 'remove-btn'); rem.textContent = 'Remove'; rem.onclick = () => { portfolio.companies.splice(idx,1); renderAll(); };
      row.append(nWrap,valWrap,rem);
      n.oninput = () => item.name = n.value;
      val.oninput = () => item.investedUSD = parseFloat(val.value || 0);
    } else if (type === 'other') {
      row = el('div', 'grid simple');
      const nWrap = el('label', 'field');
      nWrap.appendChild(el('span', 'field-label', 'Name'));
      const n = el('input'); n.placeholder = 'e.g., Savings'; n.value = item.name || '';
      nWrap.appendChild(n);
      const valWrap = el('label', 'field');
      valWrap.appendChild(el('span', 'field-label', 'Latest Valuation (EUR)'));
      const val = el('input'); val.type = 'number'; val.placeholder = 'e.g., 25000'; val.value = item.latestValuationUSD || 0;
      valWrap.appendChild(val);
      const rem = el('button', 'remove-btn'); rem.textContent = 'Remove'; rem.onclick = () => { portfolio.other.splice(idx,1); renderAll(); };
      row.append(nWrap,valWrap,rem);
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
  document.getElementById('add-company').onclick = () => { portfolio.companies.push({ name:'', investedUSD:0 }); renderAll(); };
  document.getElementById('add-other').onclick = () => { portfolio.other.push({ name:'', latestValuationUSD:0 }); renderAll(); };
  document.getElementById('save-portfolio').onclick = savePortfolio;
  document.getElementById('reset-defaults').onclick = resetDefaults;
});



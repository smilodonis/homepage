from flask import Flask, jsonify, send_from_directory, request
import os
import json
import yfinance as yf
import requests
import feedparser
import pandas as pd

app = Flask(__name__, static_folder='../frontend', static_url_path='/')

# Portfolio storage
BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, 'data')
PORTFOLIO_FILE = os.path.join(DATA_DIR, 'portfolio.json')

DEFAULT_PORTFOLIO = {
    "stocks": [
        { "ticker": "AAPL", "shares": 20, "costBasis": 150 },
        { "ticker": "NVDA", "shares": 6, "costBasis": 400 },
        { "ticker": "MSFT", "shares": 8, "costBasis": 300 }
    ],
    "cryptos": [
        { "symbol": "BTC", "units": 0.25, "costBasis": 30000 },
        { "symbol": "ETH", "units": 2.5, "costBasis": 1500 }
    ],
    "companies": [
        { "name": "Acme Startup", "investedUSD": 50000 },
        { "name": "Beta Holdings", "investedUSD": 75000 }
    ],
    "other": [
        { "name": "Savings Account", "latestValuationUSD": 25000, "valueHistory": [] },
        { "name": "Gold ETF", "latestValuationUSD": 12000, "valueHistory": [] }
    ]
}

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'dashboard.html')

@app.route('/dashboard')
def dashboard_page():
    return send_from_directory(app.static_folder, 'dashboard.html')

@app.route('/charts')
def charts_page():
    return send_from_directory(app.static_folder, 'charts.html')

@app.route('/news')
def news_page():
    return send_from_directory(app.static_folder, 'news.html')

@app.route('/settings')
def settings_page():
    return send_from_directory(app.static_folder, 'settings.html')

@app.route('/api/news')
def get_news():
    feeds = {
        "Reuters": "https://www.reuters.com/markets/us/rss",
        "Yahoo Finance": "https://finance.yahoo.com/rss/topstories",
        "Wall Street Journal": "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
        "StockTitan": "https://www.stocktitan.net/rss"
    }
    all_entries = []
    for source, url in feeds.items():
        feed = feedparser.parse(url)
        for entry in feed.entries:
            entry['source'] = source
            all_entries.append(entry)
    
    all_entries.sort(key=lambda x: x.published_parsed, reverse=True)
    return jsonify(all_entries)

@app.route('/styles.css')
def styles_file():
    return send_from_directory(app.static_folder, 'styles.css')

@app.route('/js/<path:filename>')
def js_files(filename):
    return send_from_directory(app.static_folder + '/js', filename)

@app.route('/api/fx')
def get_fx():
    try:
        # Use Frankfurter API for a simple USD->EUR rate
        resp = requests.get('https://api.frankfurter.app/latest?from=USD&to=EUR', timeout=5)
        resp.raise_for_status()
        data = resp.json()
        rate = (data.get('rates') or {}).get('EUR')
        if rate is None:
            return jsonify({ 'usdToEur': None, 'error': 'EUR rate missing from provider' }), 502
        return jsonify({ 'usdToEur': rate })
    except Exception as e:
        return jsonify({ 'usdToEur': None, 'error': str(e) }), 502

def _ensure_portfolio_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(PORTFOLIO_FILE):
        with open(PORTFOLIO_FILE, 'w') as f:
            json.dump(DEFAULT_PORTFOLIO, f)

@app.route('/api/portfolio', methods=['GET', 'POST'])
def portfolio_api():
    _ensure_portfolio_file()
    if request.method == 'GET':
        with open(PORTFOLIO_FILE, 'r') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = DEFAULT_PORTFOLIO
        return jsonify(data)
    # POST: replace entire portfolio
    payload = request.get_json(silent=True)
    if payload is None or not isinstance(payload, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400
    # basic shape validation
    for key in ["stocks", "cryptos", "companies", "other"]:
        if key not in payload or not isinstance(payload[key], list):
            return jsonify({"error": f"Missing or invalid '{key}' list"}), 400
    with open(PORTFOLIO_FILE, 'w') as f:
        json.dump(payload, f)
    return jsonify({"status": "ok"})


@app.route('/api/stock/<ticker>')
def get_stock_data(ticker):
    period = request.args.get('period', '1y')
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)
    info = stock.info

    # Calculate TTM dividends
    dividends = stock.dividends
    now = pd.Timestamp.now(tz='UTC')
    ttm_dividends = dividends[dividends.index > now - pd.DateOffset(years=1)]
    annual_dividend = ttm_dividends.sum()

    # Temp debug to see what keys are in info
    print(f"Dividends for {ticker}: {stock.dividends}")
    
    previous_close = hist['Close'].iloc[-2] if len(hist['Close']) > 1 else 0
    current_price = info.get('currentPrice') or info.get('previousClose')
    change = current_price - previous_close
    change_percent = (change / previous_close) * 100 if previous_close else 0
    
    data = {
        'history': hist.reset_index().to_dict(orient='records'),
        'info': {
            'shortName': info.get('shortName'),
            'symbol': info.get('symbol'),
            'sector': info.get('sector'),
            'country': info.get('country'),
            'marketCap': info.get('marketCap'),
            'trailingPE': info.get('trailingPE'),
            'currentPrice': current_price,
            'change': change,
            'changePercent': change_percent,
            'dividendYield': info.get('dividendYield'),
            'annualDividend': annual_dividend
        }
    }
    return jsonify(data)

@app.route('/api/crypto/prices')
def get_crypto_prices():
    coins = request.args.get('fsyms')
    url = f"https://min-api.cryptocompare.com/data/pricemultifull?fsyms={coins}&tsyms=USD"
    response = requests.get(url)
    data = response.json()
    
    prices = {}
    if 'RAW' in data:
        for coin, details in data['RAW'].items():
            if 'USD' in details:
                prices[coin] = {
                    'price': details['USD']['PRICE'],
                    'change': details['USD']['CHANGEDAY'],
                    'changePercent': details['USD']['CHANGEPCTDAY']
                }
    return jsonify(prices)


@app.route('/api/crypto/history/<coin>')
def get_crypto_history(coin):
    period = request.args.get('period', '6mo')
    limit_map = {'7d': 7, '1mo': 30, '6mo': 180, '1y': 365, 'max': 2000}
    limit = limit_map.get(period, 180)
    
    url = f"https://min-api.cryptocompare.com/data/v2/histoday?fsym={coin}&tsym=USD&limit={limit}"
    response = requests.get(url)
    try:
        data = response.json()
        if 'Data' in data and 'Data' in data['Data']:
            prices = [[item['time'] * 1000, item['close']] for item in data['Data']['Data']]
            return jsonify(prices)
    except (requests.exceptions.JSONDecodeError, KeyError):
        return jsonify([])
    return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, port=9999)

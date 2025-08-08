from flask import Flask, jsonify, send_from_directory, request
import yfinance as yf
import requests
import feedparser

app = Flask(__name__, static_folder='../frontend', static_url_path='/')

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/news')
def get_news():
    feeds = {
        "Reuters": "https://www.reuters.com/markets/us/rss",
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


@app.route('/api/stock/<ticker>')
def get_stock_data(ticker):
    stock = yf.Ticker(ticker)
    hist = stock.history(period="6mo")
    info = stock.info
    
    previous_close = hist['Close'].iloc[-2]
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
            'changePercent': change_percent
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
    url = f"https://min-api.cryptocompare.com/data/v2/histoday?fsym={coin}&tsym=USD&limit=180"
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


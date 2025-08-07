from flask import Flask, jsonify, send_from_directory, request
import yfinance as yf
import requests

app = Flask(__name__, static_folder='../frontend', static_url_path='/')

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/stock/<ticker>')
def get_stock_data(ticker):
    stock = yf.Ticker(ticker)
    hist = stock.history(period="6mo")
    info = stock.info
    data = {
        'history': hist.reset_index().to_dict(orient='records'),
        'info': {
            'shortName': info.get('shortName'),
            'symbol': info.get('symbol'),
            'sector': info.get('sector'),
            'country': info.get('country'),
            'marketCap': info.get('marketCap'),
            'trailingPE': info.get('trailingPE'),
            'currentPrice': info.get('currentPrice') or info.get('previousClose')
        }
    }
    return jsonify(data)

@app.route('/api/crypto/prices')
def get_crypto_prices():
    coins = request.args.get('ids')
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={coins}&vs_currencies=usd"
    response = requests.get(url)
    return jsonify(response.json())


@app.route('/api/crypto/history/<coin>')
def get_crypto_history(coin):
    url = f"https://api.coingecko.com/api/v3/coins/{coin}/market_chart?vs_currency=usd&days=180"
    response = requests.get(url)
    data = response.json()
    return jsonify(data.get('prices', []))

if __name__ == '__main__':
    app.run(debug=True, port=9999)


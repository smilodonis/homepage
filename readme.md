# Homepage Dashboard Documentation

This document provides a comprehensive overview of the custom-built homepage dashboard application. It details the project's architecture, features, backend API, frontend components, and external data sources.

## 1. Project Overview

The application is a personal dashboard designed to provide a comprehensive, at-a-glance view of financial data, news, and local weather. It runs locally and is built with a Python Flask backend and a vanilla JavaScript frontend.

### Core Features:
- **Dashboard:** A central hub displaying total net worth, asset allocation, and detailed holdings for stocks, crypto, private companies, and other investments. Features interactive charts for net worth over time.
- **Charts:** A dedicated page for viewing detailed, interactive charts for various stocks and cryptocurrencies. Users can view historical data across multiple timeframes (1D to Max), switch between Line and Candlestick chart types, and toggle technical indicators like SMA, Volume, MACD, and RSI.
- **Finance News:** Aggregates and displays financial news, categorized into "Wall Street" and "Crypto" sections in a two-column layout.
- **Global News:** Aggregates and displays global news, categorized into "US," "EU," and "World" sections in a three-column layout.
- **Weather:** Shows the current weather, 7-day forecast, and a detailed wind chart for Bratislava, Slovakia. Includes an embedded weather radar map.
- **Settings:** Allows the user to manage their investment portfolio by adding, editing, and removing holdings across all asset categories. All data is saved locally to a `portfolio.json` file.

---

## 2. System Architecture

The application follows a simple client-server model.

### 2.1. Backend
- **Framework:** Python Flask
- **Location:** `backend/app.py`
- **Responsibilities:**
    1. **API Server:** Exposes a series of RESTful API endpoints that the frontend consumes to fetch all necessary data (e.g., stock prices, news feeds, weather forecasts).
    2. **Static File Server:** Serves the static frontend files (HTML, CSS, JavaScript) directly to the user's browser. This simplifies the architecture by avoiding the need for a separate web server.
    3. **Data Aggregation:** Acts as a proxy to fetch, process, and consolidate data from various third-party APIs (e.g., Yahoo! Finance, CryptoCompare, OpenWeatherMap, RSS feeds).
    4. **Local Data Persistence:** Manages the reading and writing of the user's portfolio data to and from the `backend/data/portfolio.json` file.

### 2.2. Frontend
- **Framework:** Vanilla JavaScript (no libraries or frameworks)
- **Structure:** The frontend is modular, with each "page" of the application separated into its own HTML and JavaScript file located in `frontend/` and `frontend/js/` respectively.
- **Styling:** A single centralized stylesheet (`frontend/styles.css`) is used for the entire application.
- **Responsibilities:**
    1. **User Interface:** Renders the application's UI using semantic HTML and CSS.
    2. **Data Fetching:** Makes asynchronous `fetch` calls to the Flask backend's API endpoints to retrieve data.
    3. **Dynamic Content:** Manipulates the DOM to dynamically display the fetched data, including rendering tables, news articles, and weather information.
    4. **Charting:** Uses the `Chart.js` library to render all charts, including portfolio overviews, small preview charts, and the large interactive financial chart.
    5. **User Interaction:** Handles all user events, such as button clicks for navigation, chart interactions (zooming, toggling indicators), and form submissions on the Settings page.

---

## 3. Backend API Endpoints

All API endpoints are defined in `backend/app.py`.

### 3.1. Page Routing
These endpoints serve the main HTML pages of the application.

- `GET /`: Serves `dashboard.html`.
- `GET /dashboard`: Serves `dashboard.html`.
- `GET /charts`: Serves `charts.html`.
- `GET /finance-news`: Serves `finance-news.html`.
- `GET /news`: Serves `news.html`.
- `GET /weather`: Serves `weather.html`.
- `GET /settings`: Serves `settings.html`.

### 3.2. Data Endpoints

- **`GET /api/fx`**
  - **Description:** Fetches the current USD to EUR foreign exchange rate.
  - **Returns:** JSON object `{ "usdToEur": <rate> }`.

- **`GET /api/portfolio`**
  - **Description:** Retrieves the user's complete investment portfolio.
  - **Returns:** The contents of `portfolio.json`.

- **`POST /api/portfolio`**
  - **Description:** Saves the user's complete investment portfolio.
  - **Body:** A JSON object representing the entire portfolio structure.
  - **Returns:** `{ "status": "ok" }`.

- **`GET /api/stock/<ticker>`**
  - **Description:** Fetches detailed historical and informational data for a given stock ticker.
  - **Query Parameters:** `period` (e.g., `1d`, `1wk`, `1mo`, `6mo`, `1y`, `max`).
  - **Returns:** A JSON object containing historical OHLCV data and company info from Yahoo! Finance.

- **`GET /api/crypto/prices`**
  - **Description:** Fetches current price and daily change for multiple cryptocurrencies.
  - **Query Parameters:** `fsyms` (a comma-separated string of crypto symbols, e.g., `BTC,ETH`).
  - **Returns:** A JSON object mapping each symbol to its price data.

- **`GET /api/crypto/history/<coin>`**
  - **Description:** Fetches historical OHLCV data for a given cryptocurrency.
  - **Query Parameters:** `period` (e.g., `1d`, `1wk`, `1mo`, `6mo`, `1y`, `max`).
  - **Returns:** A JSON array of historical data points.

- **`GET /api/finance-news`**
  - **Description:** Aggregates news from multiple financial RSS feeds.
  - **Returns:** A sorted list of news articles from sources like Reuters and Yahoo! Finance, categorized by "Wall Street" and "Crypto".

- **`GET /api/global-news`**
  - **Description:** Aggregates news from multiple global RSS feeds.
  - **Returns:** A sorted list of news articles from sources like BBC and NPR, categorized by "US News," "EU News," and "World News".

- **`GET /api/weather`**
  - **Description:** Fetches current weather and a 7-day forecast for Bratislava.
  - **Returns:** A JSON object containing processed current and daily forecast data from OpenWeatherMap.

---

## 4. Frontend Pages

The frontend is composed of several distinct pages, each with a dedicated HTML and JavaScript file.

- **`dashboard.html` / `js/dashboard.js`**
  - **Purpose:** Displays a high-level overview of the user's entire investment portfolio.
  - **Key Components:**
    - **Summary Cards:** Shows total net worth and the value of each asset class (Stocks, Crypto, Companies, Other).
    - **Net Worth Chart:** A line chart visualizing the total portfolio value over a selectable time period (1M, 3M, 6M, 1Y).
    - **Allocation Chart:** A doughnut chart showing the current percentage allocation of assets.
    - **Holdings Tables:** Detailed tables for each asset class, showing individual holdings, current values, and Profit/Loss (P/L). The stocks table also includes a "Monthly Dividend" column and a summary footer for total P/L and dividends.

- **`charts.html` / `js/charts.js`**
  - **Purpose:** Provides a detailed view of financial charts.
  - **Key Components:**
    - **Small Charts Grid:** Displays a grid of small preview charts for six default stocks and six default cryptocurrencies. Each chart shows a 6-month price history and the current price with daily change.
    - **Market Status Clock:** Indicates whether the NYSE is currently open or closed and provides a countdown to the next market event (open or close).
    - **Interactive Big Chart:** When a small chart is clicked, a large, detailed chart appears. This chart is highly interactive, allowing the user to:
      - Select different timeframes (`1D`, `1W`, `1M`, `6M`, `1Y`, `Max`).
      - Switch between `Line` and `Candlestick` chart types.
      - Toggle technical indicators: `SMA` (Simple Moving Average), `Volume`, `MACD`, and `RSI`.
      - Zoom and pan the chart.

- **`finance-news.html` / `js/finance-news.js`**
  - **Purpose:** Displays financial news.
  - **Layout:** A two-column grid. The left column shows "Wall Street" news, and the right column shows "Crypto" news. Each article includes a title, source, summary, and a clickable thumbnail.

- **`news.html` / `js/news.js`**
  - **Purpose:** Displays general global news.
  - **Layout:** A three-column grid for "US," "EU," and "World" news categories. Each article is presented in a card format with a title, source, and summary.

- **`weather.html` / `js/weather.js`**
  - **Purpose:** Shows weather information for Bratislava.
  - **Key Components:**
    - **Current Weather Card:** Displays the current temperature, conditions (with icon), wind speed, and precipitation chance.
    - **7-Day Forecast:** A list of cards showing the forecast for the upcoming week.
    - **Wind Chart:** A bar chart visualizing wind speed and direction over the next 24 hours, with annotation lines for "Safe" and "Optimal" wind speeds.
    - **Radar Map:** An embedded, interactive radar map from Windy.com centered on Bratislava.

- **`settings.html` / `js/settings.js`**
  - **Purpose:** Allows the user to customize their portfolio holdings.
  - **Functionality:** Provides forms to add, edit, or remove entries for Stocks, Crypto, Companies, and Other assets. Changes can be saved to the `portfolio.json` file on the server or reset to the application defaults.

---

## 5. External Services and Data Sources

The backend aggregates data from the following third-party services:

### Financial Data
- **Yahoo! Finance:** Accessed via the `yfinance` Python library. It is the primary source for all stock data, including historical prices, company information, and dividend history.
- **CryptoCompare API:** The source for all cryptocurrency data, including current prices and historical price data.
- **Frankfurter API:** Used for fetching USD to EUR currency exchange rates.

### News Feeds (RSS)
- **Finance News:**
  - Reuters (Markets/US)
  - Yahoo! Finance (Top Stories)
  - Wall Street Journal (Markets)
  - StockTitan
  - Cointelegraph
  - CoinDesk
- **Global News:**
  - NPR (US News)
  - Associated Press (US News)
  - Reuters (US News)
  - BBC (EU & World News)
  - Euronews
  - Politico EU
  - Al Jazeera
  - The Guardian (World)

### Weather Data
- **OpenWeatherMap API:** Provides current weather and 5-day/3-hour forecast data for Bratislava.
- **Windy.com:** Provides the embedded radar map iframe.

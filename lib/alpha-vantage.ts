// Alpha Vantage API service
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

// Map our market indices to live symbols (Yahoo + Binance/Alpha fallback for BTC)
const MARKET_INDICES = {
  BTC: "BTC",
  IBIT: "IBIT",
  MSTR: "MSTR",
  MARA: "MARA",
  RIOT: "RIOT",
  CLSK: "CLSK",
  HUT: "HUT",
  IREN: "IREN",
  CORZ: "CORZ",
  SPX: "^GSPC",
  NDX: "^NDX",
  DXY: "DX-Y.NYB",
  "US 2Y (SHY)": "^FVX",
  "US 10Y (IEF)": "^TNX",
  GOLD: "XAUUSD=X",
};

type YahooQuote = {
  price: number;
  change: number;
  pctChange: number;
};

export async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, YahooQuote>> {
  if (symbols.length === 0) return {};

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.warn(`Yahoo quote API error: ${response.status}`);
      return {};
    }

    const data = await response.json();
    const results = data?.quoteResponse?.result;
    if (!Array.isArray(results)) {
      console.warn("Invalid Yahoo quote response:", data);
      return {};
    }

    const quoteMap: Record<string, YahooQuote> = {};

    for (const item of results) {
      const symbol = item?.symbol as string | undefined;
      const price = Number.parseFloat(String(item?.regularMarketPrice));
      const change = Number.parseFloat(String(item?.regularMarketChange));
      const pctChange = Number.parseFloat(String(item?.regularMarketChangePercent));

      if (!symbol || !Number.isFinite(price)) continue;

      quoteMap[symbol] = {
        price,
        change: Number.isFinite(change) ? change : 0,
        pctChange: Number.isFinite(pctChange) ? pctChange : 0,
      };
    }

    return quoteMap;
  } catch (error) {
    console.error("Error fetching Yahoo quotes:", error);
    return {};
  }
}

// Fetch BTC/USD spot rate via Alpha Vantage crypto endpoint
export async function fetchBtcUsdQuote() {
  try {
    // Primary: Binance public ticker (closest to exchange live ticks).
    const binanceResponse = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", {
      cache: "no-store",
    });
    if (binanceResponse.ok) {
      const binanceData = await binanceResponse.json();
      const binancePrice = Number.parseFloat(binanceData?.price);
      if (Number.isFinite(binancePrice)) {
        return binancePrice;
      }
    }

    // Fallback: Alpha Vantage crypto endpoint.
    const url = `${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.warn(`Alpha Vantage API error for BTC/USD: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const rate = data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];

    if (!rate) {
      if (data.Note) {
        console.warn("Alpha Vantage API limit reached:", data.Note);
      } else {
        console.warn("Invalid BTC/USD data received:", data);
      }
      return null;
    }

    return Number.parseFloat(rate);
  } catch (error) {
    console.error("Error fetching BTC/USD quote:", error);
    return null;
  }
}

// Helper function to generate random sparkline data
export function generateRandomSparkline(): number[] {
  return Array.from({ length: 8 }, () => Math.min(1, Math.max(0, Math.random())));
}

// Fetch global quote for a symbol
export async function fetchGlobalQuote(symbol: string) {
  try {
    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.warn(`Alpha Vantage API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check if we got valid data
    if (data["Global Quote"] && Object.keys(data["Global Quote"]).length > 0) {
      return data["Global Quote"];
    }

    if (data.Note) {
      // API limit reached
      console.warn("Alpha Vantage API limit reached:", data.Note);
      return null;
    }

    console.warn("Invalid data received for symbol:", symbol, data);
    return null;
  } catch (error) {
    console.error("Error fetching global quote:", error);
    return null;
  }
}

// NEW: Fetch intraday data for the last 2 days
export async function fetchIntradayData(symbol: string) {
  try {
    // Using intraday data with 60min interval to get data for the last 2 days
    const url = `${BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=60min&outputsize=compact&apikey=${API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.warn(`Alpha Vantage API error for ${symbol} intraday data: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check if we got valid data
    if (data["Time Series (60min)"]) {
      const timeSeriesData = data["Time Series (60min)"];
      const timestamps = Object.keys(timeSeriesData).sort();

      // Get the last 16 data points (approximately 2 trading days)
      const last2Days = timestamps.slice(0, 16).map((timestamp) => ({
        timestamp,
        close: Number.parseFloat(timeSeriesData[timestamp]["4. close"]),
      }));

      // Normalize the data for sparkline (values between 0 and 1)
      if (last2Days.length > 0) {
        const values = last2Days.map((item) => item.close);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1; // Avoid division by zero

        return {
          raw: last2Days,
          normalized: last2Days.map((item) => ({
            timestamp: item.timestamp,
            value: (item.close - min) / range,
          })),
          sparkline: last2Days.map((item) => (item.close - min) / range),
        };
      }
    } else if (data.Note) {
      // API limit reached
      console.warn("Alpha Vantage API limit reached:", data.Note);
    } else {
      console.warn("Invalid intraday data received for symbol:", symbol, data);
    }

    return null;
  } catch (error) {
    console.error("Error fetching intraday data:", error);
    return null;
  }
}

// Generate fallback data for a market index
export function generateFallbackData(indexName: string, region: string, index: number) {
  const value = 1000 + Math.random() * 10000;
  const change = Math.random() * 100 - 50;
  const pctChange = (change / value) * 100;

  return {
    id: indexName,
    num: `${region === "americas" ? "1" : region === "emea" ? "2" : "3"}${index + 1})`,
    rmi: "RMI",
    value,
    change,
    pctChange,
    avat: Math.random() * 100 - 50,
    time: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    ytd: Math.random() * 30 - 15,
    ytdCur: Math.random() * 30 - 10,
    sparkline1: generateRandomSparkline(),
    sparkline2: generateRandomSparkline(),
  };
}

// Fetch market data for all indices
// Type definitions for market data
interface MarketIndexData {
  id: string;
  num: string;
  rmi: string;
  value: number;
  change: number;
  pctChange: number;
  avat: number;
  time: string;
  ytd: number;
  ytdCur: number;
  sparkline1: number[];
  sparkline2: number[];
  twoDayData?: { timestamp: string; close: number }[] | null;
}

export interface FetchAllMarketDataResult {
  americas: MarketIndexData[];
  emea: MarketIndexData[];
  asiaPacific: MarketIndexData[];
  lastUpdated: string;
  dataSource: string;
  [key: string]: MarketIndexData[] | string | boolean | undefined;
}

export async function fetchAllMarketData(): Promise<FetchAllMarketDataResult> {
  const regions = {
    americas: ["BTC", "IBIT", "MSTR", "MARA", "RIOT", "CLSK", "HUT", "IREN", "CORZ"],
    emea: ["SPX", "NDX", "DXY"],
    asiaPacific: ["US 2Y (SHY)", "US 10Y (IEF)", "GOLD"],
  };

  const result: FetchAllMarketDataResult = {
    americas: [],
    emea: [],
    asiaPacific: [],
    lastUpdated: new Date().toISOString(),
    dataSource: "yahoo-binance",
  };

  const nonBtcSymbols = Object.entries(MARKET_INDICES)
    .filter(([indexName]) => indexName !== "BTC")
    .map(([, symbol]) => symbol);
  const yahooQuotes = await fetchYahooQuotes(nonBtcSymbols);

  // Process each region
  for (const [region, indices] of Object.entries(regions)) {
    const regionKey = region as keyof typeof regions;
    for (let i = 0; i < indices.length; i++) {
      const indexName = indices[i];

      try {
        const symbol = MARKET_INDICES[indexName as keyof typeof MARKET_INDICES];

        let value = Number.NaN;
        let change = Number.NaN;
        let pctChange = Number.NaN;

        if (indexName === "BTC") {
          const btcValue = await fetchBtcUsdQuote();
          if (typeof btcValue === "number" && Number.isFinite(btcValue)) {
            value = btcValue;
            change = 0;
            pctChange = 0;
          }
        } else {
          const quote = yahooQuotes[symbol];
          if (quote) {
            value = quote.price;
            change = quote.change;
            pctChange = quote.pctChange;

            // Yahoo treasury symbols are quoted as 10x yield (e.g. 42.5 -> 4.25%).
            if (indexName === "US 2Y (SHY)" || indexName === "US 10Y (IEF)") {
              value = value / 10;
              change = change / 10;
            }
          }
        }

        const twoDayData = null;

        if (Number.isFinite(value)) {
          // Generate some random data for fields not provided by Alpha Vantage
          const avat = Math.random() * 100 - 50;
          const ytd = Math.random() * 30 - 15;
          const ytdCur = Math.random() * 30 - 10;

          // Use real intraday data if available, otherwise fallback to random
          const sparkline1 = generateRandomSparkline();
          const sparkline2 = generateRandomSparkline();

          result[regionKey].push({
            id: indexName,
            num: `${region === "americas" ? "1" : region === "emea" ? "2" : "3"}${i + 1})`,
            rmi: "RMI",
            value,
            change,
            pctChange,
            avat,
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            ytd,
            ytdCur,
            sparkline1,
            sparkline2,
            // Store the raw data for potential use
            twoDayData: null,
          });
        } else {
          // Add fallback data if API call failed
          result[regionKey].push(generateFallbackData(indexName, region, i));
        }
      } catch (error) {
        console.error(`Error processing ${indexName}:`, error);
        // Add fallback data on error
        result[regionKey].push(generateFallbackData(indexName, region, i));
      }
    }
  }

  return result;
}

// NEW: Fetch financial news
export async function fetchFinancialNews(query = "market") {
  try {
    // Alpha Vantage News API
    const url = `${BASE_URL}?function=NEWS_SENTIMENT&topics=${query}&apikey=${API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.warn(`Alpha Vantage News API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check if we got valid data
    if (data.feed && Array.isArray(data.feed)) {
      return data.feed.slice(0, 20); // Return up to 20 news items
    }

    if (data.Note) {
      // API limit reached
      console.warn("Alpha Vantage API limit reached:", data.Note);
      return null;
    }

    console.warn("Invalid news data received:", data);
    return null;
  } catch (error) {
    console.error("Error fetching financial news:", error);
    return null;
  }
}

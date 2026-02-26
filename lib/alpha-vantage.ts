const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const TWELVE_KEY = process.env.TWELVE_DATA_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

export type InstrumentType =
  | "Crypto price"
  | "Stock price"
  | "ETF price"
  | "Index level"
  | "Yield"
  | "Commodity price"
  | "Forex pair";

type SymbolConfig = {
  symbol: string;
  instrumentType: InstrumentType;
  provider: "twelve" | "binance-alpha";
};

export const SYMBOL_MAP: Record<string, SymbolConfig> = {
  BTC: { symbol: "BTCUSDT", instrumentType: "Crypto price", provider: "binance-alpha" },

  IBIT: { symbol: "IBIT", instrumentType: "ETF price", provider: "twelve" },
  MSTR: { symbol: "MSTR", instrumentType: "Stock price", provider: "twelve" },
  MARA: { symbol: "MARA", instrumentType: "Stock price", provider: "twelve" },
  RIOT: { symbol: "RIOT", instrumentType: "Stock price", provider: "twelve" },
  CLSK: { symbol: "CLSK", instrumentType: "Stock price", provider: "twelve" },
  HUT: { symbol: "HUT", instrumentType: "Stock price", provider: "twelve" },
  IREN: { symbol: "IREN", instrumentType: "Stock price", provider: "twelve" },
  CORZ: { symbol: "CORZ", instrumentType: "Stock price", provider: "twelve" },

  VIX: { symbol: "VIX", instrumentType: "Index level", provider: "twelve" },
  TNX: { symbol: "TNX", instrumentType: "Yield", provider: "twelve" },
  MOVE: { symbol: "MOVE", instrumentType: "Index level", provider: "twelve" },
  DJI: { symbol: "DJI", instrumentType: "Index level", provider: "twelve" },
  RUT: { symbol: "RUT", instrumentType: "Index level", provider: "twelve" },
  NYA: { symbol: "NYA", instrumentType: "Index level", provider: "twelve" },
  NIKKEI225: { symbol: "N225", instrumentType: "Index level", provider: "twelve" },
  NIFTY50: { symbol: "NIFTY", instrumentType: "Index level", provider: "twelve" },
  FTSE100: { symbol: "FTSE", instrumentType: "Index level", provider: "twelve" },

  GOLD: { symbol: "XAU/USD", instrumentType: "Commodity price", provider: "twelve" },
  SILVER: { symbol: "XAG/USD", instrumentType: "Commodity price", provider: "twelve" },
  XPTUSD: { symbol: "XPT/USD", instrumentType: "Commodity price", provider: "twelve" },
  XPDUSD: { symbol: "XPD/USD", instrumentType: "Commodity price", provider: "twelve" },
  USOIL: { symbol: "USOIL", instrumentType: "Commodity price", provider: "twelve" },
  UKOIL: { symbol: "UKOIL", instrumentType: "Commodity price", provider: "twelve" },
  NATGAS: { symbol: "NATGAS", instrumentType: "Commodity price", provider: "twelve" },

  AAPL: { symbol: "AAPL", instrumentType: "Stock price", provider: "twelve" },
  MSFT: { symbol: "MSFT", instrumentType: "Stock price", provider: "twelve" },
  NVDA: { symbol: "NVDA", instrumentType: "Stock price", provider: "twelve" },
  AMZN: { symbol: "AMZN", instrumentType: "Stock price", provider: "twelve" },
  GOOGL: { symbol: "GOOGL", instrumentType: "Stock price", provider: "twelve" },
  META: { symbol: "META", instrumentType: "Stock price", provider: "twelve" },
  TSLA: { symbol: "TSLA", instrumentType: "Stock price", provider: "twelve" },
};

const YAHOO_SYMBOL_MAP: Record<string, string> = {
  IBIT: "IBIT",
  MSTR: "MSTR",
  MARA: "MARA",
  RIOT: "RIOT",
  CLSK: "CLSK",
  HUT: "HUT",
  IREN: "IREN",
  CORZ: "CORZ",
  VIX: "^VIX",
  TNX: "^TNX",
  MOVE: "^MOVE",
  DJI: "^DJI",
  RUT: "^RUT",
  NYA: "^NYA",
  NIKKEI225: "^N225",
  NIFTY50: "^NSEI",
  FTSE100: "^FTSE",
  GOLD: "GC=F",
  SILVER: "SI=F",
  XPTUSD: "PL=F",
  XPDUSD: "PA=F",
  USOIL: "CL=F",
  UKOIL: "BZ=F",
  NATGAS: "NG=F",
  AAPL: "AAPL",
  MSFT: "MSFT",
  NVDA: "NVDA",
  AMZN: "AMZN",
  GOOGL: "GOOGL",
  META: "META",
  TSLA: "TSLA",
};

const MARKET_REGIONS = {
  americas: ["BTC", "IBIT", "MSTR", "MARA", "RIOT", "CLSK", "HUT", "IREN", "CORZ"],
  emea: ["VIX", "TNX", "MOVE", "DJI", "RUT", "NYA", "NIKKEI225", "NIFTY50", "FTSE100"],
  asiaPacific: ["GOLD", "SILVER", "XPTUSD", "XPDUSD", "USOIL", "UKOIL", "NATGAS", "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA"],
} as const;

type Quote = {
  price: number;
  change: number;
  pctChange: number;
};

type QuoteWithFallback = Quote & {
  isFallback?: boolean;
};

function safeNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function optionalNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function calculatePctChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export async function fetchTwelveQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  if (!symbols.length || !TWELVE_KEY) return {};

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${TWELVE_KEY}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) return {};

    const data = await res.json();
    const map: Record<string, Quote> = {};
    const items: Array<{ symbol?: string; [key: string]: unknown }> = [];

    if (Array.isArray(data)) {
      items.push(...data);
    } else if (data && typeof data === "object") {
      const root = data as Record<string, unknown>;

      if (typeof root.status === "string" && root.status.toLowerCase() === "error") {
        return {};
      }

      if (typeof root.symbol === "string") {
        items.push(root as { symbol?: string; [key: string]: unknown });
      }

      for (const [key, value] of Object.entries(root)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const quoteObj = value as Record<string, unknown>;
        items.push({
          symbol: typeof quoteObj.symbol === "string" ? quoteObj.symbol : key,
          ...quoteObj,
        });
      }
    }

    for (const item of items) {
      const symbol = typeof item.symbol === "string" ? item.symbol : undefined;
      const price = optionalNumber(item.close ?? item.price);
      const previousClose = optionalNumber(item.previous_close ?? item.previousClose);
      const apiChange = optionalNumber(item.change);
      const apiPctChange = optionalNumber(item.percent_change ?? item.percentChange);

      if (!symbol || !price) continue;

      const change =
        apiChange !== undefined
          ? apiChange
          : previousClose !== undefined
            ? price - previousClose
            : 0;

      const pctChange =
        apiPctChange !== undefined
          ? apiPctChange
          : previousClose !== undefined
            ? calculatePctChange(price, previousClose)
            : 0;

      map[symbol] = { price, change, pctChange };
    }

    return map;
  } catch (err) {
    console.error("Twelve Data error:", err);
    return {};
  }
}

export async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  if (!symbols.length) return {};
  const map: Record<string, Quote> = {};

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
        const res = await fetch(url, {
          cache: "no-store",
          headers: {
            Accept: "application/json,text/plain,*/*",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const price = optionalNumber(meta?.regularMarketPrice ?? meta?.previousClose ?? meta?.chartPreviousClose);
        const previousClose = optionalNumber(meta?.previousClose ?? meta?.chartPreviousClose);
        if (!price) return;

        const change = previousClose !== undefined ? price - previousClose : 0;
        const pctChange = previousClose !== undefined ? calculatePctChange(price, previousClose) : 0;

        map[symbol] = { price, change, pctChange };
      } catch (err) {
        console.error(`Yahoo chart error (${symbol}):`, err);
      }
    })
  );

  return map;
}

export async function fetchBtcUsdQuote(): Promise<Quote | null> {
  try {
    const [priceRes, statsRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", { cache: "no-store" }),
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { cache: "no-store" }),
    ]);

    if (!priceRes.ok || !statsRes.ok) return null;

    const priceData = await priceRes.json();
    const statsData = await statsRes.json();

    const price = safeNumber(priceData?.price);
    const change = safeNumber(statsData?.priceChange);
    const pctChange = safeNumber(statsData?.priceChangePercent);

    if (!price) return null;

    return { price, change, pctChange };
  } catch (err) {
    console.error("BTC error:", err);
    return null;
  }
}

export async function fetchStooqMetalQuotes(): Promise<Record<string, Quote>> {
  const stooqById: Record<string, string> = {
    GOLD: "xauusd",
    SILVER: "xagusd",
    XPTUSD: "xptusd",
    XPDUSD: "xpdusd",
  };

  const map: Record<string, Quote> = {};

  await Promise.all(
    Object.entries(stooqById).map(async ([id, symbol]) => {
      try {
        const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&i=d`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;

        const text = (await res.text()).trim();
        const row = text.split("\n")[0] ?? "";
        const parts = row.split(",");
        if (parts.length < 7) return;

        const open = optionalNumber(parts[3]);
        const close = optionalNumber(parts[6]);
        if (open === undefined || close === undefined || close <= 0) return;

        map[id] = {
          price: close,
          change: close - open,
          pctChange: calculatePctChange(close, open),
        };
      } catch (err) {
        console.error(`Stooq metals error (${id}):`, err);
      }
    })
  );

  return map;
}

export function generateRandomSparkline(): number[] {
  return Array.from({ length: 8 }, () => Math.random());
}

const FALLBACK_BASELINE: Record<string, number> = {
  BTC: 65000,
  IBIT: 38,
  MSTR: 750,
  MARA: 22,
  RIOT: 12,
  CLSK: 17,
  HUT: 13,
  IREN: 10,
  CORZ: 15,
  VIX: 15,
  TNX: 42,
  MOVE: 95,
  DJI: 39000,
  RUT: 2000,
  NYA: 18000,
  NIKKEI225: 38000,
  NIFTY50: 22000,
  FTSE100: 7800,
  GOLD: 2350,
  SILVER: 30,
  XPTUSD: 980,
  XPDUSD: 1050,
  USOIL: 78,
  UKOIL: 82,
  NATGAS: 2.4,
  AAPL: 190,
  MSFT: 420,
  NVDA: 900,
  AMZN: 180,
  GOOGL: 170,
  META: 500,
  TSLA: 210,
};

export function generateFallbackData(id: string, index: number) {
  const config = SYMBOL_MAP[id];
  const baseline = FALLBACK_BASELINE[id] ?? 100;
  const movePct = (Math.random() - 0.5) * 2;
  const previousValue = baseline * (1 - movePct / 100);
  const value = baseline;
  const change = value - previousValue;
  const pctChange = calculatePctChange(value, previousValue);

  return {
    id,
    num: `${index + 1})`,
    rmi: "RMI",
    value,
    change,
    pctChange,
    avat: pctChange * 0.3,
    time: new Date().toLocaleTimeString(),
    ytd: pctChange * 6,
    ytdCur: pctChange * 5,
    sparkline1: generateRandomSparkline(),
    sparkline2: generateRandomSparkline(),
    instrumentType: config?.instrumentType,
    sourceSymbol: config?.symbol,
    isFallback: true,
  };
}

export async function fetchAllMarketData() {
  const result: any = {
    americas: [],
    emea: [],
    asiaPacific: [],
    lastUpdated: new Date().toISOString(),
  };

  const twelveSymbols = Object.values(SYMBOL_MAP)
    .filter(s => s.provider === "twelve")
    .map(s => s.symbol);

  const nonBtcIds = Object.keys(SYMBOL_MAP).filter((id) => id !== "BTC");
  const yahooSymbols = nonBtcIds
    .map((id) => YAHOO_SYMBOL_MAP[id])
    .filter((symbol): symbol is string => Boolean(symbol));

  const [twelveQuotes, yahooQuotes, stooqMetals, btcQuote] = await Promise.all([
    fetchTwelveQuotes(twelveSymbols),
    fetchYahooQuotes(yahooSymbols),
    fetchStooqMetalQuotes(),
    fetchBtcUsdQuote(),
  ]);

  for (const [region, ids] of Object.entries(MARKET_REGIONS)) {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const config = SYMBOL_MAP[id];

      if (!config) {
        result[region].push(generateFallbackData(id, i));
        continue;
      }

      try {
        let quote: QuoteWithFallback | undefined;

        if (id === "BTC") {
          quote = btcQuote ?? undefined;
        } else {
          const yahooSymbol = YAHOO_SYMBOL_MAP[id];
          quote =
            twelveQuotes[config.symbol] ??
            (yahooSymbol ? yahooQuotes[yahooSymbol] : undefined) ??
            (["GOLD", "SILVER", "XPTUSD", "XPDUSD"].includes(id) ? stooqMetals[id] : undefined);
        }

        if (!quote?.price) {
          result[region].push(generateFallbackData(id, i));
          continue;
        }

        result[region].push({
          id,
          num: `${i + 1})`,
          rmi: "RMI",
          value: quote.price,
          change: quote.change,
          pctChange: quote.pctChange,
          avat: quote.pctChange * 0.3,
          time: new Date().toLocaleTimeString(),
          ytd: quote.pctChange * 6,
          ytdCur: quote.pctChange * 5,
          sparkline1: generateRandomSparkline(),
          sparkline2: generateRandomSparkline(),
          instrumentType: config.instrumentType,
          sourceSymbol: config.symbol,
          isFallback: false,
        });

      } catch {
        result[region].push(generateFallbackData(id, i));
      }
    }
  }

  return result;
}

export async function fetchFinancialNews(query = "market") {
  if (!API_KEY) return null;

  try {
    const url = `${BASE_URL}?function=NEWS_SENTIMENT&topics=${encodeURIComponent(query)}&apikey=${API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) return null;

    const data = await response.json();
    return Array.isArray(data?.feed) ? data.feed.slice(0, 20) : null;
  } catch {
    return null;
  }
}



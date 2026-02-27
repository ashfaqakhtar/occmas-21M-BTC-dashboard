import { marketData as fallbackData } from "@/components/bloomberg/lib/marketData";
import type { MarketData, MarketItem } from "@/components/bloomberg/types";
import { fetchAllMarketData, fetchBtcUsdQuote, generateRandomSparkline } from "@/lib/alpha-vantage";
import refreshMarketData from "@/lib/market-data-refresh";
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Initialize the market data refresh scheduler
// This is imported here so it starts when the API route is first loaded
import "@/lib/market-data-refresh";

// Store year start values for YTD calculations
const yearStartValues: Record<string, number> = {};
let inMemoryMarketData: MarketData | null = null;
let inMemoryApiCacheAt = 0;
let lastLiveSuccessAt: string | null = null;
const API_CACHE_TTL_MS = 60 * 1000;
const BTC_CACHE_TTL_MS = 2 * 1000;
let cachedBtcQuote: { price: number; change: number; pctChange: number } | null = null;
let cachedBtcPriceAt = 0;
const DISPLAY_TIMEZONE = process.env.MARKET_TIMEZONE || "Asia/Kolkata";

// Sparkline update interval (5 minutes in milliseconds)
const SPARKLINE_UPDATE_INTERVAL = 5 * 60 * 1000;
type MarketItemWithFallback = MarketItem & { isFallback?: boolean };

function formatMarketTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: DISPLAY_TIMEZONE,
  });
}

function jsonNoStore(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

// Initialize year start values if not already set
function initializeYearStartValues(data: MarketData) {
  if (Object.keys(yearStartValues).length === 0) {
    // For each market index, set a year start value that makes sense with current values and YTD
    for (const region of Object.keys(data)) {
      if (region === "americas" || region === "emea" || region === "asiaPacific") {
        for (const item of data[region]) {
          // Calculate what the year start value would have been based on current value and YTD
          // YTD = (current - yearStart) / yearStart * 100
          // So yearStart = current / (1 + YTD/100)
          if (typeof item.value === "number" && typeof item.ytd === "number") {
            yearStartValues[item.id] = item.value / (1 + item.ytd / 100);
          } else {
            yearStartValues[item.id] = item.value * 0.9; // Fallback: assume 10% growth
          }
        }
      }
    }
    console.log("Year start values initialized");
  }
}

// Helper function to generate random market data updates with realistic correlations
async function generateRandomUpdates(data: MarketData) {
  try {
    // Initialize year start values if not already set
    initializeYearStartValues(data);

    // Generate a "market sentiment" factor that will influence all indices
    // This creates correlated movements like in real markets
    const marketSentiment = Math.random() * 2 - 1; // Between -1 and 1

    // Generate region-specific factors
    const regionFactors = {
      americas: marketSentiment * 0.7 + (Math.random() * 0.6 - 0.3), // Region-specific component
      emea: marketSentiment * 0.7 + (Math.random() * 0.6 - 0.3),
      asiaPacific: marketSentiment * 0.7 + (Math.random() * 0.6 - 0.3),
    };

    // Check if it's time to update sparklines (every 5 minutes)
    const currentTime = new Date().getTime();

    // Get the last sparkline update time from Redis
    let lastSparklineUpdate = currentTime - SPARKLINE_UPDATE_INTERVAL - 1; // Default to update on first run
    try {
      const storedTime = await redis.get("last_sparkline_update");
      if (storedTime) {
        lastSparklineUpdate = Number.parseInt(storedTime as string, 10);
      }
    } catch (error) {
      console.warn("Error getting last sparkline update time from Redis:", error);
    }

    const shouldUpdateSparklines = currentTime - lastSparklineUpdate >= SPARKLINE_UPDATE_INTERVAL;

    // If it's time to update sparklines, record the time in Redis
    if (shouldUpdateSparklines) {
      try {
        await redis.set("last_sparkline_update", currentTime.toString());
        console.log("Updating sparklines at", formatMarketTime(new Date(currentTime)));
      } catch (error) {
        console.warn("Error storing sparkline update time in Redis:", error);
      }
    }

    const updatedData = Object.keys(data).reduce<MarketData>(
      (acc: MarketData, key: string) => {
        if (key === "americas" || key === "emea" || key === "asiaPacific") {
          acc[key] = data[key].map((item: MarketItem) => {
            try {
              // BTC is handled separately using live crypto quote, so avoid random walk drift.
              if (item.id === "BTC") {
                return {
                  ...item,
                  time: formatMarketTime(),
                  lastUpdated: new Date().toISOString(),
                };
              }

              // Get region factor
              const regionFactor = regionFactors[key as keyof typeof regionFactors];

              // Individual stock factor (some stocks move more independently)
              const individualFactor = Math.random() * 0.8 - 0.4;

              // Combine factors with different weights
              const combinedFactor =
                marketSentiment * 0.4 + regionFactor * 0.4 + individualFactor * 0.2;

              // Scale the movement based on typical volatility for this index
              // More volatile indices (like emerging markets) will move more
              let volatilityMultiplier = 1.0;
              if (
                item.id.includes("IBOVESPA") ||
                item.id.includes("HANG SENG") ||
                item.id.includes("CSI 300")
              ) {
                volatilityMultiplier = 1.5;
              } else if (item.id.includes("S&P 500") || item.id.includes("DOW JONES")) {
                volatilityMultiplier = 0.8;
              }

              // Calculate price change percentage (realistic for a short time interval)
              const changePercent = combinedFactor * 0.2 * volatilityMultiplier;

              // Calculate absolute change based on current value
              const newChange = item.value * (changePercent / 100);

              // Update the value
              const newValue = item.value + newChange;

              // Calculate cumulative change
              const cumulativeChange = item.change + newChange;

              // Calculate new percentage change
              const newPctChange = (cumulativeChange / (item.value - item.change)) * 100;

              // Update AVAT (Average Trading Volume) - should fluctuate throughout the day
              // In real markets, volume often increases at open and close
              const currentHour = new Date().getHours();
              let volumeMultiplier = 1.0;

              // Higher volume at market open and close
              if (currentHour < 10 || currentHour > 15) {
                volumeMultiplier = 1.5;
              }

              const newAvat = item.avat + (Math.random() * 2 - 1) * volumeMultiplier;

              // Update YTD based on new value and year start value
              const yearStartValue = yearStartValues[item.id];
              const newYtd = ((newValue - yearStartValue) / yearStartValue) * 100;

              // Update YTD Currency adjusted with a slight variation
              // In reality this would be based on currency exchange rates
              const currencyFactor = 1 + (Math.random() * 0.1 - 0.05); // ±5% currency effect
              const newYtdCur = newYtd * currencyFactor;

              // Only update sparklines if it's time (every 5 minutes)
              let sparkline1 = item.sparkline1 || generateRandomSparkline();
              let sparkline2 = item.sparkline2 || generateRandomSparkline();
              let sparklineUpdated = item.sparklineUpdated || new Date().toISOString();

              if (shouldUpdateSparklines) {
                // Evolve sparklines by shifting and adding new value
                sparkline1 = [
                  ...sparkline1.slice(1),
                  Math.min(
                    1,
                    Math.max(0, sparkline1[sparkline1.length - 1] + (Math.random() * 0.2 - 0.1))
                  ),
                ];
                sparkline2 = [
                  ...sparkline2.slice(1),
                  Math.min(
                    1,
                    Math.max(0, sparkline2[sparkline2.length - 1] + (Math.random() * 0.2 - 0.1))
                  ),
                ];
                sparklineUpdated = new Date().toISOString();
              }

              return {
                ...item,
                value: Number.parseFloat(newValue.toFixed(2)),
                change: Number.parseFloat(cumulativeChange.toFixed(2)),
                pctChange: Number.parseFloat(newPctChange.toFixed(2)),
                avat: Number.parseFloat(newAvat.toFixed(2)),
                time: formatMarketTime(),
                ytd: Number.parseFloat(newYtd.toFixed(2)),
                ytdCur: Number.parseFloat(newYtdCur.toFixed(2)),
                sparkline1,
                sparkline2,
                sparklineUpdated,
                lastUpdated: new Date().toISOString(),
              };
            } catch (itemError) {
              console.error("Error updating item:", itemError);
              // Return the original item if there's an error
              return {
                ...item,
                sparkline1: item.sparkline1 || generateRandomSparkline(),
                sparkline2: item.sparkline2 || generateRandomSparkline(),
                time: formatMarketTime(),
                lastUpdated: new Date().toISOString(),
              };
            }
          });
        }
        return acc;
      },
      { ...data }
    );

    // Add the last sparkline update time to the data
    updatedData.lastSparklineUpdate = shouldUpdateSparklines
      ? new Date().toISOString()
      : data.lastSparklineUpdate || new Date().toISOString();

    return updatedData;
  } catch (error) {
    console.error("Error in generateRandomUpdates:", error);
    // Return the original data if there's an error
    return data;
  }
}

// Helper function to enhance fallback data with sparklines
function getEnhancedFallbackData() {
  const now = new Date().toISOString();
  return Object.keys(fallbackData).reduce<MarketData>(
    (acc: MarketData, key: string) => {
      if (key === "americas" || key === "emea" || key === "asiaPacific") {
        acc[key] = fallbackData[key].map((item) => ({
          id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
          num: item.num || "",
          rmi: item.rmi || "",
          instrumentType: item.instrumentType,
          sourceSymbol: item.sourceSymbol,
          value: item.value || 0,
          change: item.change || 0,
          pctChange: item.pctChange || 0,
          avat: item.avat || 0,
          time: formatMarketTime(),
          ytd: item.ytd || 0,
          ytdCur: item.ytdCur || 0,
          sparkline1: generateRandomSparkline(),
          sparkline2: generateRandomSparkline(),
          lastUpdated: now,
          sparklineUpdated: now,
        }));
      }
      return acc;
    },
    {
      ...fallbackData,
      lastSparklineUpdate: now,
    }
  );
}

function mergeWithPreviousIfFallback(
  incoming: MarketData,
  previous: MarketData | null
): MarketData {
  if (!previous) return incoming;

  const regions: Array<keyof Pick<MarketData, "americas" | "emea" | "asiaPacific">> = [
    "americas",
    "emea",
    "asiaPacific",
  ];

  for (const region of regions) {
    const prevById = new Map(
      (previous[region] || []).map((item) => [item.id, item as MarketItemWithFallback])
    );

    incoming[region] = (incoming[region] || []).map((row) => {
      const candidate = row as MarketItemWithFallback;
      if (!candidate.isFallback) return row;

      const prev = prevById.get(candidate.id);
      if (!prev) return row;

      const prevRow = prev as MarketItemWithFallback;
      const carried: MarketItemWithFallback = {
        ...prev,
        time: candidate.time,
        lastUpdated: new Date().toISOString(),
      };

      if (Array.isArray(candidate.sparkline1)) carried.sparkline1 = candidate.sparkline1;
      if (Array.isArray(candidate.sparkline2)) carried.sparkline2 = candidate.sparkline2;

      // Keep metadata consistent with current row layout.
      carried.num = candidate.num ?? prevRow.num;
      carried.rmi = candidate.rmi ?? prevRow.rmi;
      carried.instrumentType = candidate.instrumentType ?? prevRow.instrumentType;
      carried.sourceSymbol = candidate.sourceSymbol ?? prevRow.sourceSymbol;
      carried.isFallback = true;
      return carried as MarketItem;
    });
  }

  return incoming;
}

async function getLiveBtcPrice() {
  const now = Date.now();
  if (cachedBtcQuote && now - cachedBtcPriceAt < BTC_CACHE_TTL_MS) {
    return cachedBtcQuote;
  }

  const freshQuote = await fetchBtcUsdQuote();
  if (
    freshQuote &&
    Number.isFinite(freshQuote.price) &&
    Number.isFinite(freshQuote.change) &&
    Number.isFinite(freshQuote.pctChange)
  ) {
    cachedBtcQuote = freshQuote;
    cachedBtcPriceAt = now;
    return freshQuote;
  }

  return null;
}

async function applyLiveBtcPrice(data: MarketData) {
  const liveBtc = await getLiveBtcPrice();
  if (!liveBtc || !Array.isArray(data.americas)) return data;

  const btcIndex = data.americas.findIndex((item) => item.id === "BTC");
  if (btcIndex === -1) return data;

  const currentItem = data.americas[btcIndex];
  data.americas[btcIndex] = {
    ...currentItem,
    value: Number.parseFloat(liveBtc.price.toFixed(2)),
    change: Number.parseFloat(liveBtc.change.toFixed(2)),
    pctChange: Number.parseFloat(liveBtc.pctChange.toFixed(2)),
    isFallback: false,
    time: formatMarketTime(),
    lastUpdated: new Date().toISOString(),
  };

  return data;
}

export async function GET() {
  try {
    const now = Date.now();
    const hasFreshApiCache = inMemoryMarketData && now - inMemoryApiCacheAt < API_CACHE_TTL_MS;
    let fetchFailed = false;

    // Keep a short-lived live cache from upstream quotes for all non-BTC rows.
    if (!hasFreshApiCache) {
      try {
        const apiData = await fetchAllMarketData();
        const previousSnapshot = (inMemoryMarketData || null) as MarketData | null;
        const mergedData = mergeWithPreviousIfFallback(apiData as MarketData, previousSnapshot);
        inMemoryMarketData = {
          ...mergedData,
          dataSource: ((apiData as MarketData).dataSource || "live") as string,
          lastUpdated: new Date().toISOString(),
        } as MarketData;
        inMemoryApiCacheAt = now;
        if ((apiData as MarketData).dataSource !== "fallback") {
          lastLiveSuccessAt = new Date().toISOString();
        }
      } catch (apiError) {
        console.warn("Live market fetch failed, using cache/Redis fallback:", apiError);
        fetchFailed = true;
      }
    }

    // Check if Redis is connected
    let isConnected = false;
    let redisData = null;

    try {
      await redis.ping();
      isConnected = true;

      // Try to get market data from Redis
      redisData = await redis.get("market_data");
    } catch (redisError) {
      console.warn("Redis error:", redisError);
      isConnected = false;
    }

    const usingLiveCache = Boolean(inMemoryMarketData);
    const servedFromRedis = !usingLiveCache && Boolean(redisData);
    const baseData = (inMemoryMarketData || (redisData as MarketData) || getEnhancedFallbackData()) as MarketData;
    const liveBtcUpdatedData = await applyLiveBtcPrice(baseData);
    liveBtcUpdatedData.lastUpdated = new Date().toISOString();
    inMemoryMarketData = liveBtcUpdatedData;

    // Keep Redis warm with latest snapshot if available.
    if (isConnected) {
      try {
        await redis.set("market_data", liveBtcUpdatedData, { ex: 3600 });
      } catch (redisSetError) {
        console.warn("Error storing updated Redis market data:", redisSetError);
      }
    }

    // Initialize year start values for any views that still read this field.
    initializeYearStartValues(liveBtcUpdatedData);

    return jsonNoStore({
      ...liveBtcUpdatedData,
      isFromRedis: servedFromRedis,
      fromRedis: servedFromRedis,
      dataSource: liveBtcUpdatedData.dataSource || (servedFromRedis ? "redis" : "fallback"),
      source: liveBtcUpdatedData.dataSource || (servedFromRedis ? "redis" : "fallback"),
      isStale: fetchFailed || (liveBtcUpdatedData.dataSource ?? "").toLowerCase() === "fallback",
      lastLiveSuccessAt,
      displayTimeZone: DISPLAY_TIMEZONE,
      lastFetched: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in market-data GET route:", error);
    // Return fallback data in case of error
    const enhancedFallbackData = getEnhancedFallbackData();

    // Initialize year start values
    initializeYearStartValues(enhancedFallbackData);

    return jsonNoStore({
      ...enhancedFallbackData,
      isFromRedis: false,
      fromRedis: false,
      dataSource: "fallback",
      source: "fallback",
      error: String(error),
      displayTimeZone: DISPLAY_TIMEZONE,
      lastUpdated: new Date().toISOString(),
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "update") {
      // Check if Redis is connected
      let isConnected = false;
      let currentData: MarketData | null = null;

      try {
        await redis.ping();
        isConnected = true;

        // Get current data from Redis
        currentData = await redis.get("market_data");
      } catch (redisError) {
        console.warn("Redis error:", redisError);
        isConnected = false;
      }

      // Manual refresh should fetch fresh upstream quotes instead of randomizing values.
      let updatedData: MarketData;
      try {
        const freshData = await fetchAllMarketData();
        const previousSnapshot = (currentData || inMemoryMarketData || null) as MarketData | null;
        const mergedData = mergeWithPreviousIfFallback(freshData as MarketData, previousSnapshot);
        updatedData = {
          ...mergedData,
          dataSource: ((freshData as MarketData).dataSource || "live") as string,
          lastUpdated: new Date().toISOString(),
        } as MarketData;
        if ((freshData as MarketData).dataSource !== "fallback") {
          lastLiveSuccessAt = new Date().toISOString();
        }
      } catch (apiError) {
        console.warn("Manual refresh live fetch failed, using cached data:", apiError);
        updatedData = (currentData || inMemoryMarketData || getEnhancedFallbackData()) as MarketData;
      }

      // Keep BTC anchored to live spot if available.
      updatedData = await applyLiveBtcPrice(updatedData);

      // Add timestamp
      updatedData.lastUpdated = new Date().toISOString();
      inMemoryMarketData = updatedData;

      // Try to store in Redis if connected
      if (isConnected) {
        try {
          await redis.set("market_data", updatedData, { ex: 3600 });
        } catch (redisSetError) {
          console.warn("Error storing updated data in Redis:", redisSetError);
          // Continue execution even if Redis fails
        }
      }

      return jsonNoStore({
        success: true,
        message: "Market data updated successfully",
      });
    }

    return jsonNoStore({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in market-data POST route:", error);
    return jsonNoStore(
      {
        success: false,
        error: "Failed to process request",
        details: String(error),
      },
      { status: 200 }
    ); // Using 200 instead of 500 to prevent crashing the client
  }
}


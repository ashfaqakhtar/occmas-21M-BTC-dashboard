
import { fetchAllMarketData } from "./alpha-vantage";
import { redis } from "./redis";

// Function to refresh market data
export async function refreshMarketData(): Promise<void> {
  try {
    console.log("Refreshing market data...");

    const marketData = await fetchAllMarketData();

    const dataWithTimestamp = {
      ...marketData,
      lastUpdated: new Date().toISOString(),
    };

    await redis.set("market_data", dataWithTimestamp);

    console.log("Market data updated ✅");
  } catch (error) {
    console.error("Refresh error:", error);
  }
}

/**
 * ✅ Prevent multiple intervals (CRITICAL FIX)
 */
declare global {
  var marketRefreshInterval: NodeJS.Timeout | undefined;
}

// ✅ SAFE POLLING ⭐⭐⭐⭐⭐
if (!global.marketRefreshInterval) {
  global.marketRefreshInterval = setInterval(() => {
    refreshMarketData();
  }, 60000);

  console.log("Market refresh interval started ✅");
}

export default refreshMarketData;
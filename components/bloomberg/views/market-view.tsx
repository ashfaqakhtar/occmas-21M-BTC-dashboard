"use client";

import { useMarketDataQuery } from "../hooks";
import { MarketTable } from "../ui";

type MarketViewProps = {
  isDarkMode: boolean;
};

export function MarketView({ isDarkMode }: MarketViewProps) {
  const { marketData: data, isLoading, error } = useMarketDataQuery();

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-pulse text-center">
          <p className="text-lg font-mono">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-mono">Error loading market data</p>
        <p className="text-sm mt-2">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="relative z-0 overflow-x-auto">
      <MarketTable data={data} isDarkMode={isDarkMode} />
    </div>
  );
}

"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { useAtom } from "jotai";
import { AlertTriangle } from "lucide-react";
import { MarketRow } from ".";
import { showFuturesAtom, showMoversAtom, showRatiosAtom, showVolatilityAtom } from "../atoms";
import { bloombergColors, cn } from "../lib/theme-config";
import type { FilterState, MarketItem } from "../types";

type MarketSectionProps = {
  title: string;
  items: MarketItem[];
  sectionNum: string;
  regionKey: "americas" | "emea" | "asiaPacific";
  isDarkMode: boolean;
  updatedCells: Record<string, boolean>;
  updatedSparklines: Record<string, boolean>;
};

export function MarketSection({
  title,
  items,
  sectionNum,
  regionKey,
  isDarkMode,
  updatedCells,
  updatedSparklines,
}: MarketSectionProps) {
  // Jotai atoms for filter state
  const [showMovers] = useAtom(showMoversAtom);
  const [showVolatility] = useAtom(showVolatilityAtom);
  const [showRatios] = useAtom(showRatiosAtom);
  const [showFutures] = useAtom(showFuturesAtom);

  const colors = isDarkMode ? bloombergColors.dark : bloombergColors.light;
  const sectionHeaderBg = isDarkMode ? colors.background : "transparent";
  const fixedColumnClass = "w-[140px] sm:w-[170px] whitespace-nowrap overflow-hidden text-ellipsis";
  // Apply section-level filters
  let filteredItems = [...items];

  // Only show movers if the filter is active
  // We consider an item a "mover" if its percentage change is significant (> 1% or < -1%)
  if (showMovers) {
    filteredItems = filteredItems.filter((item) => Math.abs(item.pctChange) > 1.0);
  }

  // Only show items with significant volatility if the filter is active
  // We consider an item volatile if its AVAT value is high (> 10 or < -10)
  if (showVolatility) {
    filteredItems = filteredItems.filter((item) => Math.abs(item.avat) > 10.0);
  }

  // Only show ratio items if the filter is active
  // We consider specific market indices as "ratio" items
  if (showRatios) {
    filteredItems = filteredItems.filter(
      (item) =>
        // Consider major indices as ratio items for demonstration purposes
        ["S&P", "DOW", "NASDAQ", "FTSE"].some((term) => item.id.includes(term)) ||
        // Items with specific P/E ratio characteristics (using ytd as a proxy)
        Math.abs(item.ytd) > 10.0
    );
  }

  // Only show futures if the filter is active
  // We consider specific market items as "futures"
  if (showFutures) {
    filteredItems = filteredItems.filter(
      (item) =>
        // Consider these specific indices as futures-related for demonstration
        ["DAX", "CAC", "IBEX", "NIKKEI", "HANG SENG"].some((term) => item.id.includes(term)) ||
        // Items with specific characteristics (using avat as a proxy)
        Math.abs(item.avat) > 20.0
    );
  }

  // Handle case where items is undefined or not an array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={10} className="text-center py-4">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span>No data available for {title}</span>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // Handle case where all items are filtered out
  if (filteredItems.length === 0) {
    return (
      <>
        <TableRow>
          <TableCell
            className={cn(
              "sticky left-0 z-10 px-3 py-2 text-left text-sm font-bold",
              fixedColumnClass
            )}
            style={{ backgroundColor: sectionHeaderBg }}
            colSpan={1}
          >
            {sectionNum} {title}
          </TableCell>
          <TableCell colSpan={9} />
        </TableRow>
        <TableRow>
          <TableCell colSpan={10} className="text-center py-2">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>No matching items with current filters</span>
            </div>
          </TableCell>
        </TableRow>
      </>
    );
  }

  return (
    <>
      <TableRow>
        <TableCell
          className={cn(
              "sticky left-0 z-10 px-3 py-2 text-left text-sm font-bold",
              fixedColumnClass
            )}
          style={{ backgroundColor: sectionHeaderBg }}
          colSpan={1}
        >
          {sectionNum} {title}
        </TableCell>
        <TableCell colSpan={9} />
      </TableRow>
      {filteredItems.map((item, index) => (
        <MarketRow
          key={`${item.id}-${index}`}
          item={item}
          region={regionKey}
          isDarkMode={isDarkMode}
          updatedCells={updatedCells}
          updatedSparklines={updatedSparklines}
        />
      ))}
    </>
  );
}

"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAtom } from "jotai";
import { useMemo } from "react";
import { activeWatchlistAtom, watchlistsAtom } from "../atoms/terminal-ui";
import { showAvatAtom } from "../atoms";
import { MarketSection } from ".";
import { useMarketDataQuery } from "../hooks";
import { bloombergColors, cn } from "../lib/theme-config";
import type { MarketData } from "../types";

const fixedColumnClass = "w-[120px] sm:w-[140px] whitespace-nowrap overflow-hidden text-ellipsis";

type MarketTableProps = {
  data: MarketData;
  isDarkMode: boolean;
};

export function MarketTable({ data, isDarkMode }: MarketTableProps) {
  const { updatedCells, updatedSparklines } = useMarketDataQuery();
  const [showAvat] = useAtom(showAvatAtom);
  const [watchlists] = useAtom(watchlistsAtom);
  const [activeWatchlist] = useAtom(activeWatchlistAtom);
  const colors = isDarkMode ? bloombergColors.dark : bloombergColors.light;

  const filteredData = useMemo(() => {
    if (!activeWatchlist) {
      return data;
    }

    const selectedWatchlist = watchlists.find((watchlist) => watchlist.name === activeWatchlist);
    if (!selectedWatchlist) {
      return data;
    }

    const symbols = new Set(selectedWatchlist.indices);

    return {
      ...data,
      americas: (data.americas || []).filter((item) => symbols.has(item.id)),
      emea: (data.emea || []).filter((item) => symbols.has(item.id)),
      asiaPacific: (data.asiaPacific || []).filter((item) => symbols.has(item.id)),
    };
  }, [activeWatchlist, data, watchlists]);

  if (!filteredData) {
    return (
      <div className="p-4 text-center">
        <p>Loading market data...</p>
      </div>
    );
  }

  return (
    <Table className="w-full border-separate border-spacing-0">
      <TableHeader>
        <TableRow className={`bg-[${colors.surface}]`}>
          <TableHead
            className={cn(
              `sticky left-0 bg-[${colors.surface}] px-2 py-1 text-left font-bold`,
              fixedColumnClass
            )}
          >
            Market
          </TableHead>
          <TableHead className="px-2 py-1 text-center">RMI</TableHead>
          <TableHead className={`px-2 py-1 text-center bg-[${colors.surface}]`}>2Day</TableHead>
          <TableHead className="px-2 py-1 text-right">Value</TableHead>
          <TableHead className="px-2 py-1 text-right">Net Chg</TableHead>
          <TableHead className="px-2 py-1 text-right">%Chg</TableHead>
          <TableHead className={`px-2 py-1 text-right ${showAvat ? "sm:table-cell" : "hidden"}`}>
            Δ AVAT
          </TableHead>
          <TableHead className="px-2 py-1 text-right hidden sm:table-cell">Time</TableHead>
          <TableHead className="px-2 py-1 text-right hidden md:table-cell">%Ytd</TableHead>
          <TableHead className="px-2 py-1 text-right hidden md:table-cell">%YtdCur</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <MarketSection
          title="Bitcoin & Miners"
          items={filteredData.americas || []}
          sectionNum="1)"
          isDarkMode={isDarkMode}
          updatedCells={updatedCells}
          updatedSparklines={updatedSparklines}
        />
        <MarketSection
          title="Equity & Dollar"
          items={filteredData.emea || []}
          sectionNum="2)"
          isDarkMode={isDarkMode}
          updatedCells={updatedCells}
          updatedSparklines={updatedSparklines}
        />
        <MarketSection
          title="Rates & Gold"
          items={filteredData.asiaPacific || []}
          sectionNum="3)"
          isDarkMode={isDarkMode}
          updatedCells={updatedCells}
          updatedSparklines={updatedSparklines}
        />
      </TableBody>
    </Table>
  );
}

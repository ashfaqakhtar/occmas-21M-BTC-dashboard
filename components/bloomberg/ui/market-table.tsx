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
import { showAvatAtom } from "../atoms";
import { activeWatchlistAtom, watchlistsAtom } from "../atoms/terminal-ui";
import { useMarketDataQuery } from "../hooks";
import { bloombergColors, cn } from "../lib/theme-config";
import type { MarketData, MarketItem } from "../types";
import { MarketSection } from ".";

const fixedColumnClass = "w-[140px] sm:w-[170px] whitespace-nowrap overflow-hidden text-ellipsis";

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
    if (!activeWatchlist) return data;

    const selectedWatchlist = watchlists.find((watchlist) => watchlist.name === activeWatchlist);
    if (!selectedWatchlist) return data;

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

    const commodityIds = new Set(["GOLD", "SILVER", "XPTUSD", "XPDUSD", "USOIL", "UKOIL", "NATGAS"]);
  const mag7Ids = new Set(["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA"]);

  const asiaItems = (filteredData.asiaPacific || []) as MarketItem[];
  const commodityItems = asiaItems.filter((item) => commodityIds.has(item.id));
  const mag7Items = asiaItems.filter((item) => mag7Ids.has(item.id));

  return (
    <Table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
      <TableHeader>
        <TableRow className={`bg-[${colors.surface}]`}>
          <TableHead
            className={cn(
              `sticky left-0 z-20 bg-[${colors.surface}] px-3 py-2 text-left text-sm font-bold`,
              fixedColumnClass
            )}
            style={{ backgroundColor: colors.surface }}
          >
            Market
          </TableHead>
          <TableHead className="px-3 py-2 text-center text-sm">RMI</TableHead>
          <TableHead className={`w-[190px] px-3 py-2 text-center text-sm bg-[${colors.surface}]`}>
            2Day
          </TableHead>
          <TableHead className="px-3 py-2 text-right text-sm">Value</TableHead>
          <TableHead className="px-3 py-2 text-right text-sm">Net Chg</TableHead>
          <TableHead className="px-3 py-2 text-right text-sm">%Chg</TableHead>
          <TableHead className={`px-3 py-2 text-right text-sm ${showAvat ? "sm:table-cell" : "hidden"}`}>
            Delta AVAT
          </TableHead>
          <TableHead className="px-3 py-2 text-right text-sm hidden sm:table-cell">Time</TableHead>
          <TableHead className="px-3 py-2 text-right text-sm hidden md:table-cell">%Ytd</TableHead>
          <TableHead className="px-3 py-2 text-right text-sm hidden md:table-cell">%YtdCur</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <MarketSection
          title="Bitcoin & Miners"
          items={filteredData.americas || []}
          sectionNum="1)"
          regionKey="americas"
          isDarkMode={isDarkMode}
          updatedCells={updatedCells}
          updatedSparklines={updatedSparklines}
        />
        <MarketSection
          title="Index"
          items={filteredData.emea || []}
          sectionNum="2)"
          regionKey="emea"
          isDarkMode={isDarkMode}
          updatedCells={updatedCells}
          updatedSparklines={updatedSparklines}
        />
        <MarketSection
          title="Commodities"
          items={commodityItems}
          sectionNum="3)"
          regionKey="asiaPacific"
          isDarkMode={isDarkMode}
          updatedCells={updatedCells}
          updatedSparklines={updatedSparklines}
        />
        <MarketSection
          title="MAG 7"
          items={mag7Items}
          sectionNum="4)"
          regionKey="asiaPacific"
          isDarkMode={isDarkMode}
          updatedCells={updatedCells}
          updatedSparklines={updatedSparklines}
        />
      </TableBody>
    </Table>
  );
}



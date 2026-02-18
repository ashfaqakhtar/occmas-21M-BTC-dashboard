"use client";

import { useAtom } from "jotai";
import { activeWatchlistAtom, watchlistsAtom } from "../atoms/terminal-ui";
import { useTerminalUI } from "../hooks";
import { useMarketDataQuery } from "../hooks";
import { TerminalFilterBar } from "../layout/terminal-filter-bar";
import { TerminalHeader } from "../layout/terminal-header";
import { TerminalLayout } from "../layout/terminal-layout";
import { MarketView } from "../views/market-view";

export default function BloombergTerminal() {
  const { isDarkMode, handleThemeToggle } = useTerminalUI();
  const [watchlists] = useAtom(watchlistsAtom);
  const [, setActiveWatchlist] = useAtom(activeWatchlistAtom);
  const { refreshData, toggleRealTimeUpdates } = useMarketDataQuery();

  const shortcuts = [
    {
      key: "r",
      ctrlKey: true,
      action: refreshData,
      description: "Refresh market data",
    },
    {
      key: "l",
      ctrlKey: true,
      action: toggleRealTimeUpdates,
      description: "Toggle live updates",
    },
    {
      key: "0",
      ctrlKey: true,
      action: () => setActiveWatchlist(null),
      description: "Show all instruments",
    },
  ];

  return (
    <TerminalLayout shortcuts={shortcuts}>
      <TerminalHeader isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} />
      <TerminalFilterBar isDarkMode={isDarkMode} watchlists={watchlists} />
      <MarketView isDarkMode={isDarkMode} />
    </TerminalLayout>
  );
}

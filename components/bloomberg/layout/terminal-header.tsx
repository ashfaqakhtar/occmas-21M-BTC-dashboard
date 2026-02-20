"use client";

import { Database, LogOut, Moon, RefreshCw, Sun, Wifi } from "lucide-react";
import { BloombergButton } from "../core/bloomberg-button";
import { useMarketDataQuery } from "../hooks";
import { bloombergColors } from "../lib/theme-config";

type TerminalHeaderProps = {
  isDarkMode: boolean;
  onThemeToggle: () => void;
};

export function TerminalHeader({ isDarkMode, onThemeToggle }: TerminalHeaderProps) {
  const {
    isLoading,
    isRealTimeEnabled,
    isFromRedis,
    dataSource,
    lastUpdated,
    refreshData,
    toggleRealTimeUpdates,
  } = useMarketDataQuery();

  const colors = isDarkMode ? bloombergColors.dark : bloombergColors.light;

  return (
    <div className={`relative z-30 flex flex-wrap items-center gap-2 bg-[${colors.surface}] px-2 py-1`}>
      <div className="flex items-center gap-2">
        <span className="text-[20px] text-orange-400 tracking-widest">21M</span>
        <span className="text-xl font-bold">INTERNAL MARKET TERMINAL</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <BloombergButton color="accent" onClick={refreshData} disabled={isLoading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          REFR
        </BloombergButton>

        <BloombergButton
          color={isRealTimeEnabled ? "red" : "green"}
          onClick={toggleRealTimeUpdates}
          disabled={isLoading}
        >
          {isRealTimeEnabled ? "STOP" : "LIVE"}
        </BloombergButton>

        <BloombergButton color="accent" onClick={onThemeToggle}>
          {isDarkMode ? <Sun className="h-3 w-3 mr-1" /> : <Moon className="h-3 w-3 mr-1" />}
          {isDarkMode ? "LIGHT" : "DARK"}
        </BloombergButton>

        <form action="/api/auth/logout" method="post">
          <BloombergButton color="red" type="submit">
            <LogOut className="h-3 w-3 mr-1" />
            EXIT
          </BloombergButton>
        </form>
      </div>

      <div className="w-full flex items-center gap-2 text-xs text-gray-400">
        {isRealTimeEnabled ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <Database className="h-3 w-3 text-yellow-500" />
        )}
        <span>{dataSource === "alpha-vantage" ? "API" : isFromRedis ? "Redis" : "Fallback"}</span>
        {lastUpdated && <span>{lastUpdated.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

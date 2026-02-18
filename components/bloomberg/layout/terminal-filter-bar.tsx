"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { activeWatchlistAtom } from "../atoms/terminal-ui";
import { bloombergColors } from "../lib/theme-config";

type TerminalFilterBarProps = {
  isDarkMode: boolean;
  watchlists: Array<{ name: string; indices: string[] }>;
};

export function TerminalFilterBar({ isDarkMode, watchlists }: TerminalFilterBarProps) {
  const colors = isDarkMode ? bloombergColors.dark : bloombergColors.light;
  const [activeWatchlist, setActiveWatchlist] = useAtom(activeWatchlistAtom);

  return (
    <div
      className={`flex flex-wrap items-center gap-3 bg-[${colors.surface}] px-2 py-1 text-[${colors.accent}] text-xs sm:text-sm`}
    >
      <span className="text-[11px] tracking-wider text-orange-300">WATCHLIST</span>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 border border-orange-600 px-2 py-1">
          <span className="font-bold">{activeWatchlist || "All Instruments"}</span>
          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="font-mono text-xs">
          <DropdownMenuItem onClick={() => setActiveWatchlist(null)}>All Instruments</DropdownMenuItem>
          {watchlists.map((list) => (
            <DropdownMenuItem key={list.name} onClick={() => setActiveWatchlist(list.name)}>
              {list.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

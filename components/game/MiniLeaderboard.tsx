"use client";

import { useEffect, useState } from "react";
import { getLeaderboard } from "@/lib/api/client-proxy";
import type { LeaderboardEntry } from "@/lib/api/client-proxy";
import { useGameStore } from "@/lib/engine/GameState";

export function MiniLeaderboard() {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const activeChaosEvents = useGameStore((s) => s.activeChaosEvents);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const data = await getLeaderboard(5);
        setScores(data);
      } catch {
        setScores([]);
      }
    };
    fetchScores();
    const interval = setInterval(fetchScores, 10000);
    return () => clearInterval(interval);
  }, []);

  if (activeChaosEvents.length > 0) return null;
  if (scores.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-30 bg-[#1a1f26]/95 border border-[#374151] rounded-lg shadow-lg p-3 min-w-[160px]">
      <div className="text-xs font-bold text-[#00c853] mb-2">Top 5</div>
      <ul className="space-y-1 text-sm">
        {scores.map((entry, i) => (
          <li
            key={`${entry.playerName}-${entry.totalScore}-${i}`}
            className="flex items-center justify-between gap-2 text-[var(--foreground)]"
          >
            <span className="text-[#00c853] font-mono w-4">#{i + 1}</span>
            <span className="truncate flex-1 min-w-0">{entry.playerName}</span>
            <span className="text-[#00c853] font-bold shrink-0">{entry.totalScore}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

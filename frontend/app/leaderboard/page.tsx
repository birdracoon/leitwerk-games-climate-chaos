"use client";

import { useEffect, useState } from "react";
import { getLeaderboard } from "@/lib/api/client-proxy";
import type { LeaderboardEntry } from "@/lib/api/client-proxy";

export default function LeaderboardPage() {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const data = await getLeaderboard(10);
        setScores(data);
      } catch {
        setError("Leaderboard konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
    const interval = setInterval(fetchScores, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-[#00c853] mb-8">
          Leitwerk – Top 10
        </h1>
        {loading ? (
          <p className="text-center text-[var(--foreground)]">Laden...</p>
        ) : error ? (
          <p className="text-center text-red-400">{error}</p>
        ) : scores.length === 0 ? (
          <p className="text-center text-[var(--foreground)]">
            Noch keine Einträge. Sei der Erste!
          </p>
        ) : (
          <ul className="space-y-4">
            {scores.map((entry, i) => (
              <li
                key={`${entry.playerName}-${entry.totalScore}-${i}`}
                className="flex items-center gap-4 bg-[#1a1f26] border border-[#374151] rounded-lg p-4"
              >
                <span className="w-8 text-2xl font-bold text-[#00c853]">
                  #{i + 1}
                </span>
                <span className="flex-1 font-mono text-[var(--foreground)]">
                  {entry.playerName}
                </span>
                <span className="text-[#00c853] font-bold">{entry.totalScore}</span>
                <span className="text-sm text-[#6b7280]">
                  {Math.floor(entry.survivalTimeSeconds / 60)}:
                  {(entry.survivalTimeSeconds % 60).toString().padStart(2, "0")}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-center text-xs text-[#6b7280] mt-8">
          Aktualisiert alle 5 Sekunden
        </p>
        <a
          href="/"
          className="block text-center mt-6 text-[#00c853] hover:underline"
        >
          ← Zurück zum Spiel
        </a>
      </div>
    </div>
  );
}

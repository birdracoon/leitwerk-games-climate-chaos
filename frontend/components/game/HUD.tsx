"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useGameStore } from "@/lib/engine/GameState";
import { MAX_ENERGY, BASE_PATH } from "@/lib/constants";
import { calculateEfficiencyQuotient, calculateTotalScore } from "@/lib/engine/ScoreCalculator";
import { calculateWerkstaetteMachineLoad } from "@/lib/engine/EnergyManager";

export function HUD() {
  const energyUsed = useGameStore((s) => s.energyUsed);
  const isBlackout = useGameStore((s) => s.isBlackout);
  const survivalTimeMs = useGameStore((s) => s.survivalTimeMs);
  const rooms = useGameStore((s) => s.rooms);
  const eff = useMemo(
    () => calculateEfficiencyQuotient(rooms, energyUsed, MAX_ENERGY),
    [rooms, energyUsed]
  );
  const score = useMemo(
    () => calculateTotalScore(Math.floor(survivalTimeMs / 1000), eff),
    [survivalTimeMs, eff]
  );

  const minutes = Math.floor(survivalTimeMs / 60000);
  const seconds = Math.floor((survivalTimeMs % 60000) / 1000);

  const werkstaettLoad = useMemo(
    () => calculateWerkstaetteMachineLoad(rooms),
    [rooms]
  );
  const werkstaettWarning = werkstaettLoad > 30;

  const energyPercent = (energyUsed / MAX_ENERGY) * 100;
  const energyColor =
    isBlackout || energyUsed > MAX_ENERGY
      ? "bg-red-500"
      : energyPercent > 70
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <header
      className={`relative flex items-center justify-between px-4 py-2 bg-[#1a1f26] border-b border-[#374151] ${
        isBlackout ? "animate-pulse-red" : ""
      }`}
    >
      <div className="flex items-center gap-6">
        <Image
          src={`${BASE_PATH}/logo-claim-dark.svg`}
          alt="Leitwerk"
          width={140}
          height={32}
          className="h-8 w-auto"
          priority
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--foreground)]">Energie:</span>
          <div className="w-40 h-5 bg-[#374151] rounded overflow-hidden relative">
            <div
              className="absolute inset-0 bg-green-500/20"
              style={{ width: "70%" }}
              title="Komfortzone"
            />
            <div
              className={`relative h-full transition-all ${energyColor}`}
              style={{ width: `${Math.min(100, energyPercent)}%` }}
            />
          </div>
          <span className="text-xs text-[var(--foreground)]">
            {Math.round(energyUsed)} / {MAX_ENERGY}
          </span>
        </div>
        {isBlackout && (
          <span className="text-sm font-bold text-red-400 animate-pulse">SICHERUNG!</span>
        )}
        {werkstaettWarning && !isBlackout && (
          <span className="text-[10px] text-amber-400 animate-pulse">
            ⚡ Hohe Maschinenlast: Werkstätte ({Math.round(werkstaettLoad)}W)
          </span>
        )}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="text-xs text-[var(--foreground)] opacity-80">Leitwerk-Effizienz</span>
        <span className="text-2xl font-bold text-[#00c853] animate-score-glow tabular-nums">
          {score}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-[var(--foreground)]">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
      </div>
    </header>
  );
}

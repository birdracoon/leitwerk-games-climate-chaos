"use client";

import Image from "next/image";
import { useGameStore } from "@/lib/engine/GameState";

function getEventStyle(e: { effect: { systemOutage?: unknown; temperature?: number; airQuality?: number } }) {
  if (e.effect.systemOutage) {
    return "bg-red-950/95 border-2 border-red-500 text-red-100 animate-pulse-red";
  }
  if (e.effect.temperature !== undefined) {
    return "bg-red-900/95 border-2 border-red-400 text-red-50";
  }
  if (e.effect.airQuality !== undefined) {
    return "bg-yellow-900/95 border-2 border-yellow-500 text-yellow-100";
  }
  return "bg-red-900/95 border-2 border-red-400 text-red-50";
}

export function ChaosEventPopup() {
  const activeChaosEvents = useGameStore((s) => s.activeChaosEvents);

  if (activeChaosEvents.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-40 space-y-2 max-w-sm">
      {activeChaosEvents.map((e) => (
        <div
          key={e.id}
          className={`${getEventStyle(e)} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}
        >
          <Image
            src="/logo-claim-dark.svg"
            alt=""
            width={24}
            height={24}
            className="h-6 w-auto shrink-0 opacity-90"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-red-300 text-xs mb-0.5">CHAOS</p>
            <p className="text-sm break-words">{e.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useGameStore } from "@/lib/engine/GameState";
import { SYSTEM_NAMES } from "@/lib/constants";
import type { SystemType } from "@/lib/constants";
import { getRoomLayout } from "./BuildingLayout";
import { useCanvasBounds } from "./CanvasSizeContext";

const SYSTEM_COLORS: Record<SystemType, string> = {
  heating: "#ff6d00",
  cooling: "#00b0ff",
  ventilation: "#4caf50",
};

export function ConnectionOverlay({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const connections = useGameStore((s) => s.connections);
  const brokenDevices = useGameStore((s) => s.brokenDevices);
  const removeConnection = useGameStore((s) => s.removeConnection);
  const setPowerLevel = useGameStore((s) => s.setPowerLevel);
  const { width, height, rect } = useCanvasBounds();
  const layout = useMemo(() => getRoomLayout(width, height), [width, height]);

  if (!rect) return null;

  return (
    <>
      {layout.map(({ id, x, y, w, h }) => {
        const roomConns = connections.filter((c) => c.toRoom === id);
        if (roomConns.length === 0) return null;

        const overlayH = roomConns.length * 24 + 8;
        const canvasX = x + 8;
        const canvasY = y + h - overlayH - 4;
        const canvasW = w - 16;
        const screenX = rect.left + (canvasX / width) * rect.width;
        const screenY = rect.top + (canvasY / height) * rect.height;
        const screenW = (canvasW / width) * rect.width;

        return (
          <div
            key={id}
            className="fixed z-40 bg-[#1a1f26]/95 border border-[#374151] rounded-lg shadow-lg p-2"
            style={{
              left: screenX,
              top: screenY,
              width: Math.max(screenW, 140),
            }}
          >
            {roomConns.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 py-0.5 text-sm text-[var(--foreground)]"
              >
                <span
                  className="text-xs font-medium w-4 shrink-0"
                  style={{ color: SYSTEM_COLORS[c.fromSystem] }}
                  title={SYSTEM_NAMES[c.fromSystem]}
                >
                  {c.fromSystem === "heating" ? "H" : c.fromSystem === "cooling" ? "K" : "L"}
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={c.powerLevel}
                  onChange={(e) =>
                    setPowerLevel(c.id, Number(e.target.value))
                  }
                  disabled={brokenDevices.has(c.fromSystem)}
                  className="flex-1 min-w-0 disabled:opacity-50"
                  style={{
                    accentColor: SYSTEM_COLORS[c.fromSystem],
                    height: 20,
                  }}
                />
                <span className="text-xs w-7 tabular-nums">{c.powerLevel}%</span>
                <button
                  onClick={() => removeConnection(c.id)}
                  className="text-red-400 hover:text-red-300 text-xs px-1 shrink-0"
                  aria-label="Verbindung trennen"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

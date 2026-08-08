"use client";

import type { Graphics } from "pixi.js";
import { useGameStore } from "@/lib/engine/GameState";
import { getMachineAnchor } from "./MachineRoomLayout";

const PIPE_COLORS: Record<string, number> = {
  heating: 0xff6d00,
  cooling: 0x00b0ff,
  ventilation: 0x4caf50,
};

export function DragPipe({ width, height }: { width: number; height: number }) {
  const dragState = useGameStore((s) => s.dragState);

  if (!dragState?.active || !dragState.fromSystem) return null;

  const from = getMachineAnchor(width, height, dragState.fromSystem);
  const x1 = from.x;
  const y1 = from.y;
  const x2 = dragState.currentX;
  const y2 = dragState.currentY;
  const type = dragState.fromSystem;
  const color = PIPE_COLORS[type] ?? 0x6b7280;

  return (
    <pixiGraphics
      draw={(g: Graphics) => {
        g.clear();
        if (type === "heating") {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * 5;
          const ny = (dx / len) * 5;
          g.moveTo(x1 - nx, y1 - ny).lineTo(x2 - nx, y2 - ny)
            .stroke({ width: 6, color: 0xff6d00, alpha: 0.9 });
          g.moveTo(x1 + nx, y1 + ny).lineTo(x2 + nx, y2 + ny)
            .stroke({ width: 6, color: 0x5c6bc0, alpha: 0.72 });
        } else {
          const dark = color === 0x4caf50 ? 0x1b5e20 : 0x01579b;
          g.moveTo(x1, y1).lineTo(x2, y2)
            .stroke({ width: 18, color: dark, alpha: 0.72 });
          g.moveTo(x1, y1).lineTo(x2, y2)
            .stroke({ width: 12, color, alpha: 0.9 });
        }
      }}
    />
  );
}

"use client";

import { useMemo } from "react";
import type { Graphics } from "pixi.js";
import { useGameStore } from "@/lib/engine/GameState";
import type { SystemType } from "@/lib/constants";
import { getRoomLayout } from "./BuildingLayout";
import { getMachineLayout } from "./MachineRoomLayout";

function sampleBezier(
  x1: number, y1: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  x2: number, y2: number,
  t: number
): { x: number; y: number; tx: number; ty: number } {
  const mt = 1 - t;
  const x = mt * mt * mt * x1 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x2;
  const y = mt * mt * mt * y1 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y2;
  const tx = 3 * mt * mt * (cx1 - x1) + 6 * mt * t * (cx2 - cx1) + 3 * t * t * (x2 - cx2);
  const ty = 3 * mt * mt * (cy1 - y1) + 6 * mt * t * (cy2 - cy1) + 3 * t * t * (y2 - cy2);
  return { x, y, tx, ty };
}

function drawDuctPipe(
  g: Graphics,
  x1: number, y1: number, x2: number, y2: number,
  color: number, alpha: number, strokeW: number
) {
  const cx1 = x1;
  const cy1 = (y1 + y2) / 2;
  const cx2 = x2;
  const cy2 = (y1 + y2) / 2;
  const dark = color === 0x4caf50 ? 0x1b5e20 : 0x01579b;
  const glowW = strokeW + (strokeW > 6 ? 4 : 2);
  g.moveTo(x1, y1).bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2)
    .stroke({ width: glowW, color: dark, alpha: alpha * 0.6 });
  g.moveTo(x1, y1).bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2)
    .stroke({ width: strokeW, color, alpha });
  for (let t = 0.1; t < 1; t += 0.15) {
    const p = sampleBezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, t);
    const len = 8;
    const nx = -p.ty / (Math.hypot(p.tx, p.ty) || 1);
    const ny = p.tx / (Math.hypot(p.tx, p.ty) || 1);
    g.moveTo(p.x - nx * len, p.y - ny * len)
      .lineTo(p.x + nx * len, p.y + ny * len)
      .stroke({ width: 2, color: dark, alpha: alpha * 0.6 });
  }
}

function drawHeatingPipes(
  g: Graphics,
  x1: number, y1: number, x2: number, y2: number,
  alpha: number, strokeW: number
) {
  const cx1 = x1;
  const cy1 = (y1 + y2) / 2;
  const cx2 = x2;
  const cy2 = (y1 + y2) / 2;
  const off = 5;
  g.moveTo(x1 - off, y1).bezierCurveTo(cx1 - off, cy1, cx2 - off, cy2, x2 - off, y2)
    .stroke({ width: strokeW, color: 0xff6d00, alpha });
  g.moveTo(x1 + off, y1).bezierCurveTo(cx1 + off, cy1, cx2 + off, cy2, x2 + off, y2)
    .stroke({ width: strokeW, color: 0x5c6bc0, alpha: alpha * 0.8 });
}

function drawFlowParticles(
  g: Graphics,
  x1: number, y1: number, x2: number, y2: number,
  color: number, alpha: number, powerLevel: number, count: number,
  isTurbo = false
) {
  if (powerLevel <= 0) return;
  const cx1 = x1;
  const cy1 = (y1 + y2) / 2;
  const cx2 = x2;
  const cy2 = (y1 + y2) / 2;
  const baseSpeed = 2000 - (powerLevel / 100) * 1500;
  const speed = isTurbo ? baseSpeed / 3 : baseSpeed;
  const now = Date.now() / speed;
  for (let i = 0; i < count; i++) {
    const t = (now + i * 0.15) % 1;
    const p = sampleBezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, t);
    g.circle(p.x, p.y, 4).fill({ color, alpha: alpha * 0.95 });
  }
}

function drawHeatingFlowParticles(
  g: Graphics,
  x1: number, y1: number, x2: number, y2: number,
  alpha: number, powerLevel: number
) {
  if (powerLevel <= 0) return;
  const cx1 = x1;
  const cy1 = (y1 + y2) / 2;
  const cx2 = x2;
  const cy2 = (y1 + y2) / 2;
  const speed = 2000 - (powerLevel / 100) * 1500;
  const now = Date.now() / speed;
  for (let i = 0; i < 6; i++) {
    const t = (now + i * 0.12) % 1;
    const pV = sampleBezier(x1 - 5, y1, cx1 - 5, cy1, cx2 - 5, cy2, x2 - 5, y2, t);
    const pR = sampleBezier(x1 + 5, y1, cx1 + 5, cy1, cx2 + 5, cy2, x2 + 5, y2, (t + 0.5) % 1);
    g.circle(pV.x, pV.y, 3).fill({ color: 0xff6d00, alpha: alpha * 0.9 });
    g.circle(pR.x, pR.y, 3).fill({ color: 0x5c6bc0, alpha: alpha * 0.75 });
  }
}

export function PipeSystem({ width, height }: { width: number; height: number }) {
  const connections = useGameStore((s) => s.connections);
  const systemOutages = useGameStore((s) => s.systemOutages);
  const brokenDevices = useGameStore((s) => s.brokenDevices);
  const isBlackout = useGameStore((s) => s.isBlackout);
  const isTurboActive = useGameStore((s) => s.isTurboActive);

  const isSystemDisabled = (type: SystemType) =>
    systemOutages.has(type) || brokenDevices.has(type) || isBlackout;
  const roomLayout = useMemo(() => getRoomLayout(width, height), [width, height]);
  const { systems } = useMemo(() => getMachineLayout(width, height), [width, height]);

  const baseStroke = Math.max(4, width / 120);

  return (
    <>
      {connections.map((conn) => {
        const sys = systems.find((s) => s.type === conn.fromSystem);
        const to = roomLayout.find((r) => r.id === conn.toRoom);
        if (!sys || !to) return null;
        const powerLevel = conn.powerLevel;
        const strokeW = baseStroke + (powerLevel / 100) * 4;
        const alpha = isSystemDisabled(conn.fromSystem)
          ? 0.2
          : powerLevel === 0
            ? 0.4
            : 0.6 + (powerLevel / 100) * 0.25;
        const x1 = sys.x + sys.anchorX;
        const y1 = sys.y + sys.anchorY;
        const x2 = to.x + to.w / 2;
        const y2 = to.y + to.h;
        const type = conn.fromSystem;
        return (
          <pixiGraphics
            key={conn.id}
            draw={(g: Graphics) => {
              g.clear();
              if (type === "heating") {
                drawHeatingPipes(g, x1, y1, x2, y2, alpha, strokeW);
                if (!isSystemDisabled(type)) {
                  drawHeatingFlowParticles(g, x1, y1, x2, y2, alpha, powerLevel);
                }
              } else {
                const color = type === "cooling" ? 0x00b0ff : 0x4caf50;
                drawDuctPipe(g, x1, y1, x2, y2, color, alpha, strokeW);
                if (!isSystemDisabled(type)) {
                  drawFlowParticles(
                    g, x1, y1, x2, y2, color, alpha, powerLevel, 6,
                    type === "ventilation" && isTurboActive
                  );
                }
              }
            }}
          />
        );
      })}
    </>
  );
}

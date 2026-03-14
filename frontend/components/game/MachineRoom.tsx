"use client";

import { useState, useEffect, useMemo } from "react";
import type { Graphics } from "pixi.js";
import { useGameStore } from "@/lib/engine/GameState";
import { getMachineLayout } from "./MachineRoomLayout";
import { SYSTEM_NAMES } from "@/lib/constants";
import { DEVICE_OVERLOAD_DURATION_MS, DEVICE_REPAIR_DURATION_MS, DEVICE_OVERLOAD_THRESHOLD } from "@/lib/constants";
import type { SystemType } from "@/lib/constants";
import { useDeviceTextures } from "@/lib/game/CharacterTextures";

function DeviceSprite({
  texture,
  boxW,
  boxH,
  alpha,
}: {
  texture: import("pixi.js").Texture;
  boxW: number;
  boxH: number;
  alpha: number;
}) {
  const tw = texture.width;
  const th = texture.height;
  const scale = Math.min(boxW / tw, boxH / th);
  const ox = (boxW - tw * scale) / 2;
  const oy = (boxH - th * scale) / 2;
  return (
    <pixiSprite
      texture={texture}
      x={ox}
      y={oy}
      scale={scale}
      anchor={{ x: 0, y: 0 }}
      alpha={alpha}
    />
  );
}

function drawHeatingDevice(g: Graphics, w: number, h: number, color: number, alpha: number, strokeColor: number) {
  const bodyH = h * 0.6;
  const bodyW = w * 0.7;
  const cx = w / 2;
  g.rect((w - bodyW) / 2, h - bodyH, bodyW, bodyH)
    .fill({ color, alpha })
    .stroke({ width: 2, color: strokeColor });
  g.rect(cx - w * 0.15, h - bodyH - h * 0.25, w * 0.3, h * 0.25)
    .fill({ color: 0x4e342e, alpha })
    .stroke({ width: 1, color: strokeColor });
  g.circle(w * 0.2, h - bodyH * 0.5, w * 0.06).fill({ color: 0x374151, alpha: 0.8 });
  g.circle(w * 0.8, h - bodyH * 0.5, w * 0.06).fill({ color: 0x374151, alpha: 0.8 });
  g.poly([cx - w * 0.1, h - 4, cx, h - bodyH * 0.2, cx + w * 0.1, h - 4]).fill({ color: 0xff9800, alpha: 0.9 });
  g.poly([cx - w * 0.06, h - 4, cx - w * 0.02, h - bodyH * 0.35, cx + w * 0.02, h - 4]).fill({ color: 0xf44336, alpha: 0.8 });
  g.poly([cx - w * 0.02, h - 4, cx + w * 0.06, h - bodyH * 0.35, cx + w * 0.1, h - 4]).fill({ color: 0xff9800, alpha: 0.8 });
}

function drawCoolingDevice(g: Graphics, w: number, h: number, color: number, alpha: number, strokeColor: number) {
  g.rect(0, 0, w, h).fill({ color, alpha }).stroke({ width: 2, color: strokeColor });
  for (let i = 1; i < 6; i++)
    g.moveTo(w * 0.1, (h / 6) * i).lineTo(w * 0.9, (h / 6) * i).stroke({ width: 1, color: strokeColor, alpha: 0.6 });
  g.circle(w / 2, h * 0.4, w * 0.2).fill({ color: 0x374151, alpha: 0.5 }).stroke({ width: 1, color: strokeColor });
  g.moveTo(w / 2, h * 0.25).lineTo(w / 2, h * 0.55).stroke({ width: 2, color: strokeColor });
  g.moveTo(w * 0.3, h * 0.4).lineTo(w * 0.7, h * 0.4).stroke({ width: 2, color: strokeColor });
  g.moveTo(w * 0.35, h * 0.32).lineTo(w * 0.65, h * 0.48).stroke({ width: 2, color: strokeColor });
  g.moveTo(w * 0.35, h * 0.48).lineTo(w * 0.65, h * 0.32).stroke({ width: 2, color: strokeColor });
  g.poly([w / 2, h * 0.65, w * 0.35, h * 0.75, w * 0.4, h * 0.7, w / 2, h * 0.62, w * 0.6, h * 0.7, w * 0.65, h * 0.75]).fill({ color: 0xb3e5fc, alpha: 0.6 });
}

function drawVentilationDevice(g: Graphics, w: number, h: number, color: number, alpha: number, strokeColor: number) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.35;
  g.circle(cx, cy, r).fill({ color, alpha }).stroke({ width: 2, color: strokeColor });
  g.circle(cx, cy, r * 0.4).fill({ color: 0x374151, alpha: 0.6 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r * 0.4;
    const y1 = cy + Math.sin(a) * r * 0.4;
    const x2 = cx + Math.cos(a) * r * 0.95;
    const y2 = cy + Math.sin(a) * r * 0.95;
    g.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 3, color: strokeColor });
  }
  g.moveTo(cx - r * 0.3, cy - r * 0.5).quadraticCurveTo(cx - r, cy - r * 0.3, cx - r * 0.4, cy + r * 0.3).stroke({ width: 1, color: 0x81c784, alpha: 0.7 });
  g.moveTo(cx + r * 0.5, cy + r * 0.2).quadraticCurveTo(cx + r * 0.8, cy + r * 0.5, cx + r * 0.3, cy - r * 0.2).stroke({ width: 1, color: 0x81c784, alpha: 0.7 });
}

export function MachineRoomBackground({ width, height }: { width: number; height: number }) {
  const { machineY, machineHeight } = useMemo(() => getMachineLayout(width, height), [width, height]);

  return (
    <>
      <pixiGraphics
        draw={(g: Graphics) => {
          g.clear();
          g.rect(0, machineY, width, machineHeight)
            .fill({ color: 0x263238, alpha: 0.95 })
            .stroke({ width: 3, color: 0x374151 });
          for (let i = 1; i < 4; i++)
            g.moveTo(0, machineY + (machineHeight / 4) * i)
              .lineTo(width, machineY + (machineHeight / 4) * i)
              .stroke({ width: 1, color: 0x374151, alpha: 0.5 });
        }}
      />
      <pixiText
        text="Ziehe Geraete auf Raeume zum Verbinden"
        x={width / 2}
        y={machineY + 12}
        anchor={0.5}
        style={{
          fontSize: 14,
          fill: 0xffeb3b,
          fontWeight: "bold",
          dropShadow: { color: 0x000000, blur: 2, distance: 1 },
        }}
      />
    </>
  );
}

export function MachineRoomDevices({ width, height }: { width: number; height: number }) {
  const systemOutages = useGameStore((s) => s.systemOutages);
  const brokenDevices = useGameStore((s) => s.brokenDevices);
  const deviceOverloadStart = useGameStore((s) => s.deviceOverloadStart);
  const deviceRepairStart = useGameStore((s) => s.deviceRepairStart);
  const isBlackout = useGameStore((s) => s.isBlackout);
  const connections = useGameStore((s) => s.connections);

  const needsInterval =
    brokenDevices.size > 0 || Object.values(deviceOverloadStart).some((v) => v != null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!needsInterval) return;
    const id = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(id);
  }, [needsInterval]);
  const startDrag = useGameStore((s) => s.startDrag);
  const deviceTextures = useDeviceTextures();
  const { systems } = useMemo(() => getMachineLayout(width, height), [width, height]);

  const colors: Record<SystemType, number> = {
    heating: 0xff6d00,
    cooling: 0x00b0ff,
    ventilation: 0x4caf50,
  };

  return (
    <>
      {systems.map(({ type, x, y, w, h }) => {
        const isBroken = brokenDevices.has(type);
        const isOut = systemOutages.has(type) || isBroken || isBlackout;
        const hasConn = connections.some((c) => c.fromSystem === type);
        const typeConns = connections.filter((c) => c.fromSystem === type);
        const totalPower = typeConns.reduce((s, c) => s + c.powerLevel, 0);
        const loadRatio = totalPower / DEVICE_OVERLOAD_THRESHOLD;
        const overloadStart = deviceOverloadStart[type];
        const repairStart = deviceRepairStart[type];
        const remainingSec =
          overloadStart != null
            ? Math.ceil((DEVICE_OVERLOAD_DURATION_MS - (now - overloadStart)) / 1000)
            : null;
        const repairRemainingSec =
          repairStart != null
            ? Math.ceil((DEVICE_REPAIR_DURATION_MS - (now - repairStart)) / 1000)
            : null;
        const shake =
          !isOut && loadRatio > 0.7 && !overloadStart
            ? (loadRatio > 0.9 ? 3 : 2) * Math.sin(Date.now() / 50)
            : 0;
        const color = isOut ? 0x6b7280 : colors[type];
        const alpha = isOut ? 0.3 : hasConn ? 0.7 : 0.5;
        const strokeColor = hasConn && !isOut ? 0x4caf50 : isOut ? 0x4b5563 : 0x6b7280;
        const loadBarColor = loadRatio <= 0.6 ? 0x4caf50 : loadRatio <= 0.85 ? 0xf9a825 : 0xf44336;
        const tex = deviceTextures?.[type];
        return (
          <pixiContainer
            key={type}
            x={x + shake}
            y={y}
            eventMode="static"
            cursor="grab"
            onPointerDown={(e: { global: { x: number; y: number } }) => {
              if (!isOut) startDrag(type, e.global.x, e.global.y);
            }}
          >
            {tex ? (
              <DeviceSprite
                texture={tex}
                boxW={w}
                boxH={h}
                alpha={alpha}
              />
            ) : (
              <pixiGraphics
                draw={(g: Graphics) => {
                  g.clear();
                  if (type === "heating") drawHeatingDevice(g, w, h, color, alpha, strokeColor);
                  else if (type === "cooling") drawCoolingDevice(g, w, h, color, alpha, strokeColor);
                  else drawVentilationDevice(g, w, h, color, alpha, strokeColor);
                }}
              />
            )}
            <pixiText
              text={
                isBroken
                  ? (type === "heating"
                      ? "Mit der Leistung verrechnet?"
                      : type === "cooling"
                        ? "Mist sollten wir nochmal nachberchnen"
                        : "Planungsfehler :-(")
                  : SYSTEM_NAMES[type]
              }
              x={w / 2}
              y={h - 16}
              anchor={0.5}
              style={{
                fontSize: Math.min(12, w * 0.07),
                fill: isBroken ? 0x9ca3af : 0xffffff,
                dropShadow: { color: 0x000000, blur: 2, distance: 2 },
              }}
            />
            {remainingSec != null && remainingSec > 0 && (
              <pixiContainer x={w / 2} y={-h * 0.25}>
                <pixiText
                  text="ÜBERLASTET!"
                  x={0}
                  y={0}
                  anchor={0.5}
                  scale={0.95 + 0.1 * Math.abs(Math.sin(now / 200))}
                  style={{
                    fontSize: Math.min(22, w * 0.18),
                    fill: 0xf44336,
                    fontWeight: "bold",
                    dropShadow: { color: 0x000000, blur: 2, distance: 2 },
                  }}
                />
                <pixiText
                  text={String(remainingSec)}
                  x={0}
                  y={28}
                  anchor={0.5}
                  scale={0.95 + 0.1 * Math.abs(Math.sin(now / 200))}
                  style={{
                    fontSize: Math.min(28, w * 0.2),
                    fill: 0xf44336,
                    dropShadow: { color: 0x000000, blur: 2, distance: 2 },
                  }}
                />
              </pixiContainer>
            )}
            {isBroken && repairRemainingSec != null && repairRemainingSec > 0 && (
              <pixiContainer x={w / 2} y={-h * 0.25}>
                <pixiText
                  text="WIRD REPARIERT..."
                  x={0}
                  y={0}
                  anchor={0.5}
                  scale={0.95 + 0.1 * Math.abs(Math.sin(now / 200))}
                  style={{
                    fontSize: Math.min(18, w * 0.15),
                    fill: 0xff9800,
                    fontWeight: "bold",
                    dropShadow: { color: 0x000000, blur: 2, distance: 2 },
                  }}
                />
                <pixiText
                  text={String(repairRemainingSec)}
                  x={0}
                  y={24}
                  anchor={0.5}
                  style={{
                    fontSize: Math.min(24, w * 0.18),
                    fill: 0xff9800,
                    dropShadow: { color: 0x000000, blur: 2, distance: 2 },
                  }}
                />
              </pixiContainer>
            )}
            {hasConn && (
              <pixiGraphics
                draw={(g: Graphics) => {
                  const barW = w * 0.7;
                  const barH = 3;
                  const barX = (w - barW) / 2;
                  const barY = h - 6;
                  const fillRatio = Math.min(1, loadRatio);
                  g.rect(barX, barY, barW, barH).fill({ color: 0x374151, alpha: 0.8 });
                  g.rect(barX, barY, barW * fillRatio, barH)
                    .fill({ color: loadBarColor, alpha: isOut ? 0.4 : 0.95 });
                }}
              />
            )}
          </pixiContainer>
        );
      })}
    </>
  );
}

export function MachineRoom({ width, height }: { width: number; height: number }) {
  return (
    <>
      <MachineRoomBackground width={width} height={height} />
      <MachineRoomDevices width={width} height={height} />
    </>
  );
}

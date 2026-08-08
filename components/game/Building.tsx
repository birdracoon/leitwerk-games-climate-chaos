"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTick } from "@pixi/react";
import type { Graphics } from "pixi.js";
import { useGameStore } from "@/lib/engine/GameState";
import { getRoomLayout } from "./BuildingLayout";
import { ROOM_NAMES, COMFORT_TEMP_MIN, COMFORT_TEMP_MAX, CRITICAL_STATE_DURATION_MS } from "@/lib/constants";
import type { RoomId } from "@/lib/constants";
import { useCharacterTextures, useFloorTexture, type CharacterTexturesMap } from "@/lib/game/CharacterTextures";

const AIR_COMFORT_MIN = 50;

function drawRoomInterior(g: Graphics, id: RoomId, x: number, y: number, w: number, h: number) {
  const floorY = y + h * 0.35;
  const floorH = h * 0.65;
  const wallH = h * 0.35;

  if (id === "turnhalle") {
    g.rect(x, floorY, w, floorH).fill({ color: 0xc19a6b });
    g.circle(x + w / 2, floorY + floorH / 2, w * 0.15).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
    g.moveTo(x + w / 2, floorY).lineTo(x + w / 2, floorY + floorH).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
    g.rect(x, floorY + floorH * 0.25, w * 0.15, floorH * 0.5).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
  } else if (id === "computerraum") {
    g.rect(x, floorY, w, floorH).fill({ color: 0x1a202c });

    const serverW = w * 0.18;
    const serverH = floorH * 0.8;
    const serverX = x + w - serverW - 15;
    const serverY = floorY + 10;
    g.roundRect(serverX, serverY, serverW, serverH, 4)
      .fill({ color: 0x2d3748 })
      .stroke({ width: 2, color: 0x4a5568 });
    g.rect(serverX + 4, serverY + 4, serverW - 8, serverH - 8).fill({ color: 0x000000, alpha: 0.4 });

    const t = Date.now();
    for (let i = 0; i < 10; i++) {
      const isOn = (t + i * 150) % 500 > 250;
      g.circle(serverX + 10, serverY + 15 + i * (serverH / 12), 2)
        .fill({ color: i % 3 === 0 ? 0xff4444 : 0x44ff44, alpha: isOn ? 1 : 0.2 });
    }

    for (let r = 0; r < 2; r++) {
      g.roundRect(x + 20, floorY + floorH * (0.3 + r * 0.4), w * 0.5, 6, 2).fill({ color: 0x4a5568 });
    }
  } else if (id === "werkstaette") {
    g.rect(x, floorY, w, floorH).fill({ color: 0x4a5568 });

    const stripeW = 10;
    for (let sx = 0; sx < w; sx += stripeW * 2) {
      g.poly([
        x + sx, floorY,
        x + sx + stripeW, floorY,
        x + sx + stripeW + 5, floorY + 5,
        x + sx + 5, floorY + 5,
      ]).fill({ color: 0xfacc15 });
    }

    const wbW = w * 0.22;
    const wbH = floorH * 0.18;
    for (let i = 0; i < 3; i++) {
      const wbx = x + 20 + i * (w / 3.5);
      const wby = floorY + 30 + i * 15;
      g.roundRect(wbx, wby, wbW, wbH, 2)
        .fill({ color: 0x78350f })
        .stroke({ width: 1, color: 0x451a03 });
      g.rect(wbx + 2, wby - 4, 8, 8).fill({ color: 0x1e40af });
    }

    const drillW = w * 0.12;
    const drillH = floorH * 0.7;
    const dx = x + w - drillW - 15;
    const dy = floorY + 5;
    g.rect(dx, dy, drillW, drillH).fill({ color: 0x334155 });
    g.rect(dx - 5, dy + drillH - 10, drillW + 10, 10).fill({ color: 0x1e293b });
    g.rect(dx - 2, dy + drillH * 0.4, drillW + 4, 5).fill({ color: 0x94a3b8 });
    g.rect(dx + drillW / 2 - 2, dy + 10, 4, drillH * 0.3).fill({ color: 0xcbd5e1 });
    g.circle(dx + drillW / 2, dy + 20, 3).fill({ color: 0xef4444 }).stroke({ width: 1, color: 0xfacc15 });
  } else if (id === "aula") {
    g.rect(x, floorY, w, floorH).fill({ color: 0x451a03, alpha: 1 });

    const stageH = floorH * 0.35;
    const stageY = y + h - stageH - 5;
    g.roundRect(x + 10, stageY, w - 20, stageH, 4)
      .fill({ color: 0x27160c })
      .stroke({ width: 2, color: 0x5d4037 });

    const stairW = 15;
    g.rect(x + 10, stageY + 5, stairW, stageH - 10).fill({ color: 0x1a0f08 });
    g.rect(x + w - 10 - stairW, stageY + 5, stairW, stageH - 10).fill({ color: 0x1a0f08 });

    g.poly([x + 5, y + 5, x + 30, y + 5, x + 5, y + 40]).fill({ color: 0x7f1d1d });
    g.poly([x + w - 5, y + 5, x + w - 30, y + 5, x + w - 5, y + 40]).fill({ color: 0x7f1d1d });

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 5; c++) {
        const chairX = x + 40 + c * (w / 7);
        const chairY = floorY + 20 + r * 25;
        g.roundRect(chairX, chairY, 10, 10, 2).fill({ color: 0x92400e, alpha: 0.8 });
      }
    }
  } else if (id === "lehrerzimmer") {
    g.rect(x, floorY, w, floorH).fill({ color: 0xfef3c7, alpha: 1 });

    const rugW = w * 0.7;
    const rugH = floorH * 0.6;
    g.roundRect(x + (w - rugW) / 2, floorY + (floorH - rugH) / 2, rugW, rugH, 15)
      .fill({ color: 0x991b1b, alpha: 0.2 })
      .stroke({ width: 2, color: 0x7f1d1d, alpha: 0.3 });

    g.roundRect(x + w * 0.25, floorY + floorH * 0.3, w * 0.5, floorH * 0.4, 8)
      .fill({ color: 0x78350f })
      .stroke({ width: 2, color: 0x451a03 });

    const shelfW = w * 0.25;
    const shelfH = wallH * 0.7;
    g.rect(x + 15, y + 5, shelfW, shelfH).fill({ color: 0x451a03 });
    for (let i = 0; i < 6; i++) {
      const bookColor = i % 3 === 0 ? 0x1e40af : i % 3 === 1 ? 0x166534 : 0x991b1b;
      g.rect(x + 18 + i * (shelfW / 7), y + 7, shelfW / 9, shelfH - 4).fill({ color: bookColor });
    }

    const kitchenW = w * 0.15;
    g.rect(x + w - kitchenW - 10, floorY + 5, kitchenW, 5).fill({ color: 0xffffff });
    g.roundRect(x + w - kitchenW + 5, floorY - 5, 10, 10, 2).fill({ color: 0x334155 });
  }
}

function drawBuildingShell(g: Graphics, width: number, height: number) {
  const pad = Math.min(width, height) * 0.01;
  const machineHeight = height * 0.3;
  const buildingHeight = height - machineHeight;
  const floor2Height = buildingHeight * 0.47;
  const machineY = height - machineHeight;

  g.clear();
  g.poly([pad, pad, width / 2, -height * 0.08, width - pad, pad])
    .fill({ color: 0x374151, alpha: 0.9 })
    .stroke({ width: 2, color: 0x4b5563 });
  g.moveTo(pad, floor2Height + pad)
    .lineTo(width - pad, floor2Height + pad)
    .stroke({ width: 4, color: 0x4b5563 });
  g.rect(pad, pad, width - pad * 2, buildingHeight - pad)
    .stroke({ width: 3, color: 0x2d3748 });
  g.rect(pad, machineY, width - pad * 2, machineHeight)
    .stroke({ width: 2, color: 0x374151 });
}

function satisfactionToColor(sat: number): number {
  if (sat >= 70) return 0x4caf50;
  if (sat >= 50) return 0x8bc34a;
  if (sat >= 30) return 0xff9800;
  return 0xf44336;
}

const ROOM_FLOOR_COLORS: Record<RoomId, number> = {
  turnhalle: 0x8d6e63,
  computerraum: 0x607d8b,
  werkstaette: 0x4a5568,
  lehrerzimmer: 0x795548,
  aula: 0x6d4c41,
};
const ROOM_WALL_COLORS: Record<RoomId, number> = {
  turnhalle: 0xa1887f,
  computerraum: 0x78909c,
  werkstaette: 0x64748b,
  lehrerzimmer: 0x8d6e63,
  aula: 0x8d6e63,
};

function tempToColor(temp: number): number {
  if (temp <= 16) return 0x00b0ff;
  if (temp <= 20) return 0x64b5f6;
  if (temp <= 24) return 0x4caf50;
  if (temp <= 28) return 0xff9800;
  return 0xf44336;
}

function drawRoomStatusEffects(
  g: Graphics,
  _id: RoomId,
  x: number,
  y: number,
  w: number,
  h: number,
  temp: number,
  air: number
) {
  const t = Date.now() / 300;
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (temp > 28) {
    for (let i = 0; i < 5; i++) {
      const oy = Math.sin(t + i * 0.8) * 4;
      g.rect(x + 2, y + h * (0.2 + i * 0.15) + oy, w - 4, 3)
        .fill({ color: 0xf44336, alpha: 0.12 });
    }
  }

  if (air < 40) {
    const alpha = 0.15 * (1 - air / 40);
    g.circle(cx, cy, Math.max(w, h) * 0.6)
      .fill({ color: 0x4caf50, alpha });
  }

  if (temp < 16) {
    const fallOffset = ((Date.now() / 800) % 1) * h;
    for (let i = 0; i < 6; i++) {
      const dx = (i % 3 - 1) * (w / 4) + (Math.sin(t + i) * 8);
      const py = (y + (i * 0.18 * h + fallOffset) % (h + 20)) - 10;
      g.poly([
        cx + dx, py,
        cx + dx + 3, py + 5,
        cx + dx, py + 10,
        cx + dx - 3, py + 5,
      ]).fill({ color: 0xb3e5fc, alpha: 0.5 });
    }
  }
}

const CRITICAL_WARN_LABELS: Record<string, string> = {
  overheated: "ZU HEISS!",
  frozen: "ZU KALT!",
  asleep: "KEINE LUFT!",
};

const CRITICAL_VIGNETTE_COLORS: Record<string, number> = {
  overheated: 0xf44336,
  frozen: 0x2196f3,
  asleep: 0xffeb3b,
};

export function BuildingBase({ width, height }: { width: number; height: number }) {
  const rooms = useGameStore((s) => s.rooms);
  const activeChaosEvents = useGameStore((s) => s.activeChaosEvents);
  const layout = useMemo(() => getRoomLayout(width, height), [width, height]);
  const floorTexture = useFloorTexture();
  const machineHeight = height * 0.3;
  const machineY = height - machineHeight;
  const isBlackout = useGameStore((s) => s.isBlackout);

  const hasCritical = Object.values(rooms).some((r) => r?.criticalSince != null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasCritical && !isBlackout) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [hasCritical, isBlackout]);

  return (
    <>
      <pixiGraphics draw={(g: Graphics) => drawBuildingShell(g, width, height)} />
      <pixiText
        text="TECHNIKZENTRALE"
        x={width / 2}
        y={machineY - 18}
        anchor={0.5}
        style={{ fontSize: 12, fill: 0x9ca3af, fontWeight: "bold", ...GAME_TEXT_STYLE }}
      />
      {layout.map(({ id, x, y, w, h }) => {
        const room = rooms[id];
        const hasChaos = activeChaosEvents.some((e) => e.roomId === id);
        const isCritical = room?.criticalSince != null;
        const floorColor = ROOM_FLOOR_COLORS[id];
        const wallColor = ROOM_WALL_COLORS[id];
        const floorH = h * 0.7;
        const wallH = h * 0.3;
        const overlayColor = room ? satisfactionToColor(room.satisfaction) : 0x4a5568;
        const overlayAlpha = room ? (room.satisfaction >= 70 ? 0.15 : room.satisfaction < 30 ? 0.35 : 0.22) : 0;
        let borderColor = room?.satisfaction !== undefined
          ? room.satisfaction >= 70 ? 0x4caf50 : room.satisfaction < 30 ? 0xf44336 : 0x374151
          : 0x374151;
        if (hasChaos) borderColor = 0xf44336;
        if (isCritical) borderColor = CRITICAL_VIGNETTE_COLORS[room.characterState] ?? 0xf44336;
        const borderW = isCritical ? 7 : hasChaos ? 5 : room?.satisfaction !== undefined && room.satisfaction < 30 ? 4 : 2;
        const pulseAlpha = isCritical ? 0.5 + Math.abs(Math.sin(now / 150)) * 0.5 : 1;
        const vignetteAlpha = isCritical ? 0.15 + Math.abs(Math.sin(now / 150)) * 0.2 : 0;
        const vignetteColor = isCritical ? (CRITICAL_VIGNETTE_COLORS[room!.characterState] ?? 0xf44336) : 0;
        const floorAlpha = isBlackout ? 0.15 : 0.8;
        return (
          <pixiContainer key={id}>
            {/* Wand */}
            <pixiGraphics
              draw={(g: Graphics) => {
                g.clear();
                g.roundRect(x, y, w, wallH, 8)
                  .fill({ color: wallColor, alpha: isBlackout ? 0.15 : 0.85 });
              }}
            />
            {/* Boden: TilingSprite oder Raster-Fallback */}
            {floorTexture ? (
              <pixiTilingSprite
                texture={floorTexture}
                x={x}
                y={y + wallH - 4}
                width={w}
                height={floorH + 4}
                tileScale={{ x: 0.3, y: 0.3 }}
                alpha={floorAlpha}
              />
            ) : (
              <pixiGraphics
                draw={(g: Graphics) => {
                  g.clear();
                  g.roundRect(x, y + wallH - 4, w, floorH + 4, 8)
                    .fill({ color: floorColor, alpha: floorAlpha });
                  const step = 30;
                  for (let lx = 0; lx <= w; lx += step) {
                    g.moveTo(x + lx, y + wallH).lineTo(x + lx, y + h).stroke({ width: 1, color: 0x000000, alpha: 0.1 });
                  }
                  for (let ly = 0; ly <= floorH; ly += step) {
                    g.moveTo(x, y + wallH + ly).lineTo(x + w, y + wallH + ly).stroke({ width: 1, color: 0x000000, alpha: 0.1 });
                  }
                }}
              />
            )}
            {/* Overlay, Vignette, Border, Chaos */}
            <pixiGraphics
              draw={(g: Graphics) => {
                g.clear();
                if (room && overlayAlpha > 0) {
                  g.roundRect(x, y, w, h, 8)
                    .fill({ color: overlayColor, alpha: isBlackout ? 0.1 : overlayAlpha });
                }
                if (isCritical && vignetteAlpha > 0) {
                  g.roundRect(x, y, w, h, 8)
                    .fill({ color: vignetteColor, alpha: vignetteAlpha });
                }
                g.roundRect(x, y, w, h, 8)
                  .stroke({ width: borderW, color: borderColor, alpha: hasChaos ? 0.5 + Math.sin(now / 200) * 0.5 : pulseAlpha });
                if (hasChaos) {
                  const ix = x + w - 18;
                  const iy = y + 14;
                  g.poly([ix, iy - 10, ix + 12, iy + 10, ix + 24, iy - 10])
                    .fill({ color: 0xffeb3b, alpha: 0.9 })
                    .stroke({ width: 2, color: 0xf44336 });
                  g.moveTo(ix + 12, iy - 2).lineTo(ix + 12, iy + 4).stroke({ width: 2, color: 0x374151 });
                  g.circle(ix + 12, iy + 8, 2).fill({ color: 0x374151 });
                }
              }}
            />
            {isBlackout && (
              <pixiGraphics
                draw={(g: Graphics) => {
                  const pulse = 0.3 + Math.abs(Math.sin(now / 400)) * 0.4;
                  g.clear();
                  g.circle(x + w - 15, y + 15, 20)
                    .fill({ color: 0xff0000, alpha: pulse * 0.2 });
                  g.circle(x + w - 15, y + 15, 4)
                    .fill({ color: 0xff0000, alpha: pulse });
                }}
              />
            )}
          </pixiContainer>
        );
      })}
      {layout.map(({ id, x, y, w, h }) => {
        const room = rooms[id];
        return room ? (
          <pixiGraphics
            key={`effects-${id}`}
            draw={(g: Graphics) => {
              g.clear();
              drawRoomStatusEffects(g, id, x, y, w, h, room.temperature, room.airQuality);
            }}
          />
        ) : null;
      })}
    </>
  );
}

export function BuildingCriticalAlerts({ width, height }: { width: number; height: number }) {
  const rooms = useGameStore((s) => s.rooms);
  const layout = useMemo(() => getRoomLayout(width, height), [width, height]);

  const hasCritical = Object.values(rooms).some((r) => r?.criticalSince != null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasCritical) return;
    const id = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(id);
  }, [hasCritical]);

  if (!hasCritical) return null;

  return (
    <>
      {layout.map(({ id, x, y, w, h }) => {
        const room = rooms[id];
        if (!room?.criticalSince) return null;
        const remainingSec = Math.ceil(
          (CRITICAL_STATE_DURATION_MS - (now - room.criticalSince)) / 1000
        );
        const warnLabel = CRITICAL_WARN_LABELS[room.characterState] ?? "KRITISCH!";
        const fontSize = Math.min(28, w * 0.15);
        const scale = 0.95 + 0.1 * Math.abs(Math.sin(now / 150));
        return (
          <pixiContainer key={`critical-${id}`} x={x + w / 2} y={y + h * 0.75}>
            <pixiText
              text={warnLabel}
              x={0}
              y={0}
              anchor={0.5}
              scale={scale}
              style={{
                ...GAME_TEXT_STYLE,
                fontSize,
                fill: CRITICAL_VIGNETTE_COLORS[room.characterState] ?? 0xf44336,
                fontWeight: "900",
                stroke: { color: 0x000000, width: 6 },
              }}
            />
            <pixiText
              text={`${remainingSec}s`}
              x={0}
              y={30}
              anchor={0.5}
              style={{
                ...GAME_TEXT_STYLE,
                fontSize: Math.min(24, w * 0.12),
                fill: 0xffffff,
                stroke: { color: 0x000000, width: 4 },
              }}
            />
          </pixiContainer>
        );
      })}
    </>
  );
}

export function BuildingTurboOverlay({ width, height }: { width: number; height: number }) {
  const rooms = useGameStore((s) => s.rooms);
  const isTurboActive = useGameStore((s) => s.isTurboActive);
  const layout = useMemo(() => getRoomLayout(width, height), [width, height]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isTurboActive) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [isTurboActive]);

  if (!isTurboActive) return null;

  return (
    <>
      {layout.map(({ id, x, y, w, h }) => {
        const room = rooms[id];
        if (!room || room.airQuality >= 50) return null;
        const scale = 0.95 + 0.08 * Math.abs(Math.sin(now / 150));
        return (
          <pixiContainer key={`turbo-${id}`} x={x + w / 2} y={y + h - 20}>
            <pixiText
              text="TURBO-LÜFTUNG AKTIV"
              x={0}
              y={0}
              anchor={0.5}
              scale={scale}
              style={{
                fontSize: 14,
                fill: 0x4caf50,
                fontWeight: "bold",
                ...GAME_TEXT_STYLE,
              }}
            />
          </pixiContainer>
        );
      })}
    </>
  );
}

export function BuildingFurniture({ width, height }: { width: number; height: number }) {
  const layout = useMemo(() => getRoomLayout(width, height), [width, height]);

  return (
    <pixiGraphics
      draw={(g: Graphics) => {
        g.clear();
        layout.forEach(({ id, x, y, w, h }) => drawRoomInterior(g, id, x, y, w, h));
      }}
    />
  );
}

export function BuildingCharacters({ width, height }: { width: number; height: number }) {
  const rooms = useGameStore((s) => s.rooms);
  const layout = useMemo(() => getRoomLayout(width, height), [width, height]);
  const charTextures = useCharacterTextures();

  return (
    <>
      {layout.map(({ id, x, y, w, h }) => {
        const room = rooms[id];
        if (!room) return null;
        return (
          <pixiContainer key={`chars-${id}`} x={x + 8} y={y + 8}>
            <Characters
              roomId={id}
              state={room.characterState}
              peopleCount={room.peopleCount}
              w={w - 16}
              h={h - 16}
              textures={charTextures}
            />
          </pixiContainer>
        );
      })}
    </>
  );
}

export function BuildingPanels({ width, height }: { width: number; height: number }) {
  const rooms = useGameStore((s) => s.rooms);
  const layout = useMemo(() => getRoomLayout(width, height), [width, height]);

  return (
    <>
      {layout.map(({ id, x, y, w, h }) => {
        const room = rooms[id];
        const scale = Math.min(w, h) / 180;
        const panelPad = 8 * scale;
        const fontSize = Math.max(12, 14 * scale);
        return (
          <pixiContainer key={`label-${id}`} x={x + 8} y={y + 8}>
            {room && (
              <RoomInfoPanel
                roomName={ROOM_NAMES[id]}
                temp={room.temperature}
                air={room.airQuality}
                statusText={room.statusText}
                panelPad={panelPad}
                fontSize={fontSize}
                maxW={w - 16}
                scale={scale}
              />
            )}
          </pixiContainer>
        );
      })}
    </>
  );
}

export function BuildingOverlay({ width, height }: { width: number; height: number }) {
  return (
    <>
      <BuildingCharacters width={width} height={height} />
      <BuildingPanels width={width} height={height} />
    </>
  );
}

export function Building({ width, height }: { width: number; height: number }) {
  return (
    <>
      <BuildingBase width={width} height={height} />
      <BuildingFurniture width={width} height={height} />
      <BuildingCharacters width={width} height={height} />
      <BuildingPanels width={width} height={height} />
      <BuildingCriticalAlerts width={width} height={height} />
    </>
  );
}

export const GAME_TEXT_STYLE = {
  fontFamily: "Orbitron, sans-serif",
  dropShadow: { color: 0x000000, blur: 4, distance: 2 },
  letterSpacing: 1,
};

function RoomInfoPanel({
  roomName,
  temp,
  air,
  statusText,
  panelPad,
  fontSize,
  maxW,
  scale,
}: {
  roomName: string;
  temp: number;
  air: number;
  statusText: string | null;
  panelPad: number;
  fontSize: number;
  maxW: number;
  scale: number;
}) {
  const barW = Math.min(160 * scale, maxW * 0.8);
  const barH = 14 * scale;
  const labelSize = Math.max(11, 13 * scale);
  const tempComfortStart = (COMFORT_TEMP_MIN / 50) * barW;
  const tempComfortEnd = (COMFORT_TEMP_MAX / 50) * barW;
  const airComfortStart = (AIR_COMFORT_MIN / 100) * barW;
  const airBarH = 12 * scale;
  const headerH = fontSize * 1.6;
  const row1Y = headerH + panelPad;
  const bar1Y = row1Y + labelSize + 4;
  const row2Y = bar1Y + barH + 14 * scale;
  const bar2Y = row2Y + labelSize + 4;
  const panelH =
    bar2Y + airBarH + panelPad + (statusText ? labelSize * 2.5 + 6 : 0);
  const panelW = barW + panelPad * 2;

  return (
    <pixiContainer x={0} y={0}>
      {/* 1. Hintergrund-Karte */}
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.roundRect(0, 0, panelW, panelH, 10)
            .fill({ color: 0x0f1419, alpha: 0.92 });
          g.roundRect(0, 0, panelW, panelH, 10)
            .stroke({ width: 2, color: 0x374151 });
        }}
      />
      {/* 2. Balken-Grafik */}
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.rect(panelPad, bar1Y, barW, barH).fill({ color: 0x1f2937 });
          g.rect(panelPad + tempComfortStart, bar1Y, tempComfortEnd - tempComfortStart, barH)
            .fill({ color: 0x4caf50, alpha: 0.25 });
          g.rect(panelPad, bar1Y, (temp / 50) * barW, barH)
            .fill({ color: tempToColor(temp), alpha: 0.95 });
          g.rect(panelPad, bar1Y, barW, barH).stroke({ width: 1, color: 0x4b5563 });

          g.rect(panelPad, bar2Y, barW, airBarH).fill({ color: 0x1f2937 });
          g.rect(panelPad + airComfortStart, bar2Y, barW - airComfortStart, airBarH)
            .fill({ color: 0x4caf50, alpha: 0.25 });
          g.rect(panelPad, bar2Y, (air / 100) * barW, airBarH)
            .fill({
              color: air >= AIR_COMFORT_MIN ? 0x4caf50 : air >= 30 ? 0xff9800 : 0xf44336,
              alpha: 0.95,
            });
          g.rect(panelPad, bar2Y, barW, airBarH).stroke({ width: 1, color: 0x4b5563 });
        }}
      />
      {/* 3. Labels & Werte */}
      <pixiText
        text="Temperatur"
        x={panelPad}
        y={row1Y}
        style={{ fontSize: labelSize, fill: 0x9ca3af, fontWeight: "bold", ...GAME_TEXT_STYLE }}
      />
      <pixiText
        text={`${temp.toFixed(1)}°C`}
        x={panelPad + barW}
        y={row1Y}
        anchor={{ x: 1, y: 0 }}
        style={{ fontSize: labelSize, fill: tempToColor(temp), fontWeight: "bold", ...GAME_TEXT_STYLE }}
      />
      <pixiText
        text="Luftqualität"
        x={panelPad}
        y={row2Y}
        style={{ fontSize: labelSize, fill: 0x9ca3af, fontWeight: "bold", ...GAME_TEXT_STYLE }}
      />
      <pixiText
        text={`${air.toFixed(0)}%`}
        x={panelPad + barW}
        y={row2Y}
        anchor={{ x: 1, y: 0 }}
        style={{
          fontSize: labelSize,
          fill: air >= AIR_COMFORT_MIN ? 0x4caf50 : air >= 30 ? 0xff9800 : 0xf44336,
          fontWeight: "bold",
          ...GAME_TEXT_STYLE,
        }}
      />
      {statusText && (
        <pixiText
          text={statusText}
          x={panelPad}
          y={bar2Y + airBarH + 8}
          style={{
            fontSize: labelSize * 0.9,
            fill: 0xffeb3b,
            wordWrap: true,
            wordWrapWidth: barW,
            ...GAME_TEXT_STYLE,
          }}
        />
      )}
      {/* 4. Raumname oben, zuletzt = sichtbar über allem */}
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.roundRect(0, 0, panelW, headerH, 8)
            .fill({ color: 0x1e293b, alpha: 0.98 });
          g.moveTo(0, headerH).lineTo(panelW, headerH).stroke({ width: 1, color: 0x334155 });
        }}
      />
      <pixiText
        text={roomName.toUpperCase()}
        x={panelPad}
        y={panelPad * 0.3}
        style={{
          fontSize: fontSize * 1.0,
          fill: 0xffffff,
          fontWeight: "bold",
          ...GAME_TEXT_STYLE,
        }}
      />
    </pixiContainer>
  );
}

const TINTS: Record<string, number> = {
  normal: 0xffffff,
  overheated: 0xff5722,
  frozen: 0x81d4fa,
  asleep: 0x9e9e9e,
};

function getCharacterTextureKey(
  roomId: RoomId,
  state: string,
  index: number
): "player" | "female" | "adventurer" | "soldier" | "zombie" {
  if (state === "asleep") return "zombie";
  const keys: ("player" | "female" | "adventurer")[] = ["player", "female", "adventurer"];
  return keys[index % 3];
}

const getRandomTarget = (w: number, h: number) => ({
  x: 20 + Math.random() * (w - 40),
  y: h * 0.45 + Math.random() * (h * 0.45),
});

function WanderingCharacter({
  texture,
  state,
  w,
  h,
  scale,
  index,
}: {
  texture: import("pixi.js").Texture;
  state: string;
  w: number;
  h: number;
  scale: number;
  index: number;
}) {
  const containerRef = useRef<import("pixi.js").Container>(null);
  const spriteRef = useRef<import("pixi.js").Sprite>(null);
  const posRef = useRef(getRandomTarget(w, h));
  const targetRef = useRef(getRandomTarget(w, h));
  const waitRef = useRef(0);

  useTick((ticker) => {
    const c = containerRef.current;
    const s = spriteRef.current;
    if (!c || state === "asleep") return;
    const delta = ticker.deltaMS ?? 16;
    const pos = posRef.current;
    const target = targetRef.current;

    if (waitRef.current <= 0) {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 5) {
        waitRef.current = 2000 + Math.random() * 3000;
        targetRef.current = getRandomTarget(w, h);
      } else {
        const speed = (0.05 + (index % 5) * 0.01) * delta;
        posRef.current = {
          x: pos.x + (dx / dist) * speed,
          y: pos.y + (dy / dist) * speed,
        };
      }
    } else {
      waitRef.current -= delta;
    }

    const stateShake = state === "frozen" ? Math.sin(Date.now() / 50) * 2 : 0;
    const stateFloat = state === "overheated" ? Math.sin(Date.now() / 400) * 5 : 0;
    c.x = posRef.current.x + stateShake;
    c.y = posRef.current.y + stateFloat;
    if (s) {
      s.scale.x = (targetRef.current.x < posRef.current.x ? -1 : 1) * scale * (state === "asleep" ? 0.95 : 1);
      s.scale.y = scale * (state === "asleep" ? 0.95 : 1);
    }
  });

  const spriteH = 110 * scale;
  const tint = TINTS[state] ?? 0xffffff;
  const pos = posRef.current;

  return (
    <pixiContainer ref={containerRef} x={pos.x} y={pos.y}>
      {state === "asleep" && (
        <pixiText
          text="Zzz"
          x={0}
          y={-spriteH - 5}
          anchor={{ x: 0.5, y: 1 }}
          style={{ fontSize: 10, fill: 0xffeb3b, fontStyle: "italic", fontFamily: "Orbitron" }}
        />
      )}
      <pixiSprite
        ref={spriteRef}
        texture={texture}
        anchor={{ x: 0.5, y: 1 }}
        scale={{
          x: (targetRef.current.x < pos.x ? -1 : 1) * scale * (state === "asleep" ? 0.95 : 1),
          y: scale * (state === "asleep" ? 0.95 : 1),
        }}
        tint={tint}
        alpha={state === "asleep" ? 0.9 : 1}
      />
    </pixiContainer>
  );
}

function Characters({
  roomId,
  state,
  peopleCount,
  w,
  h,
  textures,
}: {
  roomId: RoomId;
  state: string;
  peopleCount: number;
  w: number;
  h: number;
  textures: CharacterTexturesMap | null;
}) {
  const displayCount = useMemo(
    () => Math.min(12, Math.max(2, Math.ceil(peopleCount / 8))),
    [peopleCount]
  );

  const spriteScale = Math.min(w, h) / 380;

  if (textures && (textures.player || textures.female || textures.adventurer || textures.zombie)) {
    return (
      <pixiContainer>
        {Array.from({ length: displayCount }).map((_, i) => {
          const texKey = getCharacterTextureKey(roomId, state, i);
          const tex = textures[texKey];
          if (!tex) return null;
          return (
            <WanderingCharacter
              key={`${roomId}-${i}`}
              index={i}
              texture={tex}
              state={state}
              w={w}
              h={h}
              scale={spriteScale}
            />
          );
        })}
      </pixiContainer>
    );
  }

  const count = Math.min(12, Math.max(2, Math.ceil(peopleCount / 8)));
  const colors: Record<string, number> = {
    normal: 0x90caf9,
    overheated: 0xff5722,
    frozen: 0x81d4fa,
    asleep: 0x9e9e9e,
  };
  const color = colors[state] ?? 0x90caf9;
  const s = spriteScale * 6.72;
  const spacing = w / (count + 1);
  const t2 = (Date.now() / 200) % (Math.PI * 2);
  const floatY = state === "overheated" ? Math.sin(Date.now() / 500) * 2 : 0;
  return (
    <pixiGraphics
      draw={(g) => {
        g.clear();
        for (let i = 0; i < count; i++) {
          const baseX = (i + 1) * spacing - 7 * s;
          const ox = baseX + (state === "frozen" ? Math.sin(t2 * 3 + i) * 3 : 0);
          const py = h - 20 + floatY;
          const bodyW = state === "overheated" ? 16 * s : 12 * s;
          const bodyH = state === "overheated" ? 14 * s : 16 * s;
          g.circle(ox + 6 * s, py + 5 * s, 4 * s).fill({ color });
          g.circle(ox + 5 * s, py + 4 * s, 0.8 * s).fill({ color: 0x212121 });
          g.circle(ox + 7 * s, py + 4 * s, 0.8 * s).fill({ color: 0x212121 });
          g.poly([
            ox + 6 * s - bodyW / 2, py + 10 * s,
            ox + 6 * s - bodyW / 3, py + 10 * s + bodyH,
            ox + 6 * s + bodyW / 3, py + 10 * s + bodyH,
            ox + 6 * s + bodyW / 2, py + 10 * s,
          ]).fill({ color, alpha: 0.95 });
          g.moveTo(ox + 4 * s, py + 11 * s).lineTo(ox + 2 * s, py + 14 * s).stroke({ width: 1.5 * s, color });
          g.moveTo(ox + 8 * s, py + 11 * s).lineTo(ox + 10 * s, py + 14 * s).stroke({ width: 1.5 * s, color });
          g.moveTo(ox + 5 * s, py + 24 * s).lineTo(ox + 4 * s, py + 28 * s).stroke({ width: 1.2 * s, color });
          g.moveTo(ox + 7 * s, py + 24 * s).lineTo(ox + 8 * s, py + 28 * s).stroke({ width: 1.2 * s, color });
          if (state === "asleep") {
            g.ellipse(ox + 6 * s, py + 5 * s, 2.5 * s, 1.2 * s).fill({ color: 0x212121 });
            g.rect(ox + 9 * s, py + 3 * s, 4 * s, 2 * s).fill({ color: 0xffeb3b, alpha: 0.7 });
          }
          if (state === "overheated") {
            g.circle(ox + 4 * s, py + 5 * s, 1.2 * s).fill({ color: 0xf44336, alpha: 0.8 });
            g.circle(ox + 8 * s, py + 5 * s, 1.2 * s).fill({ color: 0xf44336, alpha: 0.8 });
            for (let j = 0; j < 3; j++) {
              g.ellipse(ox + 4 * s + j * 3 * s, py + 26 * s + Math.sin(t2 + j) * 2, 1 * s, 1.5 * s)
                .fill({ color: 0x2196f3, alpha: 0.7 });
            }
          }
          if (state === "frozen") {
            g.circle(ox + 6 * s, py + 5.5 * s, 1 * s).fill({ color: 0x0d47a1, alpha: 0.8 });
            g.poly([ox + 5 * s, py + 7 * s, ox + 6 * s, py + 6 * s, ox + 7 * s, py + 7 * s, ox + 6 * s, py + 8 * s]).fill({ color: 0xb3e5fc, alpha: 0.8 });
          }
        }
      }}
    />
  );
}

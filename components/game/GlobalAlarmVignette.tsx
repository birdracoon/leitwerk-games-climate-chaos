"use client";

import { useState, useEffect } from "react";
import type { Graphics } from "pixi.js";
import { useGameStore } from "@/lib/engine/GameState";
import { useCanvasSize } from "./CanvasSizeContext";

export function GlobalAlarmVignette() {
  const deviceOverloadStart = useGameStore((s) => s.deviceOverloadStart);
  const { width, height } = useCanvasSize();
  const isAnyOverloaded = Object.values(deviceOverloadStart).some((v) => v !== null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isAnyOverloaded) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [isAnyOverloaded]);

  if (!isAnyOverloaded) return null;

  const pulse = 0.1 + Math.abs(Math.sin(now / 200)) * 0.2;

  return (
    <pixiGraphics
      draw={(g: Graphics) => {
        g.clear();
        g.rect(0, 0, width, height).stroke({
          width: 20,
          color: 0xff0000,
          alpha: pulse,
        });
      }}
    />
  );
}

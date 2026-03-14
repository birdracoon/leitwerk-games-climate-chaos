"use client";

import { useState, useEffect } from "react";
import type { Graphics } from "pixi.js";
import { useTick } from "@pixi/react";
import { useGameStore } from "@/lib/engine/GameState";

export function BlackoutEffect({ width, height }: { width: number; height: number }) {
  const isBlackout = useGameStore((s) => s.isBlackout);
  const [flashAlpha, setFlashAlpha] = useState(0);

  useEffect(() => {
    if (isBlackout) {
      setFlashAlpha(1);
    } else {
      setFlashAlpha(0);
    }
  }, [isBlackout]);

  useTick((ticker) => {
    if (flashAlpha > 0) {
      const delta = ticker.deltaMS ?? 16;
      setFlashAlpha((prev) => Math.max(0, prev - 0.04 * (delta / 16)));
    }
  });

  if (!isBlackout && flashAlpha <= 0) return null;

  return (
    <>
      {isBlackout && (
        <pixiGraphics
          draw={(g: Graphics) => {
            g.clear();
            g.rect(0, 0, width, height).fill({ color: 0x05050a, alpha: 0.85 });
          }}
        />
      )}
      {flashAlpha > 0 && (
        <pixiGraphics
          draw={(g: Graphics) => {
            g.clear();
            g.rect(0, 0, width, height).fill({ color: 0xffffff, alpha: flashAlpha });
          }}
        />
      )}
    </>
  );
}

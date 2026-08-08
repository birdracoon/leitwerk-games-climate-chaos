"use client";

import { useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/engine/GameState";
import { useCanvasSize } from "./CanvasSizeContext";
import { getRoomLayout } from "./BuildingLayout";

export function DragEventLayer({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { width, height } = useCanvasSize();
  const layout = useMemo(() => getRoomLayout(width, height), [width, height]);
  const dragState = useGameStore((s) => s.dragState);
  const updateDrag = useGameStore((s) => s.updateDrag);
  const endDrag = useGameStore((s) => s.endDrag);

  useEffect(() => {
    if (!dragState?.active) return;

    const toCanvasCoords = (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * width,
        y: ((clientY - rect.top) / rect.height) * height,
      };
    };

    const findRoomAt = (x: number, y: number) =>
      layout.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)?.id;

    const onMove = (e: PointerEvent) => {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      updateDrag(x, y);
    };

    const onUp = (e: PointerEvent) => {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      const roomId = findRoomAt(x, y);
      endDrag(x, y, roomId);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragState?.active, width, height, layout, containerRef, updateDrag, endDrag]);

  return null;
}
